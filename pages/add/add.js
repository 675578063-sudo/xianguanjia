// pages/add/add.js - 添加/编辑食品页
const { CATEGORIES, STORAGE_LOCATIONS, UNITS, getCategoryById, generateId, resolveExpirySource, getExpiryDate } = require('../../utils/data');
const { getFoods, saveFoods } = require('../../utils/storage');

const SOURCE_TEXT = {
  computed: '生产日期 + 保质期',
  direct: '直接填写',
  opened: '开封后',
  unknown: '待填写'
};

Page({
  data: {
    isEdit: false,
    editId: '',
    dateMode: 'produce', // produce=生产日期+保质期 / direct=直接到期日
    categories: CATEGORIES.map(c => ({ ...c, active: c.id === 'dairy' })),
    storages: STORAGE_LOCATIONS.map(s => ({ ...s, active: s.id === 'fridge' })),
    units: UNITS,
    selectedCategory: 'dairy',
    selectedStorage: 'fridge',
    name: '',
    brand: '',
    productionDate: '',
    shelfLife: '',
    expiryDate: '',
    quantity: 1,
    unitIndex: 0,
    price: '',
    opened: false,
    openedDate: '',
    openedShelfLife: '',
    showOpenedFields: false,
    remaining_quantity: 1,
    business_status: 'active',
    // 阶段A新增：必填/更多信息折叠、键盘适配、到期日来源预览
    showMore: false,
    keyboardHeight: 0,
    expiryPreview: '',
    expirySourceText: '待填写'
  },

  onLoad(options) {
    if (options.id) {
      const foods = getFoods();
      const food = foods.find(f => f.id === options.id);
      if (food) {
        // 编辑时根据已有数据推断日期模式：有直接到期日且缺生产/保质期 → 直接模式；否则生产模式
        const directMode = !!food.expiryDate && !(food.productionDate && food.shelfLife);
        this.setData({
          isEdit: true,
          editId: options.id,
          dateMode: directMode ? 'direct' : 'produce',
          selectedCategory: food.category,
          selectedStorage: food.storage,
          name: food.name,
          brand: food.brand || '',
          productionDate: food.productionDate || '',
          shelfLife: food.shelfLife ? String(food.shelfLife) : '',
          expiryDate: food.expiryDate || '',
          quantity: food.quantity || 1,
          remaining_quantity: (food.remaining_quantity != null) ? food.remaining_quantity : (food.quantity || 1),
          business_status: food.business_status || 'active',
          unitIndex: Math.max(0, UNITS.indexOf(food.unit || '个')),
          price: food.price ? String(food.price) : '',
          opened: food.opened || false,
          openedDate: food.openedDate || '',
          openedShelfLife: food.openedShelfLife ? String(food.openedShelfLife) : '',
          showOpenedFields: food.opened || false,
          categories: CATEGORIES.map(c => ({ ...c, active: c.id === food.category })),
          storages: STORAGE_LOCATIONS.map(s => ({ ...s, active: s.id === food.storage }))
        });
      }
    } else {
      // 新增：无默认日期、无默认保质期（符合 P0-02），全部由用户填写
      this.setData({
        dateMode: 'produce',
        productionDate: '',
        shelfLife: '',
        expiryDate: ''
      });
    }
    this.updatePreview();
  },

  onCategoryTap(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      selectedCategory: id,
      categories: CATEGORIES.map(c => ({ ...c, active: c.id === id }))
    });
    // 严格取消默认保质期：选择分类不再自动填充 shelfLife（point5）
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
      // 切回生产模式：清空直接到期日（由生产+保质期重新计算）
      this.setData({ dateMode: 'produce', expiryDate: '' });
    } else {
      // 切到直接模式：清空生产日期与保质期，改填到期日
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

  onOpenedToggle(e) {
    const isOpened = e.currentTarget.dataset.val === 'yes';
    const today = new Date().toISOString().split('T')[0];
    this.setData({
      opened: isOpened,
      showOpenedFields: isOpened,
      openedDate: isOpened ? (this.data.openedDate || today) : ''
    });
    this.updatePreview();
  },

  onDatePick(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
    if (field === 'productionDate') {
      this.calcExpiry();
    }
    this.updatePreview();
  },

  onUnitPick(e) {
    this.setData({ unitIndex: parseInt(e.detail.value) });
  },

  onToggleMore() {
    this.setData({ showMore: !this.data.showMore });
  },

  // 键盘高度变化：保存栏随键盘上移，避免被遮挡（point2）
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

  // 保存前预览：最终到期日 + 日期来源（point6）
  updatePreview() {
    const f = {
      opened: this.data.opened,
      openedDate: this.data.openedDate,
      openedShelfLife: this.data.openedShelfLife,
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

  onSave() {
    const { name, brand, selectedCategory, dateMode, productionDate, shelfLife, expiryDate,
      quantity, business_status, unitIndex, price, selectedStorage,
      opened, openedDate, openedShelfLife, isEdit, editId, events } = this.data;

    if (!name.trim()) {
      wx.showToast({ title: '请输入食品名称', icon: 'none' });
      return;
    }

    // 按当前日期模式验证
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
    }

    const qty = parseInt(quantity) || 1;
    // 剩余数量：新增时等于数量；编辑时沿用已有剩余数量
    let remain;
    if (isEdit) {
      const existing = getFoods().find(f => f.id === editId);
      remain = (existing && existing.remaining_quantity != null) ? existing.remaining_quantity : qty;
    } else {
      remain = qty;
    }

    // 操作事件日志（point8）
    const now = new Date().toISOString();
    const prevEvents = Array.isArray(events) ? events : [];
    const newEvent = { type: isEdit ? 'update' : 'create', ts: now };

    const foodData = {
      id: isEdit ? editId : generateId(),
      name: name.trim(),
      brand: brand.trim(),
      category: selectedCategory,
      productionDate: dateMode === 'produce' ? productionDate : '',
      shelfLife: dateMode === 'produce' && shelfLife ? parseInt(shelfLife) : null,
      expiryDate: dateMode === 'direct' ? expiryDate : '',
      quantity: qty,
      remaining_quantity: remain,
      business_status: business_status || 'active',
      unit: UNITS[unitIndex] || '个',
      price: parseFloat(price) || 0,
      storage: selectedStorage,
      opened,
      openedDate: opened ? openedDate : null,
      openedShelfLife: opened ? (parseInt(openedShelfLife) || null) : null,
      events: isEdit ? [...prevEvents, newEvent] : [newEvent],
      createdAt: isEdit ? (getFoods().find(f => f.id === editId)?.createdAt || now) : now
    };
    foodData.expiry_source = resolveExpirySource(foodData);

    const foods = getFoods();
    if (isEdit) {
      const idx = foods.findIndex(f => f.id === editId);
      if (idx >= 0) foods[idx] = foodData;
    } else {
      foods.push(foodData);
    }

    saveFoods(foods);
    wx.showToast({ title: isEdit ? '已更新' : '已添加', icon: 'success' });

    setTimeout(() => {
      wx.navigateBack();
    }, 1500);
  }
});
