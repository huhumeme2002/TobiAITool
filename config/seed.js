/**
 * Seed Database - Tạo bảng và dữ liệu mẫu ban đầu
 * Chạy: npm run seed
 */
require('dotenv').config();
const db = require('./database');
const bcrypt = require('bcryptjs');

console.log('🔧 Đang khởi tạo database...');

// ==================== TẠO BẢNG ====================

// Bảng users - Quản lý tài khoản admin
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        display_name TEXT DEFAULT 'Admin',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Bảng products - Quản lý sản phẩm/gói AI
db.exec(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price INTEGER NOT NULL DEFAULT 0,
        requests INTEGER NOT NULL DEFAULT 0,
        duration INTEGER NOT NULL DEFAULT 30,
        duration_unit TEXT NOT NULL DEFAULT 'ngày',
        description TEXT DEFAULT '',
        image TEXT DEFAULT '',
        features TEXT DEFAULT '',
        cost INTEGER NOT NULL DEFAULT 0,
        listed_price INTEGER NOT NULL DEFAULT 0,
        is_visible INTEGER NOT NULL DEFAULT 1,
        is_featured INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Thêm cột image nếu bảng đã tồn tại nhưng chưa có cột image
try {
    db.exec(`ALTER TABLE products ADD COLUMN image TEXT DEFAULT ''`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Thêm cột features nếu bảng đã tồn tại nhưng chưa có cột features
try {
    db.exec(`ALTER TABLE products ADD COLUMN features TEXT DEFAULT ''`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Thêm cột cost (chi phí vốn) vào products
try {
    db.exec(`ALTER TABLE products ADD COLUMN cost INTEGER NOT NULL DEFAULT 0`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Thêm cột listed_price (giá niêm yết) vào products
try {
    db.exec(`ALTER TABLE products ADD COLUMN listed_price INTEGER NOT NULL DEFAULT 0`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Cập nhật listed_price = price cho các sản phẩm cũ chưa có listed_price
try {
    db.exec(`UPDATE products SET listed_price = price WHERE listed_price = 0 AND price > 0`);
} catch (e) {
    // Bỏ qua
}

// Thêm cột package_id vào orders
try {
    db.exec(`ALTER TABLE orders ADD COLUMN package_id INTEGER DEFAULT NULL`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Thêm cột package_name vào orders
try {
    db.exec(`ALTER TABLE orders ADD COLUMN package_name TEXT DEFAULT ''`);
} catch (e) {
    // Cột đã tồn tại, bỏ qua
}

// Bảng product_packages - Các gói theo thời hạn của sản phẩm
db.exec(`
    CREATE TABLE IF NOT EXISTS product_packages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        package_name TEXT NOT NULL DEFAULT '',
        duration INTEGER NOT NULL DEFAULT 1,
        duration_unit TEXT NOT NULL DEFAULT 'ngày',
        request_count TEXT NOT NULL DEFAULT '',
        price INTEGER NOT NULL DEFAULT 0,
        listed_price INTEGER NOT NULL DEFAULT 0,
        cost INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    )
`);

// Bảng orders - Quản lý đơn hàng
db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_name TEXT NOT NULL,
        customer_phone TEXT DEFAULT '',
        customer_email TEXT DEFAULT '',
        product_id INTEGER,
        product_name TEXT NOT NULL,
        listed_price INTEGER NOT NULL DEFAULT 0,
        actual_price INTEGER NOT NULL DEFAULT 0,
        cost INTEGER NOT NULL DEFAULT 0,
        profit INTEGER NOT NULL DEFAULT 0,
        sale_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'paid',
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
    )
`);

// Bảng settings - Cài đặt hệ thống
db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL DEFAULT '',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Bảng transaction_proofs - Bằng chứng giao dịch (bill/chuyển khoản)
db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_proofs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        image_path TEXT NOT NULL,
        customer_name TEXT DEFAULT '',
        amount INTEGER DEFAULT 0,
        transaction_date DATE DEFAULT NULL,
        is_visible INTEGER NOT NULL DEFAULT 1,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Bảng fixed_costs - Quản lý chi phí cố định
db.exec(`
    CREATE TABLE IF NOT EXISTS fixed_costs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        amount INTEGER NOT NULL DEFAULT 0,
        category TEXT DEFAULT '',
        start_date TEXT NOT NULL,
        end_date TEXT DEFAULT NULL,
        is_active INTEGER DEFAULT 1,
        notes TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`);

// Bảng sepay_transactions - Giao dịch từ Sepay webhook
db.exec(`
    CREATE TABLE IF NOT EXISTS sepay_transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sepay_id INTEGER,
        gateway TEXT DEFAULT '',
        transaction_date TEXT DEFAULT '',
        account_number TEXT DEFAULT '',
        transfer_type TEXT DEFAULT '',
        transfer_amount INTEGER DEFAULT 0,
        accumulated INTEGER DEFAULT 0,
        code TEXT DEFAULT '',
        content TEXT DEFAULT '',
        reference_number TEXT DEFAULT '',
        description TEXT DEFAULT '',
        order_id INTEGER DEFAULT NULL,
        processed INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
    )
`);

// Thêm cột order_code vào orders (mã đơn hàng cho thanh toán online)
try {
    db.exec(`ALTER TABLE orders ADD COLUMN order_code TEXT DEFAULT ''`);
} catch (e) {
    // Cột đã tồn tại
}

// Thêm cột payment_method vào orders
try {
    db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'manual'`);
} catch (e) {
    // Cột đã tồn tại
}

console.log('✅ Đã tạo xong các bảng.');

// ==================== DỮ LIỆU MẪU ====================

// 1. Tạo tài khoản admin mặc định
const existingAdmin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO users (username, password, display_name) VALUES (?, ?, ?)').run('admin', hashedPassword, 'Quản trị viên');
    console.log('✅ Đã tạo tài khoản admin mặc định (admin / admin123)');
} else {
    console.log('ℹ️  Tài khoản admin đã tồn tại, bỏ qua.');
}

// 2. Tạo cài đặt mặc định
const defaultSettings = [
    ['zalo_link', 'https://zalo.me/0123456789'],
    ['brand_name', 'Toby AI Dev Tool'],
    ['brand_slogan', 'AI Dev Tools hàng đầu'],
    ['brand_description', 'Chuyên cung cấp Cursor Pro, Augment Code, Augment Pro, Claude, Augment Plus, GitHub Copilot — các AI coding assistant giúp lập trình viên tăng năng suất gấp nhiều lần.'],
    ['contact_email', 'contact@aistore.vn'],
    ['contact_phone', '0123 456 789'],
    ['facebook_link', 'https://facebook.com'],
    ['brand_logo', '']
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
const insertSettingsTransaction = db.transaction((settings) => {
    for (const [key, value] of settings) {
        insertSetting.run(key, value);
    }
});
insertSettingsTransaction(defaultSettings);
console.log('✅ Đã tạo cài đặt mặc định.');

// 3. Tạo sản phẩm mẫu (với packages)
const existingProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (existingProducts.count === 0) {
    const sampleProducts = [
        { name: 'Cursor Vô Hạn Request - Claude Opus', price: 20000, requests: 0, duration: 1, duration_unit: 'ngày', description: 'Sử dụng không giới hạn request và auto completion', is_visible: 1, is_featured: 1, sort_order: 1 },
        { name: 'Gói Pro', price: 499000, requests: 5000, duration: 30, duration_unit: 'ngày', description: 'Dành cho doanh nghiệp nhỏ. Nhiều request hơn, tốc độ xử lý nhanh hơn.', is_visible: 1, is_featured: 0, sort_order: 2 },
    ];

    const insertProduct = db.prepare(`
        INSERT INTO products (name, price, requests, duration, duration_unit, description, is_visible, is_featured, sort_order)
        VALUES (@name, @price, @requests, @duration, @duration_unit, @description, @is_visible, @is_featured, @sort_order)
    `);

    const insertProductsTransaction = db.transaction((products) => {
        for (const product of products) {
            insertProduct.run(product);
        }
    });
    insertProductsTransaction(sampleProducts);
    console.log('✅ Đã tạo sản phẩm mẫu.');

    // Tạo packages mẫu cho sản phẩm đầu tiên (Cursor Vô Hạn Request)
    const samplePackages = [
        { product_id: 1, package_name: '1 ngày', duration: 1, duration_unit: 'ngày', request_count: 'Vô Hạn', price: 20000, listed_price: 20000, cost: 5000, sort_order: 1 },
        { product_id: 1, package_name: '7 ngày', duration: 7, duration_unit: 'ngày', request_count: 'Vô Hạn', price: 50000, listed_price: 50000, cost: 15000, sort_order: 2 },
        { product_id: 1, package_name: '1 tháng', duration: 1, duration_unit: 'tháng', request_count: 'Vô Hạn', price: 159000, listed_price: 159000, cost: 50000, sort_order: 3 },
        { product_id: 1, package_name: '3 tháng', duration: 3, duration_unit: 'tháng', request_count: 'Vô Hạn', price: 299000, listed_price: 299000, cost: 100000, sort_order: 4 },
        { product_id: 1, package_name: '1 năm', duration: 1, duration_unit: 'năm', request_count: 'Vô Hạn', price: 800000, listed_price: 800000, cost: 250000, sort_order: 5 },
    ];

    const insertPackage = db.prepare(`
        INSERT INTO product_packages (product_id, package_name, duration, duration_unit, request_count, price, listed_price, cost, sort_order)
        VALUES (@product_id, @package_name, @duration, @duration_unit, @request_count, @price, @listed_price, @cost, @sort_order)
    `);
    const insertPackagesTransaction = db.transaction((packages) => {
        for (const pkg of packages) {
            insertPackage.run(pkg);
        }
    });
    insertPackagesTransaction(samplePackages);
    console.log('✅ Đã tạo packages mẫu.');
} else {
    console.log('ℹ️  Sản phẩm đã tồn tại, bỏ qua.');
}

// 4. Tạo đơn hàng mẫu để test báo cáo
const existingOrders = db.prepare('SELECT COUNT(*) as count FROM orders').get();
if (existingOrders.count === 0) {
    const today = new Date();
    const sampleOrders = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const numOrders = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < numOrders; j++) {
            // Chỉ dùng 2 products đã tạo ở trên (id 1 và 2)
            const products = [
                { id: 1, name: 'Cursor Vô Hạn Request - Claude Opus', price: 20000 },
                { id: 2, name: 'Gói Pro', price: 499000 }
            ];
            const p = products[Math.floor(Math.random() * products.length)];
            const cost = Math.floor(p.price * (0.2 + Math.random() * 0.3));
            sampleOrders.push({
                customer_name: `Khách hàng ${sampleOrders.length + 1}`,
                customer_phone: `09${Math.floor(10000000 + Math.random() * 90000000)}`,
                customer_email: '',
                product_id: p.id,
                product_name: p.name,
                listed_price: p.price,
                actual_price: p.price,
                cost: cost,
                profit: p.price - cost,
                sale_date: dateStr,
                status: Math.random() > 0.15 ? 'paid' : 'pending',
                notes: ''
            });
        }
    }

    const insertOrder = db.prepare(`
        INSERT INTO orders (customer_name, customer_phone, customer_email, product_id, product_name, listed_price, actual_price, cost, profit, sale_date, status, notes)
        VALUES (@customer_name, @customer_phone, @customer_email, @product_id, @product_name, @listed_price, @actual_price, @cost, @profit, @sale_date, @status, @notes)
    `);
    const insertOrdersTransaction = db.transaction((orders) => {
        for (const order of orders) {
            insertOrder.run(order);
        }
    });
    insertOrdersTransaction(sampleOrders);
    console.log(`✅ Đã tạo ${sampleOrders.length} đơn hàng mẫu.`);
} else {
    console.log('ℹ️  Đơn hàng đã tồn tại, bỏ qua.');
}

console.log('\n🎉 Khởi tạo database hoàn tất!');
console.log('👉 Chạy "npm run dev" để khởi động ứng dụng.');
db.close();

