# DSVHVN — Giao diện web (React)

Giao diện của **DSVHVN** (nhóm FA26SE171): nền tảng giúp **trường học** — giáo viên tạo lớp, bài học và bài kiểm tra về
di sản văn hóa Việt Nam cho học sinh; nội dung di sản tham khảo từ Cục Di sản văn hóa; có khám phá di sản, bản đồ và
dòng thời gian. Học sinh có tài khoản (mã học sinh + mật khẩu, giáo viên tạo) và học trên web học tập hoặc app mobile.
Giao diện và nội dung **chỉ tiếng Việt**; route viết chữ Việt không dấu.

Repo gồm **hai ứng dụng web** và **một gói dùng chung**, quản lý bằng npm workspaces:

| Workspace | Thư mục | Tên hiển thị | Cổng dev | Dành cho |
|---|---|---|---|---|
| `@dsvhvn/web-quan-tri` | `apps/web-quan-tri` | Trang quản trị | 5173 | Giáo viên (`/giao-vien`), quản trị trường (`/truong`), quản trị hệ thống (`/quan-tri`) — một ứng dụng, menu theo vai trò |
| `@dsvhvn/web-hoc-tap` | `apps/web-hoc-tap` | Học di sản | 5174 | Khách (khám phá di sản công khai) và học sinh (khu học), giao diện theo cấp học 1 / 2 / 3 |
| `@dsvhvn/dung-chung` | `packages/dung-chung` | — | — | Design token và bộ giao diện theo cấp, component giao diện web, lớp gọi API, kiểu dữ liệu, phiên đăng nhập, kiểm tra hợp lệ, câu thông báo |

App mobile (React Native + Expo, chỉ phần học) sẽ dùng lại lớp gọi API, kiểu dữ liệu, kiểm tra hợp lệ, câu thông báo và
token bộ giao diện của gói dùng chung; component giao diện web không dùng được trên React Native.

Backend: [`BE_Cultural_Heritage-`](../BE_Cultural_Heritage-) (ASP.NET Core 9, tiền tố API `/api/v1`, CSDL v3).
Chi tiết từng ứng dụng: [`docs/web-quan-tri.md`](docs/web-quan-tri.md), [`docs/web-hoc-tap.md`](docs/web-hoc-tap.md), [`docs/kham-pha-di-san.md`](docs/kham-pha-di-san.md) (khám phá di sản công khai);
luồng lớp, học sinh và tài khoản học sinh: [`docs/lop-hoc-sinh.md`](docs/lop-hoc-sinh.md);
kiểm thử trên trình duyệt thật: [`docs/kiem-thu-trinh-duyet.md`](docs/kiem-thu-trinh-duyet.md).

## Yêu cầu

| Công cụ | Phiên bản |
|---|---|
| Node.js | ≥ 22.22 (máy nhóm dùng 24.19) |
| npm | ≥ 10 (máy nhóm dùng 11.19; workspaces cần npm 7 trở lên) |
| Backend DSVHVN | chạy ở `http://localhost:5080` (xem README của backend) |

## Chạy trên máy

```bash
npm install              # cài cho cả ba workspace, một node_modules ở thư mục gốc
npm run dev:quan-tri     # web quản trị   http://localhost:5173
npm run dev:hoc-tap      # web học tập    http://localhost:5174
```

Hai cổng là cố định (`strictPort`). Backend phải cho phép cả hai origin trong `Cors:AllowedOrigins`
(`http://localhost:5173`, `http://localhost:5174`); liên kết đặt mật khẩu trong thư (`App:FrontendBaseUrl` +
`App:SetPasswordPath` = `/dat-mat-khau`) trỏ về web quản trị.

Tài khoản: không có trang đăng ký. Backend seed 4 tài khoản quản trị hệ thống (`admin.nho`, `admin.lam`, `admin.trieu`,
`admin.huy`; mật khẩu trong User Secrets `Seed:AdminPassword` của backend). Quản trị hệ thống tạo trường kèm quản trị
trường đầu tiên ở `/quan-tri/truong/moi`; quản trị trường tạo giáo viên ở `/truong/giao-vien`. Ở môi trường dev, thư đặt
mật khẩu được ghi ra log của API. Tài khoản học sinh do giáo viên tạo khi thêm học sinh vào lớp (chưa có trong bản này).

