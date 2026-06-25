/**
 * 界面渲染
 * ---------------------------------------------------------------------------
 * 负责把店铺列表、收藏夹渲染成 HTML 字符串。事件交由 app.js 通过事件委托处理。
 * ---------------------------------------------------------------------------
 */

const Render = {
  esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  },

  /** 高德看店/导航链接 */
  amapUrl(poi) {
    return poi.location
      ? `https://uri.amap.com/marker?position=${poi.location[0]},${poi.location[1]}&name=${encodeURIComponent(poi.name)}&src=health_eat&coordinate=gaode&callnative=1`
      : `https://www.amap.com/search?query=${encodeURIComponent(poi.name)}`;
  },

  /** 单张店铺卡片 */
  card(poi, opts) {
    const { mode, goal, filters, faved } = opts;
    const per = Scorer.estPrice(poi);
    const ppl = mode === "food" ? filters.people : 1;
    const cat = (poi.type || "").split(";").pop() || "餐饮";

    let badgeHtml = "", reason = "", tagsHtml = "", warn = false;

    if (mode === "health") {
      const h = poi._health || Scorer.healthScore(poi);
      warn = h.s < 0;
      const badge = Math.max(0, Math.min(99, Math.round(50 + h.s)));
      badgeHtml = `<span class="score-badge" style="background:${Scorer.scoreColor(h.s)}">健康分 ${badge}</span>`;
      const tags = [];
      h.hit.forEach((k) => tags.push(`<span class="tag">${this.esc(k)}</span>`));
      h.bad.forEach((k) => tags.push(`<span class="tag bad">${this.esc(k)}</span>`));
      tagsHtml = tags.length ? `<div class="tags">${tags.join("")}</div>` : "";
      if (warn) reason = `这类店偏油炸/高碳水（${h.bad.join("、")}），容易踩"碳水刺客"。建议选清淡做法、多配菜、别加含糖饮料。`;
      else if (h.s >= 25) reason = `高蛋白/轻食方向（${h.hit.join("、") || "清淡"}），扛饿不囤脂，适合${Scorer.goalLabel(goal)}。`;
      else reason = `中性选择，可以吃但注意搭配：优先蛋白质和蔬菜，主食减半。`;
    } else {
      const spicy = Scorer.isSpicy(poi);
      const tags = [`<span class="tag">${spicy ? "偏辣" : "清淡"}</span>`];
      if (filters.keyword && (poi.name + poi.type).includes(filters.keyword)) {
        tags.push(`<span class="tag">${this.esc(filters.keyword)}</span>`);
      }
      tagsHtml = `<div class="tags">${tags.join("")}</div>`;
      reason = `距你 ${Scorer.distText(poi.distance)} · ${this.esc(cat)} · ${spicy ? "口味偏辣" : "口味较清淡"}${ppl > 1 ? ` · ${ppl}人合计约 ¥${per[0] * ppl}-${per[1] * ppl}` : ""}。`;
    }

    const priceHtml = ppl > 1
      ? `¥${per[0] * ppl}-${per[1] * ppl}<small>${ppl}人预估</small>`
      : `¥${per[0]}-${per[1]}<small>人均预估</small>`;

    return `
    <div class="dish" data-id="${this.esc(poi.id)}">
      <div class="dish-head">
        <div>
          <div class="dish-name">${this.esc(poi.name)}
            <span class="dist-badge">${Scorer.distText(poi.distance)}</span>
            ${badgeHtml}
          </div>
          <div class="dish-cat">${this.esc(cat)}</div>
          <div class="dish-meta">${this.esc(poi.address || "")}</div>
        </div>
        <div class="dish-right">
          <button class="fav-btn ${faved ? "faved" : ""}" data-action="fav" title="收藏">${faved ? "★" : "☆"}</button>
          <div class="dish-price">${priceHtml}</div>
        </div>
      </div>
      <div class="reason ${warn ? "warn" : ""}">${reason}</div>
      ${tagsHtml}
      <div class="links">
        <a class="link-btn link-amap" href="${this.amapUrl(poi)}" target="_blank" rel="noopener">高德看店/导航</a>
        <button class="link-btn link-mt" data-action="meituan" data-name="${encodeURIComponent(poi.name)}">美团外卖（复制店名）</button>
      </div>
    </div>`;
  },

  /** 结果列表 */
  results(list, opts) {
    if (!opts.userCenter) {
      return `<div class="empty">点击上方「定位并查找附近」开始</div>`;
    }
    if (!list.length) {
      return `<div class="empty">附近没搜到餐饮店，换个更大的范围再试试。</div>`;
    }

    let title;
    if (opts.mode === "health") {
      title = `附近健康优选（${Scorer.goalLabel(opts.goal)}）`;
    } else {
      const meal = opts.filters.meal === "auto" ? Scorer.autoMeal() : opts.filters.meal;
      const mealTxt = MEAL_LABELS[meal];
      const spicyTxt = { any: "口味不限", no: "不辣", mild: "微辣", hot: "重辣" }[opts.filters.spicy];
      title = `周边美食（${opts.filters.keyword || "全部"}·${spicyTxt}·${opts.filters.people}人·${mealTxt}）`;
    }

    const cards = list.map((p) =>
      this.card(p, { ...opts, faved: Store.isFavorite(p.id) })
    ).join("");

    return `
      <div class="section-title">${title}
        <span class="count">从周边 ${opts.total} 家真实店铺中筛选 · 按${opts.mode === "health" ? "健康度+距离" : "匹配度+距离"}排序</span>
      </div>
      ${cards}`;
  },

  /** 收藏夹列表 */
  favorites(list) {
    if (!list.length) {
      return `<div class="empty">还没有收藏。点店铺卡片右上角的 ☆ 即可收藏。</div>`;
    }
    const items = list.map((f) => {
      const cat = (f.type || "").split(";").pop() || "餐饮";
      return `
      <div class="dish" data-id="${this.esc(f.id)}">
        <div class="dish-head">
          <div>
            <div class="dish-name">${this.esc(f.name)}</div>
            <div class="dish-cat">${this.esc(cat)}</div>
            <div class="dish-meta">${this.esc(f.address || "")}</div>
          </div>
          <button class="fav-btn faved" data-action="unfav" title="取消收藏">★</button>
        </div>
        <div class="links">
          <a class="link-btn link-amap" href="${this.amapUrl(f)}" target="_blank" rel="noopener">高德看店/导航</a>
        </div>
      </div>`;
    }).join("");
    return `<div class="section-title">我的收藏<span class="count">共 ${list.length} 家</span></div>${items}`;
  },

  /** 历史记录小条 */
  history(list) {
    if (!list.length) return "";
    const chips = list.map((h) =>
      `<span class="hist-chip" data-action="hist" data-label="${this.esc(h.label)}" data-lng="${h.center[0]}" data-lat="${h.center[1]}">${this.esc(h.label)}</span>`
    ).join("");
    return `<div class="history"><span class="hist-title">最近：</span>${chips}<span class="hist-clear" data-action="clear-hist">清空</span></div>`;
  },
};

if (typeof window !== "undefined") window.Render = Render;
