#!/usr/bin/env node
// Kiểm thử luồng Thống kê và gợi ý trên trình duyệt thật với API thật (docs/thong-ke-goi-y.md): giáo viên xem Tiến độ, Thành thạo (bảng nhiệt),
// Gợi ý ôn tập của lớp, tạo bài ôn tập từ gợi ý, Kết quả bài kiểm tra (Tổng quan, Từng câu, Từng học sinh, Chi tiết bài làm, Gợi ý), Hồ sơ học tập
// của học sinh, đóng bài; học sinh cấp 1, 2, 3 thấy "Gợi ý cho em" ở Trang học và ở Kết quả bài làm.
//
// Cần: API (nhánh thống kê và gợi ý) đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật) và Ai:Mode=Simulated, hai ứng dụng web đang chạy
// trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Bước chuẩn bị (trường, giáo viên, lớp, bài học, câu hỏi, bài kiểm tra, các lượt làm bài) gọi thẳng
// API; mọi thao tác xem đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:thong-ke-goi-y -w @dsvhvn/web-quan-tri
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

/** Thêm học sinh, đổi mật khẩu lần đầu; trả mã, id và token. */
async function addStudent(teacher, classId, fullName) {
  const created = await call('POST', `/teacher/classes/${classId}/students`, { token: teacher, body: { fullName } });
  const { studentCode, temporaryPassword } = created.sheet.entries[0];
  const session = await call('POST', '/student/auth/login', { body: { studentCode, password: temporaryPassword } });
  const changed = await call('PUT', '/student/me/password', {
    token: session.accessToken,
    body: { newPassword: STUDENT_PASSWORD, confirmNewPassword: STUDENT_PASSWORD },
  });
  return { code: studentCode, id: created.students[0].id, token: changed.accessToken, name: fullName };
}

async function publishedLesson(teacher, classId, title, heritageId) {
  const lesson = await call('POST', '/teacher/lessons', { token: teacher, body: { classId, title, heritageIds: [heritageId] } });
  const draft = await call('POST', `/teacher/lessons/${lesson.id}/ai/compose`, { token: teacher, body: { length: 'DETAILED' } });
  await call('PUT', `/teacher/lessons/${lesson.id}`, {
    token: teacher,
    body: {
      summary: draft.summary,
      keyPoints: draft.keyPoints,
      sections: draft.sections.map((s) => ({ type: s.type, title: s.title, body: s.body, imageUrl: s.imageUrl, milestoneYear: s.milestoneYear, eventId: s.eventId, sourceCitation: s.sourceCitation })),
    },
  });
  const published = await call('POST', `/teacher/lessons/${lesson.id}/publish`, { token: teacher });
  const materials = await call('GET', `/teacher/lessons/${lesson.id}/materials`, { token: teacher });
  return { id: lesson.id, code: published.accessCode, title, images: materials.images };
}

