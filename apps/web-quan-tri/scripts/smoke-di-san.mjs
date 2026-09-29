#!/usr/bin/env node
// Kiểm thử luồng Kho di sản của web quản trị trên trình duyệt thật với API thật: Quản lý di sản, Biên tập di sản (bốn
// tab), Biểu mẫu giai đoạn và sự kiện, xuất bản – ẩn – hiện lại – xóa.
// Cần: API đang chạy trên CSDL tạm (đã nạp 20 di sản đợt 1 ở trạng thái Nháp), `npm run dev:quan-tri` đang chạy và
// trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Không ghi vào database dùng chung: chỉ chạy với database tạm.
//
//   ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:di-san -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   BASE_URL           mặc định http://localhost:5173
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
if (!ADMIN_PASSWORD) {
  console.error('Cần ADMIN_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const name = `Đền thử nghiệm Kho di sản ${stamp}`;
const results = [];
const pageErrors = [];
const badResponses = [];

function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN' });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('response', (r) => {
  const url = r.url();
  if (url.includes('/api/v1/') && r.status() >= 500) badResponses.push(`${r.status()} ${url}`);
});

const shot = (label) => page.screenshot({ path: resolve(SHOTS, `di-san-${label}.png`), fullPage: true });
const click = (label) => page.getByRole('button', { name: label, exact: true }).click();
const path = () => new URL(page.url()).pathname;
const fieldErrors = () => page.locator('p.text-danger').allTextContents();
const toast = (text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 8000 });

/** Nội dung tóm lược đủ số từ tối thiểu để xuất bản. */
const content = Array.from({ length: 60 }, (_, i) => `Câu số ${i + 1} tóm lược lại từ nguồn Cục Di sản văn hóa về ngôi đền.`).join(' ');

