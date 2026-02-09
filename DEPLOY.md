# 🚀 Hướng dẫn Deploy lên VPS với aaPanel

## Mục lục
1. [Cài đặt aaPanel](#1-cài-đặt-aapanel)
2. [Cài đặt môi trường](#2-cài-đặt-môi-trường)
3. [Upload mã nguồn](#3-upload-mã-nguồn)
4. [Cấu hình Database](#4-cấu-hình-database)
5. [Cấu hình .env](#5-cấu-hình-env)
6. [Chạy ứng dụng với PM2](#6-chạy-ứng-dụng-với-pm2)
7. [Cấu hình Nginx Reverse Proxy](#7-cấu-hình-nginx-reverse-proxy)
8. [Cài đặt SSL](#8-cài-đặt-ssl)

---

## 1. Cài đặt aaPanel

SSH vào VPS và chạy lệnh:

```bash
# CentOS
yum install -y wget && wget -O install.sh http://www.aapanel.com/script/install_6.0_en.sh && bash install.sh aapanel

# Ubuntu/Debian
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh && sudo bash install.sh aapanel
```

Sau khi cài xong, truy cập aaPanel qua URL được hiển thị (VD: `http://IP:8888/xxxxxx`).

---

## 2. Cài đặt môi trường

### Trong aaPanel:
1. Vào **App Store** → Cài đặt **Nginx** (phiên bản mới nhất)
2. Cài đặt **Node.js** qua terminal:

```bash
# Cài Node.js 18 LTS (khuyến nghị)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Kiểm tra
node -v
npm -v
```

3. Cài PM2 (quản lý process Node.js):

```bash
npm install -g pm2
```

---

## 3. Upload mã nguồn

### Cách 1: Qua aaPanel File Manager
1. Vào **Files** trong aaPanel
2. Tạo thư mục: `/www/wwwroot/aistore`
3. Upload toàn bộ file dự án (trừ `node_modules/` và `data/`)

### Cách 2: Qua Git
```bash
cd /www/wwwroot
git clone <your-repo-url> aistore
cd aistore
```

### Cài đặt dependencies:
```bash
cd /www/wwwroot/aistore
npm install --production
```

---

## 4. Cấu hình Database

Dự án sử dụng SQLite nên **không cần cài MySQL**. Database sẽ tự động tạo khi chạy seed:

```bash
cd /www/wwwroot/aistore
npm run seed
```

---

## 5. Cấu hình .env

Tạo/sửa file `.env` trên server:

```bash
nano /www/wwwroot/aistore/.env
```

Nội dung:
```env
PORT=3000
NODE_ENV=production
SESSION_SECRET=thay-bang-chuoi-ngau-nhien-dai-va-phuc-tap
DB_PATH=./data/database.sqlite
```

> ⚠️ **Quan trọng**: Thay `SESSION_SECRET` bằng chuỗi ngẫu nhiên dài (ít nhất 32 ký tự).

---

## 6. Chạy ứng dụng với PM2

```bash
cd /www/wwwroot/aistore

# Khởi động ứng dụng
pm2 start app.js --name "aistore"

# Cấu hình auto-start khi reboot VPS
pm2 startup
pm2 save

# Các lệnh PM2 hữu ích:
pm2 status          # Xem trạng thái
pm2 logs aistore    # Xem log
pm2 restart aistore # Khởi động lại
pm2 stop aistore    # Dừng
pm2 delete aistore  # Xóa
```

---

## 7. Cấu hình Nginx Reverse Proxy

### Trong aaPanel:
1. Vào **Website** → **Add site**
2. Nhập domain: `yourdomain.com`
3. Chọn **PHP Version**: Pure Static
4. Bấm **Submit**

### Cấu hình Reverse Proxy:
1. Click vào site vừa tạo → **Reverse Proxy**
2. Bấm **Add Reverse Proxy**:
   - **Proxy Name**: aistore
   - **Target URL**: `http://127.0.0.1:3000`
   - Bấm **Submit**

### Hoặc sửa trực tiếp Nginx config:
Click vào site → **Config** → Thêm vào trong block `server {}`:

```nginx
location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

---

## 8. Cài đặt SSL (Let's Encrypt miễn phí)

### Trong aaPanel:
1. Click vào site → **SSL**
2. Chọn tab **Let's Encrypt**
3. Nhập email
4. Tick chọn domain
5. Bấm **Apply**
6. Bật **Force HTTPS**

> ✅ SSL sẽ tự động gia hạn bởi aaPanel.

---

## 🔧 Xử lý sự cố

### Ứng dụng không chạy:
```bash
pm2 logs aistore --lines 50  # Xem 50 dòng log gần nhất
```

### Port 3000 bị chiếm:
```bash
lsof -i :3000                # Tìm process đang dùng port
kill -9 <PID>                # Kill process đó
```

### Cập nhật code mới:
```bash
cd /www/wwwroot/aistore
git pull                     # Nếu dùng Git
npm install                  # Cài thêm package mới (nếu có)
pm2 restart aistore          # Khởi động lại
```

### Backup database:
```bash
cp /www/wwwroot/aistore/data/database.sqlite /backup/database-$(date +%Y%m%d).sqlite
```

---

## ✅ Checklist sau khi deploy

- [ ] Truy cập Landing Page: `https://yourdomain.com`
- [ ] Truy cập Admin: `https://yourdomain.com/admin`
- [ ] Đăng nhập admin (admin / admin123)
- [ ] **ĐỔI MẬT KHẨU ADMIN NGAY** trong Cài đặt
- [ ] Cập nhật link Zalo thực tế trong Cài đặt
- [ ] Cập nhật thông tin thương hiệu
- [ ] Test thêm/sửa/xóa sản phẩm
- [ ] Test thêm đơn hàng
- [ ] Test xuất báo cáo CSV/Excel
- [ ] Kiểm tra SSL hoạt động

