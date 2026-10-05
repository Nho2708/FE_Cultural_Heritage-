#!/usr/bin/env node
// Kiểm thử luồng Bài học cho lớp theo cấp trên trình duyệt thật với API thật (docs/bai-hoc-theo-cap.md): giáo viên tạo bài cho một lớp
// khối 3 (cấp 1) và một lớp khối 8 (cấp 2) ở web quản trị, AI (bản giả lập) soạn nội dung đúng cấp, lưu, xuất bản, xem mã bài học và chiếu
// lên bảng, nhân bản sang lớp khác; học sinh mỗi lớp đăng nhập ở web học tập, gõ mã và thấy đúng bố cục của cấp; mã của lớp khác bị từ chối.
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật) và Ai:Mode=Simulated, hai ứng dụng web đang chạy trỏ tới API đó, Edge hoặc
// Chrome đã cài trên máy. Bước chuẩn bị (trường, giáo viên, lớp, học sinh, xuất bản di sản) gọi thẳng API; mọi thao tác với bài học đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:bai-hoc -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5095/api/v1
//   ADMIN_WEB          mặc định http://localhost:5195
//   LEARNING_WEB       mặc định http://localhost:5196
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5095/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5195').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5196').replace(/\/+$/, '');
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

async function createStaff(path, token, person) {
  await call('POST', path, { token, body: person });
  await call('POST', '/auth/set-password', { body: { token: await mailToken(person.email), newPassword: PASSWORD } });
  return (await call('POST', '/auth/login', { body: { emailOrUsername: person.username, password: PASSWORD } })).accessToken;
}

