/**
 * Model Setting - Quản lý cài đặt hệ thống
 */
const db = require('../config/database');

const Setting = {
    // Lấy giá trị một cài đặt
    get(key) {
        const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
        return row ? row.value : null;
    },

    // Lấy tất cả cài đặt (trả về object)
    getAll() {
        const rows = db.prepare('SELECT key, value FROM settings').all();
        const settings = {};
        rows.forEach(row => {
            settings[row.key] = row.value;
        });
        return settings;
    },

    // Cập nhật một cài đặt
    set(key, value) {
        return db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)').run(key, value);
    },

    // Cập nhật nhiều cài đặt cùng lúc
    setMany(data) {
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
        const transaction = db.transaction((items) => {
            for (const [key, value] of Object.entries(items)) {
                stmt.run(key, value);
            }
        });
        transaction(data);
    }
};

module.exports = Setting;

