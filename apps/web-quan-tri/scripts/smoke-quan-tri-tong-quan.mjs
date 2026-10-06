#!/usr/bin/env node
// Kiểm thử luồng Quản trị và tổng quan trên trình duyệt thật với API thật: quản trị trường xem Tổng quan trường (số tổng, không có tên người),
// quản trị hệ thống xem Tổng quan và doanh thu (tab Tổng quan, biểu đồ theo thời gian, tab Doanh thu: doanh thu từ giao dịch VNPay thành công và danh sách giao dịch), Kiểm duyệt ngân hàng câu hỏi
// (câu cần xem lại từ lượt làm bài thật, xem chỉ đọc, ẩn có lý do, hiện lại, nhật ký thao tác), chặn chéo vai trò và bố cục màn hình hẹp.
//
// Cần: API (nhánh quản trị và tổng quan) đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật) và Ai:Mode=Simulated, web quản trị đang chạy
// trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Bước chuẩn bị (trường, giáo viên, lớp, bài học, câu hỏi, bài kiểm tra, mười lượt làm bài) gọi thẳng API;
// mọi thao tác xem và kiểm duyệt đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:quan-tri-tong-quan -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5180/api/v1
//   ADMIN_WEB          mặc định http://localhost:5273
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5180/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5273').replace(/\/+$/, '');
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

const iso = (minutes) => new Date(Date.now() + minutes * 60_000).toISOString();
const NUMBER_WORDS = ['Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười'];

async function addStudent(teacher, classId, fullName) {
  const created = await call('POST', `/teacher/classes/${classId}/students`, { token: teacher, body: { fullName } });
  const { studentCode, temporaryPassword } = created.sheet.entries[0];
  const session = await call('POST', '/student/auth/login', { body: { studentCode, password: temporaryPassword } });
  const changed = await call('PUT', '/student/me/password', {
    token: session.accessToken,
    body: { newPassword: STUDENT_PASSWORD, confirmNewPassword: STUDENT_PASSWORD },
  });
  return { token: changed.accessToken };
}

/** Làm bài: đúng câu Đúng - Sai, sai câu Một đáp án đúng; nộp bài. */
async function attempt(student, quizId) {
  const started = await call('POST', `/student/quizzes/${quizId}/attempts`, { token: student.token });
  const idx = (items, text) => items.findIndex((x) => (typeof x === 'string' ? x : x.content) === text);
  for (const q of started.questions) {
    const answer =
      q.questionType === 'SINGLE_CHOICE' ? { selectedIndex: idx(q.options, 'Năm 1999') } : { selectedIndex: idx(q.options, 'Đúng') };
    await call('PUT', `/student/attempts/${started.id}/answers/${q.questionId}`, { token: student.token, body: answer });
  }
  await call('POST', `/student/attempts/${started.id}/submit`, { token: student.token });
}

// ---- Chuẩn bị ----

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0);
let heritageId = null;
for (const heritage of drafts) {
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    heritageId = heritage.id;
    break;
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (heritageId === null) throw new Error('Không xuất bản được di sản có dòng thời gian (cần di sản đợt 1 trong CSDL tạm).');
for (let i = 1; i <= 3; i++) {
  await call('POST', `/admin/heritages/${heritageId}/media`, {
    token: admin,
    body: { mediaType: 'IMAGE', url: `https://upload.wikimedia.org/smoke-qt-${stamp}-${i}.jpg`, caption: `Ảnh thêm số ${i}`, author: 'Nguyễn Văn An', license: 'CC BY-SA 4.0', source: 'Wikimedia Commons' },
  });
}

const orgEmail = `thu.${stamp}@nguyendu.edu.vn`;
await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Nguyễn Du ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: orgEmail } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(orgEmail), newPassword: PASSWORD } });
const orgAdminLogin = `thu.${stamp}`;
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: orgAdminLogin, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
const teacherName = 'Đặng Thị Mỹ Linh';
const teacher = await createStaff('/org/teachers', orgAdmin, { fullName: teacherName, username: teacherLogin, email: `${teacherLogin}@nguyendu.edu.vn` });

