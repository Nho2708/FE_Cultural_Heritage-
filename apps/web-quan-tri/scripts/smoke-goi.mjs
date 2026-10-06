#!/usr/bin/env node
// Kiểm thử luồng Gói và thanh toán VNPay của web quản trị trên trình duyệt thật với API thật: Gói dịch vụ (quản trị hệ thống),
// Trường và gói, Chọn gói và thanh toán, Kết quả thanh toán (quản trị trường).
//
// VNPay sandbox thật cần khóa của cửa hàng và địa chỉ IPN công khai nên KHÔNG dùng ở đây: trang thanh toán của VNPay được thay bằng
// trang giả (trình duyệt bị chặn không ra ngoài), còn IPN và lời trả về do script TỰ KÝ bằng khóa THỬ rồi gọi vào API, đúng như VNPay làm.
// Vì vậy API phải chạy với cùng khóa thử đó, trên CSDL tạm, ví dụ:
//   ConnectionStrings__Default="Server=(localdb)\MSSQLLocalDB;Database=dsvhvn_tam_a2_goi_fe;Trusted_Connection=True;TrustServerCertificate=True" \
//   Email__Mode=Log Ai__Mode=Simulated Storage__Provider=Local Seed__AdminPassword='<mật khẩu thử>' ASPNETCORE_ENVIRONMENT=Development \
//   Seed__HeritageData__ProvincesFile= Seed__HeritageData__HeritagesFile= \
//   VnPay__TmnCode=SMOKETMN VnPay__HashSecret='<khóa thử>' dotnet run --project src/DSVHVN.Api --no-launch-profile --urls http://localhost:5080
// Môi trường Development nạp hai gói mẫu (Cơ bản 500.000 đ, Nâng cao 1.990.000 đ).
//
//   API_LOG=<log của API> ADMIN_PASSWORD=<mật khẩu thử> VNPAY_HASH_SECRET=<khóa thử> npm run smoke:goi -w @dsvhvn/web-quan-tri
//
// Biến môi trường:
//   BASE_URL           mặc định http://localhost:5173 (trùng App:FrontendBaseUrl của API)
//   API_URL            mặc định http://localhost:5080/api/v1
//   API_LOG            BẮT BUỘC — tệp log console của API (thư giả chứa liên kết đặt mật khẩu)
//   ADMIN_PASSWORD     BẮT BUỘC — mật khẩu seed của quản trị hệ thống
//   VNPAY_HASH_SECRET  BẮT BUỘC — khóa thử mà API đang dùng (VnPay__HashSecret)
//   VNPAY_TMN_CODE     mặc định SMOKETMN
//   ADMIN_LOGIN        mặc định admin.nho
//   BROWSER_CHANNEL    msedge (mặc định) | chrome
//   SHOTS_DIR          thư mục ảnh chụp màn hình (mặc định smoke-shots/, không vào git)

import { createHmac } from 'node:crypto';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from 'playwright-core';

