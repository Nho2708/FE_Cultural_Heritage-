# Web học tập — khung tối thiểu

Ứng dụng React thứ hai (tên hiển thị "Học di sản"), tách khỏi web quản trị: khám phá di sản công khai cho khách và học
sinh, khu học của học sinh đăng nhập bằng **mã học sinh + mật khẩu**. Giao diện đổi theo **cấp học** của học sinh (suy từ
khối lớp) bằng bộ token; một bố cục, một bộ component, một bộ câu chữ cho cả ba cấp. Bản này có: năm màn hình khám phá công khai (xem [kham-pha-di-san.md](kham-pha-di-san.md)), học sinh đăng nhập, đổi mật khẩu lần đầu, trang học của em (ba bản bố cục theo cấp) và bốn bộ giao diện. Các
màn hình khác đã có route và guard, hiện "Đang xây dựng".

## 1. Màn hình

Nguồn duy nhất: `apps/web-hoc-tap/src/access/screens.ts` — 14 màn hình (5 khám phá, 9 khu học; 1 hộp thoại).

| Route | Màn hình | Ai mở | Bản này |
|---|---|---|---|
| `/` | Trang chủ | Khách, học sinh | Đã dựng ([khám phá di sản](kham-pha-di-san.md)): ảnh lớn đầu trang, ô tìm kiếm, di sản nổi bật, khám phá theo vùng và loại, giới thiệu app; nút "Học sinh đăng nhập" hoặc "Vào trang học của em"; không có ô nhập mã |
| `/di-san`, `/ban-do`, `/di-san/:diSan`, `/dong-thoi-gian[/:diSan]` | Tìm kiếm và lọc, bản đồ, chi tiết di sản, dòng thời gian | Khách, học sinh | Đã dựng ([khám phá di sản](kham-pha-di-san.md)) |
| `/dang-nhap` | Học sinh đăng nhập | Khách | Đã dựng |
| `/doi-mat-khau` | Đổi mật khẩu | Học sinh | Đã dựng (chế độ bắt buộc và tự đổi) |
| `/hoc` | Trang học của em | Học sinh | Ba bản bố cục theo cấp (cấp 1, 2, 3): lời chào, thông tin của em, Lớp của em, lối vào nhập mã bài học; các khối bài học, gợi ý, huy hiệu dựng ở luồng sau ([lop-hoc-sinh.md](lop-hoc-sinh.md)) |
| `/nhap-ma`, `/bai-hoc/:maBaiHoc`, `/bai-hoc/:maBaiHoc/kiem-tra/:baiKiemTra` (toàn màn hình), `/ket-qua/:luotLam`, `/tien-do` | Nhập mã, bài học, làm bài kiểm tra, kết quả, tiến độ | Học sinh | Đang xây dựng |

Thanh điều hướng trên: chưa đăng nhập — Khám phá · Bản đồ · Dòng thời gian · "Học sinh đăng nhập"; học sinh đã đăng nhập
— Trang học · Nhập mã · Tiến độ · Khám phá · Bản đồ · Dòng thời gian · menu tài khoản (họ tên, mã học sinh, lớp; Đổi mật
khẩu; Đăng xuất). Dưới 841px gom vào ngăn kéo. Đăng xuất về trang chủ.

### Route guard

| Kết quả | Khi nào | Giao diện |
|---|---|---|
| `allow` | Đúng vai trò | Hiện màn hình |
| `login` | Khách mở màn hình khu học | Sang Học sinh đăng nhập, nhớ trang; mở từ đường dẫn bài học thì báo "Em hãy đăng nhập để mở bài học. Đăng nhập xong, bài học sẽ tự mở." và mở lại đúng bài |
| `signed-in` | Học sinh đã đăng nhập mở Học sinh đăng nhập | Về trang học |
| `change-password` | Tài khoản đang bị buộc đổi mật khẩu mở bất kỳ màn hình nào khác | Về Đổi mật khẩu, giữ trang đang mở trong `?sau=` để mở tiếp sau khi đổi xong |

## 2. Học sinh đăng nhập và đổi mật khẩu

| Việc | Cách làm |
|---|---|
| Ô mã học sinh | Tự viết hoa, bỏ khoảng trắng và dấu gạch khi gõ ("hs 8k2-qx7" → `HS8K2QX7`); chỉ kiểm bắt buộc nhập, mã sai dạng vẫn gửi để máy chủ trả cùng một câu |
| Dòng cố định | "Quên mật khẩu? Em hãy nhờ thầy cô đặt lại." (không có liên kết quên mật khẩu qua email) và "Thầy cô đăng nhập ở trang quản trị" kèm đường dẫn web quản trị |
| Lỗi | Câu của máy chủ In line (sai mã hoặc mật khẩu; tạm khóa, vô hiệu, lớp đã xóa). Cửa đăng nhập trả 404 hoặc "không có quyền" (máy chủ chưa có endpoint) thì báo câu lỗi hệ thống |
| Sau đăng nhập | Cờ `mustChangePassword` bật → Đổi mật khẩu chế độ bắt buộc; không thì trang bị chặn trước đó hoặc trang học |
| Đổi mật khẩu bắt buộc | Không có thanh điều hướng, không có nút bỏ qua; thanh báo đặt mật khẩu mới; mật khẩu mới + nhập lại (không hỏi mật khẩu hiện tại); danh sách quy tắc đánh dấu khi đạt; máy chủ trả token mới, cờ tắt, vào thẳng trang học (hoặc trang đang chờ) |
| Tự đổi (menu tài khoản) | Thêm ô mật khẩu hiện tại, có nút Hủy |
| Phiên | Chỉ access token; lưu ở `sessionStorage` khóa `dsvhvn.hoc-tap.phien` (mất khi đóng tab — học sinh hay dùng chung máy của trường). Mở ứng dụng thì đọc lại hồ sơ để cập nhật cấp học khi giáo viên sửa khối lớp |

