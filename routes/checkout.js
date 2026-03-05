/**
 * Routes - Checkout (thanh toán online qua Sepay Payment Gateway)
 */
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Product = require('../models/Product');
const ProductPackage = require('../models/ProductPackage');
const Order = require('../models/Order');
const Setting = require('../models/Setting');

// Lấy config Sepay Gateway
function getSepayConfig() {
    const settings = Setting.getAll();
    return {
        merchantId: settings.sepay_merchant_id || process.env.SEPAY_MERCHANT_ID || '',
        secretKey: settings.sepay_secret_key || process.env.SEPAY_SECRET_KEY || '',
        environment: process.env.SEPAY_ENV || 'sandbox' // 'sandbox' hoặc 'production'
    };
}

function getCheckoutUrl(env) {
    return env === 'production'
        ? 'https://pay.sepay.vn/v1/checkout/init'
        : 'https://pay-sandbox.sepay.vn/v1/checkout/init';
}

// Tạo chữ ký HMAC-SHA256 theo format Sepay
function createSignature(params, secretKey) {
    const signedString = [
        `merchant=${params.merchant}`,
        `operation=${params.operation}`,
        `payment_method=${params.payment_method}`,
        `order_amount=${params.order_amount}`,
        `currency=${params.currency}`,
        `order_invoice_number=${params.order_invoice_number}`,
        `order_description=${params.order_description}`,
        `customer_id=${params.customer_id}`,
        `success_url=${params.success_url}`,
        `error_url=${params.error_url}`,
        `cancel_url=${params.cancel_url}`
    ].join(',');

    return Buffer.from(
        crypto.createHmac('sha256', secretKey).update(signedString).digest()
    ).toString('base64');
}

// GET /checkout/:productId - Trang thanh toán
router.get('/:productId', (req, res) => {
    // Bỏ qua nếu là "status" hoặc "success" hoặc "error" hoặc "cancel"
    if (['status', 'success', 'error', 'cancel'].includes(req.params.productId)) {
        return require('express').Router().handle(req, res);
    }

    const product = Product.findByIdWithPackages(req.params.productId);
    if (!product) {
        return res.status(404).render('errors/404', { title: 'Không tìm thấy sản phẩm' });
    }

    const settings = Setting.getAll();
    const selectedPackageId = req.query.package ? parseInt(req.query.package) : null;

    res.render('landing/checkout', {
        title: `Thanh toán - ${product.name}`,
        product,
        settings,
        selectedPackageId
    });
});

// POST /checkout/create-order - Tạo đơn hàng và redirect tới Sepay
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

        // Tạo Sepay Payment Gateway form
        const sepayConfig = getSepayConfig();
        const baseUrl = `${req.protocol}://${req.get('host')}`;

        const formParams = {
            merchant: sepayConfig.merchantId,
            operation: 'PURCHASE',
            payment_method: 'BANK_TRANSFER',
            order_amount: price,
            currency: 'VND',
            order_invoice_number: orderCode,
            order_description: orderData.product_name,
            customer_id: (customer_phone || customer_name).trim(),
            success_url: `${baseUrl}/checkout/success/${orderCode}`,
            error_url: `${baseUrl}/checkout/error/${orderCode}`,
            cancel_url: `${baseUrl}/checkout/cancel/${orderCode}`
        };

        const signature = createSignature(formParams, sepayConfig.secretKey);
        const checkoutUrl = getCheckoutUrl(sepayConfig.environment);

        console.log(`🛒 Đơn hàng ${orderCode} - ${price}đ → Sepay Gateway`);

        res.json({
            success: true,
            order: {
                orderCode,
                amount: price,
                productName: orderData.product_name
            },
            // Trả về form data để client auto-submit
            sepayForm: {
                action: checkoutUrl,
                fields: {
                    ...formParams,
                    signature: signature
                }
            }
        });
    } catch (err) {
        console.error('❌ Lỗi tạo đơn hàng checkout:', err);
        res.status(500).json({ success: false, message: 'Có lỗi xảy ra khi tạo đơn hàng' });
    }
});

// GET /checkout/success/:orderCode - Thanh toán thành công
router.get('/success/:orderCode', (req, res) => {
    const order = Order.findByOrderCode(req.params.orderCode);
    if (!order) {
        return res.redirect('/');
    }

    // Cập nhật trạng thái paid nếu chưa (Sepay redirect trước khi IPN)
    if (order.status === 'pending') {
        Order.updatePaymentStatus(order.id, 'paid');
    }

    const settings = Setting.getAll();
    res.render('landing/checkout-success', {
        title: 'Thanh toán thành công',
        order,
        settings
    });
});

// GET /checkout/error/:orderCode - Thanh toán lỗi
router.get('/error/:orderCode', (req, res) => {
    const settings = Setting.getAll();
    res.render('landing/checkout-error', {
        title: 'Lỗi thanh toán',
        orderCode: req.params.orderCode,
        settings
    });
});

// GET /checkout/cancel/:orderCode - Hủy thanh toán
router.get('/cancel/:orderCode', (req, res) => {
    res.redirect('/');
});

// GET /checkout/status/:orderCode - Kiểm tra trạng thái (vẫn giữ cho polling)
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
