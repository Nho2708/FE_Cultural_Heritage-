# Web quản trị — nền tảng tài khoản và quản lý tổ chức

Một ứng dụng React gộp ba khu làm việc: giáo viên (`/giao-vien`), quản trị trường (`/truong`), quản trị hệ thống
(`/quan-tri`); menu thanh bên theo vai trò. Tài khoản học sinh không đăng nhập ở đây (học sinh dùng web học tập hoặc app
mobile). Bản này dựng phần nền tảng: đăng nhập, đặt mật khẩu qua email, hồ sơ cá nhân, thông tin trường, giáo viên của
trường, quản lý trường, nhật ký thao tác — trên API của backend chạy CSDL v3.

| Mục | Giá trị |
|---|---|
| Chức năng | Đăng nhập web quản trị · Đặt mật khẩu qua email · Hồ sơ cá nhân · Quản lý thông tin trường · Quản lý tài khoản giáo viên · Xem nhật ký thao tác |
| Màn hình dựng | Lớp học · Chi tiết lớp (tab Học sinh), Thêm học sinh, Phiếu đăng nhập ([lop-hoc-sinh.md](lop-hoc-sinh.md)) · Đăng nhập · Quên và đặt mật khẩu · Hồ sơ cá nhân · Trường và gói (tab Thông tin trường) · Giáo viên của trường · Biểu mẫu tài khoản · Quản lý trường · Chi tiết trường · Nhật ký thao tác · trang 403, 404, lỗi hệ thống |
| Backend | `BE_Cultural_Heritage-`, tài liệu `docs/nen-tang-to-chuc.md` |

## 1. Route và màn hình

Nguồn duy nhất: `apps/web-quan-tri/src/access/screens.ts` — đủ **36 màn hình** của web quản trị (xác thực và tài khoản 3,
giáo viên 18, quản trị trường 6, quản trị hệ thống 9; 10 hộp thoại không có URL), đúng tên, route và cột vai trò của
ma trận phân quyền. Khóa màn hình đặt theo nghĩa (`login`, `schoolTeachers`, `auditLog`…). Màn hình chưa dựng hiện
`PendingScreen` ("Đang xây dựng") với đúng guard; khi dựng chỉ thay phần tử trong `BUILT` của `src/app/router.tsx`.

| Khu | Tiền tố | Ai vào | Khung |
|---|---|---|---|
| Xác thực | `/dang-nhap`, `/quen-mat-khau`, `/dat-mat-khau` | Chỉ khách | Thanh trên có chữ nhận diện "Trang quản trị" và "Mở trang khám phá di sản" (web học tập, tab mới) |
| `/` | — | Mọi người | Khách → Đăng nhập; người đã đăng nhập → trang mặc định của vai trò |
| Hồ sơ cá nhân | `/tai-khoan` | Ba vai trò | Hiện trong khu làm việc của người đang đăng nhập |
| Giáo viên | `/giao-vien` | TEACHER | Thanh bên: Lớp học · Bài học · Ngân hàng câu hỏi · Bài kiểm tra |
| Quản trị trường | `/truong` | ORG_ADMIN | Thanh bên: Trường và gói · Giáo viên (thêm "Tổng quan" khi màn hình này được dựng) |
| Quản trị hệ thống | `/quan-tri` | ADMIN | Thanh bên: Trường · Di sản · Câu hỏi · Gói dịch vụ · Nhật ký; dark mode theo hệ điều hành |

Ba khu làm việc và màn hình của chúng tách chunk riêng, chỉ tải sau khi cổng khu cho qua. Chân thanh bên của mọi khu có
"Mở trang khám phá di sản" dẫn sang web học tập.

### 1.1. Đã dựng