const BASE = (process.env.BASE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const API = (process.env.API_URL ?? 'http://localhost:5080/api/v1').replace(/\/+$/, '');
const API_ORIGIN = new URL(API).origin;
const API_LOG = process.env.API_LOG;
const ADMIN_LOGIN = process.env.ADMIN_LOGIN ?? 'admin.nho';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SECRET = process.env.VNPAY_HASH_SECRET;
const TMN = process.env.VNPAY_TMN_CODE ?? 'SMOKETMN';
if (!API_LOG || !ADMIN_PASSWORD || !SECRET) {
  console.error('Cần API_LOG, ADMIN_PASSWORD và VNPAY_HASH_SECRET (xem đầu tệp).');
  process.exit(2);
}
const SHOTS = resolve(process.env.SHOTS_DIR ?? 'smoke-shots');
mkdirSync(SHOTS, { recursive: true });

const stamp = new Date().toISOString().replace(/\D/g, '').slice(8, 14);
const PASSWORD = 'MatKhau2026';
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

// ---- Giả VNPay: tự ký IPN và lời trả về bằng khóa thử ----

const formEncode = (value) => new URLSearchParams({ x: value }).toString().slice(2);

/** Chuỗi query có chữ ký như VNPay gửi: tham số vnp_* khác rỗng sắp theo tên, giá trị mã hóa URL, HMAC-SHA512 bằng khóa thử. */
function signedQuery({ txnRef, amount, code, status, transactionNo }) {
  const p = {
    vnp_TmnCode: TMN,
    vnp_Amount: String(amount),
    vnp_BankCode: 'NCB',
    vnp_BankTranNo: `VNP${transactionNo}`,
    vnp_CardType: 'ATM',
    vnp_OrderInfo: 'thanh toan hoa don',
    vnp_PayDate: '20261007103000',
    vnp_ResponseCode: code,
    vnp_TransactionNo: transactionNo,
    vnp_TransactionStatus: status,
    vnp_TxnRef: String(txnRef),
  };
  const data = Object.keys(p)
    .sort()
    .map((k) => `${k}=${formEncode(p[k])}`)
    .join('&');
  const hash = createHmac('sha512', SECRET).update(data).digest('hex');
  return `${data}&vnp_SecureHashType=HmacSHA512&vnp_SecureHash=${hash}`;
}

async function sendIpn(query) {
  const response = await fetch(`${API_ORIGIN}/api/v1/payments/vnpay/ipn?${query}`);
  return response.json();
}

let transactionSeq = Number(`${Date.now()}`.slice(-7));

console.log('Chuẩn bị dữ liệu qua API…');
const admin = (await call('POST', '/auth/login', { body: { emailOrUsername: ADMIN_LOGIN, password: ADMIN_PASSWORD } })).accessToken;
const orgAdminLogin = `thu.${stamp}`;
const schoolName = `Trường THCS Nguyễn Du ${stamp}`;
await call('POST', '/admin/organizations', {
  token: admin,
  body: { name: schoolName, orgAdmin: { fullName: 'Lê Thị Thu', username: orgAdminLogin, email: `${orgAdminLogin}@nguyendu.edu.vn` } },
});
await call('POST', '/auth/set-password', { body: { token: await mailToken(`${orgAdminLogin}@nguyendu.edu.vn`), newPassword: PASSWORD } });
console.log(`Đã tạo ${schoolName} và quản trị trường ${orgAdminLogin}.`);

// ---- Trình duyệt ----

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'msedge', headless: true });

async function newPage(options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'vi-VN', ...options });
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('response', (r) => {
    if (r.url().startsWith(API) && r.status() >= 500) badResponses.push(`${r.status()} ${r.url()}`);
  });
  // Trang thanh toán của VNPay được thay bằng trang giả; mọi địa chỉ ngoài máy mình đều bị chặn.
  await page.route(/^https:\/\/sandbox\.vnpayment\.vn\//, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>VNPay giả</title><h1>Trang thanh toán VNPay giả lập</h1>' }),
  );
  return page;
}

const shot = (page, name) => page.screenshot({ path: resolve(SHOTS, `goi-${name}.png`), fullPage: true });
const path = (page) => new URL(page.url()).pathname;
const toast = (page, text) => page.getByRole('status').filter({ hasText: text }).first().waitFor({ timeout: 8000 });
const h2 = (page, name) => page.getByRole('heading', { level: 2, name }).waitFor({ timeout: 10_000 });

async function signIn(page, login, password) {
  await page.goto(`${BASE}/dang-nhap`);
  await page.getByLabel('Email hoặc tên đăng nhập').fill(login);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await page.waitForURL(/\/(quan-tri|truong|giao-vien)/);
}

/** Chọn thẻ gói (ô chọn thật bị ẩn, bấm vào nhãn bao ngoài). */
const pickPlan = (page, name) => page.locator('label', { has: page.getByRole('radio', { name, exact: true }) }).click();

