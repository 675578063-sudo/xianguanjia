// pages/detail/detail.js - 食品详情页
const { getCategoryById, getStorageById, daysUntil, getExpiryDate, getStatus, getStatusText, formatDate, generateId } = require('../../utils/data');
const { getFoods, saveFoods, getWasteRecords, saveWasteRecords } = require('../../utils/storage');

Page({
  data: {
    food: null,
    detailRows: [],
    days: 0,
    daysText: '',
    statusClass: '',
    expiryDate: '',
    processedText: ''
  },

  onLoad(options) {
    if (options.id) {
      this.loadFood(options.id);
    }
  },

  loadFood(id) {
    const foods = getFoods();
    const food = foods.find(f => f.id === id);
    if (!food) {
      wx.showToast({ title: '食品不存在', icon: 'none' });
      wx.navigateBack();
      return;
    }

    const cat = getCategoryById(food.category);
    const storage = getStorageById(food.storage);
    const expiry = getExpiryDate(food);
    const days = daysUntil(expiry);
    const status = getStatus(days);
    const remaining = (food.remaining_quantity != null) ? food.remaining_quantity : (food.quantity || 1);

    const detailRows = [
      { label: '分类', value: cat.icon + ' ' + cat.name },
      { label: '剩余数量', value: remaining + ' ' + (food.unit || '个') },
      { label: '存储位置', value: storage.icon + ' ' + storage.name },
      food.gtin ? { label: '商品编码', value: food.gtin + (food.code_type ? '（' + food.code_type + '）' : '') } : null,
      food.info_source && food.info_source !== 'manual' ? { label: '资料来源', value: food.info_source === 'personal' ? '个人历史模板' : '扫码识别' } : null,
      { label: '生产日期', value: formatDate(food.productionDate) },
      food.shelfLife ? { label: '保质期', value: food.shelfLife + ' 天' } : null,
      { label: '到期日期', value: formatDate(expiry), isExpired: days < 0 },
      { label: '开封状态', value: food.opened ? '已开封 (' + formatDate(food.openedDate) + ')' : '未开封' },
      food.opened && food.openedShelfLife ? { label: '开封后保质天数', value: food.openedShelfLife + ' 天' } : null,
      { label: '购买价格', value: food.price ? food.price.toFixed(1) + ' 元' : '-' },
      { label: '添加时间', value: formatDate(food.createdAt ? food.createdAt.split('T')[0] : null) }
    ].filter(Boolean);

    this.setData({
      food,
      detailRows,
      days,
      daysText: getStatusText(days),
      statusClass: status,
      expiryDate: expiry,
      catIcon: cat.icon,
      catName: cat.name,
      processedText: food.business_status === 'consumed' ? '已食用'
        : food.business_status === 'discarded' ? '已丢弃' : ''
    });
  },

  onEdit() {
    wx.navigateTo({ url: '/pages/add/add?id=' + this.data.food.id });
  },

  // 已食用：标记 business_status=consumed，不计入浪费，保留记录可回溯
  onEaten() {
    const food = this.data.food;
    if (!food) return;
    wx.showModal({
      title: '标记为已食用',
      content: '将「' + food.name + '」标记为已食用（不计入浪费）？',
      confirmColor: '#4f46e5',
      success: (res) => { if (res.confirm) this.finalizeStatus(food, 'consumed', false); }
    });
  },

  // 已丢弃：标记 business_status=discarded，按剩余数量计入浪费统计，保留记录
  onDiscarded() {
    const food = this.data.food;
    if (!food) return;
    wx.showModal({
      title: '标记为已丢弃',
      content: '将「' + food.name + '」标记为已丢弃并计入浪费统计？',
      confirmColor: '#ef4444',
      success: (res) => { if (res.confirm) this.finalizeStatus(food, 'discarded', true); }
    });
  },

  finalizeStatus(food, status, isWaste) {
    const foods = getFoods();
    const idx = foods.findIndex(f => f.id === food.id);
    if (idx < 0) return;
    const rec = foods[idx];
    rec.business_status = status;
    // 操作事件日志（point8）
    rec.events = Array.isArray(rec.events) ? rec.events : [];
    rec.events.push({ type: status, ts: new Date().toISOString() });

    if (isWaste) {
      const remaining = (rec.remaining_quantity != null) ? rec.remaining_quantity : (rec.quantity || 1);
      const wasteRecords = getWasteRecords();
      wasteRecords.push({
        id: generateId(),
        name: rec.name,
        category: rec.category,
        price: (rec.price || 0) * remaining,
        quantity: remaining,
        isWasted: true,
        reason: 'discarded',
        date: new Date().toISOString()
      });
      saveWasteRecords(wasteRecords);
    }

    saveFoods(foods);
    wx.showToast({ title: status === 'consumed' ? '已标记食用' : '已标记丢弃', icon: 'success' });
    setTimeout(() => { wx.navigateBack(); }, 1200);
  },

  // 部分食用：剩余数量 -1（数量不足时提示改用「已食用/已丢弃」）
  onPartial() {
    const food = this.data.food;
    if (!food) return;
    const remaining = (food.remaining_quantity != null) ? food.remaining_quantity : (food.quantity || 1);
    if (remaining <= 1) {
      wx.showModal({
        title: '数量不足',
        content: '剩余仅 ' + remaining + '，无法再部分食用。可标记为「已食用」或「已丢弃」。',
        showCancel: false
      });
      return;
    }
    const foods = getFoods();
    const idx = foods.findIndex(f => f.id === food.id);
    if (idx < 0) return;
    foods[idx].remaining_quantity = remaining - 1;
    foods[idx].events = Array.isArray(foods[idx].events) ? foods[idx].events : [];
    foods[idx].events.push({ type: 'partial', ts: new Date().toISOString(), remaining: remaining - 1 });
    saveFoods(foods);
    this.setData({ 'food.remaining_quantity': remaining - 1 });
    this.loadFood(food.id);
    wx.showToast({ title: '已减少 1 个', icon: 'success' });
  },

  onDelete() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除「' + this.data.food.name + '」吗？删除不影响浪费统计。',
      confirmColor: '#ef4444',
      success: (res) => {
        if (res.confirm) {
          const foods = getFoods().filter(f => f.id !== this.data.food.id);
          saveFoods(foods);
          wx.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => { wx.navigateBack(); }, 1500);
        }
      }
    });
  }
});
