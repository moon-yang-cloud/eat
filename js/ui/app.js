/**
 * 应用主入口
 * ---------------------------------------------------------------------------
 * 维护界面状态（定位中心、模式、筛选条件、视图），绑定交互事件，串起
 * 高德服务 → 评分排序 → 渲染 的完整流程。
 * ---------------------------------------------------------------------------
 */
(function () {
  "use strict";

  // ---------------- 运行时状态 ----------------
  const state = {
    userCenter: null, // [lng, lat]
    address: "",
    view: "health", // health | food | fav
    goal: "balance",
    lastPois: [],
    filters: { keyword: "", spicy: "any", people: 2, meal: "auto" },
  };

  let els = {};

  function $(id) { return document.getElementById(id); }

  function init() {
    els = {
      setupCard: $("setupCard"),
      locateBtn: $("locateBtn"),
      locStatus: $("locStatus"),
      placeInput: $("placeInput"),
      placeBtn: $("placeBtn"),
      panelHealth: $("panelHealth"),
      panelFood: $("panelFood"),
      radiusSel: $("radiusSel"),
      results: $("results"),
      historyBar: $("historyBar"),
      toast: $("toast"),
    };

    // 未配置 Key
    if (!CONFIG.AMAP_KEY || !CONFIG.AMAP_SECURITY_CODE) {
      if (els.setupCard) els.setupCard.style.display = "block";
      setStatus("请先在 js/config.js 填入高德 Key 和安全密钥", "err");
      if (els.locateBtn) els.locateBtn.disabled = true;
      if (els.placeBtn) els.placeBtn.disabled = true;
    }

    bindEvents();
    renderFoodChips();
    renderHistory();
    renderCurrent();
    registerSW();
  }

  // ---------------- 事件绑定 ----------------
  function bindEvents() {
    els.locateBtn.addEventListener("click", locateAndSearch);

    // 地名搜索
    els.placeBtn.addEventListener("click", searchByPlace);
    els.placeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") searchByPlace();
    });

    // 视图切换（健康/美食/收藏）
    document.querySelectorAll(".view-btn").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    // 健康目标
    document.querySelectorAll(".goal-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".goal-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.goal = btn.dataset.goal;
        renderCurrent();
      });
    });

    // 半径变化
    els.radiusSel.addEventListener("change", () => {
      if (state.userCenter) doSearch();
    });

    // 美食筛选控件
    const kwInput = $("kwInput");
    kwInput.addEventListener("input", () => {
      state.filters.keyword = kwInput.value.trim();
      document.querySelectorAll("#kwChips .chip").forEach((c) => c.classList.remove("active"));
    });
    $("spicySel").addEventListener("change", (e) => { state.filters.spicy = e.target.value; if (state.userCenter) renderCurrent(); });
    $("peopleSel").addEventListener("change", (e) => { state.filters.people = parseInt(e.target.value, 10); if (state.userCenter) renderCurrent(); });
    $("mealSel").addEventListener("change", (e) => { state.filters.meal = e.target.value; if (state.userCenter) renderCurrent(); });
    $("foodSearchBtn").addEventListener("click", () => {
      if (!state.userCenter) { setStatus("请先点上方「定位并查找附近」获取位置", "err"); return; }
      doSearch();
    });

    // 结果区与历史区的事件委托
    els.results.addEventListener("click", onResultsClick);
    els.historyBar.addEventListener("click", onHistoryClick);
  }

  // ---------------- 视图切换 ----------------
  function switchView(view) {
    state.view = view;
    document.querySelectorAll(".view-btn").forEach((b) =>
      b.classList.toggle("active", b.dataset.view === view)
    );
    els.panelHealth.style.display = view === "health" ? "block" : "none";
    els.panelFood.style.display = view === "food" ? "block" : "none";
    // 切到搜索模式且已定位时，按新模式重新检索（关键词可能变化）
    if ((view === "health" || view === "food") && state.userCenter) {
      doSearch();
    } else {
      renderCurrent();
    }
  }

  // ---------------- 定位 + 搜索 ----------------
  async function locateAndSearch() {
    els.locateBtn.disabled = true;
    setStatus("正在加载高德地图…", "");
    try {
      await AmapService.load();
    } catch (e) {
      setStatus(e.message, "err");
      els.locateBtn.disabled = false;
      return;
    }
    setStatus("定位中…请允许浏览器/网页获取位置", "");
    try {
      const loc = await AmapService.locate();
      state.userCenter = loc.center;
      state.address = loc.address;
      setStatus(loc.address, "ok");
      Store.addHistory({ label: loc.address.replace(/^已按城市定位：/, ""), center: loc.center });
      renderHistory();
      await doSearch();
    } catch (e) {
      setStatus(e.message || "定位失败，请重试。", "err");
    } finally {
      els.locateBtn.disabled = false;
    }
  }

  // 按地名搜索：地理编码 → 定位 → 检索
  async function searchByPlace() {
    const place = els.placeInput.value.trim();
    if (!place) { setStatus("请输入一个地点名", "err"); return; }
    els.placeBtn.disabled = true;
    setStatus("正在解析地点…", "");
    try {
      await AmapService.load();
      const loc = await AmapService.geocode(place);
      state.userCenter = loc.center;
      state.address = loc.address;
      setStatus(loc.address, "ok");
      Store.addHistory({ label: place, center: loc.center });
      renderHistory();
      // 地名搜索默认切到搜索视图（保留当前 health/food）
      if (state.view === "fav") switchView("health");
      else await doSearch();
    } catch (e) {
      setStatus(e.message || "地点解析失败", "err");
    } finally {
      els.placeBtn.disabled = false;
    }
  }

  async function doSearch() {
    if (!state.userCenter) return;
    const radius = parseInt(els.radiusSel.value, 10);
    const kw = state.view === "food" ? state.filters.keyword || "" : "";
    els.results.innerHTML = `<div class="loading"><div class="spinner"></div>正在搜索 ${radius / 1000}km 内${kw ? "的「" + kw + "」" : "的餐饮店"}…</div>`;
    try {
      await AmapService.load();
      const pois = await AmapService.searchNearby(kw, state.userCenter, radius);
      pois.forEach((p) => { p._health = Scorer.healthScore(p); });
      state.lastPois = pois;
      renderCurrent();
    } catch (e) {
      els.results.innerHTML = `<div class="empty">搜索失败：${Render.esc(e.message || "未知错误")}</div>`;
    }
  }

  // ---------------- 渲染 ----------------
  function renderCurrent() {
    if (state.view === "fav") {
      els.results.innerHTML = Render.favorites(Store.getFavorites());
      return;
    }
    const list = state.lastPois
      .map((p) => ({ ...p, _rank: state.view === "health" ? Scorer.rankHealth(p, state.goal) : Scorer.rankFood(p, state.filters) }))
      .sort((a, b) => b._rank - a._rank)
      .slice(0, CONFIG.MAX_RESULTS);

    els.results.innerHTML = Render.results(list, {
      mode: state.view,
      goal: state.goal,
      filters: state.filters,
      userCenter: state.userCenter,
      total: state.lastPois.length,
    });
  }

  function renderHistory() {
    els.historyBar.innerHTML = Render.history(Store.getHistory());
  }

  function renderFoodChips() {
    const box = $("kwChips");
    if (!box) return;
    box.innerHTML = FOOD_CHIPS.map(
      (c) => `<span class="chip" data-kw="${Render.esc(c.kw)}">${Render.esc(c.label)}</span>`
    ).join("");
    box.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const active = chip.classList.contains("active");
        box.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
        const kwInput = $("kwInput");
        if (active) { state.filters.keyword = ""; kwInput.value = ""; }
        else { chip.classList.add("active"); state.filters.keyword = chip.dataset.kw; kwInput.value = chip.textContent; }
      });
    });
  }

  // ---------------- 事件委托处理 ----------------
  function onResultsClick(e) {
    const favBtn = e.target.closest('[data-action="fav"], [data-action="unfav"]');
    if (favBtn) {
      const card = favBtn.closest(".dish");
      const id = card && card.dataset.id;
      if (!id) return;
      if (favBtn.dataset.action === "unfav") {
        Store.removeFavorite(id);
        renderCurrent();
      } else {
        const poi = state.lastPois.find((p) => String(p.id) === String(id));
        if (poi) {
          const faved = Store.toggleFavorite(poi);
          favBtn.classList.toggle("faved", faved);
          favBtn.textContent = faved ? "★" : "☆";
          showToast(faved ? "已收藏" : "已取消收藏");
        }
      }
      return;
    }

    const mtBtn = e.target.closest('[data-action="meituan"]');
    if (mtBtn) {
      openMeituan(decodeURIComponent(mtBtn.dataset.name || ""));
    }
  }

  function onHistoryClick(e) {
    const clear = e.target.closest('[data-action="clear-hist"]');
    if (clear) { Store.clearHistory(); renderHistory(); return; }
    const chip = e.target.closest('[data-action="hist"]');
    if (chip) {
      state.userCenter = [parseFloat(chip.dataset.lng), parseFloat(chip.dataset.lat)];
      state.address = chip.dataset.label;
      setStatus(chip.dataset.label, "ok");
      doSearch();
    }
  }

  // 美团外卖：复制店名 + 打开外卖页
  function openMeituan(name) {
    const isMobile = /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);
    const url = isMobile
      ? "https://h5.waimai.meituan.com/waimai/mindex/home"
      : "https://www.meituan.com/";
    const open = () => window.open(url, "_blank", "noopener");
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(name).then(() => {
        showToast(`已复制「${name}」，在美团搜索框粘贴即可`);
        open();
      }).catch(() => { showToast("已打开美团外卖，请手动搜索店名"); open(); });
    } else {
      showToast("已打开美团外卖，请手动搜索店名");
      open();
    }
  }

  // ---------------- 小工具 ----------------
  function setStatus(text, cls) {
    els.locStatus.textContent = text;
    els.locStatus.className = "loc-status" + (cls ? " " + cls : "");
  }

  function showToast(msg) {
    const t = els.toast;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // 注册 Service Worker（PWA 离线壳）
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(() => {
          /* 离线能力不可用时静默降级 */
        });
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