/** Câu hỏi mẫu theo cấp, đã duyệt; mỗi di sản một bộ. */
async function questionsFor(teacher, level, heritageId, images, tag) {
  const img = (n) => images[n]?.url ?? images[0].url;
  const defs = {
    1: [
      { key: 'tf', questionType: 'TRUE_FALSE', content: `Khu di tích nằm giữa lòng Hà Nội. ${tag}`, explanation: 'Khu di tích ở trung tâm Hà Nội.', difficultyLevel: 'EASY', imageUrl: img(0), answerIsTrue: true },
      { key: 'image', questionType: 'IMAGE_CHOICE', content: `Em hãy chọn hình có tên: Cổng Đoan Môn. ${tag}`, explanation: 'Hình thứ hai là cổng.', difficultyLevel: 'EASY', options: [{ content: 'Điện Kính Thiên', imageUrl: img(0), isCorrect: false }, { content: 'Cổng Đoan Môn', imageUrl: img(1), isCorrect: true }, { content: 'Khu khảo cổ', imageUrl: img(2), isCorrect: false }] },
      { key: 'ordering', questionType: 'ORDERING', content: `Hãy sắp xếp các sự kiện theo thứ tự thời gian. ${tag}`, explanation: 'Xếp theo năm.', difficultyLevel: 'EASY', steps: ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh'] },
    ],
    2: [
      { key: 'single', questionType: 'SINGLE_CHOICE', content: `Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào? ${tag}`, explanation: 'UNESCO ghi danh năm 2010.', difficultyLevel: 'EASY', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
      { key: 'tf', questionType: 'TRUE_FALSE', content: `Khu di tích nằm giữa lòng Hà Nội. ${tag}`, explanation: 'Khu di tích ở trung tâm Hà Nội.', difficultyLevel: 'MEDIUM', imageUrl: img(0), answerIsTrue: true },
      { key: 'ordering', questionType: 'ORDERING', content: `Hãy sắp xếp các sự kiện theo thứ tự thời gian. ${tag}`, explanation: 'Xếp theo năm.', difficultyLevel: 'HARD', steps: ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh'] },
      { key: 'fill', questionType: 'FILL_BLANK', content: `Vua ___ dời đô từ Hoa Lư về Thăng Long vào năm 1010. ${tag}`, explanation: 'Lý Thái Tổ dời đô.', difficultyLevel: 'HARD', blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }], distractors: ['Lê Lợi', 'Trần Hưng Đạo'] },
    ],
    3: [
      { key: 'single', questionType: 'SINGLE_CHOICE', content: `Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào? ${tag}`, explanation: 'UNESCO ghi danh năm 2010.', difficultyLevel: 'EASY', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
      { key: 'single', questionType: 'SINGLE_CHOICE', content: `Năm nào Hoàng thành được UNESCO công nhận là Di sản thế giới? ${tag} (b)`, explanation: 'Năm 2010.', difficultyLevel: 'MEDIUM', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
      { key: 'multi', questionType: 'MULTI_TRUE_FALSE', content: `Hoàng thành Thăng Long là trung tâm quyền lực của nhiều triều đại. ${tag}`, explanation: 'Nhận định hai sai.', difficultyLevel: 'HARD', statements: [{ text: 'Khu di tích được UNESCO ghi danh năm 2010.', isTrue: true }, { text: 'Khu di tích nằm ở thành phố Huế.', isTrue: false }, { text: 'Khu di tích có nhiều lớp văn hóa chồng lên nhau.', isTrue: true }] },
    ],
  }[level];
  const ids = [];
  for (const def of defs) {
    const { key: _key, ...body } = def;
    const created = await call('POST', '/teacher/questions', { token: teacher, body: { ...body, heritageId } });
    if (created.reviewStatus === 'PENDING') await call('POST', `/teacher/questions/${created.id}/approve`, { token: teacher });
    ids.push(created.id);
  }
  return ids;
}

async function publishedQuiz(teacher, level, lessonId, name, questionIds) {
  const quiz = await call('POST', '/teacher/quizzes', {
    token: teacher,
    body: { lessonId, name, difficultyLevel: 'MEDIUM', openAt: iso(-1), closeAt: iso(240), showAnswersAfterSubmit: true, ...(level === 3 ? { timeLimitMinutes: 30 } : {}) },
  });
  await call('POST', `/teacher/quizzes/${quiz.id}/questions`, { token: teacher, body: { questionIds, point: level === 1 ? 1 : 2 } });
  await call('POST', `/teacher/quizzes/${quiz.id}/publish`, { token: teacher });
  return quiz.id;
}

/** Câu trả lời đúng hoặc sai theo những gì em thấy trên màn hình. */
function answerFor(q, right) {
  const idx = (items, text) => items.findIndex((x) => (typeof x === 'string' ? x : x.content) === text);
  switch (q.questionType) {
    case 'SINGLE_CHOICE':
      return { selectedIndex: idx(q.options, right ? 'Năm 2010' : 'Năm 1999') };
    case 'TRUE_FALSE':
      return { selectedIndex: idx(q.options, right ? 'Đúng' : 'Sai') };
    case 'IMAGE_CHOICE':
      return { selectedIndex: idx(q.options, right ? 'Cổng Đoan Môn' : 'Điện Kính Thiên') };
    case 'ORDERING': {
      const steps = ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh'];
      return { order: (right ? steps : [...steps].reverse()).map((s) => idx(q.items, s)) };
    }
    case 'FILL_BLANK':
      return { blanks: [right ? 'Lý Thái Tổ' : 'sai hoàn toàn'] };
    case 'MULTI_TRUE_FALSE':
      return { statements: q.statements.map((s) => (!s.includes('Huế') === right)) };
    default:
      return {};
  }
}

/** Bắt đầu, trả lời mọi câu (đúng hoặc sai) rồi nộp; trả mã lượt. */
async function attempt(student, quizId, right) {
  const started = await call('POST', `/student/quizzes/${quizId}/attempts`, { token: student.token });
  for (const q of started.questions) {
    await call('PUT', `/student/attempts/${started.id}/answers/${q.questionId}`, { token: student.token, body: answerFor(q, right) });
  }
  await call('POST', `/student/attempts/${started.id}/submit`, { token: student.token });
  return started.id;
}

// ---- Chuẩn bị ----

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0);
const heritageIds = [];
for (const heritage of drafts) {
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    heritageIds.push(heritage.id);
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
  if (heritageIds.length === 3) break;
}
if (heritageIds.length < 3) throw new Error('Không xuất bản được 3 di sản có dòng thời gian (cần di sản đợt 1 trong CSDL tạm).');
const [H1, H2, H3] = heritageIds;
for (const h of heritageIds) {
  for (let i = 1; i <= 3; i++) {
    await call('POST', `/admin/heritages/${h}/media`, {
      token: admin,
      body: { mediaType: 'IMAGE', url: `https://upload.wikimedia.org/smoke-tk-${stamp}-${h}-${i}.jpg`, caption: `Ảnh thêm số ${i}`, author: 'Nguyễn Văn An', license: 'CC BY-SA 4.0', source: 'Wikimedia Commons' },
    });
  }
}

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Nguyễn Du ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@nguyendu.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
const teacher = await createStaff('/org/teachers', orgAdmin, { fullName: 'Đặng Thị Mỹ Linh', username: teacherLogin, email: `${teacherLogin}@nguyendu.edu.vn` });
const otherLogin = `hoa.${stamp}`;
const other = await createStaff('/org/teachers', orgAdmin, { fullName: 'Phạm Thị Hoa', username: otherLogin, email: `${otherLogin}@nguyendu.edu.vn` });

const cls = {
  2: await call('POST', '/teacher/classes', { token: teacher, body: { name: `8A${stamp.slice(-2)}`, grade: 8, schoolYear: '2026-2027' } }),
  1: await call('POST', '/teacher/classes', { token: teacher, body: { name: `3A${stamp.slice(-2)}`, grade: 3, schoolYear: '2026-2027' } }),
  3: await call('POST', '/teacher/classes', { token: teacher, body: { name: `11A${stamp.slice(-2)}`, grade: 11, schoolYear: '2026-2027' } }),
};
const otherClass = await call('POST', '/teacher/classes', { token: other, body: { name: `9B${stamp.slice(-2)}`, grade: 9, schoolYear: '2026-2027' } });

const data = {};
for (const level of [2, 1, 3]) {
  const lessonA = await publishedLesson(teacher, cls[level].id, `Hoàng thành qua các thời kỳ ${level}-${stamp}`, H1);
  const lessonB = await publishedLesson(teacher, cls[level].id, `Di sản thứ hai của lớp ${level}-${stamp}`, H2);
  const lessonC = await publishedLesson(teacher, cls[level].id, `Bài chưa ai mở ${level}-${stamp}`, H3);
  const qA = await questionsFor(teacher, level, H1, lessonA.images, `A${level}${stamp}`);
  const qB = await questionsFor(teacher, level, H2, lessonB.images, `B${level}${stamp}`);
  const quizA = await publishedQuiz(teacher, level, lessonA.id, `Kiểm tra ${level === 1 ? 'vui' : '15 phút'}: Hoàng thành ${level}-${stamp}`, qA);
  const quizB = await publishedQuiz(teacher, level, lessonB.id, `Ôn tập: di sản thứ hai ${level}-${stamp}`, qB);
  const count = level === 2 ? 6 : 2;
  const students = [];
  for (let n = 1; n <= count; n++) students.push(await addStudent(teacher, cls[level].id, `Học sinh ${['Một', 'Hai', 'Ba', 'Bốn', 'Năm', 'Sáu'][n - 1]} cấp ${level}`));
  data[level] = { lessonA, lessonB, lessonC, quizA, quizB, students, attempts: {} };
}

// Lớp cấp 2: bài A — em 1 đúng, 2 sai, 3 sai, 4 đúng, 5 sai (tỉ lệ sai 60% trên 20 câu → di sản nên ôn); em 1 sai bài B; em 6 chưa làm gì.
{
  const d = data[2];
  const [s1, s2, s3, s4, s5] = d.students;
  d.attempts.s1a = await attempt(s1, d.quizA, true);
  d.attempts.s2a = await attempt(s2, d.quizA, false);
  d.attempts.s3a = await attempt(s3, d.quizA, false);
  d.attempts.s4a = await attempt(s4, d.quizA, true);
  d.attempts.s5a = await attempt(s5, d.quizA, false);
  d.attempts.s1b = await attempt(s1, d.quizB, false);
}
// Lớp cấp 1 và 3: em 1 đúng bài A, em 2 sai bài A.
for (const level of [1, 3]) {
  const d = data[level];
  d.attempts.s1a = await attempt(d.students[0], d.quizA, true);
  d.attempts.s2a = await attempt(d.students[1], d.quizA, false);
}
console.log(`Đã chuẩn bị: lớp ${cls[2].name} (cấp 2, 6 em), ${cls[1].name} (cấp 1), ${cls[3].name} (cấp 3); 3 di sản đã xuất bản.`);

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

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `thong-ke-${name}.png`), fullPage: true });
const pathOf = (page) => new URL(page.url()).pathname;
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const visible = async (locator) => (await locator.count()) > 0 && (await locator.first().isVisible());

