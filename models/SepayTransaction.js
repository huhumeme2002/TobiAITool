/**
 * Model SepayTransaction - Quản lý giao dịch từ Sepay webhook
 */
const db = require('../config/database');

const SepayTransaction = {
    // Lưu giao dịch mới từ webhook
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO sepay_transactions (sepay_id, gateway, transaction_date, account_number, transfer_type, transfer_amount, accumulated, code, content, reference_number, description, order_id, processed)
            VALUES (@sepay_id, @gateway, @transaction_date, @account_number, @transfer_type, @transfer_amount, @accumulated, @code, @content, @reference_number, @description, @order_id, @processed)
        `);
        return stmt.run(data);
    },

    // Kiểm tra giao dịch đã tồn tại chưa (tránh xử lý trùng)
    findBySepayId(sepayId) {
        return db.prepare('SELECT * FROM sepay_transactions WHERE sepay_id = ?').get(sepayId);
    },

    // Tìm giao dịch theo reference number
    findByReferenceNumber(refNum) {
        return db.prepare('SELECT * FROM sepay_transactions WHERE reference_number = ?').get(refNum);
    },

    // Lấy giao dịch theo đơn hàng
    findByOrderId(orderId) {
        return db.prepare('SELECT * FROM sepay_transactions WHERE order_id = ? ORDER BY created_at DESC').all(orderId);
    },

    // Lấy tất cả giao dịch (admin) có phân trang
    getAll({ page = 1, limit = 20 } = {}) {
        const total = db.prepare('SELECT COUNT(*) as total FROM sepay_transactions').get().total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;
        const rows = db.prepare('SELECT * FROM sepay_transactions ORDER BY created_at DESC LIMIT ? OFFSET ?').all(limit, offset);
        return { rows, total, totalPages, currentPage: page };
    },

    // Đánh dấu đã xử lý
    markProcessed(id, orderId) {
        return db.prepare('UPDATE sepay_transactions SET processed = 1, order_id = ? WHERE id = ?').run(orderId, id);
    },

    // Đếm giao dịch chưa xử lý
    countUnprocessed() {
        return db.prepare('SELECT COUNT(*) as total FROM sepay_transactions WHERE processed = 0').get().total;
    }
};

module.exports = SepayTransaction;
