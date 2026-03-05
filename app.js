/**
 * App.js - File khởi động chính của ứng dụng
 * Website bán sản phẩm AI - Landing Page + Admin Dashboard
 */
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');

const app = express();
app.set('trust proxy', 1); // Trust first proxy (Nginx) for secure cookies
const PORT = process.env.PORT || 3000;

// ==================== MIDDLEWARE ====================

// Bảo mật HTTP headers
app.use(helmet({
    contentSecurityPolicy: false, // Tắt CSP để cho phép inline scripts (Chart.js)
    crossOriginEmbedderPolicy: false
}));

// Nén response
app.use(compression());

// Parse body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Upload files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// View engine - EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session
app.use(session({
    secret: process.env.SESSION_SECRET || 'default-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 giờ
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false'
    }
}));

// Flash messages
app.use(flash());

// Biến toàn cục cho views
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success');
    res.locals.error_msg = req.flash('error');
    res.locals.user = req.session.user || null;
    next();
});

// ==================== ROUTES ====================

// Landing Page (trang công khai)
const landingRoutes = require('./routes/landing');
app.use('/', landingRoutes);

// Admin routes
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const reportRoutes = require('./routes/reports');
const settingsRoutes = require('./routes/settings');
const transactionProofsRoutes = require('./routes/transactionProofs');
const fixedCostsRoutes = require('./routes/fixedCosts');
const checkoutRoutes = require('./routes/checkout');
const webhookRoutes = require('./routes/webhook');

app.use('/admin', authRoutes);
app.use('/admin/dashboard', dashboardRoutes);
app.use('/admin/products', productRoutes);
app.use('/admin/orders', orderRoutes);
app.use('/admin/reports', reportRoutes);
app.use('/admin/settings', settingsRoutes);
app.use('/admin/transaction-proofs', transactionProofsRoutes);
app.use('/admin/fixed-costs', fixedCostsRoutes);

// Checkout & Payment
app.use('/checkout', checkoutRoutes);
app.use('/api/sepay', webhookRoutes);

// ==================== XỬ LÝ LỖI ====================

// 404 - Không tìm thấy trang
app.use((req, res) => {
    res.status(404).render('errors/404', { title: 'Không tìm thấy trang' });
});

// 500 - Lỗi server
app.use((err, req, res, next) => {
    console.error('❌ Lỗi server:', err.stack);
    res.status(500).render('errors/500', { title: 'Lỗi hệ thống' });
});

// ==================== KHỞI ĐỘNG ====================

app.listen(PORT, () => {
    console.log(`\n🚀 Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📄 Landing Page: http://localhost:${PORT}`);
    console.log(`🔐 Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`\n📌 Môi trường: ${process.env.NODE_ENV || 'development'}\n`);
});

module.exports = app;