async function loginTeacher(page, login) {
  await page.goto(`${ADMIN_WEB}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(login);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL(/\/(giao-vien|tai-khoan)/);
}

async function loginStudent(page, student) {
  await page.goto(`${LEARNING_WEB}/dang-nhap`);
  await page.getByLabel('Mã học sinh').fill(student.code);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL(/\/hoc/);
}

const cap2 = data[2];
const teacherPage = await newPage();
try {
  await loginTeacher(teacherPage, teacherLogin);
  check('Giáo viên đăng nhập web quản trị', /^\/(giao-vien|tai-khoan)/.test(pathOf(teacherPage)));

  // ---- Chi tiết lớp: tab Tiến độ ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[2].id}?tab=tien-do`);
  const progressTable = teacherPage.getByRole('table', { name: 'Học sinh và bài kiểm tra của lớp' });
  await progressTable.waitFor();
  check('Tiến độ: sáu em, hai bài kiểm tra đã phát hành', (await progressTable.getByRole('row').count()) === 7 && (await teacherPage.getByRole('region', { name: 'Bài kiểm tra đã phát hành' }).getByRole('listitem').count()) === 2);
  check('Tiến độ: thẻ tiến độ của lớp theo công thức (6 lượt / 12 ô = 50%)', await visible(teacherPage.getByText('50%', { exact: true })));
  check('Tiến độ: ô điểm của em 1 ở bài A là 8/8 (đúng hết, mỗi câu 2 điểm)', (await progressTable.getByRole('row', { name: /Học sinh Một cấp 2/ }).getByText('8/8').count()) === 1);
  check('Tiến độ: em chưa làm ghi "Chưa làm"', (await progressTable.getByRole('row', { name: /Học sinh Sáu cấp 2/ }).getByText('Chưa làm').count()) === 2);
  await shot(teacherPage, '1-tien-do-lop');

  // Chọn một học sinh → Hồ sơ học tập.
  await progressTable.getByRole('link', { name: 'Học sinh Một cấp 2' }).click();
  await teacherPage.waitForURL(/\/hoc-sinh\/\d+$/);
  await teacherPage.getByRole('heading', { level: 1, name: 'Học sinh Một cấp 2' }).waitFor();
  check('Hồ sơ học tập: mở từ tab Tiến độ, có biểu đồ điểm theo thời gian', await visible(teacherPage.getByRole('figure', { name: /Điểm theo thời gian: 2 lượt làm bài/ })));
  const history = teacherPage.getByRole('table', { name: 'Lịch sử làm bài của học sinh' });
  check('Hồ sơ học tập: lịch sử có 2 lượt', (await history.getByRole('row').count()) === 3);
  check('Hồ sơ học tập: thẻ Bài kiểm tra đã làm 2 trên 2', await visible(teacherPage.getByText('trên 2 bài đã phát hành')));
  await shot(teacherPage, '2-ho-so-hoc-sinh');
  await history.getByRole('button', { name: /Ôn tập: di sản thứ hai/ }).click();
  const detail = teacherPage.getByRole('dialog', { name: /Học sinh Một cấp 2 · / });
  await detail.getByRole('article', { name: 'Câu 1' }).waitFor();
  check('Chi tiết bài làm mở từ hồ sơ: 4 câu, bài làm sai hết', (await detail.getByRole('article').count()) === 4 && (await detail.getByText('Sai', { exact: true }).count()) >= 3);
  check('Chi tiết bài làm: câu trả lời đặt cạnh đáp án đúng và giải thích', (await detail.getByText(/Giải thích:/).count()) >= 1 && (await detail.getByText(/Đáp án đúng|Thứ tự đúng|Từ đúng/).count()) >= 1);
  await shot(teacherPage, '3-chi-tiet-bai-lam-tu-ho-so');
  await detail.getByRole('button', { name: 'Đóng' }).last().click();
  await teacherPage.getByRole('link', { name: /Về lớp/ }).click();
  await teacherPage.waitForURL(new RegExp(`/giao-vien/lop/${cls[2].id}$`));

  // ---- Tab Thành thạo ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[2].id}?tab=thanh-thao`);
  const heat = teacherPage.getByRole('table', { name: 'Tỉ lệ đúng của từng học sinh theo di sản' });
  await heat.waitFor();
  check('Thành thạo: bảng nhiệt có hàng Cả lớp và đủ 6 em (em chưa làm toàn ô trống)', (await heat.getByRole('row').count()) === 1 + 1 + 6);
  check('Thành thạo: chú giải màu và tỉ lệ theo dạng câu', (await visible(teacherPage.getByRole('list', { name: 'Chú giải màu' }))) && (await visible(teacherPage.getByText('Tỉ lệ đúng theo dạng câu'))));
  check('Thành thạo: ô của em 1 ở di sản thứ nhất là 100% (Thành thạo)', (await heat.getByLabel(/Học sinh Một cấp 2, .*: 100%, Thành thạo/).count()) >= 1);
  await shot(teacherPage, '4-thanh-thao-lop');
  const provinceOptions = await teacherPage.getByLabel('Tỉnh').locator('option').count();
  await teacherPage.getByLabel('Loại di sản', { exact: true }).selectOption('INTANGIBLE');
  await teacherPage.waitForTimeout(800);
  check('Thành thạo: lọc theo loại gọi lại và vẫn hiện bố cục (không lỗi)', (provinceOptions > 1) && !(await teacherPage.getByRole('alert').count()));
  await teacherPage.getByLabel('Loại di sản', { exact: true }).selectOption('');

  // ---- Tab Gợi ý ôn tập ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[2].id}?tab=goi-y-on-tap`);
  const review = teacherPage.getByRole('region', { name: 'Di sản nên ôn' });
  await review.waitFor();
  await review.getByText(/Lớp sai \d+% ở \d+ câu về di sản này/).first().waitFor();
  check('Gợi ý ôn tập: di sản nên ôn có lý do "Lớp sai x% ở n câu về di sản này"', await visible(review.getByText(/Lớp sai 60% ở 20 câu về di sản này/)));
  check('Gợi ý ôn tập: có khối Di sản liên quan', await visible(teacherPage.getByRole('region', { name: 'Di sản liên quan' })));
  await shot(teacherPage, '5-goi-y-on-tap-lop');
  await review.getByRole('button', { name: /^Tạo bài ôn tập về / }).first().click();
  const lessonDialog = teacherPage.getByRole('dialog', { name: 'Tạo bài học' });
  await lessonDialog.getByLabel('Tiêu đề bài học').waitFor();
  check('Tạo bài ôn tập: hộp thoại Tạo bài học với lớp khóa và tiêu đề "Ôn tập: …"', (await lessonDialog.getByLabel('Tiêu đề bài học').inputValue()).startsWith('Ôn tập: ') && (await lessonDialog.getByText(/lớp được chọn sẵn và khóa/).count()) === 1);
  await lessonDialog.getByRole('button', { name: /Tạo bài học|Tạo/ }).last().click();
  await teacherPage.waitForURL(/\/giao-vien\/bai-hoc\/\d+$/, { timeout: 20000 });
  check('Tạo bài ôn tập: bài nháp mới của lớp, chuyển sang Soạn bài học', /\/giao-vien\/bai-hoc\/\d+$/.test(pathOf(teacherPage)));

  // ---- Kết quả bài kiểm tra ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${cap2.quizA}/ket-qua`);
  await teacherPage.getByRole('heading', { level: 1, name: /Kiểm tra 15 phút: Hoàng thành/ }).waitFor();
  await teacherPage.getByText('Điểm trung bình').waitFor();
  check('Kết quả: Tổng quan — đã nộp 5 / 6, chưa làm 1 em', (await visible(teacherPage.getByText('5 / 6', { exact: true }))) && (await visible(teacherPage.getByText(/Chưa làm 1 em/))));
  check('Kết quả: Tổng quan — điểm trung bình 3,2 (8 · 0 · 0 · 8 · 0 trên 5)', await visible(teacherPage.getByText('3,2', { exact: true })));
  check('Kết quả: phổ điểm 10 khoảng', (await teacherPage.getByRole('list', { name: 'Phổ điểm' }).getByRole('listitem').count()) === 10);
  await shot(teacherPage, '6-ket-qua-tong-quan');
  await teacherPage.getByRole('tab', { name: 'Từng câu' }).click();
  const qTable = teacherPage.getByRole('table', { name: /Tỉ lệ đúng của 4 câu hỏi/ });
  await qTable.waitFor();
  check('Kết quả: Từng câu — bốn câu, câu dưới 50% bị cảnh báo', (await qTable.getByRole('row').count()) === 5 && (await qTable.getByText('Dưới 50% — nên ôn lại').count()) >= 1);
  check('Kết quả: Từng câu — lỗi hay gặp của câu điền từ', await visible(qTable.getByText(/sai hoàn toàn/)));
  await shot(teacherPage, '7-ket-qua-tung-cau');
  await teacherPage.getByRole('tab', { name: 'Từng học sinh' }).click();
  const sTable = teacherPage.getByRole('table', { name: 'Kết quả từng học sinh' });
  await sTable.waitFor();
  check('Kết quả: Từng học sinh — cả em chưa làm', (await sTable.getByRole('row').count()) === 7 && (await sTable.getByText('Chưa làm').count()) === 1);
  await teacherPage.getByLabel('Trạng thái').selectOption('NOT_STARTED');
  check('Kết quả: lọc trạng thái Chưa làm còn 1 em', (await teacherPage.getByRole('table', { name: 'Kết quả từng học sinh' }).getByRole('row').count()) === 2);
  await teacherPage.getByLabel('Trạng thái').selectOption('');
  await sTable.getByRole('button', { name: 'Học sinh Hai cấp 2' }).click();
  const attemptDialog = teacherPage.getByRole('dialog', { name: /Học sinh Hai cấp 2 · / });
  await attemptDialog.getByRole('article', { name: 'Câu 1' }).waitFor();
  check('Kết quả: Chi tiết bài làm — điểm 0/8, đúng 0/4 câu', (await visible(attemptDialog.getByText('0/8', { exact: true }))) && (await visible(attemptDialog.getByText(/Đúng 0 \/ 4 câu/))));
  await shot(teacherPage, '8-ket-qua-chi-tiet-bai-lam');
  await attemptDialog.getByRole('button', { name: 'Đóng' }).last().click();
  await teacherPage.getByRole('tab', { name: 'Gợi ý' }).click();
  await teacherPage.getByRole('region', { name: 'Di sản nên ôn' }).waitFor();
  check('Kết quả: tab Gợi ý — chỉ bài này, khoảng thời gian chọn được', (await visible(teacherPage.getByLabel('Thời gian'))) && (await visible(teacherPage.getByText(/Phạm vi: bài kiểm tra này/))));
  await shot(teacherPage, '9-ket-qua-goi-y');

  // ---- Lớp cấp 1: giáo viên vẫn thấy điểm kèm số sao ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${data[1].quizA}/ket-qua?tab=tung-hoc-sinh`);
  const oneTable = teacherPage.getByRole('table', { name: 'Kết quả từng học sinh' });
  await oneTable.waitFor();
  check('Lớp cấp 1: giáo viên thấy điểm và số sao của từng em', (await oneTable.getByText(/\d sao/).count()) === 2 && (await oneTable.getByText(/\d+\/\d+/).count()) >= 2);
  await shot(teacherPage, '10-ket-qua-lop-cap-1');
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[1].id}?tab=tien-do`);
  await teacherPage.getByText(/học sinh chỉ thấy số sao và lời khen/).waitFor();
  check('Lớp cấp 1: tab Tiến độ giải thích sao, vẫn có điểm', true);

  // ---- Đóng bài ----
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${data[3].quizB}/ket-qua`);
  await teacherPage.getByRole('button', { name: 'Đóng bài kiểm tra' }).click();
  const confirm = teacherPage.getByRole('dialog', { name: /^Đóng bài kiểm tra/ });
  check('Đóng bài: hộp xác nhận ghi số em đã nộp', await visible(confirm.getByText(/Hiện 0\/2 em đã nộp/)));
  await confirm.getByRole('button', { name: 'Đóng bài kiểm tra' }).click();
  await teacherPage.getByText('Đã đóng', { exact: true }).first().waitFor({ timeout: 15000 });
  check('Đóng bài: trạng thái Đã đóng, không còn nút Đóng bài kiểm tra, thống kê vẫn xem được', (await teacherPage.getByRole('button', { name: 'Đóng bài kiểm tra' }).count()) === 0 && (await visible(teacherPage.getByText('Điểm trung bình'))));

  // ---- Quyền: lớp, bài, học sinh của giáo viên khác hoặc không có ----
  const otherPage = await newPage();
  await loginTeacher(otherPage, otherLogin);
  await otherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[2].id}?tab=tien-do`);
  check('Giáo viên khác mở lớp không phải của mình: báo không tìm thấy lớp', await otherPage.getByText('Không tìm thấy lớp.').waitFor({ timeout: 15000 }).then(() => true, () => false));
  await otherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${cap2.quizA}/ket-qua`);
  check('Giáo viên khác mở kết quả bài không phải của mình: báo không tìm thấy bài kiểm tra', await otherPage.getByText('Không tìm thấy bài kiểm tra.').waitFor({ timeout: 15000 }).then(() => true, () => false));
  await otherPage.goto(`${ADMIN_WEB}/giao-vien/lop/${otherClass.id}/hoc-sinh/${cap2.students[0].id}`);
  check('Hồ sơ học sinh của lớp khác: báo không tìm thấy học sinh', await otherPage.getByText('Không tìm thấy học sinh.').waitFor({ timeout: 15000 }).then(() => true, () => false));
  await otherPage.close();

  // ---- Điện thoại ----
  const mobile = await newPage({ viewport: { width: 390, height: 844 } });
  await loginTeacher(mobile, teacherLogin);
  await mobile.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${cap2.quizA}/ket-qua`);
  await mobile.getByText('Điểm trung bình').waitFor();
  check('390px: Kết quả bài kiểm tra không tràn ngang', await noOverflow(mobile));
  await mobile.goto(`${ADMIN_WEB}/giao-vien/lop/${cls[2].id}?tab=thanh-thao`);
  await mobile.getByRole('table', { name: 'Tỉ lệ đúng của từng học sinh theo di sản' }).waitFor();
  check('390px: tab Thành thạo không tràn ngang (bảng nhiệt cuộn trong khung)', await noOverflow(mobile));
  await shot(mobile, '11-dien-thoai-thanh-thao');
  await mobile.close();
} catch (error) {
  check('Giáo viên: kịch bản chạy hết không ngoại lệ', false, String(error).split('\n')[0]);
  await shot(teacherPage, 'loi-giao-vien').catch(() => {});
}
await teacherPage.close();

// ---- Học sinh: Gợi ý cho em ở ba cấp ----

async function studentFlow(level, student, run) {
  const page = await newPage();
  try {
    await loginStudent(page, student);
    await run(page);
  } catch (error) {
    check(`Học sinh cấp ${level}: kịch bản chạy hết không ngoại lệ`, false, String(error).split('\n')[0]);
    await shot(page, `loi-hoc-sinh-cap-${level}`).catch(() => {});
  }
  await page.close();
}

// Cấp 2: em 2 sai bài A → di sản nên ôn, bài học nên ôn; bài B chưa mở nên cần mã; bài C là bài mới.
await studentFlow(2, cap2.students[1], async (page) => {
  const section = page.getByRole('region', { name: 'Gợi ý cho em' });
  await section.getByRole('list', { name: 'Gợi ý cho em' }).waitFor();
  check('Cấp 2: Gợi ý cho em có đủ các phần theo bài đã làm', (await section.getByText('Bài kiểm tra nên làm tiếp').count()) >= 1 && (await section.getByText('Di sản nên ôn').count()) >= 1 && (await section.getByText('Bài học mới nên học').count()) >= 1);
  check('Cấp 2: bài kiểm tra của bài chưa mở có nhãn Cần mã bài học', (await section.getByText('Cần mã bài học').count()) >= 1);
  check('Cấp 2: bài học mới chỉ có tiêu đề và câu nhờ thầy cô, không lộ mã', (await section.getByText('Nhờ thầy cô đưa mã bài học').count()) >= 1 && !(await section.innerText()).match(/BH[A-Z0-9]{6}/));
  check('Cấp 2: lý do có số liệu của em', /tỉ lệ đúng|đúng \d+/i.test(await section.innerText()));
  check('Cấp 2: tối đa 3 mục mỗi phần', (await section.getByRole('listitem').count()) <= 15);
  await shot(page, '12-hoc-sinh-cap-2-trang-hoc');
  await section.getByRole('link', { name: /Xem chi tiết/ }).first().click();
  await page.waitForURL(/\/di-san\//);
  check('Cấp 2: thẻ di sản gợi ý mở chi tiết di sản', /\/di-san\/[^/]+$/.test(pathOf(page)));
  // Kết quả của một lượt: gợi ý theo lượt đang xem.
  await page.goto(`${LEARNING_WEB}/ket-qua/${cap2.attempts.s2a}`);
  const resultSection = page.getByRole('region', { name: 'Gợi ý cho em' });
  await resultSection.getByRole('list', { name: 'Gợi ý cho em' }).waitFor();
  check('Cấp 2: Kết quả bài làm có khối Gợi ý cho em từ lượt đang xem', (await resultSection.getByText('Di sản nên ôn').count()) >= 1);
  await shot(page, '13-hoc-sinh-cap-2-ket-qua');
});

// Em chưa có lượt nào: lời mời nhập mã và các bài mới.
await studentFlow(2, cap2.students[5], async (page) => {
  const section = page.getByRole('region', { name: 'Gợi ý cho em' });
  await section.waitFor();
  check('Học sinh chưa làm gì: lời mời nhập mã bài học và các bài mới', (await section.getByText(/mã bài học/i).count()) >= 1 && (await section.getByText('Bài học mới nên học').count()) >= 1);
});

await studentFlow(1, data[1].students[1], async (page) => {
  const section = page.getByRole('region', { name: 'Gợi ý cho em' });
  await section.getByRole('list', { name: 'Gợi ý cho em' }).waitFor();
  const text = await section.innerText();
  check('Cấp 1: thẻ hình có nhãn ngắn, không có số hay phần trăm', /Ôn lại bài|Di sản nên ôn|Chơi tiếp|Bài mới/.test(text) && !/%|\d+\s*\/\s*\d+/.test(text));
  check('Cấp 1: bài học mới chỉ có tiêu đề và câu nhờ thầy cô', text.includes('Nhờ thầy cô đưa mã bài học') && !text.match(/BH[A-Z0-9]{6}/));
  await shot(page, '14-hoc-sinh-cap-1-trang-hoc');
  await page.goto(`${LEARNING_WEB}/ket-qua/${data[1].attempts.s2a}`);
  const rs = page.getByRole('region', { name: 'Gợi ý cho em' });
  await rs.getByRole('list', { name: 'Gợi ý cho em' }).waitFor();
  check('Cấp 1: kết quả vẫn không có điểm hay phần trăm khi có gợi ý', !/%/.test(await page.locator('main, body').first().innerText()));
  await shot(page, '15-hoc-sinh-cap-1-ket-qua');
});

await studentFlow(3, data[3].students[1], async (page) => {
  const group = page.getByRole('region', { name: 'Di sản nên ôn' });
  await group.waitFor();
  check('Cấp 3: danh sách theo nhóm, mỗi dòng có "Lý do: …" kèm số liệu', await visible(group.getByText(/^Lý do: .*\d+/)));
  check('Cấp 3: mục lục có mục Gợi ý', await visible(page.getByRole('navigation', { name: 'Mục lục' }).getByRole('link', { name: 'Gợi ý' })));
  await shot(page, '16-hoc-sinh-cap-3-trang-hoc');
});

await browser.close();

check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
check('Không có phản hồi 5xx từ API', badResponses.length === 0, badResponses.slice(0, 2).join(' | '));

const failed = results.filter((r) => !r.ok);
console.log(`\nTổng: ${results.length} bước, đạt ${results.length - failed.length}, lỗi ${failed.length}`);
if (failed.length > 0) process.exit(1);
