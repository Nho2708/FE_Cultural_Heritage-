// Chụp màn hình thật của sản phẩm để dựng video giới thiệu cho nhà trường.
// Chỉ xem: không lưu, không xuất bản, không tạo bằng AI, không xóa, không đổi mật khẩu.
// Chạy: node scripts/quay-nha-truong.mjs [--quan-tri http://localhost:8081] [--hoc-tap http://localhost:8082] [--chi 05,06]
// Tài khoản đọc từ scripts/tai-khoan.local.json (không đưa vào git).
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const thuMucScript = path.dirname(fileURLToPath(import.meta.url));
const thuMucRa = path.resolve(thuMucScript, '../public/man-hinh/nha-truong');
fs.mkdirSync(thuMucRa, { recursive: true });

function thamSo(ten, macDinh) {
  const i = process.argv.indexOf(`--${ten}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : macDinh;
}
const QUAN_TRI = thamSo('quan-tri', 'http://localhost:8081').replace(/\/$/, '');
const HOC_TAP = thamSo('hoc-tap', 'http://localhost:8082').replace(/\/$/, '');
const CHI = thamSo('chi', '').split(',').filter(Boolean); // lọc theo tiền tố tên ảnh khi chạy lại một phần
const TK = JSON.parse(fs.readFileSync(path.join(thuMucScript, 'tai-khoan.local.json'), 'utf8'));

const TI_LE = 4 / 3;
// Chạy lại một phần (--chi) thì giữ các mục của lần trước
const tepDanhSach = path.join(thuMucRa, 'danh-sach.json');
const truoc = CHI.length && fs.existsSync(tepDanhSach) ? JSON.parse(fs.readFileSync(tepDanhSach, 'utf8')) : {};
const danhSach = { ...(truoc.anh ?? {}) };
const thieu = {};

let trinhDuyet = await chromium.launch({ channel: 'msedge' });

async function taoNgucCanh() {
  const ctx = await trinhDuyet.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: TI_LE,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
    reducedMotion: 'reduce',
  });
  return ctx;
}

async function choTai(page, cho) {
  await page.waitForLoadState('networkidle').catch(() => {});
  if (cho) await page.getByText(cho).first().waitFor({ timeout: 15000 });
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(600);
}

async function dangNhapQuanTri(page, vaiTro) {
  const tk = TK[vaiTro];
  await page.goto(`${QUAN_TRI}/dang-nhap`);
  await page.getByLabel(/Email hoặc tên đăng nhập/).fill(tk.tenDangNhap);
  await page.locator('input[type=password]').first().fill(tk.matKhau);
  await page.getByRole('button', { name: /đăng nhập/i }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/dang-nhap'), { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function dangNhapHocSinh(page, tk) {
  await page.goto(`${HOC_TAP}/dang-nhap`);
  await page.getByLabel('Mã học sinh').fill(tk.ma);
  await page.locator('input[type=password]').first().fill(tk.matKhau);
  await page.locator('form button[type=submit]').first().click();
  await page.waitForURL((u) => !u.pathname.startsWith('/dang-nhap'), { timeout: 15000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

/** Vùng chữ nhật (px ảnh) của một phần tử trong khung nhìn hiện tại. */
async function vung(page, locator, ten) {
  const box = await locator.first().boundingBox();
  if (!box) return null;
  const x = Math.max(0, box.x);
  const y = Math.max(0, box.y);
  const w = Math.min(1440 - x, box.width);
  const h = Math.min(900 - y, box.height);
  return {
    ten,
    x: Math.round(x * TI_LE),
    y: Math.round(y * TI_LE),
    rong: Math.round(w * TI_LE),
    cao: Math.round(h * TI_LE),
  };
}

async function lamMo(page, selector) {
  await page.addStyleTag({ content: `${selector}{filter:blur(6px)!important}` });
}

/** Chụp một ảnh và ghi vào danh sách. `vungCan` là mảng {ten, locator}. */
async function chup(page, tenTep, moTa, url, vungCan = []) {
  const vungs = [];
  for (const v of vungCan) {
    if (v.rect) {
      const [x, y, rong, cao] = v.rect;
      vungs.push({ ten: v.ten, x, y, rong, cao });
      continue;
    }
    try {
      await v.locator.first().waitFor({ timeout: 4000 });
      const r = await vung(page, v.locator, v.ten);
      if (r) vungs.push(r);
    } catch {
      /* bỏ qua vùng không tìm thấy */
    }
  }
  await page.screenshot({ path: path.join(thuMucRa, tenTep) });
  danhSach[tenTep] = {
    kichThuoc: { rong: Math.round(1440 * TI_LE), cao: Math.round(900 * TI_LE) },
    url,
    moTa,
    vungPhongTo: vungs,
  };
  console.log('da chup', tenTep);
}

async function buoc(ten, fn) {
  if (CHI.length && !CHI.some((c) => ten.startsWith(c))) return;
  try {
    await fn();
  } catch (e) {
    thieu[ten] = String(e.message).split('\n')[0];
    console.log('THIEU', ten, thieu[ten]);
  }
}

/** Cuộn phần tử vào giữa khung nhìn rồi đợi ổn định. */
async function cuonToi(page, locator) {
  await locator.first().evaluate((el) => el.scrollIntoView({ block: 'start', behavior: 'instant' }));
  await page.evaluate(() => window.scrollBy(0, -90));
  await page.waitForTimeout(400);
}

// ---------- 17, 18: công khai ----------
await buoc('17', async () => {
  const ctx = await taoNgucCanh();
  const page = await ctx.newPage();
  await page.goto(`${QUAN_TRI}/dang-nhap`);
  await choTai(page, 'Mật khẩu');
  await chup(page, '17-dang-nhap-quan-tri.png', 'Trang Đăng nhập web quản trị, chưa đăng nhập', '/dang-nhap (web quản trị)', [
    { ten: 'Khung đăng nhập', rect: [1173, 475, 533, 656] },
  ]);
  await ctx.close();
});

await buoc('18', async () => {
  const ctx = await taoNgucCanh();
  const page = await ctx.newPage();
  await page.goto(`${HOC_TAP}/nha-truong`);
  await choTai(page);
  await chup(page, '18-nha-truong.png', 'Trang Dành cho nhà trường của web học tập, đầu trang', '/nha-truong (web học tập)', [
    { ten: 'Tiêu đề và lời giới thiệu', rect: [160, 249, 1000, 290] },
    { ten: 'Nút đăng nhập web quản trị', rect: [160, 564, 701, 64] },
  ]);
  // Phần nói về gói Miễn phí và gói trả phí (demo không có trường nào đang dùng gói Miễn phí)
  const goi = page.getByText(/Trường mới bắt đầu với gói Miễn phí/).first();
  await goi.waitFor({ timeout: 8000 });
  await cuonToi(page, goi);
  await chup(page, '18b-goi-mien-phi.png', 'Trang Dành cho nhà trường: phần giới thiệu gói Miễn phí và các gói trả phí', '/nha-truong (phần gói)', [
    { ten: 'Khối Cách để trường bắt đầu (gói Miễn phí)', rect: [160, 372, 784, 460] },
  ]);
  await ctx.close();
});

// ---------- 01, 16: quản trị trường ----------
await buoc('01', async () => {
  const ctx = await taoNgucCanh();
  const page = await ctx.newPage();
  await dangNhapQuanTri(page, 'quanTriTruong');
  await page.goto(`${QUAN_TRI}/truong/giao-vien`);
  await choTai(page, 'Lê Hoàng Nam');
  await chup(page, '01-giao-vien.png', 'Quản trị trường: danh sách giáo viên của trường, hạn mức giáo viên theo gói', '/truong/giao-vien', [
    { ten: 'Bảng giáo viên', rect: [364, 364, 1512, 192] },
    { ten: 'Hạn mức giáo viên theo gói', rect: [363, 175, 450, 40] },
  ]);

  await buoc('16', async () => {
    // Trang chọn gói liệt kê các gói; thêm tab Gói và hạn mức của trang Trường và gói
    await page.goto(`${QUAN_TRI}/truong/chon-goi`);
    await choTai(page, 'Nâng cao');
    await chup(page, '16-goi.png', 'Quản trị trường: chọn gói dịch vụ và thanh toán VNPay (gói Cơ bản, Nâng cao)', '/truong/chon-goi', [
    { ten: 'Hai thẻ gói Cơ bản và Nâng cao', rect: [363, 408, 1514, 382] },
  ]);
    await page.goto(`${QUAN_TRI}/truong/thong-tin?tab=goi-va-han-muc`);
    await choTai(page, 'Gói hiện tại');
    await chup(page, '16b-goi-va-han-muc.png', 'Quản trị trường: gói hiện tại và hạn mức giáo viên, lượt AI', '/truong/thong-tin?tab=goi-va-han-muc', [
    { ten: 'Gói đang dùng và hạn mức', rect: [363, 348, 1514, 598] },
    { ten: 'Hạn mức giáo viên và lượt AI', rect: [396, 635, 1448, 105] },
  ]);
  });
  await ctx.close();
});

// ---------- giáo viên ----------
let ctxGv;
let gv;
async function khoiTaoGiaoVien() {
  ctxGv = await taoNgucCanh();
  gv = await ctxGv.newPage();
  try {
    await dangNhapQuanTri(gv, 'giaoVien');
  } catch (e) {
    console.log('Khong dang nhap duoc giao vien', e.message);
  }
}
await khoiTaoGiaoVien();

await buoc('02', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/lop`);
  await choTai(gv, '8A1');
  await chup(gv, '02-lop-hoc.png', 'Giáo viên: danh sách lớp (3A cấp 1, 8A1 cấp 2), sĩ số, số bài học', '/giao-vien/lop', [
    { ten: 'Bảng lớp học', rect: [364, 689, 1512, 211] },
  ]);
});

