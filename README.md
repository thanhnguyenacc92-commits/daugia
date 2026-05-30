# ⚡ AuctionHunter JP

PWA tự động tìm deal hời trên [Yahoo Auction Japan](https://auctions.yahoo.co.jp/).

## ✨ Tính năng

- 🔍 **Tìm kiếm** theo từ khoá, tình trạng, danh mục, giá bid tối đa
- 👁 **Theo dõi** nhiều job tìm kiếm khác nhau
- ⏰ **Auto Scan** mỗi 15-60 phút, tự động phát hiện deal hời
- 📧 **Thông báo Gmail** khi tìm thấy deal (qua EmailJS)
- 🔔 **Push Notification** trên trình duyệt
- 📱 **PWA** - cài được trên điện thoại, tablet, PC
- 🌐 **Offline** - hoạt động không cần mạng (cache)

## 🚀 Deploy lên GitHub Pages (5 phút)

```bash
git init
git add .
git commit -m "Initial AuctionHunter JP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/auction-hunter-jp.git
git push -u origin main
```

Vào **Settings → Pages → Source: Deploy from branch (main)**

URL của bạn: `https://YOUR_USERNAME.github.io/auction-hunter-jp`

## ⚙️ Cài đặt đầy đủ

### Bước 1: Deploy Cloudflare Worker (proxy)

Worker giúp bypass CORS để crawl Yahoo Auction thực.

```bash
# Cài Wrangler CLI
npm install -g wrangler

# Login Cloudflare
wrangler login

# Deploy
cd worker/
wrangler deploy
```

Copy URL của worker (ví dụ: `https://auctionhunter-jp.your-name.workers.dev`) → Dán vào **Cài đặt → Proxy API URL**.

**Tuỳ chọn: Thêm Yahoo App ID vào Worker**
```bash
wrangler secret put YAHOO_APP_ID
# Nhập App ID khi được hỏi
```

### Bước 2: Yahoo Japan App ID (tuỳ chọn nhưng nên có)

1. Vào https://developer.yahoo.co.jp/start/
2. Đăng ký tài khoản Yahoo Japan
3. Tạo ứng dụng mới → Lấy **App ID**
4. Dán vào **Cài đặt → Yahoo Japan App ID**

*Không có App ID vẫn hoạt động nhưng dùng scraping (chậm hơn)*

### Bước 3: Cài đặt EmailJS (thông báo Gmail)

1. Vào https://www.emailjs.com/ → Đăng ký miễn phí
2. **Add Service** → Chọn Gmail → Kết nối Gmail của bạn
3. **Email Templates** → Tạo template với nội dung:

```
Subject: {{title}}

Tìm thấy {{title}}

Giá: {{price}}
Từ khoá: {{keyword}}

Sản phẩm:
{{items}}

Xem tại: {{url}}
```

4. Lấy **Service ID**, **Template ID**, **Public Key** → Dán vào **Cài đặt**

### Bước 4: Cài PWA trên thiết bị

**Android (Chrome):**
- Mở URL → Menu (⋮) → "Add to Home screen"

**iOS (Safari):**
- Mở URL → Share (□↑) → "Add to Home Screen"

**PC (Chrome/Edge):**
- Mở URL → Address bar → Icon cài đặt → "Install"

## 📁 Cấu trúc project

```
auction-hunter-jp/
├── index.html          # App chính
├── sw.js               # Service Worker (offline + push)
├── manifest.json       # PWA manifest
├── src/
│   ├── style.css       # Styles
│   └── app.js          # Logic chính
├── worker/
│   ├── index.js        # Cloudflare Worker (proxy)
│   └── wrangler.toml   # Worker config
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 🔧 Chạy local

```bash
# Không cần build! Chỉ cần serve static files
npx serve .
# hoặc
python3 -m http.server 8080
```

Mở http://localhost:8080

## 📊 Giới hạn & lưu ý

| Thứ | Giới hạn |
|-----|----------|
| EmailJS free | 200 email/tháng |
| Cloudflare Workers free | 100,000 requests/ngày |
| Yahoo API free | 50,000 requests/ngày |
| Auto scan tối thiểu | 15 phút/lần |

## 🛡️ Privacy

- Tất cả dữ liệu lưu trong **localStorage** của trình duyệt
- Không có server backend (ngoài Cloudflare Worker)
- Không thu thập thông tin người dùng

## 📄 License

MIT
