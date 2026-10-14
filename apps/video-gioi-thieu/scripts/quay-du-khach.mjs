// Quay màn hình thật của web học tập (phần công khai cho khách) ở khung điện thoại, cho video giới thiệu.
// Chạy: node scripts/quay-du-khach.mjs [--lang vi] [--base http://localhost:8082]
// Ảnh ra: public/man-hinh/du-khach/<ngôn ngữ>/*.png và public/man-hinh/du-khach/danh-sach.json.
//
// Di sản tiêu biểu: "Văn Miếu – Quốc Tử Giám" (id 2, slug van-mieu-quoc-tu-giam): ảnh bìa đẹp, có mô hình 3D
// (Khuê Văn Các) và có dòng thời gian. Thêm hai di sản khác để lịch sử của khách có dữ liệu.
// Chỉ xem: không bấm quảng cáo, không đăng nhập. Lượt xem của khách tự được máy chủ ghi (mã thiết bị ẩn danh).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = arg('base', 'http://localhost:8082').replace(/\/$/, '');
const ALL_LANGS = ['vi', 'en', 'ko', 'zh-Hans', 'ja'];
const langs = arg('lang', '') ? [arg('lang', '')] : ALL_LANGS;
const OUT = join(root, 'public', 'man-hinh', 'du-khach');
const LIST = join(OUT, 'danh-sach.json');

const FEATURED = { id: 2, slug: 'van-mieu-quoc-tu-giam', name: 'Văn Miếu – Quốc Tử Giám' };
const WARMUP = ['khu-trung-tam-hoang-thanh-thang-long-ha-noi', 'do-thi-co-hoi-an'];
const LANG_KEY = 'dsvhvn.hoc-tap.ngon-ngu';
const SCALE = 2.75;
const HANOI = { latitude: 21.0285, longitude: 105.8542 };

// playwright-core: ưu tiên bản trong dự án video, không có thì dùng bản của kho FE.
async function loadPlaywright() {
  const candidates = [
    join(root, 'node_modules', 'playwright-core', 'index.mjs'),
    'C:/SEP490_DSVHVN/FE_Cultural_Heritage-/node_modules/playwright-core/index.mjs',
  ];
  for (const file of candidates) if (existsSync(file)) return import(pathToFileURL(file).href);
  const requireFrom = createRequire(join(root, 'package.json'));
  try {
    return requireFrom('playwright-core');
  } catch {}
  throw new Error('Không tìm thấy playwright-core.');
}

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function launch(chromium) {
  const flags = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];
  for (const channel of ['msedge', 'chrome']) {
    try {
      return await chromium.launch({ channel, headless: true, args: flags });
    } catch (e) {
      console.warn(`Không mở được ${channel}: ${e.message.split('\n')[0]}`);
    }
  }
  return chromium.launch({ headless: true, args: flags });
}

/** Chờ mạng yên, mọi ảnh tải xong, phông chữ sẵn sàng. */
async function settle(page, extra = 800) {
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page
    .waitForFunction(() => [...document.images].every((img) => img.complete || img.getBoundingClientRect().top > window.innerHeight * 2), null, { timeout: 12000 })
    .catch(() => {});
  await pause(extra);
}

/** Cuộn hết trang để ảnh tải chậm (lazy) kịp tải, rồi về đầu trang. */
async function loadLazy(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 600) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await pause(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 600);
}

async function go(page, path, { lazy = false, extra = 800 } = {}) {
  console.log(`  -> ${path}`);
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await settle(page, extra);
  if (lazy) await loadLazy(page);
}

/** Toạ độ y (px ảnh) của phần tử trong ảnh fullPage; null nếu không có. */
async function yOf(page, selector) {
  const y = await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return el.getBoundingClientRect().top + window.scrollY;
  }, selector);
  return y === null ? null : Math.round(y * SCALE);
}

async function imageSize(page) {
  return page.evaluate(() => ({ cssWidth: document.documentElement.clientWidth, cssHeight: document.documentElement.scrollHeight }));
}

