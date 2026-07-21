// pages/profile/profile.js - 个人中心与微信登录
const storage = require('../../utils/storage');
const dataUtil = require('../../utils/data');
const { requestSubscribe, TEMPLATE_IDS } = require('../../utils/subscribe');

Page({
  data: {
    isLoggedIn: false,
    userInfo: null,  // { avatarUrl, nickName, userId }
    // 统计数据
    totalFoods: 0,
    expiredCount: 0,
    soonExpireCount: 0,
    wasteCount: 0,
    wasteMoney: 0,
    // 设置
    remindDays: 1,
    remindTime: '17:00',
    // 数据管理
    showClearConfirm: false,
    // 编辑昵称
    showNicknameInput: false,
    tempNickname: ''
  },

  onLoad() {
    this.loadUserInfo();
    this.loadStats();
    const settings = storage.getSettings();
    this.setData({
      remindDays: settings.remindDays || 1,
      remindTime: settings.remindTime || '17:00'
    });
  },

  onShow() {
    this.loadStats();
  },

  // 加载本地用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('xianguanjia_user');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        this.setData({ isLoggedIn: true, userInfo: parsed });
      }
    } catch (e) {
      console.error('读取用户信息失败', e);
    }
  },

  // 加载统计数据
  loadStats() {
    const foods = storage.getFoods();
    const waste = storage.getWasteRecords();
    let expiredCount = 0;
    let soonExpireCount = 0;
    foods.forEach(f => {
      const expiry = dataUtil.getExpiryDate(f);
      const days = dataUtil.daysUntil(expiry);
      if (days < 0) expiredCount++;
      else if (days <= 3) soonExpireCount++;
    });
    const wasteMoney = waste.reduce((sum, w) => sum + (w.price || 0), 0);
    this.setData({
      totalFoods: foods.length,
      expiredCount,
      soonExpireCount,
      wasteCount: waste.length,
      wasteMoney: wasteMoney.toFixed(2)
    });
  },

  // 头像按钮点击（调试用 + 防止事件冒泡）
  onAvatarTap() {
    console.log('头像按钮被点击');
  },

  // 微信登录 - 获取头像
  onChooseAvatar(e) {
    console.log('chooseAvatar 回调触发', e);
    if (!e.detail || !e.detail.avatarUrl) {
      console.error('未获取到头像URL');
      return;
    }
    const avatarUrl = e.detail.avatarUrl;
    // 检查是否已有用户信息
    let userInfo = this.data.userInfo || {};
    userInfo.avatarUrl = avatarUrl;

    // 如果已有昵称，直接保存
    if (userInfo.nickName) {
      this.saveUserInfo(userInfo);
    } else {
      // 还没有昵称，弹出昵称输入
      this.setData({
        userInfo: userInfo,
        showNicknameInput: true,
        tempNickname: userInfo.nickName || ''
      });
    }
  },

  // 昵称输入 - 使用微信昵称填写组件
  onNicknameInput(e) {
    this.setData({ tempNickname: e.detail.value });
  },

  // 确认昵称
  onNicknameConfirm() {
    const nickname = this.data.tempNickname.trim();
    if (!nickname) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    let userInfo = this.data.userInfo || {};
    userInfo.nickName = nickname;
    userInfo.userId = this.generateUserId();
    userInfo.loginTime = new Date().toISOString();
    this.saveUserInfo(userInfo);
    this.setData({ showNicknameInput: false });
  },

  // 跳过昵称（只保存头像）
  onNicknameSkip() {
    let userInfo = this.data.userInfo || {};
    userInfo.nickName = '鲜管家用户';
    userInfo.userId = this.generateUserId();
    userInfo.loginTime = new Date().toISOString();
    this.saveUserInfo(userInfo);
    this.setData({ showNicknameInput: false });
  },

  // 生成用户ID
  generateUserId() {
    return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  },

  // 保存用户信息到本地
  saveUserInfo(userInfo) {
    try {
      wx.setStorageSync('xianguanjia_user', JSON.stringify(userInfo));
      this.setData({ isLoggedIn: true, userInfo: userInfo });
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (e) {
      console.error('保存用户信息失败', e);
    }
  },

  // 微信登录（获取 code，用于后续云开发/后端对接）
  wxLogin() {
    wx.login({
      success: res => {
        console.log('wx.login code:', res.code);
        // code 可发送到后端换取 openid / session_key
        // 当前版本暂存本地，后续接入云开发后可直接使用
        let userInfo = this.data.userInfo || {};
        userInfo.loginCode = res.code;
        this.saveUserInfo(userInfo);
      },
      fail: err => {
        console.error('wx.login 失败', err);
      }
    });
  },

  // 编辑头像
  onEditAvatar() {
    // 同 onChooseAvatar
  },

  // 编辑昵称
  onEditNickname() {
    this.setData({
      showNicknameInput: true,
      tempNickname: this.data.userInfo.nickName || ''
    });
  },

  // 退出登录
  onLogout() {
    wx.showModal({
      title: '确认退出',
      content: '退出后用户信息将清除，食品数据保留',
      confirmColor: '#ef4444',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('xianguanjia_user');
          this.setData({ isLoggedIn: false, userInfo: null });
          wx.showToast({ title: '已退出', icon: 'success' });
        }
      }
    });
  },

  // 清空所有数据
  onClearData() {
    wx.showModal({
      title: '⚠️ 清空所有数据',
      content: '此操作不可恢复！所有食品和浪费记录将被删除',
      confirmColor: '#ef4444',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('xianguanjia_foods');
          wx.removeStorageSync('xianguanjia_waste');
          wx.removeStorageSync('xianguanjia_settings');
          // 同步全局
          const app = getApp();
          app.globalData.foods = [];
          app.globalData.wasteRecords = [];
          app.globalData.settings = { remindDays: 1, remindTime: '17:00' };
          this.loadStats();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // 导出数据
  onExportData() {
    const foods = storage.getFoods();
    const waste = storage.getWasteRecords();
    const exportData = {
      foods,
      wasteRecords: waste,
      exportTime: new Date().toISOString(),
      user: this.data.userInfo
    };
    const jsonStr = JSON.stringify(exportData, null, 2);
    // 写入临时文件
    const fs = wx.getFileSystemManager();
    const path = wx.env.USER_DATA_PATH + '/xianguanjia_export.json';
    fs.writeFile({
      filePath: path,
      data: jsonStr,
      encoding: 'utf8',
      success: () => {
        wx.shareFileMessage({
          filePath: path,
          fileName: '鲜管家数据_' + new Date().toISOString().split('T')[0] + '.json',
          success: () => {
            wx.showToast({ title: '分享成功', icon: 'success' });
          },
          fail: () => {
            // 如果分享失败，复制到剪贴板
            wx.setClipboardData({
              data: jsonStr,
              success: () => {
                wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
              }
            });
          }
        });
      }
    });
  },

  // 提醒天数变更
  onRemindDaysChange(e) {
    const val = e.detail.value;
    const options = [1, 3, 7];
    const days = options[val];
    this.setData({ remindDays: days });
    const settings = storage.getSettings();
    settings.remindDays = days;
    storage.saveSettings(settings);
    const app = getApp();
    app.globalData.settings = settings;
  },

  // 提醒时间变更
  onRemindTimeChange(e) {
    this.setData({ remindTime: e.detail.value });
    const settings = storage.getSettings();
    settings.remindTime = e.detail.value;
    storage.saveSettings(settings);
    const app = getApp();
    app.globalData.settings = settings;
  },

  // 请求订阅消息授权（文档 11.2：授权状态以微信实际结果为准，不承诺永久）
  onRequestSubscribe() {
    if (TEMPLATE_IDS[0].indexOf('your_template_id') === 0) {
      wx.showModal({
        title: '订阅消息未配置',
        content: '请在微信公众平台申请订阅消息模板 ID，并在 utils/subscribe.js 中替换占位值后，才能真机接收提醒。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    requestSubscribe();
    wx.showToast({ title: '已发起授权', icon: 'none' });
  },

  // 关于页面
  onAbout() {
    wx.showModal({
      title: '鲜管家 v1.0',
      content: '食品保质期管理小程序\n帮你追踪冰箱里每一样食物的新鲜度，减少浪费，科学饮食。\n\n数据存储在本地，安全可靠。',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
