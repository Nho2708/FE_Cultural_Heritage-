#!/usr/bin/env node
// Kiểm thử tải ảnh lên và chọn tọa độ trên bản đồ của web quản trị, trên trình duyệt thật với API thật: tạo di sản, chọn tọa độ
// bằng bản đồ (bấm, kéo ghim, bấm ngoài lãnh thổ), tải ảnh từ máy (tệp sai định dạng, tệp giả ảnh, tệp quá 5 MB bị từ chối; ảnh
// JPG hợp lệ được lưu, bỏ EXIF, có ảnh thu nhỏ), chọn làm ảnh đại diện, xuất bản và mở trang công khai.
// Cần: API (nhánh có tải tệp) đang chạy trên CSDL tạm với Email__Mode=Log và Storage__Local__RootPath trỏ thư mục tạm,
// `npm run dev:quan-tri` đang chạy và trỏ tới API đó, Edge hoặc Chrome đã cài trên máy. Không chạy trên database dùng chung.
// Có thêm web học tập đang chạy (cổng 5174) thì kiểm cả ảnh trên trang công khai.
//
//   ADMIN_PASSWORD=<Seed:AdminPassword> ANH_JPG=<đường dẫn tệp .jpg có EXIF> npm run smoke:tai-anh -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   BASE_URL           mặc định http://localhost:5173
//   PUBLIC_URL         mặc định http://localhost:5174 (web học tập, không bắt buộc)
//   API_URL            mặc định http://localhost:5080
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   ANH_JPG            BẮT BUỘC — một tệp JPG thật (nên có dữ liệu EXIF) dưới 5 MB
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const PUBLIC = (process.env.PUBLIC_URL ?? 'http://localhost:5174').replace(/\/+$/, '');
const API = (process.env.API_URL ?? 'http://localhost:5080').replace(/\/+$/, '');
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ANH_JPG = process.env.ANH_JPG;
if (!ADMIN_PASSWORD || !ANH_JPG) {
  console.error('Cần ADMIN_PASSWORD và ANH_JPG (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

// Tệp thử: văn bản, "ảnh" thật ra là chương trình, ảnh quá 5 MB.
const work = mkdtempSync(join(tmpdir(), 'dsvhvn-tai-anh-'));
const textFile = join(work, 'ghi-chu.txt');
const fakeJpg = join(work, 'chuong-trinh.jpg');
const bigPng = join(work, 'anh-qua-lon.png');
writeFileSync(textFile, 'đây không phải ảnh');
writeFileSync(fakeJpg, Buffer.concat([Buffer.from('MZ\x90\x00'), Buffer.alloc(2000)]));
writeFileSync(bigPng, Buffer.alloc(6 * 1024 * 1024, 1));

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const name = `Đền thử tải ảnh ${stamp}`;
const results = [];
const pageErrors = [];
const badResponses = [];

function check(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${label}${detail ? ` — ${detail}` : ''}`);
}

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'vi-VN' });
page.on('pageerror', (e) => pageErrors.push(String(e)));
page.on('response', (r) => {
  if (r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
});

const shot = (label) => page.screenshot({ path: resolve(SHOTS, `tai-anh-${label}.png`), fullPage: true });
const click = (label) => page.getByRole('button', { name: label, exact: true }).click();
const toast = (text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 10000 });
const content = Array.from({ length: 60 }, (_, i) => `Câu số ${i + 1} tóm lược lại từ nguồn Cục Di sản văn hóa về ngôi đền.`).join(' ');
const coords = async () => ({
  lat: Number((await page.getByLabel('Vĩ độ').inputValue()).replace(',', '.')),
  lng: Number((await page.getByLabel('Kinh độ').inputValue()).replace(',', '.')),
});
const mapBox = async () => {
  const box = await page.locator('.leaflet-container').boundingBox();
  if (!box) throw new Error('Không thấy bản đồ');
  return box;
};

try {
  await page.goto(`${BASE}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await click('Đăng nhập');
  await page.waitForURL(/\/quan-tri/);
  check('Đăng nhập quản trị hệ thống', true);

  // ---- Tạo di sản
  await page.goto(`${BASE}/quan-tri/di-san/moi`);
  await page.getByLabel('Tên', { exact: true }).fill(name);
  await page.getByLabel('Mô tả ngắn').fill('Ngôi đền thử nghiệm dùng để kiểm tra tải ảnh và chọn tọa độ.');
  await page.getByLabel('Nội dung tóm lược').fill(content);
  await page.getByLabel('Loại', { exact: true }).selectOption({ label: 'Vật thể' });
  await page.getByLabel('Cấp xếp hạng').selectOption({ label: 'Cấp tỉnh' });
  await page.getByLabel('Năm công nhận').fill('2020');
  await page.getByLabel('Tỉnh, thành phố').selectOption({ label: 'Thành phố Huế' });
  await click('Lưu nháp');
  await page.waitForURL(/\/quan-tri\/di-san\/\d+$/);
  const id = new URL(page.url()).pathname.split('/').pop();
  const slug = await page.getByLabel('Đường dẫn').inputValue();
  check('Tạo di sản nháp chưa có tọa độ', true, `id ${id}`);

  // ---- Chọn tọa độ trên bản đồ
  await page.locator('.leaflet-container').waitFor();
  await page.locator('.leaflet-control-attribution').waitFor();
  const mapText = (await page.locator('.leaflet-container').textContent()) ?? '';
  check('Bản đồ OpenStreetMap có ghi công và nhãn hai quần đảo thuộc Việt Nam',
    mapText.includes('Những người đóng góp OpenStreetMap') && mapText.includes('Quần đảo Hoàng Sa (Việt Nam)') && mapText.includes('Quần đảo Trường Sa (Việt Nam)'));
  check('Chưa có tọa độ thì chưa có ghim', (await page.locator('.dsv-pin--selected').count()) === 0);
  await page.waitForTimeout(1500); // đợi ô bản đồ tải xong để ảnh chụp có nền
  await shot('01-ban-do-chua-chon');

  const box = await mapBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await page.locator('.dsv-pin--selected').waitFor();
  const first = await coords();
  check('Bấm lên bản đồ điền hai ô vĩ độ, kinh độ trong lãnh thổ Việt Nam và đặt ghim',
    first.lat >= 8 && first.lat <= 23.5 && first.lng >= 102 && first.lng <= 117.5, `${first.lat}, ${first.lng}`);

  const pin = await page.locator('.dsv-pin--selected').boundingBox();
  await page.mouse.move(pin.x + pin.width / 2, pin.y + pin.height / 2);
  await page.mouse.down();
  await page.mouse.move(pin.x + pin.width / 2 + 40, pin.y + pin.height / 2 + 30, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction(([la, ln]) => {
    const lat = Number(document.querySelector('input[name=latitude]').value.replace(',', '.'));
    const lng = Number(document.querySelector('input[name=longitude]').value.replace(',', '.'));
    return lat !== la || lng !== ln;
  }, [first.lat, first.lng]);
  const dragged = await coords();
  check('Kéo ghim đổi tọa độ trong hai ô số', dragged.lat < first.lat && dragged.lng > first.lng, `${dragged.lat}, ${dragged.lng}`);

  await page.getByLabel('Vĩ độ').fill('16,4637');
  await page.getByLabel('Kinh độ').fill('107,5909');
  await page.waitForTimeout(600);
  const typedPin = await page.locator('.dsv-pin--selected').boundingBox();
  const area = await mapBox();
  check('Nhập số vào ô thì bản đồ dời ghim tới đó (ghim nằm trong khung bản đồ)',
    typedPin.x > area.x && typedPin.x < area.x + area.width && typedPin.y > area.y && typedPin.y < area.y + area.height);

  // Thu nhỏ bản đồ tới mức xa nhất để góc bản đồ nằm ngoài lãnh thổ Việt Nam, rồi bấm vào góc.
  const zoomOut = page.locator('.leaflet-control-zoom-out');
  for (let i = 0; i < 8 && !((await zoomOut.getAttribute('class')) ?? '').includes('leaflet-disabled'); i += 1) await zoomOut.click();
  await page.waitForTimeout(700);
  await page.mouse.click(area.x + 8, area.y + 8);
  const notice = await page.getByRole('alert').filter({ hasText: 'ngoài lãnh thổ Việt Nam' }).first().isVisible().catch(() => false);
  check('Bấm ra ngoài lãnh thổ thì báo và giữ nguyên tọa độ', notice && (await coords()).lat === 16.4637);

  await click('Lưu nháp');
  await toast('Lưu di sản thành công.');
  await page.reload();
  await page.locator('.dsv-pin--selected').waitFor();
  const saved = await coords();
  check('Lưu rồi tải lại: tọa độ còn nguyên và ghim đặt đúng chỗ', saved.lat === 16.4637 && saved.lng === 107.5909, `${saved.lat}, ${saved.lng}`);
  await page.waitForTimeout(1500);
  await shot('02-da-chon-toa-do');

  // ---- Tải ảnh lên
  await page.getByRole('tab', { name: 'Ảnh và media' }).click();
  await page.getByText('Di sản chưa có ảnh nào.').waitFor();
  await click('Tải ảnh lên');
  const dialog = page.getByRole('dialog', { name: 'Tải ảnh lên' });
  const fileInput = dialog.locator('input[type=file]');

  await dialog.getByRole('button', { name: 'Tải lên', exact: true }).click();
  check('Tải lên khi chưa chọn tệp và chưa ghi công → báo từng ô', (await dialog.locator('p.text-danger').count()) === 4, (await dialog.locator('p.text-danger').allTextContents()).join(' | '));

  await fileInput.setInputFiles(textFile);
  await dialog.getByText('Tệp ảnh không hợp lệ: chỉ nhận định dạng JPG, PNG hoặc WEBP.').waitFor();
  check('Tệp văn bản bị từ chối ngay khi chọn', true);

  await fileInput.setInputFiles(bigPng);
  await dialog.getByText('Tệp ảnh không hợp lệ: tối đa 5 MB, tệp này 6,0 MB.').waitFor();
  check('Ảnh quá 5 MB bị từ chối ngay khi chọn', true);

  await fileInput.setInputFiles(fakeJpg);
  await dialog.getByLabel('Chú thích').fill('Ngọ Môn');
  await dialog.getByLabel('Tác giả').fill('Nhóm sản phẩm');
  await dialog.getByLabel('Giấy phép').fill('CC BY-NC 4.0');
  await dialog.getByLabel('Nguồn').fill('Chuyến thực địa');
  await dialog.getByRole('button', { name: 'Tải lên', exact: true }).click();
  await dialog.getByText('Giấy phép không hợp lệ', { exact: false }).waitFor();
  check('Giấy phép hạn chế bị chặn trước khi gửi tệp', true);
  await dialog.getByLabel('Giấy phép').fill('Ảnh nhóm tự chụp');
  await dialog.getByRole('button', { name: 'Tải lên', exact: true }).click();
  await dialog.getByText('không phải ảnh hoặc đã bị hỏng', { exact: false }).waitFor();
  check('Tệp .jpg thật ra là chương trình bị máy chủ từ chối theo nội dung, hộp thoại giữ lại', await dialog.isVisible());
  await shot('03-tep-gia-bi-tu-choi');

  await fileInput.setInputFiles(ANH_JPG);
  const previewOk = await dialog.locator('img[alt="Ảnh xem trước"]').evaluate((img) => img.complete && img.naturalWidth > 0).catch(() => false);
  check('Chọn ảnh JPG hợp lệ → có ảnh xem trước, lỗi cũ được xóa', previewOk && (await dialog.getByText('không phải ảnh hoặc đã bị hỏng', { exact: false }).count()) === 0);
  check('Chưa có ảnh đại diện nên ô chọn làm ảnh đại diện được tick sẵn', await dialog.getByLabel('Dùng làm ảnh đại diện của di sản').isChecked());
  await shot('04-chon-anh-hop-le');
  await dialog.getByRole('button', { name: 'Tải lên', exact: true }).click();
  await toast('Tải ảnh lên thành công.');
  const row = page.locator('li', { hasText: 'Ngọ Môn' });
  await row.getByText('Ảnh đại diện', { exact: true }).waitFor();
  check('Tải ảnh lên thành công, ảnh vào thư viện kèm ghi công và là ảnh đại diện',
    await row.getByText('Nhóm sản phẩm · Ảnh nhóm tự chụp · Chuyến thực địa').isVisible());

  const thumbSrc = (await row.locator('img').getAttribute('src')) ?? '';
  check('Danh sách dùng ảnh thu nhỏ (WEBP) và ghép với địa chỉ máy chủ API', thumbSrc.startsWith(`${API}/files/images/`) && thumbSrc.endsWith('-thumb.webp'), thumbSrc);
  const thumbShown = await page
    .waitForFunction((src) => [...document.images].some((img) => img.src === src && img.complete && img.naturalWidth > 0), thumbSrc, { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  check('Ảnh thu nhỏ tải được và hiển thị', thumbShown);
  await shot('05-sau-khi-tai-anh');

  // ---- Tệp trong kho: kiểm bằng gọi thẳng, không cần đăng nhập
  const originalUrl = (await row.locator('p.type-mono-label').textContent())?.trim() ?? '';
  const fileResponse = await fetch(originalUrl.startsWith('http') ? originalUrl : `${API}${originalUrl}`);
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  const source = readFileSync(ANH_JPG);
  check('Tệp ảnh trong kho mở được không cần đăng nhập, đúng loại JPEG',
    fileResponse.status === 200 && fileResponse.headers.get('content-type') === 'image/jpeg', `${fileResponse.status} ${fileResponse.headers.get('content-type')} ${bytes.length} byte`);
  check('Ảnh gốc có dữ liệu EXIF còn ảnh lưu trong kho đã bị bỏ EXIF', source.includes(Buffer.from('Exif\0\0')) && !bytes.includes(Buffer.from('Exif\0\0')));

  // ---- Ảnh đại diện ở tab Thông tin chung
  await page.getByRole('tab', { name: 'Thông tin chung' }).click();
  await page.waitForTimeout(800);
  check('Ảnh đại diện hiện ở tab Thông tin chung', await page.locator('section img[class*="object-cover"]').first().evaluate((img) => img.complete && img.naturalWidth > 0));

  // ---- Nguồn tham chiếu, xuất bản
  await page.getByRole('tab', { name: 'Nguồn tham chiếu' }).click();
  await click('Thêm nguồn');
  const reference = page.getByRole('form', { name: 'Thêm nguồn tham chiếu' });
  await reference.getByLabel('Tên tài liệu').fill('Đền thử tải ảnh');
  await reference.getByLabel('Cơ quan hoặc tác giả').fill('Cục Di sản văn hóa');
  await reference.getByLabel('Ngày truy cập').fill('06/10/2026');
  await reference.getByLabel('Loại nguồn').selectOption({ label: 'Website' });
  await reference.getByLabel('Đường dẫn').fill('https://dsvh.gov.vn/den-thu-tai-anh');
  await reference.getByRole('button', { name: 'Lưu nguồn' }).click();
  await toast('Thêm nguồn tham chiếu thành công.');
  await click('Xuất bản');
  await toast('Xuất bản di sản thành công.');
  await page.getByText('Đã xuất bản', { exact: true }).first().waitFor();
  check('Xuất bản di sản có ảnh tải lên và tọa độ chọn trên bản đồ → Đã xuất bản', true);
  await shot('06-da-xuat-ban');

  // ---- Xóa mềm: gỡ ảnh khỏi thư viện thì tệp còn trong kho
  await page.getByRole('tab', { name: 'Ảnh và media' }).click();
  await click('Tải ảnh lên');
  const second = page.getByRole('dialog', { name: 'Tải ảnh lên' });
  await second.locator('input[type=file]').setInputFiles(ANH_JPG);
  check('Đã có ảnh đại diện thì ô chọn làm ảnh đại diện không tick sẵn', !(await second.getByLabel('Dùng làm ảnh đại diện của di sản').isChecked()));
  await second.getByLabel('Chú thích').fill('Ảnh phụ');
  await second.getByLabel('Tác giả').fill('Nhóm sản phẩm');
  await second.getByLabel('Giấy phép').fill('CC BY 4.0');
  await second.getByLabel('Nguồn').fill('Wikimedia Commons');
  await second.getByRole('button', { name: 'Tải lên', exact: true }).click();
  await toast('Tải ảnh lên thành công.');
  const extra = page.locator('li', { hasText: 'Ảnh phụ' });
  const extraUrl = (await extra.locator('p.type-mono-label').textContent())?.trim() ?? '';
  await page.getByRole('button', { name: 'Xóa Ảnh phụ' }).click();
  await page.getByRole('dialog', { name: 'Xóa ảnh' }).getByRole('button', { name: 'Xóa ảnh' }).click();
  await toast('Xóa ảnh thành công.');
  const afterDelete = await fetch(extraUrl.startsWith('http') ? extraUrl : `${API}${extraUrl}`);
  check('Xóa mềm: gỡ ảnh khỏi thư viện nhưng tệp vẫn còn trong kho', (await page.locator('li', { hasText: 'Ảnh phụ' }).count()) === 0 && afterDelete.status === 200, `${afterDelete.status}`);

  // ---- Trang công khai (web học tập), nếu đang chạy
  const publicUp = await fetch(PUBLIC).then((r) => r.ok).catch(() => false);
  if (publicUp) {
    const visitor = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'vi-VN' });
    await visitor.goto(`${PUBLIC}/di-san/${slug}`);
    await visitor.getByRole('heading', { level: 1, name }).waitFor();
    await visitor.waitForTimeout(1500);
    const shownImage = await visitor.locator('img[src*="/files/images/"]').first().evaluate((img) => img.complete && img.naturalWidth > 0).catch(() => false);
    check('Trang công khai hiện ảnh đã tải lên', shownImage);
    await visitor.screenshot({ path: resolve(SHOTS, 'tai-anh-07-trang-cong-khai.png'), fullPage: true });
    await visitor.close();
  } else {
    console.log('BỎ QUA  Trang công khai (web học tập chưa chạy ở ' + PUBLIC + ')');
  }
} catch (error) {
  check('Không gặp lỗi bất ngờ', false, error instanceof Error ? error.message : String(error));
  await shot('loi').catch(() => {});
} finally {
  await browser.close();
}

check('Không có lỗi JavaScript trên trang', pageErrors.length === 0, pageErrors.join(' | '));
check('Không có phản hồi 5xx từ máy chủ', badResponses.length === 0, badResponses.join(' | '));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} bước đạt.`);
process.exit(failed === 0 ? 0 : 1);
