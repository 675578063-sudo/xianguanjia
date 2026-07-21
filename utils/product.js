// utils/product.js - 商品模板本地层 + 扫码结果解析（文档 6 / 7 / 10.1）
// 阶段 1 MVP：仅本地个人模板缓存 + 手动降级，不接第三方商品库（推到阶段 2/3）。
const { generateId } = require('./data');
const storage = require('./storage');

// 自建二维码固定前缀（文档 6.3），本期不生成/校验签名，仅识别后提示手动
const SELF_QR_PREFIX = 'freshlog://';

// 将微信返回的 scanType 归一化为统一枚举
function normalizeScanType(scanType) {
  const t = (scanType || '').toUpperCase();
  if (t.indexOf('QR') >= 0) return 'QR';
  if (t.indexOf('DATA_MATRIX') >= 0 || t.indexOf('DATAMATRIX') >= 0) return 'DataMatrix';
  if (t.indexOf('EAN_13') >= 0) return 'EAN_13';
  if (t.indexOf('EAN_8') >= 0) return 'EAN_8';
  if (t.indexOf('UPC') >= 0) return 'UPC';
  if (t.indexOf('CODE') >= 0) return 'CODE_128';
  if (t.indexOf('PDF') >= 0) return 'PDF417';
  return t || 'UNKNOWN';
}

// 是否为标准商品条码（条码类）
function isBarcode(codeType) {
  return ['EAN_13', 'EAN_8', 'UPC', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39'].indexOf(codeType) >= 0;
}

// 解析扫描结果，返回分支类型（文档 6 分支 A-F 简化版：A 标准码 / C 自建 / D 外链 / E 不支持）
// rawResult: wx.scanCode 的 success 回调参数 { result, scanType, ... }
function parseScanResult(rawResult) {
  const raw = (rawResult && rawResult.result ? String(rawResult.result) : '').trim();
  const scanType = normalizeScanType(rawResult && rawResult.scanType);

  if (!raw) {
    return { branch: 'E', codeType: scanType, code: '', reason: '未识别到完整编码' };
  }

  // 分支 C：囤鲜日记自建二维码（固定前缀）
  if (raw.indexOf(SELF_QR_PREFIX) === 0) {
    return { branch: 'C', codeType: 'QR', code: raw, selfQr: true };
  }

  // 分支 D：外部网页 / 营销二维码（http/https 链接，且非自建前缀）
  if (/^https?:\/\//i.test(raw)) {
    return { branch: 'D', codeType: 'QR', code: raw, reason: '该二维码不是可识别的商品码' };
  }

  // 标准商品码：条码类型，或内容为 8-14 位纯数字（EAN / UPC）
  const isNum = /^\d{8,14}$/.test(raw);
  if (isBarcode(scanType) || isNum) {
    return { branch: 'A', codeType: scanType, code: raw };
  }

  // 其它二维码内容（非链接、非自建、非纯数字）：本期暂不支持
  if (scanType === 'QR' || scanType === 'DataMatrix') {
    return { branch: 'E', codeType: scanType, code: raw, reason: '当前格式暂不支持' };
  }

  // 兜底按标准码处理
  return { branch: 'A', codeType: scanType, code: raw };
}

// 分层查询：阶段 1 仅有「个人已确认模板」一层（文档 7.1 第一层）
// 返回 product 模板对象或 null（未命中）
function lookupProduct(gtin) {
  if (!gtin) return null;
  const products = storage.getProducts();
  return products.find(p => p.gtin === gtin) || null;
}

// 保存 / 更新个人商品模板（文档 6.2.5 / 7.1 / 7.2）
// 用户本次确认优先；已存在则更新已确认字段，不回写已存在的库存批次
function savePersonalTemplate(data) {
  if (!data || !data.gtin) return;
  const products = storage.getProducts();
  const now = new Date().toISOString();
  const existing = products.find(p => p.gtin === data.gtin);
  const clean = {
    product_name: (data.product_name || '').trim(),
    brand: (data.brand || '').trim(),
    category: data.category || 'other',
    specification: (data.specification || '').trim(),
    default_unit: data.default_unit || '个',
    code_type: data.code_type || '',
    source: 'personal',
    user_verified: true,
    updated_at: now
  };
  if (existing) {
    Object.assign(existing, clean);
  } else {
    products.push(Object.assign({
      product_id: generateId(),
      gtin: data.gtin,
      created_at: now
    }, clean));
  }
  storage.saveProducts(products);
}

module.exports = {
  SELF_QR_PREFIX,
  normalizeScanType,
  isBarcode,
  parseScanResult,
  lookupProduct,
  savePersonalTemplate
};
