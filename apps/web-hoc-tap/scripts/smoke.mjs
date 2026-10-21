#!/usr/bin/env node
// Kiểm thử khám phá di sản công khai của web học tập trên trình duyệt thật với API thật (docs/kham-pha-di-san.md ở thư
// mục gốc repo): trang chủ, tìm kiếm không dấu, bộ lọc, bản đồ (ghim, quần đảo Hoàng Sa và Trường Sa, thẻ tóm tắt), chi
// tiết, dòng thời gian, trang không tìm thấy, khung điện thoại.
// Cần: API đang chạy với các di sản ĐÃ XUẤT BẢN, `npm run dev:hoc-tap` đang chạy và trỏ tới API đó (VITE_API_BASE_URL),
// Edge hoặc Chrome đã cài trên máy.
//
//   npm run smoke -w @dsvhvn/web-hoc-tap
//
// Biến môi trường:
//   BASE_URL           mặc định http://localhost:5174
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)
//   EXPECT_TOTAL       số di sản đã xuất bản mong đợi (mặc định 20, di sản đợt 1)

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5174').replace(/\/+$/, '');
const EXPECT_TOTAL = Number(process.env.EXPECT_TOTAL ?? 20);
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
const consoleErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', ...options });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    // Ảnh bị Wikimedia chặn tạm thời không phải lỗi của ứng dụng (đã có ảnh giữ chỗ).
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(m.text());
  });
  return page;
}

const shot = (page, name, options = {}) => page.screenshot({ path: resolve(SHOTS, `${name}.png`), ...options });
const go = (page, path) => page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

/** Cuộn hết trang để ảnh nạp chậm (lazy) tải xong trước khi chụp cả trang. */
async function scrollThrough(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
}