// Bộ nhớ đệm ảnh ngoài (Wikimedia, ô bản đồ): chỉ tải một lần cho cả đợt chạy, các ngôn ngữ sau lấy từ bộ nhớ.
const imageCache = new Map();
async function cacheExternalImages(context) {
  await context.route(
    (url) => !['localhost', '127.0.0.1'].includes(url.hostname) && /\.(jpe?g|png|webp|gif|svg)(\?|$)/i.test(url.pathname + url.search),
    async (route) => {
      const key = route.request().url();
      try {
        if (!imageCache.has(key)) {
          // Wikimedia hay trả 429 khi tải dồn: thử lại vài lần, cách quãng tăng dần.
          let response = null;
          for (let attempt = 0; attempt < 4; attempt++) {
            response = await route.fetch({ timeout: 30000 });
            if (response.ok()) break;
            await pause(1500 * (attempt + 1));
          }
          if (!response.ok()) return route.fulfill({ response });
          imageCache.set(key, { status: response.status(), headers: response.headers(), body: await response.body() });
        }
        const hit = imageCache.get(key);
        return route.fulfill({ status: hit.status, headers: hit.headers, body: hit.body });
      } catch {
        return route.continue().catch(() => {});
      }
    },
  );
}

async function newGuest(browser, lang) {
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: SCALE,
    isMobile: true,
    hasTouch: true,
    locale: lang,
    timezoneId: 'Asia/Ho_Chi_Minh',
    geolocation: HANOI,
    permissions: ['geolocation'],
    reducedMotion: 'reduce',
  });
  await context.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    [LANG_KEY, lang],
  );
  await cacheExternalImages(context);
  const page = await context.newPage();
  // Ẩn thanh cuộn và tắt hoạt ảnh ở mọi trang.
  await context.addInitScript(() => {
    const style = document.createElement('style');
    style.textContent =
      '::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}html{scrollbar-width:none!important}' +
      '*{caret-color:transparent!important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
  });
  return { context, page };
}

/** Tắt hộp cookie hoặc banner nếu có (web hiện chưa có). */
async function dismissBanners(page) {
  for (const re of [/accept|agree|đồng ý|chấp nhận|同意|동의/i]) {
    const button = page.locator('[role="dialog"][aria-label*="cookie" i] button, [id*="cookie" i] button').filter({ hasText: re }).first();
    if (await button.count()) await button.click().catch(() => {});
  }
}

async function shoot(page, dir, name, desc, record, { full = false, marks = {} } = {}) {
  const file = join(dir, name);
  await page.screenshot({ path: file, fullPage: full, animations: 'disabled', caret: 'hide' });
  const entry = { mota: desc };
  const png = readFileSync(file);
  entry.rong = png.readUInt32BE(16);
  entry.cao = png.readUInt32BE(20);
  if (Object.keys(marks).length) entry.toaDoY = marks;
  record[name] = entry;
  console.log(`  ${name}  ${entry.rong}x${entry.cao}`);
}

