# Kiểm thử web quản trị trên trình duyệt thật với API thật

> Chạy ngày 29/09/2026 (+07) sau khi tách hai ứng dụng, với backend chạy CSDL v3.
> Kết quả: **45/45 bước đạt**, không có lỗi JavaScript trên trang. Script: [`apps/web-quan-tri/scripts/smoke.mjs`](../apps/web-quan-tri/scripts/smoke.mjs).

## Môi trường

| Mục | Giá trị |
|---|---|
| Máy | Windows 11, Node 24.19 |
| Trình duyệt | Microsoft Edge headless qua `playwright-core` (dùng trình duyệt đã cài, không tải thêm) |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5089`, LocalDB **database tạm cho lần chạy** `dsvhvn_fe_kiem_thu_smoke` (migrate + seed lúc khởi động qua `ConnectionStrings__Default`, **đã xóa sau khi chạy**), mật khẩu quản trị hệ thống seed qua `Seed__AdminPassword`, `Cors__AllowedOrigins__0` và `App__FrontendBaseUrl` trỏ về `http://localhost:5183`, `App__SetPasswordPath=/dat-mat-khau` |
| Giao diện | `VITE_API_BASE_URL=http://localhost:5089/api/v1 npx vite --port 5183 --strictPort` trong `apps/web-quan-tri` |
| Lệnh | `BASE_URL=http://localhost:5183 API_LOG=<log của API> ADMIN_PASSWORD=<mật khẩu seed> npm run smoke -w @dsvhvn/web-quan-tri` |
| Khung | 1440 × 900 và 390 × 844 (điện thoại) |

Cách chạy thông thường (API ở 5080 với CSDL dev, web quản trị ở 5173) chỉ cần `API_LOG` và `ADMIN_PASSWORD`. Lần chạy này
dùng cổng và database riêng để không đụng CSDL dev. Liên kết đặt mật khẩu đọc từ thư giả trong log của API. Dữ liệu tạo
mới có hậu tố thời gian nên chạy lại được nhiều lần. Chạy trong Git Bash thì đặt `MSYS_NO_PATHCONV=1` khi khởi động API,
nếu không `App__SetPasswordPath=/dat-mat-khau` bị đổi thành đường dẫn Windows.

## Các bước

