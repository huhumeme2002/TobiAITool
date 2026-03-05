/**
 * Model Order - Quản lý đơn hàng
 */
const db = require('../config/database');

const Order = {
    // Lấy danh sách đơn hàng có phân trang
    getAll({ page = 1, limit = 15, search = '', status = '', startDate = '', endDate = '', sortBy = 'sale_date', sortOrder = 'DESC' } = {}) {
        let where = '1=1';
        const params = [];

        if (search) {
            where += ' AND (customer_name LIKE ? OR product_name LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (status) {
            where += ' AND status = ?';
            params.push(status);
        }
        if (startDate) {
            where += ' AND sale_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            where += ' AND sale_date <= ?';
            params.push(endDate);
        }

        // Đếm tổng
        const countResult = db.prepare(`SELECT COUNT(*) as total FROM orders WHERE ${where}`).get(...params);
        const total = countResult.total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        // Whitelist sort columns
        const allowedSort = ['sale_date', 'actual_price', 'profit', 'customer_name', 'created_at'];
        const safeSort = allowedSort.includes(sortBy) ? sortBy : 'sale_date';
        const safeOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

        const rows = db.prepare(`SELECT * FROM orders WHERE ${where} ORDER BY ${safeSort} ${safeOrder} LIMIT ? OFFSET ?`).all(...params, limit, offset);

        return { rows, total, totalPages, currentPage: page };
    },

    // Tìm đơn hàng theo ID
    findById(id) {
        return db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    },

    // Thêm đơn hàng mới
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO orders (customer_name, customer_phone, customer_email, product_id, product_name, listed_price, actual_price, cost, profit, sale_date, status, notes)
            VALUES (@customer_name, @customer_phone, @customer_email, @product_id, @product_name, @listed_price, @actual_price, @cost, @profit, @sale_date, @status, @notes)
        `);
        return stmt.run(data);
    },

    // Cập nhật đơn hàng
    update(id, data) {
        const stmt = db.prepare(`
            UPDATE orders SET
                customer_name = @customer_name, customer_phone = @customer_phone,
                customer_email = @customer_email, product_id = @product_id,
                product_name = @product_name, listed_price = @listed_price,
                actual_price = @actual_price, cost = @cost, profit = @profit,
                sale_date = @sale_date, status = @status, notes = @notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);
        return stmt.run({ ...data, id });
    },

    // Xóa đơn hàng
    delete(id) {
        return db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    },

    // ==================== ONLINE CHECKOUT ====================

    // Tạo đơn hàng từ checkout (tự sinh mã đơn)
    createFromCheckout(data) {
        const stmt = db.prepare(`
            INSERT INTO orders (customer_name, customer_phone, customer_email, product_id, product_name, listed_price, actual_price, cost, profit, sale_date, status, notes, order_code, payment_method)
            VALUES (@customer_name, @customer_phone, @customer_email, @product_id, @product_name, @listed_price, @actual_price, @cost, @profit, @sale_date, @status, @notes, @order_code, @payment_method)
        `);
        return stmt.run(data);
    },

    // Tìm đơn hàng theo mã đơn
    findByOrderCode(orderCode) {
        return db.prepare('SELECT * FROM orders WHERE order_code = ?').get(orderCode);
    },

    // Cập nhật trạng thái thanh toán
    updatePaymentStatus(id, status) {
        return db.prepare('UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
    },

    // Tìm đơn pending theo số tiền (fallback matching)
    findPendingByAmount(amount) {
        return db.prepare("SELECT * FROM orders WHERE status = 'pending' AND actual_price = ? AND payment_method = 'sepay' ORDER BY created_at DESC LIMIT 1").get(amount);
    },

    // Sinh mã đơn hàng unique
    generateOrderCode() {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `DH${timestamp}${random}`;
    },

    // ==================== THỐNG KÊ ====================

    // Tổng quan dashboard
    getSummary() {
        const result = db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN actual_price ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN cost ELSE 0 END), 0) as total_cost,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN profit ELSE 0 END), 0) as total_profit,
                COUNT(*) as total_orders
            FROM orders
        `).get();
        return result;
    },

    // Đơn hàng hôm nay
    getTodayCount() {
        return db.prepare("SELECT COUNT(*) as count FROM orders WHERE sale_date = date('now', 'localtime')").get().count;
    },

    // Thống kê theo khoảng thời gian
    getStatsByDateRange(startDate, endDate) {
        return db.prepare(`
            SELECT
                sale_date,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN actual_price ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN cost ELSE 0 END), 0) as cost,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN profit ELSE 0 END), 0) as profit,
                COUNT(*) as order_count
            FROM orders
            WHERE sale_date >= ? AND sale_date <= ?
            GROUP BY sale_date
            ORDER BY sale_date ASC
        `).all(startDate, endDate);
    },

    // Tổng hợp theo khoảng thời gian
    getAggregateByDateRange(startDate, endDate) {
        return db.prepare(`
            SELECT
                COALESCE(SUM(CASE WHEN status = 'paid' THEN actual_price ELSE 0 END), 0) as total_revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN cost ELSE 0 END), 0) as total_cost,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN profit ELSE 0 END), 0) as total_profit,
                COUNT(*) as total_orders,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_orders
            FROM orders
            WHERE sale_date >= ? AND sale_date <= ?
        `).get(startDate, endDate);
    },

    // Thống kê 7 ngày gần nhất (cho dashboard)
    getLast7DaysStats() {
        return db.prepare(`
            SELECT
                sale_date,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN actual_price ELSE 0 END), 0) as revenue,
                COALESCE(SUM(CASE WHEN status = 'paid' THEN profit ELSE 0 END), 0) as profit,
                COUNT(*) as order_count
            FROM orders
            WHERE sale_date >= date('now', '-6 days', 'localtime')
            GROUP BY sale_date
            ORDER BY sale_date ASC
        `).all();
    }
};

module.exports = Order;