const className = `8A${stamp.slice(-2)}`;
const cls = await call('POST', '/teacher/classes', { token: teacher, body: { name: className, grade: 8, schoolYear: '2026-2027' } });
const lesson = await call('POST', '/teacher/lessons', { token: teacher, body: { classId: cls.id, title: `Hoàng thành qua các thời kỳ ${stamp}`, heritageIds: [heritageId] } });
const draft = await call('POST', `/teacher/lessons/${lesson.id}/ai/compose`, { token: teacher, body: { length: 'DETAILED' } });
await call('PUT', `/teacher/lessons/${lesson.id}`, {
  token: teacher,
  body: {
    summary: draft.summary,
    keyPoints: draft.keyPoints,
    sections: draft.sections.map((s) => ({ type: s.type, title: s.title, body: s.body, imageUrl: s.imageUrl, milestoneYear: s.milestoneYear, eventId: s.eventId, sourceCitation: s.sourceCitation })),
  },
});
await call('POST', `/teacher/lessons/${lesson.id}/publish`, { token: teacher });
const materials = await call('GET', `/teacher/lessons/${lesson.id}/materials`, { token: teacher });
const image = materials.images[0].url;

const hardContent = `Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào? ${stamp}`;
const easyContent = `Khu di tích nằm giữa lòng Hà Nội. ${stamp}`;
const questionIds = [];
for (const def of [
  { questionType: 'SINGLE_CHOICE', content: hardContent, explanation: 'UNESCO ghi danh năm 2010.', difficultyLevel: 'EASY', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
  { questionType: 'TRUE_FALSE', content: easyContent, explanation: 'Khu di tích ở trung tâm Hà Nội.', difficultyLevel: 'MEDIUM', imageUrl: image, answerIsTrue: true },
]) {
  const created = await call('POST', '/teacher/questions', { token: teacher, body: { ...def, heritageId } });
  if (created.reviewStatus === 'PENDING') await call('POST', `/teacher/questions/${created.id}/approve`, { token: teacher });
  questionIds.push(created.id);
}
const [hardId] = questionIds;
const quiz = await call('POST', '/teacher/quizzes', {
  token: teacher,
  body: { lessonId: lesson.id, name: `Kiểm tra 15 phút ${stamp}`, difficultyLevel: 'MEDIUM', openAt: iso(-1), closeAt: iso(240), showAnswersAfterSubmit: true },
});
await call('POST', `/teacher/quizzes/${quiz.id}/questions`, { token: teacher, body: { questionIds, point: 2 } });
await call('POST', `/teacher/quizzes/${quiz.id}/publish`, { token: teacher });
const studentNames = [];
for (let n = 0; n < 10; n++) {
  const fullName = `Học sinh ${NUMBER_WORDS[n]} lớp ${className}`;
  studentNames.push(fullName);
  await attempt(await addStudent(teacher, cls.id, fullName), quiz.id);
}
console.log(`Đã chuẩn bị: lớp ${className} cấp 2, mười em làm bài (đúng câu Đúng - Sai, sai câu Một đáp án đúng).`);

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh', ...options });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  return page;
}

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `quan-tri-${name}.png`), fullPage: true });
const pathOf = (page) => new URL(page.url()).pathname;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const visible = async (locator) => (await locator.count()) > 0 && (await locator.first().isVisible());

