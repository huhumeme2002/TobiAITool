/**
 * Routes - Quản lý sản phẩm (CRUD) + Upload ảnh
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const Product = require('../models/Product');
const ProductPackage = require('../models/ProductPackage');

// ==================== CẤU HÌNH MULTER ====================
const uploadDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueName + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = allowed.test(file.mimetype.split('/')[1]);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp, svg)'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }// 5MB
});

// GET /admin/products - Danh sách sản phẩm
router.get('/', isAuthenticated, (req, res) => {
    const products = Product.getAllWithPackages();
    res.render('admin/products/index', { title: 'Quản lý sản phẩm', products });
});

// GET /admin/products/create - Form thêm sản phẩm
router.get('/create', isAuthenticated, (req, res) => {
    res.render('admin/products/form', { title: 'Thêm sản phẩm', product: null });
});

// POST /admin/products/create - Xử lý thêm sản phẩm
router.post('/create', isAuthenticated, upload.single('image'), (req, res) => {
    const { name, price, listed_price, cost, requests, duration, duration_unit, description, features, is_visible, is_featured, sort_order } = req.body;

    // Validate
    if (!name) {
        req.flash('error', 'Vui lòng điền tên sản phẩm.');
        return res.redirect('/admin/products/create');
    }

    try {
        const imagePath = req.file ? '/uploads/products/' + req.file.filename : '';
        const result = Product.create({
            name: name.trim(),
            price: parseInt(price) || 0,
            listed_price: parseInt(listed_price) || parseInt(price) || 0,
            cost: parseInt(cost) || 0,
            requests: parseInt(requests) || 0,
            duration: parseInt(duration) || 0,
            duration_unit: duration_unit || 'ngày',
            description: (description || '').trim(),
            image: imagePath,
            features: (features || '').trim(),
            is_visible: is_visible ? 1 : 0,
            is_featured: is_featured ? 1 : 0,
            sort_order: parseInt(sort_order) || 0
        });

        // Lưu packages
        const productId = result.lastInsertRowid;
        savePackagesFromBody(productId, req.body);

        req.flash('success', 'Thêm sản phẩm thành công!');
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Lỗi thêm sản phẩm:', err);
        req.flash('error', 'Có lỗi xảy ra khi thêm sản phẩm.');
        res.redirect('/admin/products/create');
    }
});

// GET /admin/products/edit/:id - Form sửa sản phẩm
router.get('/edit/:id', isAuthenticated, (req, res) => {
    const product = Product.findByIdWithPackages(req.params.id);
    if (!product) {
        req.flash('error', 'Không tìm thấy sản phẩm.');
        return res.redirect('/admin/products');
    }
    res.render('admin/products/form', { title: 'Sửa sản phẩm', product });
});

// POST /admin/products/edit/:id - Xử lý sửa sản phẩm
router.post('/edit/:id', isAuthenticated, upload.single('image'), (req, res) => {
    const { name, price, listed_price, cost, requests, duration, duration_unit, description, features, is_visible, is_featured, sort_order, existing_image } = req.body;

    if (!name) {
        req.flash('error', 'Vui lòng điền tên sản phẩm.');
        return res.redirect(`/admin/products/edit/${req.params.id}`);
    }

    try {
        // Nếu upload ảnh mới thì dùng ảnh mới, không thì giữ ảnh cũ
        let imagePath = existing_image || '';
        if (req.file) {
            imagePath = '/uploads/products/' + req.file.filename;
            // Xóa ảnh cũ nếu có
            if (existing_image) {
                const oldPath = path.join(__dirname, '..', existing_image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        Product.update(req.params.id, {
            name: name.trim(),
            price: parseInt(price) || 0,
            listed_price: parseInt(listed_price) || parseInt(price) || 0,
            cost: parseInt(cost) || 0,
            requests: parseInt(requests) || 0,
            duration: parseInt(duration) || 0,
            duration_unit: duration_unit || 'ngày',
            description: (description || '').trim(),
            image: imagePath,
            features: (features || '').trim(),
            is_visible: is_visible ? 1 : 0,
            is_featured: is_featured ? 1 : 0,
            sort_order: parseInt(sort_order) || 0
        });

        // Lưu packages
        savePackagesFromBody(req.params.id, req.body);

        req.flash('success', 'Cập nhật sản phẩm thành công!');
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Lỗi cập nhật sản phẩm:', err);
        req.flash('error', 'Có lỗi xảy ra khi cập nhật sản phẩm.');
        res.redirect(`/admin/products/edit/${req.params.id}`);
    }
});

// POST /admin/products/delete/:id - Xóa sản phẩm (kèm xóa ảnh)
router.post('/delete/:id', isAuthenticated, (req, res) => {
    try {
        const product = Product.findById(req.params.id);
        if (product && product.image) {
            const imgPath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        Product.delete(req.params.id);
        req.flash('success', 'Đã xóa sản phẩm.');
        res.redirect('/admin/products');
    } catch (err) {
        console.error('Lỗi xóa sản phẩm:', err);
        req.flash('error', 'Có lỗi xảy ra khi xóa sản phẩm.');
        res.redirect('/admin/products');
    }
});

// POST /admin/products/delete-image/:id - Xóa ảnh sản phẩm (AJAX)
router.post('/delete-image/:id', isAuthenticated, (req, res) => {
    try {
        const product = Product.findById(req.params.id);
        if (product && product.image) {
            const imgPath = path.join(__dirname, '..', product.image);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
            const db = require('../config/database');
            db.prepare('UPDATE products SET image = ? WHERE id = ?').run('', req.params.id);
        }
        res.json({ success: true });
    }
});

// POST /admin/products/update-order - Cập nhật thứ tự (AJAX)
router.post('/update-order', isAuthenticated, (req, res) => {
    const { id, sort_order } = req.body;
    try {
        const db = require('../config/database');
        db.prepare('UPDATE products SET sort_order = ? WHERE id = ?').run(parseInt(sort_order) || 0, id);
        res.json({ success: true });
    } catch (err) {
        console.error('Lỗi cập nhật thứ tự:', err);
        res.json({ success: false, message: 'Có lỗi xảy ra' });
    }
});

module.exports = router;

// ==================== HELPER: Lưu packages từ body ====================
function savePackagesFromBody(productId, body) {
    const packageNames = body['pkg_name'] || [];
    const packageDurations = body['pkg_duration'] || [];
    const packageDurationUnits = body['pkg_duration_unit'] || [];
    const packageRequestCounts = body['pkg_request_count'] || [];
    const packagePrices = body['pkg_price'] || [];
    const packageListedPrices = body['pkg_listed_price'] || [];
    const packageCosts = body['pkg_cost'] || [];
    const packageSortOrders = body['pkg_sort_order'] || [];

    // Đảm bảo luôn là mảng
    const names = Array.isArray(packageNames) ? packageNames : [packageNames];
    const durations = Array.isArray(packageDurations) ? packageDurations : [packageDurations];
    const durationUnits = Array.isArray(packageDurationUnits) ? packageDurationUnits : [packageDurationUnits];
    const requestCounts = Array.isArray(packageRequestCounts) ? packageRequestCounts : [packageRequestCounts];
    const prices = Array.isArray(packagePrices) ? packagePrices : [packagePrices];
    const listedPrices = Array.isArray(packageListedPrices) ? packageListedPrices : [packageListedPrices];
    const costs = Array.isArray(packageCosts) ? packageCosts : [packageCosts];
    const sortOrders = Array.isArray(packageSortOrders) ? packageSortOrders : [packageSortOrders];

    const packages = [];
    for (let i = 0; i < names.length; i++) {
        if (!names[i] || !names[i].trim()) continue;
        packages.push({
            package_name: names[i].trim(),
            duration: parseInt(durations[i]) || 1,
            duration_unit: durationUnits[i] || 'ngày',
            request_count: (requestCounts[i] || '').trim(),
            price: parseInt(prices[i]) || 0,
            listed_price: parseInt(listedPrices[i]) || parseInt(prices[i]) || 0,
            cost: parseInt(costs[i]) || 0,
            sort_order: parseInt(sortOrders[i]) || (i + 1)
        });
    }

    ProductPackage.saveAll(productId, packages);
}