### Endpoint học sinh

Dùng endpoint thật của backend (nhánh `feature/DSVHVN-007-lop-hoc-sinh`); lớp gọi API ở gói dùng chung (`packages/dung-chung/src/api/studentApi.ts`, app mobile dùng lại).
Chi tiết và cách đổi hồ sơ máy chủ sang `StudentProfile`: [lop-hoc-sinh.md](lop-hoc-sinh.md).

| Method | Đường dẫn | Thân | Trả về |
|---|---|---|---|
| POST | `/student/auth/login` (công khai) | `{ studentCode, password }` | `{ tokenType, accessToken, expiresAt, student }` |
| GET | `/student/me` | — | Hồ sơ học sinh (gọi được cả khi đang bị buộc đổi mật khẩu) |
| PUT | `/student/me/password` | `{ currentPassword, newPassword, confirmNewPassword }` (`currentPassword` là `null` ở chế độ bắt buộc) | Như đăng nhập: token mới, token cũ hết dùng |
| GET | `/student/class` | — | Lớp của em (403 `PASSWORD_CHANGE_REQUIRED` khi còn phải đổi mật khẩu) |

Mã lỗi theo nghĩa của backend (`STUDENT_INVALID_CREDENTIALS`, `STUDENT_ACCOUNT_BLOCKED`, `PASSWORD_CHANGE_REQUIRED`, `SAME_PASSWORD`, `PASSWORD_MISMATCH`…); câu chữ
với học sinh xưng "em" do máy chủ trả.

## 3. Bộ giao diện theo cấp học

| Token | Mặc định (khách) | Cấp 1 (khối 1-5) | Cấp 2 (khối 6-9) | Cấp 3 (khối 10-12) |
|---|---|---|---|---|
| Màu chính | Đỏ sơn mài `#A4231F` | Xanh dương tươi `#0057B8`, nền kem, màu nhấn vàng | Xanh ngọc `#0F766E`, màu nhấn cam nhạt | Xám xanh trầm `#334155` |
| Chữ thân / câu hỏi / nút | 16 / 18 / 16 px | 19 / 24 / 18 px, dòng thưa | 17 / 20 / 16 px | 16 / 18 / 16 px |
| Bo góc nút / thẻ / phương án | 8 / 12 / 10 | 16 / 24 / 20 | 10 / 16 / 12 | 4 / 6 / 4 |
| Vùng bấm tối thiểu, khoảng cách khối | 44 px, 24 | 48 px, 32 | 44 px, 24 | 44 px, 16 |
| Bộ hình minh họa | Ảnh di sản | Hình vẽ tay có linh vật | Biểu tượng nét | Biểu tượng tối giản |
| Hiệu ứng chúc mừng | Tắt | Bật | Bật | Tắt |

- Nguồn: `packages/dung-chung/src/theme/learningThemes.ts` (đối tượng theme dùng chung với app mobile).
- `ThemeProvider` chọn bộ theo học sinh đang đăng nhập (ưu tiên `schoolLevel`, không có thì theo khối lớp; khách dùng bộ
  mặc định) và ghi biến CSS lên `<html>` (`data-bo-giao-dien="cap-1"`…). Biến ghi đè token ngữ nghĩa của design system
  (`--dsv-color-*`, `--dsv-text-*`, `--dsv-radius-*`) nên component dùng chung tự đổi theo; thêm `--dsv-question-size`,
  `--dsv-option-radius`, `--dsv-touch-target`, `--dsv-block-gap`, `--dsv-inline-gap` cho khu học.
- Vùng bấm: nút, ô nhập, ô chọn của web học tập có `min-height: var(--dsv-touch-target)`.
- Hình minh họa theo trạng thái (chào, chúc mừng, động viên, trống): `src/theme/Illustration.tsx`, hiện là hình giữ chỗ SVG.
- **Bộ theo cấp học chỉ dùng ở khu học** (trang học, nhập mã, bài học, làm bài kiểm tra, kết quả, tiến độ, đổi mật khẩu).
  Năm màn hình khám phá công khai luôn dùng bộ mặc định, kể cả khi học sinh đã đăng nhập: `ThemeProvider` nằm trong router
  và đọc `handle.area` của route.
- Test: tương phản WCAG AA mọi cặp chữ / nền của bốn bộ; cỡ chữ và vùng bấm tối thiểu theo cấp; mọi bộ cùng một danh sách
  biến CSS; khối 5 → cấp 1, 6 → cấp 2, 12 → cấp 3 ở khu học; trang khám phá công khai luôn bộ mặc định; đăng xuất trở
  lại bộ mặc định.

## 4. Kiểm thử

- `npm test -w @dsvhvn/web-hoc-tap`: bảng màn hình và guard, đăng nhập (chuẩn hóa mã, lần đầu sang đổi mật khẩu, sai
  thông tin, máy chủ chưa có endpoint, mở lại bài học sau đăng nhập), đổi mật khẩu hai chế độ, bộ giao diện theo cấp, năm
  màn hình khám phá (xem [kham-pha-di-san.md](kham-pha-di-san.md)).
- Chạy thử trên Edge thật (390 × 844, 360 × 640, 1280 × 860) với phiên học sinh giả cho ba cấp: đúng bộ giao diện, không
  tràn ngang, không lỗi JavaScript; đăng nhập với backend hiện tại hiện câu lỗi hệ thống (chưa có endpoint).
- Build: bundle khởi đầu khoảng 125 KB gzip (mục tiêu ≤ 300 KB).
- Backend cần thêm `http://localhost:5174` vào `Cors:AllowedOrigins` để web học tập gọi được API.
