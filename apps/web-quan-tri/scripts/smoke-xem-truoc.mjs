#!/usr/bin/env node
// Kiểm thử "Xem trang công khai / Xem trước" của di sản và "Xem như học sinh" của bài học trên trình duyệt thật với API thật:
// quản trị hệ thống mở trang công khai của di sản đã xuất bản và xem trước bản nháp (tab mới, dải "Bản xem trước", không cho máy tìm
// kiếm lập chỉ mục, người ngoài không đọc được); giáo viên xem như học sinh bài cấp 1 và cấp 3 (đúng bố cục cấp, không có liên kết
// sang trang công khai, không ghi gì).
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log, Ai:Mode=Simulated, Cors:AllowedOrigins gồm hai địa chỉ web; hai ứng dụng web
// đang chạy trỏ tới API đó (web quản trị có VITE_LEARNING_WEB_URL, web học tập có VITE_ADMIN_WEB_URL trỏ đúng nhau); Edge hoặc Chrome
// đã cài. Cần sẵn: ít nhất một di sản đã xuất bản, một di sản nháp, và một giáo viên có bài học cấp 1 và cấp 3 (bản nháp cũng được).
//
//   ADMIN_PASSWORD=... TEACHER_LOGIN=... TEACHER_PASSWORD=... npm run smoke:xem-truoc -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5080/api/v1
//   ADMIN_WEB          mặc định http://localhost:5173
//   LEARNING_WEB       mặc định http://localhost:5174
//   ADMIN_LOGIN        mặc định admin.nho
//   ADMIN_PASSWORD     BẮT BUỘC
//   TEACHER_LOGIN      BẮT BUỘC; TEACHER_PASSWORD BẮT BUỘC
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5173').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5174').replace(/\/+$/, '');
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const { ADMIN_PASSWORD, TEACHER_LOGIN, TEACHER_PASSWORD } = process.env;
if (!ADMIN_PASSWORD || !TEACHER_LOGIN || !TEACHER_PASSWORD) {
  console.error('Cần ADMIN_PASSWORD, TEACHER_LOGIN và TEACHER_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const results = [];
const pageErrors = [];
const badResponses = [];
function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${label}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, headers: response.headers, json };
}
const login = async (user, password) => (await api('POST', '/auth/login', { body: { emailOrUsername: user, password } })).json.data?.accessToken;