try {
  // ---- Đăng nhập
  await page.goto(`${BASE}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await click('Đăng nhập');
  await page.waitForURL(/\/quan-tri/);
  check('Đăng nhập quản trị hệ thống', path().startsWith('/quan-tri'));

  // ---- Quản lý di sản
  await page.getByRole('link', { name: 'Di sản', exact: true }).first().click();
  await page.waitForURL(`${BASE}/quan-tri/di-san`);
  await page.getByRole('heading', { level: 1, name: 'Di sản' }).waitFor();
  const table = page.getByRole('table', { name: 'Danh sách di sản' });
  await table.waitFor();
  const rows = await table.locator('tbody tr').count();
  check('Thanh bên → "Di sản" → bảng 20 di sản đợt 1', rows === 20, `${rows} dòng`);
  check('Di sản đợt 1 mới nạp ở trạng thái Nháp', (await table.getByText('Nháp', { exact: true }).count()) === 20);
  await shot('01-quan-ly-di-san');

  await page.getByLabel('Tìm theo tên di sản').fill('thang long');
  await click('Tìm');
  await page.waitForURL(/tu-khoa=thang\+long/);
  await page.waitForFunction(() => document.querySelectorAll('table tbody tr').length < 20);
  const found = await table.locator('tbody tr').allTextContents();
  check('Tìm "thang long" (không dấu) ra Hoàng thành Thăng Long', found.length >= 1 && found.some((t) => t.includes('Thăng Long')), `${found.length} dòng`);
  await page.getByLabel('Loại', { exact: true }).selectOption({ label: 'Phi vật thể' });
  await page.waitForURL(/loai=phi-vat-the/);
  check('Lọc theo loại ghi lên URL', page.url().includes('loai=phi-vat-the'));
  await page.goto(`${BASE}/quan-tri/di-san?trang-thai=da-xuat-ban`);
  await page.getByText('Không tìm thấy kết quả phù hợp.', { exact: false }).waitFor();
  check('Lọc "Đã xuất bản" khi chưa có di sản nào xuất bản → câu không có kết quả', true);
  await page.getByRole('button', { name: 'Bỏ bộ lọc' }).click();
  await table.waitFor();

  // ---- Tạo di sản
  await page.getByRole('link', { name: 'Tạo di sản' }).first().click();
  await page.waitForURL(`${BASE}/quan-tri/di-san/moi`);
  await click('Lưu nháp');
  check('Tạo di sản để trống → báo bắt buộc nhập tên', (await fieldErrors()).includes('Vui lòng nhập tên di sản.'), (await fieldErrors()).join(' | '));
  await page.getByLabel('Tên', { exact: true }).fill(name);
  const slug = await page.getByLabel('Đường dẫn').inputValue();
  check('Đường dẫn tự sinh từ tên (không dấu, chữ thường)', slug.startsWith('den-thu-nghiem-kho-di-san-'), slug);
  await page.getByLabel('Vĩ độ').fill('40');
  await page.getByLabel('Kinh độ').fill('107');
  await click('Lưu nháp');
  check('Tọa độ ngoài Việt Nam bị chặn ngay ở máy khách', (await fieldErrors()).some((t) => t.startsWith('Vĩ độ không hợp lệ')), (await fieldErrors()).join(' | '));
  await page.getByLabel('Vĩ độ').fill('16,4637');
  await page.getByLabel('Kinh độ').fill('107,5909');
  await click('Lưu nháp');
  await page.waitForURL(/\/quan-tri\/di-san\/\d+$/);
  const id = path().split('/').pop();
  await page.getByRole('heading', { level: 1, name }).waitFor();
  check('Lưu nháp tạo di sản Nháp rồi chuyển sang trang sửa', true, `id ${id}`);
  await shot('02-da-tao');

  // ---- Thông tin chung
  await page.getByLabel('Mô tả ngắn').fill('Ngôi đền thử nghiệm dùng để kiểm tra luồng Kho di sản.');
  await page.getByLabel('Nội dung tóm lược').fill(content);
  await page.getByLabel('Loại', { exact: true }).selectOption({ label: 'Vật thể' });
  await page.getByLabel('Cấp xếp hạng').selectOption({ label: 'Cấp tỉnh' });
  await page.getByLabel('Năm công nhận').fill('2020');
  await page.getByLabel('Tỉnh, thành phố').selectOption({ label: 'Thành phố Huế' });
  await page.getByLabel('Địa chỉ').fill('Phường Phú Xuân, Thành phố Huế');
  await click('Lưu nháp');
  await toast('Lưu di sản thành công.');
  check('Lưu thông tin chung (loại, cấp, tỉnh, tọa độ, nội dung)', true);

  await click('Xuất bản');
  const alert = page.getByRole('alert').first();
  await alert.waitFor();
  const alertText = (await alert.textContent()) ?? '';
  check('Xuất bản khi thiếu ảnh đại diện và nguồn → báo phần còn thiếu, trạng thái vẫn Nháp', alertText.includes('Chưa đủ điều kiện') && alertText.includes('nguồn tham chiếu') && (await page.getByText('Nháp', { exact: true }).first().isVisible()), alertText);
  await shot('03-chua-du-dieu-kien');

  // ---- Ảnh và media
  await page.getByRole('tab', { name: 'Ảnh và media' }).click();
  await page.getByText('Di sản chưa có ảnh nào.').waitFor();
  await click('Thêm ảnh');
  const mediaDialog = page.getByRole('dialog', { name: 'Thêm ảnh và media' });
  await mediaDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  check('Thêm ảnh để trống → báo thiếu đường dẫn và ghi công', (await mediaDialog.locator('p.text-danger').count()) === 4);
  await mediaDialog.getByLabel('Đường dẫn').fill(`https://upload.wikimedia.org/wikipedia/commons/thumb/test-${stamp}.jpg`);
  await mediaDialog.getByLabel('Chú thích').fill('Cổng đền');
  await mediaDialog.getByLabel('Tác giả').fill('Nhóm tự chụp');
  await mediaDialog.getByLabel('Giấy phép').fill('CC BY-NC 4.0');
  await mediaDialog.getByLabel('Nguồn').fill('Chuyến thực địa');
  await mediaDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await mediaDialog.getByText('Giấy phép không hợp lệ', { exact: false }).waitFor();
  check('Giấy phép hạn chế (CC BY-NC) bị từ chối', true);
  await mediaDialog.getByLabel('Giấy phép').fill('CC BY 4.0');
  await mediaDialog.getByLabel('Dùng làm ảnh đại diện của di sản').check();
  await mediaDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await toast('Thêm ảnh thành công.');
  await page.locator('li', { hasText: 'Cổng đền' }).getByText('Ảnh đại diện', { exact: true }).waitFor();
  const credit = await page.locator('li', { hasText: 'Cổng đền' }).getByText('Nhóm tự chụp · CC BY 4.0 · Chuyến thực địa').isVisible();
  check('Thêm ảnh kèm ghi công "tác giả · giấy phép · nguồn", chọn làm ảnh đại diện', credit);
  await shot('04-anh-va-media');

  // ---- Dòng thời gian
  await page.getByRole('tab', { name: 'Dòng thời gian' }).click();
  await page.getByText('Di sản chưa có giai đoạn nào.').waitFor();
  await click('Thêm giai đoạn');
  const timelineDialog = page.getByRole('dialog', { name: 'Thêm giai đoạn' });
  await timelineDialog.getByLabel('Tên').fill('Thời dựng đền');
  await timelineDialog.getByLabel('Năm bắt đầu').fill('-258');
  await timelineDialog.getByLabel('Năm kết thúc').fill('-300');
  await timelineDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await timelineDialog.getByText('Năm kết thúc không hợp lệ: không được nhỏ hơn năm bắt đầu.').waitFor();
  check('Giai đoạn: năm kết thúc nhỏ hơn năm bắt đầu bị chặn', true);
  await timelineDialog.getByLabel('Năm kết thúc').fill('100');
  await timelineDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await toast('Thêm giai đoạn thành công.');
  await click('Thêm giai đoạn');
  const second = page.getByRole('dialog', { name: 'Thêm giai đoạn' });
  await second.getByLabel('Tên').fill('Thời trùng tu');
  await second.getByLabel('Năm bắt đầu').fill('1802');
  await second.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('2 giai đoạn, 0 sự kiện.', { exact: false }).waitFor();
  check('Thêm hai giai đoạn (năm âm là trước Công nguyên)', await page.getByText('258 TCN – 100', { exact: false }).first().isVisible());

  await page.getByRole('button', { name: 'Thêm sự kiện' }).first().click();
  const eventDialog = page.getByRole('dialog', { name: 'Thêm sự kiện' });
  await eventDialog.getByLabel('Tên').fill('Khởi công dựng đền');
  await eventDialog.getByLabel('Năm bắt đầu').fill('-258');
  await eventDialog.getByLabel('Tháng bắt đầu').fill('2');
  await eventDialog.getByLabel('Ngày bắt đầu').fill('30');
  await eventDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await eventDialog.getByText('Ngày bắt đầu không hợp lệ', { exact: false }).waitFor();
  check('Sự kiện: ngày 30/2 không có thật bị chặn', true);
  await eventDialog.getByLabel('Ngày bắt đầu').fill('12');
  await eventDialog.getByRole('button', { name: 'Thêm ảnh minh họa' }).click();
  await eventDialog.getByLabel('Đường dẫn').fill(`https://upload.wikimedia.org/wikipedia/commons/thumb/su-kien-${stamp}.jpg`);
  await eventDialog.getByLabel('Tác giả').fill('Nhóm tự chụp');
  await eventDialog.getByLabel('Giấy phép').fill('Ảnh nhóm tự chụp');
  await eventDialog.getByLabel('Nguồn').fill('Chuyến thực địa');
  await eventDialog.getByRole('button', { name: 'Lưu', exact: true }).click();
  await toast('Thêm sự kiện thành công.');
  await page.getByText('Khởi công dựng đền').waitFor();
  check('Thêm sự kiện năm âm kèm ảnh minh họa có ghi công', await page.getByText('12/02/', { exact: false }).first().isVisible());

  await page.getByRole('button', { name: /Đổi thứ tự "Thời dựng đền"/ }).press('ArrowDown');
  await page.waitForFunction(() => {
    const titles = [...document.querySelectorAll('ol h3')].map((h) => h.textContent);
    return titles[0] === 'Thời trùng tu';
  });
  check('Đổi thứ tự giai đoạn bằng phím mũi tên (lưu lên máy chủ, tải lại vẫn đúng)', true);
  await page.reload();
  await page.getByText('2 giai đoạn, 1 sự kiện.', { exact: false }).waitFor();
  const firstTitle = await page.locator('ol h3').first().textContent();
  check('Sau khi tải lại, thứ tự giai đoạn đã lưu', firstTitle === 'Thời trùng tu', String(firstTitle));
  await shot('05-dong-thoi-gian');

  // ---- Nguồn tham chiếu
  await page.getByRole('tab', { name: 'Nguồn tham chiếu' }).click();
  await page.getByText('Di sản chưa có nguồn tham chiếu nào.').waitFor();
  await click('Thêm nguồn');
  const row = page.getByRole('form', { name: 'Thêm nguồn tham chiếu' });
  await row.getByLabel('Tên tài liệu').fill('Đền thử nghiệm');
  await row.getByLabel('Cơ quan hoặc tác giả').fill('Cục Di sản văn hóa');
  await row.getByLabel('Ngày truy cập').fill('26/09/2026');
  await row.getByLabel('Loại nguồn').selectOption({ label: 'Website' });
  await row.getByRole('button', { name: 'Lưu nguồn' }).click();
  await row.getByText('Vui lòng nhập đường dẫn của nguồn website.').waitFor();
  check('Nguồn website bắt buộc có đường dẫn', true);
  await row.getByLabel('Đường dẫn').fill('https://dsvh.gov.vn/den-thu-nghiem');
  await row.getByRole('button', { name: 'Lưu nguồn' }).click();
  await toast('Thêm nguồn tham chiếu thành công.');
  check('Nguồn lưu với tiêu đề theo mẫu "Tên — Cơ quan, truy cập dd/mm/yyyy"', await page.getByText('Đền thử nghiệm — Cục Di sản văn hóa, truy cập 26/09/2026').isVisible());
  await shot('06-nguon-tham-chieu');

  // ---- Xuất bản, ẩn, hiện lại
  await click('Xuất bản');
  await toast('Xuất bản di sản thành công.');
  await page.getByText('Đã xuất bản', { exact: true }).first().waitFor();
  check('Xuất bản khi đủ điều kiện → Đã xuất bản, nút đổi thành Lưu và Ẩn', (await page.getByRole('button', { name: 'Ẩn', exact: true }).isVisible()) && (await page.getByRole('button', { name: 'Lưu', exact: true }).isVisible()));
  await shot('07-da-xuat-ban');

  await click('Ẩn');
  const hide = page.getByRole('dialog', { name: 'Ẩn di sản' });
  await hide.getByText(`Bạn có chắc muốn ẩn di sản "${name}"?`).waitFor();
  await hide.getByRole('button', { name: 'Ẩn di sản' }).click();
  await page.getByText('Đã ẩn', { exact: true }).first().waitFor();
  check('Ẩn di sản qua hộp xác nhận → Đã ẩn, nút Hiện lại', await page.getByRole('button', { name: 'Hiện lại', exact: true }).isVisible());
  await click('Hiện lại');
  await page.getByText('Đã xuất bản', { exact: true }).first().waitFor();
  check('Hiện lại → Đã xuất bản', true);

  // ---- Danh sách: tìm, ẩn, xóa
  await page.goto(`${BASE}/quan-tri/di-san?tu-khoa=${encodeURIComponent(name)}`);
  const list = page.getByRole('table', { name: 'Danh sách di sản' });
  await list.getByRole('link', { name, exact: true }).waitFor();
  const cells = (await list.locator('tbody tr').first().textContent()) ?? '';
  check('Danh sách: di sản vừa tạo có tỉnh, loại, cấp, trạng thái, số giai đoạn 2, số nguồn 1', cells.includes('Thành phố Huế') && cells.includes('Vật thể') && cells.includes('Cấp tỉnh') && cells.includes('Đã xuất bản'), cells);
  await shot('08-danh-sach-sau-khi-tao');
  await page.getByRole('button', { name: `Ẩn di sản ${name}` }).click();
  await page.getByRole('dialog', { name: 'Ẩn di sản' }).getByRole('button', { name: 'Ẩn di sản' }).click();
  await page.getByRole('button', { name: `Hiện lại di sản ${name}` }).waitFor();
  await page.getByRole('button', { name: `Xóa di sản ${name}` }).click();
  await page.getByRole('dialog', { name: 'Xóa di sản' }).getByRole('button', { name: 'Xóa di sản' }).click();
  await page.getByText('Không tìm thấy kết quả phù hợp.', { exact: false }).waitFor();
  check('Ẩn rồi xóa di sản từ danh sách → biến khỏi danh sách', true);

  // ---- Sửa một di sản đợt 1 (nội dung thật)
  await page.goto(`${BASE}/quan-tri/di-san?tu-khoa=thang+long`);
  await page.getByRole('table', { name: 'Danh sách di sản' }).getByRole('link').first().click();
  await page.waitForURL(/\/quan-tri\/di-san\/\d+$/);
  await page.getByLabel('Nội dung tóm lược').waitFor();
  const words = (await page.getByLabel('Nội dung tóm lược').inputValue()).split(/\s+/).length;
  check('Mở di sản đợt 1: có nội dung, tỉnh, loại từ dữ liệu nạp', words > 50 && (await page.getByLabel('Loại', { exact: true }).inputValue()) !== '', `${words} từ`);
  await page.getByRole('tab', { name: 'Dòng thời gian' }).click();
  const summary = page.getByText(/\d+ giai đoạn, \d+ sự kiện\./);
  await summary.waitFor();
  check('Di sản đợt 1 có giai đoạn và sự kiện', /[1-9]\d* giai đoạn, [1-9]\d* sự kiện/.test((await summary.textContent()) ?? ''), (await summary.textContent()) ?? '');
  await page.getByRole('tab', { name: 'Nguồn tham chiếu' }).click();
  await page.getByText(/\d+ nguồn tham chiếu\./).waitFor();
  check('Di sản đợt 1 có nguồn tham chiếu', (await page.locator('table tbody tr').count()) > 0);
  await shot('09-di-san-dot-1');
  await click('Xuất bản');
  await toast('Xuất bản di sản thành công.').catch(() => {});
  const published = await page.getByText('Đã xuất bản', { exact: true }).first().isVisible().catch(() => false);
  check('Di sản đợt 1 đủ điều kiện nên xuất bản được', published);
} catch (error) {
  check('Kịch bản chạy hết không ngoại lệ', false, String(error));
  await shot('loi').catch(() => {});
}

check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.join(' | '));
check('Không có phản hồi 5xx từ API', badResponses.length === 0, badResponses.join(' | '));
await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} bước đạt.`);
process.exit(failed.length === 0 ? 0 : 1);
