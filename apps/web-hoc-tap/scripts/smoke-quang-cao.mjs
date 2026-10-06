#!/usr/bin/env node
// Kiểm thử luồng Quảng cáo Google có thưởng trên web học tập và web quản trị, trình duyệt thật với API thật (docs/quang-cao-google.md):
// khách bấm "Tóm tắt" ở di sản chưa mở khóa thì thấy lời mời, quảng cáo chỉ chạy sau khi bấm "Xem quảng cáo", thư viện quảng cáo của Google chỉ nạp lúc đó;
// quảng cáo có thưởng THẬT của Google (đơn vị quảng cáo thử /22639388115/rewarded_web_example, không sinh doanh thu) chạy trong trình duyệt, đóng sớm thì chưa mở,
// xem đủ thì máy chủ ghi mở khóa 24 giờ; mở khóa cho đúng một di sản trên đúng một thiết bị, ở mọi ngôn ngữ; mã giao dịch giả, sai di sản, gửi lại; hết hạn thì hỏi lại;
// học sinh không thấy quảng cáo và không nạp thư viện của Google; di sản chưa có tóm tắt không hiện cổng; khung điện thoại; web quản trị hiện thống kê khớp với API.
//
// Cần: API đang chạy trên CSDL TẠM (nhánh quảng cáo Google) với Ads__GateEnabled=true, Email__Mode=Log, Ai__Mode=Simulated, Storage__Provider=Local; web học tập (5174) và web quản trị (5173)
// đang chạy trỏ tới API đó; Edge hoặc Chrome đã cài và có mạng ra Internet (quảng cáo thử của Google tải từ máy chủ của Google). Bước chuẩn bị (xuất bản di sản, tóm tắt, trường,
// giáo viên, lớp, học sinh) gọi thẳng API; mọi thao tác của khách, học sinh, quản trị đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:quang-cao -w @dsvhvn/web-hoc-tap
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5080/api/v1
//   LEARNING_WEB       mặc định http://localhost:5174
//   ADMIN_WEB          mặc định http://localhost:5173
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   SQL_DATABASE       tùy chọn — tên database tạm trên (localdb)\MSSQLLocalDB; có thì thử hết hạn bằng cách rút ngắn hạn mở khóa (cần sqlcmd)
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5174').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5173').replace(/\/+$/, '');
const API_LOG = process.env.API_LOG;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const SQL_DATABASE = process.env.SQL_DATABASE;
if (!API_LOG || !ADMIN_PASSWORD) {
  console.error('Cần API_LOG và ADMIN_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const PASSWORD = 'MatKhau2026';
const STUDENT_PASSWORD = 'MatKhauCuaEm2026';
const AD_UNIT = '/22639388115/rewarded_web_example';
const results = [];
const pageErrors = [];
const badResponses = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- Gọi API để chuẩn bị dữ liệu và đối chiếu ----

async function raw(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, json: await response.json().catch(() => null) };
}

async function call(method, path, options) {
  const { status, json } = await raw(method, path, options);
  if (status >= 400) throw new Error(`${method} ${path} → ${status} ${json?.message ?? ''}`);
  return json.data;
}

async function mailToken(email) {
  for (let i = 0; i < 40; i++) {
    const log = readFileSync(API_LOG, 'utf8');
    const at = log.toLowerCase().lastIndexOf(email.toLowerCase());
    if (at >= 0) {
      const token = log.slice(at).match(/token=([\w%-]+)/)?.[1];
      if (token) return decodeURIComponent(token);
    }
    await sleep(200);
  }
  throw new Error(`Không thấy thư gửi tới ${email} trong ${API_LOG}`);
}

const unlockStatus = (key, slug) => call('GET', `/public/ads/unlock?slug=${encodeURIComponent(slug)}`, { headers: { 'X-Device-Key': key } });

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items;
const published = [];
for (const heritage of drafts) {
  if (published.length >= 3) break;
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    published.push(await call('GET', `/admin/heritages/${heritage.id}`, { token: admin }));
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (published.length < 3) {
  // Chạy lại trên cùng CSDL tạm: các di sản đã xuất bản từ lần trước vẫn dùng được.
  const already = (await call('GET', '/public/heritages?pageSize=100')).items;
  for (const card of already) {
    if (published.length >= 3) break;
    if (!published.some((h) => h.slug === card.slug)) published.push(await call('GET', `/public/heritages/${encodeURIComponent(card.slug)}`));
  }
}
if (published.length < 3) throw new Error('Cần ít nhất ba di sản xuất bản được (di sản nạp sẵn trong CSDL tạm).');
const [A, B, C] = published;
// A và B có tóm tắt tiếng Việt đã duyệt; C không có (cổng không được hiện cho di sản chưa có tóm tắt).
for (const heritage of [A, B]) {
  await call('POST', `/admin/heritages/${heritage.id}/translations/generate`, { token: admin });
  await call('POST', `/admin/heritages/${heritage.id}/translations/vi/approve`, { token: admin, body: { kind: 'SUMMARY' } });
}

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Nguyễn Du ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@nguyendu.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
await call('POST', '/org/teachers', { token: orgAdmin, body: { fullName: 'Đặng Thị Mỹ Linh', username: teacherLogin, email: `${teacherLogin}@nguyendu.edu.vn` } });
await call('POST', '/auth/set-password', { body: { token: await mailToken(`${teacherLogin}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const teacher = (await call('POST', '/auth/login', { body: { emailOrUsername: teacherLogin, password: PASSWORD } })).accessToken;
const classRoom = await call('POST', '/teacher/classes', { token: teacher, body: { name: `7A${stamp.slice(-2)}`, grade: 7, schoolYear: '2026-2027' } });
const created = await call('POST', `/teacher/classes/${classRoom.id}/students`, { token: teacher, body: { fullName: 'Nguyễn Văn Đạt' } });
const { studentCode, temporaryPassword } = created.sheet.entries[0];
const firstLogin = await call('POST', '/student/auth/login', { body: { studentCode, password: temporaryPassword } });
await call('PUT', '/student/me/password', { token: firstLogin.accessToken, body: { newPassword: STUDENT_PASSWORD, confirmNewPassword: STUDENT_PASSWORD } });
const config = await call('GET', '/public/ads/config');
console.log(`Đã chuẩn bị: A "${A.name}", B "${B.name}" (có tóm tắt), C "${C.name}" (không có); học sinh ${studentCode}; cổng ${config.gateActive ? 'đang bật' : 'TẮT'}.`);
if (!config.gateActive) throw new Error('Cổng quảng cáo đang tắt: chạy API với Ads__GateEnabled=true.');

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const apiCalls = [];
/** Mọi yêu cầu tới máy chủ quảng cáo của Google (để biết thư viện chỉ nạp sau khi khách bấm). */
const googleRequests = [];

async function newPage({ viewport = { width: 1440, height: 900 }, locale = 'vi-VN', language } = {}) {
  const context = await browser.newContext({ viewport, locale });
  if (language) await context.addInitScript((code) => window.localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', code), language);
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', (r) => {
    const url = r.url();
    if (url.startsWith(API)) apiCalls.push({ page, method: r.method(), url: new URL(url), key: r.headers()['x-device-key'] ?? null, body: r.postData(), at: Date.now() });
    else if (/doubleclick\.net|googlesyndication\.com|googletagservices\.com/.test(url)) googleRequests.push({ page, url, at: Date.now() });
  });
  const responses = [];
  page.on('response', (r) => {
    if (r.url().startsWith(API)) responses.push({ status: r.status(), method: r.request().method(), path: new URL(r.url()).pathname.replace('/api/v1', '') });
  });
  page.responses = responses;
  return page;
}

const shot = (page, name, options = { fullPage: false }) => page.screenshot({ path: resolve(SHOTS, `quang-cao-${name}.png`), ...options });
const dialogOf = (page) => page.getByRole('dialog', { name: /TÓM TẮT VÀ THUYẾT MINH|SUMMARY AND AUDIO GUIDE|요약/ });
const callsTo = (page, suffix, method) => apiCalls.filter((c) => c.page === page && c.url.pathname.endsWith(suffix) && (!method || c.method === method));
const googleCount = (page) => googleRequests.filter((r) => r.page === page).length;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const deviceKeyOf = (page) => page.evaluate(() => window.localStorage.getItem('dsvhvn.hoc-tap.ma-thiet-bi'));
/** Hộp thoại đang hiện nội dung tóm tắt (có tab Đọc) hay đang hiện lời mời. */
const hasContent = async (dialog) => (await dialog.getByRole('tab', { name: 'Đọc' }).count()) === 1;

/** Khung quảng cáo thật của Google (iframe chứa nút "Close ad"). */
async function adFrame(page, timeoutMs = 25000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    for (const frame of page.frames()) {
      if (await frame.locator('button[aria-label="Close ad"]').count().catch(() => 0)) return frame;
    }
    await sleep(500);
  }
  return null;
}

/** Xem quảng cáo thật đến hết bộ đếm thưởng rồi đóng. */
async function finishAd(page, frame) {
  let counting = false;
  for (let i = 0; i < 60; i++) {
    const text = await frame.evaluate(() => document.body.innerText).catch(() => '');
    const now = /Nhận thưởng sau|Reward in|Earn/.test(text);
    if (now) counting = true;
    if (counting && !now) break;
    await sleep(1000);
  }
  await frame.locator('button[aria-label="Close ad"]').click();
}

/** Mở hộp thoại tóm tắt ở trang chi tiết của một di sản. */
async function openSummary(page, heritage, button = 'Tóm tắt') {
  if (!page.url().includes(`/di-san/${heritage.slug}`)) await page.goto(`${LEARNING_WEB}/di-san/${heritage.slug}`);
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.getByRole('button', { name: button, exact: true }).click();
  return dialogOf(page);
}

const guest = await newPage();
let KEY = null;
try {
  // ====================== Lời mời xem quảng cáo ======================
  const dialog = await openSummary(guest, A);
  await dialog.getByRole('heading', { name: 'Xem quảng cáo để mở tóm tắt và nghe thuyết minh' }).waitFor();
  await guest.waitForLoadState('networkidle');
  KEY = await deviceKeyOf(guest);
  check('Di sản chưa mở khóa: máy chủ trả 403 cho tóm tắt, hộp thoại hiện lời mời thay cho nội dung', guest.responses.some((r) => r.path.endsWith(`/${A.slug}/summary`) && r.status === 403) && !(await hasContent(dialog)));
  const body = await dialog.innerText();
  check('Lời mời nói rõ: xem quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của đúng di sản này trong 24 giờ; ảnh, bản đồ, dòng thời gian, 3D vẫn miễn phí', body.includes(`"${A.name}"`) && /trong 24 giờ/.test(body) && body.includes('vẫn miễn phí'), body.replace(/\s+/g, ' ').slice(0, 220));
  check('Ghi chú "Quảng cáo do Google cung cấp", có nút "Xem quảng cáo" và "Để sau"', body.includes('Quảng cáo do Google cung cấp') && (await dialog.getByRole('button', { name: 'Xem quảng cáo' }).count()) === 1 && (await dialog.getByRole('button', { name: 'Để sau' }).count()) === 1);
  check('Chưa bấm thì chưa xin mã giao dịch và chưa nạp gì của Google', callsTo(guest, '/public/ads/web/start').length === 0 && googleCount(guest) === 0);
  await shot(guest, '01-loi-moi');

  await dialog.getByRole('button', { name: 'Để sau' }).click();
  await dialog.waitFor({ state: 'hidden' });
  check('"Để sau": đóng hộp thoại, vẫn không gọi máy chủ quảng cáo của Google', googleCount(guest) === 0 && callsTo(guest, '/public/ads/web/start').length === 0);

  // ====================== Quảng cáo thật của Google: đóng sớm ======================
  await guest.getByRole('button', { name: 'Tóm tắt', exact: true }).click();
  await dialog.getByRole('button', { name: 'Xem quảng cáo' }).click();
  const firstAd = await adFrame(guest);
  check('Bấm "Xem quảng cáo": máy chủ cấp mã giao dịch một lần, thư viện của Google nạp lúc này và quảng cáo thử hiện trên trang', callsTo(guest, '/public/ads/web/start', 'POST').length === 1 && googleCount(guest) > 0 && firstAd !== null);
  const startBody = JSON.parse(callsTo(guest, '/public/ads/web/start', 'POST')[0].body);
  check('Xin mã giao dịch bằng slug của di sản và mã thiết bị của khách', startBody.slug === A.slug && callsTo(guest, '/public/ads/web/start', 'POST')[0].key === KEY && Boolean(KEY));
  check('Quảng cáo hiện trên trang thì hộp thoại tạm đóng để không che quảng cáo', !(await dialog.isVisible()));
  const adRequest = googleRequests.find((r) => r.page === guest && r.url.includes('/gampad/ads'));
  const googleUrls = googleRequests.filter((r) => r.page === guest).map((r) => r.url);
  check('Yêu cầu quảng cáo dùng đúng đơn vị thử của Google (rewarded_web_example) và không cá nhân hóa (npa=1)', adRequest !== undefined && decodeURIComponent(adRequest.url).includes('rewarded_web_example') && googleUrls.some((url) => /[?&]npa=1(&|$)/.test(url)), adRequest ? decodeURIComponent(adRequest.url).slice(0, 160) : 'không thấy yêu cầu quảng cáo');
  await shot(guest, '02-quang-cao-cua-google');

  await firstAd.locator('button[aria-label="Close ad"]').click();
  await dialog.waitFor({ state: 'visible', timeout: 20000 });
  await dialog.getByText(/Bạn chưa xem hết quảng cáo nên chưa mở được tóm tắt/).waitFor();
  check('Đóng quảng cáo khi chưa được cấp thưởng: hộp thoại quay lại, báo chưa xem hết, KHÔNG báo máy chủ, không mở khóa', callsTo(guest, '/public/ads/web/rewarded').length === 0 && !(await hasContent(dialog)) && (await unlockStatus(KEY, A.slug)).unlocked === false);
  check('Có nút "Xem lại quảng cáo"', (await dialog.getByRole('button', { name: 'Xem lại quảng cáo' }).count()) === 1);
  await shot(guest, '03-chua-xem-het');

  // ====================== Quảng cáo thật: xem đủ ======================
  await dialog.getByRole('button', { name: 'Xem lại quảng cáo' }).click();
  const secondAd = await adFrame(guest);
  check('Xem lại: quảng cáo hiện lần nữa (mã giao dịch mới)', secondAd !== null && callsTo(guest, '/public/ads/web/start', 'POST').length === 2);
  await finishAd(guest, secondAd);
  await dialog.getByRole('tab', { name: 'Đọc' }).waitFor({ timeout: 25000 });
  const rewardCalls = callsTo(guest, '/public/ads/web/rewarded', 'POST');
  check('Google cấp thưởng và khách đóng quảng cáo: trình duyệt báo máy chủ đúng một lần, máy chủ ghi mở khóa', rewardCalls.length === 1 && guest.responses.some((r) => r.path.endsWith('/public/ads/web/rewarded') && r.status === 200));
  const report = JSON.parse(rewardCalls[0]?.body ?? '{}');
  check('Lời báo mang slug, mã giao dịch đã cấp và đúng đơn vị quảng cáo đã phát', report.slug === A.slug && typeof report.transactionId === 'string' && report.transactionId.length > 20 && report.adUnit === AD_UNIT);
  check('Hộp thoại mở lại và hiện tóm tắt (tab Đọc)', (await dialog.isVisible()) && (await dialog.getByRole('tab', { name: 'Đọc', selected: true }).count()) === 1);
  await sleep(1200);
  check('Quảng cáo xong thì địa chỉ trang không còn dấu vết của quảng cáo (#goog_rewarded)', !new URL(guest.url()).hash.includes('goog'), new URL(guest.url()).hash);
  const unlocked = await unlockStatus(KEY, A.slug);
  const hoursLeft = (Date.parse(`${unlocked.expiresAt}${/Z|[+-]\d\d:?\d\d$/.test(unlocked.expiresAt) ? '' : 'Z'}`) - Date.now()) / 3_600_000;
  check('Máy chủ ghi mở khóa 24 giờ cho đúng di sản và thiết bị này', unlocked.unlocked === true && hoursLeft > 23.9 && hoursLeft <= 24.01, `${hoursLeft.toFixed(2)} giờ, hạn ${unlocked.expiresAt}`);
  check('Hộp thoại ghi "Đã mở khóa đến {giờ}"', (await dialog.getByText(/Đã mở khóa đến/).count()) === 1);
  await shot(guest, '04-da-mo-khoa');

  // Tab Nghe dùng chung lượt mở khóa.
  await dialog.getByRole('tab', { name: 'Nghe' }).click();
  check('Tab Nghe dùng chung lượt mở khóa: không mời xem thêm', (await dialog.getByRole('button', { name: 'Phát' }).count()) === 1 && (await dialog.getByRole('button', { name: 'Xem quảng cáo' }).count()) === 0);
  await dialog.getByRole('button', { name: 'Đóng' }).first().click();

  // ====================== Chống gian lận ======================
  const forged = await raw('POST', '/public/ads/web/rewarded', { headers: { 'X-Device-Key': KEY }, body: { slug: B.slug, transactionId: `${report.transactionId}x`, adUnit: AD_UNIT } });
  check('Mã giao dịch bị sửa: 400, lời chung không nói rõ lý do', forged.status === 400 && forged.json?.errorCode === 'AD_REWARD_REJECTED');
  const replay = await raw('POST', '/public/ads/web/rewarded', { headers: { 'X-Device-Key': KEY }, body: { slug: A.slug, transactionId: report.transactionId, adUnit: AD_UNIT } });
  check('Gửi lại đúng mã đã dùng: vẫn 200 nhưng không ghi thêm và không kéo dài hạn', replay.status === 200 && replay.json?.data?.recorded === false, `${replay.json?.data?.reason}`);
  const wrongHeritage = await raw('POST', '/public/ads/web/rewarded', { headers: { 'X-Device-Key': KEY }, body: { slug: B.slug, transactionId: report.transactionId, adUnit: AD_UNIT } });
  check('Mã của di sản A không mở được di sản B: 400', wrongHeritage.status === 400);
  const again = await raw('POST', '/public/ads/web/start', { headers: { 'X-Device-Key': KEY }, body: { slug: A.slug } });
  check('Di sản đang mở khóa thì không mời xem thêm để kéo dài hạn (alreadyUnlocked, không cấp mã)', again.status === 200 && again.json?.data?.alreadyUnlocked === true && again.json?.data?.transactionId === null);
  check('Hạn mở khóa không bị kéo dài bởi các lần thử trên', (await unlockStatus(KEY, A.slug)).expiresAt === unlocked.expiresAt);

  // ====================== Mở khóa theo di sản, thiết bị, ngôn ngữ ======================
  const startsBefore = callsTo(guest, '/public/ads/web/start').length;
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  const reopened = await openSummary(guest, A);
  await reopened.getByRole('tab', { name: 'Đọc' }).waitFor();
  check('Tải lại trang: di sản A vẫn mở khóa, hiện tóm tắt ngay, không xin mã mới', (await reopened.getByRole('button', { name: 'Xem quảng cáo' }).count()) === 0 && callsTo(guest, '/public/ads/web/start').length === startsBefore);
  await reopened.getByRole('button', { name: 'Đóng' }).first().click();

  await guest.evaluate(() => window.localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'en'));
  await guest.reload();
  const english = await openSummary(guest, A, 'Summary');
  await english.getByRole('tab', { name: 'Read' }).waitFor();
  check('Đổi sang tiếng Anh: vẫn mở khóa, không phải xem lại quảng cáo', (await english.getByRole('button', { name: 'Watch an ad' }).count()) === 0 && callsTo(guest, '/public/ads/web/start').length === startsBefore);
  await english.getByRole('button', { name: 'Close' }).first().click();
  await guest.evaluate(() => window.localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'vi'));

  const otherHeritage = await (async () => {
    await guest.goto(`${LEARNING_WEB}/di-san/${B.slug}`);
    return openSummary(guest, B);
  })();
  await otherHeritage.getByRole('button', { name: 'Xem quảng cáo' }).waitFor();
  check('Di sản B chưa mở khóa: vẫn hiện lời mời (mỗi di sản xem quảng cáo riêng)', !(await hasContent(otherHeritage)));
  await otherHeritage.getByRole('button', { name: 'Để sau' }).click();

  const stranger = await newPage();
  const strangerDialog = await openSummary(stranger, A);
  await strangerDialog.getByRole('button', { name: 'Xem quảng cáo' }).waitFor();
  const strangerKey = await deviceKeyOf(stranger);
  check('Thiết bị khác (mã khác) với cùng di sản A: vẫn hiện lời mời', strangerKey !== KEY && (await unlockStatus(strangerKey, A.slug)).unlocked === false);
  await stranger.context().close();

  // ====================== Di sản chưa có tóm tắt ======================
  await guest.goto(`${LEARNING_WEB}/di-san/${C.slug}`);
  await guest.getByRole('heading', { level: 1 }).first().waitFor();
  const adCallsBeforeC = apiCalls.filter((c) => c.page === guest && c.url.pathname.includes('/public/ads/')).length;
  await guest.getByRole('button', { name: 'Tóm tắt', exact: true }).click();
  await guest.getByText(/chưa có tóm tắt/).first().waitFor();
  check('Di sản chưa có tóm tắt: báo chưa có tóm tắt, không hiện lời mời xem quảng cáo', (await guest.getByRole('button', { name: 'Xem quảng cáo' }).count()) === 0 && apiCalls.filter((c) => c.page === guest && c.url.pathname.includes('/public/ads/')).length === adCallsBeforeC);

  // ====================== Hết hạn ======================
  if (SQL_DATABASE) {
    await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
    const query = `UPDATE ad_unlocks SET expires_at = DATEADD(SECOND, 8, SYSUTCDATETIME()) WHERE guest_device_id IN (SELECT id FROM guest_devices WHERE device_key = '${KEY}') AND heritage_id = ${A.id}`;
    execFileSync('sqlcmd', ['-S', '(localdb)\\MSSQLLocalDB', '-d', SQL_DATABASE, '-b', '-Q', query], { stdio: 'pipe' });
    const expiring = await openSummary(guest, A);
    await expiring.getByRole('tab', { name: 'Đọc' }).waitFor();
    check('Còn vài giây trước hạn: hộp thoại đang mở hiện tóm tắt', (await expiring.getByRole('button', { name: 'Xem quảng cáo' }).count()) === 0);
    await expiring.getByRole('button', { name: 'Xem quảng cáo' }).waitFor({ timeout: 25000 });
    check('Đúng hạn: hộp thoại đang mở quay về lời mời xem quảng cáo, nội dung cũ biến mất', (await expiring.getByRole('tab', { name: 'Đọc' }).count()) === 0);
    check('Máy chủ cũng báo hết hạn', (await unlockStatus(KEY, A.slug)).unlocked === false);
    await shot(guest, '05-het-han');
  } else {
    console.log('Bỏ qua thử hết hạn trên trình duyệt (không có SQL_DATABASE); đã có test đơn vị.');
  }

  // ====================== Khung điện thoại, ngôn ngữ khác ======================
  const phone = await newPage({ viewport: { width: 390, height: 844 }, locale: 'ko-KR', language: 'ko' });
  const phoneDialog = await openSummary(phone, A, '요약');
  await phoneDialog.getByRole('button', { name: '광고 보기' }).waitFor();
  check('Điện thoại 390 px, tiếng Hàn: lời mời bằng tiếng Hàn, không tràn ngang', (await noOverflow(phone)) && (await phoneDialog.getByRole('heading', { name: '광고를 보고 요약과 음성 해설 열기' }).count()) === 1);
  await shot(phone, '06-dien-thoai-tieng-han');
  await phone.context().close();

  // ====================== Học sinh không thấy quảng cáo ======================
  const student = await newPage();
  await student.goto(`${LEARNING_WEB}/dang-nhap`);
  await student.getByLabel('Mã học sinh').fill(studentCode);
  await student.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await student.getByRole('button', { name: 'Đăng nhập' }).click();
  await student.waitForURL(/\/hoc$/);
  const mark = apiCalls.length;
  const studentDialog = await openSummary(student, A);
  await studentDialog.getByRole('tab', { name: 'Đọc' }).waitFor();
  await student.waitForLoadState('networkidle');
  const studentCalls = apiCalls.slice(mark).filter((c) => c.page === student);
  check('Học sinh: hộp thoại mở thẳng tóm tắt, không có lời mời', (await studentDialog.getByRole('button', { name: /quảng cáo/ }).count()) === 0 && (await studentDialog.getByRole('tab', { name: 'Đọc', selected: true }).count()) === 1);
  check('Học sinh: không gọi API quảng cáo nào, không gửi mã thiết bị, không nạp thư viện của Google', !studentCalls.some((c) => c.url.pathname.includes('/public/ads/')) && studentCalls.every((c) => c.key === null) && googleCount(student) === 0);
  await shot(student, '07-hoc-sinh-khong-quang-cao');
  await student.context().close();

  // ====================== Web quản trị ======================
  const adminPage = await newPage();
  await adminPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await adminPage.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await adminPage.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await adminPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await adminPage.waitForURL(/\/quan-tri/);
  await adminPage.getByRole('link', { name: 'Khách và quảng cáo' }).click();
  await adminPage.getByRole('heading', { level: 1, name: 'Khách và quảng cáo' }).waitFor();
  const tiles = adminPage.getByRole('region', { name: 'Số liệu mở khóa bằng quảng cáo' });
  await tiles.waitFor();
  const stats = await call('GET', `/admin/ads/stats`, { token: admin });
  const tileText = (await tiles.innerText()).replace(/\s+/g, ' ');
  check('Thanh bên có mục "Khách và quảng cáo"; trang mở ở /quan-tri/khach-va-quang-cao', new URL(adminPage.url()).pathname === '/quan-tri/khach-va-quang-cao');
  check('Thẻ số "Lượt mở khóa" khớp với API', stats.unlocks.total >= 1 && tileText.includes(`Lượt mở khóa bằng quảng cáo ${stats.unlocks.total.toLocaleString('vi-VN')}`), `API ${stats.unlocks.total}; ${tileText.slice(0, 120)}`);
  const networks = adminPage.getByRole('table', { name: 'Lượt mở khóa theo mạng quảng cáo' });
  check('Mở khóa trên web ghi mạng Google Ad Manager, nguồn "Trình duyệt báo"', (await networks.innerText()).includes('Google Ad Manager') && (await networks.innerText()).includes('Trình duyệt báo'));
  const top = adminPage.getByRole('table', { name: 'Di sản được mở khóa nhiều nhất' });
  check('Di sản A có trong danh sách được mở khóa nhiều nhất', (await top.innerText()).includes(A.name));
  const rejected = stats.rejections.byReason.find((r) => r.reason === 'INVALID_WEB_TRANSACTION')?.count ?? 0;
  check('Lượt bị từ chối vì mã giao dịch web sai (hai lần thử gian lận ở trên) hiện trong bảng lý do', rejected >= 2 && (await adminPage.getByRole('table', { name: 'Lượt bị từ chối theo lý do' }).innerText()).includes('Mã giao dịch web sai hoặc hết hạn'), `API ${rejected}`);
  check('Có hai liên kết sang bảng điều khiển của Google và không có số doanh thu', (await adminPage.getByRole('link', { name: /Mở bảng điều khiển/ }).count()) === 2 && !/₫/.test(await adminPage.getByRole('region', { name: 'Doanh thu quảng cáo' }).innerText()));
  await shot(adminPage, '08-quan-tri-mo-khoa', { fullPage: true });
  await adminPage.getByRole('tab', { name: 'Khách và di sản' }).click();
  const guestTiles = adminPage.getByRole('region', { name: 'Số liệu khách tham quan' });
  await guestTiles.waitFor();
  check('Tab Khách và di sản: thiết bị khách hoạt động khớp với API', (await guestTiles.innerText()).includes(String(stats.guests.activeDevices)), `API ${stats.guests.activeDevices}`);
  await shot(adminPage, '09-quan-tri-khach', { fullPage: true });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await adminPage.waitForTimeout(300);
  check('Điện thoại 390 px: màn Khách và quảng cáo không tràn ngang', await noOverflow(adminPage));
  await shot(adminPage, '10-quan-tri-dien-thoai', { fullPage: true });
  await adminPage.context().close();
} finally {
  check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.join(' | '));
  check('Không có phản hồi 5xx từ API', badResponses.length === 0, badResponses.join(' | '));
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} bước đạt.`);
if (failed.length > 0) {
  console.log(`Lỗi: ${failed.map((r) => r.name).join('; ')}`);
  process.exit(1);
}
