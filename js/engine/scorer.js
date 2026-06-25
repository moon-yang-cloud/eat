/**
 * 评分与排序引擎
 * ---------------------------------------------------------------------------
 * 纯函数集合：健康度打分、价格估算、健康模式排序、美食模式排序，以及若干
 * 展示用的小工具（距离文本、分数配色、目标名称）。不依赖 DOM 与高德 SDK，
 * 便于单元测试。
 * ---------------------------------------------------------------------------
 */

const Scorer = {
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
    const h = poi._health ? poi._health.s : this.healthScore(poi).s;
    const distKm = (poi.distance || 0) / 1000;
    let s = h - distKm * 8; // 每公里扣 8 分
    if (goal === "fatloss") s += h * 0.5; // 减脂更看重低碳水
    if (goal === "muscle") {
      const n = (poi.name || "") + (poi.type || "");
      if (MUSCLE_PROTEIN_RE.test(n)) s += 18;
    }
    return s;
  },

  /**
   * 美食模式排序分：距离为主，叠加关键词/口味/餐次/人数偏好
   * @param {object} filters {keyword, spicy, people, meal}
   */
  rankFood(poi, filters) {
    const n = (poi.name || "") + (poi.type || "");
    const distKm = (poi.distance || 0) / 1000;
    let s = 50 - distKm * 12; // 美食模式更看重距离

    if (filters.keyword && n.includes(filters.keyword)) s += 25;

    const spicy = this.isSpicy(poi);
    if (filters.spicy === "no") s += spicy ? -40 : 8;
    if (filters.spicy === "mild") s += spicy ? -6 : 4;
    if (filters.spicy === "hot") s += spicy ? 22 : -4;

    const meal = filters.meal === "auto" ? this.autoMeal() : filters.meal;
    if (MEAL_RE[meal] && MEAL_RE[meal].test(n)) s += 16;
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
};

if (typeof window !== "undefined") window.Scorer = Scorer;
if (typeof module !== "undefined" && module.exports) module.exports = { Scorer };
