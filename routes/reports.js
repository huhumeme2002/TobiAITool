/**
 * Routes - Báo cáo tài chính
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Order = require('../models/Order');
const FixedCost = require('../models/FixedCost');

// GET /admin/reports - Trang báo cáo
router.get('/', isAuthenticated, (req, res) => {
    // Mặc định: 30 ngày qua
    const endDate = req.query.endDate || new Date().toISOString().split('T')[0];
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - 29);
    const startDate = req.query.startDate || startDefault.toISOString().split('T')[0];
    const viewMode = req.query.viewMode || 'day';

    // Lấy dữ liệu thống kê
    const stats = Order.getStatsByDateRange(startDate, endDate);
    const aggregate = Order.getAggregateByDateRange(startDate, endDate);

    // Lấy tổng chi phí cố định trong khoảng thời gian
    const fixedCostsTotal = FixedCost.getTotalByDateRange(startDate, endDate);

    // Tính lợi nhuận ròng = lợi nhuận gộp - chi phí cố định
    const netProfit = aggregate.total_profit - fixedCostsTotal;

    // Tính biên lợi nhuận gộp
    const profitMargin = aggregate.total_revenue > 0
        ? ((aggregate.total_profit / aggregate.total_revenue) * 100).toFixed(1)
        : 0;

    // Tính biên lợi nhuận ròng
    const netProfitMargin = aggregate.total_revenue > 0
        ? ((netProfit / aggregate.total_revenue) * 100).toFixed(1)
        : 0;

    // Giá trị đơn hàng trung bình
    const avgOrderValue = aggregate.paid_orders > 0
        ? Math.round(aggregate.total_revenue / aggregate.paid_orders)
        : 0;

    // Nhóm dữ liệu theo tuần/tháng nếu cần
    let chartData = stats;
    if (viewMode === 'week') {
        chartData = groupByWeek(stats);
    }else if (viewMode === 'month') {
        chartData = groupByMonth(stats);
    }

    // Lấy danh sách đơn hàng trong kỳ
    const ordersResult = Order.getAll({
        page: parseInt(req.query.page) || 1,
        limit: 20,
        search: req.query.search || '',
        status: req.query.status || '',
        startDate,
        endDate
    });

    res.render('admin/reports/index', {
        title: 'Báo cáo tài chính',
        startDate, endDate, viewMode,
        stats: chartData,
        aggregate,
        fixedCostsTotal,
        netProfit,
        profitMargin,
        netProfitMargin,
        avgOrderValue,
        orders: ordersResult.rows,
        totalOrders: ordersResult.total,
        totalPages: ordersResult.totalPages,
        currentPage: ordersResult.currentPage,
        filters: { search: req.query.search || '', status: req.query.status || '' }
    });
});

// GET /admin/reports/export - Xuất CSV/Excel
router.get('/export', isAuthenticated, async (req, res) => {
    const { format = 'csv', startDate, endDate, status } = req.query;
    const endD = endDate || new Date().toISOString().split('T')[0];
    const startDefault = new Date();
    startDefault.setDate(startDefault.getDate() - 29);
    const startD = startDate || startDefault.toISOString().split('T')[0];

    const result = Order.getAll({ page: 1, limit: 99999, startDate: startD, endDate: endD, status: status || '' });
    const orders = result.rows;

    if (format === 'excel') {
        // Xuất Excel
        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Đơn hàng');

        sheet.columns = [
            { header: 'STT', key: 'stt', width: 6 },
            { header: 'Ngày bán', key: 'sale_date', width: 12 },
            { header: 'Khách hàng', key: 'customer_name', width: 20 },
            { header: 'SĐT', key: 'customer_phone', width: 15 },
            { header: 'Sản phẩm', key: 'product_name', width: 20 },
            { header: 'Giá niêm yết', key: 'listed_price', width: 15 },
            { header: 'Giá bán', key: 'actual_price', width: 15 },
            { header: 'Chi phí', key: 'cost', width: 15 },
            { header: 'Lợi nhuận', key: 'profit', width: 15 },
            { header: 'Trạng thái', key: 'status', width: 15 },
            { header: 'Ghi chú', key: 'notes', width: 25 }
        ];

        // Style header
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } };
        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

        orders.forEach((order, idx) => {
            const statusMap = { paid: 'Đã thanh toán', pending: 'Chưa thanh toán', cancelled: 'Đã hủy' };
            sheet.addRow({
                stt: idx + 1,
                sale_date: order.sale_date,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone,
                product_name: order.product_name,
                listed_price: order.listed_price,
                actual_price: order.actual_price,
                cost: order.cost,
                profit: order.profit,
                status: statusMap[order.status] || order.status,
                notes: order.notes
            });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=bao-cao-${startD}-${endD}.xlsx`);
        await workbook.xlsx.write(res);
        res.end();
    } else {
        // Xuất CSV
        const { Parser } = require('json2csv');
        const statusMap = { paid: 'Đã thanh toán', pending: 'Chưa thanh toán', cancelled: 'Đã hủy' };
        const csvData = orders.map((o, idx) => ({
            'STT': idx + 1,
            'Ngày bán': o.sale_date,
            'Khách hàng': o.customer_name,
            'SĐT': o.customer_phone,
            'Sản phẩm': o.product_name,
            'Giá niêm yết': o.listed_price,
            'Giá bán': o.actual_price,
            'Chi phí': o.cost,
            'Lợi nhuận': o.profit,
            'Trạng thái': statusMap[o.status] || o.status,
            'Ghi chú': o.notes
        }));

        const parser = new Parser({ withBOM: true });
        const csv = parser.parse(csvData);
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename=bao-cao-${startD}-${endD}.csv`);
        res.send(csv);
    }
});

// ==================== HÀM HỖ TRỢ ====================

function groupByWeek(stats) {
    const weeks = {};
    stats.forEach(s => {
        const d = new Date(s.sale_date);
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay() + 1);
        const key = weekStart.toISOString().split('T')[0];
        if (!weeks[key]) weeks[key] = { sale_date: key, revenue: 0, cost: 0, profit: 0, order_count: 0 };
        weeks[key].revenue += s.revenue;
        weeks[key].cost += s.cost;
        weeks[key].profit += s.profit;
        weeks[key].order_count += s.order_count;
    });
    return Object.values(weeks);
}

function groupByMonth(stats) {
    const months = {};
    stats.forEach(s => {
        const key = s.sale_date.substring(0, 7);
        if (!months[key]) months[key] = { sale_date: key, revenue: 0, cost: 0, profit: 0, order_count: 0 };
        months[key].revenue += s.revenue;
        months[key].cost += s.cost;
        months[key].profit += s.profit;
        months[key].order_count += s.order_count;
    });
    return Object.values(months);
}

module.exports = router;

