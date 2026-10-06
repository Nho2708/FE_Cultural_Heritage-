#!/usr/bin/env node
// Kiểm thử luồng Đa ngôn ngữ, AI dịch và tóm tắt di sản, nghe thuyết minh trên trình duyệt thật với API thật (docs/da-ngon-ngu.md): quản trị hệ thống bấm
// "Dịch và tóm tắt bằng AI" ở web quản trị, sửa và duyệt bản dịch, tóm tắt tiếng Anh và tóm tắt tiếng Việt, từ chối một bản; khách xem web học tập bằng cả năm
// ngôn ngữ (ngôn ngữ mặc định theo trình duyệt, chọn bằng hộp thoại, nhớ trên máy), bản dịch máy kèm nhãn, thiếu bản dịch thì hiện tiếng Việt kèm thông báo,
// tóm tắt và nghe thuyết minh, bản đồ và dòng thời gian theo ngôn ngữ, khung điện thoại; học sinh đã đăng nhập luôn xem tiếng Việt.
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật) và Ai:Mode=Simulated (không gọi nhà cung cấp AI), cả hai ứng dụng web đang chạy trỏ
// tới API đó, Edge hoặc Chrome đã cài trên máy. Bước chuẩn bị (xuất bản di sản, trường, giáo viên, lớp, học sinh) gọi thẳng API; mọi thao tác với bản dịch đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:da-ngon-ngu -w @dsvhvn/web-hoc-tap
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5080/api/v1
//   ADMIN_WEB          mặc định http://localhost:5173
//   LEARNING_WEB       mặc định http://localhost:5174
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5173').replace(/\/+$/, '');
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
const results = [];
const pageErrors = [];
const badResponses = [];
const publicCalls = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- Gọi API để chuẩn bị dữ liệu ----

async function call(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0);
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
if (published.length < 3) throw new Error('Cần ba di sản có dòng thời gian xuất bản được (di sản đợt 1 trong CSDL tạm).');
// A: dịch bằng giao diện rồi duyệt; B: dịch bằng API, tiếng Anh bị từ chối bằng giao diện; C: chưa dịch (không có tóm tắt).
const [A, B, C] = published;
await call('POST', `/admin/heritages/${B.id}/translations/generate`, { token: admin });

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
console.log(`Đã chuẩn bị: di sản A "${A.name}", B "${B.name}", C "${C.name}"; học sinh ${studentCode}.`);

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', ...options });
  const page = await context.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', (r) => {
    if (r.url().startsWith(`${API}/public/`)) publicCalls.push(new URL(r.url()));
  });
  return page;
}

