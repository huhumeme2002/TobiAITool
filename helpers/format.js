/**
 * Helper format tiền VNĐ
 * Sử dụng trong EJS: formatCurrency(199000) => "199.000"
 */
function formatCurrency(amount) {
    if (!amount && amount !== 0) return '0';
    return Number(amount).toLocaleString('vi-VN');
}

module.exports = { formatCurrency };

