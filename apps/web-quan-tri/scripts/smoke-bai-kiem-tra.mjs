#!/usr/bin/env node
// Kiểm thử luồng Bài kiểm tra của bài học trên trình duyệt thật với API thật (docs/bai-kiem-tra.md): giáo viên tạo bài kiểm tra cho bài học của
// lớp cấp 1, cấp 2, cấp 3 ở web quản trị, thêm câu từ ngân hàng (chỉ câu hợp cấp), đặt điểm, đổi thứ tự, bỏ câu, xem trước như học sinh, lưu,
// phát hành (khóa danh sách câu), học sinh thấy bài trên trang bài học, đóng, nhân bản, tự đóng khi quá giờ đóng, nhân bản bài học kèm bài kiểm tra
// sang lớp khác cấp, độ khó của bài học.
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật), Ai:Mode=Simulated và Quizzes:AutoCloseIntervalSeconds nhỏ (vd 5), hai ứng
// dụng web đang chạy trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Bước chuẩn bị (trường, giáo viên, lớp, bài học đã xuất bản, câu hỏi mẫu) gọi
// thẳng API; mọi thao tác với bài kiểm tra đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:bai-kiem-tra -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5180/api/v1
//   ADMIN_WEB          mặc định http://localhost:5273
//   LEARNING_WEB       mặc định http://localhost:5274
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)
//   SKIP_AUTO_CLOSE    đặt 1 để bỏ bước chờ tác vụ tự đóng (khoảng 75 giây)

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5180/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5273').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5274').replace(/\/+$/, '');
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

// ---- Giờ Việt Nam dạng ô nhập: 07:00 06/10/2026 ----

function vietnamInput(offsetMinutes) {
  const at = new Date(Date.now() + offsetMinutes * 60_000);
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(at);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('day')}/${get('month')}/${get('year')}`;
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

/** Bài học đã xuất bản (AI giả lập soạn nội dung) cho một lớp. */
async function publishedLesson(teacher, classId, title, heritageId) {
  const lesson = await call('POST', '/teacher/lessons', { token: teacher, body: { classId, title, heritageIds: [heritageId] } });
  const draft = await call('POST', `/teacher/lessons/${lesson.id}/ai/compose`, { token: teacher, body: { length: 'DETAILED' } });
  await call('PUT', `/teacher/lessons/${lesson.id}`, {
    token: teacher,
    body: {
      summary: draft.summary,
      keyPoints: draft.keyPoints,
      sections: draft.sections.map((s) => ({
        type: s.type,
        title: s.title,
        body: s.body,
        imageUrl: s.imageUrl,
        milestoneYear: s.milestoneYear,
        eventId: s.eventId,
        sourceCitation: s.sourceCitation,
      })),
    },
  });
  const published = await call('POST', `/teacher/lessons/${lesson.id}/publish`, { token: teacher });
  return { id: lesson.id, code: published.accessCode, title };
}

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0);
let heritageId = 0;
for (const heritage of drafts) {
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    heritageId = heritage.id;
    break;
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (!heritageId) throw new Error('Không xuất bản được di sản có dòng thời gian (cần di sản đợt 1 trong CSDL tạm).');
for (let i = 1; i <= 3; i++) {
  await call('POST', `/admin/heritages/${heritageId}/media`, {
    token: admin,
    body: { mediaType: 'IMAGE', url: `https://upload.wikimedia.org/smoke-kt-${stamp}-${i}.jpg`, caption: `Ảnh thêm số ${i}`, author: 'Nguyễn Văn An', license: 'CC BY-SA 4.0', source: 'Wikimedia Commons' },
  });
}

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Lê Quý Đôn ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@lequydon.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@lequydon.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
const teacher = await createStaff('/org/teachers', orgAdmin, { fullName: 'Đặng Thị Mỹ Linh', username: teacherLogin, email: `${teacherLogin}@lequydon.edu.vn` });

const classes = {
  1: await call('POST', '/teacher/classes', { token: teacher, body: { name: `3A${stamp.slice(-2)}`, grade: 3, schoolYear: '2026-2027' } }),
  2: await call('POST', '/teacher/classes', { token: teacher, body: { name: `8A${stamp.slice(-2)}`, grade: 8, schoolYear: '2026-2027' } }),
  3: await call('POST', '/teacher/classes', { token: teacher, body: { name: `11A${stamp.slice(-2)}`, grade: 11, schoolYear: '2026-2027' } }),
};
const lessons = {
  1: await publishedLesson(teacher, classes[1].id, `Di sản qua lời kể bạn Na ${stamp}`, heritageId),
  2: await publishedLesson(teacher, classes[2].id, `Kinh thành qua các thời kỳ ${stamp}`, heritageId),
  3: await publishedLesson(teacher, classes[3].id, `Phân tích di sản ${stamp}`, heritageId),
};
const student2 = await addStudent(teacher, classes[2].id, 'Trần Thị Mai');

