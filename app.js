// app.js - 鲜管家小程序入口
App({
  onLaunch() {
    // 初始化全局数据
    this.globalData = {
      foods: [],
      wasteRecords: [],
      settings: {
        remindDays: 1,
        remindTime: '17:00'
      }
    };
    this.loadStorage();

    // 检查是否有即将过期食品，触发订阅消息提醒
    this.checkReminders();
  },

  loadStorage() {
    try {
      const foods = wx.getStorageSync('xianguanjia_foods');
      const waste = wx.getStorageSync('xianguanjia_waste');
      const settings = wx.getStorageSync('xianguanjia_settings');
      if (foods) this.globalData.foods = JSON.parse(foods) || [];
      if (waste) this.globalData.wasteRecords = JSON.parse(waste) || [];
      if (settings) this.globalData.settings = JSON.parse(settings) || { remindDays: 1, remindTime: '17:00' };
    } catch (e) {
      console.error('读取本地存储失败', e);
    }
  },

  saveStorage() {
    try {
      wx.setStorageSync('xianguanjia_foods', JSON.stringify(this.globalData.foods));
      wx.setStorageSync('xianguanjia_waste', JSON.stringify(this.globalData.wasteRecords));
      wx.setStorageSync('xianguanjia_settings', JSON.stringify(this.globalData.settings));
    } catch (e) {
      console.error('保存本地存储失败', e);
    }
  },

  checkReminders() {
    const { foods, settings } = this.globalData;
    const remindDays = settings.remindDays || 1;
    const urgentFoods = foods.filter(f => {
      const days = this.daysUntil(this.getExpiryDate(f));
      return days >= 0 && days <= remindDays;
    });
    if (urgentFoods.length > 0) {
      // 请求一次性订阅消息授权（需要用户主动触发才能调用）
      // 实际发送需要云开发或服务端配合
    }
  },

  // 工具方法（全局可用）
  daysUntil(dateStr) {
    if (!dateStr) return 999;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  },

  getExpiryDate(food) {
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
  },

  // 状态边界：expired<0 | urgent 0~1 | soon 2~3 | ok 4~7 | safe>7
  getStatus(days) {
    if (days < 0) return 'expired';
    if (days <= 1) return 'urgent';
    if (days <= 3) return 'soon';
    if (days <= 7) return 'ok';
    return 'safe';
  },

  getStatusText(days) {
    if (days < 0) return '已过期' + Math.abs(days) + '天';
    if (days === 0) return '今天到期';
    if (days === 1) return '明天到期';
    return '剩余' + days + '天';
  },

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  }
});
