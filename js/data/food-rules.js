/**
 * 美食筛选规则与价格估算规则
 * ---------------------------------------------------------------------------
 * 用于"周边美食模式"的口味识别、餐次识别，以及人均价格区间的启发式估算。
 * ---------------------------------------------------------------------------
 */

// 辣味识别：命中则视为偏辣
const SPICY_RE = /川|湘|渝|麻辣|火锅|水煮|冒菜|香锅|烤鱼|椒麻|重庆|成都|江西|贵州|辣|椒/;

// 各餐次的关键词
const MEAL_RE = {
  breakfast: /早餐|包子|粥|豆浆|肠粉|煎饼|油条|馄饨|烧麦|早点/,
  night: /烧烤|夜宵|宵夜|串|大排档|麻辣烫|小吃|啤酒|烤串/,
  lunch: /快餐|盖|饭|面|简餐|套餐/,
  dinner: /餐厅|火锅|烤|菜馆|饭店|料理/,
};

// 餐次中文名
const MEAL_LABELS = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  night: "夜宵",
};

// 美食模式快捷关键词标签
const FOOD_CHIPS = [
  { kw: "火锅", label: "火锅" },
  { kw: "烧烤", label: "烧烤" },
  { kw: "日料", label: "日料" },
  { kw: "川菜", label: "川菜" },
  { kw: "面", label: "面食" },
  { kw: "米饭快餐", label: "快餐" },
  { kw: "海鲜", label: "海鲜" },
  { kw: "轻食沙拉", label: "轻食" },
  { kw: "甜品咖啡", label: "甜品/咖啡" },
];

// 价格区间估算规则：按顺序匹配店名/品类，命中即返回 [低, 高]（人均，元）
const PRICE_RULES = [
  { re: /沙拉|轻食|健身|减脂|低脂/, range: [25, 45] },
  { re: /寿司|日料|刺身|海鲜/, range: [40, 80] },
  { re: /火锅|烤肉|烧烤/, range: [60, 120] },
  { re: /咖啡|奶茶|甜品|蛋糕|面包|烘焙/, range: [15, 35] },
  { re: /粥|汤|面|米线|麻辣烫|快餐|盖|饭|馄饨|饺/, range: [15, 30] },
];
const PRICE_DEFAULT = [20, 45];

if (typeof window !== "undefined") {
  window.SPICY_RE = SPICY_RE;
  window.MEAL_RE = MEAL_RE;
  window.MEAL_LABELS = MEAL_LABELS;
  window.FOOD_CHIPS = FOOD_CHIPS;
  window.PRICE_RULES = PRICE_RULES;
  window.PRICE_DEFAULT = PRICE_DEFAULT;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SPICY_RE, MEAL_RE, MEAL_LABELS, FOOD_CHIPS, PRICE_RULES, PRICE_DEFAULT };
}