async function addStudent(teacher, classId, fullName) {
  const created = await call('POST', `/teacher/classes/${classId}/students`, { token: teacher, body: { fullName } });
  const { studentCode, temporaryPassword } = created.sheet.entries[0];
  const session = await call('POST', '/student/auth/login', { body: { studentCode, password: temporaryPassword } });
  await call('PUT', '/student/me/password', {
    token: session.accessToken,
    body: { newPassword: STUDENT_PASSWORD, confirmNewPassword: STUDENT_PASSWORD },
  });
  return studentCode;
}

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0);
const published = [];
for (const heritage of drafts) {
  if (published.length >= 4) break;
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    published.push(heritage);
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (published.length < 2) throw new Error('Không xuất bản được hai di sản có dòng thời gian (cần di sản đợt 1 trong CSDL tạm).');

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Nguyễn Du ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@nguyendu.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
const teacher = await createStaff('/org/teachers', orgAdmin, {
  fullName: 'Đặng Thị Mỹ Linh',
  username: teacherLogin,
  email: `${teacherLogin}@nguyendu.edu.vn`,
});
const class3 = await call('POST', '/teacher/classes', { token: teacher, body: { name: `3A${stamp.slice(-2)}`, grade: 3, schoolYear: '2026-2027' } });
const class8 = await call('POST', '/teacher/classes', { token: teacher, body: { name: `8A${stamp.slice(-2)}`, grade: 8, schoolYear: '2026-2027' } });
const student3 = await addStudent(teacher, class3.id, 'Nguyễn Văn Đạt');
const student8 = await addStudent(teacher, class8.id, 'Trần Thị Mai');
console.log(`Đã chuẩn bị: ${published.length} di sản đã xuất bản, lớp ${class3.name} (khối 3) và ${class8.name} (khối 8), học sinh ${student3} và ${student8}.`);

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', ...options });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  return page;
}

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `bai-hoc-${name}.png`), fullPage: true });
const pathOf = (page) => new URL(page.url()).pathname;
const toast = (page, text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 15000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

/** Giáo viên tạo bài cho một lớp ở màn hình Bài học, để AI soạn, lưu và xuất bản; trả mã bài học. */
async function teacherCreatesLesson(page, className, title, label) {
  await page.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  await page.getByRole('button', { name: 'Tạo bài học' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Tạo bài học' });
  await dialog.getByRole('radio', { name: `Lớp ${className}` }).check();
  await dialog.getByRole('button', { name: 'Tiếp tục' }).click();
  const boxes = dialog.getByRole('checkbox');
  await boxes.first().waitFor();
  await boxes.nth(0).check();
  await boxes.nth(1).check();
  await dialog.getByLabel('Tiêu đề bài học').fill(title);
  await shot(page, `${label}-1-tao-bai-chon-di-san`);
  await dialog.getByRole('button', { name: 'Tạo bài học' }).click();
  await page.waitForURL(/\/giao-vien\/bai-hoc\/\d+$/);
  await page.getByRole('heading', { name: /Nội dung bài theo cấp/ }).waitFor();

  // AI (bản giả lập) soạn nội dung đúng cấp của lớp.
  await page.getByRole('button', { name: 'Soạn nội dung bằng AI' }).click();
  await toast(page, 'Đã tạo bản nháp');
  await page.getByText('Có thay đổi chưa lưu').waitFor();
  await shot(page, `${label}-2-soan-bai-ai`);
  await page.getByRole('button', { name: 'Lưu nháp' }).click();
  await toast(page, 'Lưu bài học thành công');
  await page.getByRole('button', { name: 'Xuất bản', exact: true }).click();
  const code = page.getByRole('dialog', { name: 'Mã bài học' }).getByTestId('ma-bai-hoc');
  await code.waitFor({ timeout: 15000 });
  const accessCode = (await code.textContent())?.trim() ?? '';
  await shot(page, `${label}-3-ma-bai-hoc`);
  return accessCode;
}

const teacherPage = await newPage();
let code3 = '';
let code8 = '';
let lessonUrl3 = '';
try {
  // ---- Giáo viên đăng nhập web quản trị ----
  await teacherPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await teacherPage.getByLabel('Email hoặc tên đăng nhập').fill(teacherLogin);
  await teacherPage.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await teacherPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await teacherPage.waitForURL(/\/(giao-vien|tai-khoan)/);
  check('Giáo viên đăng nhập web quản trị', /^\/(giao-vien|tai-khoan)/.test(pathOf(teacherPage)));

  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  await teacherPage.getByRole('heading', { level: 1, name: 'Bài học' }).waitFor();
  check('Bài học của tôi: chưa có bài nào', await teacherPage.getByText('Thầy cô chưa có bài học nào.').isVisible());

  // ---- Lớp khối 3 (cấp 1) ----
  code3 = await teacherCreatesLesson(teacherPage, class3.name, `Di sản qua lời kể của bạn Na ${stamp}`, 'cap-1');
  check('Lớp khối 3: xuất bản sinh mã BH + 6 ký tự', /^BH[2-9A-HJ-NP-Z]{6}$/.test(code3), code3);
  lessonUrl3 = pathOf(teacherPage);
  const dialog3 = teacherPage.getByRole('dialog', { name: 'Mã bài học' });
  check('Hộp thoại Mã bài học có đường dẫn tới web học tập', (await dialog3.getByLabel('Đường dẫn bài học').inputValue()).endsWith(`/bai-hoc/${code3}`));
  await dialog3.getByRole('button', { name: 'Chiếu lên bảng' }).click();
  const board = teacherPage.getByRole('dialog', { name: `Mã bài học ${code3}` });
  await board.waitFor();
  const grouped = `${code3.slice(0, 2)} ${code3.slice(2, 5)} ${code3.slice(5)}`;
  check('Chiếu lên bảng: mã chia nhóm, chữ lớn', (await board.getByTestId('ma-chieu-bang').textContent())?.replace(/\s+/g, ' ').trim() === grouped);
  await shot(teacherPage, 'cap-1-4-chieu-len-bang');
  await teacherPage.keyboard.press('Escape');
  await board.waitFor({ state: 'hidden' });
  await teacherPage.getByRole('dialog', { name: 'Mã bài học' }).getByRole('button', { name: 'Đóng' }).click();
  check('Trang soạn bài: trạng thái Đã xuất bản và mã ở cột bên phải', (await teacherPage.getByText(code3).count()) > 0);

  // ---- Lớp khối 8 (cấp 2) ----
  code8 = await teacherCreatesLesson(teacherPage, class8.name, `Kinh thành qua các thời kỳ ${stamp}`, 'cap-2');
  check('Lớp khối 8: xuất bản sinh mã khác mã lớp khối 3', /^BH[2-9A-HJ-NP-Z]{6}$/.test(code8) && code8 !== code3, code8);
  await teacherPage.getByRole('dialog', { name: 'Mã bài học' }).getByRole('button', { name: 'Đóng' }).click();
  check('Soạn bài cấp 2: khung bài đọc và mốc thời gian', (await teacherPage.getByText('Theo khối 8 của lớp').count()) > 0 && (await teacherPage.getByLabel('Nối với sự kiện của di sản').count()) > 0);

  // ---- Danh sách, nhân bản ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  const table = teacherPage.getByRole('table', { name: 'Bài học của tôi' });
  await table.waitFor();
  check('Bài học của tôi: hai bài đã xuất bản kèm mã', (await table.getByText('Đã xuất bản').count()) === 2 && (await table.getByText(code3).count()) === 1 && (await table.getByText(code8).count()) === 1);
  await shot(teacherPage, 'danh-sach');
  await teacherPage.getByRole('button', { name: /^Nhân bản "Di sản qua lời kể/ }).click();
  const copy = teacherPage.getByRole('dialog', { name: 'Nhân bản bài học sang lớp khác' });
  const targetValue = await copy.getByLabel('Lớp đích').locator('option', { hasText: class8.name }).getAttribute('value');
  await copy.getByLabel('Lớp đích').selectOption(targetValue);
  check('Nhân bản sang lớp khác cấp: có cảnh báo', (await copy.getByText(/khác cấp 1 của bài gốc/).count()) > 0);
  await shot(teacherPage, 'nhan-ban');
  await copy.getByRole('button', { name: 'Nhân bản' }).click();
  await teacherPage.waitForURL(/\/giao-vien\/bai-hoc\/\d+$/);
  await teacherPage.getByRole('heading', { name: /Nội dung bài theo cấp/ }).waitFor();
  check('Bài nhân bản là bản nháp ở lớp khối 8, chưa có mã', (await teacherPage.getByText('Mã bài học được tạo khi thầy cô xuất bản bài lần đầu').count()) > 0);
  await shot(teacherPage, 'nhan-ban-ket-qua');

  // ---- Khung điện thoại của giáo viên ----
  const phone = await newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${ADMIN_WEB}/dang-nhap`);
  await phone.getByLabel('Email hoặc tên đăng nhập').fill(teacherLogin);
  await phone.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await phone.getByRole('button', { name: 'Đăng nhập' }).click();
  await phone.waitForURL(/\/(giao-vien|tai-khoan)/);
  await phone.goto(`${ADMIN_WEB}${lessonUrl3}`);
  await phone.getByRole('heading', { name: /Nội dung bài theo cấp/ }).waitFor();
  check('390px: màn hình Soạn bài học không tràn ngang', await noOverflow(phone));
  await shot(phone, 'dien-thoai-soan-bai');
  await phone.close();

  // ---- Học sinh lớp khối 3 (cấp 1) ----
  async function studentLogin(code) {
    const page = await newPage();
    await page.goto(`${LEARNING_WEB}/dang-nhap`);
    await page.getByLabel('Mã học sinh').fill(code);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
    await page.getByRole('button', { name: 'Đăng nhập' }).click();
    await page.waitForURL(/\/hoc$/);
    return page;
  }

  const kid = await studentLogin(student3);
  await kid.goto(`${LEARNING_WEB}/nhap-ma`);
  await kid.getByLabel('Mã bài học').fill(`${code3.slice(0, 2).toLowerCase()} ${code3.slice(2, 5).toLowerCase()}-${code3.slice(5).toLowerCase()}`);
  await shot(kid, 'cap-1-hs-0-nhap-ma');
  await kid.getByRole('button', { name: 'Mở bài học' }).click();
  await kid.waitForURL(`${LEARNING_WEB}/bai-hoc/${code3}`);
  await kid.locator('[data-bo-cuc]').first().waitFor();
  check('Học sinh khối 3: bố cục cấp 1 (kể chuyện từng bước)', (await kid.locator('[data-bo-cuc]').first().getAttribute('data-bo-cuc')) === 'cap-1');
  check('Cấp 1: luồng Nghe chuyện, Xem hình, Chơi, Nhận sao', (await kid.getByRole('list', { name: 'Các bước của bài' }).locator('li').allTextContents()).join('|') === 'Nghe chuyện|Xem hình|Chơi|Nhận sao');
  const part = await kid.getByText(/^Đoạn \d+ \/ \d+$/).textContent();
  check('Cấp 1: mỗi lần một đoạn có hình lớn và nút Tiếp nhé', Boolean(part) && (await kid.locator('article img').count()) === 1 && (await kid.getByRole('button', { name: 'Tiếp nhé' }).isVisible()), part ?? '');
  await shot(kid, 'cap-1-hs-1-nghe-chuyen');
  await kid.getByRole('button', { name: 'Tiếp nhé' }).click();
  await kid.getByText(/^Đoạn 2 \//).waitFor();
  await kid.reload();
  check(
    'Cấp 1: tải lại trang vẫn mở đúng đoạn em đang dừng',
    await kid
      .getByText(/^Đoạn 2 \//)
      .waitFor({ timeout: 8000 })
      .then(() => true, () => false),
  );
  for (let i = 0; i < 12 && !(await kid.getByRole('heading', { name: 'Bài chơi của em' }).isVisible()); i += 1) {
    if (await kid.getByRole('heading', { name: 'Em học xong rồi! Giỏi quá!' }).isVisible()) break;
    await kid.getByRole('button', { name: 'Tiếp nhé' }).click();
  }
  await shot(kid, 'cap-1-hs-2-choi');
  await kid.getByRole('button', { name: 'Tiếp nhé' }).click();
  check('Cấp 1: bước cuối Nhận sao', await kid.getByRole('heading', { name: 'Em học xong rồi! Giỏi quá!' }).isVisible());
  await shot(kid, 'cap-1-hs-3-nhan-sao');

  // Mã của lớp khác: cùng một câu, không lộ việc mã có ở lớp khác.
  await kid.goto(`${LEARNING_WEB}/nhap-ma`);
  await kid.getByLabel('Mã bài học').fill(code8);
  await kid.getByRole('button', { name: 'Mở bài học' }).click();
  await kid.getByText('Mã bài học chưa đúng hoặc không dành cho lớp của em').waitFor();
  check('Học sinh khối 3 nhập mã của lớp khối 8: bị từ chối cùng một câu', pathOf(kid) === '/nhap-ma');
  await shot(kid, 'cap-1-hs-4-ma-lop-khac');
  await kid.goto(`${LEARNING_WEB}/nhap-ma`);
  check('Màn hình Nhập mã nhớ mã vừa mở trên máy này', (await kid.getByRole('link', { name: new RegExp(code3) }).count()) === 1);
  await kid.close();

  // ---- Học sinh lớp khối 8 (cấp 2) ----
  const teen = await studentLogin(student8);
  await teen.goto(`${LEARNING_WEB}/nhap-ma`);
  await teen.getByLabel('Mã bài học').fill(code8);
  await teen.getByRole('button', { name: 'Mở bài học' }).click();
  await teen.waitForURL(`${LEARNING_WEB}/bai-hoc/${code8}`);
  await teen.locator('[data-bo-cuc]').first().waitFor();
  check('Học sinh khối 8: bố cục cấp 2 (bài đọc, dòng thời gian)', (await teen.locator('[data-bo-cuc]').first().getAttribute('data-bo-cuc')) === 'cap-2');
  check('Cấp 2: ba tab Đọc bài, Dòng thời gian của bài, Bài kiểm tra', (await teen.getByRole('tab').allTextContents()).join('|') === 'Đọc bài|Dòng thời gian của bài|Bài kiểm tra');
  await shot(teen, 'cap-2-hs-1-doc-bai');
  await teen.getByRole('tab', { name: 'Dòng thời gian của bài' }).click();
  check('Cấp 2: tab Dòng thời gian có các mốc của bài', (await teen.locator('ol li').count()) > 0);
  await shot(teen, 'cap-2-hs-2-dong-thoi-gian');
  await teen.getByRole('tab', { name: 'Bài kiểm tra' }).click();
  check('Cấp 2: tab Bài kiểm tra báo chưa có bài kiểm tra', await teen.getByText('Bài học này chưa có bài kiểm tra nào.').isVisible());
  await teen.setViewportSize({ width: 390, height: 844 });
  await teen.getByRole('tab', { name: 'Đọc bài' }).click();
  check('390px: bài học cấp 2 không tràn ngang', await noOverflow(teen));
  await shot(teen, 'cap-2-hs-3-dien-thoai');
  await teen.goto(`${LEARNING_WEB}/bai-hoc/${code3}`);
  await teen.getByText('Mã bài học chưa đúng hoặc không dành cho lớp của em').waitFor();
  check('Học sinh khối 8 mở đường dẫn của bài lớp khối 3: bị từ chối', true);
  await teen.close();

  // ---- Lưu trữ: học sinh không mở được bằng mã, xuất bản lại giữ mã ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  await teacherPage.getByRole('button', { name: /^Lưu trữ "Kinh thành qua các thời kỳ/ }).click();
  await teacherPage.getByRole('dialog', { name: /Lưu trữ bài học/ }).getByRole('button', { name: 'Lưu trữ' }).click();
  await toast(teacherPage, 'Lưu trữ bài học thành công');
  const teen2 = await studentLogin(student8);
  await teen2.goto(`${LEARNING_WEB}/bai-hoc/${code8}`);
  await teen2.getByText('Mã bài học chưa đúng hoặc không dành cho lớp của em').waitFor();
  check('Bài đã lưu trữ: học sinh không mở được bằng mã', true);
  await teen2.close();
  await teacherPage.getByRole('link', { name: /^Kinh thành qua các thời kỳ/ }).click();
  await teacherPage.getByRole('button', { name: 'Xuất bản lại' }).click();
  await teacherPage.getByText('Đã xuất bản').first().waitFor();
  await teacherPage.getByRole('button', { name: 'Hiện mã' }).click();
  check('Xuất bản lại giữ nguyên mã bài học', (await teacherPage.getByTestId('ma-bai-hoc').textContent())?.trim() === code8);
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