try {
  const page = await newPage();

  // 1. Trang chủ ---------------------------------------------------------------------------------------------------
  await go(page, '/');
  await page.getByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' }).waitFor();
  await page.getByRole('heading', { level: 2, name: 'Di sản nổi bật' }).waitFor();
  check('Trang chủ: ảnh lớn đầu trang và di sản nổi bật từ API', true);
  check('Trang chủ: câu giới thiệu có tổng số di sản', await page.getByText(`Tìm hiểu ${EXPECT_TOTAL} di sản`).isVisible());
  check('Trang chủ: khách thấy nút "Đăng nhập"', (await page.getByRole('link', { name: 'Đăng nhập' }).count()) > 0);
  check('Trang chủ: không có ô nhập mã bài học', (await page.getByLabel(/mã bài học/i).count()) === 0);
  const featured = await page.locator('section[aria-labelledby="di-san-noi-bat"] a').count();
  check('Trang chủ: tối đa 8 di sản nổi bật', featured >= 1 && featured <= 9, `${featured} liên kết (8 thẻ và 1 liên kết xem tất cả)`);
  await page.getByText(/Ảnh: .* · .* · /).first().waitFor({ timeout: 8000 }).catch(() => undefined);
  check('Trang chủ: ảnh đầu trang có dòng ghi công', (await page.getByText(/^.* — Ảnh: /).count()) > 0);
  await scrollThrough(page);
  await page.waitForTimeout(800);
  await shot(page, '01-trang-chu', { fullPage: true });

  // 2. Tìm kiếm không dấu ----------------------------------------------------------------------------------------
  await page.getByRole('searchbox', { name: 'Từ khóa' }).fill('thang long');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForURL(/\/di-san\?tu-khoa=thang\+long/);
  const thangLong = page.getByRole('link', { name: /Hoàng thành Thăng Long/ });
  await thangLong.first().waitFor();
  check('Tìm "thang long" (không dấu) ra "Khu Trung tâm Hoàng thành Thăng Long – Hà Nội"', await thangLong.first().isVisible());
  const countOf = async () => Number((await page.getByRole('heading', { level: 2, name: /di sản$/ }).first().innerText()).match(/\d+/)?.[0]);
  const noAccent = await countOf();
  await page.getByRole('searchbox', { name: 'Từ khóa' }).fill('THĂNG LONG');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForURL(/tu-khoa=TH/);
  await page.waitForTimeout(600);
  check('Tìm "THĂNG LONG" (có dấu, hoa) ra cùng số kết quả với không dấu', (await countOf()) === noAccent, `${noAccent} di sản`);
  // "oang" nằm giữa từ "Hoàng", không phải đầu từ nào: máy chủ chỉ khớp đầu từ nên không ra di sản nào.
  await page.getByRole('searchbox', { name: 'Từ khóa' }).fill('oang thanh');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.waitForURL(/tu-khoa=oang/);
  await page.getByText('Không tìm thấy kết quả phù hợp.').waitFor();
  check('Tìm "oang thanh" (giữa từ "Hoàng thành") không ra Thăng Long: chỉ khớp đầu từ', (await page.getByRole('link', { name: /Hoàng thành Thăng Long/ }).count()) === 0);
  await page.getByRole('searchbox', { name: 'Từ khóa' }).fill('a');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  check(
    'Từ khóa một ký tự báo lỗi ngay dưới ô',
    (await page.getByRole('alert').innerText()).includes('Từ khóa không hợp lệ: phải dài 2-100 ký tự.'),
  );
  await page.getByRole('searchbox', { name: 'Từ khóa' }).fill('zzzzqqq');
  await page.getByRole('button', { name: 'Tìm kiếm' }).click();
  await page.getByText('Không tìm thấy kết quả phù hợp.').waitFor();
  check('Không có kết quả: báo và gợi ý bớt bộ lọc', true);

  // 3. Bộ lọc ----------------------------------------------------------------------------------------------------
  await go(page, '/di-san');
  await page.getByRole('heading', { level: 2, name: `${EXPECT_TOTAL} di sản` }).waitFor();
  check(`Tìm kiếm không lọc: ${EXPECT_TOTAL} di sản, 12 thẻ mỗi trang và có phân trang`, (await page.locator('main ul > li').count()) >= 12 && (await page.getByRole('button', { name: 'Trang 2' }).count()) === 1);
  await page.getByRole('button', { name: 'Trang 2' }).click();
  await page.waitForURL(/trang=2/);
  await page.getByText(new RegExp(`Hiển thị 13–${EXPECT_TOTAL} trên ${EXPECT_TOTAL} di sản`)).waitFor();
  check('Phân trang: trang 2 hiện phần còn lại', true);
  await page.getByRole('combobox', { name: 'Loại' }).selectOption('INTANGIBLE');
  await page.waitForURL(/loai=INTANGIBLE/);
  await page.waitForTimeout(600);
  const intangible = await countOf();
  check('Lọc theo loại "Phi vật thể" đổi số kết quả và về trang 1', intangible > 0 && intangible < EXPECT_TOTAL && !page.url().includes('trang='), `${intangible} di sản`);
  await page.getByRole('combobox', { name: 'Vùng' }).selectOption('Bắc');
  await page.waitForTimeout(600);
  check('Kết hợp loại và vùng theo VÀ', (await countOf()) <= intangible, `${await countOf()} di sản`);
  await shot(page, '02-tim-kiem-loc');
  const mapLink = await page.getByRole('link', { name: 'Xem trên bản đồ' }).getAttribute('href');
  check('"Xem trên bản đồ" giữ bộ lọc', mapLink.includes('loai=INTANGIBLE') && mapLink.includes('vung='), mapLink);
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await page.waitForFunction(() => location.search === '');
  check('Xóa bộ lọc về trạng thái ban đầu', true);

  // 4. Bản đồ ----------------------------------------------------------------------------------------------------
  await go(page, '/ban-do');
  await page.locator('.leaflet-tile-loaded').first().waitFor();
  await page.locator('.dsv-pin, .dsv-cluster').first().waitFor();
  check('Bản đồ: nền OpenStreetMap có ghi công', (await page.locator('.leaflet-control-attribution').innerText()).includes('OpenStreetMap'));
  check('Bản đồ: hiện quần đảo Hoàng Sa và Trường Sa thuộc Việt Nam', (await page.getByText('Quần đảo Hoàng Sa (Việt Nam)').isVisible()) && (await page.getByText('Quần đảo Trường Sa (Việt Nam)').isVisible()));
  check('Bản đồ: chấm các đảo của hai quần đảo', (await page.locator('.dsv-island').count()) >= 12);
  const located = await page.getByText(/di sản có vị trí trên bản đồ/).innerText();
  check('Bản đồ: ghi số di sản có vị trí và số không có vị trí', /\d+ di sản có vị trí/.test(located) && (await page.getByText(/không có vị trí trên bản đồ/).count()) > 0, located);
  const pins = await page.locator('.dsv-pin').count();
  const clusters = await page.locator('.dsv-cluster').count();
  check('Bản đồ: có ghim và nhóm ghim', pins + clusters > 0, `${pins} ghim, ${clusters} nhóm`);
  await shot(page, '03-ban-do');
  await page.locator('.dsv-pin').first().click();
  await page.locator('.dsv-popup').waitFor();
  const popup = page.locator('.dsv-popup');
  check('Bản đồ: bấm ghim mở thẻ tóm tắt có "Xem chi tiết"', await popup.getByRole('link', { name: 'Xem chi tiết' }).isVisible());
  check('Bản đồ: vị trí chọn nằm trên địa chỉ trang', page.url().includes('chon='));
  await page.waitForTimeout(500);
  const popupBox = await popup.boundingBox();
  const barBox = await page.locator('h1', { hasText: 'Bản đồ di sản' }).boundingBox();
  check('Bản đồ: thẻ tóm tắt không bị thanh lọc che', popupBox.y >= barBox.y + barBox.height - 4, `thẻ y=${Math.round(popupBox.y)}, thanh lọc dưới ${Math.round(barBox.y + barBox.height)}`);
  await shot(page, '04-ban-do-the-tom-tat');
  const slug = new URL(page.url()).searchParams.get('chon');
  await popup.getByRole('link', { name: 'Xem chi tiết' }).click();
  await page.waitForURL(new RegExp(`/di-san/${slug}`));
  check('Bản đồ: "Xem chi tiết" mở đúng trang chi tiết', true);

  // 5. Chi tiết di sản -------------------------------------------------------------------------------------------
  await page.locator('section[aria-labelledby="ten-di-san"]').waitFor();
  check('Chi tiết: có nhãn loại, cấp xếp hạng và tỉnh', (await page.locator('section[aria-labelledby="ten-di-san"] li').count()) >= 2);
  check('Chi tiết: ảnh đại diện có dòng ghi công', (await page.getByText(/^Ảnh: /).count()) > 0);
  const gallery = page.locator('section[aria-labelledby="thu-vien-anh"]');
  if (await gallery.count()) {
    check('Chi tiết: thư viện ảnh ghi công ba phần dưới từng ảnh', (await gallery.getByText(/^Ảnh: .+ · .+ · .+/).count()) > 0);
  }
  check('Chi tiết: có mục Nguồn với đường dẫn', (await page.locator('section[aria-labelledby="nguon"] a').count()) > 0);
  await page.locator('.leaflet-tile-loaded').first().waitFor().catch(() => undefined);
  check('Chi tiết: bản đồ nhỏ có ghim và hai quần đảo', (await page.locator('.dsv-pin--selected').count()) === 1 && (await page.getByText('Quần đảo Hoàng Sa (Việt Nam)').count()) === 1);
  await scrollThrough(page);
  await page.waitForTimeout(800);
  await shot(page, '05-chi-tiet', { fullPage: true });

  // 6. Dòng thời gian --------------------------------------------------------------------------------------------
  await go(page, '/dong-thoi-gian');
  await page.getByRole('heading', { level: 1, name: 'Chọn một di sản để xem dòng thời gian' }).waitFor();
  check('Dòng thời gian: chưa chọn di sản thì có danh sách để chọn', (await page.locator('main ul > li a').count()) >= 1);
  await go(page, '/di-san/khu-trung-tam-hoang-thanh-thang-long-ha-noi');
  await page.getByRole('link', { name: 'Mở dòng thời gian' }).first().click();
  await page.waitForURL(/\/dong-thoi-gian\/khu-trung-tam-hoang-thanh-thang-long-ha-noi/);
  await page.getByText('GIAI ĐOẠN 1').waitFor();
  check('Dòng thời gian: nút "Mở dòng thời gian" ở trang chi tiết dẫn tới trục các giai đoạn', true);
  check('Dòng thời gian: khoảng năm hiển thị sẵn ("1010 – 1821")', await page.getByText(/^1010 – 1821$/).isVisible());
  check('Dòng thời gian: giai đoạn đầu mở sẵn, sự kiện có năm', (await page.getByText('1010', { exact: true }).count()) > 0);
  const expand = page.getByRole('button', { name: /^Xem \d+ sự kiện/ });
  if (await expand.count()) {
    await expand.first().click();
    check('Dòng thời gian: mở giai đoạn sau để xem sự kiện', (await page.getByRole('button', { name: 'Thu gọn' }).count()) === 2);
  }
  await shot(page, '06-dong-thoi-gian', { fullPage: true });
  await page.getByRole('link', { name: /Về trang di sản/ }).click();
  await page.waitForURL(/\/di-san\/khu-trung-tam/);
  check('Dòng thời gian: "Về trang di sản" quay lại chi tiết', true);

  // 7. Không tìm thấy --------------------------------------------------------------------------------------------
  await go(page, '/di-san/khong-co-di-san-nay');
  await page.getByRole('heading', { level: 1, name: 'Không tìm thấy di sản này' }).waitFor();
  check('Di sản không có (hoặc chưa xuất bản) → báo không tìm thấy kèm lối về tìm kiếm', await page.getByRole('main').getByRole('link', { name: 'Tìm kiếm di sản' }).isVisible());
  await go(page, '/dong-thoi-gian/khong-co-di-san-nay');
  await page.getByRole('heading', { level: 1, name: 'Không tìm thấy di sản này' }).waitFor();
  check('Dòng thời gian của di sản không có → báo không tìm thấy', true);

  // 8. Điện thoại (390 × 844) ------------------------------------------------------------------------------------
  const phone = await newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  for (const [name, path] of [
    ['trang chủ', '/'],
    ['tìm kiếm', '/di-san?vung=B%E1%BA%AFc'],
    ['chi tiết', '/di-san/khu-trung-tam-hoang-thanh-thang-long-ha-noi'],
    ['dòng thời gian', '/dong-thoi-gian/khu-trung-tam-hoang-thanh-thang-long-ha-noi'],
    ['chọn di sản', '/dong-thoi-gian'],
    ['bản đồ', '/ban-do'],
  ]) {
    await go(phone, path);
    await phone.getByRole('heading', { level: 1 }).first().waitFor();
    await phone.waitForTimeout(700);
    check(`Điện thoại: ${name} không cuộn ngang`, await noHorizontalScroll(phone));
  }
  await go(phone, '/ban-do');
  await phone.locator('.dsv-pin, .dsv-cluster').first().waitFor();
  const toggle = phone.getByRole('button', { name: /^Bộ lọc/ });
  check('Điện thoại: bản đồ có nút "Bộ lọc" thay cho hàng lọc', await toggle.isVisible());
  await toggle.click();
  check('Điện thoại: mở nút "Bộ lọc" hiện các ô lọc', await phone.getByRole('combobox', { name: 'Loại' }).isVisible());
  await shot(phone, '07-dien-thoai-ban-do-bo-loc');
  await toggle.click();
  await phone.locator('.dsv-pin').first().click().catch(async () => phone.locator('.dsv-cluster').first().click());
  await phone.waitForTimeout(800);
  await shot(phone, '08-dien-thoai-ban-do');
  await go(phone, '/');
  await phone.getByRole('heading', { level: 2, name: 'Di sản nổi bật' }).waitFor();
  await scrollThrough(phone);
  await phone.waitForTimeout(800);
  await shot(phone, '09-dien-thoai-trang-chu', { fullPage: true });
  await go(phone, '/di-san?tu-khoa=thang+long');
  await phone.getByRole('link', { name: /Hoàng thành Thăng Long/ }).first().waitFor();
  await shot(phone, '10-dien-thoai-tim-kiem');

  check('Không có lỗi JavaScript trên trang', pageErrors.length === 0 && consoleErrors.length === 0, [...pageErrors, ...consoleErrors].slice(0, 3).join(' | '));
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} bước đạt.`);
if (failed.length) {
  console.log('Lỗi:', failed.map((f) => f.name).join('; '));
  process.exit(1);
}
