/**
 * Routes - Xác thực (Đăng nhập / Đăng xuất)
 */
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { isNotAuthenticated } = require('../middleware/auth');

// GET /admin - Redirect về login hoặc dashboard
router.get('/', (req, res) => {
    if (req.session.user) {
        return res.redirect('/admin/dashboard');
    }
    res.redirect('/admin/login');
});

// GET /admin/login - Trang đăng nhập
router.get('/login', isNotAuthenticated, (req, res) => {
    res.render('admin/login', { title: 'Đăng nhập Admin' });
});

// POST /admin/login - Xử lý đăng nhập
router.post('/login', isNotAuthenticated, (req, res) => {
    const { username, password }= req.body;

    // Validate
    if (!username || !password) {
        req.flash('error', 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
        return res.redirect('/admin/login');
    }

    try {
        // Tìm user
        const user = User.findByUsername(username);
        if (!user) {
            req.flash('error', 'Tên đăng nhập hoặc mật khẩu không đúng.');
            return res.redirect('/admin/login');
        }

        // Kiểm tra mật khẩu
        if (!User.verifyPassword(password, user.password)) {
            req.flash('error', 'Tên đăng nhập hoặc mật khẩu không đúng.');
            return res.redirect('/admin/login');
        }

        // Regenerate session để tránh session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                req.flash('error', 'Có lỗi xảy ra khi đăng nhập.');
                return res.redirect('/admin/login');
            }

            // Lưu thông tin user vào session
            req.session.user = {
                id: user.id,
                username: user.username,
                display_name: user.display_name
            };

            // Save session trước khi redirect
            req.session.save((err) => {
                if (err) {
                    console.error('Session save error:', err);
                    req.flash('error', 'Có lỗi xảy ra khi đăng nhập.');
                    return res.redirect('/admin/login');
                }

                req.flash('success', `Chào mừng ${user.display_name}!`);
                res.redirect('/admin/dashboard');
            });
        });
    } catch (err) {
        console.error('Login error:', err);
        req.flash('error', 'Có lỗi xảy ra khi đăng nhập.');
        res.redirect('/admin/login');
    }
});

// GET /admin/logout - Đăng xuất
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/admin/login');
    });
});

module.exports = router;

