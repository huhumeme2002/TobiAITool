/**
 * Model User - Quản lý tài khoản admin
 */
const db = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
    // Tìm user theo username
    findByUsername(username) {
        return db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    },

    // Tìm user theo ID
    findById(id) {
        return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    },

    // Xác thực mật khẩu
    verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compareSync(plainPassword, hashedPassword);
    },

    // Đổi mật khẩu
    changePassword(userId, newPassword) {
        const hashed = bcrypt.hashSync(newPassword, 10);
        return db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(hashed, userId);
    }
};

module.exports = User;

