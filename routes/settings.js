/**
 * Routes - Cài đặt hệ thống
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const Setting = require('../models/Setting');
const User = require('../models/User');

// Cấu hình upload logo
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, 'logo-' + Date.now() + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, svg, webp)'));
    }
});

// GET /admin/settings - Trang cài đặt
router.get('/', isAuthenticated, (req, res) => {
    const settings = Setting.getAll();
    res.render('admin/settings/index', { title: 'Cài đặt hệ thống', settings });
});

// POST /admin/settings/general - Cập nhật cài đặt chung
router.post('/general', isAuthenticated, upload.single('brand_logo'), (req, res) => {
    const { brand_name, brand_slogan, brand_description, zalo_link, contact_email, contact_phone, facebook_link } = req.body;

    const data = {
        brand_name: (brand_name || '').trim(),
        brand_slogan: (brand_slogan || '').trim(),
        brand_description: (brand_description || '').trim(),
        zalo_link: (zalo_link || '').trim(),
        contact_email: (contact_email || '').trim(),
        contact_phone: (contact_phone || '').trim(),
        facebook_link: (facebook_link || '').trim()
    };

    // Nếu có upload logo mới
    if (req.file) {
        data.brand_logo = '/uploads/' + req.file.filename;
    }

    Setting.setMany(data);
    req.flash('success', 'Đã cập nhật cài đặt thành công!');
    res.redirect('/admin/settings');
});

// POST /admin/settings/password - Đổi mật khẩu
router.post('/password', isAuthenticated, (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;

    if (!current_password || !new_password || !confirm_password) {
        req.flash('error', 'Vui lòng điền đầy đủ thông tin.');
        return res.redirect('/admin/settings');
    }

    if (new_password.length < 6) {
        req.flash('error', 'Mật khẩu mới phải có ít nhất 6 ký tự.');
        return res.redirect('/admin/settings');
    }

    if (new_password !== confirm_password) {
        req.flash('error', 'Mật khẩu xác nhận không khớp.');
        return res.redirect('/admin/settings');
    }

    const user = User.findById(req.session.user.id);
    if (!User.verifyPassword(current_password, user.password)) {
        req.flash('error', 'Mật khẩu hiện tại không đúng.');
        return res.redirect('/admin/settings');
    }

    User.changePassword(req.session.user.id, new_password);
    req.flash('success', 'Đổi mật khẩu thành công!');
    res.redirect('/admin/settings');
});

module.exports = router;

