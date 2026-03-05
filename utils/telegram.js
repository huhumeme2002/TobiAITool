/**
 * Telegram Notification Helper
 * Gửi thông báo đơn hàng qua Telegram Bot
 */

async function sendTelegramMessage(botToken, chatId, message) {
    if (!botToken || !chatId) return false;

    try {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true
            })
        });

        const result = await response.json();
        if (!result.ok) {
            console.error('❌ Telegram error:', result.description);
            return false;
        }
        return true;
    } catch (err) {
        console.error('❌ Telegram send error:', err.message);
        return false;
    }
}

/**
 * Gửi thông báo đơn hàng thanh toán thành công
 */
function notifyOrderPaid(order, settings) {
    const botToken = settings.telegram_bot_token || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = settings.telegram_chat_id || process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
        console.log('ℹ️ Telegram chưa cấu hình, bỏ qua thông báo');
        return;
    }

    const amount = Number(order.actual_price).toLocaleString('vi-VN');
    const time = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    const message = `🎉 <b>ĐƠN HÀNG MỚI - ĐÃ THANH TOÁN</b>

📋 <b>Mã đơn:</b> <code>${order.order_code}</code>
📦 <b>Sản phẩm:</b> ${order.product_name}
💰 <b>Số tiền:</b> ${amount}đ

👤 <b>Khách hàng:</b> ${order.customer_name}
📱 <b>SĐT:</b> ${order.customer_phone || 'Không có'}
📧 <b>Email:</b> ${order.customer_email || 'Không có'}

⏰ <b>Thời gian:</b> ${time}
💳 <b>Thanh toán qua:</b> Sepay Gateway`;

    sendTelegramMessage(botToken, chatId, message)
        .then(ok => {
            if (ok) console.log(`📲 Đã gửi Telegram thông báo đơn ${order.order_code}`);
        });
}

module.exports = { sendTelegramMessage, notifyOrderPaid };
