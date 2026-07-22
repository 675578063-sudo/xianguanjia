// components/privacy-popup/index.js
// 微信隐私授权弹窗组件（官方推荐实现）。
// 当小程序开启 __usePrivacyCheck__ 后，调用摄像头 / 相册 / 头像等隐私接口前会触发授权。
// 本组件监听 wx.onNeedPrivacyAuthorize 并在当前页展示；用户点击「同意」后放行，点击「拒绝」则拦截。
Component({
  data: {
    show: false,
    privacyContractName: ''
  },
  lifetimes: {
    attached() {
      const that = this;
      // 主动查询是否仍需授权（首次进入且后台已配置隐私协议时弹出）
      if (wx.getPrivacySetting) {
        wx.getPrivacySetting({
          success(res) {
            if (res.needAuthorization) {
              that.setData({ show: true, privacyContractName: res.privacyContractName || '' });
            }
          },
          fail() {}
        });
      }
      // 注册全局隐私授权监听：调用隐私接口时由框架触发，resolve 后接口才继续执行
      if (wx.onNeedPrivacyAuthorize) {
        wx.onNeedPrivacyAuthorize((resolve) => {
          that._resolve = resolve;
          that.setData({ show: true });
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
    handleAgree() {
      this.setData({ show: false });
      if (this._resolve) {
        this._resolve({ event: 'agree', allow: true });
        this._resolve = null;
      }
    },
    handleDisagree() {
      this.setData({ show: false });
      if (this._resolve) {
        this._resolve({ event: 'disagree', allow: false });
        this._resolve = null;
      }
    }
  }
});
