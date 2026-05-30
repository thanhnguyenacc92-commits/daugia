# 📖 BookBid Tracker

Theo dõi và tìm deal hời máy đọc sách trên **Buyee.jp** — tự động quét mỗi 15–30 phút, thông báo qua Gmail khi có deal mới.

## Cấu trúc dự án

```
buyee-tracker/
├── frontend/
│   └── index.html          ← Web app (chạy trên GitHub Pages)
├── backend/
│   ├── scraper.js          ← Script quét tự động
│   ├── package.json
│   └── config.example.json ← Mẫu cấu hình
├── .gitignore
└── README.md
```

---

## 🚀 Cài đặt & Chạy

### Bước 1 — Clone & cấu hình

```bash
git clone https://github.com/YOUR_USERNAME/bookbid-tracker.git
cd bookbid-tracker/backend

# Cài Node.js packages
npm install

# Tạo file config từ mẫu
cp config.example.json config.json
```

Sau đó chỉnh sửa `config.json`:

```json
{
  "keyword": "kindle kobo 電子書籍リーダー",
  "maxBidPrice": 5000,
  "scanIntervalMin": 15,
  "scanIntervalMax": 30,
  "gmail": {
    "user": "your@gmail.com",
    "pass": "xxxx xxxx xxxx xxxx",
    "to": "your@gmail.com"
  }
}
```

### Bước 2 — Lấy Gmail App Password

> ⚠️ **QUAN TRỌNG**: Không dùng mật khẩu Gmail thông thường. Phải dùng App Password.

1. Vào **myaccount.google.com** → **Bảo mật**
2. Bật **Xác minh 2 bước** (nếu chưa bật)
3. Tìm **Mật khẩu ứng dụng** → Tạo mới
4. Chọn "Mail" + "Thiết bị khác" → Copy mật khẩu 16 ký tự
5. Dán vào `config.json` trong trường `"pass"`

### Bước 3 — Chạy scraper

```bash
# Chạy một lần
node scraper.js

# Chạy nền (Linux/Mac)
nohup node scraper.js &

# Dùng PM2 để quản lý tiến trình (khuyến nghị)
npm install -g pm2
pm2 start scraper.js --name bookbid
pm2 save
pm2 startup
```

---

## 🌐 Deploy Frontend lên GitHub Pages

### Cách 1 — GitHub Pages (miễn phí, khuyến nghị)

1. Push code lên GitHub
2. Vào **Settings** → **Pages**
3. Source: **Deploy from a branch** → `main` → `/` (root) hoặc `/frontend`
4. URL của bạn: `https://USERNAME.github.io/bookbid-tracker/frontend/`

### Cách 2 — Netlify (kéo thả, cực dễ)

1. Vào [netlify.com](https://netlify.com) → đăng nhập
2. Kéo thả thư mục `frontend/` vào trang
3. URL tự động tạo, ví dụ: `bookbid-tracker.netlify.app`

---

## 🖥 Chạy backend ở đâu?

Scraper cần chạy 24/7 trên **máy tính hoặc server** — không thể chạy trên GitHub Pages.

| Nơi chạy | Chi phí | Khuyến nghị |
|---|---|---|
| Máy tính cá nhân | Miễn phí | ✅ Dễ nhất |
| Raspberry Pi | ~$10 một lần | ✅ Tiết kiệm điện |
| VPS (DigitalOcean, Linode) | ~$4/tháng | ✅ Ổn định nhất |
| Oracle Cloud Free Tier | Miễn phí mãi mãi | ✅ Khuyến nghị |
| Render.com | Miễn phí (có giới hạn) | ⚠️ Sleep sau 15 phút không dùng |

### Cách chạy trên Oracle Cloud (miễn phí mãi)

1. Đăng ký [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)
2. Tạo VM (Ubuntu 22.04, Always Free)
3. SSH vào VM và chạy:

```bash
# Cài Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone & setup
git clone https://github.com/YOUR_USERNAME/bookbid-tracker.git
cd bookbid-tracker/backend
npm install
cp config.example.json config.json
nano config.json   # Điền thông tin vào

# Chạy với PM2
npm install -g pm2
pm2 start scraper.js --name bookbid
pm2 save && pm2 startup
```

---

## 📱 Sử dụng trên nhiều thiết bị

Web app **chạy trên trình duyệt** — chỉ cần mở URL là dùng được:

- 📱 **Điện thoại**: Bookmark URL lên màn hình chính (Add to Home Screen)
- 💻 **PC/Laptop**: Mở trình duyệt bình thường
- 📟 **Tablet**: Responsive, tự động điều chỉnh layout

Dữ liệu watchlist được lưu trong **localStorage** của từng thiết bị.

---

## ⚙️ Các tuỳ chỉnh

### Thêm từ khoá tìm kiếm

Trong `config.json`:
```json
"keyword": "kindle kobo ebook 電子書籍 Paperwhite Libra"
```

Các từ cách nhau bằng dấu cách — mỗi từ sẽ được quét riêng.

### Lọc theo từ khoá tiếng Nhật

Buyee tìm kiếm hiệu quả hơn với tiếng Nhật:

| Loại máy | Từ khoá tiếng Nhật |
|---|---|
| Kindle | キンドル, Kindle, 電子書籍 |
| Kobo | コボ, Kobo |
| Máy đọc sách | 電子書籍リーダー |
| Máy tốt | 美品, 良品 |
| Máy mới | 未使用, 新品 |

---

## 🔧 Khắc phục sự cố

### Lỗi "403 Forbidden" khi quét

Buyee có thể chặn bot. Thử:
- Tăng `scanIntervalMin` lên 30–60 phút
- Dùng proxy (thêm vào `config.json`): `"proxy": "http://proxy:port"`

### Email không gửi được

- Kiểm tra đã bật **2-Step Verification** chưa
- App Password phải là **16 ký tự** (không có dấu cách khi dùng)
- Kiểm tra `config.json`: `"user"` là Gmail gửi, `"to"` là Gmail nhận

### Parser không tìm thấy sản phẩm

Buyee có thể đã thay đổi HTML. Tạo issue trên GitHub hoặc:
1. Mở DevTools trên buyee.jp
2. Tìm class CSS của item cards
3. Cập nhật selectors trong `scraper.js` (dòng ~65)

---

## 📄 License

MIT — Dùng tự do, không bảo hành.