const shot = (page, name, options = { fullPage: true }) => page.screenshot({ path: resolve(SHOTS, `da-ngon-ngu-${name}.png`), ...options });
const pathOf = (page) => new URL(page.url()).pathname;
// Chữ thông báo so khớp phân biệt hoa thường (chuỗi trần thì Playwright so không phân biệt, dễ trùng chữ cố định của trang).
const toast = (page, text) => page.getByRole('status').filter({ hasText: typeof text === 'string' ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : text }).first().waitFor({ timeout: 60000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const lastLang = (fragment) => publicCalls.filter((u) => u.pathname.includes(fragment)).at(-1)?.searchParams.get('lang');

const adminPage = await newPage();
try {
  // ====================== Quản trị hệ thống: dịch, sửa, duyệt, từ chối ======================
  await adminPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await adminPage.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await adminPage.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await adminPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await adminPage.waitForURL(/\/quan-tri/);
  await adminPage.getByRole('link', { name: 'Bản dịch' }).first().waitFor();
  check('Quản trị hệ thống đăng nhập; thanh bên có mục Bản dịch', true);

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san?ban-dich=chua-dich`);
  await adminPage.getByRole('table', { name: 'Danh sách di sản' }).waitFor();
  check('Quản lý di sản: cột Bản dịch, bộ lọc Chưa dịch đưa lên URL', pathOf(adminPage) === '/quan-tri/di-san' && (await adminPage.getByRole('columnheader', { name: 'Bản dịch' }).count()) === 1);

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san/${A.id}`);
  await adminPage.getByText(/Di sản đã xuất bản nhưng chưa có bản dịch/).waitFor();
  check('Sau khi xuất bản: dải nhắc "Dịch và tóm tắt bằng AI" khi chưa có bản dịch', true);
  await adminPage.getByRole('button', { name: 'Mở tab Bản dịch và tóm tắt' }).click();
  const overview = adminPage.getByRole('table', { name: 'Bản dịch và tóm tắt theo ngôn ngữ' });
  await overview.waitFor();
  check('Tab Bản dịch và tóm tắt: bảng năm ngôn ngữ, tiếng Việt là bản gốc', (await overview.getByRole('row').count()) === 6 && (await overview.getByText('Bản gốc tiếng Việt, không cần dịch').count()) === 1);
  await shot(adminPage, '01-quan-tri-tab-ban-dich-chua-dich');

  await adminPage.getByRole('button', { name: 'Dịch và tóm tắt bằng AI' }).click();
  await adminPage.getByText(/AI đang xử lý, vui lòng đợi trong giây lát/).waitFor();
  check('Bấm dịch: hiện trạng thái đang xử lý', true);
  await toast(adminPage, 'Đã dịch và tóm tắt di sản');
  const rows = await overview.getByRole('row').all();
  const rowText = async (i) => ((await rows[i].innerText()) ?? '').replace(/\s+/g, ' ');
  check('Sau khi dịch: tiếng Anh chờ duyệt, tóm tắt tiếng Việt chờ duyệt', /Chờ duyệt/.test(await rowText(1)) && /Chờ duyệt/.test(await rowText(2)));
  const machineRows = await Promise.all([3, 4, 5].map(rowText));
  check('Sau khi dịch: tiếng Hàn, Trung, Nhật là bản dịch máy hiện ngay', machineRows.every((text) => /Bản dịch máy/.test(text)));
  await shot(adminPage, '02-quan-tri-tab-ban-dich-da-dich');

  // Mở bản dịch tiếng Anh từ liên kết "Duyệt" của tab.
  await rows[2].getByRole('link', { name: 'Duyệt' }).first().click();
  await adminPage.waitForURL(/\/quan-tri\/ban-dich\?/);
  const panel = adminPage.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
  await panel.getByRole('heading', { level: 3, name: /Bản chờ duyệt — English/ }).waitFor();
  check('Duyệt bản dịch: hai cột, bản gốc tiếng Việt bên trái, bản tiếng Anh sửa được bên phải', (await panel.getByLabel('Mô tả ngắn').count()) === 1 && (await panel.getByText('Chỉ đọc').count()) >= 1);
  const english = await panel.getByLabel('Mô tả ngắn').inputValue();
  check('Bản dịch giả lập gắn tiền tố mã ngôn ngữ đích', english.startsWith('[en]'), english.slice(0, 40));
  await panel.getByLabel('Mô tả ngắn').fill(`${english} (đã biên tập)`);
  await shot(adminPage, '03-quan-tri-duyet-hai-cot');
  await panel.getByRole('button', { name: 'Lưu chỉnh sửa' }).click();
  await toast(adminPage, 'Lưu bản dịch thành công');
  await panel.getByRole('button', { name: 'Duyệt', exact: true }).click();
  await toast(adminPage, /Đã duyệt bản dịch/);
  await adminPage.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' }).waitFor({ state: 'hidden' });
  check('Duyệt bản dịch tiếng Anh: khung đóng, hàng chờ cập nhật', true);

  for (const [summary, label] of [['vi', 'tóm tắt tiếng Việt'], ['en', 'tóm tắt tiếng Anh']]) {
    await adminPage.goto(`${ADMIN_WEB}/quan-tri/ban-dich?muc=${A.id}.tom-tat.${summary}`);
    const p = adminPage.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
    await p.getByLabel('Bản ngắn (để nghe)').waitFor();
    await p.getByRole('button', { name: 'Duyệt', exact: true }).click();
    await toast(adminPage, /Đã duyệt tóm tắt/);
    await p.waitFor({ state: 'hidden' });
    check(`Duyệt ${label}`, true);
  }

  // Di sản B: từ chối bản dịch tiếng Anh kèm lý do.
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/ban-dich?di-san=${B.id}&muc=${B.id}.ban-dich.en`);
  const panelB = adminPage.getByRole('region', { name: 'Chi tiết bản dịch hoặc tóm tắt' });
  await panelB.getByRole('button', { name: 'Từ chối' }).click();
  const reject = adminPage.getByRole('dialog', { name: 'Từ chối và yêu cầu dịch lại' });
  await reject.getByLabel('Lý do (không bắt buộc)').fill('Tên giai đoạn dịch chưa chính xác');
  await shot(adminPage, '04-quan-tri-tu-choi');
  await reject.getByRole('button', { name: 'Từ chối' }).click();
  await toast(adminPage, /Đã từ chối bản dịch/);
  check('Từ chối bản dịch tiếng Anh của di sản B kèm lý do', true);

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/ban-dich?tab=da-duyet`);
  await adminPage.getByRole('table', { name: 'Danh sách đã duyệt' }).waitFor();
  const approvedTable = adminPage.getByRole('table', { name: 'Danh sách đã duyệt' });
  check('Tab Đã duyệt có đủ ba mục của di sản A (bản dịch, tóm tắt tiếng Việt, tóm tắt tiếng Anh)', (await approvedTable.getByRole('row').filter({ hasText: A.name }).count()) >= 3);
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/ban-dich?tab=ban-dich-may`);
  await adminPage.getByRole('table', { name: 'Danh sách bản dịch máy' }).waitFor();
  check('Tab Bản dịch máy liệt kê bản Hàn, Trung, Nhật', (await adminPage.getByRole('table', { name: 'Danh sách bản dịch máy' }).getByRole('row').count()) > 6);
  await shot(adminPage, '05-quan-tri-ban-dich-may');
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/ban-dich?tab=bi-tu-choi`);
  await adminPage.getByRole('table', { name: 'Danh sách bị từ chối' }).waitFor();
  check('Tab Bị từ chối có bản đã từ chối của di sản B', (await adminPage.getByRole('table', { name: 'Danh sách bị từ chối' }).getByRole('row').filter({ hasText: B.name }).count()) >= 1);

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/nhat-ky`);
  await adminPage.getByRole('table').first().waitFor();
  check('Nhật ký thao tác ghi duyệt và từ chối bản dịch', (await adminPage.getByText('Duyệt bản dịch hoặc tóm tắt di sản').count()) > 0 && (await adminPage.getByText('Từ chối bản dịch hoặc tóm tắt di sản').count()) > 0);

  // ====================== Khách: ngôn ngữ theo trình duyệt, chọn ngôn ngữ, nội dung ======================
  const korean = await newPage({ locale: 'ko-KR' });
  await korean.goto(`${LEARNING_WEB}/`);
  await korean.getByRole('heading', { level: 1, name: '베트남의 문화유산을 만나 보세요' }).waitFor();
  check('Lần đầu mở: ngôn ngữ theo trình duyệt (ko-KR) và lang của trang', (await korean.evaluate(() => document.documentElement.lang)) === 'ko' && lastLang('/public/home') === 'ko');
  await shot(korean, '10-khach-trang-chu-han');
  await korean.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await korean.getByRole('heading', { level: 1 }).waitFor();
  const koreanName = await korean.getByRole('heading', { level: 1 }).innerText();
  check('Chi tiết bằng tiếng Hàn: bản dịch máy dịch lại từ bản tiếng Anh đã duyệt, kèm nhãn', koreanName.startsWith('[ko] [en]') && (await korean.getByText('기계 번역이므로 정확하지 않을 수 있습니다.').count()) > 0, koreanName);
  await shot(korean, '11-khach-chi-tiet-han');
  await korean.goto(`${LEARNING_WEB}/di-san?tu-khoa=${encodeURIComponent('[ko]')}`);
  await korean.getByRole('heading', { level: 2, name: /유산 \d+곳/ }).waitFor();
  const koreanHits = Number(((await korean.getByRole('heading', { level: 2, name: /유산 \d+곳/ }).innerText()).match(/\d+/) ?? ['0'])[0]);
  check('Tìm kiếm khớp bản dịch của ngôn ngữ đang chọn (từ khóa "[ko]")', koreanHits >= 2, `${koreanHits} di sản`);
  check('Danh sách có chú thích bản dịch máy', (await korean.getByText('일부 유산의 이름과 설명은 기계 번역이므로 정확하지 않을 수 있습니다.').count()) > 0);
  await korean.goto(`${LEARNING_WEB}/ban-do`);
  await korean.getByText(/지도에 위치가 있는 유산/).waitFor();
  await korean.locator('.dsv-map-label').first().waitFor();
  check('Bản đồ bằng tiếng Hàn: nhãn hai quần đảo kèm Việt Nam, nút phóng to', (await korean.getByText('호앙사 군도(베트남)').count()) === 1 && (await korean.getByText('쯔엉사 군도(베트남)').count()) === 1 && (await korean.getByTitle('확대').count()) === 1);
  await shot(korean, '12-khach-ban-do-han');
  await korean.close();

  const guest = await newPage({ locale: 'en-US' });
  await guest.goto(`${LEARNING_WEB}/`);
  await guest.getByRole('heading', { level: 1, name: "Discover Viet Nam's cultural heritage" }).waitFor();
  check('Trình duyệt en-US: mặc định tiếng Anh', lastLang('/public/home') === 'en');
  await guest.getByRole('button', { name: 'Language: English' }).click();
  const dialog = guest.getByRole('dialog', { name: 'Choose a language' });
  const labels = await dialog.getByRole('button').allInnerTexts();
  check('Hộp thoại Chọn ngôn ngữ: năm lựa chọn viết bằng chính ngôn ngữ đó', ['Tiếng Việt', 'English', '한국어', '简体中文', '日本語'].every((l) => labels.includes(l)), labels.join(' | '));
  await shot(guest, '13-khach-chon-ngon-ngu', { fullPage: false });
  await dialog.getByRole('button', { name: '日本語' }).click();
  await guest.getByRole('heading', { level: 1, name: 'ベトナムの文化遺産を探そう' }).waitFor();
  await guest.reload();
  await guest.getByRole('heading', { level: 1, name: 'ベトナムの文化遺産を探そう' }).waitFor();
  check('Chọn tiếng Nhật: nhớ trên máy sau khi tải lại trang', (await guest.evaluate(() => localStorage.getItem('dsvhvn.hoc-tap.ngon-ngu'))) === 'ja');
  await guest.getByRole('button', { name: '言語: 日本語' }).click();
  await guest.getByRole('dialog', { name: '言語を選択' }).getByRole('button', { name: 'English' }).click();
  await guest.getByRole('heading', { level: 1, name: "Discover Viet Nam's cultural heritage" }).waitFor();

  // Di sản A bằng tiếng Anh: bản đã duyệt.
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await guest.getByRole('heading', { level: 1 }).waitFor();
  const englishName = await guest.getByRole('heading', { level: 1 }).innerText();
  check('Di sản A bằng tiếng Anh: hiện bản đã duyệt, không có thông báo thiếu bản dịch', englishName.startsWith('[en]') && (await guest.getByText(/is not yet available in English/).count()) === 0, englishName);
  await shot(guest, '14-khach-chi-tiet-anh');
  // Di sản B: tiếng Anh bị từ chối nên hiện tiếng Việt kèm thông báo.
  await guest.goto(`${LEARNING_WEB}/di-san/${B.slug}`);
  await guest.getByRole('heading', { level: 1 }).waitFor();
  check('Di sản B (tiếng Anh bị từ chối): hiện tiếng Việt kèm thông báo thiếu bản dịch', (await guest.getByRole('heading', { level: 1 }).innerText()) === B.name && (await guest.getByText('This content is not yet available in English. Showing the Vietnamese version.').count()) > 0);
  await shot(guest, '15-khach-chi-tiet-thieu-ban-dich');
  // Di sản C: chưa dịch, chưa có tóm tắt.
  await guest.goto(`${LEARNING_WEB}/di-san/${C.slug}`);
  await guest.getByRole('button', { name: 'Summary' }).click();
  await guest.getByText('This heritage site has no summary yet. You can still read the full content below.').waitFor();
  check('Di sản C chưa có tóm tắt: báo một câu, không mở hộp thoại, không có cổng quảng cáo', (await guest.getByRole('dialog').count()) === 0);

  // Tóm tắt và nghe thuyết minh của di sản A.
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await guest.getByRole('button', { name: 'Summary' }).click();
  const summaryDialog = guest.getByRole('dialog', { name: 'SUMMARY AND AUDIO GUIDE' });
  await summaryDialog.getByRole('tab', { name: 'Read', selected: true }).waitFor();
  await summaryDialog.getByText(/\[en\]/).first().waitFor();
  check('Tóm tắt tiếng Anh: tab Đọc hiện bản chi tiết đã lưu sẵn', lastLang('/summary') === 'en');
  await shot(guest, '16-khach-tom-tat-doc', { fullPage: false });
  await summaryDialog.getByRole('tab', { name: 'Listen' }).click();
  const voices = await guest.evaluate(() => (window.speechSynthesis ? window.speechSynthesis.getVoices().map((v) => v.lang) : null));
  console.log(`Giọng đọc của trình duyệt kiểm thử: ${voices === null ? 'không có Web Speech API' : `${voices.length} giọng (${[...new Set(voices)].slice(0, 6).join(', ')})`}`);
  await summaryDialog.getByRole('button', { name: 'Play' }).or(summaryDialog.getByText('This device has no voice for this language')).first().waitFor();
  const noVoice = (await summaryDialog.getByText('This device has no voice for this language').count()) > 0;
  if (noVoice) {
    check('Thiết bị không có giọng tiếng Anh: báo kèm hướng dẫn, nút Phát khóa, vẫn hiện chữ', await summaryDialog.getByRole('button', { name: 'Play' }).isDisabled());
  } else {
    await summaryDialog.getByRole('button', { name: 'Play' }).click();
    await summaryDialog.getByText(/Reading sentence \d+ \/ \d+/).waitFor({ timeout: 10000 });
    check('Nghe thuyết minh: đang đọc, tô sáng câu hiện tại', (await summaryDialog.locator('[aria-current="true"]').count()) === 1);
    await summaryDialog.getByRole('button', { name: 'Stop' }).click();
  }
  await shot(guest, '17-khach-tom-tat-nghe', { fullPage: false });
  await summaryDialog.getByRole('button', { name: 'Close' }).click();
  await guest.close();

  // Thiết bị chưa có giọng đọc của ngôn ngữ (Edge kiểm thử chỉ có giọng en-US): báo kèm hướng dẫn, khóa nút Phát, vẫn hiện chữ.
  const japanese = await newPage({ locale: 'ja-JP' });
  await japanese.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await japanese.getByRole('button', { name: '聞く' }).click();
  const japaneseDialog = japanese.getByRole('dialog', { name: '要約と音声ガイド' });
  await japaneseDialog.getByRole('button', { name: '再生' }).waitFor();
  const japaneseVoices = await japanese.evaluate(() => window.speechSynthesis.getVoices().map((v) => v.lang));
  if (japaneseVoices.some((lang) => lang.toLowerCase().startsWith('ja'))) {
    check('Tiếng Nhật: máy kiểm thử có giọng ja nên nút Phát dùng được', await japaneseDialog.getByRole('button', { name: '再生' }).isEnabled());
  } else {
    check(
      'Thiết bị chưa có giọng tiếng Nhật: báo kèm hướng dẫn cài giọng, khóa nút Phát, vẫn hiện chữ',
      (await japaneseDialog.getByText('この端末にはこの言語の音声がありません').count()) === 1 &&
        (await japaneseDialog.getByRole('button', { name: '再生' }).isDisabled()) &&
        (await japaneseDialog.locator('p[lang="ja"]').innerText()).length > 0,
    );
  }
  await shot(japanese, '17b-khach-nghe-thieu-giong-nhat', { fullPage: false });
  await japanese.close();

  // Nghe thuyết minh với Web Speech API giả: câu nối câu, tô sáng, tạm dừng, đổi tốc độ, dừng.
  const speaker = await newPage({ locale: 'en-US' });
  await speaker.addInitScript(() => {
    const spoken = [];
    let current = null;
    // Trình duyệt kiểm tra kiểu của tham số speak() nên giữ hàm dựng; trả về đối tượng thường là đủ cho phần giả.
    window.SpeechSynthesisUtterance = function Utterance(text) {
      return { text, rate: 1 };
    };
    const fake = {
      getVoices: () => [{ lang: 'en-US', name: 'Giong gia' }],
      addEventListener() {},
      removeEventListener() {},
      speak(u) {
        spoken.push({ text: u.text, lang: u.lang, rate: u.rate });
        current = u;
      },
      cancel() {
        current = null;
      },
      pause() {},
      resume() {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: fake, configurable: true });
    window.fakeSpeech = { spoken, finish: () => current?.onend?.() };
  });
  await speaker.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await speaker.getByRole('button', { name: 'Listen' }).click();
  const speakerDialog = speaker.getByRole('dialog', { name: 'SUMMARY AND AUDIO GUIDE' });
  await speakerDialog.getByRole('button', { name: 'Play' }).click();
  await speakerDialog.getByText(/Reading sentence 1 \/ \d+/).waitFor();
  check('Web Speech: đọc câu đầu bằng giọng en-US, tô sáng câu 1', (await speaker.evaluate(() => window.fakeSpeech.spoken[0].lang)) === 'en-US' && (await speakerDialog.locator('[aria-current="true"]').count()) === 1);
  await speaker.evaluate(() => window.fakeSpeech.finish());
  await speakerDialog.getByText(/Reading sentence 2 \/ \d+/).waitFor();
  check('Hết câu 1 thì đọc câu 2', (await speaker.evaluate(() => window.fakeSpeech.spoken.length)) === 2);
  await speakerDialog.getByRole('button', { name: '1.5×' }).click();
  check('Đổi tốc độ 1,5×: đọc lại câu hiện tại với tốc độ mới', (await speaker.evaluate(() => window.fakeSpeech.spoken.at(-1).rate)) === 1.5);
  await speakerDialog.getByRole('button', { name: 'Pause' }).click();
  await speakerDialog.getByRole('button', { name: 'Resume' }).waitFor();
  await speakerDialog.getByRole('button', { name: 'Stop' }).click();
  check('Tạm dừng, tiếp tục, dừng', (await speakerDialog.getByRole('button', { name: 'Play' }).count()) === 1);
  await speaker.close();

  // ====================== Khung điện thoại ======================
  const phone = await newPage({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  await phone.goto(`${LEARNING_WEB}/`);
  await phone.getByRole('button', { name: 'Open menu' }).click();
  await phone.getByRole('dialog', { name: 'Navigation' }).getByRole('button', { name: 'Language' }).click();
  await phone.getByRole('dialog', { name: 'Choose a language' }).getByRole('button', { name: '简体中文' }).click();
  await phone.getByRole('heading', { level: 1, name: '探索越南文化遗产' }).waitFor();
  const overflow = [];
  for (const path of ['/', `/di-san/${A.slug}`, '/di-san', '/ban-do', `/dong-thoi-gian/${A.slug}`]) {
    await phone.goto(`${LEARNING_WEB}${path}`);
    await phone.waitForLoadState('networkidle');
    if (!(await noOverflow(phone))) overflow.push(path);
  }
  check('390px bằng tiếng Trung: trang chủ, chi tiết, tìm kiếm, bản đồ, dòng thời gian không tràn ngang', overflow.length === 0, overflow.join(', '));
  await phone.goto(`${LEARNING_WEB}/dong-thoi-gian/${A.slug}`);
  await phone.getByText(/第 1 时期/).waitFor();
  // Chỉ xét nhãn khoảng năm của giai đoạn (máy chủ viết sẵn "TCN", "nay"); mô tả của giai đoạn là nội dung di sản, không phải nhãn.
  const rangeLabels = await phone.locator('ol > li p.font-display').allInnerTexts();
  check('Dòng thời gian bằng tiếng Trung: nhãn khoảng năm không còn chữ TCN hay "nay" của tiếng Việt', rangeLabels.length > 0 && rangeLabels.every((text) => !/TCN|nay/.test(text)), rangeLabels.join(' | '));
  await shot(phone, '18-dien-thoai-dong-thoi-gian-trung');
  await phone.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await phone.getByRole('heading', { level: 1 }).waitFor();
  await shot(phone, '19-dien-thoai-chi-tiet-trung');
  await phone.close();

  // ====================== Học sinh: luôn tiếng Việt ======================
  const student = await newPage({ locale: 'ko-KR' });
  await student.goto(`${LEARNING_WEB}/dang-nhap`);
  await student.evaluate(() => localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'ko'));
  await student.getByLabel('Mã học sinh').fill(studentCode);
  await student.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await student.getByRole('button', { name: 'Đăng nhập' }).click();
  await student.waitForURL(/\/hoc$/);
  const before = publicCalls.length;
  await student.goto(`${LEARNING_WEB}/di-san`);
  await student.getByRole('heading', { level: 1, name: 'Tìm kiếm và lọc di sản' }).waitFor();
  await student.waitForLoadState('networkidle');
  check('Học sinh đã đăng nhập: không có mục Ngôn ngữ', (await student.getByRole('button', { name: /Ngôn ngữ|언어/ }).count()) === 0);
  const studentCalls = publicCalls.slice(before).filter((u) => u.pathname === '/api/v1/public/heritages');
  check('Học sinh xem danh sách di sản: luôn gửi lang=vi dù đã nhớ tiếng Hàn trên máy', studentCalls.length > 0 && studentCalls.every((u) => u.searchParams.get('lang') === 'vi'));
  await student.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await student.getByRole('heading', { level: 1 }).waitFor();
  check('Học sinh xem chi tiết di sản bằng tiếng Việt', (await student.getByRole('heading', { level: 1 }).innerText()) === A.name);
  await shot(student, '20-hoc-sinh-chi-tiet-tieng-viet');
  await student.close();
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
