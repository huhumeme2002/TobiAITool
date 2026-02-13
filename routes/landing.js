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

// GET /huongdan - Trang hướng dẫn sử dụng
router.get('/huongdan', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/guide', {
        title: 'Hướng dẫn sử dụng',
        settings
    });
});

module.exports = router;

