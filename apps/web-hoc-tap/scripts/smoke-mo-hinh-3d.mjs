#!/usr/bin/env node
// Kiểm thử luồng Mô hình 3D di sản trên trình duyệt thật với API thật (docs/mo-hinh-3d.md): quản trị hệ thống khai báo mô hình ở tab Mô hình 3D của Biên tập di sản
// (tải tệp .glb lên, dán đường dẫn tệp đã lưu, ghi công, một mô hình đang hiển thị, hiện, ẩn, thay tệp, sửa, xem thử trong trình xem thật), cột và bộ lọc ở Quản lý di sản,
// nhật ký; khách và học sinh bấm "Xem 3D" ở chi tiết di sản (trình xem chạy WebGL thật: xoay, đặt lại góc nhìn, ghi công, năm ngôn ngữ), quay về bộ ảnh khi không có mô hình,
// tải lỗi hoặc thiết bị không hỗ trợ 3D, cảnh báo dung lượng trên mạng di động, xem trước bản nháp ở tab mới.
//
// Cần: API đang chạy trên CSDL TẠM với Email__Mode=Log (không gửi thư thật), Ai:Mode=Simulated, Storage__Provider=Local (tốt nhất trỏ Storage__Local__RootPath ra thư mục tạm),
// cả hai ứng dụng web đang chạy trỏ tới API đó (web quản trị có VITE_LEARNING_WEB_URL, web học tập có VITE_ADMIN_WEB_URL trỏ đúng nhau), Edge hoặc Chrome đã cài. Các tệp .glb thử do chính
// script dựng (một khối lập phương glTF 2.0 hợp lệ), không cần tệp ngoài. Bước chuẩn bị (xuất bản di sản, trường, giáo viên, lớp, học sinh) gọi thẳng API; việc khai báo mô hình đi qua giao diện.
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<Seed:AdminPassword> npm run smoke:mo-hinh-3d -w @dsvhvn/web-hoc-tap
//
// Biến môi trường:
//   API_URL            mặc định http://localhost:5080/api/v1
//   ADMIN_WEB          mặc định http://localhost:5173
//   LEARNING_WEB       mặc định http://localhost:5174
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của ADMIN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const ADMIN_WEB = (process.env.ADMIN_WEB ?? 'http://localhost:5173').replace(/\/+$/, '');
const LEARNING_WEB = (process.env.LEARNING_WEB ?? 'http://localhost:5174').replace(/\/+$/, '');
const API_LOG = process.env.API_LOG;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
if (!API_LOG || !ADMIN_PASSWORD) {
  console.error('Cần API_LOG và ADMIN_PASSWORD (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });
const WORK = join(tmpdir(), `dsvhvn-smoke-3d-${Date.now()}`);
mkdirSync(WORK, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const PASSWORD = 'MatKhau2026';
const STUDENT_PASSWORD = 'MatKhauCuaEm2026';
const results = [];
const pageErrors = [];
const badResponses = [];
const modelCalls = [];

function check(name, ok, detail = '') {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'ĐẠT ' : 'LỖI '}  ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---- Tệp .glb thử: một khối lập phương glTF 2.0 hợp lệ (24 đỉnh, vật liệu PBR), có thể đệm thêm byte cho nặng ----

function makeGlb(color, extraBytes = 0) {
  const faces = [
    [[0, 0, 1], [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]],
    [[0, 0, -1], [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]],
    [[1, 0, 0], [[1, -1, 1], [1, -1, -1], [1, 1, -1], [1, 1, 1]]],
    [[-1, 0, 0], [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]]],
    [[0, 1, 0], [[-1, 1, 1], [1, 1, 1], [1, 1, -1], [-1, 1, -1]]],
    [[0, -1, 0], [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]]],
  ];
  const positions = [];
  const normals = [];
  const indices = [];
  faces.forEach(([normal, corners], face) => {
    for (const corner of corners) {
      positions.push(...corner.map((v) => v * 0.5));
      normals.push(...normal);
    }
    const o = face * 4;
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const pos = Buffer.from(new Float32Array(positions).buffer);
  const nor = Buffer.from(new Float32Array(normals).buffer);
  const idx = Buffer.from(new Uint16Array(indices).buffer);
  const pad4 = (n) => (4 - (n % 4)) % 4;
  const bin = Buffer.concat([pos, nor, idx, Buffer.alloc(extraBytes)]);
  const binPadded = Buffer.concat([bin, Buffer.alloc(pad4(bin.length))]);
  // Xoay nhẹ quanh trục Y và X cho thấy ba mặt.
  const [ax, ay] = [0.3, 0.55];
  const q = [Math.sin(ax / 2) * Math.cos(ay / 2), Math.cos(ax / 2) * Math.sin(ay / 2), -Math.sin(ax / 2) * Math.sin(ay / 2), Math.cos(ax / 2) * Math.cos(ay / 2)];
  const json = {
    asset: { version: '2.0', generator: 'dsvhvn-smoke-mo-hinh-3d' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, rotation: q }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0 }] }],
    materials: [{ pbrMetallicRoughness: { baseColorFactor: [...color, 1], metallicFactor: 0.1, roughnessFactor: 0.55 } }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] },
      { bufferView: 1, componentType: 5126, count: 24, type: 'VEC3' },
      { bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR' },
    ],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 },
      { buffer: 0, byteOffset: pos.length, byteLength: nor.length, target: 34962 },
      { buffer: 0, byteOffset: pos.length + nor.length, byteLength: idx.length, target: 34963 },
    ],
    buffers: [{ byteLength: binPadded.length }],
  };
  const jsonBytes = Buffer.from(JSON.stringify(json), 'utf8');
  const jsonPadded = Buffer.concat([jsonBytes, Buffer.alloc(pad4(jsonBytes.length), 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + jsonPadded.length + 8 + binPadded.length, 8);
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(data.length, 0);
    head.writeUInt32LE(type, 4);
    return Buffer.concat([head, data]);
  };
  return Buffer.concat([header, chunk(0x4e4f534a, jsonPadded), chunk(0x004e4942, binPadded)]);
}

