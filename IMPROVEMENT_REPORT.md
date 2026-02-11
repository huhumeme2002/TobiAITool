# AI Product Store - Comprehensive Improvement Report
**Generated:** 2026-02-11
**Review Team:** Security, Code Quality, Performance, UX

---

## Executive Summary

The AI product store codebase is **functional but has critical security and performance issues** that need immediate attention. The application works well for small-scale use but has significant vulnerabilities and scalability limitations.

**Overall Assessment:**
- ✅ **Strengths:** Clean architecture, working features, good use of prepared statements
- ⚠️ **Critical Issues:** 8 security vulnerabilities, N+1 queries, missing indexes, no CSRF protection
- 📈 **Scalability:** Limited - in-memory sessions, no caching, inefficient queries

---

## CRITICAL PRIORITY (Fix Immediately)

### 🔴 SECURITY - CRITICAL

#### 1. NO CSRF PROTECTION
**Severity:** CRITICAL
**Files:** All POST routes in routes/*.js
**Impact:** Attackers can forge requests to create/edit/delete data, upload files, change passwords
**Fix:**
```bash
npm install csurf
```
```javascript
// In app.js after session middleware
const csrf = require('csurf');
app.use(csrf());
app.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken();
    next();
});
```
Add to all forms: `<input type="hidden" name="_csrf" value="<%= csrfToken %>">`

#### 2. WEAK SESSION SECRET
**Severity:** CRITICAL
**File:** .env:6
**Current:** `ai-product-store-secret-key-change-me-in-production`
**Impact:** Session hijacking, authentication bypass
**Fix:**
```bash
# Generate secure secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Replace SESSION_SECRET in .env with output
```

#### 3. NO RATE LIMITING ON LOGIN
**Severity:** HIGH
**File:** routes/auth.js:23
**Impact:** Brute force attacks on admin login
**Fix:**
```bash
npm install express-rate-limit
```
```javascript
const rateLimit = require('express-rate-limit');
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts
    message: 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau 15 phút.'
});
router.post('/login', loginLimiter, ...);
```

#### 4. XSS VULNERABILITIES
**Severity:** HIGH
**Files:** All EJS templates
**Examples:**
- views/landing/index.ejs:106 - `<%= product.description %>`
- views/admin/products/form.ejs:52 - Direct rendering
**Impact:** Stored XSS via product names, descriptions, customer names
**Fix:**
```bash
npm install dompurify jsdom
```
Create helpers/sanitize.js:
```javascript
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

module.exports = {
    sanitizeHtml: (dirty) => DOMPurify.sanitize(dirty)
};
```
Use in templates: `<%- sanitizeHtml(product.description) %>`

#### 5. FILE UPLOAD VULNERABILITIES
**Severity:** HIGH
**File:** routes/products.js:27-33
**Issues:**
- Weak MIME validation
- SVG files allowed (XSS risk)
- No file content validation
**Fix:**
```javascript
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/; // Remove SVG
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeOk = /^image\/(jpeg|png|gif|webp)$/.test(file.mimetype);
    if (extOk && mimeOk) return cb(null, true);
    cb(new Error('Chỉ chấp nhận file ảnh (jpg, png, gif, webp)'));
};

// Add file-type package for magic byte validation
npm install file-type
```

### 🔴 PERFORMANCE - CRITICAL

#### 6. MISSING DATABASE INDEXES
**Severity:** HIGH
**Impact:** Full table scans on every report query
**Fix:** Add to config/seed.js after table creation:
```javascript
// Add indexes for performance
db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_sale_date ON orders(sale_date)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_product_id ON orders(product_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_products_visible ON products(is_visible)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_products_sort ON products(sort_order)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_packages_product ON product_packages(product_id)`);
console.log('✅ Đã tạo indexes cho hiệu suất.');
```

#### 7. N+1 QUERY PROBLEM
**Severity:** HIGH
**File:** models/Product.js:18-26, :30-38
**Impact:** Landing page and admin products page make N+1 queries
**Fix:** Already has getByProductIds - just needs optimization:
```javascript
// In Product.js - optimize getVisibleWithPackages
getVisibleWithPackages() {
    const products = this.getVisible();
    if (products.length === 0) return [];
    const ProductPackage = require('./ProductPackage');
    const productIds = products.map(p => p.id);
    const packagesMap = ProductPackage.getByProductIds(productIds); // Single query
    return products.map(p => ({
        ...p,
        packages: packagesMap[p.id] || []
    }));
}
```

#### 8. IN-MEMORY SESSION STORAGE
**Severity:** HIGH (Scalability Blocker)
**File:** app.js:43-52
**Impact:** Cannot scale horizontally, sessions lost on restart
**Fix:**
```bash
npm install connect-redis redis
```
```javascript
const RedisStore = require('connect-redis').default;
const { createClient } = require('redis');

const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, secure: process.env.NODE_ENV === 'production' }
}));
```

---

## HIGH PRIORITY (Fix Soon)

### 🟠 SECURITY

#### 9. SQL Injection Risk in Dynamic Queries
**File:** models/Order.js:40
**Code:** `ORDER BY ${safeSort} ${safeOrder}`
**Fix:** Already has whitelist - just add comment explaining safety

#### 10. Path Traversal in File Deletion
**Files:** routes/products.js:119-120, :157-158, :175-176
**Fix:** Validate paths:
```javascript
const validateImagePath = (imagePath) => {
    const normalized = path.normalize(imagePath);
    return normalized.startsWith('/uploads/products/');
};
// Use before file operations
if (product.image && validateImagePath(product.image)) {
    const imgPath = path.join(__dirname, '..', product.image);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
}
```

#### 11. Content Security Policy Disabled
**File:** app.js:21
**Fix:**
```javascript
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        }
    }
}));
```

#### 12. Session Fixation Risk
**File:** routes/auth.js:46-50
**Fix:**
```javascript
// After successful login
req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.user = { id: user.id, username: user.username, display_name: user.display_name };
    req.flash('success', `Xin chào, ${user.display_name}!`);
    res.redirect('/admin/dashboard');
});
```

### 🟠 CODE QUALITY

#### 13. No Validation Middleware
**Impact:** express-validator installed but never used
**Fix:** Create validators/orderValidator.js:
```javascript
const { body, validationResult } = require('express-validator');

exports.validateOrder = [
    body('customer_name').trim().notEmpty().withMessage('Tên khách hàng là bắt buộc'),
    body('customer_email').optional().isEmail().withMessage('Email không hợp lệ'),
    body('customer_phone').optional().matches(/^[0-9]{10,11}$/).withMessage('Số điện thoại không hợp lệ'),
    body('product_id').isInt().withMessage('Sản phẩm không hợp lệ'),
    body('actual_price').isInt({ min: 0 }).withMessage('Giá bán phải >= 0'),
    body('cost').isInt({ min: 0 }).withMessage('Chi phí phải >= 0'),
    body('sale_date').isDate().withMessage('Ngày bán không hợp lệ'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            req.flash('error', errors.array()[0].msg);
            return res.redirect('back');
        }
        next();
    }
];
```
Use: `router.post('/create', isAuthenticated, validateOrder, ...)`

#### 14. Business Logic in Routes
**Files:** routes/orders.js:51-66, routes/products.js:203-239
**Fix:** Create services/orderService.js:
```javascript
const Order = require('../models/Order');
const Product = require('../models/Product');

exports.createOrder = async (orderData) => {
    const product = Product.findById(orderData.product_id);
    if (!product) throw new Error('Sản phẩm không tồn tại');

    const actualPrice = parseInt(orderData.actual_price);
    const cost = parseInt(orderData.cost);

    return Order.create({
        customer_name: orderData.customer_name.trim(),
        customer_phone: (orderData.customer_phone || '').trim(),
        customer_email: (orderData.customer_email || '').trim(),
        product_id: product.id,
        product_name: product.name,
        listed_price: product.listed_price || product.price,
        actual_price: actualPrice,
        cost: cost,
        profit: actualPrice - cost,
        sale_date: orderData.sale_date,
        status: orderData.status || 'paid',
        notes: (orderData.notes || '').trim()
    });
};
```

#### 15. No Structured Logging
**Fix:**
```bash
npm install winston
```
Create helpers/logger.js:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' })
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({ format: winston.format.simple() }));
}

module.exports = logger;
```

### 🟠 PERFORMANCE

#### 16. No Settings Caching
**File:** models/Setting.js:14-21
**Impact:** Settings queried on every request
**Fix:**
```javascript
let settingsCache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

getAll() {
    const now = Date.now();
    if (settingsCache && (now - cacheTime) < CACHE_TTL) {
        return settingsCache;
    }
    const rows = db.prepare('SELECT key, value FROM settings').all();
    settingsCache = rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
    cacheTime = now;
    return settingsCache;
},

update(key, value) {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)');
    const result = stmt.run(key, value);
    settingsCache = null; // Invalidate cache
    return result;
}
```

#### 17. Synchronous Password Hashing
**File:** models/User.js:20, :25
**Fix:**
```javascript
// Change to async
async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
},

async updatePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return db.prepare('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
        .run(hashedPassword, id);
}
```

---

## MEDIUM PRIORITY (Plan for Next Sprint)

### 🟡 UX & FEATURES

#### 18. No Search on Products Page
**File:** views/admin/products/index.ejs
**Impact:** Hard to find products when list grows
**Fix:** Add search form similar to orders page

#### 19. No User Management
**Impact:** Can't add/edit/delete admin users
**Fix:** Create routes/users.js with CRUD operations

#### 20. No Bulk Operations
**Impact:** Tedious to delete multiple orders/products
**Fix:** Add checkboxes and bulk delete button

#### 21. Poor Mobile Responsiveness
**Files:** views/admin/**/*.ejs
**Impact:** Admin tables overflow on mobile
**Fix:** Add responsive table wrappers with horizontal scroll

