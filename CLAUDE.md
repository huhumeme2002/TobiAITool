# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an AI product store application - a Vietnamese e-commerce platform for selling AI development tools (Cursor Pro, Augment Code, Claude, etc.). It consists of a public landing page and an admin dashboard for managing products, orders, and financial reports.

**Tech Stack:**
- Backend: Node.js + Express.js
- Database: SQLite (better-sqlite3) with WAL mode
- View Engine: EJS templates
- Session: express-session with connect-flash for messages
- File Upload: multer (for product images)
- Security: helmet, bcryptjs for password hashing

## Development Commands

```bash
# Install dependencies
npm install

# Initialize database with sample data (run once)
npm run seed

# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

**Default credentials:** admin / admin123

**Access URLs:**
- Landing Page: http://localhost:3000
- Admin Panel: http://localhost:3000/admin

## Architecture

### Database Schema

The application uses SQLite with 6 main tables:

1. **users** - Admin accounts (bcrypt hashed passwords)
2. **products** - AI product catalog with pricing, cost, and visibility flags
3. **product_packages** - Time-based pricing tiers for products (1 day, 7 days, 1 month, etc.)
4. **orders** - Sales records with customer info, pricing (listed_price, actual_price, cost, profit)
5. **settings** - Key-value store for site configuration (brand name, contact info, Zalo link, etc.)
6. **transaction_proofs** - Uploaded payment screenshots/bills for orders

**Key relationships:**
- Products have multiple packages (1:N via product_id foreign key)
- Orders reference products but store denormalized product_name for historical accuracy
- Foreign keys are enabled with CASCADE delete for product_packages

### Application Structure

```
app.js                    # Main entry point, middleware setup, route registration
config/
  database.js             # SQLite connection with WAL mode
  seed.js                 # Database initialization script
models/                   # Data access layer (no ORM, uses better-sqlite3 prepared statements)
  User.js
  Product.js
  ProductPackage.js
  Order.js
  Setting.js
  TransactionProof.js
routes/                   # Express route handlers
  landing.js              # Public homepage
  auth.js                 # Login/logout
  dashboard.js            # Admin overview with charts
  products.js             # Product CRUD + image upload
  orders.js               # Order management + filtering
  reports.js              # Financial reports + CSV/Excel export
  settings.js             # Site configuration
  transactionProofs.js    # Transaction proof/bill upload management
middleware/
  auth.js                 # isAuthenticated, isNotAuthenticated guards
helpers/
  format.js               # Number/date formatting utilities
views/                    # EJS templates
  landing/index.ejs       # Public product catalog
  admin/                  # Admin panel views
  partials/               # Reusable components (sidebar, flash messages)
public/                   # Static assets (CSS)
uploads/products/         # Product images (created by multer)
uploads/transaction-proofs/ # Uploaded payment screenshots
data/                     # SQLite database file location
```

### Key Patterns

**Model Layer:**
- All models use synchronous better-sqlite3 API (no async/await needed)
- Prepared statements for SQL injection protection
- Transactions for multi-step operations (e.g., ProductPackage.saveAll)
- Models return raw objects, not class instances

**Route Layer:**
- All admin routes protected with `isAuthenticated` middleware
- Flash messages for user feedback (success/error)
- Form validation happens in route handlers
- AJAX endpoints return JSON (e.g., `/api/product/:id`, `/update-order`)

**Product-Package Relationship:**
- Products can have 0 or more packages (time-based pricing tiers)
- When displaying products, use `Product.getVisibleWithPackages()` or `Product.getAllWithPackages()`
- Packages are saved in bulk via `ProductPackage.saveAll()` which deletes old packages and inserts new ones in a transaction
- Package data includes: package_name, duration, duration_unit, request_count, price, listed_price, cost, sort_order

**Order Financial Fields:**
- `listed_price`: Original/display price
- `actual_price`: Price customer actually paid (may differ due to discounts)
- `cost`: Cost of goods sold
- `profit`: Calculated as actual_price - cost
- Reports filter by `status = 'paid'` to exclude pending orders from revenue calculations

**Image Upload:**
- Product images stored in `uploads/products/`
- Multer handles upload with file size limit (5MB) and type validation (jpg, png, gif, webp, svg)
- Old images are deleted when updating or deleting products
- Image paths stored as `/uploads/products/filename.ext` in database

**Settings System:**
- Key-value pairs stored in settings table
- Common keys: brand_name, brand_slogan, brand_description, brand_logo, zalo_link, contact_email, contact_phone, facebook_link
- Retrieved via `Setting.getAll()` which returns an object with keys as properties

## Important Notes

- Database file is created at `data/database.sqlite` (configurable via DB_PATH env var)
- Session secret should be changed in production (SESSION_SECRET env var)
- The app uses `trust proxy` setting for secure cookies behind reverse proxies
- CSP is disabled in helmet config to allow inline scripts for Chart.js
- All admin routes require authentication - redirect to `/admin/login` if not authenticated
- Vietnamese language is used throughout the UI and flash messages
- When modifying products, always handle the packages relationship properly using the helper function `savePackagesFromBody()` in products.js
