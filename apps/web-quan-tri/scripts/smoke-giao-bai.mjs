#!/usr/bin/env node
// Kiểm thử việc giao bài trên trình duyệt thật với API thật: giáo viên phát hành bài kiểm tra, có mã bài kiểm tra, gửi thông báo cho lớp; học sinh thấy số chưa đọc
// ở nút Thông báo, bấm thông báo mở bài ngay; gõ mã bài kiểm tra vào thẳng bài đó; bài học chưa có bài kiểm tra vẫn nằm trong Bài học của em; lớp cấp 1 phát hành
// không cần giờ mở và đóng; ô giờ đọc lại buổi trong ngày.
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật) và Ai__Mode=Simulated, hai ứng dụng web đang chạy trỏ tới API đó, Chrome hoặc Edge đã cài.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:giao-bai -w @dsvhvn/web-quan-tri
//
// Biến môi trường như smoke-bai-kiem-tra.mjs: API_URL, ADMIN_WEB, LEARNING_WEB, API_LOG, ADMIN_PASSWORD, ADMIN_LOGIN, BROWSER_CHANNEL, SHOTS_DIR.

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

/** Bài kiểm tra Nháp đủ câu cho một bài học; giờ mở từ một giờ trước khi lớp cần đặt giờ. */
async function draftQuiz(teacher, lessonId, name, questionIds, withTimes) {
  const now = Date.now();
  const times = withTimes ? { openAt: new Date(now - 3_600_000).toISOString(), closeAt: new Date(now + 7_200_000).toISOString() } : {};
  const quiz = await call('POST', '/teacher/quizzes', { token: teacher, body: { lessonId, name, difficultyLevel: 'EASY', ...times } });
  await call('POST', `/teacher/quizzes/${quiz.id}/questions`, { token: teacher, body: { questionIds, point: 2 } });
  return quiz.id;
}

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
// Danh sách mới nhất trước: di sản có dòng thời gian của đợt 1 nằm ở trang cuối.
const { totalPages } = await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin });
const drafts = (await call('GET', `/admin/heritages?status=DRAFT&pageSize=100&page=${totalPages}`, { token: admin })).items.filter((h) => h.timelineCount > 0);
const published = (await call('GET', '/admin/heritages?status=PUBLISHED&pageSize=20', { token: admin })).items.filter((h) => h.timelineCount > 0);
let heritageId = published[0]?.id ?? 0;
for (const heritage of heritageId ? [] : drafts) {
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    heritageId = heritage.id;
    break;
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (!heritageId) throw new Error('Không có di sản đã xuất bản để soạn bài (cần di sản đợt 1 trong CSDL tạm).');

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường Liên cấp Giao bài ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@giaobai.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@giaobai.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
await call('POST', '/org/teachers', { token: orgAdmin, body: { fullName: 'Đặng Thị Mỹ Linh', username: teacherLogin, email: `${teacherLogin}@giaobai.edu.vn` } });
await call('POST', '/auth/set-password', { body: { token: await mailToken(`${teacherLogin}@giaobai.edu.vn`), newPassword: PASSWORD } });
const teacher = (await call('POST', '/auth/login', { body: { emailOrUsername: teacherLogin, password: PASSWORD } })).accessToken;

const primary = await call('POST', '/teacher/classes', { token: teacher, body: { name: `3A${stamp.slice(-2)}`, grade: 3, schoolYear: '2026-2027' } });
const lower = await call('POST', '/teacher/classes', { token: teacher, body: { name: `8A${stamp.slice(-2)}`, grade: 8, schoolYear: '2026-2027' } });
const quizLesson = await publishedLesson(teacher, lower.id, `Kinh thành qua các thời kỳ ${stamp}`, heritageId);
const readingLesson = await publishedLesson(teacher, lower.id, `Bài đọc về di sản ${stamp}`, heritageId);
const primaryLesson = await publishedLesson(teacher, primary.id, `Di sản qua lời kể ${stamp}`, heritageId);
const student = await addStudent(teacher, lower.id, 'Trần Thị Mai');

const library = (await call('GET', `/teacher/lessons/${quizLesson.id}/materials`, { token: teacher })).images;
const question = await call('POST', '/teacher/questions', {
  token: teacher,
  body: {
    questionType: 'TRUE_FALSE',
    content: `Khu di tích nằm giữa lòng Hà Nội. ${stamp}`,
    explanation: 'Khu di tích ở trung tâm Hà Nội.',
    difficultyLevel: 'EASY',
    heritageId,
    levelMin: 1,
    levelMax: 2,
    imageUrl: library[0].url,
    answerIsTrue: true,
  },
});
if (question.reviewStatus === 'PENDING') await call('POST', `/teacher/questions/${question.id}/approve`, { token: teacher });

const quizName = `Kiểm tra giao về nhà ${stamp}`;
const quizId = await draftQuiz(teacher, quizLesson.id, quizName, [question.id], true);
const playName = `Bài chơi di sản ${stamp}`;
const playId = await draftQuiz(teacher, primaryLesson.id, playName, [question.id], false);

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  return page;
}

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `giao-bai-${name}.png`), fullPage: true });
const pathOf = (page) => new URL(page.url()).pathname;

