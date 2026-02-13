/**
 * Model FixedCost - Quản lý chi phí cố định
 */
const db = require('../config/database');

const FixedCost = {
    // Lấy danh sách chi phí cố định với filter
    getAll({ search = '', is_active = null } = {}) {
        let where = '1=1';
        const params = [];

        if (search) {
            where += ' AND (name LIKE ? OR category LIKE ? OR notes LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (is_active !== null && is_active !== undefined && is_active !== '') {
            where += ' AND is_active = ?';
            params.push(is_active);
        }

        const rows = db.prepare(`SELECT * FROM fixed_costs WHERE ${where} ORDER BY created_at DESC`).all(...params);
        return rows;
    },

    // Tìm chi phí cố định theo ID
    findById(id) {
        return db.prepare('SELECT * FROM fixed_costs WHERE id = ?').get(id);
    },

    // Thêm chi phí cố định mới
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO fixed_costs (name, amount, category, start_date, end_date, is_active, notes)
            VALUES (@name, @amount, @category, @start_date, @end_date, @is_active, @notes)
        `);
        return stmt.run(data);
    },

    // Cập nhật chi phí cố định
    update(id, data) {
        const stmt = db.prepare(`
            UPDATE fixed_costs SET
                name = @name,
                amount = @amount,
                category = @category,
                start_date = @start_date,
                end_date = @end_date,
                is_active = @is_active,
                notes = @notes,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);
        return stmt.run({ ...data, id });
    },

    // Xóa chi phí cố định
    delete(id) {
        return db.prepare('DELETE FROM fixed_costs WHERE id = ?').run(id);
    },

    // Đếm số lượng chi phí cố định đang hoạt động
    getActiveCount() {
        return db.prepare('SELECT COUNT(*) as count FROM fixed_costs WHERE is_active = 1').get().count;
    },

    // Tính tổng chi phí cố định theo khoảng thời gian
    // amount là tổng chi phí cho khoảng [start_date, end_date]
    // Nếu báo cáo bao trùm hoàn toàn → lấy nguyên amount
    // Nếu chỉ overlap một phần → prorate theo tỷ lệ ngày overlap / tổng ngày chi phí
    getTotalByDateRange(startDate, endDate) {
        const fixedCosts = db.prepare('SELECT * FROM fixed_costs WHERE is_active = 1').all();

        const DAY_MS = 1000 * 60 * 60 * 24;
        let total = 0;
        const start = new Date(startDate);
        const end = new Date(endDate);

        for (const cost of fixedCosts) {
            const costStart = new Date(cost.start_date);
            // Nếu không có end_date → chi phí ongoing, dùng end của báo cáo
            const costEnd = cost.end_date ? new Date(cost.end_date) : end;

            // Tính overlap
            const overlapStart = costStart > start ? costStart : start;
            const overlapEnd = costEnd < end ? costEnd : end;

            if (overlapStart > overlapEnd) continue;

            const totalCostDays = Math.round((costEnd - costStart) / DAY_MS) + 1;
            const overlapDays = Math.round((overlapEnd - overlapStart) / DAY_MS) + 1;

            // Nếu overlap bao trùm toàn bộ khoảng chi phí → lấy nguyên amount
            if (overlapDays >= totalCostDays) {
                total += cost.amount;
            } else {
                // Prorate theo tỷ lệ
                total += (cost.amount / totalCostDays) * overlapDays;
            }
        }

        return Math.round(total);
    }
};

module.exports = FixedCost;
