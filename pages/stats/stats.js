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
    const foods = getFoods();
    const wasteRecords = getWasteRecords();

    const totalValue = foods.reduce((s, f) => s + (f.price || 0) * (f.quantity || 1), 0);
    const wasteValue = wasteRecords.reduce((s, w) => s + (w.price || 0), 0);

    // 分类分布
    const catMap = {};
    foods.forEach(f => {
      const cat = getCategoryById(f.category);
      if (!catMap[f.category]) catMap[f.category] = { name: cat.icon + ' ' + cat.name, count: 0, value: 0 };
      catMap[f.category].count += (f.quantity || 1);
      catMap[f.category].value += (f.price || 0) * (f.quantity || 1);
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
