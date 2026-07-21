// utils/storage.js - 本地存储封装

const KEYS = {
  foods: 'xianguanjia_foods',
  waste: 'xianguanjia_waste',
  settings: 'xianguanjia_settings',
  user: 'xianguanjia_user'
};

// 数据迁移：为旧版本（无新字段）的食品记录补默认值
// business_status: active=在管 / consumed=已食用 / discarded=已丢弃
// remaining_quantity: 剩余数量（部分食用后递减）
// expiry_source: 到期日来源 computed=生产+保质期 / direct=直接到期日 / opened=开封 / unknown=未知
// events: 操作事件日志（创建/开封/部分食用/食用/丢弃），用于"商品+批次+事件"数据基础
function normalizeFood(f) {
  if (!f || typeof f !== 'object') return f;
  return {
    ...f,
    business_status: f.business_status || 'active',
    remaining_quantity: (f.remaining_quantity != null) ? f.remaining_quantity : (f.quantity || 1),
    expiry_source: f.expiry_source || 'unknown',
    events: Array.isArray(f.events) ? f.events : []
  };
}

function getFoods() {
  try {
    const data = wx.getStorageSync(KEYS.foods);
    const arr = data ? JSON.parse(data) : [];
    return Array.isArray(arr) ? arr.map(normalizeFood) : [];
  } catch (e) {
    return [];
  }
}

function saveFoods(foods) {
  try {
    wx.setStorageSync(KEYS.foods, JSON.stringify(foods));
  } catch (e) {
    console.error('保存食品数据失败', e);
  }
}

function getWasteRecords() {
  try {
    const data = wx.getStorageSync(KEYS.waste);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveWasteRecords(records) {
  try {
    wx.setStorageSync(KEYS.waste, JSON.stringify(records));
  } catch (e) {
    console.error('保存浪费记录失败', e);
  }
}

function getSettings() {
  try {
    const data = wx.getStorageSync(KEYS.settings);
    return data ? JSON.parse(data) : { remindDays: 1, remindTime: '17:00' };
  } catch (e) {
    return { remindDays: 1, remindTime: '17:00' };
  }
}

function saveSettings(settings) {
  try {
    wx.setStorageSync(KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error('保存设置失败', e);
  }
}

function getUserInfo() {
  try {
    const data = wx.getStorageSync(KEYS.user);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

function saveUserInfo(userInfo) {
  try {
    wx.setStorageSync(KEYS.user, JSON.stringify(userInfo));
  } catch (e) {
    console.error('保存用户信息失败', e);
  }
}

function clearUserInfo() {
  try {
    wx.removeStorageSync(KEYS.user);
  } catch (e) {
    console.error('清除用户信息失败', e);
  }
}

module.exports = {
  getFoods,
  saveFoods,
  getWasteRecords,
  saveWasteRecords,
  getSettings,
  saveSettings,
  getUserInfo,
  saveUserInfo,
  clearUserInfo
};