| # | Bước | Kết quả |
|---:|---|---|
| 1 | Khách mở `/tai-khoan?tab=doi-mat-khau` | Chuyển `/dang-nhap` |
| 2 | Đăng nhập không có liên kết "Đăng ký" | Đạt |
| 3 | Dòng cố định chỉ học sinh sang web học tập | Đạt |
| 4 | Để trống | Báo bắt buộc nhập dưới 2 ô |
| 5 | Sai mật khẩu | "Email, tên đăng nhập hoặc mật khẩu không đúng." In line |
| 6 | Khách mở `/quan-tri/nhat-ky` → đăng nhập bằng **tên đăng nhập** `admin.nho` | Quay lại đúng `/quan-tri/nhat-ky` |
| 7 | Thanh bên → "Trường" | Quản lý trường `/quan-tri/truong` |
| 8 | Tạo trường để trống | Báo bắt buộc nhập cho tên trường và 3 ô của quản trị trường |
| 9 | Tạo trường + quản trị trường đầu tiên | Toast "Đã gửi email đặt mật khẩu…", sang `/quan-tri/truong/{id}` |
| 10 | Gói hiện tại của trường mới | "Miễn phí" · "Đang hiệu lực" |
| 11 | Tạo trường khác với email quản trị trường trùng | 409 → báo trùng dưới ô Email của nhóm quản trị trường, không tạo trường |
| 12 | Quản lý trường `?tu-khoa=<hậu tố>` | Chỉ 1 trường |
| 13 | Đang đăng nhập mở liên kết `/dat-mat-khau` | Về trang của vai trò |
| 14 | Đăng xuất | Hộp xác nhận chung → màn hình Đăng nhập, xóa `dsvhvn.quan-tri.phien` |
| 15 | Mở liên kết trong thư | Kiểm liên kết, hiện tên đăng nhập |
| 16 | Mật khẩu `matkhau1`, nhập lại khác | Câu quy tắc mật khẩu + "Hai lần nhập mật khẩu chưa giống nhau." |
| 17 | Đặt mật khẩu lần đầu | Đăng nhập, tên đăng nhập điền sẵn |
| 18 | Mở lại liên kết đã dùng | "Liên kết đã hết hạn…" + "Gửi lại liên kết" |
| 19 | Quản trị trường đăng nhập bằng **email** | Giáo viên của trường `/truong/giao-vien` |
| 20 | Bộ đếm hạn mức | "0 / 10 giáo viên" (gói Miễn phí môi trường dev) |
| 21 | Thêm giáo viên | Toast "Đã gửi email đặt mật khẩu…", dòng mới, bộ đếm "1 / 10" |
| 22 | Thêm giáo viên trùng tên đăng nhập | Báo trùng dưới ô trong hộp thoại |
| 23 | Trường và gói: tên trường | Chỉ đọc |
| 24 | Trường và gói: sửa địa chỉ, số điện thoại | "Lưu thông tin trường thành công." |
| 25 | Giáo viên đặt mật khẩu, đăng nhập | Hồ sơ cá nhân `/tai-khoan` trong khu giáo viên |
| 26 | Hồ sơ cá nhân | Hiện tên trường của giáo viên |
| 27 | Hồ sơ cá nhân: sửa số điện thoại | "Lưu hồ sơ thành công." |
| 28 | `/giao-vien` | `/giao-vien/lop` ("Đang xây dựng") trong khu có thanh bên |
| 29 | Giáo viên mở `/truong/giao-vien` | 403 "Bạn không có quyền thực hiện thao tác này." |
| 30 | Quản trị trường bấm "Khóa" | Hộp xác nhận "Bạn có chắc muốn khóa tài khoản "{họ tên}"?" |
| 31 | Xác nhận khóa | "Khóa tài khoản thành công.", trạng thái "Bị khóa" |
| 32 | Giáo viên (đang mở phiên ở tab khác) tải lại trang | Bị đẩy về Đăng nhập với "Tài khoản không đăng nhập được. …" (khóa có hiệu lực ngay) |
| 33 | Mở khóa | Giáo viên đăng nhập lại được |
| 34 | Giáo viên đổi mật khẩu | "Đổi mật khẩu thành công.", phiên nhận token mới và vẫn dùng được |
| 35 | Quên mật khẩu | Luôn cùng một câu, liên kết 30 phút |
| 36 | Đặt lại qua liên kết 30 phút | Đăng nhập bằng mật khẩu mới |
| 37 | Quản trị hệ thống đăng nhập | Trang mặc định Quản lý trường |
| 38 | Nhật ký thao tác lọc hành động "Tạo trường" | URL `?hanh-dong=tao-truong`, chỉ dòng "Tạo trường" |
| 39 | Mở một dòng nhật ký | "Giá trị mới" với nhãn tiếng Việt |
| 40 | Ngừng trường ở Chi tiết trường | "Ngừng trường thành công.", trang chuyển chỉ đọc |
| 41 | Quản trị trường của trường đã ngừng đăng nhập | "Tài khoản không đăng nhập được. …" |
| 42 | Đường dẫn lạ | 404 |
| 43 | 390px màn hình Đăng nhập | Không có thanh cuộn ngang |
| 44 | 390px khu quản trị | Hàng điều hướng thu gọn, không tràn ngang |
| 45 | Lỗi JavaScript trên trang | Không có |

## Web học tập

Backend chưa có endpoint đăng nhập học sinh nên chưa có kịch bản đầu cuối cho web học tập. Đã chạy thử trên Edge thật
với phiên học sinh giả và hồ sơ giả (khối 3, 7, 11 và tài khoản đang bị buộc đổi mật khẩu) ở 1280 × 860, 390 × 844,
360 × 640: đúng bộ giao diện theo cấp, không tràn ngang, không lỗi JavaScript; đăng nhập với backend hiện tại hiện câu lỗi
hệ thống.
