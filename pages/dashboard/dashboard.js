// pages/dashboard/dashboard.js
const { getCategoryById, getStorageById, daysUntil, getExpiryDate, getStatus, getStatusText } = require('../../utils/data');
const { getFoods, getWasteRecords } = require('../../utils/storage');

Page({
  data: {
    expiredCount: 0,
    urgentCount: 0,
    totalCount: 0,
    totalValue: 0,
    wasteValue: 0,
    priorityList: [],
    categorySummary: []
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    // 仅统计在管（未食用/丢弃）的食品
    const allFoods = getFoods();
    const foods = allFoods.filter(f => f.business_status === 'active');
    const wasteRecords = getWasteRecords();

    const expiredCount = foods.filter(f => daysUntil(getExpiryDate(f)) < 0).length;
    const urgentCount = foods.filter(f => {
      const d = daysUntil(getExpiryDate(f));
      return d >= 0 && d <= 1;
    }).length;
    const totalCount = foods.length;
    // 库存价值按剩余数量比例计算
    const totalValue = foods.reduce((s, f) => {
      const remain = (f.remaining_quantity != null) ? f.remaining_quantity : (f.quantity || 1);
      return s + (f.price || 0) * remain;
    }, 0);
    const wasteValue = wasteRecords.reduce((s, w) => s + (w.price || 0), 0);

    // 优先级排序（已过期单独置顶，标签为「需处理」）
    const sorted = [...foods].sort((a, b) => daysUntil(getExpiryDate(a)) - daysUntil(getExpiryDate(b)));
    const priorityList = sorted.slice(0, 8).map(f => {
      const days = daysUntil(getExpiryDate(f));
      const status = getStatus(days);
      const cat = getCategoryById(f.category);
      const storage = getStorageById(f.storage);
      const dotClass = status === 'expired' ? 'urgent' : status === 'urgent' ? 'urgent' : status === 'soon' ? 'soon' : 'ok';
      return {
        id: f.id,
        name: cat.icon + ' ' + f.name,
        meta: (status === 'expired' ? '需处理 · ' : '') + storage.name + ' · ' + (f.opened ? '已开封' : '未开封'),
        days,
        daysText: getStatusText(days),
        dotClass,
        daysClass: dotClass
      };
    });

    // 分类概览（仅统计在管）
    const catMap = {};
    foods.forEach(f => {
      if (!catMap[f.category]) catMap[f.category] = { total: 0, expired: 0 };
      catMap[f.category].total++;
      if (daysUntil(getExpiryDate(f)) < 0) catMap[f.category].expired++;
    });

    const categorySummary = Object.keys(catMap).map(catId => {
      const cat = getCategoryById(catId);
      const s = catMap[catId];
      const percent = totalCount > 0 ? (s.total / totalCount) * 100 : 0;
      return {
        name: cat.icon + ' ' + cat.name,
        total: s.total,
        expired: s.expired,
        hasExpired: s.expired > 0,
        percent: Math.max(percent, 8) // 最小显示8%
      };
    });

    this.setData({
      expiredCount,
      urgentCount,
      totalCount,
      totalValue: totalValue.toFixed(0),
      wasteValue: wasteValue.toFixed(0),
      priorityList,
      categorySummary
    });
  },

  onPriorityTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  onAddTap() {
    wx.showActionSheet({
      itemList: ['扫码识别', '手动添加'],
      success: (res) => {
        if (res.tapIndex === 0) wx.navigateTo({ url: '/pages/scan/scan' });
        else wx.navigateTo({ url: '/pages/add/add' });
      }
    });
  },

  onGoToFoodList() {
    wx.switchTab({ url: '/pages/foodlist/foodlist' });
  },

  onStatTap(e) {
    const filter = e.currentTarget.dataset.filter;
    // switchTab 无法带参，用 globalData 桥接 filter 到食品库页
    const app = getApp();
    if (app) {
      if (!app.globalData) app.globalData = {};
      app.globalData.pendingFoodlistFilter = filter;
    }
    wx.switchTab({ url: '/pages/foodlist/foodlist' });
  }
});
