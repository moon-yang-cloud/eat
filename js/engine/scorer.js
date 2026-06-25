/**
 * 评分与排序引擎
 * ---------------------------------------------------------------------------
 * 纯函数集合：健康度打分、价格估算、健康模式排序、美食模式排序，以及若干
 * 展示用的小工具（距离文本、分数配色、目标名称）。不依赖 DOM 与高德 SDK，
 * 便于单元测试。
 * ---------------------------------------------------------------------------
 */

const Scorer = {
  /** 读取评分权重（带默认值，避免 CONFIG 缺失时报错） */
  _w() {
    return (typeof CONFIG !== "undefined" && CONFIG.SCORING) || {
      HEALTH_DIST_PENALTY: 8, FATLOSS_FACTOR: 0.5, MUSCLE_PROTEIN_BONUS: 18,
      FOOD_BASE: 50, FOOD_DIST_PENALTY: 12, FOOD_KEYWORD_BONUS: 25,
      FOOD_MEAL_BONUS: 16, SPICY_NO_PENALTY: 40, SPICY_HOT_BONUS: 22,
    };
  },

  /**
   * 计算店铺健康度
   * @returns {{s:number, hit:string[], bad:string[]}} 分值与命中的关键词
   */
  healthScore(poi) {
    const n = (poi.name || "") + " " + (poi.type || "");
    let s = 0;
    const hit = [];
    const bad = [];
    for (const k in HEALTHY) {
      if (n.includes(k)) { s += HEALTHY[k]; hit.push(k); }
    }
    for (const k in UNHEALTHY) {
      if (n.includes(k)) { s += UNHEALTHY[k]; bad.push(k); }
    }
    return { s, hit, bad };
  },

  /** 价格区间估算（人均，元） */
  estPrice(poi) {
    const n = (poi.name || "") + (poi.type || "");
    for (const rule of PRICE_RULES) {
      if (rule.re.test(n)) return rule.range.slice();
    }
    return PRICE_DEFAULT.slice();
  },

  /** 是否偏辣 */
  isSpicy(poi) {
    return SPICY_RE.test((poi.name || "") + (poi.type || ""));
  },

  /** 按当前钟点推断餐次 */
  autoMeal(date = new Date()) {
    const h = date.getHours();
    if (h >= 5 && h < 10) return "breakfast";
    if (h >= 10 && h < 14) return "lunch";
    if (h >= 14 && h < 21) return "dinner";
    return "night";
  },

  /**
   * 健康模式综合排序分：健康度 - 距离惩罚，按目标微调
   */
  rankHealth(poi, goal) {
    const w = this._w();
    const h = poi._health ? poi._health.s : this.healthScore(poi).s;
    const distKm = (poi.distance || 0) / 1000;
    let s = h - distKm * w.HEALTH_DIST_PENALTY; // 距离惩罚
    if (goal === "fatloss") s += h * w.FATLOSS_FACTOR; // 减脂更看重低碳水
    if (goal === "muscle") {
      const n = (poi.name || "") + (poi.type || "");
      if (MUSCLE_PROTEIN_RE.test(n)) s += w.MUSCLE_PROTEIN_BONUS;
    }
    return s;
  },

  /**
   * 美食模式排序分：距离为主，叠加关键词/口味/餐次/人数偏好
   * @param {object} filters {keyword, spicy, people, meal}
   */
  rankFood(poi, filters) {
    const w = this._w();
    const n = (poi.name || "") + (poi.type || "");
    const distKm = (poi.distance || 0) / 1000;
    let s = w.FOOD_BASE - distKm * w.FOOD_DIST_PENALTY; // 美食模式更看重距离

    if (filters.keyword && n.includes(filters.keyword)) s += w.FOOD_KEYWORD_BONUS;

    const spicy = this.isSpicy(poi);
    if (filters.spicy === "no") s += spicy ? -w.SPICY_NO_PENALTY : 8;
    if (filters.spicy === "mild") s += spicy ? -6 : 4;
    if (filters.spicy === "hot") s += spicy ? w.SPICY_HOT_BONUS : -4;

    const meal = filters.meal === "auto" ? this.autoMeal() : filters.meal;
    if (MEAL_RE[meal] && MEAL_RE[meal].test(n)) s += w.FOOD_MEAL_BONUS;
    if (meal === "breakfast" && /火锅|烧烤|烤肉/.test(n)) s -= 20;
    if (meal === "night" && /早餐|包子|豆浆/.test(n)) s -= 15;

    if (filters.people >= 3 && /火锅|烤肉|烤鱼|海鲜|聚餐|烧烤/.test(n)) s += 12;
    if (filters.people <= 1 && /快餐|面|粥|盖|饭|小吃|轻食|沙拉/.test(n)) s += 8;

    return s;
  },

  /** 距离文本 */
  distText(m) {
    if (m == null) return "";
    return m < 1000 ? Math.round(m) + " m" : (m / 1000).toFixed(1) + " km";
  },

  /** 健康分对应配色 */
  scoreColor(s) {
    if (s >= 40) return "#2e9e5b";
    if (s >= 15) return "#7cb342";
    if (s >= 0) return "#d9b441";
    return "#e8743b";
  },

  /** 目标名称 */
  goalLabel(g) {
    return (GOALS[g] && GOALS[g].label) || g;
  },

  /** 评分取值（无评分按 -1 排末尾） */
  ratingOf(poi) {
    return poi.rating != null ? poi.rating : -1;
  },

  /** 人均价格：优先用高德真实人均，否则用品类估算区间 */
  priceText(poi) {
    if (poi.cost != null && poi.cost > 0) return `¥${Math.round(poi.cost)}`;
    const r = this.estPrice(poi);
    return `¥${r[0]}-${r[1]}`;
  },

  /**
   * 统一排序
   * @param {Array} list
   * @param {string} mode  smart | distance | rating | health
   * @param {object} ctx   {view, goal, filters}
   */
  sortBy(list, mode, ctx) {
    const arr = list.slice();
    if (mode === "distance") {
      arr.sort((a, b) => (a.distance == null ? 1e12 : a.distance) - (b.distance == null ? 1e12 : b.distance));
    } else if (mode === "rating") {
      arr.sort((a, b) => this.ratingOf(b) - this.ratingOf(a));
    } else if (mode === "health") {
      arr.sort((a, b) => (b._health ? b._health.s : 0) - (a._health ? a._health.s : 0));
    } else {
      // smart：健康视图按健康+距离，美食视图按匹配+距离
      const f = ctx.view === "health"
        ? (p) => this.rankHealth(p, ctx.goal)
        : (p) => this.rankFood(p, ctx.filters);
      arr.sort((a, b) => f(b) - f(a));
    }
    return arr;
  },
};

if (typeof window !== "undefined") window.Scorer = Scorer;
if (typeof module !== "undefined" && module.exports) module.exports = { Scorer };
