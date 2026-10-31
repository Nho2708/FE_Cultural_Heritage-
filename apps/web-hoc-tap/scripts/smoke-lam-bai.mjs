#!/usr/bin/env node
// Kiểm thử học tập của học sinh theo cấp trên trình duyệt thật với API thật (docs/hoc-tap-theo-cap.md ở thư mục gốc repo):
// tự dựng dữ liệu qua API (trường, giáo viên, ba lớp khối 3, 8 và 11, bài học, đủ tám dạng câu, bốn bài kiểm tra, ba học sinh), rồi để
// từng học sinh đăng nhập, nhập mã bài học, bắt đầu, làm bài (kể cả mất kết nối, tải lại giữa chừng, hết giờ tự nộp), nộp, xem kết quả,
// lịch sử và tiến độ trên giao diện.
//
// Cần: API đang chạy trên database TẠM (Development tự áp migration và nạp di sản), `Email__Mode=Log` (không gửi thư thật), CORS cho cổng của web
// học tập, web học tập đang chạy trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Ví dụ với cổng riêng:
//
//   API_URL=http://localhost:5180/api/v1 BASE_URL=http://localhost:5274 API_LOG=<tệp log của API> ADMIN_PASSWORD=<mật khẩu seed> \
//   npm run smoke:lam-bai -w @dsvhvn/web-hoc-tap
//
// Biến môi trường: API_URL, BASE_URL, API_LOG, ADMIN_PASSWORD, ADMIN_LOGIN (mặc định admin.nho), BROWSER_CHANNEL (msedge | chrome),
// SHOTS_DIR (thư mục ảnh chụp, mặc định smoke-shots/lam-bai, không vào git), SKIP_TIMEOUT=1 (bỏ phần chờ hết giờ khoảng 70 giây).

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5180/api/v1').replace(/\/+$/, '');
const BASE = (process.env.BASE_URL ?? 'http://localhost:5274').replace(/\/+$/, '');
const API_LOG = process.env.API_LOG ?? '';
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots/lam-bai');
mkdirSync(SHOTS, { recursive: true });
if (!API_LOG || !ADMIN_PASSWORD) {
  console.error('Cần API_LOG (tệp log của API, để đọc liên kết đặt mật khẩu) và ADMIN_PASSWORD (mật khẩu seed của quản trị hệ thống).');
  process.exit(2);
}

const results = [];
const pageErrors = [];
const consoleErrors = [];
function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- Dựng dữ liệu qua API ----------------------------------------------------------------------------------------------

const S = new Date().toTimeString().slice(0, 8).replaceAll(':', '');
const PW = 'MatKhau2026';
const STUDENT_PW = 'MatKhauCuaEm2026';

async function api(method, path, body, token) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`${method} ${path} → ${response.status} ${json.message ?? ''}`);
  return json.data;
}

