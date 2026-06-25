/**
 * 本地存储：收藏夹 与 搜索历史
 * ---------------------------------------------------------------------------
 * 基于 localStorage 持久化用户收藏的店铺与最近的位置/关键词搜索记录。
 * 读写做了容错，localStorage 不可用时降级为内存存储，不影响主流程。
 * ---------------------------------------------------------------------------
 */

const Store = {
  _mem: {}, // localStorage 不可用时的内存兜底

  _read(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return this._mem[key] || null;
    }
  },

  _write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      this._mem[key] = value;
    }
  },

  // ---------------- 收藏夹 ----------------
  getFavorites() {
    return this._read(CONFIG.FAV_KEY) || [];
  },

  isFavorite(id) {
    return this.getFavorites().some((f) => f.id === id);
  },

  /** 切换收藏状态，返回切换后的布尔值（true=已收藏） */
  toggleFavorite(poi) {
    const list = this.getFavorites();
    const idx = list.findIndex((f) => f.id === poi.id);
    if (idx >= 0) {
      list.splice(idx, 1);
      this._write(CONFIG.FAV_KEY, list);
      return false;
    }
    list.unshift({
      id: poi.id,
      name: poi.name,
      type: poi.type,
      address: poi.address,
      location: poi.location,
      savedAt: Date.now(),
    });
    this._write(CONFIG.FAV_KEY, list);
    return true;
  },

  removeFavorite(id) {
    const list = this.getFavorites().filter((f) => f.id !== id);
    this._write(CONFIG.FAV_KEY, list);
  },

  // ---------------- 搜索历史 ----------------
  getHistory() {
    return this._read(CONFIG.HISTORY_KEY) || [];
  },

  /** 记录一次搜索（按地点名去重，最新置顶，超出上限截断） */
  addHistory(entry) {
    if (!entry || !entry.label) return;
    let list = this.getHistory().filter((h) => h.label !== entry.label);
    list.unshift({ ...entry, at: Date.now() });
    if (list.length > CONFIG.HISTORY_LIMIT) list = list.slice(0, CONFIG.HISTORY_LIMIT);
    this._write(CONFIG.HISTORY_KEY, list);
  },

  clearHistory() {
    this._write(CONFIG.HISTORY_KEY, []);
  },
};

if (typeof window !== "undefined") window.Store = Store;
if (typeof module !== "undefined" && module.exports) module.exports = { Store };
