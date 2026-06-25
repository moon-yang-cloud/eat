/**
 * 健康度评分规则
 * ---------------------------------------------------------------------------
 * 由于外卖/地图平台没有开放"每道菜的营养成分"接口，本系统通过店名与品类
 * 的关键词来估算健康度：命中健康关键词加分，命中高油炸/高糖/高碳水关键词减分。
 * 这是一种启发式判断，仅供参考。
 * ---------------------------------------------------------------------------
 */

// 健康关键词 → 加分权重
const HEALTHY = {
  沙拉: 30, 轻食: 30, 健身: 28, 减脂: 28, 低脂: 28, 健康: 18, 营养: 14,
  蒸: 16, 鸡胸: 24, 粥: 12, 汤: 10, 蔬菜: 20, 素食: 22, 全麦: 18,
  寿司: 14, 日料: 14, 刺身: 18, 海鲜: 12, 鱼: 12, 牛肉: 8, 豆腐: 10, 关东煮: 8,
};

// 不健康关键词 → 减分权重
const UNHEALTHY = {
  炸: -30, 汉堡: -26, 披萨: -24, 薯: -20, 奶茶: -30, 甜品: -22, 蛋糕: -24,
  烘焙: -16, 面包: -14, 盖浇: -12, 盖饭: -12, 炒饭: -12, 烧烤: -16, 火锅: -12,
  麻辣烫: -6, 米线: -8, 拉面: -12, 螺蛳粉: -8, 煎饼: -12, 糖: -12, 卤: -4,
};

// 健康目标 → 标签
const GOALS = {
  balance: { id: "balance", label: "均衡" },
  fatloss: { id: "fatloss", label: "减脂控碳" },
  muscle: { id: "muscle", label: "增肌高蛋白" },
};

// 增肌目标偏好的高蛋白关键词
const MUSCLE_PROTEIN_RE = /鸡胸|牛肉|鱼|海鲜|蛋|健身/;

// 各目标对应的小贴士
const GOAL_TIPS = {
  balance: "均衡饮食：每餐保证蛋白质 + 蔬菜 + 适量主食，少油少糖。",
  fatloss: "减脂控碳：优先高蛋白低碳水，主食减半，避免含糖饮料和油炸。",
  muscle: "增肌高蛋白：增加鸡胸、牛肉、鱼、蛋等优质蛋白，配合训练。",
};

if (typeof window !== "undefined") {
  window.HEALTHY = HEALTHY;
  window.UNHEALTHY = UNHEALTHY;
  window.GOALS = GOALS;
  window.MUSCLE_PROTEIN_RE = MUSCLE_PROTEIN_RE;
  window.GOAL_TIPS = GOAL_TIPS;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { HEALTHY, UNHEALTHY, GOALS, MUSCLE_PROTEIN_RE, GOAL_TIPS };
}