| Route | Màn hình | Ai mở | Ghi chú |
|---|---|---|---|
| `/dang-nhap` | Đăng nhập | Khách | Một ô "Email hoặc tên đăng nhập"; không có "Đăng ký". Sai thông tin (kể cả tài khoản học sinh) và tài khoản bị chặn báo In line. Dòng cố định "Học sinh đăng nhập ở trang Học di sản hoặc ứng dụng trên điện thoại" kèm đường dẫn. Thành công → trang bị chặn trước đó nếu vai trò mở được, còn lại trang mặc định theo vai trò |
| `/quen-mat-khau` | Quên mật khẩu | Khách | Luôn cùng một câu của máy chủ; nút đổi thành "Gửi lại liên kết" |
| `/dat-mat-khau?token=…` | Đặt mật khẩu | Khách | Kiểm liên kết trước, hiện tên đăng nhập và hạn; mật khẩu mới + nhập lại; dùng chung cho tài khoản mới (48 giờ) và quên mật khẩu (30 phút). Hỏng → báo lỗi + "Gửi lại liên kết". Xong → Đăng nhập, tên đăng nhập điền sẵn |
| `/tai-khoan` | Hồ sơ cá nhân | 3 vai trò | `?tab=thong-tin` (mặc định) · `doi-mat-khau`. Sửa họ tên, số điện thoại, ảnh (đường dẫn); email, tên đăng nhập, vai trò, trường chỉ đọc. Đổi mật khẩu: mật khẩu mới phải khác mật khẩu cũ, nhận access token mới |
| `/truong` | Tổng quan trường | ORG_ADMIN | Tới khi dựng: chuyển tới Giáo viên của trường |
| `/truong/thong-tin` | Trường và gói, tab Thông tin trường | ORG_ADMIN | Tên trường chỉ đọc; sửa địa chỉ, số điện thoại, email. Gói hiện tại hiện chỉ đọc bên cạnh |
| `/truong/giao-vien` | Giáo viên của trường | ORG_ADMIN | Bảng + bộ đếm "x / tối đa giáo viên"; "Thêm giáo viên" khóa khi đủ hạn mức hoặc không có gói hiệu lực; khóa / mở, xóa mềm; tìm, lọc trạng thái, trang trên URL |
| (hộp thoại) | Biểu mẫu tài khoản | ORG_ADMIN (giáo viên), ADMIN (quản trị trường) | Họ tên, tên đăng nhập, email, số điện thoại; vai trò cố định theo nơi mở; lỗi trùng dưới đúng ô |
| `/quan-tri` | Tổng quan và doanh thu | ADMIN | Tới khi dựng: chuyển tới Quản lý trường |
| `/quan-tri/truong` | Quản lý trường | ADMIN | Bảng trường; tìm, lọc; "Tạo trường"; ngừng trường |
| `/quan-tri/truong/moi` | Chi tiết trường, tạo mới | ADMIN | Thông tin trường + quản trị trường đầu tiên trong một lần lưu; lỗi `orgAdmin.*` hiện dưới đúng ô |
| `/quan-tri/truong/:truong` | Chi tiết trường, xem / sửa | ADMIN | Sửa thông tin (khóa khi trường đã ngừng); gói hiện tại chỉ đọc; quản trị trường: khóa / mở, thêm; ngừng trường |
| `/quan-tri/nhat-ky` | Nhật ký thao tác | ADMIN | Chỉ đọc. Lọc người làm, vai trò (có Học sinh, Hệ thống), hành động (21 mã), đối tượng, từ ngày / đến ngày (gõ ngày/tháng/năm, giờ Việt Nam); mở dòng xem giá trị cũ / mới bằng nhãn tiếng Việt |
| (tại chỗ) | 403 | — | Giữ URL; hiện trong khu làm việc của chính người dùng |
| `*` | 404 | Mọi người | Có cả trong từng khu làm việc |

### 1.2. Route guard

`resolveAccess(màn hình, vai trò)` (`src/access/access.ts`) trả một trong 4 kết quả, `RequireAccess` thực hiện:

| Kết quả | Khi nào | Giao diện |
|---|---|---|
| `allow` | Vai trò có trong cột ma trận | Hiện màn hình |
| `login` | Khách mở màn hình cần đăng nhập | Chuyển Đăng nhập, nhớ `from`; riêng lúc vừa đăng xuất: về Đăng nhập, không nhớ trang cũ |
| `signed-in` | Đã đăng nhập mà mở Đăng nhập, Quên / đặt mật khẩu | Về trang vừa chọn khi đăng nhập, hoặc trang mặc định của vai trò |
| `forbidden` | Vai trò không có quyền | Trang 403 |

Trang mặc định: giáo viên → Hồ sơ cá nhân (màn hình Lớp học đã dựng nhưng trang mặc định chưa đổi sang đó; đổi ở `roleHome` khi chốt); quản trị trường → Giáo viên của trường; quản trị hệ
thống → Quản lý trường. Test kiểm số màn hình theo cột ma trận: **2 / 19 / 7 / 12** (khách / giáo viên / quản trị trường
/ quản trị hệ thống). Guard chỉ để điều hướng; backend kiểm vai trò và trường ở mọi endpoint.

