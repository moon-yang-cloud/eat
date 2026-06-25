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

  // 评分与排序权重（可按需调优）
  SCORING: {
    HEALTH_DIST_PENALTY: 8, // 健康模式：每公里扣分
    FATLOSS_FACTOR: 0.5, // 减脂目标：健康分额外加权系数
    MUSCLE_PROTEIN_BONUS: 18, // 增肌目标：命中高蛋白关键词加分
    FOOD_BASE: 50, // 美食模式：基础分
    FOOD_DIST_PENALTY: 12, // 美食模式：每公里扣分
    FOOD_KEYWORD_BONUS: 25, // 美食模式：命中关键词加分
    FOOD_MEAL_BONUS: 16, // 命中餐次关键词加分
    SPICY_NO_PENALTY: 40, // 不吃辣却是辣店：扣分
    SPICY_HOT_BONUS: 22, // 爱吃辣且是辣店：加分
  },
};

if (typeof window !== "undefined") window.CONFIG = CONFIG;
if (typeof module !== "undefined" && module.exports) module.exports = { CONFIG };
