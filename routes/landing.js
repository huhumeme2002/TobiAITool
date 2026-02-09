/**
 * Routes - Landing Page (trang công khai)
 */
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Setting = require('../models/Setting');

// GET / - Trang chủ Landing Page
router.get('/', (req, res) => {
    const products = Product.getVisibleWithPackages();
    const settings = Setting.getAll();
    res.render('landing/index', {
        title: settings.brand_name || 'AI Store',
        products,
        settings
    });
});

module.exports = router;

