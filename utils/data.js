// utils/data.js - 食品分类与存储定义

const CATEGORIES = [
  { id: 'dairy', name: '乳制品', icon: '🥛', defaultShelf: 7 },
  { id: 'meat', name: '肉禽蛋', icon: '🥩', defaultShelf: 3 },
  { id: 'veggie', name: '蔬果', icon: '🥬', defaultShelf: 5 },
  { id: 'bread', name: '面包糕点', icon: '🍞', defaultShelf: 5 },
  { id: 'drink', name: '饮品', icon: '🧃', defaultShelf: 30 },
  { id: 'condiment', name: '调味品', icon: '🧂', defaultShelf: 365 },
  { id: 'snack', name: '零食', icon: '🍪', defaultShelf: 90 },
  { id: 'frozen', name: '冷冻食品', icon: '🧊', defaultShelf: 90 },
  { id: 'seafood', name: '水产海鲜', icon: '🐟', defaultShelf: 2 },
  { id: 'canned', name: '罐头', icon: '🥫', defaultShelf: 365 },
  { id: 'deli', name: '熟食卤味', icon: '🥡', defaultShelf: 2 },
  { id: 'other', name: '其他', icon: '📦', defaultShelf: 30 },
];

const STORAGE_LOCATIONS = [
  { id: 'fridge', name: '冷藏', icon: '❄️' },
  { id: 'freezer', name: '冷冻', icon: '🧊' },
  { id: 'room', name: '常温', icon: '🌡️' },
  { id: 'shade', name: '阴凉处', icon: '🍃' },
];

const UNITS = ['盒', '袋', '瓶', '罐', '包', '块', '斤', '个', '条'];

function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
}

function getStorageById(id) {
  return STORAGE_LOCATIONS.find(s => s.id === id) || STORAGE_LOCATIONS[2];
}

function daysUntil(dateStr) {
  if (!dateStr) return 999;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  // 自然日差：双方均已对齐到当天 0 点，直接按整日四舍五入
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryDate(food) {
  if (food.opened && food.openedDate && food.openedShelfLife) {
    const d = new Date(food.openedDate);
    d.setDate(d.getDate() + parseInt(food.openedShelfLife));
    return d.toISOString().split('T')[0];
  }
  if (food.expiryDate) return food.expiryDate;
  if (food.productionDate && food.shelfLife) {
    const d = new Date(food.productionDate);
    d.setDate(d.getDate() + parseInt(food.shelfLife));
    return d.toISOString().split('T')[0];
  }
  return null;
}

// 解析到期日最终生效来源（与 getExpiryDate 优先级一致）
function resolveExpirySource(food) {
  if (food.opened && food.openedDate && food.openedShelfLife) return 'opened';
  if (food.expiryDate) return 'direct';
  if (food.productionDate && food.shelfLife) return 'computed';
  return 'unknown';
}

// 状态边界（无重叠，靠早返回实现）：
// expired < 0 | urgent 0~1 | soon 2~3 | ok 4~7 | safe > 7
function getStatus(days) {
  if (days < 0) return 'expired';
  if (days <= 1) return 'urgent';
  if (days <= 3) return 'soon';
  if (days <= 7) return 'ok';
  return 'safe';
}

function getStatusText(days) {
  if (days < 0) return '已过期' + Math.abs(days) + '天';
  if (days === 0) return '今天到期';
  if (days === 1) return '明天到期';
  return '剩余' + days + '天';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dateStr;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

module.exports = {
  CATEGORIES,
  STORAGE_LOCATIONS,
  UNITS,
  getCategoryById,
  getStorageById,
  daysUntil,
  getExpiryDate,
  resolveExpirySource,
  getStatus,
  getStatusText,
  formatDate,
  generateId
};
