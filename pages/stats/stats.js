// pages/stats/stats.js - 统计页
const { getCategoryById } = require('../../utils/data');
const { getFoods, getWasteRecords } = require('../../utils/storage');

Page({
  data: {
    totalValue: '0',
    wasteValue: '0',
    wasteCount: 0,
    catChart: [],
    wasteChart: []
  },

  onShow() {
    this.refreshData();
  },

  refreshData() {
    // 仅统计在管（未食用/丢弃）食品
    const allFoods = getFoods();
    const foods = allFoods.filter(f => f.business_status === 'active');
    const wasteRecords = getWasteRecords();

    // 库存价值按剩余数量比例计算
    const totalValue = foods.reduce((s, f) => {
      const remain = (f.remaining_quantity != null) ? f.remaining_quantity : (f.quantity || 1);
      return s + (f.price || 0) * remain;
    }, 0);
    const wasteValue = wasteRecords.reduce((s, w) => s + (w.price || 0), 0);

    // 分类分布（仅在管，count/value 按剩余数量）
    const catMap = {};
    foods.forEach(f => {
      const cat = getCategoryById(f.category);
      const remain = (f.remaining_quantity != null) ? f.remaining_quantity : (f.quantity || 1);
      if (!catMap[f.category]) catMap[f.category] = { name: cat.icon + ' ' + cat.name, count: 0, value: 0 };
      catMap[f.category].count += remain;
      catMap[f.category].value += (f.price || 0) * remain;
    });

    const maxCount = Math.max(...Object.values(catMap).map(d => d.count), 1);
    const catChart = Object.values(catMap).sort((a, b) => b.count - a.count).map(d => ({
      name: d.name,
      count: d.count,
      percent: (d.count / maxCount * 100).toFixed(0)
    }));

    // 浪费分布
    const wasteCatMap = {};
    wasteRecords.forEach(w => {
      const cat = getCategoryById(w.category);
      if (!wasteCatMap[w.category]) wasteCatMap[w.category] = { name: cat.icon + ' ' + cat.name, value: 0, count: 0 };
      wasteCatMap[w.category].value += (w.price || 0);
      wasteCatMap[w.category].count++;
    });

    const maxWaste = Math.max(...Object.values(wasteCatMap).map(d => d.value), 1);
    const wasteChart = Object.values(wasteCatMap).sort((a, b) => b.value - a.value).map(d => ({
      name: d.name,
      value: d.value.toFixed(0),
      percent: (d.value / maxWaste * 100).toFixed(0)
    }));

    this.setData({
      totalValue: totalValue.toFixed(0),
      wasteValue: wasteValue.toFixed(0),
      wasteCount: wasteRecords.length,
      catChart,
      wasteChart
    });
  }
});
