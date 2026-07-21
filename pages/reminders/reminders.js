// pages/reminders/reminders.js - 提醒页
const { getCategoryById, getStorageById, daysUntil, getExpiryDate, getStatus, getStatusText, formatDate } = require('../../utils/data');
const { getFoods, getSettings, saveSettings } = require('../../utils/storage');

Page({
  data: {
    remindDays: 1,
    remindTime: '17:00',
    daysOptions: [
      { val: 1, label: '1天', active: true },
      { val: 3, label: '3天', active: false },
      { val: 7, label: '7天', active: false }
    ],
    reminderList: []
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    const settings = getSettings();
    const foods = getFoods();
    const remindDays = settings.remindDays || 1;

    const daysOptions = [
      { val: 1, label: '1天', active: remindDays === 1 },
      { val: 3, label: '3天', active: remindDays === 3 },
      { val: 7, label: '7天', active: remindDays === 7 }
    ];

    const reminders = foods.filter(f => {
      const days = daysUntil(getExpiryDate(f));
      return days <= remindDays && days >= -7;
    }).sort((a, b) => daysUntil(getExpiryDate(a)) - daysUntil(getExpiryDate(b)));

    const reminderList = reminders.map(f => {
      const days = daysUntil(getExpiryDate(f));
      const status = getStatus(days);
      const cat = getCategoryById(f.category);
      const storage = getStorageById(f.storage);
      return {
        id: f.id,
        icon: cat.icon,
        name: f.name,
        detail: formatDate(getExpiryDate(f)) + ' · ' + storage.name,
        daysText: getStatusText(days),
        iconClass: status === 'expired' ? 'expired' : (days <= 3 ? 'soon' : 'ok'),
        dateClass: days < 0 ? 'expired' : 'soon'
      };
    });

    this.setData({
      remindDays,
      remindTime: settings.remindTime || '17:00',
      daysOptions,
      reminderList
    });
  },

  onDaysTap(e) {
    const val = parseInt(e.currentTarget.dataset.val);
    const settings = getSettings();
    settings.remindDays = val;
    saveSettings(settings);
    this.refreshData();
  },

  onTimeInput(e) {
    const settings = getSettings();
    settings.remindTime = e.detail.value;
    saveSettings(settings);
    this.setData({ remindTime: e.detail.value });
  },

  onReminderTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  }
});
