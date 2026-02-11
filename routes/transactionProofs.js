/**
 * Routes - Quản lý bằng chứng giao dịch (CRUD) + Upload ảnh
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { isAuthenticated } = require('../middleware/auth');
const TransactionProof = require('../models/TransactionProof');

// ==================== CẤU HÌNH MULTER ====================
const uploadDir = path.join(__dirname, '..', 'uploads', 'transaction-proofs');
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
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// GET /admin/transaction-proofs - Danh sách bằng chứng
router.get('/', isAuthenticated, (req, res) => {
    const proofs = TransactionProof.getAll();
    res.render('admin/transaction-proofs/index', { title: 'Quản lý bằng chứng giao dịch', proofs });
});

// GET /admin/transaction-proofs/new - Form thêm bằng chứng
router.get('/new', isAuthenticated, (req, res) => {
    res.render('admin/transaction-proofs/form', { title: 'Thêm bằng chứng giao dịch', proof: null });
});

// POST /admin/transaction-proofs - Xử lý thêm bằng chứng
router.post('/', isAuthenticated, upload.single('image'), (req, res) => {
    const { customer_name, amount, transaction_date, is_visible, sort_order } = req.body;

    if (!req.file) {
        req.flash('error', 'Vui lòng upload ảnh bằng chứng.');
        return res.redirect('/admin/transaction-proofs/new');
    }

    try {
        const imagePath = '/uploads/transaction-proofs/' + req.file.filename;
        TransactionProof.create({
            image_path: imagePath,
            customer_name: customer_name ? customer_name.trim() : '',
            amount: parseInt(amount) || 0,
            transaction_date: transaction_date || null,
            is_visible: is_visible ? 1 : 0,
            sort_order: parseInt(sort_order) || 0
        });

        req.flash('success', 'Thêm bằng chứng giao dịch thành công!');
        res.redirect('/admin/transaction-proofs');
    } catch (err) {
        console.error('Lỗi thêm bằng chứng:', err);
        req.flash('error', 'Có lỗi xảy ra khi thêm bằng chứng.');
        res.redirect('/admin/transaction-proofs/new');
    }
});

// GET /admin/transaction-proofs/:id/edit - Form sửa bằng chứng
router.get('/:id/edit', isAuthenticated, (req, res) => {
    const proof = TransactionProof.findById(req.params.id);
    if (!proof) {
        req.flash('error', 'Không tìm thấy bằng chứng.');
        return res.redirect('/admin/transaction-proofs');
    }
    res.render('admin/transaction-proofs/form', { title: 'Sửa bằng chứng giao dịch', proof });
});

// POST /admin/transaction-proofs/:id - Xử lý cập nhật bằng chứng
router.post('/:id', isAuthenticated, upload.single('image'), (req, res) => {
    const { customer_name, amount, transaction_date, is_visible, sort_order, existing_image } = req.body;

    try {
        // Nếu upload ảnh mới thì dùng ảnh mới, không thì giữ ảnh cũ
        let imagePath = existing_image || '';
        if (req.file) {
            imagePath = '/uploads/transaction-proofs/' + req.file.filename;
            // Xóa ảnh cũ nếu có
            if (existing_image) {
                const oldPath = path.join(__dirname, '..', existing_image);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        TransactionProof.update(req.params.id, {
            image_path: imagePath,
            customer_name: customer_name ? customer_name.trim() : '',
            amount: parseInt(amount) || 0,
            transaction_date: transaction_date || null,
            is_visible: is_visible ? 1 : 0,
            sort_order: parseInt(sort_order) || 0
        });

        req.flash('success', 'Cập nhật bằng chứng giao dịch thành công!');
        res.redirect('/admin/transaction-proofs');
    } catch (err) {
        console.error('Lỗi cập nhật bằng chứng:', err);
        req.flash('error', 'Có lỗi xảy ra khi cập nhật bằng chứng.');
        res.redirect(`/admin/transaction-proofs/${req.params.id}/edit`);
    }
});

// POST /admin/transaction-proofs/:id/delete - Xóa bằng chứng (kèm xóa ảnh)
router.post('/:id/delete', isAuthenticated, (req, res) => {
    try {
        const proof = TransactionProof.findById(req.params.id);
        if (proof && proof.image_path) {
            const imgPath = path.join(__dirname, '..', proof.image_path);
            if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
        }
        TransactionProof.delete(req.params.id);
        req.flash('success', 'Đã xóa bằng chứng giao dịch.');
        res.redirect('/admin/transaction-proofs');
    } catch (err) {
        console.error('Lỗi xóa bằng chứng:', err);
        req.flash('error', 'Có lỗi xảy ra khi xóa bằng chứng.');
        res.redirect('/admin/transaction-proofs');
    }
});

module.exports = router;
