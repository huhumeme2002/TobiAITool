/**
 * Model Product - Quản lý sản phẩm/gói AI
 */
const db = require('../config/database');

const Product = {
    // Lấy tất cả sản phẩm (admin)
    getAll() {
        return db.prepare('SELECT * FROM products ORDER BY sort_order ASC, id ASC').all();
    },

    // Lấy sản phẩm hiển thị (landing page) kèm packages
    getVisible() {
        return db.prepare('SELECT * FROM products WHERE is_visible = 1 ORDER BY sort_order ASC, id ASC').all();
    },

    // Lấy sản phẩm hiển thị kèm packages
    getVisibleWithPackages() {
        const products = this.getVisible();
        const ProductPackage = require('./ProductPackage');
        const productIds = products.map(p => p.id);
        const packagesMap = ProductPackage.getByProductIds(productIds);
        return products.map(p => ({
            ...p,
            packages: packagesMap[p.id] || []
        }));
    },

    // Lấy tất cả sản phẩm kèm packages (admin)
    getAllWithPackages() {
        const products = this.getAll();
        const ProductPackage = require('./ProductPackage');
        const productIds = products.map(p => p.id);
        const packagesMap = ProductPackage.getByProductIds(productIds);
        return products.map(p => ({
            ...p,
            packages: packagesMap[p.id] || []
        }));
    },

    // Tìm sản phẩm theo ID
    findById(id) {
        return db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    },

    // Tìm sản phẩm theo ID kèm packages
    findByIdWithPackages(id) {
        const product = this.findById(id);
        if (!product) return null;
        const ProductPackage = require('./ProductPackage');
        product.packages = ProductPackage.getByProductId(id);
        return product;
    },

    // Thêm sản phẩm mới
    create(data) {
        const stmt = db.prepare(`
            INSERT INTO products (name, price, listed_price, cost, requests, duration, duration_unit, description, image, features, is_visible, is_featured, sort_order)
            VALUES (@name, @price, @listed_price, @cost, @requests, @duration, @duration_unit, @description, @image, @features, @is_visible, @is_featured, @sort_order)
        `);
        return stmt.run(data);
    },

    // Cập nhật sản phẩm
    update(id, data) {
        const stmt = db.prepare(`
            UPDATE products SET
                name = @name, price = @price, listed_price = @listed_price, cost = @cost,
                requests = @requests, duration = @duration, duration_unit = @duration_unit,
                description = @description, image = @image, features = @features,
                is_visible = @is_visible, is_featured = @is_featured,
                sort_order = @sort_order, updated_at = CURRENT_TIMESTAMP
            WHERE id = @id
        `);
        return stmt.run({ ...data, id });
    },

    // Xóa sản phẩm (kèm xóa packages)
    delete(id) {
        const ProductPackage = require('./ProductPackage');
        ProductPackage.deleteByProductId(id);
        return db.prepare('DELETE FROM products WHERE id = ?').run(id);
    },

    // Đếm tổng sản phẩm
    count() {
        return db.prepare('SELECT COUNT(*) as total FROM products').get().total;
    }
};

module.exports = Product;