await buoc('03', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/lop/1`);
  await choTai(gv, 'Nguyễn Minh Khang');
  await chup(gv, '03-chi-tiet-lop.png', 'Giáo viên: chi tiết lớp 3A với danh sách 8 học sinh, mã học sinh, trạng thái', '/giao-vien/lop/1', [
    { ten: 'Danh sách học sinh', rect: [364, 613, 1512, 587] },
  ]);
  // Các tab thống kê của lớp (chỉ xem)
  for (const [tab, tep, moTa, cacVung] of [
    ['Thành thạo', '03b-thanh-thao-lop.png', 'Giáo viên: bảng nhiệt mức thành thạo của lớp 3A theo di sản', [{ ten: 'Bảng nhiệt tỉ lệ trả lời đúng theo di sản', rect: [363, 548, 1514, 652] }]],
    ['Gợi ý ôn tập', '03c-goi-y-on-tap.png', 'Giáo viên: gợi ý ôn tập cho lớp 3A', []],
  ]) {
    try {
      await gv.getByRole('tab', { name: tab }).click();
      await gv.waitForTimeout(1500);
      await choTai(gv);
      await chup(gv, tep, moTa, `/giao-vien/lop/1 (tab ${tab})`, cacVung);
    } catch (e) {
      thieu[tep] = String(e.message).split('\n')[0];
    }
  }
});

await buoc('04', async () => {
  // Phiếu đăng nhập chỉ hiện sau khi đặt lại mật khẩu. Để không đổi mật khẩu thật, chặn yêu cầu đặt lại ở trình duyệt
  // và trả về phiếu mẫu (mật khẩu tạm giả, bị làm mờ); máy chủ và CSDL không nhận yêu cầu nào.
  await gv.route('**/teacher/classes/*/students/reset-password', async (route) => {
    const phieu = (ten, ma) => ({ studentId: 0, fullName: ten, className: '3A', studentCode: ma, temporaryPassword: 'Mau12345' });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Đã đặt lại mật khẩu.',
        data: {
          className: '3A',
          loginUrl: `${HOC_TAP}/dang-nhap`,
          appDownloadUrl: null,
          instructions: [
            `Mở trang học tập: ${HOC_TAP}/dang-nhap`,
            'Hoặc cài ứng dụng Vietnam Heritage trên điện thoại, mở ứng dụng và chọn chế độ "Học sinh" (không chọn "Khách tham quan").',
            'Đăng nhập bằng mã học sinh và mật khẩu tạm ghi trên phiếu.',
          ],
          firstLoginReminder: 'Em sẽ phải đổi mật khẩu ở lần đăng nhập đầu tiên.',
          notice:
            'Mật khẩu tạm chỉ hiện một lần. Hãy in hoặc tải phiếu đăng nhập trước khi rời trang; nếu mất phiếu, dùng "Đặt lại mật khẩu".',
          entries: [phieu('Nguyễn Minh Khang', 'HSSPPWL4'), phieu('Trần Gia Hân', 'HS3JML8S')],
        },
      }),
    });
  });
  try {
    await gv.goto(`${QUAN_TRI}/giao-vien/lop/1`);
    await choTai(gv, 'Nguyễn Minh Khang');
    const hang = (ten) => gv.locator('tr', { hasText: ten }).first();
    await hang('Nguyễn Minh Khang').locator('input[type=checkbox]').check();
    await hang('Trần Gia Hân').locator('input[type=checkbox]').check();
    await gv.getByRole('button', { name: 'Đặt lại mật khẩu' }).first().click();
    await gv.getByRole('dialog').getByRole('button', { name: 'Đặt lại mật khẩu' }).click();
    await gv.getByText('PHIẾU ĐĂNG NHẬP').first().waitFor({ timeout: 8000 });
    await gv.waitForTimeout(500);
    await lamMo(gv, '.dsv-slip dl > div:nth-child(2) dd');
    await chup(gv, '04-phieu-dang-nhap.png', 'Giáo viên: hộp thoại Phiếu đăng nhập của học sinh (in phiếu, tải PDF); mật khẩu tạm làm mờ, phiếu mẫu', '/giao-vien/lop/1 (hộp thoại phiếu đăng nhập)', [
      { ten: 'Phiếu đăng nhập đầu tiên', locator: gv.locator('.dsv-slip').first() },
      { ten: 'Nút In phiếu và Tải PDF', locator: gv.getByRole('button', { name: 'In phiếu' }) },
    ]);
  } finally {
    await gv.unroute('**/teacher/classes/*/students/reset-password');
  }
});

await buoc('05', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/bai-hoc/1`);
  await choTai(gv, 'Các bước câu chuyện');
  // Phần đầu trang soạn bị co hẹp ở khổ 1440 (tiêu đề xuống dòng từng chữ), nên cuộn tới phần Thông tin bài học
  await cuonToi(gv, gv.getByText('Thông tin bài học').first());
  await gv.evaluate(() => window.scrollBy(0, 70));
  await gv.waitForTimeout(300);
  await chup(gv, '05-soan-bai-hoc.png', 'Giáo viên: trình soạn bài học Hoàng thành Thăng Long (lớp 3A, cấp 1): thông tin bài, mã bài học, khối nội dung do AI soạn theo cấp', '/giao-vien/bai-hoc/1', [
    { ten: 'Thẻ Mã bài học', rect: [1451, 0, 426, 390] },
    { ten: 'Khối nội dung do AI soạn theo cấp', rect: [363, 575, 1056, 625] },
  ]);
  const khoi = gv.getByText('Nội dung bài theo cấp').first();
  await cuonToi(gv, khoi);
  await chup(gv, '06-nho-ai-soan.png', 'Giáo viên: khối Nội dung bài theo cấp, AI soạn theo độ dài, lượt AI còn lại của trường (không bấm Tạo lại)', '/giao-vien/bai-hoc/1 (khối AI soạn)', [
    { ten: 'Khối chọn độ dài, Tạo lại và lượt AI', rect: [391, 278, 1000, 248] },
    { ten: 'Khối nội dung do AI soạn theo cấp', rect: [363, 92, 1056, 1108] },
  ]);
  const cacBuoc = gv.getByText('Các bước câu chuyện').first();
  await cuonToi(gv, cacBuoc);
  await chup(gv, '05b-cac-buoc-cau-chuyen.png', 'Giáo viên: các bước câu chuyện, hình có ghi nguồn giấy phép', '/giao-vien/bai-hoc/1 (các bước)', [
    { ten: 'Các bước câu chuyện', locator: cacBuoc },
  ]);
});

