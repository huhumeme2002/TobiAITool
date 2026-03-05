/**
 * Routes - Sepay Webhook
 * Nhận thông báo giao dịch từ Sepay
 */
const express = require('express');
const router = express.Router();
const SepayTransaction = require('../models/SepayTransaction');
const Order = require('../models/Order');
const Setting = require('../models/Setting');

// POST /api/sepay/webhook - Nhận webhook từ Sepay
router.post('/webhook', (req, res) => {
    try {
        // Xác thực API key
        const settings = Setting.getAll();
        const apiKey = settings.sepay_api_key || process.env.SEPAY_API_KEY;

        if (apiKey) {
            const authHeader = req.headers['authorization'];
            const providedKey = authHeader ? authHeader.replace('Apikey ', '').replace('Bearer ', '').trim() : '';
            if (providedKey !== apiKey) {
                console.log('⚠️ Sepay webhook: API key không hợp lệ');
                return res.status(401).json({ success: false, message: 'Unauthorized' });
            }
        }

        const data = req.body;
        console.log('📩 Sepay webhook received:', JSON.stringify(data));

        // Kiểm tra dữ liệu
        if (!data || !data.id) {
            return res.status(200).json({ success: true, message: 'No data to process' });
        }

        // Kiểm tra giao dịch đã xử lý chưa (tránh duplicate)
        const existing = SepayTransaction.findBySepayId(data.id);
        if (existing) {
            console.log('ℹ️ Giao dịch đã tồn tại:', data.id);
            return res.status(200).json({ success: true, message: 'Already processed' });
        }

        // Lưu giao dịch
        const transactionData = {
            sepay_id: data.id || 0,
            gateway: data.gateway || '',
            transaction_date: data.transactionDate || '',
            account_number: data.accountNumber || '',
            transfer_type: data.transferType || '',
            transfer_amount: parseInt(data.transferAmount) || 0,
            accumulated: parseInt(data.accumulated) || 0,
            code: data.code || '',
            content: data.content || data.description || '',
            reference_number: data.referenceCode || data.referenceNumber || '',
            description: data.description || '',
            order_id: null,
            processed: 0
        };

        const result = SepayTransaction.create(transactionData);
        const transactionId = result.lastInsertRowid;

        // Chỉ xử lý giao dịch "tiền vào"
        if (data.transferType === 'in') {
            // Tìm mã đơn hàng trong nội dung chuyển khoản
            const content = (data.content || data.description || '').toUpperCase();

            // Tìm pattern DH... trong nội dung
            const orderCodeMatch = content.match(/DH[A-Z0-9]+/);

            let matched = false;

            if (orderCodeMatch) {
                const orderCode = orderCodeMatch[0];
                const order = Order.findByOrderCode(orderCode);

                if (order && order.status === 'pending') {
                    const amount = parseInt(data.transferAmount) || 0;

                    // Kiểm tra số tiền khớp (cho phép chênh lệch nhỏ)
                    if (amount >= order.actual_price) {
                        Order.updatePaymentStatus(order.id, 'paid');
                        SepayTransaction.markProcessed(transactionId, order.id);
                        matched = true;
                        console.log(`✅ Đã xác nhận thanh toán đơn hàng ${orderCode} - ${amount}đ`);
                    } else {
                        console.log(`⚠️ Đơn ${orderCode}: số tiền không khớp (cần ${order.actual_price}, nhận ${amount})`);
                    }
                }
            }

            // Log nếu không match được
            if (!matched) {
                const amount = parseInt(data.transferAmount) || 0;
                console.log(`ℹ️ Không tìm thấy mã đơn hàng DH... trong nội dung: "${content}" - ${amount}đ`);
            }
        }

        res.status(200).json({ success: true, message: 'Webhook processed' });
    } catch (err) {
        console.error('❌ Lỗi xử lý webhook Sepay:', err);
        // Vẫn trả 200 để Sepay không retry
        res.status(200).json({ success: true, message: 'Error but acknowledged' });
    }
});

module.exports = router;