const adminToken = await login(ADMIN_LOGIN, ADMIN_PASSWORD);
const teacherToken = await login(TEACHER_LOGIN, TEACHER_PASSWORD);
if (!adminToken || !teacherToken) {
  console.error('Không đăng nhập được quản trị hệ thống hoặc giáo viên.');
  process.exit(2);
}
const heritagesOf = async (status) => (await api('GET', `/admin/heritages?status=${status}&pageSize=50`, { token: adminToken })).json.data.items;
const published = (await heritagesOf('PUBLISHED'))[0];
const draft = (await heritagesOf('DRAFT'))[0];
const lessons = (await api('GET', '/teacher/lessons?pageSize=50', { token: teacherToken })).json.data.items;
const levelOne = lessons.find((l) => l.schoolLevel === 1);
const levelThree = lessons.find((l) => l.schoolLevel === 3);
if (!published || !draft || !levelOne || !levelThree) {
  console.error('Thiếu dữ liệu: cần di sản đã xuất bản, di sản nháp, bài học cấp 1 và cấp 3.');
  process.exit(2);
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const track = (page) => {
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
};
const shot = (page, label) => page.screenshot({ path: resolve(SHOTS, `xem-truoc-${label}.png`), fullPage: true });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function signIn(context, user, password, landing) {
  const page = await context.newPage();
  track(page);
  await page.goto(`${ADMIN_WEB}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(user);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(landing);
  return page;
}

try {
  // ---- Quản trị hệ thống
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
  const admin = await signIn(adminContext, ADMIN_LOGIN, ADMIN_PASSWORD, /\/quan-tri/);
  check('Quản trị hệ thống đăng nhập', true);

  await admin.goto(`${ADMIN_WEB}/quan-tri/di-san/${published.id}`);
  await admin.getByRole('heading', { level: 1, name: published.name }).waitFor();
  check('Di sản đã xuất bản: không có nút "Xem trước"', (await admin.getByRole('button', { name: 'Xem trước', exact: true }).count()) === 0);
  const publicLink = admin.getByRole('link', { name: 'Xem trang công khai' });
  check(
    'Di sản đã xuất bản: liên kết "Xem trang công khai" trỏ tới trang chi tiết của web học tập, mở tab mới',
    (await publicLink.getAttribute('href')) === `${LEARNING_WEB}/di-san/${published.slug}` && (await publicLink.getAttribute('target')) === '_blank',
  );
  await shot(admin, 'bien-tap-da-xuat-ban');
  const [publicTab] = await Promise.all([adminContext.waitForEvent('page'), publicLink.click()]);
  track(publicTab);
  await publicTab.getByRole('heading', { level: 1, name: published.name }).waitFor();
  check('Trang công khai của di sản đã xuất bản mở ở tab mới, không có dải xem trước', (await publicTab.getByText('Bản xem trước').count()) === 0);
  await shot(publicTab, 'trang-cong-khai');
  await publicTab.close();

  await admin.goto(`${ADMIN_WEB}/quan-tri/di-san/${draft.id}`);
  await admin.getByRole('heading', { level: 1, name: draft.name }).waitFor();
  check(
    'Di sản nháp: không có liên kết công khai, có nút "Xem trước"',
    (await admin.getByRole('link', { name: 'Xem trang công khai' }).count()) === 0 && (await admin.getByRole('button', { name: 'Xem trước', exact: true }).count()) === 1,
  );
  await shot(admin, 'bien-tap-nhap');
  const [previewTab] = await Promise.all([adminContext.waitForEvent('page'), admin.getByRole('button', { name: 'Xem trước', exact: true }).click()]);
  track(previewTab);
  await previewTab.waitForURL(/\/xem-truoc\/di-san\/[^/]+$/, { timeout: 20000 });
  await previewTab.getByRole('heading', { level: 1, name: draft.name }).waitFor({ timeout: 20000 });
  const previewUrl = previewTab.url();
  check(
    'Xem trước bản nháp: tab mới hiện đúng giao diện chi tiết và dải "Bản xem trước — chưa xuất bản"',
    (await previewTab.getByText('Bản xem trước — chưa xuất bản').isVisible()) && (await previewTab.getByRole('heading', { level: 2 }).count()) > 0,
  );
  check('Xem trước: thẻ chặn máy tìm kiếm lập chỉ mục', (await previewTab.locator('meta[name="robots"]').getAttribute('content')) === 'noindex, nofollow, noarchive');
  check('Xem trước: không có liên kết sang bản đồ và dòng thời gian công khai', (await previewTab.getByRole('link', { name: /Xem trên bản đồ|Mở dòng thời gian/ }).count()) === 0);
  check('Xem trước: địa chỉ chỉ mang mã xem trước, không có token đăng nhập', !/token|eyJ/i.test(previewUrl));
  await shot(previewTab, 'ban-nhap');

  const previewCode = decodeURIComponent(previewUrl.split('/').pop());
  const publicDraft = await api('GET', `/public/heritages/${draft.slug}`);
  check('Trang công khai chưa có bản nháp (404)', publicDraft.status === 404);
  const noToken = await api('GET', `/preview/heritages/${previewCode}`);
  const asTeacher = await api('GET', `/preview/heritages/${previewCode}`, { token: teacherToken });
  const withAdmin = await api('GET', `/preview/heritages/${previewCode}`, { token: adminToken });
  check(
    'Người ngoài (không đăng nhập) và giáo viên không đọc được bản nháp bằng mã xem trước (cùng một 404)',
    noToken.status === 404 && asTeacher.status === 404 && noToken.json.errorCode === asTeacher.json.errorCode,
  );
  check(
    'Quản trị hệ thống đọc được; phản hồi có X-Robots-Tag và không lưu đệm',
    withAdmin.status === 200 && /noindex/.test(withAdmin.headers.get('x-robots-tag') ?? '') && /no-store/.test(withAdmin.headers.get('cache-control') ?? ''),
  );
  await previewTab.close();

  const stranger = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
  const direct = await stranger.newPage();
  track(direct);
  await direct.goto(previewUrl);
  await direct.getByRole('heading', { level: 1, name: 'Không mở được bản xem trước' }).waitFor({ timeout: 20000 });
  check('Mở thẳng địa chỉ xem trước (không từ trang quản trị): không xem được bản nháp', (await direct.getByText(draft.name, { exact: true }).count()) === 0);
  await shot(direct, 'mo-thang');
  await stranger.close();
  await adminContext.close();

  // ---- Giáo viên xem như học sinh
  const teacherContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
  const teacher = await signIn(teacherContext, TEACHER_LOGIN, TEACHER_PASSWORD, /\/(giao-vien|tai-khoan)/);
  check('Giáo viên đăng nhập', true);

  const writes = [];
  teacher.on('request', (r) => {
    if (r.url().startsWith(API) && r.method() !== 'GET') writes.push(`${r.method()} ${r.url()}`);
  });

  async function previewLesson(lesson, layout, themeKey, label) {
    await teacher.goto(`${ADMIN_WEB}/giao-vien/bai-hoc/${lesson.id}`);
    await teacher.getByRole('heading', { level: 1 }).first().waitFor();
    await teacher.getByRole('button', { name: 'Xem như học sinh', exact: true }).click();
    const dialog = teacher.getByRole('dialog', { name: 'Xem như học sinh' });
    await dialog.locator(`[data-bo-cuc="${layout}"]`).waitFor({ timeout: 20000 });
    check(`${label}: đúng bố cục ${layout} và bộ giao diện ${themeKey}`, (await dialog.locator(`[data-bo-giao-dien="${themeKey}"]`).count()) === 1);
    check(
      `${label}: dải "Bạn đang xem bài như học sinh", không lưu kết quả`,
      (await dialog.getByText(/Bạn đang xem bài như học sinh lớp/).isVisible()) && (await dialog.getByText(/không lưu kết quả/).isVisible()),
    );
    const hrefs = await dialog.getByRole('link').evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
    check(`${label}: không có liên kết sang trang công khai, bản đồ, dòng thời gian hay làm bài`, hrefs.every((h) => h.startsWith('#')), hrefs.join(' '));
    return dialog;
  }

  let dialog = await previewLesson(levelOne, 'cap-1', 'cap-1', 'Bài cấp 1');
  await dialog.getByRole('button', { name: 'Tiếp nhé' }).click();
  await shot(teacher, 'bai-cap-1-buoc-2');
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  check('Đóng hộp thoại về lại màn hình Soạn bài học', await teacher.getByRole('dialog', { name: 'Xem như học sinh' }).isHidden());

  dialog = await previewLesson(levelThree, 'cap-3', 'cap-3', 'Bài cấp 3');
  check('Bài cấp 3: có mục lục', await dialog.getByRole('navigation', { name: 'Mục lục' }).isVisible());
  await shot(teacher, 'bai-cap-3');
  await dialog.getByRole('button', { name: 'Đóng' }).click();
  check('Xem như học sinh chỉ đọc: không có yêu cầu ghi nào gửi tới máy chủ', writes.length === 0, writes.join(' | '));

  await teacher.setViewportSize({ width: 390, height: 844 });
  await teacher.goto(`${ADMIN_WEB}/giao-vien/bai-hoc/${levelOne.id}`);
  await teacher.getByRole('button', { name: 'Xem như học sinh', exact: true }).click();
  await teacher.getByRole('dialog', { name: 'Xem như học sinh' }).locator('[data-bo-cuc="cap-1"]').waitFor();
  check('390 px: hộp thoại xem như học sinh không làm trang tràn ngang', await noOverflow(teacher));
  await shot(teacher, 'dien-thoai-bai-cap-1');
  await teacherContext.close();
} catch (error) {
  check(`Kịch bản dừng giữa chừng: ${String(error).split('\n')[0]}`, false);
}

await browser.close();
check('Không có lỗi script trên trang', pageErrors.length === 0, pageErrors.join(' | '));
check('Không có phản hồi 5xx', badResponses.length === 0, badResponses.join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} bước đạt.`);
process.exit(failed.length === 0 ? 0 : 1);