await buoc('07', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/cau-hoi`);
  await choTai(gv, 'Câu hỏi trong ngân hàng');
  await chup(gv, '07-ngan-hang-cau-hoi.png', 'Giáo viên: ngân hàng câu hỏi dùng chung, lọc theo dạng câu, cấp, độ khó, nguồn', '/giao-vien/cau-hoi', [
    { ten: 'Bộ lọc dạng câu, cấp, độ khó, nguồn', rect: [363, 369, 1210, 95] },
    { ten: 'Nút Sinh câu bằng AI', rect: [1440, 187, 436, 53] },
    { ten: 'Bảng câu hỏi', rect: [364, 691, 1512, 509] },
  ]);
});

await buoc('08', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/bai-hoc/1/sinh-cau-hoi`);
  await choTai(gv, 'Sinh và duyệt câu hỏi bằng AI');
  await chup(gv, '08-duyet-cau-ai.png', 'Giáo viên: trang Sinh và duyệt câu hỏi bằng AI đang mở (chưa có câu chờ duyệt; không bấm Sinh câu hỏi)', '/giao-vien/bai-hoc/1/sinh-cau-hoi', [
    { ten: 'Biểu mẫu sinh câu hỏi bằng AI', rect: [363, 315, 988, 442] },
    { ten: 'Lượt AI của trường', rect: [1383, 315, 494, 442] },
  ]);
});