const glbFile = (name, color, extra = 0) => {
  const path = join(WORK, name);
  writeFileSync(path, makeGlb(color, extra));
  return path;
};
const FILE_RED = glbFile('ngo-mon.glb', [0.75, 0.15, 0.12]);
const FILE_BLUE = glbFile('ngo-mon-moi.glb', [0.15, 0.3, 0.75], 40 * 1024);
const FILE_GREEN = glbFile('van-mieu.glb', [0.2, 0.6, 0.3]);
const FILE_HEAVY = glbFile('nang.glb', [0.9, 0.7, 0.1], 6 * 1024 * 1024);
const FILE_FAKE = join(WORK, 'gia.glb');
writeFileSync(FILE_FAKE, 'Đây là văn bản đổi đuôi thành .glb, không phải mô hình 3D.');
const FILE_GLTF = join(WORK, 'nhieu-tep.gltf');
writeFileSync(FILE_GLTF, '{"asset":{"version":"2.0"}}');

// ---- Gọi API để chuẩn bị dữ liệu ----

async function call(method, path, { token, body, form } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: { ...(form ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: form ?? (body ? JSON.stringify(body) : undefined),
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

/** Tải một tệp .glb lên kho (POST /admin/files/models) và trả đường dẫn lưu. */
async function storeModelFile(token, path) {
  const form = new FormData();
  form.set('file', new Blob([readFileSync(path)], { type: 'model/gltf-binary' }), 'tep.glb');
  return call('POST', '/admin/files/models', { token, form });
}

function modelForm(path, fields) {
  const form = new FormData();
  form.set('file', new Blob([readFileSync(path)], { type: 'model/gltf-binary' }), 'tep.glb');
  for (const [key, value] of Object.entries(fields)) form.set(key, String(value));
  return form;
}

const CREDIT_FIELDS = { author: 'Nhóm sản phẩm', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0/', sourceUrl: 'https://sketchfab.com/3d-models/ngo-mon' };

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const drafts = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.filter((h) => h.timelineCount > 0 && h.mediaCount > 0 && !h.hasModel);
const published = [];
for (const heritage of drafts) {
  if (published.length >= 3) break;
  try {
    await call('POST', `/admin/heritages/${heritage.id}/publish`, { token: admin });
    published.push(await call('GET', `/admin/heritages/${heritage.id}`, { token: admin }));
  } catch {
    // Di sản chưa đủ điều kiện xuất bản thì thử di sản kế tiếp.
  }
}
if (published.length < 3) throw new Error('Cần ba di sản xuất bản được (di sản đợt 1 trong CSDL tạm).');
// A: khai báo mô hình bằng giao diện; B: mô hình nặng khai báo bằng API (thử cảnh báo mạng di động); C: không có mô hình (bộ ảnh). D: bản nháp có mô hình (xem trước).
const [A, B, C] = published;
const D = (await call('GET', '/admin/heritages?status=DRAFT&pageSize=100', { token: admin })).items.find((h) => !h.hasModel && !published.some((p) => p.id === h.id));
if (!D) throw new Error('Cần thêm một di sản nháp để thử xem trước.');
await call('POST', `/admin/heritages/${B.id}/models/upload`, { token: admin, form: modelForm(FILE_HEAVY, { ...CREDIT_FIELDS, title: 'Mô hình nặng', show: true }) });
const draftModel = await call('POST', `/admin/heritages/${D.id}/models/upload`, { token: admin, form: modelForm(FILE_GREEN, { ...CREDIT_FIELDS, title: 'Văn Miếu bản nháp', show: true }) });

await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: `Trường THCS Nguyễn Du ${stamp}`, orgAdmin: { fullName: 'Lê Thị Thu', username: `thu.${stamp}`, email: `thu.${stamp}@nguyendu.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`thu.${stamp}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const orgAdmin = (await call('POST', '/auth/login', { body: { emailOrUsername: `thu.${stamp}`, password: PASSWORD } })).accessToken;
const teacherLogin = `linh.${stamp}`;
await call('POST', '/org/teachers', { token: orgAdmin, body: { fullName: 'Đặng Thị Mỹ Linh', username: teacherLogin, email: `${teacherLogin}@nguyendu.edu.vn` } });
await call('POST', '/auth/set-password', { body: { token: await mailToken(`${teacherLogin}@nguyendu.edu.vn`), newPassword: PASSWORD } });
const teacher = (await call('POST', '/auth/login', { body: { emailOrUsername: teacherLogin, password: PASSWORD } })).accessToken;
const classRoom = await call('POST', '/teacher/classes', { token: teacher, body: { name: `7A${stamp.slice(-2)}`, grade: 7, schoolYear: '2026-2027' } });
const created = await call('POST', `/teacher/classes/${classRoom.id}/students`, { token: teacher, body: { fullName: 'Nguyễn Văn Đạt' } });
const { studentCode, temporaryPassword } = created.sheet.entries[0];
const firstLogin = await call('POST', '/student/auth/login', { body: { studentCode, password: temporaryPassword } });
await call('PUT', '/student/me/password', { token: firstLogin.accessToken, body: { newPassword: STUDENT_PASSWORD, confirmNewPassword: STUDENT_PASSWORD } });
console.log(`Đã chuẩn bị: di sản A "${A.name}", B "${B.name}", C "${C.name}", nháp D "${D.name}"; học sinh ${studentCode}.`);

// ---- Trình duyệt ----

const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL ?? 'msedge',
  headless: true,
  // Trình duyệt không giao diện cần vẽ 3D bằng phần mềm (SwiftShader).
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});

async function newContext(options = {}) {
  // Tắt chuyển động mặc định để góc nhìn đứng yên khi kiểm xoay và đặt lại; một ngữ cảnh riêng kiểm tự xoay.
  return browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', reducedMotion: 'reduce', ...options });
}

async function newPage(options = {}, context) {
  const ctx = context ?? (await newContext(options));
  const page = await ctx.newPage();
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  page.on('request', async (r) => {
    if (r.url().includes('/model')) modelCalls.push({ url: r.url(), auth: r.headers().authorization ?? null });
  });
  return page;
}

const shot = (page, name, options = { fullPage: true }) => page.screenshot({ path: resolve(SHOTS, `mo-hinh-3d-${name}.png`), ...options });
const pathOf = (page) => new URL(page.url()).pathname;
const toast = (page, text) => page.getByRole('status').filter({ hasText: typeof text === 'string' ? new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) : text }).first().waitFor({ timeout: 60000 });
const noOverflow = (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

/** Chờ `<model-viewer>` tải xong mô hình (WebGL thật) và trả số điểm ảnh có màu của khung vẽ. */
async function viewerReady(page, scope = page) {
  await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded === true, null, { timeout: 90000 });
  await sleep(600); // đợi khung hình đầu tiên được vẽ
  return scope.locator('model-viewer').evaluate(async (el) => {
    const blob = await el.toBlob({ mimeType: 'image/png' });
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let painted = 0;
    const colors = new Set();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 200) {
        painted++;
        colors.add(`${data[i] >> 4},${data[i + 1] >> 4},${data[i + 2] >> 4}`);
      }
    }
    return { painted, total: data.length / 4, colors: colors.size };
  });
}
const orbitOf = (page) => page.locator('model-viewer').evaluate((el) => {
  const { theta, phi, radius } = el.getCameraOrbit();
  return { theta, phi, radius };
});

