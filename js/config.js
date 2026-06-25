/**
 * 全局配置
 * ---------------------------------------------------------------------------
 * 高德地图 Key 与安全密钥写在前端会被公开，请到高德开放平台为该 Key 配置
 * 域名白名单（如 Pages 域名），以防盗用。
 *
 * 申请：https://lbs.amap.com/  应用管理 → 创建应用 → 添加 Key，
 *       服务平台选「Web端(JS API)」，会得到 Key 和安全密钥两项，都要填。
 * ---------------------------------------------------------------------------
 */
const CONFIG = {
  // ↓↓↓ 换号时只改这两行 ↓↓↓
  AMAP_KEY: "926d17e89db105705901cf8c38be3e86",
  AMAP_SECURITY_CODE: "0bca67138fe3eb9ca2d5ee23b95a048d",
  // ↑↑↑ ----------------- ↑↑↑

  DEFAULT_RADIUS: 3000, // 默认搜索半径（米）
  MAX_RESULTS: 25, // 结果最多展示条数
  GEO_TIMEOUT: 10000, // 定位超时（毫秒）
  FAV_KEY: "healthyEat.favorites.v1", // 收藏夹 localStorage 键
  HISTORY_KEY: "healthyEat.history.v1", // 搜索历史 localStorage 键
  HISTORY_LIMIT: 8, // 历史记录保留条数
};

if (typeof window !== "undefined") window.CONFIG = CONFIG;
if (typeof module !== "undefined" && module.exports) module.exports = { CONFIG };
