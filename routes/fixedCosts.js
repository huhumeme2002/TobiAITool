/**
 * Routes - Quản lý chi phí cố định (CRUD)
 */
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const FixedCost = require('../models/FixedCost');

// GET /admin/fixed-costs - Danh sách chi phí cố định
router.get('/', isAuthenticated, (req, res) => {
    const fixedCosts = FixedCost.getAll();
    res.render('admin/fixed-costs/index', { title: 'Quản lý chi phí cố định', fixedCosts });
});

// GET /admin/fixed-costs/new - Form thêm chi phí cố định
router.get('/new', isAuthenticated, (req, res) => {
    res.render('admin/fixed-costs/form', { title: 'Thêm chi phí cố định', fixedCost: null });
});

// POST /admin/fixed-costs - Tạo chi phí cố định mới
router.post('/', isAuthenticated, (req, res) => {
    const { name, amount, category, start_date, end_date, is_active, notes } = req.body;

    // Validate
    if (!name || !name.trim()) {
        req.flash('error', 'Vui lòng điền tên chi phí.');
        return res.redirect('/admin/fixed-costs/new');
    }

    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
        req.flash('error', 'Vui lòng nhập số tiền hợp lệ.');
        return res.redirect('/admin/fixed-costs/new');
    }

    if (!start_date) {
        req.flash('error', 'Vui lòng chọn ngày bắt đầu.');
        return res.redirect('/admin/fixed-costs/new');
    }

    try {
        FixedCost.create({
            name: name.trim(),
            amount: parseFloat(amount),
            category: (category || '').trim(),
            start_date: start_date,
            end_date: end_date || null,
            is_active: is_active ? 1 : 0,
            notes: (notes || '').trim()
        });

        req.flash('success', 'Thêm chi phí cố định thành công!');
        res.redirect('/admin/fixed-costs');
    } catch (err) {
        console.error('Lỗi thêm chi phí cố định:', err);
        req.flash('error', 'Có lỗi xảy ra khi thêm chi phí cố định.');
        res.redirect('/admin/fixed-costs/new');
    }
});

// GET /admin/fixed-costs/:id/edit - Form sửa chi phí cố định
router.get('/:id/edit', isAuthenticated, (req, res) => {
    const fixedCost = FixedCost.findById(req.params.id);
    if (!fixedCost) {
        req.flash('error', 'Không tìm thấy chi phí cố định.');
        return res.redirect('/admin/fixed-costs');
    }
    res.render('admin/fixed-costs/form', { title: 'Sửa chi phí cố định', fixedCost });
});

// POST /admin/fixed-costs/:id - Cập nhật chi phí cố định
router.post('/:id', isAuthenticated, (req, res) => {
    const { name, amount, category, start_date, end_date, is_active, notes } = req.body;

    // Validate
    if (!name || !name.trim()) {
        req.flash('error', 'Vui lòng điền tên chi phí.');
        return res.redirect(`/admin/fixed-costs/${req.params.id}/edit`);
    }

    if (!amount || isNaN(amount) || parseFloat(amount) < 0) {
        req.flash('error', 'Vui lòng nhập số tiền hợp lệ.');
        return res.redirect(`/admin/fixed-costs/${req.params.id}/edit`);
    }

    if (!start_date) {
        req.flash('error', 'Vui lòng chọn ngày bắt đầu.');
        return res.redirect(`/admin/fixed-costs/${req.params.id}/edit`);
    }

    try {
        FixedCost.update(req.params.id, {
            name: name.trim(),
            amount: parseFloat(amount),
            category: (category || '').trim(),
            start_date: start_date,
            end_date: end_date || null,
            is_active: is_active ? 1 : 0,
            notes: (notes || '').trim()
        });

        req.flash('success', 'Cập nhật chi phí cố định thành công!');
        res.redirect('/admin/fixed-costs');
    } catch (err) {
        console.error('Lỗi cập nhật chi phí cố định:', err);
        req.flash('error', 'Có lỗi xảy ra khi cập nhật chi phí cố định.');
        res.redirect(`/admin/fixed-costs/${req.params.id}/edit`);
    }
});

// POST /admin/fixed-costs/:id/delete - Xóa chi phí cố định
router.post('/:id/delete', isAuthenticated, (req, res) => {
    try {
        FixedCost.delete(req.params.id);
        req.flash('success', 'Đã xóa chi phí cố định.');
        res.redirect('/admin/fixed-costs');
    } catch (err) {
        console.error('Lỗi xóa chi phí cố định:', err);
        req.flash('error', 'Có lỗi xảy ra khi xóa chi phí cố định.');
        res.redirect('/admin/fixed-costs');
    }
});

module.exports = router;