async function mailToken(email) {
  for (let i = 0; i < 40; i += 1) {
    const text = readFileSync(API_LOG, 'utf8');
    const pos = Math.max(text.toLowerCase().lastIndexOf(`tới: ${email}`), text.toLowerCase().lastIndexOf(`: ${email} |`));
    if (pos >= 0) {
      const m = /token=([A-Za-z0-9_\-%]+)/.exec(text.slice(pos));
      if (m) return decodeURIComponent(m[1]);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Không thấy thư gửi tới ${email} trong log của API`);
}

const inMinutes = (m) => new Date(Date.now() + m * 60_000).toISOString().replace(/\.\d+Z$/, 'Z');

async function seed() {
  const admin = (await api('POST', '/auth/login', { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD })).accessToken;
  const drafts = (await api('GET', '/admin/heritages?status=DRAFT&pageSize=100', undefined, admin)).items;
  let heritageId = null;
  for (const item of drafts.filter((i) => i.timelineCount > 0)) {
    try {
      await api('POST', `/admin/heritages/${item.id}/publish`, undefined, admin);
      heritageId = item.id;
      break;
    } catch {
      // thử di sản kế tiếp
    }
  }
  if (heritageId === null) throw new Error('Không xuất bản được di sản có dòng thời gian (cần dữ liệu di sản của Development)');

  await api('POST', '/admin/organizations', {
    name: `Trường Lê Quý Đôn ${S}`,
    orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${S}`, email: `thu.${S}@lequydon.edu.vn` },
  }, admin);
  await api('POST', '/auth/set-password', { token: await mailToken(`thu.${S}@lequydon.edu.vn`), newPassword: PW });
  const thu = (await api('POST', '/auth/login', { emailOrUsername: `thu.${S}`, password: PW })).accessToken;
  await api('POST', '/org/teachers', { fullName: 'Đặng Thị Mỹ Linh', username: `linh.${S}`, email: `linh.${S}@lequydon.edu.vn` }, thu);
  await api('POST', '/auth/set-password', { token: await mailToken(`linh.${S}@lequydon.edu.vn`), newPassword: PW });
  const teacher = (await api('POST', '/auth/login', { emailOrUsername: `linh.${S}`, password: PW })).accessToken;

  const classes = {};
  for (const [level, name, grade] of [[1, '3A', 3], [2, '8A1', 8], [3, '11A2', 11]]) {
    classes[level] = await api('POST', '/teacher/classes', { name, grade, schoolYear: '2026-2027' }, teacher);
  }

  const lessons = {};
  for (const level of [1, 2, 3]) {
    const lesson = await api('POST', '/teacher/lessons', { classId: classes[level].id, title: `Di sản qua bài làm cấp ${level}`, heritageIds: [heritageId] }, teacher);
    const draft = await api('POST', `/teacher/lessons/${lesson.id}/ai/compose`, { length: 'DETAILED' }, teacher);
    await api('PUT', `/teacher/lessons/${lesson.id}`, {
      summary: draft.summary,
      keyPoints: draft.keyPoints,
      sections: draft.sections.map((s) => ({ type: s.type, title: s.title, body: s.body, imageUrl: s.imageUrl, milestoneYear: s.milestoneYear, eventId: s.eventId, sourceCitation: s.sourceCitation })),
    }, teacher);
    const published = await api('POST', `/teacher/lessons/${lesson.id}/publish`, undefined, teacher);
    lessons[level] = { id: lesson.id, code: published.accessCode };
  }

  const materials = await api('GET', `/teacher/lessons/${lessons[2].id}/materials`, undefined, teacher);
  const [u0, u1, u2] = materials.images.map((i) => i.url);
  const names = { [u0]: 'Điện Kính Thiên', [u1]: 'Cổng Đoan Môn', [u2]: 'Khu khảo cổ' };
  const base = { heritageId };
  const specs = {
    single: { ...base, questionType: 'SINGLE_CHOICE', content: 'Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào?', explanation: 'UNESCO ghi danh năm 2010.', difficultyLevel: 'EASY', options: [{ content: 'Năm 1999', isCorrect: false }, { content: 'Năm 2010', isCorrect: true }, { content: 'Năm 2003', isCorrect: false }, { content: 'Năm 2015', isCorrect: false }] },
    truefalse: { ...base, questionType: 'TRUE_FALSE', content: 'Em hãy xem hình: khu di tích nằm giữa lòng Hà Nội.', explanation: 'Khu di tích ở trung tâm Hà Nội.', difficultyLevel: 'MEDIUM', imageUrl: u0, answerIsTrue: true },
    ordering: { ...base, questionType: 'ORDERING', content: 'Hãy sắp xếp các sự kiện theo thứ tự thời gian.', explanation: 'Xếp theo năm.', difficultyLevel: 'HARD', steps: ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh'] },
    fill: { ...base, questionType: 'FILL_BLANK', content: 'Vua ___ dời đô từ Hoa Lư về Thăng Long vào năm 1010.', explanation: 'Lý Thái Tổ dời đô.', difficultyLevel: 'HARD', blanks: [{ accepted: ['Lý Thái Tổ', 'Lý Công Uẩn'] }], distractors: ['Lê Lợi', 'Trần Hưng Đạo'] },
    imagechoice: { ...base, questionType: 'IMAGE_CHOICE', content: 'Em hãy chọn hình có tên: Cổng Đoan Môn.', explanation: 'Hình thứ hai là cổng.', difficultyLevel: 'EASY', options: [{ content: 'Điện Kính Thiên', imageUrl: u0, isCorrect: false }, { content: 'Cổng Đoan Môn', imageUrl: u1, isCorrect: true }, { content: 'Khu khảo cổ', imageUrl: u2, isCorrect: false }] },
    matching: { ...base, questionType: 'MATCHING', content: 'Em hãy ghép mỗi hình với tên của hình đó.', explanation: 'Mỗi tên là chú thích của hình.', difficultyLevel: 'MEDIUM', pairs: [{ leftImageUrl: u0, right: 'Điện Kính Thiên' }, { leftImageUrl: u1, right: 'Cổng Đoan Môn' }, { leftImageUrl: u2, right: 'Khu khảo cổ' }] },
    multi: { ...base, questionType: 'MULTI_TRUE_FALSE', content: 'Hoàng thành Thăng Long là trung tâm quyền lực của nhiều triều đại phong kiến.', explanation: 'Nhận định hai sai.', difficultyLevel: 'HARD', statements: [{ text: 'Khu di tích được UNESCO ghi danh năm 2010.', isTrue: true }, { text: 'Khu di tích nằm ở thành phố Huế.', isTrue: false }, { text: 'Khu di tích có nhiều lớp văn hóa chồng lên nhau.', isTrue: true }] },
    source: { ...base, questionType: 'SOURCE_READING', content: 'Theo đoạn tư liệu, vua nào dời đô về Thăng Long?', explanation: 'Đoạn tư liệu nêu rõ Lý Thái Tổ.', difficultyLevel: 'MEDIUM', passage: 'Mùa thu năm Canh Tuất, Lý Thái Tổ dời đô từ Hoa Lư về thành Đại La và đổi tên là Thăng Long.', passageSource: 'Đại Việt sử ký toàn thư, Ngô Sĩ Liên, thế kỷ 15', options: [{ content: 'Lý Thái Tổ', isCorrect: true }, { content: 'Trần Thái Tông', isCorrect: false }, { content: 'Lê Thái Tổ', isCorrect: false }, { content: 'Đinh Tiên Hoàng', isCorrect: false }] },
    source2: { ...base, questionType: 'SOURCE_READING', content: 'Theo đoạn tư liệu, kinh đô mới được đổi tên là gì?', explanation: 'Thành Đại La được đổi tên là Thăng Long.', difficultyLevel: 'MEDIUM', passage: 'Mùa thu năm Canh Tuất, Lý Thái Tổ dời đô từ Hoa Lư về thành Đại La và đổi tên là Thăng Long.', passageSource: 'Đại Việt sử ký toàn thư, Ngô Sĩ Liên, thế kỷ 15', options: [{ content: 'Thăng Long', isCorrect: true }, { content: 'Hoa Lư', isCorrect: false }, { content: 'Phú Xuân', isCorrect: false }, { content: 'Hội An', isCorrect: false }] },
  };
  const q = {};
  for (const [key, spec] of Object.entries(specs)) q[key] = (await api('POST', '/teacher/questions', spec, teacher)).id;

  const quizzes = {};
  async function quiz(key, level, name, minutes, ids) {
    const created = await api('POST', '/teacher/quizzes', {
      lessonId: lessons[level].id, name, description: 'Các em đọc kỹ từng câu rồi trả lời.', difficultyLevel: 'MEDIUM', timeLimitMinutes: minutes,
      openAt: inMinutes(-1), closeAt: inMinutes(240), showAnswersAfterSubmit: true,
    }, teacher);
    await api('POST', `/teacher/quizzes/${created.id}/questions`, { questionIds: ids, point: 2 }, teacher);
    await api('POST', `/teacher/quizzes/${created.id}/publish`, undefined, teacher);
    quizzes[key] = { id: created.id, name, level };
  }
  await quiz('c1', 1, 'Đố vui: Hoàng thành', null, [q.truefalse, q.imagechoice, q.matching, q.ordering]);
  await quiz('c2', 2, 'Kiểm tra 15 phút: Hoàng thành', 15, [q.single, q.truefalse, q.ordering, q.fill]);
  await quiz('c3', 3, 'Bài kiểm tra có giờ', 45, [q.single, q.multi, q.source, q.source2]);
  await quiz('c3nhanh', 3, 'Kiểm tra nhanh 1 phút', 1, [q.single]);

  const students = {};
  for (const level of [1, 2, 3]) {
    const added = await api('POST', `/teacher/classes/${classes[level].id}/students`, { fullName: `Học sinh cấp ${level}` }, teacher);
    const entry = added.sheet.entries[0];
    const login = await api('POST', '/student/auth/login', { studentCode: entry.studentCode, password: entry.temporaryPassword });
    await api('PUT', '/student/me/password', { newPassword: STUDENT_PW, confirmNewPassword: STUDENT_PW }, login.accessToken);
    students[level] = { code: entry.studentCode };
  }
  return { heritageId, lessons, quizzes, students, names, urls: [u0, u1, u2], teacher };
}

