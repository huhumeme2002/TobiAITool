/**
 * Routes - Quản lý đơn hàng
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Order = require('../models/Order');
const Product = require('../models/Product');

// GET /admin/orders - Danh sách đơn hàng
router.get('/', isAuthenticated, (req, res) => {
    const { page = 1, search = '', status = '', startDate = '', endDate = '', sortBy = 'sale_date', sortOrder = 'DESC' } = req.query;
    const result = Order.getAll({
        page: parseInt(page),
        limit: 15,
        search, status, startDate, endDate, sortBy, sortOrder
    });

    res.render('admin/orders/index', {
        title: 'Quản lý đơn hàng',
        orders: result.rows,
        total: result.total,
        totalPages: result.totalPages,
        currentPage: result.currentPage,
        filters: { search, status, startDate, endDate, sortBy, sortOrder }
    });
});

// GET /admin/orders/create - Form thêm đơn hàng
router.get('/create', isAuthenticated, (req, res) => {
    const products = Product.getAllWithPackages();
    res.render('admin/orders/form', { title: 'Thêm đơn hàng', order: null, products });
});

// POST /admin/orders/create - Xử lý thêm đơn hàng
router.post('/create', isAuthenticated, (req, res) => {
    const { customer_name, customer_phone, customer_email, product_id, actual_price, cost, sale_date, status, notes } = req.body;

    if (!customer_name || !product_id || !actual_price || !cost || !sale_date) {
        req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
        return res.redirect('/admin/orders/create');
    }

    const product = Product.findById(product_id);
    if (!product) {
        req.flash('error', 'Sản phẩm không tồn tại.');
        return res.redirect('/admin/orders/create');
    }

    try {
        const actualPriceNum = parseInt(actual_price);
        const costNum = parseInt(cost);
        Order.create({
            customer_name: customer_name.trim(),
            customer_phone: (customer_phone || '').trim(),
            customer_email: (customer_email || '').trim(),
            product_id: parseInt(product_id),
            product_name: product.name,
            listed_price: product.listed_price || product.price,
            actual_price: actualPriceNum,
            cost: costNum,
            profit: actualPriceNum - costNum,
            sale_date,
            status: status || 'paid',
            notes: (notes || '').trim()
        });
        req.flash('success', 'Thêm đơn hàng thành công!');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Lỗi thêm đơn hàng:', err);
        req.flash('error', 'Có lỗi xảy ra khi thêm đơn hàng.');
        res.redirect('/admin/orders/create');
    }
});

// GET /admin/orders/edit/:id - Form sửa đơn hàng
router.get('/edit/:id', isAuthenticated, (req, res) => {
    const order = Order.findById(req.params.id);
    if (!order) {
        req.flash('error', 'Không tìm thấy đơn hàng.');
        return res.redirect('/admin/orders');
    }
    const products = Product.getAllWithPackages();
    res.render('admin/orders/form', { title: 'Sửa đơn hàng', order, products });
});

// POST /admin/orders/edit/:id - Xử lý sửa đơn hàng
router.post('/edit/:id', isAuthenticated, (req, res) => {
    const { customer_name, customer_phone, customer_email, product_id, actual_price, cost, sale_date, status, notes } = req.body;

    if (!customer_name || !product_id || !actual_price || !cost || !sale_date) {
        req.flash('error', 'Vui lòng điền đầy đủ thông tin bắt buộc.');
        return res.redirect(`/admin/orders/edit/${req.params.id}`);
    }

    const product = Product.findById(product_id);
    if (!product) {
        req.flash('error', 'Sản phẩm không tồn tại.');
        return res.redirect(`/admin/orders/edit/${req.params.id}`);
    }

    try {
        const actualPriceNum = parseInt(actual_price);
        const costNum = parseInt(cost);
        Order.update(req.params.id, {
            customer_name: customer_name.trim(),
            customer_phone: (customer_phone || '').trim(),
            customer_email: (customer_email || '').trim(),
            product_id: parseInt(product_id),
            product_name: product.name,
            listed_price: product.listed_price || product.price,
            actual_price: actualPriceNum,
            cost: costNum,
            profit: actualPriceNum - costNum,
            sale_date,
            status: status || 'paid',
            notes: (notes || '').trim()
        });
        req.flash('success', 'Cập nhật đơn hàng thành công!');
        res.redirect('/admin/orders');
    } catch (err) {
        console.error('Lỗi cập nhật đơn hàng:', err);
        req.flash('error', 'Có lỗi xảy ra khi cập nhật đơn hàng.');
        res.redirect(`/admin/orders/edit/${req.params.id}`);
    }
});

// POST /admin/orders/delete/:id - Xóa đơn hàng
router.post('/delete/:id', isAuthenticated, (req, res) => {
    try {
        Order.delete(req.params.id);
        req.flash('success', 'Đã xóa đơn hàng.');
    } catch (err) {
        req.flash('error', 'Có lỗi xảy ra khi xóa đơn hàng.');
    }
    res.redirect('/admin/orders');
});

// GET /admin/orders/api/product/:id - API lấy thông tin sản phẩm (cho form)
router.get('/api/product/:id', isAuthenticated, (req, res) => {
    const product = Product.findByIdWithPackages(req.params.id);
    if (!product) return res.json({ error: 'Không tìm thấy' });
    res.json({
        name: product.name,
        price: product.price,
        listed_price: product.listed_price || product.price,
        cost: product.cost || 0,
        packages: product.packages || []
    });
});

module.exports = router;

