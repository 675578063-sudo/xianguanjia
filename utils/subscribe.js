// utils/subscribe.js - 微信订阅消息（文档 11.2）
// 仅在用户成功添加第一件商品后调用，不在进入小程序时索取。
// 占位模板 ID 需在【微信公众平台 → 功能 → 订阅消息 → 我的模板】申请真实模板后替换本数组；
// 未配置（仍为 your_template_id_*）时自动跳过，绝不伪造成功，也不承诺永久提醒。
const TEMPLATE_IDS = ['your_template_id_1', 'your_template_id_2'];

function requestSubscribe() {
  // 仍是占位 ID 则跳过（文档 19：不把一次授权描述为永久提醒，也不伪造成功）
  if (TEMPLATE_IDS[0].indexOf('your_template_id') === 0) {
    console.warn('订阅消息模板 ID 未配置，跳过申请');
    return;
  }
  wx.requestSubscribeMessage({
    tmplIds: TEMPLATE_IDS,
    success: () => {
      // 注意：用户点击「允许」仅代表本次授权，不等于永久提醒（文档 11.2）
    },
    fail: (err) => {
      console.error('订阅消息授权失败', err);
    }
  });
}

module.exports = { requestSubscribe, TEMPLATE_IDS };