/** Tới trang thanh toán giả của VNPay sau khi bấm "Tiếp tục" hay "Thanh toán": trả mã tham chiếu và số tiền VNPay nhận. */
async function atGateway(page) {
  await page.waitForURL(/sandbox\.vnpayment\.vn/, { timeout: 10_000 });
  const params = new URL(page.url()).searchParams;
  return { txnRef: params.get('vnp_TxnRef'), amount: params.get('vnp_Amount'), hasHash: Boolean(params.get('vnp_SecureHash')), params };
}

/** VNPay báo kết quả: IPN (tùy chọn) rồi đưa trình duyệt về trang trả về của API, API chuyển sang Kết quả thanh toán. */
async function finishPayment(page, gateway, { code = '00', status = '00', ipn = true } = {}) {
  const query = signedQuery({ txnRef: gateway.txnRef, amount: gateway.amount, code, status, transactionNo: String(transactionSeq++) });
  const reply = ipn ? await sendIpn(query) : null;
  await page.goto(`${API_ORIGIN}/api/v1/payments/vnpay/return?${query}`);
  await page.waitForURL(/\/truong\/ket-qua-thanh-toan/);
  return { query, reply };
}

try {
  // ======== Quản trị hệ thống: Gói dịch vụ ========
  const sys = await newPage();
  await signIn(sys, ADMIN_LOGIN, ADMIN_PASSWORD);
  await sys.getByRole('link', { name: 'Gói dịch vụ', exact: true }).first().click();
  await sys.waitForURL(`${BASE}/quan-tri/goi`);
  const table = sys.getByRole('table', { name: 'Gói dịch vụ' });
  await table.waitFor();
  const rowOf = (name) => sys.getByRole('button', { name: `Sửa gói ${name}`, exact: true }).locator('xpath=ancestor::tr');
  check('Gói dịch vụ: bảng có gói Miễn phí và hai gói mẫu', (await rowOf('Miễn phí').count()) === 1 && (await rowOf('Cơ bản').count()) === 1 && (await rowOf('Nâng cao').count()) === 1);
  check('Gói dịch vụ: giá hiện dạng 500.000 ₫ và 1.990.000 ₫', (await table.innerText()).includes('500.000 ₫') && (await table.innerText()).includes('1.990.000 ₫'));
  check('Gói Miễn phí: công tắc bán bị khóa', await sys.getByRole('switch', { name: 'Đang bán gói Miễn phí' }).isDisabled());
  await shot(sys, '01-goi-dich-vu');
  /** Số trường đang dùng của một gói (cột cuối của dòng). */
  const usedBy = async (page, name) => Number((await page.getByRole('button', { name: `Sửa gói ${name}`, exact: true }).locator('xpath=ancestor::tr').locator('td').last().innerText()).trim());
  const basicBefore = await usedBy(sys, 'Cơ bản');

  await sys.getByRole('button', { name: 'Tạo gói', exact: true }).click();
  const form = sys.getByRole('form', { name: 'Tạo gói' });
  await form.getByLabel('Thời hạn (ngày)').fill('');
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  await sys.getByText('Vui lòng nhập tên gói.').waitFor();
  check('Tạo gói để trống: báo bắt buộc nhập từng ô', (await sys.locator('p.text-danger').count()) === 5);
  await shot(sys, '02-tao-goi-loi');

  const planName = `Gói thử ${stamp}`;
  await form.getByLabel('Tên').fill(planName);
  await form.getByLabel('Giá (đồng)').fill('0');
  await form.getByLabel('Thời hạn (ngày)').fill('90');
  await form.getByLabel('Số giáo viên tối đa').fill('5');
  await form.getByLabel('Lượt AI mỗi kỳ').fill('50');
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  await sys.getByText(/gói Miễn phí là gói giá 0 duy nhất/).waitFor();
  check('Giá 0 cho gói trả phí bị chặn', true);
  await form.getByLabel('Giá (đồng)').fill('750.000');
  await form.getByRole('button', { name: 'Lưu', exact: true }).click();
  await toast(sys, 'Tạo gói thành công');
  check('Tạo gói: dòng mới trong bảng, giá 750.000 ₫, khung chuyển sang Sửa gói', (await rowOf(planName).innerText()).includes('750.000 ₫') && (await sys.getByRole('form', { name: 'Sửa gói' }).count()) === 1);

  const edit = sys.getByRole('form', { name: 'Sửa gói' });
  await edit.getByLabel('Giá (đồng)').fill('790000');
  await edit.getByRole('button', { name: 'Lưu', exact: true }).click();
  await toast(sys, 'Lưu gói thành công');
  await sys.waitForFunction((t) => document.body.innerText.includes(t), '790.000 ₫');
  check('Sửa giá gói: bảng cập nhật 790.000 ₫', true);

  await sys.getByRole('button', { name: 'Sửa gói Cơ bản', exact: true }).click();
  await sys.getByRole('form', { name: 'Sửa gói' }).getByLabel('Tên').fill('Nâng cao');
  await sys.getByRole('form', { name: 'Sửa gói' }).getByRole('button', { name: 'Lưu', exact: true }).click();
  await sys.getByText('Tên gói "Nâng cao" đã được sử dụng', { exact: false }).waitFor();
  check('Đổi tên trùng gói khác: báo trùng dưới ô Tên', true);
  await sys.getByRole('form', { name: 'Sửa gói' }).getByRole('button', { name: 'Hủy', exact: true }).click();

  await sys.getByRole('switch', { name: `Đang bán gói ${planName}` }).click();
  await sys.getByRole('dialog', { name: 'Tắt bán gói?' }).getByRole('button', { name: 'Tắt bán', exact: true }).click();
  await toast(sys, 'Tắt bán gói thành công');
  check('Tắt bán gói: phải xác nhận, công tắc tắt', (await sys.getByRole('switch', { name: `Đang bán gói ${planName}` }).getAttribute('aria-checked')) === 'false');
  await sys.getByRole('switch', { name: `Đang bán gói ${planName}` }).click();
  await toast(sys, 'Bật bán gói thành công');
  check('Bật bán lại: không cần xác nhận', (await sys.getByRole('switch', { name: `Đang bán gói ${planName}` }).getAttribute('aria-checked')) === 'true');
  // Tắt bán gói thử để không lẫn vào các gói của trường ở bước sau.
  await sys.getByRole('switch', { name: `Đang bán gói ${planName}` }).click();
  await sys.getByRole('dialog', { name: 'Tắt bán gói?' }).getByRole('button', { name: 'Tắt bán', exact: true }).click();
  await toast(sys, 'Tắt bán gói thành công');
  await sys.close();

  // ======== Quản trị trường ========
  const page = await newPage();
  await signIn(page, orgAdminLogin, PASSWORD);
  check('Quản trị trường đăng nhập vào khu /truong', path(page).startsWith('/truong'));

  // ---- Gói Miễn phí đang dùng
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  await h2(page, 'Miễn phí');
  check('Trường mới có gói Miễn phí đang hiệu lực', (await page.getByText('Đang hiệu lực').count()) > 0);
  check('Gói Miễn phí: có "Nâng cấp", không có "Gia hạn" và "Hủy gói"', (await page.getByRole('link', { name: 'Nâng cấp', exact: true }).count()) === 1 && (await page.getByRole('link', { name: 'Gia hạn', exact: true }).count()) === 0 && (await page.getByRole('button', { name: 'Hủy gói', exact: true }).count()) === 0);
  await shot(page, '03-goi-mien-phi');

  // ---- Chọn gói, thanh toán thất bại rồi thanh toán lại
  await page.getByRole('link', { name: 'Nâng cấp', exact: true }).click();
  await page.waitForURL(`${BASE}/truong/chon-goi`);
  await page.getByRole('radio', { name: 'Cơ bản', exact: true }).waitFor({ state: 'attached' });
  check('Chọn gói: hai gói mẫu, không có gói Miễn phí, ghi chú môi trường thử VNPay', (await page.getByRole('radio').count()) >= 2 && (await page.getByRole('radio', { name: 'Miễn phí' }).count()) === 0 && (await page.getByText(/Môi trường thử VNPay/).count()) === 1);
  await pickPlan(page, 'Cơ bản');
  const quote = page.getByRole('region', { name: 'Xác nhận thanh toán' });
  await quote.waitFor();
  await quote.getByText('Nâng cấp', { exact: true }).waitFor();
  check('Chọn gói Cơ bản từ gói Miễn phí: loại Nâng cấp, 500.000 ₫, hiệu lực ngay', (await quote.innerText()).includes('500.000 ₫') && (await quote.innerText()).includes('Ngay khi thanh toán thành công'));
  await shot(page, '04-chon-goi');
  await page.getByRole('button', { name: 'Thanh toán qua VNPay', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Thanh toán qua VNPay' });
  check('Hộp xác nhận hiện câu "Trường sẽ thanh toán 500.000 đồng cho gói Cơ bản qua VNPay…"', (await confirm.innerText()).includes('Trường sẽ thanh toán 500.000 đồng cho gói Cơ bản qua VNPay.'));
  await shot(page, '05-xac-nhan-vnpay');
  await confirm.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  const gw1 = await atGateway(page);
  check('Chuyển sang địa chỉ VNPay có chữ ký, số tiền nhân 100', gw1.hasHash && gw1.amount === '50000000', `vnp_Amount=${gw1.amount}`);

  const cancelled = await finishPayment(page, gw1, { code: '24', status: '02' });
  check('IPN báo người trả hủy: API xác nhận RspCode 00', cancelled.reply?.RspCode === '00');
  await h2(page, 'Thanh toán chưa thành công');
  check('Kết quả: Chưa thanh toán, câu "Thanh toán chưa thành công. Hóa đơn … vẫn chờ thanh toán"', (await page.getByText(/Hóa đơn HD\d{8}-\d{6} vẫn chờ thanh toán đến/).count()) === 1);
  await shot(page, '06-ket-qua-chua-thanh-toan');

  await page.getByRole('button', { name: 'Thanh toán lại', exact: true }).click();
  const gw2 = await atGateway(page);
  check('"Thanh toán lại" tạo giao dịch mới (mã tham chiếu khác)', gw2.txnRef !== gw1.txnRef, `${gw1.txnRef} → ${gw2.txnRef}`);
  const ok1 = await finishPayment(page, gw2);
  check('IPN thành công: API trả RspCode 00', ok1.reply?.RspCode === '00');
  await h2(page, 'Thanh toán thành công');
  const resultText = await page.locator('section[aria-labelledby="ket-qua"]').innerText();
  check('Kết quả: Đã thanh toán, gói Cơ bản có hiệu lực, hóa đơn, 500.000 ₫, mã giao dịch VNPay', resultText.includes('Đã thanh toán') && resultText.includes('Gói Cơ bản có hiệu lực từ ngày') && /HD\d{8}-\d{6}/.test(resultText) && resultText.includes('500.000 ₫') && /Mã giao dịch VNPay\s*\d+/.test(resultText));
  await shot(page, '07-ket-qua-thanh-cong');

  // IPN lặp: không đổi dữ liệu
  const repeat = await sendIpn(ok1.query);
  check('IPN gửi lặp: API trả RspCode 02, không kích hoạt thêm', repeat.RspCode === '02');

  await page.getByRole('link', { name: 'Xem gói và hóa đơn', exact: true }).click();
  await page.waitForURL(/tab=goi-va-han-muc/);
  await h2(page, 'Cơ bản');
  check('Tab Gói và hạn mức: gói Cơ bản Đang hiệu lực, có Gia hạn, Nâng cấp, Hủy gói', (await page.getByRole('link', { name: 'Gia hạn', exact: true }).count()) === 1 && (await page.getByRole('link', { name: 'Nâng cấp', exact: true }).count()) === 1 && (await page.getByRole('button', { name: 'Hủy gói', exact: true }).count()) === 1);
  await shot(page, '08-goi-co-ban');

  // ---- Hóa đơn và giao dịch
  await page.getByRole('tab', { name: 'Hóa đơn và giao dịch' }).click();
  const invoices = page.getByRole('table', { name: 'Hóa đơn của trường' });
  await invoices.waitFor();
  check('Tab Hóa đơn: một hóa đơn Đã thanh toán, nội dung "Nâng cấp lên gói Cơ bản", không có nút Thanh toán', (await invoices.innerText()).includes('Đã thanh toán') && (await invoices.innerText()).includes('Nâng cấp lên gói Cơ bản') && (await invoices.getByRole('button', { name: /^Thanh toán hóa đơn/ }).count()) === 0);
  await invoices.getByRole('button', { name: /^Xem giao dịch của hóa đơn/ }).click();
  await page.getByText(/^Giao dịch của hóa đơn/).waitFor();
  const paymentsText = await invoices.innerText();
  check('Mở dòng hóa đơn: hai giao dịch, một Thất bại và một Thành công', paymentsText.includes('Thất bại') && paymentsText.includes('Thành công') && paymentsText.includes('Mã giao dịch VNPay'));
  await shot(page, '09-hoa-don-giao-dich');

  // ---- Nâng cấp lên Nâng cao: kết quả đang chờ IPN rồi tự cập nhật
  await page.goto(`${BASE}/truong/chon-goi`);
  await page.getByRole('radio', { name: 'Nâng cao', exact: true }).waitFor({ state: 'attached' });
  await pickPlan(page, 'Nâng cao');
  await quote.waitFor();
  await quote.getByText('Nâng cấp', { exact: true }).waitFor();
  check('Chọn Nâng cao khi đang dùng Cơ bản: Nâng cấp, 1.990.000 ₫, lưu ý không hoàn phần chưa dùng', (await quote.innerText()).includes('1.990.000 ₫') && (await quote.innerText()).includes('không hoàn phần chưa dùng'));
  await page.getByRole('button', { name: 'Thanh toán qua VNPay', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thanh toán qua VNPay' }).getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  const gw3 = await atGateway(page);
  const early = await finishPayment(page, gw3, { ipn: false });
  await h2(page, 'Đang chờ xác nhận');
  check('Trình duyệt về trước IPN: trang báo "Đang chờ xác nhận" và đếm số lần kiểm tra', (await page.getByText(/Đã kiểm tra \d+ lần/).count()) === 1);
  await shot(page, '10-ket-qua-dang-xu-ly');
  const late = await sendIpn(early.query);
  check('IPN tới sau: API trả RspCode 00', late.RspCode === '00');
  await h2(page, 'Thanh toán thành công');
  check('Trang tự cập nhật sang "Thanh toán thành công" không cần tải lại', (await page.getByText('Gói Nâng cao có hiệu lực từ ngày').count()) === 1);

  // ---- Hủy gói trả phí, kích hoạt lại gói Miễn phí
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  await h2(page, 'Nâng cao');
  await page.getByRole('button', { name: 'Hủy gói', exact: true }).click();
  const cancelDialog = page.getByRole('dialog', { name: 'Hủy gói Nâng cao?' });
  check('Hộp hủy gói: câu của máy chủ "Gói sẽ kết thúc ngay, không được hoàn tiền"', (await cancelDialog.innerText()).includes('không được hoàn tiền'));
  await shot(page, '11-xac-nhan-huy-goi');
  await cancelDialog.getByRole('button', { name: 'Hủy gói', exact: true }).click();
  await toast(page, 'Hủy thành công');
  await page.getByRole('heading', { level: 2, name: 'Trường chưa có gói hiệu lực' }).waitFor();
  check('Sau khi hủy: "Trường chưa có gói hiệu lực", thanh báo gói hết hiệu lực kèm "Mua gói"', (await page.getByText(/Trường chưa có gói dịch vụ còn hiệu lực|Gói dịch vụ của trường đã hết hiệu lực/).count()) > 0 && (await page.getByRole('link', { name: 'Mua gói', exact: true }).count()) === 2);
  await shot(page, '12-khong-co-goi');
  await page.getByRole('button', { name: 'Kích hoạt gói Miễn phí', exact: true }).click();
  await shot(page, '13-xac-nhan-kich-hoat-mien-phi');
  await page.getByRole('dialog', { name: 'Kích hoạt gói Miễn phí?' }).getByRole('button', { name: 'Kích hoạt', exact: true }).click();
  await toast(page, 'Kích hoạt gói Miễn phí thành công');
  await h2(page, 'Miễn phí');
  check('Kích hoạt gói Miễn phí: gói hiện ngay, không qua VNPay, thanh báo biến mất', (await page.getByText(/Gói dịch vụ của trường đã hết hiệu lực/).count()) === 0);

  // ---- Yêu cầu mua chưa thanh toán: chặn mua thêm, thanh toán sau, hủy yêu cầu
  await page.goto(`${BASE}/truong/chon-goi`);
  await page.getByRole('radio', { name: 'Cơ bản', exact: true }).waitFor({ state: 'attached' });
  await pickPlan(page, 'Cơ bản');
  await quote.waitFor();
  await page.getByRole('button', { name: 'Thanh toán qua VNPay', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thanh toán qua VNPay' }).getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await atGateway(page);
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  const pending = page.getByRole('region', { name: 'Yêu cầu mua gói chưa thanh toán' });
  await pending.waitFor();
  check('Bỏ dở thanh toán: tab Gói và hạn mức hiện yêu cầu mua chưa thanh toán, khóa "Nâng cấp"', (await pending.innerText()).includes('Cơ bản') && (await pending.innerText()).includes('500.000 ₫') && (await page.getByRole('button', { name: 'Nâng cấp', exact: true }).isDisabled()));
  await shot(page, '14-yeu-cau-mua-chua-thanh-toan');
  await page.goto(`${BASE}/truong/chon-goi`);
  await page.getByText(/Trường đã có yêu cầu mua gói Cơ bản chưa thanh toán/).first().waitFor();
  check('Chọn gói: gói bị khóa kèm lý do của máy chủ', await page.getByRole('radio', { name: 'Cơ bản', exact: true }).isDisabled());
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  await pending.waitFor();
  await pending.getByRole('button', { name: 'Hủy yêu cầu', exact: true }).click();
  await page.getByRole('dialog', { name: 'Hủy yêu cầu mua gói?' }).getByRole('button', { name: 'Hủy yêu cầu', exact: true }).click();
  await toast(page, 'Hủy thành công');
  await pending.waitFor({ state: 'detached' });
  await page.getByRole('tab', { name: 'Hóa đơn và giao dịch' }).click();
  await invoices.waitFor();
  check('Hủy yêu cầu: hóa đơn chuyển Đã hủy', (await invoices.innerText()).includes('Đã hủy'));

  // ---- Mua Cơ bản, rồi gia hạn: gói gia hạn chờ bắt đầu
  await page.goto(`${BASE}/truong/chon-goi`);
  await page.getByRole('radio', { name: 'Cơ bản', exact: true }).waitFor({ state: 'attached' });
  await pickPlan(page, 'Cơ bản');
  await quote.waitFor();
  await page.getByRole('button', { name: 'Thanh toán qua VNPay', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thanh toán qua VNPay' }).getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await finishPayment(page, await atGateway(page));
  await h2(page, 'Thanh toán thành công');
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  await h2(page, 'Cơ bản');
  await page.getByRole('link', { name: 'Gia hạn', exact: true }).click();
  await page.waitForURL(/\/truong\/chon-goi\?goi=\d+/);
  await quote.waitFor();
  check('"Gia hạn" mở Chọn gói với gói hiện tại chọn sẵn; loại Gia hạn, hiệu lực là khoảng ngày sau khi gói hiện tại hết', (await page.getByRole('radio', { name: 'Cơ bản', exact: true }).isChecked()) && (await quote.innerText()).includes('Gia hạn') && /\d{2}\/\d{2}\/\d{4} – \d{2}\/\d{2}\/\d{4}/.test(await quote.innerText()));
  await page.getByRole('button', { name: 'Thanh toán qua VNPay', exact: true }).click();
  await page.getByRole('dialog', { name: 'Thanh toán qua VNPay' }).getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await finishPayment(page, await atGateway(page));
  await h2(page, 'Thanh toán thành công');
  await page.goto(`${BASE}/truong/thong-tin?tab=goi-va-han-muc`);
  await page.getByText(/Gói gia hạn Cơ bản đã thanh toán, có hiệu lực/).waitFor();
  check('Sau khi gia hạn: báo gói gia hạn chờ bắt đầu, khóa "Gia hạn", không hủy được gói', (await page.getByRole('button', { name: 'Gia hạn', exact: true }).isDisabled()) && (await page.getByRole('button', { name: 'Hủy gói', exact: true }).count()) === 0);
  await shot(page, '15-co-goi-gia-han-cho');

  // ---- Liên kết trả về không hợp lệ
  await page.goto(`${API_ORIGIN}/api/v1/payments/vnpay/return?vnp_TxnRef=1&vnp_SecureHash=sai`);
  await page.waitForURL(/ket-qua-thanh-toan\?error=invalid/);
  await page.getByText(/Liên kết trả về từ VNPay không hợp lệ/).waitFor();
  check('Trang trả về sai chữ ký: chuyển ?error=invalid, báo liên kết không hợp lệ, không đổi dữ liệu', true);
  await shot(page, '16-ket-qua-lien-ket-sai');

  // ---- Quản trị hệ thống thấy số trường đang dùng gói
  const sys2 = await newPage();
  await signIn(sys2, ADMIN_LOGIN, ADMIN_PASSWORD);
  await sys2.goto(`${BASE}/quan-tri/goi`);
  await sys2.getByRole('table', { name: 'Gói dịch vụ' }).waitFor();
  const basicAfter = await usedBy(sys2, 'Cơ bản');
  check('Gói dịch vụ: số trường đang dùng gói Cơ bản tăng thêm 1 sau khi trường mua', basicAfter === basicBefore + 1, `${basicBefore} → ${basicAfter}`);
  await sys2.close();

  // ---- Khung điện thoại: không tràn ngang
  const phone = await newPage({ viewport: { width: 390, height: 844 } });
  await signIn(phone, orgAdminLogin, PASSWORD);
  for (const [label, url, wait] of [
    ['Trường và gói, tab Gói và hạn mức', `${BASE}/truong/thong-tin?tab=goi-va-han-muc`, () => phone.getByRole('heading', { level: 2, name: 'Cơ bản' })],
    ['Chọn gói và thanh toán', `${BASE}/truong/chon-goi`, () => phone.getByRole('radio', { name: 'Cơ bản', exact: true })],
  ]) {
    await phone.goto(url);
    await wait().waitFor({ state: 'attached' });
    const overflow = await phone.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`Khung 390 px: ${label} không tràn ngang`, overflow <= 0, `lệch ${overflow}px`);
    await shot(phone, `17-dien-thoai-${url.includes('chon-goi') ? 'chon-goi' : 'goi'}`);
  }
  await phone.close();
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