async function runLanguage(browser, lang, store) {
  const dir = join(OUT, lang);
  mkdirSync(dir, { recursive: true });
  const record = {};
  const missing = {};
  const { context, page } = await newGuest(browser, lang);
  console.log(`[${lang}]`);
  try {
    // Mở vài di sản trước để lịch sử và gợi ý của khách có dữ liệu.
    for (const slug of [...WARMUP, FEATURED.slug]) await go(page, `/di-san/${slug}`, { extra: 400 });

    // 02, 03, 04: Trang chủ.
    await go(page, '/', { lazy: true, extra: 1500 });
    await dismissBanners(page);
    await page.waitForSelector('section[aria-labelledby="gan-ban"]', { timeout: 10000 }).catch(() => {});
    await page.waitForSelector('section[aria-labelledby="goi-y-cho-ban"]', { timeout: 10000 }).catch(() => {});
    // Khối Gần bạn mời cho phép vị trí: bấm (quyền đã cấp sẵn, vị trí Hà Nội) để hiện danh sách gần Hà Nội.
    const allow = page.locator('section[aria-labelledby="gan-ban"] button').first();
    if (await allow.count()) {
      await allow.click().catch(() => {});
      await page.waitForSelector('section[aria-labelledby="gan-ban"] a[href*="/di-san/"]', { timeout: 15000 }).catch(() => {});
      await settle(page, 1500);
      await loadLazy(page);
    }
    await pause(1000);
    await shoot(page, dir, '02-trang-chu.png', 'Trang chủ khách, đầu trang với ảnh bìa và ô tìm kiếm.', record);
    const homeMarks = { goiY: await yOf(page, 'section[aria-labelledby="goi-y-cho-ban"]'), ganBan: await yOf(page, 'section[aria-labelledby="gan-ban"]') };
    await shoot(page, dir, '03-trang-chu-dai.png', 'Toàn bộ Trang chủ khách, gồm khối Gợi ý cho bạn và Gần bạn.', record, { full: true, marks: homeMarks });
    if (homeMarks.ganBan !== null) {
      await page.evaluate(() => {
        const el = document.querySelector('section[aria-labelledby="gan-ban"]');
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72);
      });
      await pause(1500);
      await shoot(page, dir, '04-gan-ban.png', 'Khung cuộn tới khối Gần bạn với danh sách di sản gần Hà Nội.', record);
    } else missing['04-gan-ban.png'] = 'Không thấy khối Gần bạn trên Trang chủ.';

    // 01: Chọn ngôn ngữ. Mở ngăn điều hướng rồi mục Ngôn ngữ (thanh trên điện thoại không có nút riêng).
    await go(page, '/', { extra: 800 });
    const menu = page.locator('header button[aria-haspopup="dialog"]').first();
    await menu.click();
    await pause(500);
    const langItem = page.locator('dialog[open] button:has(svg)').last();
    await langItem.click().catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(800);
    if (await page.locator('dialog[open] ul button[lang]').count()) {
      await shoot(page, dir, '01-chon-ngon-ngu.png', 'Hộp thoại chọn ngôn ngữ với năm lựa chọn, dòng đang chọn có dấu tích.', record);
    } else missing['01-chon-ngon-ngu.png'] = 'Không mở được hộp thoại chọn ngôn ngữ.';

    // 05: Bản đồ.
    await go(page, `/ban-do?chon=${FEATURED.slug}`, { extra: 1000 });
    await page.waitForSelector('.leaflet-marker-icon', { timeout: 20000 }).catch(() => {});
    await page
      .waitForFunction(
        () => {
          const tiles = [...document.querySelectorAll('.leaflet-tile')];
          return tiles.length > 0 && tiles.every((t) => t.complete);
        },
        null,
        { timeout: 20000 },
      )
      .catch(() => {});
    await pause(2500);
    await shoot(page, dir, '05-ban-do.png', 'Bản đồ di sản có các ghim trên nền bản đồ.', record);

    // 06, 07, 13: Chi tiết di sản.
    await go(page, `/di-san/${FEATURED.slug}`, { lazy: true, extra: 1200 });
    await shoot(page, dir, '06-chi-tiet.png', 'Chi tiết Văn Miếu – Quốc Tử Giám, đầu trang với ảnh bìa và các nút Tóm tắt, Nghe, Xem 3D.', record);
    const detailMarks = {
      nutHanhDong: await yOf(page, 'fieldset'),
      thongTin: await yOf(page, 'section[aria-labelledby="thong-tin"]'),
      thuVienAnh: await yOf(page, 'section[aria-labelledby="thu-vien-anh"]'),
      dongThoiGian: await yOf(page, 'section[aria-labelledby="dong-thoi-gian-rut-gon"]'),
      nguon: await yOf(page, 'section[aria-labelledby="nguon"]'),
      goiY: await yOf(page, 'section[aria-labelledby="goi-y-cho-ban"]'),
      chanTrang: await yOf(page, 'footer'),
    };
    await shoot(page, dir, '07-chi-tiet-dai.png', 'Toàn bộ trang chi tiết Văn Miếu – Quốc Tử Giám.', record, { full: true, marks: detailMarks });
    if (detailMarks.nguon !== null) {
      await page.evaluate(() => {
        const el = document.querySelector('section[aria-labelledby="nguon"]');
        window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 72);
      });
      await pause(800);
      await shoot(page, dir, '13-nguon.png', 'Cuối trang chi tiết: mục Nguồn với tên nguồn và liên kết, chân trang ghi nguồn Cục Di sản văn hóa.', record);
    } else missing['13-nguon.png'] = 'Trang chi tiết không có mục Nguồn.';

    // 08: Tóm tắt / nghe thuyết minh (trạng thái khóa, không bấm quảng cáo).
    await page.evaluate(() => window.scrollTo(0, 0));
    await pause(400);
    const actions = page.locator('fieldset button');
    if ((await actions.count()) >= 2) {
      await actions.nth(0).click();
      await pause(2500);
      await settle(page, 800);
      await shoot(page, dir, '08-tom-tat-nghe.png', 'Hộp thoại Tóm tắt và Nghe thuyết minh ở trạng thái khóa, mời xem một quảng cáo ngắn để mở.', record);
      await page.keyboard.press('Escape');
      await pause(400);
    } else missing['08-tom-tat-nghe.png'] = 'Không thấy nút Tóm tắt / Nghe.';

    // 09: Mô hình 3D.
    await go(page, `/di-san/${FEATURED.slug}`, { extra: 800 });
    const btn3d = page.locator('fieldset button').last();
    if ((await page.locator('fieldset button').count()) >= 3) {
      await btn3d.click();
      await pause(1500);
      // Mô hình nặng: web hỏi xác nhận trước khi tải; bấm nút xác nhận (nút phụ đầu tiên trong hộp thoại, không phải quảng cáo).
      const confirm = page.locator('dialog[open] [role="status"] button, dialog[open] output button').first();
      if (await confirm.count()) await confirm.click().catch(() => {});
      const loaded = await page
        .waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 40000 })
        .then(() => true)
        .catch(() => false);
      await pause(2500);
      if (loaded) {
        await shoot(page, dir, '09-3d.png', 'Trình xem mô hình 3D Khuê Văn Các đã tải xong.', record);
      } else {
        await shoot(page, dir, '09-3d.png', 'Trình xem mô hình 3D (mô hình chưa tải xong khi chụp).', record);
        missing['09-3d.png'] = 'Mô hình 3D chưa báo tải xong trong 40 giây (ảnh vẫn được chụp, cần kiểm tay).';
      }
    } else missing['09-3d.png'] = 'Không thấy nút Xem 3D.';

    // 10, 11: Dòng thời gian.
    await go(page, `/dong-thoi-gian/${FEATURED.slug}`, { lazy: true, extra: 1000 });
    await shoot(page, dir, '10-dong-thoi-gian.png', 'Dòng thời gian của Văn Miếu – Quốc Tử Giám, đầu trang.', record);
    await shoot(page, dir, '11-dong-thoi-gian-dai.png', 'Toàn bộ dòng thời gian của Văn Miếu – Quốc Tử Giám.', record, { full: true });

    // 12: Lịch sử và gợi ý.
    await go(page, '/lich-su', { lazy: true, extra: 1200 });
    await shoot(page, dir, '12-lich-su-goi-y.png', 'Trang Lịch sử đã xem và gợi ý của khách, có các di sản vừa mở.', record);

    // 14: Giới thiệu.
    await go(page, '/gioi-thieu', { extra: 1000 });
    await shoot(page, dir, '14-gioi-thieu.png', 'Trang Giới thiệu, đầu trang.', record);
  } catch (e) {
    console.error(`  Lỗi ở ${lang}: ${e.message}`);
    missing.loi = e.message;
  } finally {
    await context.close();
  }
  store[lang] = { tep: record, thieu: missing };
}

const { chromium } = await loadPlaywright();
const browser = await launch(chromium);
const store = {};
try {
  for (const lang of langs) await runLanguage(browser, lang, store);
} finally {
  await browser.close();
}
mkdirSync(OUT, { recursive: true });
let merged = store;
// Đọc lại ngay trước khi ghi để gộp kết quả khi chạy song song nhiều ngôn ngữ.
try {
  if (existsSync(LIST)) merged = { ...(JSON.parse(readFileSync(LIST, 'utf8')).ngonNgu ?? {}), ...store };
} catch {}
writeFileSync(
  LIST,
  JSON.stringify(
    {
      diSan: FEATURED,
      khung: { rong: 393, cao: 852, tyLe: SCALE, ghiChu: 'Toạ độ y tính bằng px ảnh (pixel css nhân tyLe), gốc ở đầu ảnh.' },
      ngonNgu: merged,
    },
    null,
    2,
  ) + '\n',
);
console.log('Xong:', LIST);
