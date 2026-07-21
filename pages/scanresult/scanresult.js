// pages/scanresult/scanresult.js - 商品与日期确认页（文档 9.2）
const { CATEGORIES, STORAGE_LOCATIONS, UNITS, getCategoryById, generateId, resolveExpirySource, getExpiryDate } = require('../../utils/data');
const { getFoods, saveFoods } = require('../../utils/storage');
const product = require('../../utils/product');
const { requestSubscribe } = require('../../utils/subscribe');

const SOURCE_TEXT = {
  computed: '生产日期 + 保质期',
  direct: '直接填写',
  opened: '开封后',
  unknown: '待填写'
};

const INFO_SOURCE_TEXT = {
  personal: '来自个人历史',
  scan: '扫码识别',
  manual: '手动录入'
};

Page({
  data: {
    templateHit: false,
    infoSource: '手动',
    infoSourceText: '手动录入',
    dateMode: 'produce',
    categories: CATEGORIES.map(c => ({ ...c, active: c.id === 'dairy' })),
    storages: STORAGE_LOCATIONS.map(s => ({ ...s, active: s.id === 'fridge' })),
    units: UNITS,
    selectedCategory: 'dairy',
    selectedStorage: 'fridge',
    name: '',
    brand: '',
    specification: '',
    manufacturer: '',
    productionDate: '',
    shelfLife: '',
    expiryDate: '',
    quantity: 1,
    unitIndex: 0,
    price: '',
    showMore: false,
    keyboardHeight: 0,
    expiryPreview: '',
    expirySourceText: '待填写',
    gtin: '',
    codeType: '',
    sessionId: '',
    fromAdd: false
  },

  onLoad() {
    const app = getApp();
    const draft = (app.globalData && app.globalData.scanDraft) || {};
    const tpl = draft.template || null;
    const hit = !!draft.templateHit;
    const code = draft.code || '';
    const codeType = draft.codeType || '';

    let name = '', brand = '', category = 'dairy', spec = '', unit = '个';
    if (tpl) {
      name = tpl.product_name || '';
      brand = tpl.brand || '';
      category = tpl.category || 'dairy';
      spec = tpl.specification || '';
      unit = tpl.default_unit || '个';
    }

    const infoSource = hit ? 'personal' : (code ? 'scan' : 'manual');
    this.setData({
      templateHit: hit,
      infoSource: infoSource,
      infoSourceText: INFO_SOURCE_TEXT[infoSource] || '手动录入',
      gtin: code,
      codeType: codeType,
      sessionId: draft.sessionId || ('sess_' + Date.now()),
      fromAdd: !!draft.fromAdd,
      name,
      brand,
      selectedCategory: category,
      categories: CATEGORIES.map(c => ({ ...c, active: c.id === category })),
      specification: spec,
      unitIndex: Math.max(0, UNITS.indexOf(unit))
    });
    this.updatePreview();
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: id,
      categories: CATEGORIES.map(c => ({ ...c, active: c.id === id }))
    });
  },

  onStorageTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedStorage: id,
      storages: STORAGE_LOCATIONS.map(s => ({ ...s, active: s.id === id }))
    });
  },

  onDateModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    if (mode === this.data.dateMode) return;
    if (mode === 'produce') {
      this.setData({ dateMode: 'produce', expiryDate: '' });
    } else {
      this.setData({ dateMode: 'direct', productionDate: '', shelfLife: '' });
    }
    this.updatePreview();
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
    if (field === 'productionDate' || field === 'shelfLife') {
      this.calcExpiry();
      this.updatePreview();
    }
  },

  onDatePick(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
    if (field === 'productionDate') this.calcExpiry();
    this.updatePreview();
  },

  onUnitPick(e) {
    this.setData({ unitIndex: parseInt(e.detail.value) });
  },

  onToggleMore() {
    this.setData({ showMore: !this.data.showMore });
  },

  onKeyboardHeightChange(e) {
    const h = e.detail && typeof e.detail.height === 'number' ? e.detail.height : 0;
    this.setData({ keyboardHeight: h });
  },

  calcExpiry() {
    const { productionDate, shelfLife } = this.data;
    if (productionDate && shelfLife) {
      const d = new Date(productionDate);
      d.setDate(d.getDate() + parseInt(shelfLife));
      this.setData({ expiryDate: d.toISOString().split('T')[0] });
    }
  },

  updatePreview() {
    const f = {
      opened: false,
      openedDate: null,
      openedShelfLife: null,
      expiryDate: this.data.expiryDate,
      productionDate: this.data.productionDate,
      shelfLife: this.data.shelfLife
    };
    const date = getExpiryDate(f);
    const src = resolveExpirySource(f);
    this.setData({
      expiryPreview: date || '',
      expirySourceText: SOURCE_TEXT[src] || '待填写'
    });
  },

  // 构建用于保存的食品对象（不含 id/事件）
  _buildFoodData(remain, qty, now, gtin, codeType, sessionId) {
    const d = this.data;
    const foodData = {
      id: generateId(),
      name: d.name.trim(),
      brand: d.brand.trim(),
      category: d.selectedCategory,
      productionDate: d.dateMode === 'produce' ? d.productionDate : '',
      shelfLife: d.dateMode === 'produce' && d.shelfLife ? parseInt(d.shelfLife) : null,
      expiryDate: d.dateMode === 'direct' ? d.expiryDate : '',
      quantity: qty,
      remaining_quantity: remain,
      business_status: 'active',
      unit: UNITS[d.unitIndex] || '个',
      price: parseFloat(d.price) || 0,
      storage: d.selectedStorage,
      opened: false,
      openedDate: null,
      openedShelfLife: null,
      events: [{ type: 'create', ts: now, via: 'scan' }],
      createdAt: now,
      // 扫码新增字段
      product_id: '',
      gtin: gtin || '',
      code_type: codeType || '',
      info_source: d.templateHit ? 'personal' : (gtin ? 'scan' : 'manual'),
      scan_session_id: sessionId || ''
    };
    foodData.expiry_source = resolveExpirySource(foodData);
    return foodData;
  },

  // 重复扫码合并判定（文档 6.6）：同 gtin + 同到期日 + 同位置 + 同单位 + 在管
  _checkMerge(gtin, expiry, storage, unit) {
    if (!gtin) return null;
    const foods = getFoods();
    return foods.find(f =>
      f.business_status === 'active' &&
      f.gtin === gtin &&
      getExpiryDate(f) === expiry &&
      f.storage === storage &&
      (f.unit || '个') === unit
    ) || null;
  },

  onSave() {
    const { name, dateMode, productionDate, shelfLife, expiryDate,
      quantity, unitIndex, price, selectedCategory, selectedStorage,
      gtin, codeType, sessionId, fromAdd, templateHit, brand, specification } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }

    if (dateMode === 'produce') {
      if (!(productionDate && shelfLife)) {
        wx.showToast({ title: '请填写生产日期与保质期天数', icon: 'none' });
        return;
      }
    } else {
      if (!expiryDate) {
        wx.showToast({ title: '请选择到期日期', icon: 'none' });
        return;
      }
      // 文档 14：到期日早于生产日期则阻止保存
      if (productionDate && expiryDate < productionDate) {
        wx.showToast({ title: '到期日不能早于生产日期', icon: 'none' });
        return;
      }
    }

    const qty = parseInt(quantity) || 1;
    const remain = qty;
    const now = new Date().toISOString();
    const previewFood = {
      opened: false, openedDate: null, openedShelfLife: null,
      expiryDate: this.data.expiryDate, productionDate: this.data.productionDate, shelfLife: this.data.shelfLife
    };
    const expiry = getExpiryDate(previewFood);

    const mergeRec = this._checkMerge(gtin, expiry, selectedStorage, UNITS[unitIndex]);
    if (mergeRec) {
      wx.showModal({
        title: '同码同日期',
        content: '该商品已有相同到期日与存放位置的批次，是否合并数量？',
        confirmText: '合并数量',
        cancelText: '新增批次',
        success: (r) => {
          if (r.confirm) this._doMerge(mergeRec, qty, gtin, codeType);
          else this._createBatch(remain, qty, now, gtin, codeType, sessionId);
        }
      });
      return;
    }
    this._createBatch(remain, qty, now, gtin, codeType, sessionId);
  },

  _createBatch(remain, qty, now, gtin, codeType, sessionId) {
    const foodData = this._buildFoodData(remain, qty, now, gtin, codeType, sessionId);
    const foods = getFoods();
    foods.push(foodData);
    saveFoods(foods);
    const wasEmpty = foods.length === 1; // 本次为首件
    if (wasEmpty) requestSubscribe();
    this._afterSave(gtin, codeType);
  },

  _doMerge(rec, qty, gtin, codeType) {
    const foods = getFoods();
    const idx = foods.findIndex(x => x.id === rec.id);
    if (idx < 0) return;
    foods[idx].quantity = (foods[idx].quantity || 0) + qty;
    foods[idx].remaining_quantity = (foods[idx].remaining_quantity != null ? foods[idx].remaining_quantity : 0) + qty;
    foods[idx].events = Array.isArray(foods[idx].events) ? foods[idx].events : [];
    foods[idx].events.push({ type: 'merge', ts: new Date().toISOString(), add: qty });
    saveFoods(foods);
    this._afterSave(gtin, codeType);
  },

  _afterSave(gtin, codeType) {
    // 文档 6.2.5：未命中或已确认修改时，询问是否存为个人模板
    const askTemplate = gtin && !this.data.templateHit;
    if (askTemplate) {
      wx.showModal({
        title: '保存为个人商品',
        content: '是否将本次资料保存为个人模板，下次扫码自动补全？',
        confirmText: '保存',
        cancelText: '不用',
        success: (r) => {
          if (r.confirm) {
            product.savePersonalTemplate({
              gtin,
              code_type: codeType,
              product_name: this.data.name.trim(),
              brand: this.data.brand.trim(),
              category: this.data.selectedCategory,
              specification: this.data.specification.trim(),
              default_unit: UNITS[this.data.unitIndex]
            });
          }
          this._finish();
        }
      });
    } else {
      this._finish();
    }
  },

  _finish() {
    const app = getApp();
    if (app.globalData) app.globalData.lastScanSaved = true;
    if (this.data.fromAdd) {
      wx.navigateBack({ delta: 2 }); // 返回添加页
    } else {
      wx.navigateBack({ delta: 1 }); // 返回扫码页（onShow 显示成功）
    }
  }
});
