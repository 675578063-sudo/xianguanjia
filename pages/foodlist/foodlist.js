// pages/foodlist/foodlist.js
const { getCategoryById, getStorageById, daysUntil, getExpiryDate, getStatus, getStatusText } = require('../../utils/data');
const { getFoods } = require('../../utils/storage');

Page({
  data: {
    searchKeyword: '',
    currentFilter: 'all',
    filters: [
      { key: 'all', name: '全部' },
      { key: 'expired', name: '已过期' },
      { key: 'urgent', name: '即将过期' },
      { key: 'soon', name: '3-7天' },
      { key: 'ok', name: '7天+' }
    ],
    foodList: []
  },

  onShow() {
    this.refreshList();
  },

  refreshList() {
    // 仅展示在管（未食用/丢弃）食品
    let foods = getFoods().filter(f => f.business_status === 'active');
    const keyword = this.data.searchKeyword;
    const filter = this.data.currentFilter;

    if (keyword) {
      const kw = keyword.toLowerCase();
      foods = foods.filter(f => (f.name || '').toLowerCase().includes(kw) || (f.brand || '').toLowerCase().includes(kw));
    }

    if (filter !== 'all') {
      foods = foods.filter(f => {
        const days = daysUntil(getExpiryDate(f));
        return getStatus(days) === filter;
      });
    }

    foods.sort((a, b) => daysUntil(getExpiryDate(a)) - daysUntil(getExpiryDate(b)));

    const foodList = foods.map(f => {
      const days = daysUntil(getExpiryDate(f));
      const status = getStatus(days);
      const cat = getCategoryById(f.category);
      const storage = getStorageById(f.storage);
      return {
        id: f.id,
        icon: cat.icon,
        name: f.name + (f.brand ? ' · ' + f.brand : ''),
        meta: storage.name + ' · ' + ((f.remaining_quantity != null) ? f.remaining_quantity : (f.quantity || 1)) + (f.unit || '个') + ' · ' + (f.opened ? '已开封' : '未开封'),
        days,
        daysText: getStatusText(days),
        statusClass: 'status-' + status,
        badgeClass: status
      };
    });

    this.setData({ foodList });
  },

  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.refreshList();
  },

  onFilterTap(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ currentFilter: key });
    this.refreshList();
  },

  onFoodTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/detail/detail?id=' + id });
  },

  onAddTap() {
    wx.navigateTo({ url: '/pages/add/add' });
  }
});