// ---- Trình duyệt -------------------------------------------------------------------------------------------------------

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

let lastPage = null;

async function newPage(viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, locale: 'vi-VN' });
  const page = await context.newPage();
  lastPage = page;
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource|ERR_INTERNET_DISCONNECTED/.test(m.text())) consoleErrors.push(m.text());
  });
  return page;
}

const shot = (page, name, options = {}) => page.screenshot({ path: resolve(SHOTS, `${name}.png`), ...options });
const go = (page, path) => page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' });
const noHorizontalScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

async function loginAs(page, code) {
  await go(page, '/dang-nhap');
  await page.getByLabel('Mã học sinh').fill(code);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PW);
  await page.getByRole('button', { name: 'Đăng nhập' }).click();
  await page.waitForURL('**/hoc');
}

async function enterCode(page, code) {
  await go(page, '/nhap-ma');
  await page.getByLabel('Mã bài học').fill(code);
  await page.getByRole('button', { name: 'Mở', exact: true }).click();
  await page.waitForURL(`**/bai-hoc/${code}`);
}

/** Làm câu đang hiện. `right` là làm đúng, ngược lại làm sai. Trả về dạng câu đã nhận ra. */
async function answerCurrent(page, right, data) {
  const article = page.locator('article[aria-label^="Câu "]').first();
  if (await page.getByRole('list', { name: 'Các mục cần sắp xếp' }).count()) {
    const order = right
      ? ['Năm 1010: dời đô', 'Năm 1070: lập Văn Miếu', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 2010: UNESCO ghi danh']
      : ['Năm 2010: UNESCO ghi danh', 'Năm 1428: Lê Lợi lên ngôi', 'Năm 1070: lập Văn Miếu', 'Năm 1010: dời đô'];
    for (const text of order) await page.getByRole('button', { name: new RegExp(`^${text}, chưa xếp`) }).click();
    return 'ordering';
  }
  if (await page.getByRole('list', { name: 'Các hình cần nối' }).count()) {
    const srcs = await page.locator('ul[aria-label="Các hình cần nối"] > li img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
    for (let i = 0; i < srcs.length; i += 1) {
      const wanted = data.names[srcs[i]];
      const other = Object.values(data.names).find((n) => n !== wanted);
      await page.getByRole('button', { name: new RegExp(`^Hình ${i + 1}`) }).click();
      await page.getByRole('button', { name: right ? wanted : other, exact: true }).click();
    }
    return 'matching';
  }
  if (await page.getByRole('list', { name: 'Kho từ' }).count()) {
    await page.getByRole('list', { name: 'Kho từ' }).getByRole('button', { name: right ? 'Lý Thái Tổ' : 'Lê Lợi', exact: true }).click();
    return 'fill';
  }
  if (await page.getByRole('textbox', { name: /^Chỗ trống số/ }).count()) {
    await page.getByRole('textbox', { name: 'Chỗ trống số 1' }).fill(right ? 'Lý Thái Tổ' : 'sai hoàn toàn');
    return 'fill';
  }
  if (await page.getByRole('radiogroup', { name: /^Mệnh đề/ }).count()) {
    const groups = page.getByRole('radiogroup', { name: /^Mệnh đề/ });
    const texts = await page.locator('article ol > li > span').allInnerTexts();
    for (let i = 0; i < texts.length; i += 1) {
      const truth = !texts[i].includes('Huế');
      await groups.nth(i).getByText(truth === right ? 'Đúng' : 'Sai', { exact: true }).click();
    }
    return 'multi';
  }
  const radios = page.getByRole('radio');
  const preferred = ['Năm 2010', 'Đúng', 'Cổng Đoan Môn', 'Lý Thái Tổ', 'Thăng Long'];
  const labels = await radios.evaluateAll((els) => els.map((e) => e.closest('label')?.innerText.trim() ?? ''));
  const rightIndex = labels.findIndex((l) => preferred.some((p) => l.endsWith(p) || l === p));
  const pick = right ? rightIndex : labels.findIndex((_, i) => i !== rightIndex);
  await radios.nth(Math.max(0, pick)).locator('xpath=ancestor::label').click();
  void article;
  return 'options';
}

/** Gốc bài học của cấp: mở bài, mở hộp thoại bắt đầu. */
async function openQuizDialog(page, quizName) {
  await page.getByRole('button', { name: new RegExp(`^(Làm bài|Làm tiếp): ${quizName}`) }).first().click();
  return page.getByRole('dialog', { name: quizName });
}

async function startQuiz(page, data, level, quiz) {
  await enterCode(page, data.lessons[level].code);
  if (level === 2) await page.getByRole('tab', { name: 'Bài kiểm tra' }).click();
  if (level === 1) {
    // Bài cấp 1 đi lần lượt Nghe chuyện, Xem hình, Chơi: bấm Tiếp nhé tới bước Chơi.
    for (let i = 0; i < 20 && !(await page.getByRole('heading', { name: 'Bài chơi của em' }).count()); i += 1) await page.getByRole('button', { name: 'Tiếp nhé' }).click();
  }
  const dialog = await openQuizDialog(page, quiz.name);
  await dialog.getByRole('button', { name: 'Bắt đầu' }).waitFor();
  return dialog;
}

try {
  console.log('Dựng dữ liệu qua API…');
  const seedData = await seed();
  console.log(`Đã dựng: ${Object.keys(seedData.quizzes).length} bài kiểm tra, mã bài học ${Object.values(seedData.lessons).map((l) => l.code).join(', ')}, mã học sinh ${Object.values(seedData.students).map((s) => s.code).join(', ')}`);

  // ==== Cấp 2 (khối 8): cân bằng, đồng hồ, bảng số câu, mất kết nối, tải lại giữa chừng ====
  {
    const page = await newPage();
    await loginAs(page, seedData.students[2].code);
    await page.getByRole('region', { name: 'Bài kiểm tra đang chờ em' }).waitFor();
    check('Cấp 2 trang học: bài kiểm tra chưa nhập mã có nhãn "Cần mã bài học"', (await page.getByText('Cần mã bài học').count()) > 0);
    await shot(page, '2-01-trang-hoc-can-ma');

    const dialog = await startQuiz(page, seedData, 2, seedData.quizzes.c2);
    check('Cấp 2: hộp thoại giới thiệu có số câu, thời gian, lời nhắc một lần', (await dialog.innerText()).includes('4 câu') && (await dialog.innerText()).includes('15 phút') && (await dialog.innerText()).includes('Mỗi em chỉ làm một lần'));
    await shot(page, '2-02-hop-thoai-bat-dau');
    await dialog.getByRole('button', { name: 'Bắt đầu' }).click();
    await page.getByRole('timer').waitFor();
    check('Cấp 2: bố cục cap-2, có đồng hồ 15 phút và bảng số câu', (await page.locator('[data-bo-cuc="cap-2"]').count()) === 1 && /1[45]:\d\d/.test(await page.getByRole('timer').innerText()));
    check('Cấp 2: vào làm bài không còn thanh điều hướng của trang', (await page.getByRole('link', { name: 'Nhập mã' }).count()) === 0 && (await page.locator('header nav').count()) === 0);

    const kinds = [];
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('heading', { level: 2 }).first().waitFor();
      await shot(page, `2-03-cau-${i + 1}`);
      kinds.push(await answerCurrent(page, i % 2 === 0, seedData));
      await page.getByText(/Đã lưu câu trả lời lúc/).waitFor();
      if (i < 3) await page.getByRole('button', { name: 'Câu sau' }).click();
    }
    check('Cấp 2: làm được đủ các dạng câu (một đáp án, đúng/sai, sắp xếp, điền từ)', kinds.join(',') === 'options,options,ordering,fill', kinds.join(','));
    check('Cấp 2: bảng số câu báo đã trả lời 4 / 4', (await page.getByText('Đã trả lời 4 / 4 câu').count()) === 1);
    await shot(page, '2-04-da-tra-loi-het');

    // Tải lại trang giữa chừng: vào tiếp đúng lượt, câu đã lưu còn nguyên, đồng hồ vẫn tính từ lúc bắt đầu.
    const before = await page.getByRole('timer').innerText();
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('timer').waitFor();
    await page.getByText('Đã trả lời 4 / 4 câu').waitFor();
    const after = await page.getByRole('timer').innerText();
    check('Cấp 2: tải lại giữa chừng vào tiếp lượt, đủ 4 câu đã lưu, đồng hồ không đặt lại', /1[45]:\d\d/.test(after) && after.slice(0, 5) <= before.slice(0, 5), `${before.slice(0, 5)} → ${after.slice(0, 5)}`);
    // Mở lại bằng đường dẫn không kèm xác nhận: hiện trang giới thiệu với nút Làm tiếp.
    await go(page, '/hoc');
    await go(page, `/bai-hoc/${seedData.lessons[2].code}/kiem-tra/${seedData.quizzes.c2.id}`);
    await page.getByRole('button', { name: 'Làm tiếp' }).waitFor();
    check('Cấp 2: mở thẳng đường dẫn của bài đang làm dở hiện nút Làm tiếp, chưa tạo lượt mới', true);
    await shot(page, '2-04b-lam-tiep');
    await page.getByRole('button', { name: 'Làm tiếp' }).click();
    await page.getByRole('timer').waitFor();

    // Mất kết nối ở câu 1.
    await page.getByRole('button', { name: /^Câu 1,/ }).click();
    await page.context().setOffline(true);
    await page.getByRole('radio').nth(0).check({ force: true });
    await page.getByText(/Mất kết nối\. Đang thử lưu lại câu trả lời/).waitFor({ timeout: 10_000 });
    check('Cấp 2: mất mạng thì báo "Mất kết nối" và giữ câu em vừa chọn', await page.getByRole('radio').nth(0).isChecked());
    await shot(page, '2-05-mat-ket-noi');
    await page.context().setOffline(false);
    await page.getByText(/Đã lưu câu trả lời lúc/).waitFor({ timeout: 15_000 });
    check('Cấp 2: có mạng lại thì tự lưu và hết báo mất kết nối', (await page.getByText(/Mất kết nối/).count()) === 0);

    // Nộp: xác nhận, nộp.
    await page.getByRole('button', { name: 'Nộp bài' }).first().click();
    const confirm = page.getByRole('dialog', { name: 'Nộp bài kiểm tra?' });
    await confirm.waitFor();
    check('Cấp 2: hộp xác nhận nộp khi đã trả lời hết', (await confirm.innerText()).includes('đã trả lời hết'));
    await shot(page, '2-06-xac-nhan-nop');
    await confirm.getByRole('button', { name: 'Nộp bài' }).click();
    await page.waitForURL('**/ket-qua/**');
    await page.getByText(/^Em đạt /).waitFor();
    const text2 = (await page.locator('main').innerText()).toLowerCase();
    check('Cấp 2 kết quả: có điểm, câu đúng, câu sai, bỏ trống, thời gian làm', /em đạt \d+(,\d+)?\/8 điểm/.test(text2) && text2.includes('câu đúng') && text2.includes('câu sai') && text2.includes('bỏ trống'));
    check('Cấp 2 kết quả: có phần đáp án và giải thích từng câu, huy hiệu nộp đúng hạn', text2.includes('đáp án và giải thích') && text2.includes('nộp đúng hạn'));
    await shot(page, '2-07-ket-qua', { fullPage: true });

    // Lịch sử và tiến độ.
    await go(page, '/tien-do');
    await page.getByRole('heading', { level: 1, name: 'Tiến độ của em' }).waitFor();
    await page.getByRole('tab', { name: 'Lịch sử bài làm' }).click();
    await page.locator('table tbody tr').first().waitFor();
    check('Cấp 2 lịch sử: có đúng 1 lượt đã nộp của bài vừa làm', (await page.locator('table tbody tr').count()) === 1 && (await page.locator('table').innerText()).includes(seedData.quizzes.c2.name));
    await shot(page, '2-08-lich-su');
    await page.getByRole('tab', { name: 'Tiến độ' }).click();
    await page.getByRole('heading', { name: 'Điểm theo thời gian' }).waitFor();
    check('Cấp 2 tiến độ: 1 / 1 bài kiểm tra, có biểu đồ điểm theo thời gian', (await page.getByText('1 / 1').count()) >= 1 && (await page.locator('svg title').count()) >= 1);
    await shot(page, '2-09-tien-do');
    await page.getByRole('tab', { name: 'Thành thạo' }).click();
    await shot(page, '2-10-thanh-thao');
    await page.getByRole('tab', { name: 'Huy hiệu' }).click();
    await page.getByText('Kiên trì').waitFor();
    check('Cấp 2 huy hiệu: đủ bốn huy hiệu, huy hiệu chưa đạt có khóa', (await page.locator('ul > li:has-text("Kiên trì")').count()) >= 1 && (await page.getByText(/^Chưa đạt/).count()) >= 1);
    await shot(page, '2-11-huy-hieu');

    // Làm lại bài đã nộp: vào thẳng kết quả, không tạo lượt mới.
    await go(page, '/hoc');
    await go(page, `/bai-hoc/${seedData.lessons[2].code}/kiem-tra/${seedData.quizzes.c2.id}`);
    await page.waitForURL('**/ket-qua/**');
    check('Cấp 2: mở lại bài đã nộp thì chuyển thẳng tới kết quả (một lượt mỗi em)', true);

    // Trang học sau khi nộp.
    await go(page, '/hoc');
    await page.getByRole('region', { name: 'Bài học của em' }).waitFor();
    check('Cấp 2 trang học: bài học đã mở có mã, tiến độ 1 / 1 và huy hiệu gần đây', (await page.getByRole('region', { name: 'Huy hiệu gần đây' }).count()) === 1 && (await page.getByRole('region', { name: 'Bài học của em' }).innerText()).includes('1 / 1'));
    await shot(page, '2-12-trang-hoc-sau-khi-nop', { fullPage: true });
    await page.context().close();
  }

  // ==== Cấp 1 (khối 3): từng câu, nút lớn, hình, loa, kéo thả, sao ====
  {
    const page = await newPage();
    await loginAs(page, seedData.students[1].code);
    await page.getByRole('region', { name: 'Bài chơi đang chờ em' }).waitFor();
    check('Cấp 1 trang học: bài chơi chờ em kèm nhãn "Cần mã bài học"', (await page.getByRole('region', { name: 'Bài chơi đang chờ em' }).count()) === 1);
    await shot(page, '1-01-trang-hoc');
    const dialog = await startQuiz(page, seedData, 1, seedData.quizzes.c1);
    check('Cấp 1: bài không có thời gian làm (không đồng hồ)', !(await dialog.innerText()).includes('phút'));
    await shot(page, '1-02-hop-thoai-bat-dau');
    await dialog.getByRole('button', { name: 'Bắt đầu' }).click();
    await page.getByRole('link', { name: 'Tạm dừng' }).waitFor();
    check('Cấp 1: bố cục cap-1, không đồng hồ, có nút Tạm dừng và hàng sao', (await page.locator('[data-bo-cuc="cap-1"]').count()) === 1 && (await page.getByRole('timer').count()) === 0);
    const kinds = [];
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('heading', { level: 2 }).first().waitFor();
      await shot(page, `1-03-cau-${i + 1}`);
      if (i === 2) {
        // Ghép cặp bằng kéo thả thật: kéo tên thả vào hình thứ nhất rồi hoàn tất bằng chạm.
        const srcs = await page.locator('ul[aria-label="Các hình cần nối"] > li img').evaluateAll((els) => els.map((e) => e.getAttribute('src')));
        const first = seedData.names[srcs[0]];
        await page.getByRole('button', { name: first, exact: true }).dragTo(page.locator('ul[aria-label="Các hình cần nối"] > li').first());
        const dragged = (await page.getByRole('button', { name: `Gỡ tên đã nối ở hình 1` }).count()) === 1;
        check('Cấp 1: kéo tên thả vào hình thì nối được', dragged, dragged ? '' : 'trình duyệt không thực hiện kéo thả; vẫn có thao tác chạm');
        for (let k = 1; k < srcs.length; k += 1) {
          await page.getByRole('button', { name: new RegExp(`^Hình ${k + 1}`) }).click();
          await page.getByRole('button', { name: seedData.names[srcs[k]], exact: true }).click();
        }
        if (!dragged) {
          await page.getByRole('button', { name: new RegExp('^Hình 1') }).click();
          await page.getByRole('button', { name: first, exact: true }).click();
        }
        kinds.push('matching');
      } else {
        kinds.push(await answerCurrent(page, true, seedData));
      }
      await page.getByText(/Đã lưu câu trả lời lúc/).waitFor();
      await shot(page, `1-04-cau-${i + 1}-da-chon`);
      if (i < 3) await page.getByRole('button', { name: 'Tiếp nhé' }).click();
    }
    check('Cấp 1: làm được chọn hình, đúng/sai, ghép cặp, sắp xếp', kinds.join(',') === 'options,options,matching,ordering', kinds.join(','));
    check('Cấp 1: câu cuối đổi nút thành "Xong rồi!"', (await page.getByRole('button', { name: 'Xong rồi!' }).count()) === 1);
    await shot(page, '1-05-cau-cuoi');
    await page.getByRole('button', { name: 'Xong rồi!' }).click();
    await page.waitForURL('**/ket-qua/**');
    await page.getByText('3 trên 3 sao').waitFor();
    const text1 = (await page.locator('main').innerText()).toLowerCase();
    check('Cấp 1 kết quả: sao và lời khen, không điểm, không phần trăm', (await page.getByText('3 trên 3 sao').count()) === 1 && text1.includes('giỏi quá') && !text1.replace('điểm tuyệt đối', '').includes('điểm') && !text1.includes('%'));
    check('Cấp 1 kết quả: huy hiệu mới và phần "Cùng xem đáp án nhé" không có dấu sai', text1.includes('em nhận huy hiệu mới!') && text1.includes('cùng xem đáp án nhé') && !text1.includes('chưa đúng'));
    await shot(page, '1-06-ket-qua', { fullPage: true });
    await go(page, '/tien-do');
    await page.getByRole('heading', { level: 1, name: 'Sao của em' }).waitFor();
    check('Cấp 1 tiến độ: "Sao của em" có tổng số sao, không bảng và không phần trăm', (await page.getByText(/^\d+ sao$/).count()) >= 1 && (await page.locator('table').count()) === 0 && !(await page.locator('main').innerText()).includes('%'));
    await shot(page, '1-07-sao-cua-em', { fullPage: true });
    await page.getByRole('tab', { name: 'Bài đã chơi' }).click();
    await page.getByRole('link', { name: 'Xem sao' }).first().waitFor();
    check('Cấp 1 tiến độ: tab Bài đã chơi có nút Xem sao', (await page.getByRole('link', { name: 'Xem sao' }).count()) === 1);
    await page.context().close();

    // Khung điện thoại: không tràn ngang khi làm bài cấp 1.
    const mobile = await newPage({ width: 390, height: 844 });
    await loginAs(mobile, seedData.students[1].code);
    await go(mobile, '/tien-do');
    await mobile.getByRole('heading', { level: 1, name: 'Sao của em' }).waitFor();
    check('Cấp 1 điện thoại: Sao của em không tràn ngang', await noHorizontalScroll(mobile));
    await shot(mobile, '1-08-dien-thoai-sao');
    await mobile.context().close();
  }

  // ==== Cấp 3 (khối 11): gọn, đồng hồ, tư liệu ghim, đánh dấu xem lại, phân tích, hết giờ tự nộp ====
  {
    const page = await newPage();
    await loginAs(page, seedData.students[3].code);
    await enterCode(page, seedData.lessons[3].code);
    await shot(page, '3-01-bai-hoc');
    const dialog = await openQuizDialog(page, seedData.quizzes.c3.name);
    await dialog.getByRole('button', { name: 'Bắt đầu' }).click();
    await page.getByRole('timer').waitFor();
    check('Cấp 3: bố cục cap-3, đồng hồ 45 phút, bảng số câu nằm ngang', (await page.locator('[data-bo-cuc="cap-3"]').count()) === 1 && /4[45]:\d\d/.test(await page.getByRole('timer').innerText()));
    const kinds = [];
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('heading', { level: 2 }).first().waitFor();
      if (i === 0) {
        await page.getByRole('button', { name: 'Đánh dấu xem lại' }).click();
        check('Cấp 3: đánh dấu xem lại hiện trên bảng số câu', (await page.getByRole('button', { name: /Câu 1, .*đã đánh dấu xem lại/ }).count()) === 1);
      }
      await shot(page, `3-02-cau-${i + 1}`);
      if (i === 2) check('Cấp 3: câu đọc tư liệu có tư liệu ghim bên trái', (await page.getByRole('complementary', { name: 'Tư liệu' }).count()) === 1 && (await page.getByText(/Tư liệu dùng cho câu 3 – 4/).count()) === 1);
      kinds.push(await answerCurrent(page, i !== 3, seedData));
      await page.getByText(/Đã lưu câu trả lời lúc/).waitFor();
      if (i < 3) await page.getByRole('button', { name: 'Câu sau' }).click();
    }
    check('Cấp 3: làm được một đáp án, nhiều mệnh đề, đọc tư liệu', kinds.join(',') === 'options,multi,options,options', kinds.join(','));
    // Bỏ một câu trống để thử hộp xác nhận còn câu chưa trả lời: xóa không có, nên kiểm bằng bài nhanh ở dưới.
    await page.getByRole('button', { name: 'Nộp bài' }).first().click();
    await page.getByRole('dialog', { name: 'Nộp bài kiểm tra?' }).getByRole('button', { name: 'Nộp bài' }).click();
    await page.waitForURL('**/ket-qua/**');
    await page.getByRole('heading', { name: 'Phân tích theo chủ đề' }).waitFor();
    const text3 = (await page.locator('main').innerText()).toLowerCase();
    check('Cấp 3 kết quả: điểm, phân tích theo di sản và theo dạng câu, gợi ý ôn', text3.includes('theo di sản') && text3.includes('theo dạng câu') && /em đạt/.test(text3));
    check('Cấp 3 kết quả: xem lại câu nhiều mệnh đề có đáp án từng ý', text3.includes('giải thích'));
    await shot(page, '3-03-ket-qua', { fullPage: true });
    await go(page, '/tien-do?tab=lich-su');
    await page.getByRole('heading', { level: 1, name: 'Tiến độ của em' }).waitFor();
    await shot(page, '3-04-lich-su');
    await go(page, '/tien-do?tab=thanh-thao');
    await page.getByRole('heading', { name: 'Tỉ lệ đúng theo di sản' }).waitFor();
    await shot(page, '3-05-thanh-thao');

    if (process.env.SKIP_TIMEOUT !== '1') {
      // Hết giờ tự nộp: bài nhanh 1 phút, em chỉ trả lời rồi để đồng hồ chạy hết.
      await enterCode(page, seedData.lessons[3].code);
      const d2 = await openQuizDialog(page, seedData.quizzes.c3nhanh.name);
      await d2.getByRole('button', { name: 'Bắt đầu' }).click();
      await page.getByRole('timer').waitFor();
      await answerCurrent(page, true, seedData);
      await page.getByText(/Đã lưu câu trả lời lúc/).waitFor();
      await shot(page, '3-06-bai-nhanh-dang-lam');
      await page.waitForFunction(() => /00:[0-5]\d/.test(document.querySelector('[role="timer"]')?.textContent ?? ''), null, { timeout: 30_000 });
      check('Cấp 3: dưới 1 phút đồng hồ chuyển cảnh báo "sắp hết giờ"', (await page.getByRole('timer').innerText()).includes('sắp hết giờ'));
      await shot(page, '3-07-sap-het-gio');
      await page.waitForURL('**/ket-qua/**', { timeout: 120_000 });
      await page.getByText(/Đã hết thời gian làm bài\. Bài của em đã được nộp tự động/).waitFor();
      check('Cấp 3: hết giờ thì tự nộp với câu đã lưu và báo "đã được nộp tự động"', true);
      await shot(page, '3-08-het-gio-tu-nop');
      await go(page, '/tien-do?tab=lich-su');
      await page.getByText('Kiểm tra nhanh 1 phút').first().waitFor();
      check('Cấp 3 lịch sử: lượt hết giờ tự nộp có trong lịch sử', (await page.locator('table').innerText()).includes('Kiểm tra nhanh 1 phút'));
    }
    check('Cấp 3: không tràn ngang trên màn hình lớn', await noHorizontalScroll(page));
    await page.context().close();

    // Điện thoại: làm bài cấp 3 không tràn ngang.
    const mobile = await newPage({ width: 390, height: 844 });
    await loginAs(mobile, seedData.students[3].code);
    await go(mobile, `/ket-qua/${(await api('GET', '/student/attempts', undefined, (await api('POST', '/student/auth/login', { studentCode: seedData.students[3].code, password: STUDENT_PW })).accessToken)).items[0].attemptId}`);
    await mobile.getByRole('heading', { level: 1 }).first().waitFor();
    check('Cấp 3 điện thoại: kết quả không tràn ngang', await noHorizontalScroll(mobile));
    await shot(mobile, '3-09-dien-thoai-ket-qua', { fullPage: true });
    await mobile.context().close();
  }

  // ==== Phân quyền: em khác không thấy lượt của em ====
  {
    const token = (await api('POST', '/student/auth/login', { studentCode: seedData.students[1].code, password: STUDENT_PW })).accessToken;
    const other = (await api('POST', '/student/auth/login', { studentCode: seedData.students[2].code, password: STUDENT_PW })).accessToken;
    const mine = (await api('GET', '/student/attempts', undefined, token)).items[0];
    const response = await fetch(`${API}/student/attempts/${mine.attemptId}/result`, { headers: { Authorization: `Bearer ${other}` } });
    check('Lượt của em khác trả 404 (không lộ dữ liệu)', response.status === 404, String(response.status));
  }
} catch (error) {
  check('Chạy hết kịch bản không lỗi', false, String(error?.stack ?? error));
  await lastPage?.screenshot({ path: resolve(SHOTS, 'loi-cuoi-cung.png'), fullPage: true }).catch(() => undefined);
  console.log('Trang lúc lỗi:', lastPage?.url(), await lastPage?.locator('body').innerText().catch(() => ''));
} finally {
  await browser.close();
}

check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
check('Không có lỗi console (trừ ảnh ngoài bị chặn)', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
const failed = results.filter((r) => !r.ok);
console.log(`\nTổng: ${results.length} bước, đạt ${results.length - failed.length}, lỗi ${failed.length}. Ảnh chụp: ${SHOTS}`);
process.exit(failed.length === 0 ? 0 : 1);