async function login(page, loginName, password) {
  await page.goto(`${ADMIN_WEB}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(loginName);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/dang-nhap'), { timeout: 15000 }).catch(async () => {
    const shownText = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 300);
    throw new Error(`Đăng nhập ${loginName} không thành công: ${shownText}`);
  });
}

// ---- Quản trị trường: Tổng quan trường ----

const orgPage = await newPage();
try {
  await login(orgPage, orgAdminLogin, PASSWORD);
  check('Quản trị trường đăng nhập vào thẳng Tổng quan trường', pathOf(orgPage) === '/truong');
  await orgPage.getByRole('heading', { level: 1, name: 'Tổng quan trường' }).waitFor();
  const tiles = orgPage.getByRole('region', { name: 'Số liệu của trường' });
  await tiles.waitFor();
  const text = await tiles.innerText();
  check('Tổng quan trường: 1 giáo viên so với hạn mức của gói', /Giáo viên\s+1 \/ \d+/.test(text), text.replace(/\s+/g, ' ').slice(0, 120));
  check('Tổng quan trường: 1 lớp, 10 học sinh đã đăng nhập hết', /Lớp\s+1\b/.test(text) && /Học sinh\s+10\b/.test(text) && text.includes('10 em đã đăng nhập ít nhất một lần, 0 em chưa đăng nhập'));
  check('Tổng quan trường: 1 bài học, 1 bài kiểm tra đã phát hành đang mở, 10 lượt nộp', /Bài học\s+1\b/.test(text) && text.includes('1 bài đang mở cho học sinh làm') && /Lượt nộp\s+10\b/.test(text));
  check('Tổng quan trường: điểm trung bình toàn trường 5 trên thang 10 (đúng một nửa số câu)', /Điểm trung bình toàn trường\s+5\b/.test(text));
  check('Tổng quan trường: lượt AI so với hạn mức, có thanh dùng hạn mức', /Lượt AI trong kỳ\s+\d+ \/ \d+/.test(text) && (await tiles.getByRole('progressbar').count()) >= 1);
  const classList = orgPage.getByRole('list', { name: 'Điểm trung bình theo lớp' });
  await classList.waitFor();
  check('Điểm trung bình theo lớp: có tên lớp và điểm 5', (await classList.innerText()).includes(className) && /\b5\b/.test(await classList.innerText()));
  const body = await orgPage.locator('body').innerText();
  check('Chỉ có số tổng: không có tên giáo viên hay học sinh trên trang', !body.includes(teacherName) && !studentNames.some((n) => body.includes(n)));
  check('Thanh bên khu quản trị trường có mục Tổng quan, Trường và gói, Giáo viên', (await orgPage.getByRole('navigation', { name: 'Quản trị trường' }).getByRole('link').allInnerTexts()).join('|') === 'Tổng quan|Trường và gói|Giáo viên');
  check('Gói hiện tại: thẻ gói có nút Xem gói và hóa đơn', await visible(orgPage.getByRole('link', { name: 'Xem gói và hóa đơn' })));
  await shot(orgPage, '1-tong-quan-truong');

  await orgPage.getByRole('link', { name: 'Xem gói và hóa đơn' }).click();
  await orgPage.waitForURL(/\/truong\/thong-tin/);
  check('Xem gói và hóa đơn mở màn hình Trường và gói', pathOf(orgPage) === '/truong/thong-tin');

  // Màn hình hẹp.
  await orgPage.setViewportSize({ width: 390, height: 800 });
  await orgPage.goto(`${ADMIN_WEB}/truong`);
  await orgPage.getByRole('heading', { level: 1, name: 'Tổng quan trường' }).waitFor();
  await orgPage.getByRole('list', { name: 'Điểm trung bình theo lớp' }).waitFor();
  check('Tổng quan trường ở 390px không tràn ngang', await noOverflow(orgPage));
  await shot(orgPage, '2-tong-quan-truong-hep');
  await orgPage.setViewportSize({ width: 1440, height: 900 });

  // Quản trị trường không vào được khu quản trị hệ thống.
  await orgPage.goto(`${ADMIN_WEB}/quan-tri/cau-hoi`);
  await orgPage.getByText('LỖI 403').waitFor();
  check('Quản trị trường mở Kiểm duyệt câu hỏi nhận trang 403, URL giữ nguyên', pathOf(orgPage) === '/quan-tri/cau-hoi');
  const blocked = await call('GET', '/admin/overview', { token: orgAdmin }).then(
    () => 'được phép',
    (error) => String(error.message),
  );
  check('Máy chủ cũng chặn: quản trị trường gọi tổng quan hệ thống nhận 403', blocked.includes('403'), blocked);
} finally {
  await orgPage.close();
}

// ---- Quản trị hệ thống: Tổng quan và doanh thu ----

const adminPage = await newPage();
try {
  await login(adminPage, ADMIN_LOGIN, ADMIN_PASSWORD);
  check('Quản trị hệ thống đăng nhập vào thẳng Tổng quan', pathOf(adminPage) === '/quan-tri');
  await adminPage.getByRole('heading', { level: 1, name: 'Tổng quan', exact: true }).waitFor();
  const tiles = adminPage.getByRole('region', { name: 'Số liệu toàn hệ thống' });
  await tiles.waitFor();
  const text = await tiles.innerText();
  check('Tổng quan: có thẻ Trường, Giáo viên, Học sinh, Lượt AI toàn hệ thống, Ngân hàng câu hỏi', ['Trường', 'Giáo viên', 'Học sinh', 'Lượt AI toàn hệ thống', 'Ngân hàng câu hỏi'].every((t) => text.includes(t)));
  const students = Number(text.match(/Học sinh\s+([\d.]+)/)?.[1]?.replace(/\./g, '') ?? '0');
  check('Tổng quan: số học sinh tính cả mười em vừa tạo', students >= 10, String(students));
  check('Tổng quan: bảng số trường theo từng gói', await visible(adminPage.getByRole('table', { name: 'Số trường đang dùng từng gói' })));
  const chart = adminPage.getByRole('figure', { name: 'Lượt nộp bài theo ngày' });
  await chart.waitFor();
  const trendTotal = Number((await adminPage.getByText(/Tổng cả khoảng:/).innerText()).match(/:\s*([\d.]+)/)?.[1]?.replace(/\./g, '') ?? '0');
  check('Biểu đồ theo thời gian: mặc định 30 ngày (30 cột), tổng lượt nộp trong khoảng có mười lượt vừa làm', (await chart.getByRole('row').count()) === 30 && trendTotal >= 10, String(trendTotal));
  await shot(adminPage, '3-tong-quan-he-thong');

  await adminPage.getByLabel('Khoảng thời gian').selectOption('365');
  const monthly = adminPage.getByRole('figure', { name: 'Lượt nộp bài theo tháng' });
  await monthly.waitFor();
  check('Khoảng 12 tháng: máy chủ tự gom theo tháng, kỳ trống vẫn có cột', (await monthly.getByRole('row').count()) >= 12);
  await adminPage.getByLabel('Số liệu', { exact: true }).selectOption('newStudents');
  await adminPage.getByRole('figure', { name: 'Học sinh mới theo tháng' }).waitFor();
  check('Đổi số liệu sang Học sinh mới', true);
  await shot(adminPage, '4-bieu-do-theo-thang');

  await adminPage.getByRole('tab', { name: 'Doanh thu' }).click();
  await adminPage.getByRole('region', { name: 'Doanh thu từ gói dịch vụ' }).waitFor();
  check('Tab Doanh thu: thẻ doanh thu tháng này, từ trước tới nay, số giao dịch thành công tính từ VNPay', (await adminPage.getByRole('region', { name: 'Doanh thu từ gói dịch vụ' }).innerText()).includes('VNPay'));
  await adminPage.getByRole('figure', { name: 'Doanh thu theo ngày' }).waitFor();
  check('Tab Doanh thu: biểu đồ doanh thu theo kỳ và danh sách giao dịch (hoặc báo chưa có)', (await adminPage.getByRole('table', { name: 'Giao dịch thanh toán' }).count()) + (await adminPage.getByText('Chưa có giao dịch thanh toán nào.').count()) === 1);
  check('Tab Doanh thu: liên kết sang bảng điều khiển AdMob và Ad Manager (tab mới)', (await adminPage.locator('a[target="_blank"][href*="admob"], a[target="_blank"][href*="admanager"]').count()) === 2);
  check('Tab Doanh thu giữ trên URL (?tab=doanh-thu)', adminPage.url().includes('tab=doanh-thu'));
  await shot(adminPage, '5-doanh-thu');

  await adminPage.setViewportSize({ width: 390, height: 800 });
  await adminPage.goto(`${ADMIN_WEB}/quan-tri`);
  await adminPage.getByRole('figure', { name: 'Lượt nộp bài theo ngày' }).waitFor();
  check('Tổng quan hệ thống ở 390px không tràn ngang', await noOverflow(adminPage));
  await shot(adminPage, '6-tong-quan-he-thong-hep');
  await adminPage.setViewportSize({ width: 1440, height: 900 });

  // ---- Kiểm duyệt ngân hàng câu hỏi ----
  await adminPage.getByRole('link', { name: 'Câu hỏi', exact: true }).click();
  await adminPage.waitForURL(/\/quan-tri\/cau-hoi/);
  await adminPage.getByRole('heading', { level: 1, name: 'Kiểm duyệt câu hỏi' }).waitFor();
  const table = adminPage.getByRole('table', { name: 'Câu hỏi cần kiểm duyệt' });
  await table.waitFor();
  const hardRow = table.getByRole('row').filter({ hasText: hardContent });
  const easyRow = table.getByRole('row').filter({ hasText: easyContent });
  await hardRow.waitFor();
  check('Kiểm duyệt: câu Một đáp án đúng có 10 lượt trả lời, 0% và dấu Cần xem lại', (await hardRow.innerText()).includes('10') && (await hardRow.innerText()).includes('0%') && (await hardRow.innerText()).includes('Cần xem lại'));
  check('Kiểm duyệt: câu Đúng - Sai có 10 lượt, 100%, không có dấu Cần xem lại', (await easyRow.innerText()).includes('100%') && !(await easyRow.innerText()).includes('Cần xem lại'));
  const summary = adminPage.getByRole('region', { name: 'Số đếm của ngân hàng' });
  check('Kiểm duyệt: ba số đếm Đang trong ngân hàng, Đã ẩn, Cần xem lại', (await summary.innerText()).includes('Cần xem lại') && (await summary.innerText()).includes('Đã ẩn'));
  await shot(adminPage, '7-kiem-duyet');

  await adminPage.getByRole('checkbox', { name: 'Chỉ câu cần xem lại' }).click();
  await adminPage.waitForURL(/can-xem-lai=1/);
  await easyRow.waitFor({ state: 'detached' });
  check('Lọc chỉ câu cần xem lại: còn câu Một đáp án đúng, mất câu Đúng - Sai', (await table.getByRole('row').filter({ hasText: easyContent }).count()) === 0);
  check('Bộ lọc nằm trên URL (can-xem-lai=1)', adminPage.url().includes('can-xem-lai=1'));

  await adminPage.getByRole('button', { name: `Xem câu "${hardContent}"` }).click();
  const detail = adminPage.getByRole('dialog');
  await detail.getByText('Năm 2010', { exact: true }).waitFor();
  check('Xem câu chỉ đọc: có đáp án đúng, giải thích, kết quả làm bài, lời báo cần xem lại, không có ô nhập', (await detail.getByText('Đáp án đúng').count()) >= 1 && (await detail.getByText('UNESCO ghi danh năm 2010.').count()) >= 1 && (await detail.getByTestId('chat-luong').innerText()).includes('10 lượt trả lời, 0 lượt đúng hoàn toàn') && (await detail.getByText(/Câu này cần xem lại/).count()) === 1 && (await detail.getByRole('textbox').count()) === 0);
  await shot(adminPage, '8-xem-cau-chi-doc');
  await detail.getByRole('button', { name: 'Ẩn câu' }).click();
  const confirm = adminPage.getByRole('dialog').last();
  await confirm.getByText(/Bạn có chắc muốn ẩn câu hỏi/).waitFor();
  check('Ẩn câu: hộp xác nhận nói rõ bài đã phát hành và kết quả cũ giữ nguyên', (await confirm.innerText()).includes('Bài kiểm tra đã phát hành và kết quả cũ giữ nguyên'));
  await confirm.getByLabel(/Lý do/).fill('Sai năm khởi công, đã kiểm lại với nguồn');
  await shot(adminPage, '9-xac-nhan-an-cau');
  await confirm.getByRole('button', { name: 'Ẩn câu' }).click();
  await adminPage.getByText('Ẩn câu hỏi thành công.').first().waitFor();
  check('Ẩn câu: báo thành công, hộp đóng', (await adminPage.getByRole('dialog').count()) === 0);

  // Câu đã ẩn không còn trong ngân hàng dùng chung của giáo viên, bài kiểm tra cũ giữ nguyên.
  const shared = await call('GET', '/teacher/questions?scope=SHARED&pageSize=100', { token: teacher });
  check('Giáo viên không còn thấy câu đã ẩn trong tab Dùng chung', !shared.items.some((q) => q.id === hardId));
  const stillInQuiz = await call('GET', `/teacher/quizzes/${quiz.id}`, { token: teacher });
  check('Bài kiểm tra đã phát hành giữ nguyên câu đã ẩn', JSON.stringify(stillInQuiz).includes(hardContent.slice(0, 30)));

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/cau-hoi?trang-thai=da-an`);
  const hiddenTable = adminPage.getByRole('table', { name: 'Câu hỏi cần kiểm duyệt' });
  const hiddenRow = hiddenTable.getByRole('row').filter({ hasText: hardContent });
  await hiddenRow.waitFor();
  check('Lọc Đã ẩn: câu vừa ẩn có nhãn Đã ẩn và nút Hiện lại; câu Đúng - Sai không có ở đây', (await hiddenRow.getByText('Đã ẩn').count()) >= 1 && (await hiddenRow.getByRole('button', { name: /^Hiện lại câu/ }).count()) === 1 && (await hiddenTable.getByRole('row').filter({ hasText: easyContent }).count()) === 0);
  await shot(adminPage, '10-cau-da-an');

  await hiddenRow.getByRole('button', { name: /^Hiện lại câu/ }).click();
  const restore = adminPage.getByRole('dialog');
  await restore.getByLabel(/Lý do/).fill('Đã sửa lại nội dung');
  await restore.getByRole('button', { name: 'Hiện lại câu' }).click();
  await adminPage.getByText('Hiện lại câu hỏi thành công.').first().waitFor();
  const sharedAgain = await call('GET', '/teacher/questions?scope=SHARED&pageSize=100', { token: teacher });
  check('Hiện lại câu: giáo viên thấy lại câu trong tab Dùng chung', sharedAgain.items.some((q) => q.id === hardId));

  // Nhật ký thao tác.
  const hideLog = (await call('GET', '/admin/audit-logs?action=QUESTION_HIDDEN&pageSize=5', { token: admin })).items[0];
  const restoreLog = (await call('GET', '/admin/audit-logs?action=QUESTION_RESTORED&pageSize=5', { token: admin })).items[0];
  check('Nhật ký: có dòng Ẩn câu hỏi kèm lý do', hideLog?.actionLabel === 'Ẩn câu hỏi' && JSON.stringify(hideLog).includes('Sai năm khởi công'));
  check('Nhật ký: có dòng Hiện lại câu hỏi kèm lý do', restoreLog?.actionLabel === 'Hiện lại câu hỏi' && JSON.stringify(restoreLog).includes('Đã sửa lại nội dung'));
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/nhat-ky?hanh-dong=hien-lai-cau-hoi`);
  await adminPage.getByRole('table', { name: 'Nhật ký thao tác' }).getByText('Hiện lại câu hỏi').first().waitFor();
  check('Màn hình Nhật ký lọc được theo hành động Hiện lại câu hỏi', true);
  await shot(adminPage, '11-nhat-ky');

  // Màn hình hẹp.
  await adminPage.setViewportSize({ width: 390, height: 800 });
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/cau-hoi`);
  await adminPage.getByRole('heading', { level: 1, name: 'Kiểm duyệt câu hỏi' }).waitFor();
  await adminPage.getByRole('table', { name: 'Câu hỏi cần kiểm duyệt' }).waitFor();
  check('Kiểm duyệt ở 390px: trang không tràn ngang (bảng cuộn trong khung)', await noOverflow(adminPage));
  await shot(adminPage, '12-kiem-duyet-hep');
} finally {
  await adminPage.close();
}

await browser.close();

check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('Không có phản hồi 5xx từ API', badResponses.length === 0, badResponses.slice(0, 2).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\nTổng: ${results.length} bước, đạt ${results.length - failed.length}, lỗi ${failed.length}`);
if (failed.length > 0) process.exit(1);