// Câu hỏi mẫu: các dạng của cấp 2 (và một câu cấp 3, một câu cấp 1) trong ngân hàng.
const library = (await call('GET', `/teacher/lessons/${lessons[2].id}/materials`, { token: teacher })).images;
const img = (n) => library[n]?.url ?? library[0].url;
const bank = [
  { key: 'single', questionType: 'SINGLE_CHOICE', content: `Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào? ${stamp}`, explanation: 'UNESCO ghi danh năm 2010.', difficultyLevel: 'EASY', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
  { key: 'truefalse', questionType: 'TRUE_FALSE', content: `Khu di tích nằm giữa lòng Hà Nội. ${stamp}`, explanation: 'Khu di tích ở trung tâm Hà Nội.', difficultyLevel: 'MEDIUM', imageUrl: img(0), answerIsTrue: true },
  { key: 'ordering', questionType: 'ORDERING', content: `Hãy sắp xếp các sự kiện theo thứ tự thời gian. ${stamp}`, explanation: 'Xếp theo năm.', difficultyLevel: 'HARD', steps: ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh'] },
  { key: 'fill', questionType: 'FILL_BLANK', content: `Vua ___ dời đô từ Hoa Lư về Thăng Long vào năm 1010. ${stamp}`, explanation: 'Lý Thái Tổ dời đô.', difficultyLevel: 'HARD', blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }] },
  { key: 'image', questionType: 'IMAGE_CHOICE', content: `Em hãy chọn hình có tên: Cổng Đoan Môn. ${stamp}`, explanation: 'Hình thứ hai là cổng.', difficultyLevel: 'EASY', options: [{ content: 'Điện Kính Thiên', imageUrl: img(0), isCorrect: false }, { content: 'Cổng Đoan Môn', imageUrl: img(1), isCorrect: true }, { content: 'Khu khảo cổ', imageUrl: img(2), isCorrect: false }] },
  { key: 'multi', questionType: 'MULTI_TRUE_FALSE', content: `Hoàng thành Thăng Long là trung tâm quyền lực của nhiều triều đại. ${stamp}`, explanation: 'Nhận định hai sai.', difficultyLevel: 'HARD', statements: [{ text: 'Khu di tích được UNESCO ghi danh năm 2010.', isTrue: true }, { text: 'Khu di tích nằm ở thành phố Huế.', isTrue: false }, { text: 'Khu di tích có nhiều lớp văn hóa chồng lên nhau.', isTrue: true }] },
];
for (const q of bank) {
  const { key, ...body } = q;
  const created = await call('POST', '/teacher/questions', { token: teacher, body: { ...body, heritageId } });
  q.id = created.id;
  if (created.reviewStatus === 'PENDING') await call('POST', `/teacher/questions/${created.id}/approve`, { token: teacher });
  q.key = key;
}
const byKey = Object.fromEntries(bank.map((q) => [q.key, q]));
console.log(`Đã chuẩn bị: lớp ${classes[1].name}, ${classes[2].name}, ${classes[3].name}; ${bank.length} câu hỏi đã duyệt; học sinh ${student2}.`);

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

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `bai-kiem-tra-${name}.png`), fullPage: true });
const pathOf = (page) => new URL(page.url()).pathname;
const toast = (page, text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 15000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const rowOf = (page, name) => page.getByRole('table', { name: 'Bài kiểm tra của tôi' }).getByRole('row', { name });

/** Tạo bài kiểm tra từ màn hình Bài kiểm tra của tôi: chọn bài học theo tên, đặt tên, mở trang soạn. */
async function createQuiz(page, lessonTitle, name) {
  await page.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
  await page.getByRole('button', { name: 'Tạo bài kiểm tra' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Tạo bài kiểm tra' });
  await dialog.getByRole('radio', { name: lessonTitle }).check();
  await dialog.getByLabel('Tên bài kiểm tra').fill(name);
  await dialog.getByRole('button', { name: 'Tạo bài kiểm tra' }).click();
  await page.waitForURL(/\/giao-vien\/kiem-tra\/\d+$/);
  await page.getByRole('heading', { level: 1, name }).waitFor();
  return Number(pathOf(page).split('/').pop());
}

const teacherPage = await newPage();
try {
  // ---- Giáo viên đăng nhập ----
  await teacherPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await teacherPage.getByLabel('Email hoặc tên đăng nhập').fill(teacherLogin);
  await teacherPage.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await teacherPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await teacherPage.waitForURL(/\/(giao-vien|tai-khoan)/);
  check('Giáo viên đăng nhập web quản trị', /^\/(giao-vien|tai-khoan)/.test(pathOf(teacherPage)));

  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
  await teacherPage.getByRole('heading', { level: 1, name: 'Bài kiểm tra' }).waitFor();
  await teacherPage.getByText(/Chưa có bài kiểm tra nào\. Tạo bài kiểm tra từ một bài học/).waitFor();
  check('Bài kiểm tra của tôi: chưa có bài nào, có hướng dẫn tạo', true);
  await shot(teacherPage, '0-danh-sach-rong');

  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  const lessonTable = teacherPage.getByRole('table', { name: 'Bài học của tôi' });
  await lessonTable.waitFor();
  check('Bài học của tôi: cột Độ khó ghi "Chưa có bài kiểm tra" cho cả ba bài', (await lessonTable.getByText('Chưa có bài kiểm tra').count()) === 3);
  await teacherPage.getByLabel('Độ khó').selectOption('kho');
  await teacherPage.getByText('Không tìm thấy kết quả phù hợp').waitFor();
  check('Bộ lọc Độ khó: bài chưa có bài kiểm tra không khớp mức nào', true);

  // ---- Bài kiểm tra lớp cấp 2 ----
  const quiz2Name = `Kiểm tra 15 phút về Hoàng thành ${stamp}`;
  const quiz2 = await createQuiz(teacherPage, lessons[2].title, quiz2Name);
  check('Tạo bài kiểm tra: mở trang soạn, bài Nháp ở lớp cấp 2', (await teacherPage.getByText(/Lớp .* · Cấp 2/).count()) > 0 && (await teacherPage.getByText('Nháp').count()) > 0);
  check('Cấp 2: ô thời gian làm tùy chọn, bài học chỉ đọc', (await teacherPage.getByLabel('Thời gian làm (phút)').isEnabled()) && (await teacherPage.getByLabel('Bài học').isDisabled()));
  await shot(teacherPage, '1-soan-cap-2-moi-tao');

  // Thêm câu: hộp chọn câu chỉ hiện câu hợp cấp 2.
  await teacherPage.getByRole('button', { name: 'Thêm câu từ ngân hàng' }).click();
  const picker = teacherPage.getByRole('dialog', { name: 'Chọn câu từ ngân hàng' });
  await picker.getByRole('checkbox', { name: new RegExp(`Chọn câu: ${byKey.single.content.slice(0, 20)}`) }).waitFor();
  check('Hộp chọn câu cấp 2: có câu một đáp án, đúng sai, sắp xếp, điền từ', (await picker.getByRole('checkbox', { name: /Chọn câu:/ }).count()) >= 4);
  check('Hộp chọn câu cấp 2: câu chọn hình đúng (cấp 1) bị ẩn', (await picker.getByRole('checkbox', { name: /chọn hình có tên: Cổng Đoan Môn/ }).count()) === 0);
  check('Hộp chọn câu có dòng giải thích dạng dùng được ở cấp', (await picker.getByText(/Chỉ hiện câu có dạng dùng được ở lớp cấp 2/).count()) === 1);
  for (const key of ['single', 'truefalse', 'ordering', 'fill']) {
    await picker.getByRole('checkbox', { name: new RegExp(`Chọn câu: ${byKey[key].content.slice(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).check();
  }
  await shot(teacherPage, '2-chon-cau-tu-ngan-hang');
  await picker.getByRole('button', { name: /^Xem câu:/ }).first().click();
  const peek = teacherPage.getByRole('dialog', { name: 'Xem câu hỏi' });
  await peek.getByTestId('xem-truoc').waitFor();
  check('Con mắt mở câu ở chế độ xem như học sinh, chồng lên hộp chọn câu', (await peek.getByText(/Cấp 2/).count()) > 0);
  await peek.getByRole('button', { name: 'Đóng' }).last().click();
  check('Đóng xem câu vẫn giữ 4 câu đang chọn', (await picker.getByText('Đã chọn 4 câu').count()) === 1);
  await picker.getByRole('button', { name: 'Thêm vào bài kiểm tra' }).click();
  await teacherPage.getByText('Danh sách câu hỏi (4 câu)').waitFor();
  check('Thêm 4 câu: mỗi câu 1 điểm, tổng 4 điểm', (await teacherPage.getByText(/Tổng điểm tự tính: 4 điểm/).count()) > 0);

  // Điểm, thứ tự, bỏ câu.
  const pointBox = teacherPage.getByLabel('Điểm câu 1');
  await pointBox.fill('2,5');
  await pointBox.blur();
  await teacherPage.getByText(/Tổng điểm tự tính: 5,5 điểm/).waitFor();
  check('Đổi điểm câu 1 thành 2,5: tổng 5,5 điểm', true);
  await teacherPage.getByLabel('Điểm câu 2').fill('0,1');
  await teacherPage.getByLabel('Điểm câu 2').blur();
  check('Điểm sai bước 0,25 bị chặn ngay trên giao diện', await teacherPage.getByText('Điểm lớn hơn 0, không quá 100, theo bước 0,25.').isVisible());
  await teacherPage.getByLabel('Điểm câu 2').fill('1');
  await teacherPage.getByLabel('Điểm câu 2').blur();
  const firstBefore = (await teacherPage.getByTestId('cau-1').locator('td').nth(2).textContent()) ?? '';
  await teacherPage.getByRole('button', { name: /Đổi thứ tự "Câu 1"/ }).focus();
  await teacherPage.keyboard.press('ArrowDown');
  await teacherPage.waitForFunction((text) => !document.querySelector('[data-testid="cau-1"]')?.textContent?.includes(text), firstBefore.slice(0, 25));
  check('Đổi thứ tự bằng phím mũi tên xuống', (await teacherPage.getByTestId('cau-2').textContent()).includes(firstBefore.slice(0, 25)));
  await teacherPage.getByRole('button', { name: 'Bỏ câu 4 khỏi bài kiểm tra' }).click();
  await teacherPage.getByText('Danh sách câu hỏi (3 câu)').waitFor();
  check('Bỏ câu 4: còn 3 câu, đánh lại thứ tự', (await teacherPage.getByTestId(/cau-/).count()) === 3);
  // Thêm lại một câu để đủ 4.
  await teacherPage.getByRole('button', { name: 'Thêm câu từ ngân hàng' }).click();
  const picker2 = teacherPage.getByRole('dialog', { name: 'Chọn câu từ ngân hàng' });
  await picker2.getByRole('checkbox', { name: /Chọn câu:/ }).first().waitFor();
  check('Hộp chọn câu: ba câu đã có trong bài hiện mờ, không chọn lại được', (await picker2.getByRole('checkbox', { name: /Chọn câu:/ }).evaluateAll((boxes) => boxes.filter((b) => b.disabled && b.checked).length)) === 3);
  await picker2.getByRole('checkbox', { name: /Chọn câu:/ }).evaluateAll((boxes) => boxes.find((b) => !b.disabled)?.click());
  await picker2.getByRole('button', { name: 'Thêm vào bài kiểm tra' }).click();
  await teacherPage.getByText('Danh sách câu hỏi (4 câu)').waitFor();

  // Xem trước như học sinh.
  await teacherPage.getByRole('button', { name: 'Xem trước như học sinh' }).click();
  const preview = teacherPage.getByRole('dialog', { name: 'Xem trước như học sinh' });
  await preview.getByTestId('xem-truoc').waitFor();
  check('Xem trước như học sinh: câu 1/4 theo bố cục cấp 2', (await preview.getByText(/^Câu 1\/4/).count()) === 1 && (await preview.getByText(/Cấp 2/).count()) > 0);
  await preview.getByRole('button', { name: /Câu sau/ }).click();
  await preview.getByText(/^Câu 2\/4/).waitFor();
  await shot(teacherPage, '3-xem-truoc-nhu-hoc-sinh');
  await preview.getByRole('button', { name: 'Đóng' }).last().click();

  // Thông tin chung rồi Lưu.
  await teacherPage.getByLabel('Mô tả / hướng dẫn').fill('Em đọc kỹ từng câu rồi trả lời. Hết giờ hệ thống tự nộp bài.');
  await teacherPage.getByLabel('Độ khó').selectOption('MEDIUM');
  await teacherPage.getByLabel('Thời gian làm (phút)').fill('15');
  await teacherPage.getByLabel('Mở lúc *').fill(vietnamInput(-60));
  await teacherPage.getByLabel('Đóng lúc *').fill(vietnamInput(60 * 24));
  await teacherPage.getByRole('switch', { name: /Xáo câu/ }).check();
  await teacherPage.getByRole('switch', { name: /Cho xem đáp án sau khi nộp/ }).check();
  await teacherPage.getByLabel('Đóng lúc *').fill(vietnamInput(-120));
  await teacherPage.getByRole('button', { name: 'Lưu' }).click();
  await teacherPage.getByText('Giờ đóng phải sau giờ mở.').waitFor();
  check('Giờ đóng trước giờ mở: báo lỗi dưới ô, chưa gọi máy chủ', true);
  await teacherPage.getByLabel('Đóng lúc *').fill(vietnamInput(60 * 24));
  await teacherPage.getByRole('button', { name: 'Lưu' }).click();
  await toast(teacherPage, 'Lưu bài kiểm tra thành công');
  await shot(teacherPage, '4-soan-cap-2-da-day-du');
  await teacherPage.reload();
  await teacherPage.getByLabel('Tên bài kiểm tra *').waitFor();
  check('Tải lại trang: thiết lập đã lưu (mô tả, thời gian làm, giờ mở, giờ đóng, hai công tắc)',
    (await teacherPage.getByLabel('Thời gian làm (phút)').inputValue()) === '15' &&
      (await teacherPage.getByLabel('Mở lúc *').inputValue()) === vietnamInput(-60) &&
      (await teacherPage.getByLabel('Đóng lúc *').inputValue()) === vietnamInput(60 * 24) &&
      (await teacherPage.getByRole('switch', { name: /Xáo câu/ }).isChecked()) &&
      (await teacherPage.getByRole('switch', { name: /Cho xem đáp án sau khi nộp/ }).isChecked()) &&
      (await teacherPage.getByLabel('Mô tả / hướng dẫn').inputValue()).startsWith('Em đọc kỹ'));

  // Phát hành.
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  const confirmPublish = teacherPage.getByRole('dialog', { name: 'Phát hành bài kiểm tra?' });
  await confirmPublish.waitFor();
  check('Phát hành: hộp xác nhận nhắc khóa danh sách câu và nêu mã bài học, giờ mở, giờ đóng', (await confirmPublish.textContent()).includes('danh sách câu hỏi và điểm sẽ bị khóa') && (await confirmPublish.textContent()).includes(lessons[2].code));
  await shot(teacherPage, '5-xac-nhan-phat-hanh');
  await confirmPublish.getByRole('button', { name: 'Phát hành' }).click();
  const codeDialog = teacherPage.getByRole('dialog', { name: 'Mã bài học' });
  await codeDialog.getByTestId('ma-bai-hoc').waitFor({ timeout: 15000 });
  check('Phát hành xong: nhắc đưa mã bài học cho lớp', (await codeDialog.getByTestId('ma-bai-hoc').textContent())?.trim() === lessons[2].code);
  await codeDialog.getByRole('button', { name: 'Đóng' }).first().click();
  await teacherPage.getByText(/Bài kiểm tra đã phát hành: danh sách câu/).waitFor();
  check('Đã phát hành: không còn nút Phát hành, Thêm câu, ô điểm; trường khóa bị vô hiệu', (await teacherPage.getByRole('button', { name: 'Phát hành' }).count()) === 0 && (await teacherPage.getByRole('button', { name: 'Thêm câu từ ngân hàng' }).count()) === 0 && (await teacherPage.getByLabel('Điểm câu 1').count()) === 0 && (await teacherPage.getByLabel('Thời gian làm (phút)').isDisabled()) && (await teacherPage.getByLabel('Mở lúc *').isDisabled()));
  check('Đã phát hành: vẫn sửa được tên, mô tả, giờ đóng', (await teacherPage.getByLabel('Tên bài kiểm tra *').isEnabled()) && (await teacherPage.getByLabel('Đóng lúc *').isEnabled()));
  check('Đã phát hành: thanh trạng thái có số đã nộp, Nhân bản, Kết quả, Đóng bài kiểm tra', (await teacherPage.getByTestId('thanh-trang-thai').textContent()).includes('0/1 em đã nộp') && (await teacherPage.getByRole('button', { name: 'Nhân bản' }).isVisible()) && (await teacherPage.getByRole('link', { name: 'Kết quả' }).isVisible()) && (await teacherPage.getByRole('button', { name: 'Đóng bài kiểm tra' }).isVisible()));
  await shot(teacherPage, '6-da-phat-hanh');
  const newClose = vietnamInput(60 * 48);
  await teacherPage.getByLabel('Đóng lúc *').fill(newClose);
  await teacherPage.getByRole('button', { name: 'Lưu' }).click();
  await toast(teacherPage, 'Lưu bài kiểm tra thành công');
  check('Sau khi phát hành: kéo dài giờ đóng được và lưu thành công', (await teacherPage.getByLabel('Đóng lúc *').inputValue()) === newClose);

  // ---- Học sinh lớp cấp 2 thấy bài trên trang bài học ----
  const pupil = await newPage();
  await pupil.goto(`${LEARNING_WEB}/dang-nhap`);
  await pupil.getByLabel('Mã học sinh').fill(student2);
  await pupil.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await pupil.getByRole('button', { name: 'Đăng nhập' }).click();
  await pupil.waitForURL(/\/hoc$/);
  await pupil.goto(`${LEARNING_WEB}/bai-hoc/${lessons[2].code}`);
  await pupil.getByRole('tab', { name: 'Bài kiểm tra' }).click();
  await pupil.getByText(quiz2Name).waitFor();
  check('Học sinh lớp cấp 2: thấy bài kiểm tra đã phát hành trên tab Bài kiểm tra của bài học', true);
  await shot(pupil, '7-hoc-sinh-thay-bai');
  await pupil.close();

  // ---- Danh sách: trạng thái, nhân bản, độ khó của bài học ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
  const quizTable = teacherPage.getByRole('table', { name: 'Bài kiểm tra của tôi' });
  await quizTable.waitFor();
  const row2 = quizTable.getByRole('row', { name: new RegExp(quiz2Name) });
  check('Danh sách: bài đang phát hành, 4 câu 15 phút, 0/1 đã nộp', (await row2.textContent()).includes('Đang phát hành') && (await row2.textContent()).includes('4 câu · 15 phút') && (await row2.textContent()).includes('0/1'));
  await teacherPage.getByRole('button', { name: `Nhân bản "${quiz2Name}"`, exact: true }).click();
  await teacherPage.waitForURL(/\/giao-vien\/kiem-tra\/\d+$/);
  await teacherPage.getByRole('heading', { level: 1, name: `${quiz2Name} (bản sao)` }).waitFor();
  check('Nhân bản: bản Nháp mới cùng 4 câu, không chép giờ mở và đóng', (await teacherPage.getByText('Danh sách câu hỏi (4 câu)').count()) === 1 && (await teacherPage.getByLabel('Mở lúc *').inputValue()) === '' && (await teacherPage.getByLabel('Đóng lúc *').inputValue()) === '' && (await teacherPage.getByRole('button', { name: 'Phát hành' }).isVisible()));
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByText(/Chưa đủ điều kiện phát hành\. Còn thiếu: .*giờ mở/).waitFor();
  check('Phát hành khi thiếu giờ: báo ngay dưới thanh thao tác, không hỏi xác nhận', (await teacherPage.getByRole('dialog', { name: 'Phát hành bài kiểm tra?' }).count()) === 0);
  await shot(teacherPage, '8-chua-du-dieu-kien');

  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  await lessonTable.waitFor();
  const lessonRow2 = lessonTable.getByRole('row', { name: new RegExp(lessons[2].title) });
  check('Bài học của tôi: độ khó tính từ 2 bài kiểm tra có 4 câu (dễ, trung bình, khó, khó) là "Khó"', (await lessonRow2.textContent()).includes('Khó'));
  await teacherPage.getByLabel('Độ khó').selectOption('kho');
  await teacherPage.waitForFunction(() => document.querySelectorAll('tbody tr').length === 1);
  check('Lọc độ khó "Khó": chỉ còn bài có bài kiểm tra mức khó', (await teacherPage.locator('tbody tr').count()) === 1 && teacherPage.url().includes('do-kho=kho'));
  await shot(teacherPage, '9-bai-hoc-loc-do-kho');

  // ---- Nhân bản bài học kèm bài kiểm tra sang lớp cấp 1 ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/bai-hoc`);
  await lessonTable.waitFor();
  await teacherPage.getByRole('button', { name: `Nhân bản "${lessons[2].title}" sang lớp khác` }).click();
  const copy = teacherPage.getByRole('dialog', { name: 'Nhân bản bài học sang lớp khác' });
  const target = await copy.getByLabel('Lớp đích').locator('option', { hasText: classes[1].name }).getAttribute('value');
  await copy.getByLabel('Lớp đích').selectOption(target);
  check('Nhân bản bài học: ô "Chép kèm các bài kiểm tra của bài" mặc định chọn, có cảnh báo khác cấp', (await copy.getByRole('checkbox', { name: 'Chép kèm các bài kiểm tra của bài' }).isChecked()) && (await copy.getByText(/Câu hỏi có dạng không dùng được ở cấp 1 sẽ không được chép/).count()) === 1);
  await shot(teacherPage, '10-nhan-ban-bai-hoc-kem-kiem-tra');
  await copy.getByRole('button', { name: 'Nhân bản' }).click();
  await teacherPage.waitForURL(/\/giao-vien\/bai-hoc\/\d+$/);
  await teacherPage.getByText(/Đã chép 2 bài kiểm tra thành bản nháp/).first().waitFor();
  check('Nhân bản kèm bài kiểm tra sang lớp cấp 1: báo đã chép 2 bài và bỏ qua câu không hợp cấp', (await teacherPage.getByText(/Bỏ qua 4 câu hỏi/).count()) > 0);
  await teacherPage.getByRole('list', { name: 'Các bài kiểm tra của bài' }).waitFor();
  check('Trang Soạn bài học của bản nhân bản liệt kê 2 bài kiểm tra nháp', (await teacherPage.getByRole('list', { name: 'Các bài kiểm tra của bài' }).locator('li').count()) === 2);
  await shot(teacherPage, '11-bai-hoc-nhan-ban');
  await teacherPage.getByRole('list', { name: 'Các bài kiểm tra của bài' }).getByRole('link').first().click();
  await teacherPage.waitForURL(/\/giao-vien\/kiem-tra\/\d+$/);
  await teacherPage.getByLabel('Thời gian làm (phút)').waitFor();
  check('Bài chép sang lớp cấp 1: thời gian làm bị bỏ, ô bị khóa "Không đồng hồ", chỉ còn câu hợp cấp 1', (await teacherPage.getByLabel('Thời gian làm (phút)').isDisabled()) && (await teacherPage.getByLabel('Thời gian làm (phút)').getAttribute('placeholder')) === 'Không đồng hồ' && (await teacherPage.getByText('Danh sách câu hỏi (2 câu)').count()) === 1);
  await shot(teacherPage, '12-soan-cap-1');

  // ---- Bài kiểm tra lớp cấp 3: thời gian làm bắt buộc khi phát hành ----
  const quiz3Name = `Phân tích tư liệu ${stamp}`;
  await createQuiz(teacherPage, lessons[3].title, quiz3Name);
  await teacherPage.getByRole('button', { name: 'Thêm câu từ ngân hàng' }).click();
  const picker3 = teacherPage.getByRole('dialog', { name: 'Chọn câu từ ngân hàng' });
  await picker3.getByRole('checkbox', { name: `Chọn câu: ${byKey.multi.content}`, exact: true }).check();
  check('Hộp chọn câu cấp 3: không có câu điền từ (dạng của cấp 2)', (await picker3.getByRole('checkbox', { name: /Vua ___/ }).count()) === 0);
  await picker3.getByRole('button', { name: 'Thêm vào bài kiểm tra' }).click();
  await teacherPage.getByText('Danh sách câu hỏi (1 câu)').waitFor();
  await teacherPage.getByLabel('Mở lúc *').fill(vietnamInput(-30));
  await teacherPage.getByLabel('Đóng lúc *').fill(vietnamInput(1));
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByText('Lớp cấp 3 bắt buộc nhập thời gian làm.').first().waitFor();
  check('Cấp 3: để trống thời gian làm thì Phát hành báo "bắt buộc nhập thời gian làm"', true);
  await shot(teacherPage, '13-cap-3-bat-buoc-thoi-gian');
  await teacherPage.getByLabel('Thời gian làm (phút) *').fill('45');
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByRole('dialog', { name: 'Phát hành bài kiểm tra?' }).getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByRole('dialog', { name: 'Mã bài học' }).getByTestId('ma-bai-hoc').waitFor({ timeout: 15000 });
  await teacherPage.getByRole('dialog', { name: 'Mã bài học' }).getByRole('button', { name: 'Đóng' }).first().click();
  check('Cấp 3: có thời gian làm 45 phút thì phát hành được', (await teacherPage.getByText(/Bài kiểm tra đã phát hành/).count()) > 0);
  const published3At = Date.now();

  // ---- Đóng bài bằng tay từ danh sách ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
  await quizTable.waitFor();
  await teacherPage.getByRole('button', { name: `Đóng "${quiz2Name}"`, exact: true }).click();
  const confirmClose = teacherPage.getByRole('dialog', { name: `Đóng bài kiểm tra "${quiz2Name}"?` });
  check('Đóng bài: hộp xác nhận nói rõ không mở lại được và số đã nộp', (await confirmClose.textContent()).includes('không mở lại được') && (await confirmClose.textContent()).includes('0/1 em đã nộp'));
  await shot(teacherPage, '14-xac-nhan-dong');
  await confirmClose.getByRole('button', { name: 'Đóng bài kiểm tra' }).click();
  await toast(teacherPage, 'Đã đóng bài kiểm tra');
  await rowOf(teacherPage, new RegExp(quiz2Name)).filter({ hasText: 'Đã đóng' }).first().waitFor();
  const closedRow = rowOf(teacherPage, new RegExp(quiz2Name)).filter({ hasText: 'Đã đóng' });
  check('Đóng bài: trạng thái Đã đóng, hết nút Đóng, còn Nhân bản và Kết quả', (await closedRow.count()) === 1 && (await closedRow.getByRole('button', { name: /^Đóng "/ }).count()) === 0 && (await closedRow.getByRole('button', { name: /^Nhân bản "/ }).isEnabled()) && (await closedRow.getByRole('button', { name: /^Kết quả "/ }).isVisible()));
  await shot(teacherPage, '15-danh-sach-day-du');

  // ---- Xóa bài nháp ----
  const copyRows = quizTable.getByRole('row', { name: `${quiz2Name} (bản sao)` });
  const copiesBefore = await copyRows.count();
  await copyRows.first().getByRole('button', { name: /^Xóa "/ }).click();
  await teacherPage.getByRole('dialog', { name: 'Xóa bài kiểm tra' }).getByRole('button', { name: 'Xóa' }).click();
  await toast(teacherPage, 'thành công');
  await teacherPage.waitForFunction((n) => [...document.querySelectorAll('tbody tr')].filter((r) => r.textContent.includes('(bản sao)')).length === n, copiesBefore - 1);
  check('Xóa bài nháp: dòng biến khỏi danh sách', copiesBefore === 2 && (await copyRows.count()) === 1);

  // ---- Lọc trên URL ----
  await teacherPage.getByLabel('Trạng thái').selectOption('da-dong');
  await teacherPage.waitForFunction(() => location.search.includes('trang-thai=da-dong'));
  await teacherPage.waitForFunction(() => !document.querySelector('table')?.textContent?.includes('Đang phát hành'));
  check('Lọc trạng thái Đã đóng nằm trên URL và chỉ còn bài đã đóng', (await quizTable.getByRole('row').count()) >= 2 && !(await quizTable.textContent()).includes('Đang phát hành'));

  // ---- Khung điện thoại ----
  const phone = await newPage({ viewport: { width: 390, height: 844 } });
  await phone.goto(`${ADMIN_WEB}/dang-nhap`);
  await phone.getByLabel('Email hoặc tên đăng nhập').fill(teacherLogin);
  await phone.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await phone.getByRole('button', { name: 'Đăng nhập' }).click();
  await phone.waitForURL(/\/(giao-vien|tai-khoan)/);
  await phone.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
  await phone.getByRole('heading', { level: 1, name: 'Bài kiểm tra' }).waitFor();
  check('390px: màn hình Bài kiểm tra của tôi không tràn ngang trang', await noOverflow(phone));
  await shot(phone, 'dien-thoai-danh-sach');
  await phone.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${quiz2}`);
  await phone.getByLabel('Tên bài kiểm tra *').waitFor();
  check('390px: màn hình Soạn và phát hành bài kiểm tra không tràn ngang trang', await noOverflow(phone));
  await shot(phone, 'dien-thoai-soan');
  await phone.close();

  // ---- Tác vụ nền tự đóng bài quá giờ đóng (bài cấp 3 đóng sau 1 phút) ----
  if (process.env.SKIP_AUTO_CLOSE === '1') {
    console.log('Bỏ qua bước chờ tác vụ tự đóng (SKIP_AUTO_CLOSE=1).');
  } else {
    const wait = Math.max(0, published3At + 75_000 - Date.now());
    console.log(`Chờ ${Math.ceil(wait / 1000)} giây cho giờ đóng của bài cấp 3 và tác vụ tự đóng…`);
    await sleep(wait);
    await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra`);
    await quizTable.waitFor();
    await rowOf(teacherPage, new RegExp(quiz3Name)).filter({ hasText: 'Đã đóng' }).first().waitFor({ timeout: 20000 });
    check('Quá giờ đóng: tác vụ nền tự chuyển bài cấp 3 sang Đã đóng', true);
    await shot(teacherPage, '16-tu-dong-dong');
  }
} catch (error) {
  console.error(error);
  check(`Kịch bản dừng giữa chừng: ${String(error.message ?? error).split(/\r?\n/)[0]}`, false);
  await shot(teacherPage, 'loi').catch(() => undefined);
  console.log(`URL lúc dừng: ${teacherPage.url()}`);
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
