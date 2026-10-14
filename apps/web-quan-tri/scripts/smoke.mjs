#!/usr/bin/env node
// Kiểm thử web quản trị trên trình duyệt thật với API thật (docs/kiem-thu-trinh-duyet.md ở thư mục gốc repo): đăng
// nhập, đặt mật khẩu qua email, hồ sơ, quản lý trường, giáo viên, nhật ký thao tác.
// Cần: API đang chạy, `npm run dev:quan-tri` đang chạy và trỏ tới API đó, Edge hoặc Chrome đã cài trên máy.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   BASE_URL           mặc định http://localhost:5173 (trùng App:FrontendBaseUrl của API)
//   API_LOG            BẮT BUỘC — tệp log console của API; thư giả (ConsoleEmailSender) chứa liên kết đặt mật khẩu
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN (User Secrets hoặc biến Seed__AdminPassword của API)
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)
//
// Kịch bản tạo dữ liệu mới có hậu tố thời gian nên chạy lại nhiều lần được trên cùng CSDL.

import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const API_LOG = process.env.API_LOG;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!API_LOG || !ADMIN_PASSWORD) {
  console.error('Cần API_LOG và ADMIN_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const school = {
  name: `Trường THCS Chu Văn An ${stamp}`,
  email: `lienhe.${stamp}@chuvanan.edu.vn`,
  admin: { fullName: 'Hoàng Thị Thanh Tâm', username: `tam.${stamp}`, email: `tam.${stamp}@chuvanan.edu.vn` },
};
const teacher = { fullName: 'Đinh Quốc Bảo', username: `bao.${stamp}`, email: `bao.${stamp}@chuvanan.edu.vn` };
const PASSWORD = 'MatKhau2026';

const results = [];
const pageErrors = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

/** Liên kết đặt mật khẩu mới nhất gửi tới `email` trong log thư giả (chờ tối đa 5 giây). */
async function mailLink(email) {
  for (let i = 0; i < 25; i++) {
    const log = readFileSync(API_LOG, 'latin1');
    const at = log.lastIndexOf(`${email} |`);
    if (at >= 0) {
      const link = log.slice(at).match(/https?:\/\/\S+?\/dat-mat-khau\?token=[\w-]+/)?.[0];
      if (link) return `${BASE}${new URL(link).pathname}${new URL(link).search}`;
    }
    await sleep(200);
  }
  throw new Error(`Không thấy thư đặt mật khẩu gửi tới ${email} trong ${API_LOG}`);
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', ...options });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  return page;
}

const page = await newPage();
const shot = (name, p = page) => p.screenshot({ path: resolve(SHOTS, `${name}.png`), fullPage: true });
const fieldErrors = (p = page) => p.locator('p.text-danger').allTextContents();
const bodyHas = (text, p = page) => p.waitForFunction((t) => document.body.innerText.includes(t), text);
const click = (name, p = page) => p.getByRole('button', { name, exact: true }).click();
const path = (p = page) => new URL(p.url()).pathname;

async function signIn(login, password, p = page) {
  await p.goto(`${BASE}/dang-nhap`);
  await p.getByLabel('Email hoặc tên đăng nhập').fill(login);
  await p.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await click('Đăng nhập', p);
}

async function signOut(p = page) {
  await p.getByRole('button', { name: /^Tài khoản:/ }).click();
  await p.getByRole('button', { name: 'Đăng xuất' }).click();
  await p.getByRole('dialog', { name: 'Đăng xuất' }).getByRole('button', { name: 'Đăng xuất' }).click();
  await p.waitForURL(`${BASE}/dang-nhap`);
}

async function setPassword(link, password, p = page) {
  await p.goto(link);
  await p.getByLabel('Mật khẩu mới', { exact: true }).fill(password);
  await p.getByLabel('Nhập lại mật khẩu mới').fill(password);
  await click('Đặt mật khẩu', p);
  await p.waitForURL(`${BASE}/dang-nhap`);
}

try {
  // ---- Khách, màn hình Đăng nhập
  await page.goto(`${BASE}/tai-khoan?tab=doi-mat-khau`);
  await page.getByRole('heading', { level: 1, name: 'Đăng nhập' }).waitFor();
  check('Khách mở /tai-khoan bị chuyển tới /dang-nhap', path() === '/dang-nhap');
  check('Đăng nhập không có liên kết "Đăng ký" (tài khoản do cấp trên tạo)', (await page.getByRole('link', { name: /Đăng ký/ }).count()) === 0);
  check('Đăng nhập có dòng cố định chỉ học sinh sang web học tập', await page.getByText(/Học sinh đăng nhập ở trang Vietnam Heritage/).isVisible());
  await click('Đăng nhập');
  check('Để trống → báo bắt buộc nhập dưới 2 ô', (await fieldErrors()).length === 2, (await fieldErrors()).join(' | '));
  await shot('01-dang-nhap-loi');
  await signIn(ADMIN_LOGIN, 'SaiMatKhau1');
  await page.getByRole('alert').first().waitFor();
  check('Sai mật khẩu → câu sai thông tin chung', (await page.getByRole('alert').first().textContent())?.includes('Email, tên đăng nhập hoặc mật khẩu không đúng.'));

  // ---- Quản trị hệ thống: bị chặn giữa chừng thì quay lại đúng trang; Quản lý trường, Chi tiết trường
  await page.goto(`${BASE}/quan-tri/nhat-ky`);
  await page.waitForURL(`${BASE}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await click('Đăng nhập');
  await page.waitForURL(`${BASE}/quan-tri/nhat-ky`);
  await page.getByRole('heading', { level: 1, name: 'Nhật ký thao tác' }).waitFor();
  check('Khách mở /quan-tri/nhat-ky → Đăng nhập → đăng nhập bằng tên đăng nhập → quay lại đúng trang', true);
  await page.getByRole('link', { name: 'Trường', exact: true }).first().click();
  await page.waitForURL(`${BASE}/quan-tri/truong`);
  await page.getByRole('heading', { level: 1, name: 'Quản lý trường' }).waitFor();
  check('Thanh bên → "Trường" → Quản lý trường', true);
  await page.getByRole('link', { name: 'Tạo trường' }).first().click();
  await page.waitForURL(`${BASE}/quan-tri/truong/moi`);
  await click('Tạo trường');
  check('Tạo trường để trống → báo bắt buộc nhập (tên trường + 3 ô quản trị trường)', (await fieldErrors()).length === 4, (await fieldErrors()).join(' | '));
  const info = page.getByRole('group', { name: 'Thông tin trường' });
  const first = page.getByRole('group', { name: 'Quản trị trường đầu tiên' });
  await info.getByLabel('Tên trường').fill(school.name);
  await info.getByLabel('Email liên hệ của trường').fill(school.email);
  await first.getByLabel('Họ và tên').fill(school.admin.fullName);
  await first.getByLabel('Tên đăng nhập').fill(school.admin.username);
  await first.getByLabel('Email', { exact: true }).fill(school.admin.email);
  await shot('02-tao-truong');
  await click('Tạo trường');
  await page.waitForURL(/\/quan-tri\/truong\/\d+$/);
  const schoolUrl = page.url();
  await bodyHas(`Đã gửi email đặt mật khẩu tới ${school.admin.email}. Liên kết có hiệu lực 48 giờ.`);
  check('Tạo trường + quản trị trường đầu tiên → "Đã gửi email đặt mật khẩu", sang trang chi tiết', true);
  const plan = page.getByRole('region', { name: 'Gói hiện tại' });
  check('Trường mới có gói "Miễn phí" Đang hiệu lực', (await plan.innerText()).includes('Miễn phí') && (await plan.innerText()).includes('Đang hiệu lực'));
  await shot('03-chi-tiet-truong');

  await page.goto(`${BASE}/quan-tri/truong/moi`);
  await info.getByLabel('Tên trường').fill(`${school.name} trùng`);
  await first.getByLabel('Họ và tên').fill('Người Trùng');
  await first.getByLabel('Tên đăng nhập').fill(`khac.${stamp}`);
  await first.getByLabel('Email', { exact: true }).fill(school.admin.email);
  await click('Tạo trường');
  await first.locator('p.text-danger').waitFor();
  check('Email quản trị trường trùng → báo trùng dưới ô Email của nhóm quản trị trường', (await first.locator('p.text-danger').textContent())?.includes('đã được sử dụng cho một tài khoản khác'));

  await page.goto(`${BASE}/quan-tri/truong?tu-khoa=${stamp}`);
  await page.getByRole('table', { name: 'Danh sách trường' }).waitFor();
  check('Quản lý trường: tìm theo từ khóa trên URL chỉ ra trường vừa tạo (không tạo trường trùng)', (await page.getByRole('table', { name: 'Danh sách trường' }).locator('tbody tr').count()) === 1);
  await shot('04-danh-sach-truong');

  // Người đã đăng nhập mở liên kết đặt mật khẩu bị chuyển về trang của vai trò.
  const adminLink = await mailLink(school.admin.email);
  await page.goto(adminLink);
  await page.waitForURL(`${BASE}/quan-tri`);
  check('Đang đăng nhập mở /dat-mat-khau → về trang của vai trò (Tổng quan /quan-tri)', true);
  await signOut();
  check('Đăng xuất (hộp xác nhận chung) → Đăng nhập, xóa phiên', (await page.evaluate(() => localStorage.getItem('dsvhvn.quan-tri.phien'))) === null);

  // ---- Đặt mật khẩu lần đầu cho quản trị trường
  await page.goto(adminLink);
  await page.getByLabel('Tên đăng nhập').waitFor();
  check('Đặt mật khẩu: kiểm liên kết, hiện tên đăng nhập của tài khoản', (await page.getByLabel('Tên đăng nhập').inputValue()) === school.admin.username);
  await page.getByLabel('Mật khẩu mới', { exact: true }).fill('matkhau1');
  await page.getByLabel('Nhập lại mật khẩu mới').fill('matkhau2');
  await click('Đặt mật khẩu');
  const errs = await fieldErrors();
  check('Mật khẩu yếu → câu quy tắc mật khẩu, nhập lại không khớp → câu hai lần nhập chưa giống nhau', errs.some((t) => t.startsWith('Mật khẩu phải dài 8-64 ký tự')) && errs.some((t) => t.includes('Hai lần nhập mật khẩu chưa giống nhau')));
  await shot('05-dat-mat-khau');
  await setPassword(adminLink, PASSWORD);
  check('Đặt mật khẩu lần đầu → Đăng nhập, tên đăng nhập điền sẵn', (await page.getByLabel('Email hoặc tên đăng nhập').inputValue()) === school.admin.username);
  await page.goto(adminLink);
  await page.getByRole('link', { name: 'Gửi lại liên kết' }).waitFor();
  check('Dùng lại liên kết → báo liên kết hết hạn + "Gửi lại liên kết"', (await page.getByRole('alert').textContent())?.includes('Liên kết đã hết hạn hoặc không còn dùng được'));

  // ---- Quản trị trường: Giáo viên của trường, Biểu mẫu tài khoản, Trường và gói
  await signIn(school.admin.email, PASSWORD);
  await page.waitForURL(`${BASE}/truong`);
  await page.getByRole('heading', { level: 1, name: 'Tổng quan trường' }).waitFor();
  await page.getByRole('link', { name: 'Giáo viên', exact: true }).first().click();
  await page.waitForURL(`${BASE}/truong/giao-vien`);
  await page.getByRole('heading', { level: 1, name: 'Giáo viên của trường' }).waitFor();
  check('Quản trị trường đăng nhập bằng email → Tổng quan trường /truong, mở Giáo viên của trường /truong/giao-vien', true);
  await bodyHas('0 / 10 giáo viên');
  check('Bộ đếm hạn mức "0 / 10 giáo viên" (gói Miễn phí môi trường dev)', true);
  await click('Thêm giáo viên');
  const dialog = page.getByRole('dialog', { name: 'Thêm giáo viên' });
  await dialog.getByLabel('Họ và tên').fill(teacher.fullName);
  await dialog.getByLabel('Tên đăng nhập').fill(teacher.username);
  await dialog.getByLabel('Email', { exact: true }).fill(teacher.email);
  await shot('06-them-giao-vien');
  await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await bodyHas(`Đã gửi email đặt mật khẩu tới ${teacher.email}.`);
  await page.getByRole('cell', { name: teacher.fullName }).waitFor();
  await bodyHas('1 / 10 giáo viên');
  check('Thêm giáo viên → câu đã gửi email đặt mật khẩu, bảng và bộ đếm cập nhật', true);

  await click('Thêm giáo viên');
  await dialog.getByLabel('Họ và tên').fill('Người Trùng');
  await dialog.getByLabel('Tên đăng nhập').fill(teacher.username);
  await dialog.getByLabel('Email', { exact: true }).fill(`khac.${stamp}@chuvanan.edu.vn`);
  await dialog.getByRole('button', { name: 'Tạo tài khoản' }).click();
  await dialog.locator('p.text-danger').waitFor();
  check('Tên đăng nhập trùng → báo trùng dưới ô trong hộp thoại', (await dialog.locator('p.text-danger').textContent())?.includes(`"${teacher.username}" đã được sử dụng`));
  await dialog.getByRole('button', { name: 'Hủy' }).click();

  await page.getByRole('link', { name: 'Trường và gói' }).first().click();
  await page.waitForURL(`${BASE}/truong/thong-tin`);
  check('Trường và gói: tên trường chỉ đọc', await page.getByLabel('Tên trường').evaluate((el) => el.readOnly));
  await page.getByLabel('Số điện thoại').fill('028 3822 1234');
  await page.getByLabel('Địa chỉ').fill('7 Nguyễn Bỉnh Khiêm, TP. Hồ Chí Minh');
  await click('Lưu thay đổi');
  await bodyHas('Lưu thông tin trường thành công.');
  check('Trường và gói: sửa địa chỉ, số điện thoại → lưu thành công', true);
  await shot('07-thong-tin-truong');

  // ---- Giáo viên: đặt mật khẩu, đăng nhập, Hồ sơ cá nhân, 403
  const teacherPage = await newPage();
  await setPassword(await mailLink(teacher.email), PASSWORD, teacherPage);
  await signIn(teacher.username, PASSWORD, teacherPage);
  await teacherPage.waitForURL(`${BASE}/tai-khoan`);
  check('Giáo viên đăng nhập → Hồ sơ cá nhân /tai-khoan (tới khi có màn hình Lớp học)', true);
  check('Hồ sơ cá nhân hiện trường của giáo viên', (await teacherPage.locator('dl').first().innerText()).includes(school.name));
  await teacherPage.getByLabel('Số điện thoại').fill('0901 234 567');
  await click('Lưu thay đổi', teacherPage);
  await bodyHas('Lưu hồ sơ thành công.', teacherPage);
  check('Hồ sơ cá nhân: sửa số điện thoại → lưu thành công', true);
  await teacherPage.goto(`${BASE}/giao-vien`);
  await teacherPage.getByRole('heading', { level: 1, name: 'Lớp học' }).waitFor();
  check('/giao-vien → Lớp học trong khu có thanh bên', path(teacherPage) === '/giao-vien/lop');
  await shot('08-khu-giao-vien', teacherPage);
  await teacherPage.goto(`${BASE}/truong/giao-vien`);
  await teacherPage.getByRole('heading', { level: 1, name: 'Bạn không có quyền thực hiện thao tác này.' }).waitFor();
  check('Giáo viên mở /truong → 403 không có quyền', true);

  // Khóa có hiệu lực ngay: quản trị trường khóa, yêu cầu kế tiếp của giáo viên bị từ chối → Đăng nhập hiện lý do.
  await page.goto(`${BASE}/truong/giao-vien`);
  await page.getByRole('row', { name: new RegExp(teacher.fullName) }).getByRole('button', { name: 'Khóa' }).click();
  const confirm = page.getByRole('dialog', { name: 'Khóa tài khoản' });
  check('Hộp xác nhận chung', (await confirm.innerText()).includes(`Bạn có chắc muốn khóa tài khoản "${teacher.fullName}"?`));
  await confirm.getByRole('button', { name: 'Khóa' }).click();
  await bodyHas('Khóa tài khoản thành công.');
  await page.getByRole('row', { name: new RegExp(teacher.fullName) }).getByText('Bị khóa').waitFor();
  check('Khóa giáo viên → khóa thành công, trạng thái "Bị khóa"', true);
  await teacherPage.goto(`${BASE}/tai-khoan`);
  await teacherPage.waitForURL(`${BASE}/dang-nhap`);
  await teacherPage.getByRole('alert').waitFor();
  check('Giáo viên đang mở phiên bị đẩy về Đăng nhập với câu không đăng nhập được', (await teacherPage.getByRole('alert').textContent())?.startsWith('Tài khoản không đăng nhập được.'));
  await shot('09-bi-khoa', teacherPage);
  await page.getByRole('row', { name: new RegExp(teacher.fullName) }).getByRole('button', { name: 'Mở khóa' }).click();
  await page.getByRole('dialog', { name: 'Mở khóa tài khoản' }).getByRole('button', { name: 'Mở khóa' }).click();
  await bodyHas('Mở khóa tài khoản thành công.');
  await signIn(teacher.username, PASSWORD, teacherPage);
  await teacherPage.waitForURL(`${BASE}/tai-khoan`);
  check('Mở khóa → giáo viên đăng nhập lại được', true);

  // Đổi mật khẩu: phiên hiện tại nhận token mới, token cũ ở nơi khác hết dùng được.
  const oldToken = await teacherPage.evaluate(() => JSON.parse(localStorage.getItem('dsvhvn.quan-tri.phien')).accessToken);
  await teacherPage.goto(`${BASE}/tai-khoan?tab=doi-mat-khau`);
  await teacherPage.getByLabel('Mật khẩu hiện tại').fill(PASSWORD);
  await teacherPage.getByLabel('Mật khẩu mới', { exact: true }).fill('MatKhau2027');
  await teacherPage.getByLabel('Nhập lại mật khẩu mới').fill('MatKhau2027');
  await click('Đổi mật khẩu', teacherPage);
  await bodyHas('Đổi mật khẩu thành công.', teacherPage);
  const newToken = await teacherPage.evaluate(() => JSON.parse(localStorage.getItem('dsvhvn.quan-tri.phien')).accessToken);
  await teacherPage.reload();
  await teacherPage.getByRole('heading', { level: 1, name: 'Hồ sơ cá nhân' }).waitFor();
  check('Đổi mật khẩu → đổi thành công, phiên nhận token mới và vẫn dùng được', newToken !== oldToken && path(teacherPage) === '/tai-khoan');
  await teacherPage.close();

  // ---- Quên mật khẩu
  await signOut();
  await page.goto(`${BASE}/quen-mat-khau`);
  await page.getByLabel('Email', { exact: true }).fill(teacher.email);
  await click('Gửi liên kết');
  await page.getByRole('status').filter({ hasText: 'Liên kết có hiệu lực 30 phút' }).waitFor();
  check('Quên mật khẩu → luôn cùng một câu, liên kết 30 phút', true);
  await setPassword(await mailLink(teacher.email), 'MatKhau2028');
  await signIn(teacher.email, 'MatKhau2028');
  await page.waitForURL(`${BASE}/tai-khoan`);
  check('Đặt lại mật khẩu qua liên kết 30 phút → đăng nhập bằng mật khẩu mới', true);
  await signOut();

  // ---- Quản trị hệ thống: Nhật ký thao tác, ngừng trường
  await signIn(ADMIN_LOGIN, ADMIN_PASSWORD);
  await page.waitForURL(`${BASE}/quan-tri`);
  check('Quản trị hệ thống đăng nhập → trang mặc định Tổng quan và doanh thu /quan-tri', true);
  await page.goto(`${BASE}/quan-tri/nhat-ky`);
  await page.getByLabel('Hành động').selectOption({ label: 'Tạo trường' });
  await click('Lọc');
  await page.waitForURL(/hanh-dong=tao-truong/);
  const logTable = page.getByRole('table', { name: 'Nhật ký thao tác' });
  // Bảng giữ dữ liệu cũ trong lúc tải trang lọc mới (keepPreviousData): chờ tới khi mọi dòng là "Tạo trường".
  const onlyCreated = await page
    .waitForFunction(() => {
      const cells = [...document.querySelectorAll('table tbody tr td:nth-child(4)')];
      return cells.length > 0 && cells.every((c) => c.textContent === 'Tạo trường');
    }, null, { timeout: 10_000 })
    .then(() => true, () => false);
  check('Nhật ký thao tác: lọc "Tạo trường" (URL chữ Việt) chỉ ra dòng Tạo trường', onlyCreated);
  await logTable.getByRole('button', { name: 'Xem' }).first().click();
  check('Mở dòng nhật ký: giá trị mới hiện nhãn tiếng Việt', (await logTable.innerText()).includes('Giá trị mới') && (await logTable.innerText()).includes('Gói'));
  await shot('10-nhat-ky');

  await page.goto(schoolUrl);
  await click('Ngừng trường');
  await page.getByRole('dialog', { name: 'Ngừng trường' }).getByRole('button', { name: 'Ngừng trường' }).click();
  await bodyHas('Ngừng trường thành công.');
  await page.getByText('Trường đã ngừng nên không sửa được thông tin.').waitFor();
  check('Ngừng trường → ngừng thành công, trang chi tiết chuyển chỉ đọc', true);
  await signOut();
  await signIn(school.admin.username, PASSWORD);
  await page.getByRole('alert').waitFor();
  check('Tài khoản của trường đã ngừng → câu không đăng nhập được', (await page.getByRole('alert').textContent())?.startsWith('Tài khoản không đăng nhập được.'));

  // ---- 404, điện thoại
  await page.goto(`${BASE}/khong-co-trang-nay`);
  await page.getByRole('heading', { level: 1, name: 'Không tìm thấy trang' }).waitFor();
  check('Đường dẫn lạ → 404', true);
  const mobile = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await mobile.goto(`${BASE}/dang-nhap`);
  await mobile.getByRole('heading', { level: 1, name: 'Đăng nhập' }).waitFor();
  check('390px: màn hình Đăng nhập không có thanh cuộn ngang', !(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await signIn(ADMIN_LOGIN, ADMIN_PASSWORD, mobile);
  await mobile.waitForURL(`${BASE}/quan-tri`);
  await mobile.getByRole('navigation', { name: 'Quản trị hệ thống (thu gọn)' }).waitFor();
  check('390px: khu quản trị dùng hàng điều hướng thu gọn, không tràn ngang', !(await mobile.evaluate(() => document.documentElement.scrollWidth > innerWidth)));
  await shot('11-dien-thoai', mobile);
} catch (error) {
  check('Kịch bản chạy hết', false, String(error).split('\n')[0]);
  await shot('zz-loi').catch(() => {});
} finally {
  check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.slice(0, 2).join(' || '));
  await browser.close();
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} bước đạt · hậu tố dữ liệu ${stamp} · ảnh chụp: ${SHOTS}`);
  process.exit(failed ? 1 : 0);
}
