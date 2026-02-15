/**
 * Routes - Landing Page (trang công khai)
 */
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const TransactionProof = require('../models/TransactionProof');

// GET / - Trang chủ Landing Page
router.get('/', (req, res) => {
    const products = Product.getVisibleWithPackages();
    const settings = Setting.getAll();
    const transactionProofs = TransactionProof.getVisible();
    res.render('landing/index', {
        title: settings.brand_name || 'AI Store',
        products,
        settings,
        transactionProofs
    });
});

// GET /tonghop - Trang tổng hợp hướng dẫn
router.get('/tonghop', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/tonghop', {
        title: 'Tổng hợp hướng dẫn',
        settings
    });
});

// GET /huongdan - Trang hướng dẫn sử dụng
router.get('/huongdan', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/guide', {
        title: 'Hướng dẫn sử dụng',
        settings
    });
});

// GET /huongdan1 - Trang hướng dẫn sử dụng Claude Code Max Plan
router.get('/huongdan1', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/guide1', {
        title: 'Hướng dẫn sử dụng Claude Code Max Plan',
        settings
    });
});

// GET /huongdan2 - Trang hướng dẫn sử dụng Cursor-Unlimited
router.get('/huongdan2', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/guide2', {
        title: 'Hướng dẫn sử dụng Cursor-Unlimited',
        settings
    });
});

module.exports = router;

