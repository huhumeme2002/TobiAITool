/**
 * Middleware xác thực - Bảo vệ các route Admin
 */

// Kiểm tra đã đăng nhập chưa
function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    req.flash('error', 'Vui lòng đăng nhập để tiếp tục.');
    res.redirect('/admin/login');
}

// Nếu đã đăng nhập rồi thì redirect về dashboard
function isNotAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return res.redirect('/admin/dashboard');
    }
    next();
}

module.exports = { isAuthenticated, isNotAuthenticated };

