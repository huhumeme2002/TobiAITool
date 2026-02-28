/**
 * Model ProductPackage - Quản lý các gói theo thời hạn của sản phẩm
 */
const db = require('../config/database');

const ProductPackage = {
    // Lấy tất cả packages của 1 sản phẩm
    getByProductId(productId) {
        return db.prepare('SELECT * FROM product_packages WHERE product_id = ? ORDER BY sort_order ASC, id ASC').all(productId);
    },

    // Lấy packages của nhiều sản phẩm (trả về object { productId: [packages] })
    getByProductIds(productIds) {
        if (!productIds || productIds.length === 0) return {};
        const placeholders = productIds.map(() => '?').join(',');
        const rows = db.prepare(`SELECT * FROM product_packages WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`).all(...productIds);
        const result = {};
        for (const row of rows) {
            if (!result[row.product_id]) result[row.product_id] = [];
            result[row.product_id].push(row);
        }
        return result;
    },

    // Tìm package theo ID
    findById(id) {
        return db.prepare('SELECT * FROM product_packages WHERE id = ?').get(id);
    },

    // Thêm package mới
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO product_packages (product_id, package_name, duration, duration_unit, request_count, price, listed_price, cost, sort_order)
            VALUES (@product_id, @package_name, @duration, @duration_unit, @request_count, @price, @listed_price, @cost, @sort_order)
        `);
        return stmt.run(data);
    },

    // Cập nhật package
    update(id, data) {
        const stmt = db.prepare(`
            UPDATE product_packages SET
                package_name = @package_name, duration = @duration, duration_unit = @duration_unit,
                request_count = @request_count, price = @price, listed_price = @listed_price,
                cost = @cost, sort_order = @sort_order
            WHERE id = @id
        `);
        return stmt.run({ ...data, id });
    },

    // Xóa package
    delete(id) {
        return db.prepare('DELETE FROM product_packages WHERE id = ?').run(id);
    },

    // Xóa tất cả packages của 1 sản phẩm
    deleteByProductId(productId) {
        return db.prepare('DELETE FROM product_packages WHERE product_id = ?').run(productId);
    },

    // Lấy khoảng giá min-max của 1 sản phẩm
    getPriceRange(productId) {
        return db.prepare('SELECT MIN(price) as min_price, MAX(price) as max_price FROM product_packages WHERE product_id = ?').get(productId);
    },

    // Lưu hàng loạt packages cho 1 sản phẩm (xóa cũ, thêm mới)
    saveAll(productId, packages) {
        const deleteStmt = db.prepare('DELETE FROM product_packages WHERE product_id = ?');
        const insertStmt = db.prepare(`
            INSERT INTO product_packages (product_id, package_name, duration, duration_unit, request_count, price, listed_price, cost, sort_order)
            VALUES (@product_id, @package_name, @duration, @duration_unit, @request_count, @price, @listed_price, @cost, @sort_order)
        `);

        const transaction = db.transaction((productId, pkgs) => {
            deleteStmt.run(productId);
            for (const pkg of pkgs) {
                insertStmt.run({ ...pkg, product_id: productId });
            }
        });

        return transaction(productId, packages);
    }
};

module.exports = ProductPackage;