## 2. Endpoint đang dùng

`VITE_API_BASE_URL` = gốc API gồm `/api/v1`. Mọi yêu cầu gửi `X-Correlation-Id`.

| Màn hình | Endpoint |
|---|---|
| Đăng nhập | `POST /auth/login` `{ emailOrUsername, password }` |
| Quên và đặt mật khẩu | `POST /auth/forgot-password` · `POST /auth/password-token/check` · `POST /auth/set-password` |
| Hồ sơ cá nhân | `GET /me` (khi mở ứng dụng) · `PUT /me` · `PUT /me/password` |
| Trường và gói, thanh báo gói | `GET /org` · `PUT /org` |
| Giáo viên của trường, Biểu mẫu tài khoản | `GET /org/teachers?keyword&status&page&pageSize` · `POST /org/teachers` · `POST /org/teachers/{id}/lock` · `/unlock` · `DELETE /org/teachers/{id}` |
| Quản lý trường | `GET /admin/organizations?keyword&status&page&pageSize` · `DELETE /admin/organizations/{id}` |
| Chi tiết trường | `POST /admin/organizations` · `GET` / `PUT /admin/organizations/{id}` · `POST /admin/organizations/{id}/org-admins` · `…/org-admins/{userId}/lock` · `/unlock` |
| Nhật ký thao tác | `GET /admin/audit-logs?actor&actorRole&action&targetType&from&to&page&pageSize` |

### Khớp API của backend trên CSDL v3

| Chỗ | Giao diện |
|---|---|
| `errorCode` theo nghĩa | `ERROR_CODES` ở gói dùng chung trùng `MessageCodes` của backend (`INVALID_CREDENTIALS`, `ACCOUNT_BLOCKED`, `PASSWORD_LINK_INVALID`, `SAME_PASSWORD`, `DUPLICATE`, `TEACHER_LIMIT_REACHED`, `FORBIDDEN`, `BLOCKED`, `SYSTEM_ERROR`…); giao diện xử lý theo mã, không theo câu chữ |
| Vai trò | `Role` có `STUDENT`; web quản trị chỉ nhận ba vai trò người lớn (`StaffRole`), phiên có vai trò khác bị bỏ |
| Trường nullable theo CSDL | `email` có thể `null` (học sinh); `username`, `fullName`, `status`, `createdAt` của hồ sơ và tài khoản, `planName`, `status` của gói, `username`, `expiresAt` của kết quả kiểm liên kết khai báo nullable; giao diện hiện gạch ngang hoặc bỏ dòng khi trống |
| `mustChangePassword` | Có trong hồ sơ; tài khoản người lớn luôn `false` (cờ dành cho học sinh ở web học tập) |
| Nhật ký | 21 mã hành động (thêm tạo tài khoản học sinh, đặt lại mật khẩu học sinh, mở lại học sinh), vai trò Học sinh, đối tượng Lớp học; nhãn trùng backend ("Đăng nhập web quản trị", "Vô hiệu hoặc xóa học sinh") |
| Câu thông báo | Theo danh mục mới: nhập lại mật khẩu không khớp "Hai lần nhập mật khẩu chưa giống nhau.", mật khẩu mới trùng "Mật khẩu mới phải khác mật khẩu cũ.", phiên bị máy chủ kết thúc "Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.", thanh báo gói hết hiệu lực theo câu mới |

## 3. Phiên đăng nhập và tầng gọi API

