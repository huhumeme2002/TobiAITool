/**
 * Cấu hình kết nối Database (SQLite)
 * Sử dụng better-sqlite3 cho hiệu suất cao
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục data tồn tại
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = process.env.DB_PATH || path.join(dataDir, 'database.sqlite');
const db = new Database(dbPath);

// Bật WAL mode để tăng hiệu suất
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

module.exports = db;

