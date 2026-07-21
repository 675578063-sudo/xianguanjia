// app.js - 鲜管家小程序入口
const { daysUntil, getExpiryDate, getStatus, getStatusText, generateId } = require('./utils/data');

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
      const days = daysUntil(getExpiryDate(f));
      return days >= 0 && days <= remindDays;
    });
    if (urgentFoods.length > 0) {
      // 请求一次性订阅消息授权（需要用户主动触发才能调用）
      // 实际发送需要云开发或服务端配合
    }
  }
});

