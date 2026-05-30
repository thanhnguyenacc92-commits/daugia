/**
 * BookBid Tracker — Backend Scraper
 * Quét Buyee.jp và gửi thông báo Gmail
 *
 * Cài đặt: npm install
 * Chạy:    node scraper.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ============================================================
// CONFIG — Chỉnh sửa file config.json hoặc biến môi trường
// ============================================================
let config = {
  // Tìm kiếm
  keyword: 'kindle kobo 電子書籍',        // Từ khoá
  maxBidPrice: 5000,                       // Giá bid tối đa (¥ JPY)
  minBidPrice: 0,                          // Giá tối thiểu
  conditions: [],                          // [] = tất cả, hoặc ['new', 'like_new']

  // Tần suất quét (phút)
  scanIntervalMin: 15,
  scanIntervalMax: 30,

  // Email Gmail
  gmail: {
    user: process.env.GMAIL_USER || '',    // your@gmail.com
    pass: process.env.GMAIL_APP_PASS || '', // App password (không phải mật khẩu Gmail)
    to: process.env.NOTIFY_EMAIL || '',    // Email nhận thông báo
  },

  // Output
  dataFile: './data/products.json',
  logFile: './data/scan.log',
};

// Load từ file nếu có
const configFile = path.join(__dirname, 'config.json');
if (fs.existsSync(configFile)) {
  try {
    const userConfig = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    config = { ...config, ...userConfig, gmail: { ...config.gmail, ...userConfig.gmail } };
    console.log('✅ Đã load config từ config.json');
  } catch (e) {
    console.warn('⚠️  Không đọc được config.json:', e.message);
  }
}

// Tạo thư mục data nếu chưa có
if (!fs.existsSync('./data')) fs.mkdirSync('./data');

// ============================================================
// SCRAPER
// ============================================================
const BUYEE_BASE = 'https://buyee.jp';
const SEARCH_URL = `${BUYEE_BASE}/jdirectitems/auction`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ja-JP,ja;q=0.9,en;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
};

async function scrapeBuyee(keyword, page = 1) {
  const params = new URLSearchParams({
    keyword: keyword,
    translationType: 'jp',
    page: page,
  });

  const url = `${SEARCH_URL}?${params}`;
  log(`🔍 Quét: ${url}`);

  try {
    const response = await axios.get(url, {
      headers: HEADERS,
      timeout: 30000,
    });

    const $ = cheerio.load(response.data);
    const products = [];

    // Parse sản phẩm từ kết quả tìm kiếm Buyee
    // Buyee dùng nhiều class/structure khác nhau — đây là các selector phổ biến
    const selectors = [
      '.itemCard',
      '.g-item-thumb',
      '[class*="item-card"]',
      '[data-testid="item"]',
    ];

    let itemsFound = false;

    for (const sel of selectors) {
      const items = $(sel);
      if (items.length > 0) {
        itemsFound = true;
        items.each((i, el) => {
          try {
            const $el = $(el);

            const title = $el.find('[class*="title"], [class*="name"], h3, h4').first().text().trim()
              || $el.find('a').attr('title') || '';

            const priceText = $el.find('[class*="price"], [class*="bid"], .price').first().text()
              .replace(/[^0-9,]/g, '').replace(/,/g, '') || '0';
            const price = parseInt(priceText) || 0;

            const link = $el.find('a').first().attr('href') || '';
            const fullLink = link.startsWith('http') ? link : BUYEE_BASE + link;

            const img = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';

            const bidsText = $el.find('[class*="bid"]').text().match(/(\d+)/)?.[1] || '0';

            const timeText = $el.find('[class*="time"], [class*="end"]').first().text().trim() || '';

            if (title && price > 0) {
              products.push({
                id: `jd_${Buffer.from(fullLink).toString('base64').slice(0, 12)}`,
                title,
                currentBid: price,
                url: fullLink,
                image: img,
                bids: parseInt(bidsText) || 0,
                timeLeft: timeText,
                scrapedAt: new Date().toISOString(),
                source: 'buyee',
              });
            }
          } catch (e) {
            // Skip malformed items
          }
        });
        break;
      }
    }

    if (!itemsFound) {
      log('⚠️  Không parse được items — Buyee có thể đã thay đổi HTML structure');
      log('    Đang thử parse thủ công...');

      // Fallback: tìm bất kỳ link nào chứa /item/
      $('a[href*="/item/"]').each((i, el) => {
        if (i > 30) return false; // limit
        const $el = $(el);
        const title = $el.attr('title') || $el.text().trim();
        const href = $el.attr('href') || '';
        const fullLink = href.startsWith('http') ? href : BUYEE_BASE + href;
        if (title && title.length > 5) {
          products.push({
            id: `jd_${Buffer.from(fullLink).toString('base64').slice(0, 12)}`,
            title,
            currentBid: 0,
            url: fullLink,
            image: '',
            bids: 0,
            timeLeft: '',
            scrapedAt: new Date().toISOString(),
            source: 'buyee_fallback',
          });
        }
      });
    }

    log(`   → Tìm thấy ${products.length} sản phẩm trên trang ${page}`);
    return products;

  } catch (error) {
    log(`❌ Lỗi khi quét: ${error.message}`);
    if (error.response) {
      log(`   Status: ${error.response.status}`);
      if (error.response.status === 403) {
        log('   Buyee chặn bot. Thử dùng proxy hoặc giảm tần suất quét.');
      }
    }
    return [];
  }
}

// ============================================================
// FILTER
// ============================================================
function filterProducts(products) {
  return products.filter(p => {
    if (config.maxBidPrice > 0 && p.currentBid > config.maxBidPrice) return false;
    if (config.minBidPrice > 0 && p.currentBid < config.minBidPrice) return false;
    return true;
  }).map(p => ({
    ...p,
    isDeal: config.maxBidPrice > 0 && p.currentBid < config.maxBidPrice * 0.7,
  }));
}

// ============================================================
// EMAIL
// ============================================================
async function sendEmail(deals) {
  if (!config.gmail.user || !config.gmail.pass || !config.gmail.to) {
    log('⚠️  Email chưa cấu hình. Xem README để thiết lập Gmail.');
    return;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.gmail.user,
      pass: config.gmail.pass,  // Gmail App Password
    },
  });

  const dealsHtml = deals.map(d => `
    <tr style="border-bottom:1px solid #eee">
      <td style="padding:12px 8px">
        <a href="${d.url}" style="color:#c8420a;font-weight:600;text-decoration:none">${d.title}</a>
      </td>
      <td style="padding:12px 8px;font-weight:700;color:#c8420a;font-size:1.1em">
        ¥${d.currentBid.toLocaleString()}
      </td>
      <td style="padding:12px 8px">
        <a href="${d.url}" style="background:#c8420a;color:white;padding:6px 14px;border-radius:6px;text-decoration:none;font-size:0.85em">Bid ngay →</a>
      </td>
    </tr>
  `).join('');

  const html = `
    <div style="font-family:'DM Sans',Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f0e8">
      <div style="background:#0e0e10;color:#f5f0e8;padding:20px 24px;border-radius:12px 12px 0 0">
        <h1 style="font-size:1.4rem;margin:0">📖 BookBid — Deal hời tìm thấy!</h1>
        <p style="margin:8px 0 0;opacity:0.7;font-size:0.85rem">${new Date().toLocaleString('vi-VN')}</p>
      </div>
      <div style="padding:20px 24px;background:white">
        <p style="color:#555;margin-top:0">Hệ thống tìm thấy <strong style="color:#c8420a">${deals.length} deal hời</strong> trên Buyee phù hợp với tiêu chí của bạn:</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f5f0e8">
              <th style="padding:10px 8px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#7a7065">Sản phẩm</th>
              <th style="padding:10px 8px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#7a7065">Giá bid</th>
              <th style="padding:10px 8px;text-align:left;font-size:0.75rem;text-transform:uppercase;color:#7a7065">Hành động</th>
            </tr>
          </thead>
          <tbody>${dealsHtml}</tbody>
        </table>
        <div style="margin-top:20px;padding:12px 16px;background:#fff5f0;border-left:4px solid #c8420a;border-radius:4px;font-size:0.85rem;color:#555">
          💡 Ngưỡng bid tối đa của bạn: <strong>¥${config.maxBidPrice.toLocaleString()}</strong>
        </div>
      </div>
      <div style="padding:16px 24px;background:#f5f0e8;text-align:center;font-size:0.75rem;color:#7a7065;border-radius:0 0 12px 12px">
        BookBid Tracker • Quét tự động mỗi ${config.scanIntervalMin}–${config.scanIntervalMax} phút
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"📖 BookBid Tracker" <${config.gmail.user}>`,
      to: config.gmail.to,
      subject: `🔥 [BookBid] ${deals.length} deal hời máy đọc sách mới!`,
      html,
    });
    log(`✅ Đã gửi email đến ${config.gmail.to}`);
  } catch (e) {
    log(`❌ Lỗi gửi email: ${e.message}`);
  }
}

// ============================================================
// DATA PERSISTENCE
// ============================================================
function saveProducts(products) {
  const data = {
    updatedAt: new Date().toISOString(),
    config: {
      keyword: config.keyword,
      maxBidPrice: config.maxBidPrice,
      scanInterval: `${config.scanIntervalMin}–${config.scanIntervalMax} phút`,
    },
    products,
  };
  fs.writeFileSync(config.dataFile, JSON.stringify(data, null, 2), 'utf8');
}

function loadPreviousProducts() {
  if (!fs.existsSync(config.dataFile)) return [];
  try {
    return JSON.parse(fs.readFileSync(config.dataFile, 'utf8')).products || [];
  } catch {
    return [];
  }
}

// ============================================================
// LOGGING
// ============================================================
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(config.logFile, line + '\n', 'utf8');
}

// ============================================================
// MAIN SCAN LOOP
// ============================================================
async function runScan() {
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log('🚀 Bắt đầu quét Buyee...');

  const keywords = config.keyword.split(' ').filter(Boolean);
  let allProducts = [];

  for (const kw of keywords) {
    const found = await scrapeBuyee(kw);
    allProducts = allProducts.concat(found);
    // Delay giữa các request để tránh bị block
    await sleep(2000 + Math.random() * 3000);
  }

  // Deduplicate
  const seen = new Set();
  allProducts = allProducts.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  log(`📊 Tổng: ${allProducts.length} sản phẩm, sau lọc giá...`);
  const filtered = filterProducts(allProducts);
  const deals = filtered.filter(p => p.isDeal);

  log(`   → ${filtered.length} phù hợp, ${deals.length} deal hời`);

  // So sánh với lần quét trước để tìm deals MỚI
  const prevProducts = loadPreviousProducts();
  const prevIds = new Set(prevProducts.map(p => p.id));
  const newDeals = deals.filter(p => !prevIds.has(p.id));

  if (newDeals.length > 0) {
    log(`🔥 ${newDeals.length} deal MỚI tìm thấy!`);
    await sendEmail(newDeals);
  } else if (deals.length > 0) {
    log(`ℹ️  ${deals.length} deals (không có mới)`);
  }

  saveProducts(filtered);
  log('✅ Quét hoàn tất');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInterval() {
  const { scanIntervalMin, scanIntervalMax } = config;
  const mins = scanIntervalMin + Math.random() * (scanIntervalMax - scanIntervalMin);
  return Math.floor(mins * 60 * 1000);
}

async function startLoop() {
  log('📖 BookBid Tracker đã khởi động');
  log(`   Từ khoá: ${config.keyword}`);
  log(`   Giá tối đa: ¥${config.maxBidPrice.toLocaleString()}`);
  log(`   Email: ${config.gmail.to || '(chưa cấu hình)'}`);
  log(`   Quét mỗi: ${config.scanIntervalMin}–${config.scanIntervalMax} phút`);

  // Quét ngay lần đầu
  await runScan();

  // Lặp theo interval ngẫu nhiên
  const scheduleNext = async () => {
    const interval = randomInterval();
    log(`⏱  Quét tiếp theo sau ${Math.floor(interval / 60000)} phút`);
    setTimeout(async () => {
      await runScan();
      scheduleNext();
    }, interval);
  };

  scheduleNext();
}

// Start
startLoop().catch(e => {
  log(`💥 Lỗi nghiêm trọng: ${e.message}`);
  process.exit(1);
});