try {
  const teacherPage = await newPage();
  await teacherPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await teacherPage.getByLabel('Email hoặc tên đăng nhập').fill(teacherLogin);
  await teacherPage.getByLabel('Mật khẩu', { exact: true }).fill(PASSWORD);
  await teacherPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await teacherPage.waitForURL(/\/(giao-vien|tai-khoan)/);

  // Ô giờ đọc lại buổi trong ngày.
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${quizId}`);
  await teacherPage.getByRole('heading', { level: 1, name: quizName }).waitFor();
  const openField = teacherPage.getByLabel('Mở lúc *');
  const openBefore = await openField.inputValue();
  await openField.fill('12:30 27/10/2030');
  await teacherPage.getByText(/Đang đặt: 12:30 trưa 27\/10\/2030/).waitFor();
  check('Ô giờ đọc lại 12:30 là trưa', true);
  await openField.fill(openBefore);
  await shot(teacherPage, '1-o-gio');

  // Phát hành: hộp thoại Mã bài kiểm tra.
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  const confirm = teacherPage.getByRole('dialog', { name: 'Phát hành bài kiểm tra?' });
  await confirm.getByRole('button', { name: 'Phát hành' }).click();
  const codeDialog = teacherPage.getByRole('dialog', { name: 'Mã bài kiểm tra' });
  await codeDialog.waitFor();
  const quizCode = (await codeDialog.getByTestId('ma-bai-hoc').innerText()).replace(/\s/g, '');
  check('Phát hành xong có mã bài kiểm tra KT', /^KT[2-9A-HJ-NP-Z]{6}$/.test(quizCode), quizCode);
  await shot(teacherPage, '2-ma-bai-kiem-tra');

  // Gửi thông báo cho lớp.
  await codeDialog.getByRole('button', { name: 'Gửi thông báo cho lớp' }).click();
  const notify = teacherPage.getByRole('dialog', { name: 'Gửi thông báo cho lớp' });
  await notify.getByLabel('Lời nhắn (không bắt buộc)').fill('Các em làm bài ở nhà trước thứ Sáu.');
  await notify.getByRole('button', { name: 'Gửi thông báo' }).click();
  await teacherPage.getByText('Đã gửi thông báo cho 1 học sinh.').first().waitFor();
  check('Giáo viên gửi thông báo cho lớp', true);

  // Lớp cấp 1: không có ô giờ, phát hành được.
  await teacherPage.goto(`${ADMIN_WEB}/giao-vien/kiem-tra/${playId}`);
  await teacherPage.getByRole('heading', { level: 1, name: playName }).waitFor();
  check('Lớp cấp 1 không có ô Mở lúc, Đóng lúc', (await teacherPage.getByLabel('Mở lúc *').count()) === 0 && (await teacherPage.getByLabel('Đóng lúc *').count()) === 0);
  await shot(teacherPage, '3-cap-1');
  await teacherPage.getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByRole('dialog', { name: 'Phát hành bài kiểm tra?' }).getByRole('button', { name: 'Phát hành' }).click();
  await teacherPage.getByRole('dialog', { name: 'Mã bài kiểm tra' }).waitFor();
  check('Lớp cấp 1 phát hành khi chưa đặt giờ', true);

  // Học sinh: nút Thông báo.
  const pupil = await newPage();
  await pupil.goto(`${LEARNING_WEB}/dang-nhap`);
  await pupil.getByLabel('Mã học sinh').fill(student);
  await pupil.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await pupil.getByRole('button', { name: 'Đăng nhập' }).click();
  await pupil.waitForURL(/\/hoc/);
  const bell = pupil.getByRole('link', { name: 'Thông báo, 1 chưa đọc' });
  await bell.waitFor();
  check('Học sinh thấy một thông báo chưa đọc', true);
  await shot(pupil, '4-chuong');
  await bell.click();
  await pupil.getByText('Các em làm bài ở nhà trước thứ Sáu.').waitFor();
  await shot(pupil, '5-thong-bao');
  await pupil.getByRole('button', { name: /Bài kiểm tra mới/ }).click();
  await pupil.waitForURL(/\/kiem-tra\/\d+$/);
  check('Bấm thông báo vào thẳng bài kiểm tra', pathOf(pupil).endsWith(`/kiem-tra/${quizId}`), pathOf(pupil));
  await pupil.getByRole('heading', { level: 1, name: quizName }).first().waitFor();

  // Mã bài kiểm tra vào thẳng bài đó.
  await pupil.goto(`${LEARNING_WEB}/nhap-ma`);
  await pupil.getByLabel('Mã bài học').fill(quizCode.toLowerCase());
  await pupil.getByRole('button', { name: 'Mở', exact: true }).click();
  await pupil.waitForURL(/\/kiem-tra\/\d+$/);
  check('Gõ mã bài kiểm tra vào thẳng bài kiểm tra', pathOf(pupil) === `/bai-hoc/${quizLesson.code}/kiem-tra/${quizId}`, pathOf(pupil));
  await shot(pupil, '6-vao-bang-ma');

  // Bài học chưa có bài kiểm tra vẫn còn ở trang học sau khi em đọc xong.
  await pupil.goto(`${LEARNING_WEB}/nhap-ma`);
  await pupil.getByLabel('Mã bài học').fill(readingLesson.code);
  await pupil.getByRole('button', { name: 'Mở', exact: true }).click();
  await pupil.waitForURL(new RegExp(`/bai-hoc/${readingLesson.code}$`));
  await pupil.goto(`${LEARNING_WEB}/hoc`);
  await pupil.getByText(readingLesson.title).first().waitFor();
  check('Bài học chưa có bài kiểm tra vẫn nằm trong trang học', true);
  await shot(pupil, '7-bai-hoc-cua-em');
} catch (error) {
  check('Chạy hết kịch bản', false, String(error).slice(0, 400));
} finally {
  await browser.close();
}

check('Không có lỗi trang', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
check('Không có phản hồi 5xx', badResponses.length === 0, badResponses.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} bước đạt.`);
process.exit(failed.length > 0 ? 1 : 0);
