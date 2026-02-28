const db = require('./config/database');
const bcrypt = require('bcryptjs');

// THÔNG TIN BẠN MUỐN ĐỔI - Sửa ở đây
const NEW_USERNAME = 'admin'; // Tên đăng nhập mới (để nguyên 'admin' nếu không đổi)
const NEW_PASSWORD = 'admin123'; // Mật khẩu mới

try {
    console.log('🔄 Đang cập nhật tài khoản Admin...');

    // 1. Kiểm tra user admin hiện tại
    const user = db.prepare('SELECT * FROM users LIMIT 1').get();

    if (!user) {
        console.error('❌ Không tìm thấy tài khoản admin nào trong database!');
        process.exit(1);
    }

    // 2. Mã hóa mật khẩu mới
    const hashedPassword = bcrypt.hashSync(NEW_PASSWORD, 10);

    // 3. Cập nhật vào database
    const stmt = db.prepare('UPDATE users SET username = ?, password = ? WHERE id = ?');
    stmt.run(NEW_USERNAME, hashedPassword, user.id);

    console.log('✅ Cập nhật thành công!');
    console.log(`👉 Tên đăng nhập: ${NEW_USERNAME}`);
    console.log(`👉 Mật khẩu: ${NEW_PASSWORD}`);
    console.log('-----------------------------------');
    console.log('Lưu ý: Bạn cần đăng nhập lại với thông tin mới.');

} catch (error) {
    console.error('❌ Có lỗi xảy ra:', error.message);
}