await buoc('09', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/kiem-tra/1`);
  await choTai(gv, 'Danh sách câu hỏi');
  await chup(gv, '09-soan-bai-kiem-tra.png', 'Giáo viên: chi tiết bài kiểm tra đã phát hành, thông tin chung và số em đã nộp', '/giao-vien/kiem-tra/1', [
    { ten: 'Trạng thái và số em đã nộp', rect: [363, 329, 1514, 87] },
    { ten: 'Thông tin chung', rect: [363, 571, 1514, 629] },
  ]);
  const ds = gv.getByText('Danh sách câu hỏi').first();
  await cuonToi(gv, ds);
  await chup(gv, '09b-danh-sach-cau-hoi.png', 'Giáo viên: danh sách câu hỏi của bài kiểm tra, dạng câu và điểm', '/giao-vien/kiem-tra/1 (danh sách câu)', [
    { ten: 'Bảng câu hỏi', rect: [397, 632, 1445, 519] },
  ]);
});

await buoc('10', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/bai-hoc`);
  await choTai(gv, 'BH8XY4SS');
  await chup(gv, '10-ma-bai-hoc.png', 'Giáo viên: danh sách bài học đã xuất bản, cột Mã bài học và số bài kiểm tra', '/giao-vien/bai-hoc', [
    { ten: 'Cột mã bài học', rect: [1050, 423, 130, 355] },
    { ten: 'Bảng bài học', rect: [364, 364, 1512, 414] },
  ]);
  // Hộp thoại mã bài học (chỉ xem rồi đóng)
  try {
    await gv.getByRole('button', { name: /^Mã bài học/ }).first().click();
    await gv.getByRole('dialog').waitFor({ timeout: 5000 });
    await gv.waitForTimeout(500);
    await chup(gv, '10b-hop-thoai-ma-bai-hoc.png', 'Giáo viên: hộp thoại Mã bài học để chia sẻ cho học sinh', '/giao-vien/bai-hoc (hộp thoại mã)', [
      { ten: 'Hộp thoại mã bài học', locator: gv.getByRole('dialog') },
    ]);
    await gv.keyboard.press('Escape');
  } catch (e) {
    thieu['10b-hop-thoai-ma-bai-hoc.png'] = String(e.message).split('\n')[0];
  }
});

