/**
 * Routes - Checkout (thanh toán online qua Sepay)
 */
const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const ProductPackage = require('../models/ProductPackage');
const Order = require('../models/Order');
const Setting = require('../models/Setting');

// GET /checkout/:productId - Trang thanh toán
router.get('/:productId', (req, res) => {
    const product = Product.findByIdWithPackages(req.params.productId);
    if (!product) {
        return res.status(404).render('errors/404', { title: 'Không tìm thấy sản phẩm' });
    }

    const settings = Setting.getAll();

    // Lấy thông tin ngân hàng từ settings hoặc env
    const bankInfo = {
        bankName: settings.sepay_bank_name || process.env.SEPAY_BANK_NAME || '',
        bankCode: settings.sepay_bank_code || process.env.SEPAY_BANK_CODE || '',
        accountNumber: settings.sepay_account_number || process.env.SEPAY_ACCOUNT_NUMBER || '',
        accountName: settings.sepay_account_name || process.env.SEPAY_ACCOUNT_NAME || ''
    };

    // Chọn gói từ query string (nếu có)
    const selectedPackageId = req.query.package ? parseInt(req.query.package) : null;

    res.render('landing/checkout', {
        title: `Thanh toán - ${product.name}`,
        product,
        bankInfo,
        settings,
        selectedPackageId
    });
});

// POST /checkout/create-order - Tạo đơn hàng
router.post('/create-order', (req, res) => {
    try {
        const { product_id, package_id, customer_name, customer_phone, customer_email } = req.body;

        if (!product_id || !customer_name) {
            return res.status(400).json({ success: false, message: 'Thiếu thông tin bắt buộc' });
        }

        const product = Product.findById(product_id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại' });
        }

        let price = product.price;
        let listedPrice = product.listed_price || product.price;
        let cost = product.cost || 0;
        let packageName = '';

        // Nếu chọn gói cụ thể
        if (package_id) {
            const pkg = ProductPackage.findById(package_id);
            if (pkg && pkg.product_id === parseInt(product_id)) {
                price = pkg.price;
                listedPrice = pkg.listed_price || pkg.price;
                cost = pkg.cost || 0;
                packageName = pkg.package_name || '';
            }
        }

        // Sinh mã đơn hàng
        const orderCode = Order.generateOrderCode();

        const orderData = {
            customer_name: customer_name.trim(),
            customer_phone: (customer_phone || '').trim(),
            customer_email: (customer_email || '').trim(),
            product_id: parseInt(product_id),
            product_name: packageName ? `${product.name} - ${packageName}` : product.name,
            listed_price: listedPrice,
            actual_price: price,
            cost: cost,
            profit: price - cost,
            sale_date: new Date().toISOString().split('T')[0],
            status: 'pending',
            notes: `Online checkout${packageName ? ' - Gói: ' + packageName : ''}`,
            order_code: orderCode,
            payment_method: 'sepay'
        };

        Order.createFromCheckout(orderData);

        // Lấy thông tin ngân hàng
        const settings = Setting.getAll();
        const bankInfo = {
            bankName: settings.sepay_bank_name || process.env.SEPAY_BANK_NAME || '',
            bankCode: settings.sepay_bank_code || process.env.SEPAY_BANK_CODE || '',
            accountNumber: settings.sepay_account_number || process.env.SEPAY_ACCOUNT_NUMBER || '',
            accountName: settings.sepay_account_name || process.env.SEPAY_ACCOUNT_NAME || ''
        };

        // Tạo URL QR VietQR
        const qrUrl = `https://img.vietqr.io/image/${bankInfo.bankCode}-${bankInfo.accountNumber}-compact2.png?amount=${price}&addInfo=${encodeURIComponent(orderCode)}&accountName=${encodeURIComponent(bankInfo.accountName)}`;

        res.json({
            success: true,
            order: {
                orderCode,
                amount: price,
                productName: orderData.product_name
            },
            bankInfo,
            qrUrl
        });
    } catch (err) {
        console.error('❌ Lỗi tạo đơn hàng checkout:', err);
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi tạo đơn hàng' });
    }
});

// GET /checkout/status/:orderCode - Kiểm tra trạng thái đơn hàng (polling)
router.get('/status/:orderCode', (req, res) => {
    const order = Order.findByOrderCode(req.params.orderCode);
    if (!order) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    res.json({
        success: true,
        status: order.status,
        orderCode: order.order_code,
        amount: order.actual_price,
        productName: order.product_name
    });
});

module.exports = router;