| Việc | Cách làm |
|---|---|
| Phiên | Chỉ access token 8 giờ, không refresh token. `localStorage` khóa `dsvhvn.quan-tri.phien` (token, hạn, hồ sơ); khóa của các bản trước bị dọn khi mở ứng dụng |
| Hết hạn | Tới hạn thì phiên tự kết thúc, route guard đưa về Đăng nhập (nhớ trang đang mở) với câu "Phiên đăng nhập đã hết" |
| Máy chủ trả 401 | Tài khoản bị khóa, trường bị ngừng → xóa phiên, Đăng nhập hiện lý do của máy chủ; token hết hạn, mật khẩu đổi ở nơi khác → "Phiên đăng nhập đã hết". 403 (sai vai trò) không xóa phiên. 401 của token cũ không xóa phiên mới vừa đăng nhập ở tab khác |
| Nhiều tab | Sự kiện `storage`: đăng nhập, đăng xuất, đổi mật khẩu ở tab này cập nhật tab khác |
| Đăng xuất | Hộp xác nhận chung → xóa token trên máy → màn hình Đăng nhập |
| Lỗi | `ApiError { status, code, message, fieldErrors, traceId }`. Lỗi theo trường (kể cả khóa lồng `orgAdmin.email`) hiện dưới đúng ô, còn lại In line; lỗi mạng hoặc phản hồi lạ là câu lỗi hệ thống |
| Dữ liệu | React Query; khóa ở `src/lib/api/queryKeys.ts`; ghi xong làm mới nhóm liên quan |

Tầng gọi API, phiên, kiểu dữ liệu, câu thông báo, kiểm tra hợp lệ và component nằm ở gói `@dsvhvn/dung-chung`; web quản
trị chỉ gắn chúng với phiên của mình (`src/lib/api/client.ts`, `src/lib/auth/session.ts`) và khai báo endpoint
(`src/lib/api/endpoints.ts`).

## 4. Quyết định và điểm cần biết

| # | Nội dung | Lý do |
|---:|---|---|
| 1 | Trang khám phá công khai (`/`, `/di-san`, `/ban-do`, `/dong-thoi-gian`) và lối vào bằng mã đã chuyển sang web học tập; ở đây các đường dẫn đó là 404 | Quyết định tách hai ứng dụng: web quản trị gộp, web học tập riêng |
| 2 | Hồ sơ cá nhân hiện trong khu làm việc của vai trò; trang 403 hiện trong khu của chính người dùng | Web quản trị không còn thanh điều hướng công khai; người dùng luôn có thanh bên và menu tài khoản của mình |
| 3 | Đăng xuất về màn hình Đăng nhập | Web quản trị không có trang chủ công khai |
| 4 | Trường và gói chỉ có tab "Thông tin trường"; gói hiện tại hiện chỉ đọc cạnh biểu mẫu | Tab gói, hóa đơn làm cùng chức năng mua gói qua VNPay |
| 5 | Thanh báo gói hết hiệu lực chỉ có ở khu quản trị trường | Giáo viên chưa có API đọc gói của trường; thêm cùng đồng hồ hạn mức AI |
| 6 | Trang 404 dùng câu trung tính "Không tìm thấy trang" | Danh mục thông báo chưa có câu riêng cho 404 — **đề nghị bổ sung** (backend cũng đề nghị) |
| 7 | Ô ngày ở Nhật ký thao tác là ô chữ "ngày/tháng/năm" | `<input type="date">` hiện "mm/dd/yyyy" trên trình duyệt tiếng Anh |
| 8 | Hồ sơ cá nhân sửa ảnh đại diện bằng đường dẫn (http/https) | Chưa có kho tệp; tải ảnh lên làm cùng chức năng có ảnh và media |
| 9 | Phiên lưu ở `localStorage` | Giữ đăng nhập khi tải lại trang và đồng bộ nhiều tab cho người lớn dùng máy riêng. Kế hoạch kiến trúc ghi "bộ nhớ trang + sessionStorage" cho cả hai web: web học tập đã dùng `sessionStorage`; đổi web quản trị chỉ cần đổi `browserStorage('local')` trong `src/lib/auth/session.ts` nếu nhóm chốt |

## 5. Kiểm thử

- `npm test -w @dsvhvn/web-quan-tri`: bảng 36 màn hình và ma trận 2 / 19 / 7 / 12, route guard trên cây route thật
  (khách → Đăng nhập, 403 trong khu của mình, trang mặc định theo vai trò, 404, đăng xuất về Đăng nhập), màn hình Đăng
  nhập, Quên / đặt mật khẩu, Hồ sơ, Giáo viên của trường, Chi tiết trường, Nhật ký thao tác với API giả.
- Tầng gọi API, phiên, định dạng, kiểm tra hợp lệ, token: test của `@dsvhvn/dung-chung`.
- `npm run smoke -w @dsvhvn/web-quan-tri`: 45 bước trên Edge thật với API thật — [`kiem-thu-trinh-duyet.md`](kiem-thu-trinh-duyet.md).
