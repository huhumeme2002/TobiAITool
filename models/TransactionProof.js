/**
 * Model TransactionProof - Quản lý bằng chứng giao dịch
 */
const db = require('../config/database');

const TransactionProof = {
    // Lấy tất cả bằng chứng (admin)
    getAll() {
        return db.prepare('SELECT * FROM transaction_proofs ORDER BY sort_order ASC, created_at DESC').all();
    },

    // Lấy bằng chứng hiển thị (landing page)
    getVisible() {
        return db.prepare('SELECT * FROM transaction_proofs WHERE is_visible = 1 ORDER BY sort_order ASC, created_at DESC').all();
    },

    // Tìm bằng chứng theo ID
    findById(id) {
        return db.prepare('SELECT * FROM transaction_proofs WHERE id = ?').get(id);
    },

    // Thêm bằng chứng mới
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO transaction_proofs (customer_name, product_name, amount, transaction_date, image, is_visible, sort_order)
            VALUES (@customer_name, @product_name, @amount, @transaction_date, @image, @is_visible, @sort_order)
        `);
        return stmt.run(data);
    },

    // Cập nhật bằng chứng
    update(id, data) {
        const stmt = db.prepare(`
            UPDATE transaction_proofs SET
                customer_name = @customer_name,
                product_name = @product_name,
                amount = @amount,
                transaction_date = @transaction_date,
                image = @image,
                is_visible = @is_visible,
                sort_order = @sort_order,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);
        return stmt.run({ ...data, id });
    },

    // Xóa bằng chứng
    delete(id) {
        return db.prepare('DELETE FROM transaction_proofs WHERE id = ?').run(id);
    },

    // Đếm tổng bằng chứng
    count() {
        return db.prepare('SELECT COUNT(*) as total FROM transaction_proofs').get().total;
    }
};

module.exports = TransactionProof;
