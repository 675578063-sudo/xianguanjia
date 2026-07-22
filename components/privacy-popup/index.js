// components/privacy-popup/index.js
// 微信隐私授权弹窗组件（官方推荐实现）。
// 仅在调用摄像头 / 相册 / 头像等隐私接口、且尚未授权时，由框架触发 onNeedPrivacyAuthorize 弹出。
// 注意：不要在页面加载时主动弹全屏遮罩，否则会拦截页面上所有点击（头像、导出等都会"没反应"）。
Component({
  data: {
    show: false,
    privacyContractName: ''
  },
  lifetimes: {
    attached() {
      const that = this;
      // 仅注册全局隐私授权监听：调用隐私接口时由框架触发，resolve 后接口才继续执行。
      // 不在此主动查询并弹出遮罩，避免拦截页面交互。
      if (wx.onNeedPrivacyAuthorize) {
        wx.onNeedPrivacyAuthorize((resolve) => {
          that._resolve = resolve;
          that.setData({ show: true, privacyContractName: that._contractName || '' });
        });
      }
      // 主动读取协议名称（仅用于展示文案，不弹遮罩）
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success(res) {
            if (res.privacyContractName) that._contractName = res.privacyContractName;
          },
          fail() {}
        });
      }
    }
  },
  methods: {
    openPrivacyContract() {
      if (wx.openPrivacyContract) {
        wx.openPrivacyContract({ fail() {} });
      }
    },
    // 同意按钮使用 open-type="agreePrivacyAuthorization"：框架会自动调用 wx.agreePrivacyAuthorization()
    // 并放行此前被拦截的隐私接口，这里只需关闭弹窗，切勿再次手动 resolve（避免重复调用）。
    handleAgree() {
      this.setData({ show: false });
    },
    // 拒绝：必须调用 resolve 让被拦截的接口调用结束（否则会一直挂起）
    handleDisagree() {
      this.setData({ show: false });
      if (this._resolve) {
        this._resolve({ event: 'disagree', allow: false });
        this._resolve = null;
      }
    }
  }
});