await buoc('14', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/kiem-tra/1/ket-qua`);
  await choTai(gv, 'Phổ điểm');
  await gv.waitForTimeout(800);
  await chup(gv, '14-ket-qua-lop.png', 'Giáo viên: kết quả bài kiểm tra của lớp 3A, điểm trung bình, cao nhất, thấp nhất, phổ điểm', '/giao-vien/kiem-tra/1/ket-qua', [
    { ten: 'Các số liệu tổng quan', rect: [363, 460, 1514, 200] },
    { ten: 'Phổ điểm', rect: [363, 754, 1514, 446] },
  ]);
  for (const [tab, tep, moTa, cacVung] of [
    ['Từng câu', '14b-ket-qua-tung-cau.png', 'Giáo viên: kết quả từng câu của bài kiểm tra', []],
    ['Từng học sinh', '14c-ket-qua-tung-hoc-sinh.png', 'Giáo viên: kết quả từng học sinh', []],
    ['Gợi ý', '14d-goi-y-sau-kiem-tra.png', 'Giáo viên: gợi ý ôn tập sau bài kiểm tra: di sản nên ôn, di sản liên quan, nút Tạo bài ôn tập (không bấm)', [{ ten: 'Di sản nên ôn và di sản liên quan', rect: [363, 645, 1514, 555] }]],
  ]) {
    try {
      await gv.getByRole('tab', { name: tab }).click();
      await gv.waitForTimeout(1500);
      await choTai(gv);
      await chup(gv, tep, moTa, `/giao-vien/kiem-tra/1/ket-qua (tab ${tab})`, cacVung);
    } catch (e) {
      thieu[tep] = String(e.message).split('\n')[0];
    }
  }
});

await buoc('15', async () => {
  await gv.goto(`${QUAN_TRI}/giao-vien/lop/1/hoc-sinh/1`);
  await choTai(gv, 'Hồ sơ học tập của học sinh');
  await gv.getByText('Điểm theo thời gian').first().waitFor({ timeout: 10000 });
  await gv.waitForTimeout(800);
  await chup(gv, '15-ho-so-hoc-sinh.png', 'Giáo viên: hồ sơ học tập của một học sinh, điểm trung bình, huy hiệu, điểm theo thời gian, lịch sử làm bài', '/giao-vien/lop/1/hoc-sinh/1', [
    { ten: 'Chỉ số học tập', rect: [363, 296, 1514, 172] },
    { ten: 'Điểm theo thời gian', rect: [363, 500, 1514, 640] },
  ]);
});
await ctxGv.close().catch(() => {});

// ---------- học sinh các cấp ----------
// Vùng đáng phóng to theo cấp (px ảnh): [trang chủ, trang bài học]
const VUNG_CAP = {
  cap1: [
    ['Lời chào và nút Nhập mã bài học', [387, 123, 1146, 312]],
    ['Hình lớn và đoạn truyện một bước', [320, 380, 1280, 820]],
  ],
  cap2: [
    ['Nội dung trang học của em', [160, 100, 1600, 900]],
    ['Ảnh bìa, tên bài, thẻ bài kiểm tra của bài', [0, 75, 1920, 300]],
  ],
  cap3: [
    ['Mục lục và thông tin lớp', [160, 123, 1600, 720]],
    ['Mục lục bên trái và nội dung chính', [160, 123, 1600, 1000]],
  ],
};
for (const [cap, tep, ten] of [
  ['cap1', '11-cap-1', 'cấp 1'],
  ['cap2', '12-cap-2', 'cấp 2'],
  ['cap3', '13-cap-3', 'cấp 3'],
]) {
  await buoc(tep.slice(0, 2), async () => {
    const tk = TK.hocSinh[cap];
    const ctx = await taoNgucCanh();
    const page = await ctx.newPage();
    try {
      await dangNhapHocSinh(page, tk);
      if (page.url().includes('/doi-mat-khau')) throw new Error('Tài khoản bị buộc đổi mật khẩu lần đầu, bỏ qua');
      await choTai(page);
      await page.goto(`${HOC_TAP}/hoc`);
      await choTai(page);
      await chup(page, `${tep}-trang-chu.png`, `Web học tập: trang học của em, giao diện ${ten}`, '/hoc', [
        { ten: VUNG_CAP[cap][0][0], rect: VUNG_CAP[cap][0][1] },
      ]);
      await page.goto(`${HOC_TAP}/bai-hoc/${tk.baiHoc}`);
      await choTai(page);
      await page.waitForTimeout(800);
      await chup(page, `${tep}.png`, `Web học tập: trang học của một bài học, giao diện ${ten}`, '/bai-hoc/{mã bài học}', [
        { ten: VUNG_CAP[cap][1][0], rect: VUNG_CAP[cap][1][1] },
      ]);
    } finally {
      await ctx.close();
    }
  });
}

await trinhDuyet.close().catch(() => {});

fs.writeFileSync(
  tepDanhSach,
  JSON.stringify({ taoLuc: new Date().toISOString(), anh: danhSach, thieu }, null, 2) + '\n',
);
console.log('Xong. Thieu:', Object.keys(thieu).length ? thieu : 'khong');