## Lệnh (chạy ở thư mục gốc)

| Lệnh | Việc |
|---|---|
| `npm run dev:quan-tri` · `npm run dev:hoc-tap` | Vite dev server của từng web |
| `npm run lint` | oxlint cho cả ba workspace, coi cảnh báo là lỗi |
| `npm run typecheck` | `tsc` chế độ nghiêm ngặt cho cả ba workspace |
| `npm test` | Vitest (jsdom) của cả ba workspace |
| `npm run build` | Build hai web ra `apps/*/dist/` (gói dùng chung không build riêng, Vite dịch thẳng mã nguồn) |
| `npm run gen:tokens` | Sinh `packages/dung-chung/src/styles/tokens.css` và `theme.css` từ `packages/dung-chung/design/tokens.json` |
| `npm run check:tokens` | Kiểm hai tệp CSS còn khớp `tokens.json` |
| `npm run smoke -w @dsvhvn/web-quan-tri` | Kiểm thử web quản trị trên Edge/Chrome thật với API thật; cần `API_LOG`, `ADMIN_PASSWORD` |
| `npm run smoke:di-san -w @dsvhvn/web-quan-tri` | Kiểm thử luồng Kho di sản trên Edge/Chrome thật; cần `ADMIN_PASSWORD`, chạy với database tạm mới |

Chạy riêng một workspace: `npm test -w @dsvhvn/web-hoc-tap`, `npm run build -w @dsvhvn/web-quan-tri`…

## Biến môi trường

| Ứng dụng | Biến | Ý nghĩa | Giá trị dev |
|---|---|---|---|
| Cả hai | `VITE_API_BASE_URL` | Gốc API **gồm cả** tiền tố `/api/v1`, không có `/` ở cuối | `http://localhost:5080/api/v1` |
| Web quản trị | `VITE_LEARNING_WEB_URL` | Địa chỉ web học tập (liên kết "Mở trang khám phá di sản", dòng nhắc học sinh) | `http://localhost:5174` |
| Web học tập | `VITE_ADMIN_WEB_URL` | Địa chỉ web quản trị (dòng "Thầy cô đăng nhập ở trang quản trị") | `http://localhost:5173` |

- Mỗi ứng dụng có `.env.development` (trong git) và `.env.example`. Đổi trên máy mình: tạo `.env.development.local` trong
  thư mục của ứng dụng (tệp `*.local` không vào git).
- `npm run build` là chế độ production: thiếu biến thì ứng dụng dừng ngay khi mở và báo lỗi, không tự trỏ về localhost.

## Cấu trúc

```
package.json                 workspaces + lệnh chung
tsconfig.base.json           tùy chọn TypeScript chung (strict, bundler)
.oxlintrc.json               luật lint chung
docs/                        tài liệu hai ứng dụng, kết quả kiểm thử trên trình duyệt
packages/dung-chung/
  design/tokens.json         nguồn design token (bản sao của doc/design/tokens.json)
  scripts/gen-tokens.mjs     bộ sinh CSS variables
  src/api/                   tầng gọi API (khuôn phản hồi chung, Bearer, X-Correlation-Id, mã lỗi theo nghĩa), kiểu dữ
                             liệu, endpoint của học sinh (web học tập và app mobile dùng chung)
  src/auth/                  phiên đăng nhập (chỉ access token; nơi lưu do từng ứng dụng chọn)
  src/theme/                 bốn bộ giao diện (mặc định, cấp 1, 2, 3), suy cấp học từ khối lớp, biến CSS, kiểm tương phản
  src/ui/                    component web: Button, ô nhập, Modal, ConfirmDialog, bảng, phân trang, Tabs, Toast…
  src/validation/            quy tắc mật khẩu, tên đăng nhập, email, số điện thoại, mã học sinh
  src/messages.ts            câu thông báo tiếng Việt (tên hằng theo nghĩa), format.ts nhãn tiếng Việt và giờ Việt Nam
  src/styles/                tokens.css, theme.css (sinh tự động), nen.css
apps/web-quan-tri/
  src/access/                bảng 36 màn hình + ma trận phân quyền, route guard
  src/app/                   router, React Query, nạp lười ba khu làm việc
  src/areas/                 khung khu giáo viên, quản trị trường, quản trị hệ thống
  src/components/            khung đăng nhập, khung khu làm việc, menu tài khoản, biểu mẫu tài khoản…
  src/lib/                   lớp gọi API của ứng dụng, phiên đăng nhập (localStorage), tham số danh sách trên URL
  src/pages/                 màn hình (đăng nhập, mật khẩu, hồ sơ, trường, giáo viên, nhật ký, lỗi)
  scripts/smoke.mjs          kiểm thử trên trình duyệt thật
apps/web-hoc-tap/
  src/access/                bảng 14 màn hình, route guard (khách / học sinh / đang bị buộc đổi mật khẩu)
  src/theme/                 ThemeProvider (ghi biến CSS theo cấp học lên <html>), hình minh họa theo trạng thái
  src/pages/                 trang chủ, học sinh đăng nhập, đổi mật khẩu, trang học của em
  src/components/layout/     thanh điều hướng trên, menu tài khoản của học sinh
```

