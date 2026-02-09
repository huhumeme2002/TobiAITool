/**
 * Routes - Dashboard tổng quan
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Order = require('../models/Order');

// GET /admin/dashboard - Trang tổng quan
router.get('/', isAuthenticated, (req, res) => {
    const summary = Order.getSummary();
    const todayCount = Order.getTodayCount();
    const last7Days = Order.getLast7DaysStats();

    // Tạo mảng 7 ngày đầy đủ (kể cả ngày không có đơn)
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = last7Days.find(d => d.sale_date === dateStr);
        chartData.push({
            date: dateStr,
            label: `${date.getDate()}/${date.getMonth() + 1}`,
            revenue: dayData ? dayData.revenue : 0,
            profit: dayData ? dayData.profit : 0,
            orders: dayData ? dayData.order_count : 0
        });
    }

    res.render('admin/dashboard', {
        title: 'Dashboard',
        summary,
        todayCount,
        chartData
    });
});

module.exports = router;

