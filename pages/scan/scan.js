// pages/scan/scan.js - 扫码页（文档 9.1）
const product = require('../../utils/product');

Page({
  data: {
    status: 'waiting', // waiting | scanning | denied
    hint: '对准包装上的商品条码或二维码',
    fromAdd: false
  },

  _scanning: false,
  _sessionId: '',

  onLoad(options) {
    this.setData({ fromAdd: options.fromAdd === '1' });
    // 进入即尝试扫码
    this.startScan();
  },

  onShow() {
    // 若刚完成一次入库（来自确认页），提示成功并等待继续扫码
    const app = getApp();
    if (app && app.globalData && app.globalData.lastScanSaved) {
      app.globalData.lastScanSaved = false;
      wx.showToast({ title: '已加入库存', icon: 'success' });
    }
  },

  startScan() {
    if (this._scanning) return;
    this._scanning = true;
    this.setData({ status: 'scanning', hint: '正在识别…' });
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode', 'datamatrix'],
      success: (res) => {
        this._scanning = false;
        this.handleResult(res);
      },
      fail: (err) => {
        this._scanning = false;
        this.onScanFail(err);
      }
    });
  },

  handleResult(res) {
    const parsed = product.parseScanResult(res);
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    // 扫描会话 ID（用于幂等 / 防重复入库，文档 14/15.3）
    app.globalData.scanDraft = {
      branch: parsed.branch,
      codeType: parsed.codeType,
      code: parsed.code,
      reason: parsed.reason || '',
      sessionId: 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      fromAdd: this.data.fromAdd
    };

    if (parsed.branch === 'D') {
      this.promptFallback(parsed.reason + '。可重新扫描或手动添加。', '无法识别');
      return;
    }
    if (parsed.branch === 'C') {
      this.promptFallback('当前版本暂不支持自建二维码自动读取，请手动添加或重新扫描商品条码。', '自建标签');
      return;
    }
    if (parsed.branch === 'E') {
      this.promptFallback(parsed.reason + '。可重新扫描、开灯或手动添加。', '未识别');
      return;
    }

    // 分支 A：标准商品码 → 查询个人模板
    const tpl = product.lookupProduct(parsed.code);
    app.globalData.scanDraft.template = tpl;
    app.globalData.scanDraft.templateHit = !!tpl;
    wx.navigateTo({ url: '/pages/scanresult/scanresult' });
  },

  promptFallback(content, title) {
    wx.showModal({
      title: title,
      content: content,
      confirmText: '重新扫描',
      cancelText: '手动添加',
      success: (r) => {
        if (r.confirm) this.startScan();
        else this.goManual();
      }
    });
  },

  onScanFail(err) {
    const msg = (err && err.errMsg) || '';
    if (msg.indexOf('cancel') >= 0) {
      // 用户主动取消：返回或留在待扫状态
      if (this.data.fromAdd) {
        wx.navigateBack();
      } else {
        this.setData({ status: 'waiting', hint: '对准包装上的商品条码或二维码' });
      }
      return;
    }
    // 相机权限被拒绝
    this.setData({ status: 'denied', hint: '相机权限被拒绝' });
  },

  onManualTap() { this.goManual(); },
  goManual() {
    if (this.data.fromAdd) {
      wx.navigateBack();
    } else {
      wx.navigateTo({ url: '/pages/add/add' });
    }
  },

  onAlbumTap() {
    // 从相册识别（文档 9.1）
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['barCode', 'qrCode', 'datamatrix'],
      success: (res) => this.handleResult(res),
      fail: (err) => this.onScanFail(err)
    });
  },

  onLightTap() {
    // 微信扫码原生界面自带闪光灯；此处重新唤起扫码以使用其灯光
    this.startScan();
  },

  onRetryTap() { this.startScan(); },

  onOpenSetting() {
    wx.openSetting({
      success: (res) => {
        if (res.authSetting && res.authSetting['scope.camera']) {
          this.setData({ status: 'waiting' });
          this.startScan();
        }
      }
    });
  }
});