#### 22. No Product Detail Page
**File:** views/landing/index.ejs
**Impact:** Users can't see full product info
**Fix:** Add modal or detail page on product click

#### 23. Generic Delete Confirmations
**Impact:** Uses browser confirm() - not modern
**Fix:** Create modal component for confirmations

#### 24. No Loading States
**Impact:** AJAX operations have no visual feedback
**Fix:** Add spinner/loading indicators

#### 25. Export Loads All Data
**File:** routes/reports.js:73 (limit: 99999)
**Impact:** Memory issues with large datasets
**Fix:** Stream CSV generation or paginate

---

## LOW PRIORITY (Nice to Have)

### 🟢 ENHANCEMENTS

#### 26. No Product Performance Reports
**Impact:** Can't see which products sell best
**Fix:** Add report showing sales by product

#### 27. No Customer Analytics
**Impact:** Can't identify repeat customers
**Fix:** Add customer report with purchase history

#### 28. No Backup/Restore
**Impact:** Manual database backups required
**Fix:** Add admin page to download/restore database

#### 29. No Email Notifications
**Impact:** No order confirmation emails
**Fix:** Integrate nodemailer for notifications

#### 30. No Accessibility Features
**Impact:** Keyboard navigation limited
**Fix:** Add ARIA labels, keyboard shortcuts, focus management