const adminContext = await newContext();
const adminPage = await newPage({}, adminContext);
let keptModelFileUrl = null;
try {
  // ====================== Quản trị hệ thống: khai báo mô hình ======================
  await adminPage.goto(`${ADMIN_WEB}/dang-nhap`);
  await adminPage.getByLabel('Email hoặc tên đăng nhập').fill(ADMIN_LOGIN);
  await adminPage.getByLabel('Mật khẩu', { exact: true }).fill(ADMIN_PASSWORD);
  await adminPage.getByRole('button', { name: 'Đăng nhập' }).click();
  await adminPage.waitForURL(/\/quan-tri/);

  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san/${A.id}`);
  await adminPage.getByRole('tab', { name: 'Mô hình 3D' }).click();
  await adminPage.getByText('Di sản chưa có mô hình 3D.').waitFor();
  check('Biên tập di sản có tab Mô hình 3D (tab thứ sáu); chưa có mô hình thì báo trạng thái rỗng', pathOf(adminPage) === `/quan-tri/di-san/${A.id}` && adminPage.url().includes('tab=mo-hinh-3d'));
  await shot(adminPage, '01-quan-tri-tab-rong');

  await adminPage.getByRole('button', { name: 'Tải mô hình lên' }).click();
  const dialog = adminPage.getByRole('dialog', { name: 'Thêm mô hình 3D' });
  const fileInput = dialog.locator('input[type=file]');
  await fileInput.setInputFiles(FILE_GLTF);
  await dialog.getByText('Tệp mô hình không hợp lệ: chỉ nhận tệp .glb (glTF 2.0 đóng gói một tệp).').waitFor();
  check('Chọn tệp .gltf (nhiều tệp): bị từ chối ngay khi chọn', true);
  await fileInput.setInputFiles(FILE_FAKE);
  await dialog.getByText(/không phải tệp \.glb/).waitFor();
  check('Chọn tệp đổi đuôi thành .glb nhưng không phải glTF 2.0: bị từ chối theo nội dung đầu tệp', true);

  await fileInput.setInputFiles(FILE_RED);
  await dialog.getByText('ngo-mon.glb').waitFor();
  await dialog.getByLabel('Tên mô hình').fill('Cổng Ngọ Môn');
  await dialog.getByLabel('Tác giả').fill('Nhóm sản phẩm');
  await dialog.getByLabel('Giấy phép', { exact: true }).fill('CC BY-NC 4.0');
  await dialog.getByLabel('Đường dẫn nguồn').fill('https://sketchfab.com/3d-models/ngo-mon');
  await dialog.getByRole('button', { name: 'Tải lên' }).click();
  await dialog.getByText(/không nhận CC BY-NC, CC BY-ND/).waitFor();
  check('Giấy phép CC BY-NC bị chặn, chưa gửi gì lên máy chủ', true);
  await dialog.getByLabel('Giấy phép', { exact: true }).fill('CC BY 4.0');
  await dialog.getByLabel('Đường dẫn nguồn').fill('');
  await dialog.getByRole('button', { name: 'Tải lên' }).click();
  await dialog.getByText(/chỉ mô hình nhóm tự dựng được bỏ trống/).waitFor();
  check('Giấy phép mở mà thiếu đường dẫn nguồn: bị chặn (chỉ nhóm tự dựng được bỏ trống)', true);
  await dialog.getByLabel('Đường dẫn nguồn').fill('https://sketchfab.com/3d-models/ngo-mon');
  await dialog.getByLabel('Đường dẫn giấy phép').fill('https://creativecommons.org/licenses/by/4.0/');
  check('Ghi công do hệ thống ghép hiện trước khi lưu', (await dialog.getByText('Nhóm sản phẩm · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon').count()) === 1);
  await dialog.getByLabel('Hiện cho khách và học sinh ngay').check();
  await shot(adminPage, '02-quan-tri-hop-thoai-tai-len', { fullPage: false });
  await dialog.getByRole('button', { name: 'Tải lên' }).click();
  await toast(adminPage, 'Tải mô hình 3D lên thành công');
  const row = adminPage.getByRole('listitem').filter({ hasText: 'Cổng Ngọ Môn' });
  await row.getByText('Khách đang thấy').waitFor();
  check('Tải .glb lên và hiện ngay: dòng "Đang hiển thị", "Khách đang thấy", ghi công, dung lượng do máy chủ đo', (await row.getByText('Đang hiển thị').count()) === 1 && (await row.getByText(/GLB · \d+ KB/).count()) === 1);

  // Xem thử trong trình xem dùng chung (WebGL thật).
  await row.getByRole('button', { name: 'Xem thử' }).click();
  const painted = await viewerReady(adminPage);
  check('Xem thử trong tab: trình xem WebGL tải xong, khung vẽ có hình khối nhiều màu', painted.painted > 2000 && painted.colors >= 3, `${painted.painted}/${painted.total} điểm ảnh, ${painted.colors} màu`);
  check('Trình xem hiện hướng dẫn thao tác và nút Đặt lại góc nhìn', (await adminPage.getByText(/Kéo để xoay, cuộn hoặc chụm hai ngón/).count()) === 1 && (await adminPage.getByRole('button', { name: 'Đặt lại góc nhìn' }).isEnabled()));
  check('Người tắt chuyển động: mô hình không tự xoay', (await adminPage.locator('model-viewer').getAttribute('auto-rotate')) === null);
  const box = await adminPage.locator('model-viewer').boundingBox();
  const before = await orbitOf(adminPage);
  await adminPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await adminPage.mouse.down();
  await adminPage.mouse.move(box.x + box.width / 2 + 160, box.y + box.height / 2 + 40, { steps: 12 });
  await adminPage.mouse.up();
  await sleep(700);
  const after = await orbitOf(adminPage);
  check('Kéo chuột xoay mô hình (góc nhìn đổi)', Math.abs(after.theta - before.theta) > 0.3, `theta ${before.theta.toFixed(2)} → ${after.theta.toFixed(2)}`);
  await adminPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await adminPage.mouse.wheel(0, -600);
  await sleep(700);
  const zoomed = await orbitOf(adminPage);
  check('Cuộn chuột phóng to (bán kính nhỏ lại)', zoomed.radius < after.radius - 0.05, `${after.radius.toFixed(2)} → ${zoomed.radius.toFixed(2)}`);
  await shot(adminPage, '03-quan-tri-xem-thu-da-xoay');
  await adminPage.getByRole('button', { name: 'Đặt lại góc nhìn' }).click();
  await adminPage.waitForFunction(() => {
    const o = document.querySelector('model-viewer').getCameraOrbit();
    return Math.abs(Math.atan2(Math.sin(o.theta), Math.cos(o.theta))) < 0.05 && Math.abs(o.phi - 75 * Math.PI / 180) < 0.05;
  }, null, { timeout: 15000 });
  const reset = await orbitOf(adminPage);
  check('"Đặt lại góc nhìn" đưa camera về góc ban đầu', Math.abs(reset.phi - 1.309) < 0.05 && Math.abs(reset.theta) < 0.05, `theta ${reset.theta.toFixed(3)}, phi ${reset.phi.toFixed(3)}`);
  await row.getByRole('button', { name: 'Đóng xem thử' }).click();

  // Mô hình thứ hai: dán đường dẫn tệp đã lưu; không hiện được khi mô hình đầu đang hiển thị.
  const stored = await storeModelFile(admin, FILE_GREEN);
  keptModelFileUrl = stored.url;
  await adminPage.getByRole('button', { name: 'Dùng tệp đã lưu' }).click();
  const second = adminPage.getByRole('dialog', { name: 'Thêm mô hình 3D' });
  await second.getByLabel('Đường dẫn tệp mô hình').fill('https://sketchfab.com/models/van-mieu.glb');
  await second.getByLabel('Tác giả').fill('Lê Văn Bình');
  await second.getByLabel('Giấy phép', { exact: true }).fill('Mô hình nhóm tự dựng');
  await second.getByRole('button', { name: 'Thêm' }).click();
  await second.getByText(/không dùng đường dẫn tới trang ngoài/).waitFor();
  check('Dán đường dẫn ngoài kho tệp: bị từ chối', true);
  await second.getByLabel('Đường dẫn tệp mô hình').fill(stored.url);
  check('Hộp thoại không cho "hiện ngay" khi di sản đã có mô hình đang hiển thị', await second.getByLabel('Hiện cho khách và học sinh ngay').isDisabled());
  await second.getByLabel('Tên mô hình').fill('Văn Miếu');
  await second.getByRole('button', { name: 'Thêm' }).click();
  await toast(adminPage, 'Thêm mô hình 3D thành công');
  const secondRow = adminPage.getByRole('listitem').filter({ hasText: 'Văn Miếu' });
  await secondRow.getByText('Nháp').first().waitFor();
  check('Khai báo bằng đường dẫn trong kho: lưu nháp, mô hình nhóm tự dựng không cần nguồn ("Nhóm thực hiện")', (await secondRow.getByText('Lê Văn Bình · Mô hình nhóm tự dựng · Nhóm thực hiện').count()) === 1);
  check('Mỗi di sản một mô hình hiển thị: nút "Hiện" của mô hình nháp bị khóa', await secondRow.getByRole('button', { name: 'Hiện', exact: true }).isDisabled());
  await shot(adminPage, '04-quan-tri-hai-mo-hinh');

  // Ẩn mô hình đầu rồi hiện mô hình thứ hai.
  await row.getByRole('button', { name: 'Ẩn', exact: true }).click();
  await toast(adminPage, 'Ẩn mô hình 3D thành công');
  await row.getByText('Đã ẩn').waitFor();
  await secondRow.getByRole('button', { name: 'Hiện', exact: true }).click();
  await toast(adminPage, 'Hiện mô hình 3D thành công');
  await secondRow.getByText('Khách đang thấy').waitFor();
  check('Ẩn mô hình đầu rồi hiện mô hình thứ hai: chỉ mô hình thứ hai "Khách đang thấy"', (await row.getByText('Khách đang thấy').count()) === 0);

  // Thay tệp của mô hình thứ hai bằng tệp mới.
  const sizeOf = async () => (await secondRow.getByText(/GLB · \d+ KB/).innerText()).match(/(\d+) KB/)?.[1];
  const sizeBefore = await sizeOf();
  await secondRow.getByRole('button', { name: 'Thay tệp' }).click();
  const replace = adminPage.getByRole('dialog', { name: 'Thay tệp mô hình' });
  await replace.locator('input[type=file]').setInputFiles(FILE_FAKE);
  await replace.getByText(/không phải tệp \.glb/).waitFor();
  await replace.locator('input[type=file]').setInputFiles(FILE_BLUE);
  await replace.getByRole('button', { name: 'Thay tệp' }).click();
  await toast(adminPage, 'Thay tệp mô hình 3D thành công');
  await sleep(300);
  const sizeAfter = await sizeOf();
  check('Thay tệp bằng tải lên: ghi công giữ nguyên, dung lượng do máy chủ đo lại', (await secondRow.getByText('Lê Văn Bình · Mô hình nhóm tự dựng · Nhóm thực hiện').count()) === 1 && Number(sizeAfter) > Number(sizeBefore) + 30, `dung lượng ${sizeBefore} KB → ${sizeAfter} KB`);

  // Sửa thông tin: đổi tác giả.
  await secondRow.getByRole('button', { name: 'Sửa Văn Miếu' }).click();
  const edit = adminPage.getByRole('dialog', { name: 'Sửa mô hình 3D' });
  await edit.getByLabel('Tác giả').fill('Trần Thị Cúc');
  await edit.getByRole('button', { name: 'Lưu' }).click();
  await toast(adminPage, 'Lưu mô hình 3D thành công');
  await adminPage.getByText('Trần Thị Cúc · Mô hình nhóm tự dựng · Nhóm thực hiện').waitFor();
  check('Sửa tác giả: dòng ghi công ghép lại ở máy chủ', true);

  // Quản lý di sản: cột và bộ lọc.
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san?tu-khoa=${encodeURIComponent(A.name.slice(0, 20))}`);
  await adminPage.getByRole('table', { name: 'Danh sách di sản' }).waitFor();
  check('Quản lý di sản có cột Mô hình 3D; di sản A có 3D', (await adminPage.getByRole('columnheader', { name: 'Mô hình 3D' }).count()) === 1 && (await adminPage.getByRole('row').filter({ hasText: A.name }).getByText('Có 3D').count()) === 1);
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san?mo-hinh-3d=co`);
  await adminPage.getByRole('table', { name: 'Danh sách di sản' }).waitFor();
  const withNames = await adminPage.getByRole('row').allInnerTexts();
  check('Bộ lọc "Có mô hình 3D": có di sản A và B, không có di sản C', withNames.some((t) => t.includes(A.name)) && withNames.some((t) => t.includes(B.name)) && !withNames.some((t) => t.includes(C.name)));
  await shot(adminPage, '05-quan-tri-quan-ly-di-san-loc-3d');
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san?mo-hinh-3d=chua-co&trang-thai=da-xuat-ban`);
  await adminPage.getByRole('table', { name: 'Danh sách di sản' }).waitFor();
  const withoutNames = await adminPage.getByRole('row').allInnerTexts();
  check('Bộ lọc "Chưa có mô hình 3D": có di sản C, không có A và B', withoutNames.some((t) => t.includes(C.name)) && !withoutNames.some((t) => t.includes(A.name)) && !withoutNames.some((t) => t.includes(B.name)));

  // Nhật ký.
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/nhat-ky?hanh-dong=doi-mo-hinh-3d`);
  await adminPage.getByRole('table').first().waitFor();
  const auditRows = await adminPage.getByRole('row').filter({ hasText: 'Thêm, thay, gỡ, ẩn hoặc hiện mô hình 3D của di sản' }).count();
  check('Nhật ký thao tác ghi thêm, thay, sửa, ẩn, hiện mô hình 3D', auditRows >= 5, `${auditRows} dòng`);
  await adminPage.getByRole('row').filter({ hasText: 'Thêm, thay, gỡ' }).first().click();
  const auditText = await adminPage.locator('body').innerText();
  check('Nhật ký không ghi đường dẫn tệp nội bộ', !/\/files\/models\//.test(auditText));

  // Gỡ mô hình thứ hai (xóa mềm), để lại mô hình đầu (đã ẩn) rồi hiện lại cho phần khách.
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san/${A.id}?tab=mo-hinh-3d`);
  const rowAgain = adminPage.getByRole('listitem').filter({ hasText: 'Văn Miếu' });
  await rowAgain.getByRole('button', { name: 'Gỡ Văn Miếu' }).click();
  const confirm = adminPage.getByRole('dialog', { name: 'Gỡ mô hình 3D' });
  check('Gỡ mô hình: hộp xác nhận nói tệp được giữ trong kho tệp', (await confirm.getByText(/Tệp vẫn được giữ trong kho tệp/).count()) === 1);
  await confirm.getByRole('button', { name: 'Gỡ mô hình' }).click();
  await toast(adminPage, 'Gỡ mô hình 3D thành công');
  await adminPage.getByRole('listitem').filter({ hasText: 'Văn Miếu' }).waitFor({ state: 'detached' });
  const kept = await fetch(keptModelFileUrl.startsWith('http') ? keptModelFileUrl : new URL(keptModelFileUrl, API.replace(/\/api\/v1$/, '')).href);
  check('Gỡ là xóa mềm: tệp vẫn nằm trong kho và tải được', kept.ok && (kept.headers.get('content-type') ?? '').includes('model/gltf-binary'));
  await adminPage.getByRole('listitem').filter({ hasText: 'Cổng Ngọ Môn' }).getByRole('button', { name: 'Hiện', exact: true }).click();
  await toast(adminPage, 'Hiện mô hình 3D thành công');
  await adminPage.getByText('Khách đang thấy').waitFor();
  await shot(adminPage, '06-quan-tri-tab-sau-khi-go');

  // ====================== Khách: Xem 3D ======================
  const guestContext = await newContext({ reducedMotion: 'no-preference' });
  const guest = await newPage({}, guestContext);
  await guest.goto(`${LEARNING_WEB}/di-san/${C.slug}`);
  await guest.getByRole('heading', { level: 1 }).waitFor();
  check('Di sản không có mô hình: không có nút "Xem 3D", chỉ có thư viện ảnh', (await guest.getByRole('button', { name: 'Xem 3D' }).count()) === 0 && (await guest.getByRole('heading', { level: 2, name: 'Thư viện ảnh' }).count()) === 1);
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  const view = guest.getByRole('button', { name: 'Xem 3D' });
  await view.waitFor();
  check('Di sản có mô hình hiển thị: nút "Xem 3D" cùng hàng với "Tóm tắt" và "Nghe"', (await guest.getByRole('group', { name: 'Tóm tắt và nghe thuyết minh' }).getByRole('button').allInnerTexts()).join('|').replace(/\s+/g, ' ') === 'Tóm tắt|Nghe|Xem 3D');
  await shot(guest, '10-khach-chi-tiet-co-nut');
  check('Chưa bấm thì chưa tải mô hình', modelCalls.filter((c) => c.url.includes(`/public/heritages/${A.slug}/model`)).length === 0);
  await view.click();
  const viewerDialog = guest.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await viewerDialog.getByText('Cổng Ngọ Môn').first().waitFor();
  const guestPaint = await viewerReady(guest);
  check('Khách bấm "Xem 3D": trình xem WebGL tải xong, khung vẽ có hình khối', guestPaint.painted > 2000 && guestPaint.colors >= 3, `${guestPaint.painted} điểm ảnh, ${guestPaint.colors} màu`);
  check('Mô hình tự xoay khi người dùng không tắt chuyển động', (await guest.locator('model-viewer').getAttribute('auto-rotate')) !== null);
  check('Ghi công hiện ngay trong trình xem, kèm liên kết giấy phép và nguồn', (await viewerDialog.getByText('Nhóm sản phẩm · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon').count()) === 1 && (await viewerDialog.getByRole('link', { name: /Xem giấy phép/ }).getAttribute('href')) === 'https://creativecommons.org/licenses/by/4.0/' && (await viewerDialog.getByRole('link', { name: /Xem nguồn/ }).getAttribute('href')) === 'https://sketchfab.com/3d-models/ngo-mon');
  const guestCall = modelCalls.find((c) => c.url.includes(`/public/heritages/${A.slug}/model`));
  check('Xem 3D miễn phí, không đăng nhập: lời gọi mô hình không mang token', guestCall && guestCall.auth === null);
  check('Không có quảng cáo hay cổng đăng nhập trước khi xem 3D', (await viewerDialog.getByText(/quảng cáo|đăng nhập/i).count()) === 0);
  await shot(guest, '11-khach-xem-3d');
  const gBox = await guest.locator('model-viewer').boundingBox();
  const gBefore = await orbitOf(guest);
  await guest.mouse.move(gBox.x + gBox.width / 2, gBox.y + gBox.height / 2);
  await guest.mouse.down();
  await guest.mouse.move(gBox.x + gBox.width / 2 - 140, gBox.y + gBox.height / 2 - 30, { steps: 10 });
  await guest.mouse.up();
  await sleep(600);
  const gAfter = await orbitOf(guest);
  check('Khách kéo để xoay', Math.abs(gAfter.theta - gBefore.theta) > 0.3);
  await guest.keyboard.press('Escape');
  await viewerDialog.waitFor({ state: 'hidden' });
  check('Esc đóng hộp thoại, về trang chi tiết', (await guest.getByRole('heading', { level: 1 }).count()) === 1);

  // Năm ngôn ngữ.
  for (const [code, button, title, button2] of [['en', 'View in 3D', '3D MODEL', 'Reset view'], ['ko', '3D로 보기', '3D 모델', '시점 초기화'], ['zh-Hans', '查看 3D', '3D 模型', '重置视角'], ['ja', '3Dで見る', '3Dモデル', '視点をリセット']]) {
    await guest.evaluate((lang) => localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', lang), code);
    await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
    await guest.getByRole('button', { name: button }).click();
    const d = guest.getByRole('dialog', { name: title });
    await d.getByRole('button', { name: button2 }).waitFor();
    check(`Xem 3D bằng ${code}: nút, tiêu đề hộp thoại, nút "${button2}"; ghi công không dịch`, (await d.getByText('Nhóm sản phẩm · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon').count()) === 1);
    if (code === 'ja') await shot(guest, '12-khach-xem-3d-nhat');
    await guest.keyboard.press('Escape');
  }
  await guest.evaluate(() => localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'vi'));

  // Điện thoại.
  const phoneContext = await newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const phone = await newPage({}, phoneContext);
  await phone.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await phone.getByRole('button', { name: 'Xem 3D' }).click();
  await viewerReady(phone);
  check('Khung điện thoại 390px: hộp thoại Xem 3D không tràn ngang', await noOverflow(phone));
  const phoneBox = await phone.locator('model-viewer').boundingBox();
  check('Khung điện thoại: trình xem vừa chiều rộng màn hình', phoneBox.width <= 390 && phoneBox.width > 250, `${Math.round(phoneBox.width)}px`);
  await shot(phone, '13-dien-thoai-xem-3d', { fullPage: false });
  await phoneContext.close();

  // Quay về bộ ảnh: tải tệp lỗi.
  const brokenContext = await newContext();
  await brokenContext.route('**/files/models/*.glb', (route) => route.abort());
  const broken = await newPage({}, brokenContext);
  await broken.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await broken.getByRole('button', { name: 'Xem 3D' }).click();
  const brokenDialog = broken.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await brokenDialog.getByText('Không tải được mô hình 3D. Bạn có thể xem bộ ảnh của di sản.').waitFor({ timeout: 60000 });
  check('Tệp mô hình không tải được: quay về bộ ảnh kèm câu thông báo', (await brokenDialog.getByRole('heading', { level: 3, name: 'Bộ ảnh của di sản' }).count()) === 1 && (await brokenDialog.locator('model-viewer').count()) === 0 && (await brokenDialog.getByRole('figure').count()) > 0);
  await shot(broken, '14-khach-tai-loi-bo-anh', { fullPage: false });
  await brokenContext.close();

  // Thiết bị không hỗ trợ 3D (không có WebGL).
  const noGlContext = await newContext();
  await noGlContext.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return /webgl/i.test(String(type)) ? null : original.call(this, type, ...rest);
    };
  });
  const noGl = await newPage({}, noGlContext);
  await noGl.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await noGl.getByRole('button', { name: 'Xem 3D' }).click();
  const noGlDialog = noGl.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await noGlDialog.getByText('Không tải được mô hình 3D. Bạn có thể xem bộ ảnh của di sản.').waitFor();
  check('Thiết bị không hỗ trợ WebGL: quay về bộ ảnh kèm câu thông báo', (await noGlDialog.getByRole('figure').count()) > 0 && (await noGlDialog.locator('model-viewer').count()) === 0);
  await noGlContext.close();

  // Cảnh báo mạng di động với mô hình nặng (di sản B, hơn 6 MB).
  const cellularContext = await newContext();
  await cellularContext.addInitScript(() => Object.defineProperty(navigator, 'connection', { value: { type: 'cellular', effectiveType: '4g', saveData: false }, configurable: true }));
  const cellular = await newPage({}, cellularContext);
  await cellular.goto(`${LEARNING_WEB}/di-san/${B.slug}`);
  await cellular.getByRole('button', { name: 'Xem 3D' }).click();
  const heavyDialog = cellular.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await heavyDialog.getByText('Mô hình này khá nặng').waitFor();
  check('Mô hình nặng trên mạng di động: hỏi trước, chưa dựng trình xem', (await heavyDialog.locator('model-viewer').count()) === 0 && (await heavyDialog.getByText(/Mô hình nặng khoảng 6,\d MB/).count()) === 1);
  await shot(cellular, '15-khach-canh-bao-mang-di-dong', { fullPage: false });
  await heavyDialog.getByRole('button', { name: 'Vẫn tải mô hình' }).click();
  const heavyPaint = await viewerReady(cellular);
  check('Chọn "Vẫn tải mô hình": mô hình nặng tải và hiện', heavyPaint.painted > 2000);
  await cellularContext.close();
  const wifi = await newPage({}, await newContext());
  await wifi.goto(`${LEARNING_WEB}/di-san/${B.slug}`);
  await wifi.getByRole('button', { name: 'Xem 3D' }).click();
  await viewerReady(wifi);
  check('Mô hình nặng trên mạng thường (không báo mạng di động): tải luôn, không cảnh báo', (await wifi.getByText('Mô hình này khá nặng').count()) === 0);
  await wifi.context().close();

  // Mô hình đi theo trạng thái di sản: ẩn di sản A thì khách không còn thấy nút và API mô hình báo không có.
  await call('POST', `/admin/heritages/${A.id}/archive`, { token: admin });
  const afterArchive = await fetch(`${API}/public/heritages/${A.slug}/model`);
  const afterBody = await afterArchive.json();
  check('Ẩn di sản: API công khai của mô hình trả 404 kèm mã MODEL_UNAVAILABLE và câu thông báo', afterArchive.status === 404 && afterBody.errorCode !== null, `${afterArchive.status} ${afterBody.errorCode}`);
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await guest.getByRole('heading', { level: 1 }).or(guest.getByText(/không tìm thấy/i)).first().waitFor();
  check('Di sản đã ẩn không còn trang công khai (không có nút Xem 3D)', (await guest.getByRole('button', { name: 'Xem 3D' }).count()) === 0);
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san/${A.id}?tab=mo-hinh-3d`);
  const archivedRow = adminPage.getByRole('listitem').filter({ hasText: 'Cổng Ngọ Môn' });
  await archivedRow.getByText('Khách chưa thấy mô hình này vì di sản chưa xuất bản hoặc đang ẩn.').waitFor();
  check('Ở tab Mô hình 3D: mô hình vẫn "Đang hiển thị" nhưng khách chưa thấy vì di sản đang ẩn', (await archivedRow.getByText('Đang hiển thị').count()) === 1 && (await archivedRow.getByText('Khách đang thấy').count()) === 0);
  await shot(adminPage, '07-quan-tri-di-san-an');
  await call('POST', `/admin/heritages/${A.id}/restore`, { token: admin });
  await guest.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await guest.getByRole('button', { name: 'Xem 3D' }).waitFor();
  check('Hiện lại di sản: nút "Xem 3D" trở lại, mô hình giữ nguyên trạng thái', true);

  // ====================== Học sinh ======================
  const student = await newPage({ locale: 'ko-KR' });
  await student.goto(`${LEARNING_WEB}/dang-nhap`);
  await student.evaluate(() => localStorage.setItem('dsvhvn.hoc-tap.ngon-ngu', 'ko'));
  await student.getByLabel('Mã học sinh').fill(studentCode);
  await student.getByLabel('Mật khẩu', { exact: true }).fill(STUDENT_PASSWORD);
  await student.getByRole('button', { name: 'Đăng nhập' }).click();
  await student.waitForURL(/\/hoc$/);
  await student.goto(`${LEARNING_WEB}/di-san/${A.slug}`);
  await student.getByRole('button', { name: 'Xem 3D' }).click();
  const studentDialog = student.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await viewerReady(student);
  check('Học sinh đã đăng nhập (luôn tiếng Việt): xem 3D bình thường, ghi công đủ', (await studentDialog.getByText('Nhóm sản phẩm · CC BY 4.0 · https://sketchfab.com/3d-models/ngo-mon').count()) === 1);
  const studentCall = modelCalls.filter((c) => c.url.includes(`/public/heritages/${A.slug}/model`)).at(-1);
  check('Học sinh xem 3D cũng miễn phí: lời gọi mô hình không cần token', studentCall && studentCall.auth === null);
  await shot(student, '16-hoc-sinh-xem-3d', { fullPage: false });

  // ====================== Xem trước bản nháp ======================
  await adminPage.goto(`${ADMIN_WEB}/quan-tri/di-san/${D.id}`);
  const [previewTab] = await Promise.all([adminContext.waitForEvent('page'), adminPage.getByRole('button', { name: 'Xem trước', exact: true }).click()]);
  previewTab.on('pageerror', (e) => pageErrors.push(String(e)));
  previewTab.on('request', (r) => {
    if (r.url().includes('/model')) modelCalls.push({ url: r.url(), auth: r.headers().authorization ?? null });
  });
  await previewTab.getByRole('heading', { level: 1 }).waitFor({ timeout: 60000 });
  await previewTab.getByRole('status').filter({ hasText: 'Bản xem trước — chưa xuất bản' }).waitFor();
  check('Xem trước bản nháp: có nút "Xem 3D", không có "Tóm tắt" và "Nghe"', (await previewTab.getByRole('button', { name: 'Xem 3D' }).count()) === 1 && (await previewTab.getByRole('button', { name: 'Tóm tắt' }).count()) === 0);
  await previewTab.getByRole('button', { name: 'Xem 3D' }).click();
  const previewDialog = previewTab.getByRole('dialog', { name: 'MÔ HÌNH 3D' });
  await previewDialog.getByText('Văn Miếu bản nháp').waitFor();
  const previewPaint = await viewerReady(previewTab);
  check('Xem trước: trình xem tải mô hình của bản nháp bằng token quản trị', previewPaint.painted > 2000 && modelCalls.some((c) => c.url.includes(`/preview/heritages/`) && c.auth?.startsWith('Bearer ')));
  await shot(previewTab, '17-xem-truoc-ban-nhap-xem-3d', { fullPage: false });
  await previewTab.close();
  const publicDraft = await fetch(`${API}/public/heritages/${D.slug}/model`);
  check('Mô hình của di sản nháp không lộ ra API công khai (404)', publicDraft.status === 404);
  check('Tệp .glb của bản nháp phục vụ công khai chỉ khi biết đường dẫn (không đoán được)', /\/files\/models\/[0-9a-f]{32}\.glb$/.test(draftModel.fileUrl));
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