## Design token và bộ giao diện theo cấp học

`packages/dung-chung/design/tokens.json` là bản sao của `doc/design/tokens.json` để repo tự đủ. Sửa token thì sửa ở
`doc/design`, chép sang đây rồi chạy `npm run gen:tokens`. Hai tệp CSS sinh ra có trong git; test
`src/styles/tokens.test.ts` báo lỗi nếu chúng lệch với `tokens.json`.

- Ba lớp màu: primitive `--color-*` → semantic `--dsv-color-*` → component `--dsv-<component>-*`. Tailwind chỉ có
  utility cho lớp semantic (`bg-primary`, `text-on-surface`…); bảng màu mặc định của Tailwind bị tắt.
- Chữ: một utility cho mỗi vai trò chữ — `type-display-xl`, `type-h1` … `type-label-kicker`, `type-mono-label`.
- Breakpoint riêng `dsvsm:` 481 · `dsvmd:` 841 · `dsvlg:` 1200 · `dsvxl:` 1490.
- Font: Be Vietnam Pro, Playfair Display, JetBrains Mono từ Google Fonts (subset `vietnamese`).
- Dark mode chỉ bật trong vùng có `data-theme="dark"` hoặc `data-theme="system"` (khu quản trị hệ thống).
- **Bộ giao diện theo cấp học** (`packages/dung-chung/src/theme/learningThemes.ts`): cấp suy từ khối lớp (1-5 cấp 1,
  6-9 cấp 2, 10-12 cấp 3). Mỗi bộ chỉ khác giá trị token — màu, cỡ chữ (chữ thân, câu hỏi, nút), bo góc, vùng bấm và
  khoảng cách, bộ hình minh họa theo trạng thái, cờ hiệu ứng chúc mừng; một bố cục, một bộ component, một bộ câu chữ.
  Web học tập ghi các giá trị thành biến CSS trên `<html>` (ghi đè token ngữ nghĩa của design system); app mobile dùng
  thẳng đối tượng theme. Test kiểm tương phản WCAG AA từng cặp chữ / nền của cả bốn bộ và ngưỡng cỡ chữ, vùng bấm.

## Ảnh

Ba ảnh ở `apps/web-quan-tri/public/images/auth/` dùng cho khung Đăng nhập và Quên / đặt mật khẩu, lấy từ Wikimedia
Commons đúng như bản Figma. Chỉ dùng cho bản phát triển; thay bằng ảnh có bản quyền của dự án trước khi phát hành.

| Tệp | Nguồn | Giấy phép · tác giả |
|---|---|---|
| `chua-cau-hoi-an.jpg` | File:Hội An, Chùa Cầu, 2020-01 CN-01.jpg | CC BY-SA 4.0 · Steffen Schmitz |
| `van-mieu-ha-noi.jpg` | File:Main gate of the Temple of Literature, Hanoi, Vietnam, 20240123 0929 3068.jpg | CC BY 4.0 · Jakub Hałun |
| `ngo-mon-hue.jpg` | File:Meridian Gate, Hue (I).jpg | CC BY 4.0 · Supanut Arun |

Hình minh họa của web học tập hiện là hình giữ chỗ vẽ bằng SVG (`apps/web-hoc-tap/src/theme/Illustration.tsx`); tranh
thật đặt ở `apps/web-hoc-tap/public/hinh-minh-hoa/<bộ hình>/<trạng thái>.svg` khi có.
