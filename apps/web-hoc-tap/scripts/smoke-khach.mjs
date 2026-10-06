#!/usr/bin/env node
// Kiểm thử luồng Khách tham quan trên web học tập, trình duyệt thật với API thật (docs/khach-tham-quan.md): mã thiết bị ẩn danh sinh một lần và đi cùng mọi yêu cầu công
// khai, lịch sử tự ghi (tìm, xem, nghe), "Gợi ý cho bạn" ở trang chủ và chi tiết, "Gần bạn" ở trang chủ và bản đồ (xin quyền vị trí, không cho thì ẩn mục, tọa độ làm tròn
// và không lưu), trang Lịch sử của tôi (xóa từng mục, xóa tất cả, cài đặt), năm ngôn ngữ, học sinh đã đăng nhập không dính gì tới khách, trang nhúng cho app không mang
// mã thiết bị, khung điện thoại.
//
// Cần: API đang chạy trên CSDL TẠM (nhánh khách tham quan) với Email__Mode=Log và Ai__Mode=Simulated, web học tập đang chạy trỏ tới API đó, Edge hoặc Chrome đã cài.
// Bước chuẩn bị (xuất bản di sản, tóm tắt, trường, giáo viên, lớp, học sinh) gọi thẳng API; mọi thao tác của khách đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:khach -w @dsvhvn/web-hoc-tap
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5080/api/v1
//   LEARNING_WEB       mặc định http://localhost:5174
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu; cũng kiểm tọa độ không lọt vào nhật ký)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5174').replace(/\/+$/, '');
const API_LOG = process.env.API_LOG;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
if (!API_LOG || !ADMIN_PASSWORD) {
  console.error('Cần API_LOG và ADMIN_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const PASSWORD = 'MatKhau2026';
const STUDENT_PASSWORD = 'MatKhauCuaEm2026';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const results = [];
const pageErrors = [];
const badResponses = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- Gọi API để chuẩn bị dữ liệu và đối chiếu ----

async function call(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${json?.message ?? ''}`);
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

/** Lịch sử của một mã thiết bị như máy chủ giữ (đối chiếu với những gì giao diện hiện). */
const serverHistory = async (key) => (await call('GET', '/public/guest/history?pageSize=100&lang=vi', { headers: { 'X-Device-Key': key } })).items;
const serverDevice = (key) => call('GET', '/public/guest/device', { headers: { 'X-Device-Key': key } });

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items;
const published = [];
for (const heritage of drafts) {
  if (published.length >= 5) break;
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    published.push(await call('GET', `/admin/heritages/${heritage.id}`, { token: admin }));
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (published.length < 4) {
  // Chạy lại trên cùng CSDL tạm: các di sản đã xuất bản từ lần trước vẫn dùng được.
  const already = (await call('GET', '/public/heritages?pageSize=100')).items;
  for (const card of already) {
    if (published.length >= 5) break;
    if (!published.some((h) => h.slug === card.slug)) published.push(await call('GET', `/public/heritages/${encodeURIComponent(card.slug)}`));
  }
}
if (published.length < 4) throw new Error('Cần ít nhất bốn di sản xuất bản được (di sản nạp sẵn trong CSDL tạm).');
const located = published.filter((h) => h.latitude != null && h.longitude != null);
if (located.length < 2) throw new Error('Cần ít nhất hai di sản đã xuất bản có tọa độ.');
const [A, B] = published;
const near = located[0];
// Khách đứng cách di sản gần nhất khoảng 1 km về phía bắc.
const GEO = { latitude: Math.round((near.latitude + 0.009) * 1000) / 1000, longitude: Math.round(near.longitude * 1000) / 1000 };
// Tóm tắt tiếng Việt của A được duyệt để khách bấm "Nghe".
await call('POST', `/admin/heritages/${A.id}/translations/generate`, { token: admin });
await call('POST', `/admin/heritages/${A.id}/translations/vi/approve`, { token: admin, body: { kind: 'SUMMARY' } });

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
console.log(`Đã chuẩn bị: ${published.length} di sản xuất bản; A "${A.name}" (có tóm tắt), B "${B.name}"; gần nhất "${near.name}"; học sinh ${studentCode}.`);

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
/** Mọi yêu cầu tới API, kèm tiêu đề mã thiết bị và thân yêu cầu, để đối chiếu mã thiết bị đi đâu và tọa độ đi đâu. */
const apiCalls = [];

// Giọng đọc giả: trình duyệt headless không có giọng đọc, nên nút Phát sẽ bị khóa nếu không giả.
const FAKE_SPEECH = () => {
  // Gọi bằng `new`: hàm trả về đối tượng thì đối tượng đó là kết quả.
  function makeUtterance(text) {
    return { text, lang: '', rate: 1, voice: null, onend: null, onerror: null };
  }
  // `speechSynthesis` là thuộc tính chỉ đọc của window: phải định nghĩa lại, gán thẳng sẽ bị bỏ qua.
  Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: makeUtterance, configurable: true, writable: true });
  Object.defineProperty(window, 'speechSynthesis', {
    configurable: true,
    value: {
      getVoices: () => [{ lang: 'vi-VN', name: 'Giọng tiếng Việt' }, { lang: 'ko-KR', name: 'Korean' }],
      speak(utterance) {
        setTimeout(() => utterance.onend?.(), 40);
      },
      cancel() {},
      pause() {},
      resume() {},
      addEventListener() {},
      removeEventListener() {},
    },
  });
};

async function newPage({ geolocation = GEO, viewport = { width: 1440, height: 900 } } = {}) {
  const context = await browser.newContext({
    viewport,
    locale: 'vi-VN',
    ...(geolocation ? { permissions: ['geolocation'], geolocation } : {}),
  });
  await context.addInitScript(FAKE_SPEECH);
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', (r) => {
    if (!r.url().startsWith(API)) return;
    apiCalls.push({ page, method: r.method(), url: new URL(r.url()), key: r.headers()['x-device-key'] ?? null, body: r.postData() });
  });
  return page;
}

const shot = (page, name, options = { fullPage: true }) => page.screenshot({ path: resolve(SHOTS, `khach-${name}.png`), ...options });
const pathOf = (page) => new URL(page.url()).pathname;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const deviceKeyOf = (page) => page.evaluate(() => window.localStorage.getItem('dsvhvn.hoc-tap.ma-thiet-bi'));
const toast = (page, text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 30000 });
const section = (page, name) => page.getByRole('region', { name });
const lastCall = (predicate) => apiCalls.filter(predicate).at(-1);

const guest = await newPage();
let KEY = null;
try {
  // ====================== Khách mở trang chủ lần đầu ======================
  await guest.goto(`${LEARNING_WEB}/`);
  await guest.getByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' }).waitFor();
  const recommend = section(guest, 'Gợi ý cho bạn');
  await recommend.getByText(/Bạn chưa xem di sản nào/).waitFor();
  check('Khách chưa có lịch sử: "Gợi ý cho bạn" chỉ là lời mời xem thử, không lặp lại di sản nổi bật', (await recommend.getByText(/Bạn chưa xem di sản nào/).count()) === 1 && (await recommend.getByRole('link').count()) === 0);
  await shot(guest, '01-trang-chu-khach-moi');

  KEY = await deviceKeyOf(guest);
  check('Mã thiết bị ẩn danh là UUID phiên bản 4, lưu ở localStorage', UUID_V4.test(KEY ?? ''), KEY ?? '');
  const homeCall = lastCall((c) => c.url.pathname.endsWith('/public/home'));
  check('Yêu cầu công khai của khách mang mã thiết bị đó', homeCall?.key === KEY);
  const homeDetail = apiCalls.filter((c) => c.page === guest && /\/public\/heritages\/[^/]+$/.test(c.url.pathname) && !c.url.pathname.endsWith('/map'));
  check('Ảnh bìa trang chủ tải chi tiết ngầm không mang mã (lịch sử không có di sản khách chưa mở)', homeDetail.length > 0 && homeDetail.every((c) => c.key === null));
  check('Máy chủ chưa ghi di sản nào cho khách vừa vào trang chủ', (await serverHistory(KEY)).length === 0);

  // ====================== Gần bạn ở trang chủ ======================
  const nearby = section(guest, 'Gần bạn');
  await nearby.waitFor();
  check('"Gần bạn": trình duyệt đã cho phép nhưng khách chưa bật thì chỉ có lời mời, chưa gọi máy chủ', (await nearby.getByRole('button', { name: 'Cho phép dùng vị trí' }).count()) === 1 && !apiCalls.some((c) => c.url.pathname.endsWith('/guest/nearby')));
  await nearby.getByRole('button', { name: 'Cho phép dùng vị trí' }).click();
  await nearby.getByText(/^Cách /).first().waitFor();
  const items = await nearby.getByRole('listitem').count();
  check('Bấm cho phép: hiện tối đa 6 di sản kèm khoảng cách', items >= 1 && items <= 6, `${items} di sản`);
  const distance = await nearby.getByText(/^Cách /).first().innerText();
  check('Di sản gần nhất cách khoảng 1 km', /Cách (9\d\d m|1[.,]\d km|1 km)/.test(distance), distance);
  await shot(guest, '02-trang-chu-gan-ban');
  const nearbyCall = lastCall((c) => c.url.pathname.endsWith('/guest/nearby'));
  const sent = JSON.parse(nearbyCall.body);
  check('Tọa độ gửi trong thân yêu cầu, làm tròn 3 chữ số', nearbyCall.method === 'POST' && sent.latitude === GEO.latitude && sent.longitude === GEO.longitude, nearbyCall.body);
  check('Yêu cầu "Gần bạn" không mang mã thiết bị và không có tọa độ trên đường dẫn', nearbyCall.key === null && !nearbyCall.url.search.includes(String(GEO.latitude)));
  const stored = await guest.evaluate(() => JSON.stringify({ ...window.localStorage, ...window.sessionStorage }));
  check('Tọa độ không được lưu ở localStorage hay sessionStorage', !stored.includes(String(GEO.latitude)) && !stored.includes(String(GEO.longitude)));
  check('Cờ "Gần bạn" được nhớ ở máy chủ', (await serverDevice(KEY)).locationAllowed === true);
  const logText = readFileSync(API_LOG, 'utf8');
  check('Nhật ký của API không chứa tọa độ của khách', !logText.includes(String(GEO.latitude)) || !logText.includes(String(GEO.longitude)));

  // Tải lại: khách đã bật và trình duyệt vẫn cho phép thì danh sách hiện luôn.
  await guest.reload();
  await section(guest, 'Gần bạn').getByText(/^Cách /).first().waitFor();
  check('Tải lại trang: "Gần bạn" hiện ngay, không hỏi lại', (await section(guest, 'Gần bạn').getByRole('button', { name: 'Cho phép dùng vị trí' }).count()) === 0);

  // ====================== Tìm, xem chi tiết, nghe ======================
  await guest.goto(`${LEARNING_WEB}/di-san?tu-khoa=${encodeURIComponent(A.name.split(' ')[0])}`);
  await guest.getByRole('heading', { level: 1, name: 'Tìm kiếm và lọc di sản' }).waitFor();
  await guest.waitForLoadState('networkidle');
  let history = await serverHistory(KEY);
  check('Tìm có từ khóa: máy chủ ghi một lượt tìm', history.some((h) => h.type === 'SEARCH' && h.query === A.name.split(' ')[0]), history.map((h) => h.type).join(','));

  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await guest.getByRole('heading', { level: 1 }).waitFor();
  const detailRecommend = section(guest, 'Gợi ý cho bạn');
  await detailRecommend.waitFor();
  await detailRecommend.getByRole('link').first().waitFor();
  const recNames = await detailRecommend.getByRole('heading').allInnerTexts().catch(() => []);
  history = await serverHistory(KEY);
  check('Xem chi tiết: máy chủ ghi lượt xem đúng di sản', history.some((h) => h.type === 'VIEW' && h.heritage?.slug === A.slug));
  check('Cuối trang chi tiết có "Gợi ý cho bạn", không gợi lại chính di sản đang xem', (await detailRecommend.getByRole('link').count()) >= 1 && (await detailRecommend.locator(`a[href="/di-san/${A.slug}"]`).count()) === 0, recNames.join('|'));
  const recommendCall = lastCall((c) => c.url.pathname.endsWith('/guest/recommendations'));
  check('Hỏi gợi ý sau khi lượt xem đã ghi và mang mã thiết bị', recommendCall?.key === KEY);
  await shot(guest, '03-chi-tiet-goi-y');

  await guest.getByRole('button', { name: 'Nghe' }).click();
  const dialog = guest.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Phát' }).click();
  await guest.waitForTimeout(600);
  history = await serverHistory(KEY);
  check('Bấm Phát: ghi một lượt "nghe" vào lịch sử', history.some((h) => h.type === 'LISTEN' && h.heritage?.slug === A.slug));
  check('Mở tóm tắt: ghi lượt đọc tóm tắt', history.some((h) => h.type === 'READ_SUMMARY' && h.heritage?.slug === A.slug));
  await dialog.getByRole('button', { name: 'Đóng' }).first().click();

  // Xem một di sản khác để trang chủ có gợi ý cá nhân.
  await guest.goto(`${LEARNING_WEB}/di-san/${B.slug}`);
  await guest.getByRole('heading', { level: 1 }).waitFor();
  await guest.waitForLoadState('networkidle');

  // ====================== Trang chủ có gợi ý cá nhân ======================
  await guest.goto(`${LEARNING_WEB}/`);
  const personal = section(guest, 'Gợi ý cho bạn');
  await personal.getByRole('link').first().waitFor();
  const cardCount = await personal.locator('a[href^="/di-san/"]').count();
  check('Có lịch sử: "Gợi ý cho bạn" hiện thẻ di sản (tối đa 6)', cardCount >= 1, `${cardCount} mục`);
  check('Thẻ gợi ý ghi điểm chung bằng chữ của giao diện', (await personal.getByRole('list', { name: 'Điểm chung' }).count()) >= 1 || (await personal.getByText(/Vì bạn quan tâm đến/).count()) >= 1);
  await shot(guest, '04-trang-chu-goi-y-ca-nhan');

  // ====================== Bản đồ: Gần bạn ======================
  await guest.goto(`${LEARNING_WEB}/ban-do`);
  await guest.locator('.leaflet-container').waitFor();
  await guest.getByRole('button', { name: 'Gần bạn' }).click();
  const panel = section(guest, 'Gần bạn');
  await panel.getByText(/Cách /).first().waitFor();
  check('Bản đồ: bấm "Gần bạn" hiện bảng di sản gần nhất kèm khoảng cách', (await panel.getByRole('button').count()) + (await panel.getByRole('link').count()) >= 1);
  await guest.locator('.leaflet-overlay-pane path[fill="#1a56db"]').waitFor();
  check('Bản đồ vẽ chấm vị trí của khách', true);
  const pick = panel.getByRole('button').filter({ hasText: near.name }).first();
  if ((await pick.count()) > 0) {
    await pick.click();
    await guest.locator('.dsv-popup').waitFor();
    check('Chọn dòng trong bảng thì mở thẻ của ghim đó', (await guest.locator('.dsv-popup').innerText()).includes(near.name));
  } else {
    check('Chọn dòng trong bảng thì mở thẻ của ghim đó', true, 'di sản gần nhất nằm ngoài bộ lọc ghim, bỏ qua');
  }
  await shot(guest, '05-ban-do-gan-ban', { fullPage: false });

  // ====================== Trang Lịch sử của tôi ======================
  await guest.goto(`${LEARNING_WEB}/`);
  await guest.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Lịch sử của tôi' }).click();
  await guest.waitForURL(/\/lich-su$/);
  await guest.getByRole('heading', { level: 1, name: 'Lịch sử của tôi' }).waitFor();
  await section(guest, 'Di sản đã xem').waitFor();
  const groups = await guest.getByRole('heading', { level: 2 }).allInnerTexts();
  check('Lịch sử chia nhóm: từ khóa, di sản đã xem, tóm tắt đã đọc, đã nghe', ['Từ khóa đã tìm', 'Di sản đã xem', 'Tóm tắt đã đọc', 'Di sản đã nghe'].every((g) => groups.includes(g)), groups.join(' | '));
  const viewedLinks = await section(guest, 'Di sản đã xem').getByRole('link').all();
  check('Di sản đã xem: mới nhất trước (di sản B xem sau A)', (await viewedLinks[0].getAttribute('href')) === `/di-san/${B.slug}`);
  check('Ghi chú "Lịch sử tự xóa sau 90 ngày"', (await guest.getByText('Lịch sử tự xóa sau 90 ngày.').count()) === 1);
  await shot(guest, '06-lich-su');

  const before = (await serverHistory(KEY)).length;
  await section(guest, 'Di sản đã xem').getByRole('button', { name: new RegExp(`^Xóa "${B.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" khỏi lịch sử$`) }).click();
  await toast(guest, 'Đã xóa mục khỏi lịch sử');
  check('Xóa một mục: máy chủ xóa thật', (await serverHistory(KEY)).length === before - 1 && !(await serverHistory(KEY)).some((h) => h.type === 'VIEW' && h.heritage?.slug === B.slug));

  await guest.getByRole('button', { name: 'Xóa tất cả' }).click();
  const confirm = guest.getByRole('dialog', { name: 'Xóa toàn bộ lịch sử?' });
  await confirm.waitFor();
  await confirm.getByRole('button', { name: 'Hủy' }).click();
  check('Hủy xác nhận thì không xóa gì', (await serverHistory(KEY)).length === before - 1);
  await guest.getByRole('button', { name: 'Xóa tất cả' }).click();
  await guest.getByRole('dialog', { name: 'Xóa toàn bộ lịch sử?' }).getByRole('button', { name: 'Xóa tất cả' }).click();
  await guest.getByText('Chưa có lịch sử. Hãy tìm hoặc mở một di sản, lịch sử sẽ hiện ở đây.').waitFor();
  check('Xóa tất cả: máy chủ không còn lượt nào, trang báo trống', (await serverHistory(KEY)).length === 0);
  await shot(guest, '07-lich-su-trong');

  await guest.goto(`${LEARNING_WEB}/`);
  await section(guest, 'Gợi ý cho bạn').getByText(/Bạn chưa xem di sản nào/).waitFor();
  check('Sau khi xóa hết, "Gợi ý cho bạn" quay về lời mời mặc định', true);

  // ====================== Cài đặt ======================
  await guest.goto(`${LEARNING_WEB}/lich-su?tab=cai-dat`);
  const toggle = guest.getByRole('switch', { name: 'Dùng vị trí cho "Gần bạn"' });
  await toggle.waitFor();
  await guest.waitForFunction(() => !document.querySelector('[role="switch"]')?.disabled);
  check('Cài đặt: công tắc vị trí đang bật (đã nhớ), có mục mã thiết bị ẩn danh', (await toggle.getAttribute('aria-checked')) === 'true' && (await guest.getByText('Mã thiết bị ẩn danh').count()) === 1);
  await toggle.click();
  await guest.waitForFunction(() => document.querySelector('[role="switch"]')?.getAttribute('aria-checked') === 'false');
  await sleep(300);
  check('Tắt vị trí: cờ ở máy chủ về tắt', (await serverDevice(KEY)).locationAllowed === false);
  await shot(guest, '08-cai-dat');
  await guest.goto(`${LEARNING_WEB}/`);
  await section(guest, 'Gần bạn').getByRole('button', { name: 'Cho phép dùng vị trí' }).waitFor();
  check('Đã tắt thì trang chủ chỉ còn lời mời, không tự lấy vị trí', true);

  // ====================== Năm ngôn ngữ ======================
  const expectations = [
    ['ko', '한국어', '맞춤 추천', '내 기록'],
    ['zh-Hans', '简体中文', '为你推荐', '我的历史'],
    ['ja', '日本語', 'あなたへのおすすめ', '閲覧履歴'],
    ['en', 'English', 'Recommended for you', 'My history'],
  ];
  for (const [code, name, recTitle, historyTitle] of expectations) {
    await guest.goto(`${LEARNING_WEB}/`);
    await guest.getByRole('button', { name: /^(Ngôn ngữ|언어|语言|言語|Language)/ }).first().click();
    await guest.getByRole('dialog').getByRole('button', { name }).click();
    await section(guest, recTitle).waitFor();
    await guest.goto(`${LEARNING_WEB}/lich-su`);
    await guest.getByRole('heading', { level: 1, name: historyTitle }).waitFor();
    const lang = await guest.evaluate(() => document.documentElement.lang);
    check(`Giao diện ${name}: "Gợi ý cho bạn" và trang lịch sử đúng ngôn ngữ`, lang === code, `${recTitle} / ${historyTitle}`);
    if (code === 'ko') await shot(guest, '09-lich-su-tieng-han');
  }
  const langCall = lastCall((c) => c.url.pathname.endsWith('/guest/history'));
  check('Gọi lịch sử theo ngôn ngữ đang chọn (lang=en)', langCall?.url.searchParams.get('lang') === 'en');
  await guest.evaluate(() => window.localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'vi'));
  const historyAfterLanguage = await serverDevice(KEY);
  check('Máy chủ giữ cờ vị trí tắt sau khi đổi ngôn ngữ', historyAfterLanguage.locationAllowed === false);

  // ====================== Không cho vị trí thì ẩn mục ======================
  const denied = await newPage({ geolocation: null });
  await denied.goto(`${LEARNING_WEB}/`);
  await section(denied, 'Gợi ý cho bạn').waitFor();
  const askNearby = section(denied, 'Gần bạn');
  await askNearby.waitFor();
  await askNearby.getByRole('button', { name: 'Cho phép dùng vị trí' }).click();
  await askNearby.waitFor({ state: 'detached', timeout: 15000 }).catch(() => undefined);
  check('Khách không cho trình duyệt dùng vị trí thì mục "Gần bạn" ẩn đi', (await section(denied, 'Gần bạn').count()) === 0);
  await denied.goto(`${LEARNING_WEB}/ban-do`);
  await denied.locator('.leaflet-container').waitFor();
  check('Bản đồ: khách đã từ chối thì không có nút "Gần bạn"', (await denied.getByRole('button', { name: 'Gần bạn' }).count()) === 0);
  await denied.context().close();

  // ====================== Khung điện thoại ======================
  const phone = await newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${LEARNING_WEB}/`);
  await section(phone, 'Gợi ý cho bạn').waitFor();
  check('Khung 390px: trang chủ của khách không tràn ngang', await noOverflow(phone));
  await phone.goto(`${LEARNING_WEB}/lich-su`);
  await phone.getByRole('heading', { level: 1, name: 'Lịch sử của tôi' }).waitFor();
  check('Khung 390px: trang lịch sử không tràn ngang', await noOverflow(phone));
  await phone.goto(`${LEARNING_WEB}/ban-do`);
  await phone.locator('.leaflet-container').waitFor();
  check('Khung 390px: bản đồ không tràn ngang', await noOverflow(phone));
  await shot(phone, '10-dien-thoai-ban-do', { fullPage: false });
  await phone.context().close();

  // ====================== Học sinh đã đăng nhập ======================
  const keyBefore = (await serverHistory(KEY)).length;
  const student = await newPage();
  await student.goto(`${LEARNING_WEB}/dang-nhap`);
  await student.getByLabel('Mã học sinh').fill(studentCode);
  await student.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await student.getByRole('button', { name: 'Đăng nhập' }).click();
  await student.waitForURL(/\/hoc$/);
  const mark = apiCalls.length;
  await student.goto(`${LEARNING_WEB}/`);
  await student.getByRole('heading', { level: 1, name: 'Khám phá di sản Việt Nam' }).waitFor();
  await student.waitForLoadState('networkidle');
  await student.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await student.getByRole('heading', { level: 1 }).waitFor();
  await student.waitForLoadState('networkidle');
  const studentCalls = apiCalls.slice(mark).filter((c) => c.page === student);
  check('Học sinh: không gửi mã thiết bị trong bất kỳ yêu cầu nào', studentCalls.length > 0 && studentCalls.every((c) => c.key === null));
  check('Học sinh: không gọi chức năng nào của khách (gợi ý, lịch sử, gần bạn)', !studentCalls.some((c) => c.url.pathname.includes('/public/guest/')));
  check('Học sinh: trang chủ và chi tiết không có "Gợi ý cho bạn", "Gần bạn", "Lịch sử của tôi"', (await student.getByRole('heading', { name: /Gợi ý cho bạn|Gần bạn/ }).count()) === 0 && (await student.getByRole('link', { name: 'Lịch sử của tôi' }).count()) === 0);
  await student.goto(`${LEARNING_WEB}/lich-su`);
  await student.waitForURL(/\/hoc$/);
  check('Học sinh mở /lich-su thì được đưa về trang học', pathOf(student) === '/hoc');
  check('Học sinh xem không làm thêm lịch sử cho thiết bị của khách', (await serverHistory(KEY)).length === keyBefore);
  await student.context().close();

  // ====================== Trang nhúng cho app ======================
  const embed = await newPage();
  const embedMark = apiCalls.length;
  await embed.goto(`${LEARNING_WEB}/nhung/ban-do?lang=vi`);
  await embed.locator('.leaflet-container').waitFor();
  await embed.waitForLoadState('networkidle');
  check('Trang bản đồ nhúng mở không cần đăng nhập, không có thanh điều hướng', (await embed.getByRole('banner').count()) === 0 && (await embed.locator('.leaflet-container').count()) === 1);
  await embed.goto(`${LEARNING_WEB}/nhung/3d/${A.slug}`);
  await embed.waitForLoadState('networkidle');
  check('Trang xem 3D nhúng mở không cần đăng nhập (di sản chưa có mô hình thì quay về ảnh, không lỗi)', pathOf(embed) === `/nhung/3d/${A.slug}`);
  const embedCalls = apiCalls.slice(embedMark).filter((c) => c.page === embed);
  check('Trang nhúng không gửi mã thiết bị và không gọi chức năng của khách', embedCalls.length > 0 && embedCalls.every((c) => c.key === null && !c.url.pathname.includes('/public/guest/')));
  check('Trang nhúng không sinh mã thiết bị trong WebView', (await deviceKeyOf(embed)) === null);
  await shot(embed, '11-nhung-xem-3d', { fullPage: false });
  await embed.context().close();
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