---

## IMPLEMENTATION ROADMAP

### Phase 1: Security Hardening (Week 1)
1. Add CSRF protection
2. Change SESSION_SECRET
3. Add rate limiting on login
4. Fix XSS vulnerabilities
5. Improve file upload security

### Phase 2: Performance Optimization (Week 2)
6. Add database indexes
7. Fix N+1 queries
8. Implement settings caching
9. Switch to Redis sessions

### Phase 3: Code Quality (Week 3)
10. Add validation middleware
11. Extract business logic to services
12. Add structured logging
13. Fix error handling consistency

### Phase 4: Feature Enhancements (Week 4+)
14. Add product search
15. Add user management
16. Improve mobile responsiveness
17. Add bulk operations
18. Add product detail page

---

## ESTIMATED EFFORT

| Priority | Tasks | Estimated Time |
|----------|-------|----------------|
| Critical | 8 items | 2-3 days |
| High | 10 items | 3-5 days |
| Medium | 8 items | 5-7 days |
| Low | 5 items | 3-5 days |
| **TOTAL** | **31 items** | **13-20 days** |

---

## CONCLUSION

The AI product store has a solid foundation but requires immediate security and performance fixes before production deployment. The critical issues can be resolved in 2-3 days, making the application production-ready. The remaining improvements will enhance maintainability, scalability, and user experience over time.

**Recommended Action:** Start with Phase 1 (Security Hardening) immediately, then proceed to Phase 2 (Performance Optimization) before considering the application production-ready.
