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
| 28 | `/giao-vien` | `/giao-vien/lop` (Lớp học) trong khu có thanh bên |
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

Kịch bản đầu cuối của đăng nhập học sinh, đổi mật khẩu lần đầu và Lớp của em chạy trên Chrome thật với API nhánh `feature/DSVHVN-007-lop-hoc-sinh`
và database tạm: xem mục Kiểm thử trong [lop-hoc-sinh.md](lop-hoc-sinh.md).

## Bài học theo cấp (web quản trị và web học tập)

> Chạy ngày 06/10/2026 (+07) với backend nhánh `feature/DSVHVN-008-bai-hoc-theo-cap`. Kết quả: **29/29 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-quan-tri/scripts/smoke-bai-hoc.mjs`](../apps/web-quan-tri/scripts/smoke-bai-hoc.mjs) (`npm run smoke:bai-hoc -w @dsvhvn/web-quan-tri`).

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5095`, LocalDB **database tạm** `dsvhvn_ui_bai_hoc_tmp` (migrate và nạp 20 di sản đợt 1 lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log` (không gửi thư thật), `Ai:Mode` mặc định `Simulated` (không gọi nhà cung cấp AI) |
| Giao diện | `VITE_API_BASE_URL=http://localhost:5095/api/v1 npx vite --port 5195` (web quản trị, `VITE_LEARNING_WEB_URL=http://localhost:5196`) và `--port 5196` (web học tập); đã tắt mọi tiến trình đã bật |
| Chuẩn bị | Gọi thẳng API: xuất bản 4 di sản có dòng thời gian, tạo trường, quản trị trường, giáo viên, lớp khối 3 và lớp khối 8, mỗi lớp một học sinh đã đổi mật khẩu lần đầu. Mọi thao tác với bài học đi qua giao diện |

| # | Bước | Kết quả |
|---:|---|---|
| 1 | Giáo viên đăng nhập web quản trị; Bài học của tôi chưa có bài | Trạng thái rỗng |
| 2 | Tạo bài cho lớp khối 3: chọn lớp, hai di sản, tiêu đề | Mở Soạn bài học cấp 1 |
| 3 | "Soạn nội dung bằng AI", "Lưu nháp", "Xuất bản" | Mã `BH` + 6 ký tự thuộc bảng 32 ký tự; hộp thoại Mã bài học |
| 4 | Mã bài học: đường dẫn tới web học tập; Chiếu lên bảng | Mã chia nhóm `BH xxx xxx`, Esc để thoát |
| 5 | Tạo, soạn, xuất bản bài cho lớp khối 8 | Khung cấp 2 (mốc thời gian nối sự kiện); mã khác mã lớp khối 3 |
| 6 | Bài học của tôi | Hai bài đã xuất bản kèm mã |
| 7 | Nhân bản bài khối 3 sang lớp khối 8 | Cảnh báo khác cấp; bài Nháp chưa có mã ở lớp khối 8 |
| 8 | 390px màn hình Soạn bài học | Không tràn ngang |
| 9 | Học sinh khối 3 đăng nhập, gõ `bh 7f3-k2q` kiểu thường có khoảng trắng và gạch | Mở bài với **bố cục cấp 1**: luồng Nghe chuyện, Xem hình, Chơi, Nhận sao; mỗi lần một đoạn |
| 10 | Cấp 1: Tiếp nhé, tải lại trang | Mở đúng đoạn đang dừng; đi hết tới bước Nhận sao |
| 11 | Học sinh khối 3 gõ mã của lớp khối 8 | Cùng một câu "Mã bài học chưa đúng hoặc không dành cho lớp của em" |
| 12 | Màn hình Nhập mã | Nhớ mã vừa mở trên máy này |
| 13 | Học sinh khối 8 đăng nhập, gõ mã | **Bố cục cấp 2**: ba tab Đọc bài, Dòng thời gian của bài, Bài kiểm tra; các mốc theo năm |
| 14 | 390px bài học cấp 2 | Không tràn ngang |
| 15 | Học sinh khối 8 mở đường dẫn bài của lớp khối 3 | Bị từ chối |
| 16 | Lưu trữ bài khối 8 | Học sinh không mở được bằng mã |
| 17 | Xuất bản lại | Giữ nguyên mã |
| 18 | Lỗi JavaScript và phản hồi 5xx | Không có |

Ghi chú: ảnh của Wikimedia Commons không tải được trong môi trường kiểm thử nên các khung ảnh trống (giao diện vẫn hiện chú thích và ghi công). Bố cục cấp 3 chỉ có test giao diện, chưa chạy trên
trình duyệt thật (lần này dùng lớp khối 3 và khối 8).

## Bài kiểm tra của bài học (web quản trị)

> Chạy ngày 06/10/2026 (+07) với backend nhánh `feature/DSVHVN-011-bai-kiem-tra`. Kết quả: **48/48 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-quan-tri/scripts/smoke-bai-kiem-tra.mjs`](../apps/web-quan-tri/scripts/smoke-bai-kiem-tra.mjs) (`npm run smoke:bai-kiem-tra -w @dsvhvn/web-quan-tri`).

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844, múi giờ Asia/Ho_Chi_Minh |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5180`, LocalDB **database tạm** (tên bắt đầu bằng `dsvhvn_tam_wt_`, migrate và nạp di sản đợt 1 lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log` (không gửi thư thật), `Ai:Mode` mặc định `Simulated`, `Quizzes__AutoCloseIntervalSeconds=5` để thấy tác vụ tự đóng |
| Giao diện | `VITE_API_BASE_URL=http://localhost:5180/api/v1 npx vite --port 5273 --strictPort` (web quản trị) và `--port 5274` (web học tập) |
| Chuẩn bị | Gọi thẳng API: xuất bản một di sản có dòng thời gian và thêm ảnh, tạo trường, quản trị trường, giáo viên, ba lớp (khối 3, 8, 11), mỗi lớp một bài học đã xuất bản, sáu câu hỏi đã duyệt (một đáp án, đúng sai, sắp xếp, điền từ, chọn hình, nhiều mệnh đề), một học sinh lớp khối 8. Mọi thao tác với bài kiểm tra đi qua giao diện |

| Nhóm bước | Kết quả |
|---|---|
| Bài kiểm tra của tôi chưa có bài; cột Độ khó của Bài học của tôi ghi "Chưa có bài kiểm tra" cho cả ba bài; lọc độ khó "Khó" không có bài nào | Đạt |
| Tạo bài kiểm tra cho lớp cấp 2 (chọn bài học, đặt tên); trang soạn mở với bài Nháp, bài học chỉ đọc, thời gian làm tùy chọn | Đạt |
| Hộp chọn câu cấp 2: có bốn dạng của cấp, **câu chọn hình (cấp 1) bị ẩn**; con mắt mở câu như học sinh và giữ nguyên 4 câu đang chọn; thêm 4 câu | Đạt |
| Đổi điểm 2,5 (tổng 5,5); điểm 0,1 bị chặn ngay; đổi thứ tự bằng phím mũi tên; bỏ câu; thêm lại (3 câu đã có hiện mờ, không chọn lại được) | Đạt |
| Xem trước như học sinh (câu 1/4, câu sau); giờ đóng trước giờ mở báo lỗi dưới ô; Lưu rồi tải lại giữ đủ thiết lập | Đạt |
| Phát hành: hộp xác nhận nhắc khóa danh sách và nêu mã bài học; xong hiện hộp Mã bài học; trường khóa bị vô hiệu, vẫn sửa tên, mô tả, giờ đóng (kéo dài giờ đóng lưu được); thanh trạng thái có Nhân bản, Kết quả, Đóng | Đạt |
| Học sinh lớp cấp 2 đăng nhập web học tập, mở bài bằng mã, thấy bài ở tab Bài kiểm tra | Đạt |
| Danh sách: dòng bài đang phát hành "4 câu · 15 phút", 0/1 đã nộp; Nhân bản thành bản Nháp cùng 4 câu không giờ mở, đóng; Phát hành khi thiếu giờ báo ngay, không hỏi xác nhận | Đạt |
| Độ khó của bài học tính từ hai bài kiểm tra là "Khó"; lọc `?do-kho=kho` còn đúng một bài | Đạt |
| Nhân bản bài học sang lớp cấp 1, ô chép kèm mặc định chọn và có cảnh báo khác cấp; kết quả "Đã chép 2 bài kiểm tra… Bỏ qua 4 câu hỏi"; bài chép sang cấp 1 có ô thời gian khóa "Không đồng hồ" và chỉ còn 2 câu hợp cấp | Đạt |
| Lớp cấp 3: hộp chọn câu không có câu điền từ; để trống thời gian làm thì Phát hành báo bắt buộc; có 45 phút thì phát hành được | Đạt |
| Đóng bài từ danh sách (hộp xác nhận không mở lại được), xóa bài Nháp, lọc trạng thái Đã đóng trên URL | Đạt |
| 390px: Bài kiểm tra của tôi và Soạn và phát hành bài kiểm tra không tràn ngang | Đạt |
| Bài cấp 3 phát hành với giờ đóng sau 1 phút: sau giờ đóng tác vụ nền tự chuyển sang Đã đóng | Đạt |

Ghi chú: ảnh của Wikimedia Commons không tải được trong môi trường kiểm thử nên các khung ảnh trống. Luồng làm bài của học sinh chưa có nên chưa kiểm số đã nộp lớn hơn 0 và Kết quả bài kiểm tra.

## Web học tập: học tập của học sinh theo cấp (làm bài, kết quả, tiến độ)

> Chạy ngày 06/10/2026 (+07) với backend nhánh `feature/DSVHVN-012-hoc-tap-theo-cap`. Kết quả: **43/43 bước đạt**, không có lỗi JavaScript trên trang, không có lỗi console.
> Script: [`apps/web-hoc-tap/scripts/smoke-lam-bai.mjs`](../apps/web-hoc-tap/scripts/smoke-lam-bai.mjs) (`npm run smoke:lam-bai -w @dsvhvn/web-hoc-tap`).

| Mục | Giá trị |
|---|---|
| Máy, trình duyệt | Windows 11, Node 24.19, Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `http://localhost:5180`, LocalDB **database tạm** `dsvhvn_tam_wt_…` (migrate và nạp di sản lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log` (không gửi thư thật), CORS cho cổng của web |
| Web học tập | `VITE_API_BASE_URL=http://localhost:5180/api/v1 npx vite --port 5274 --strictPort` |
| Lệnh | `API_URL=http://localhost:5180/api/v1 BASE_URL=http://localhost:5274 API_LOG=<log của API> ADMIN_PASSWORD=<mật khẩu seed> npm run smoke:lam-bai -w @dsvhvn/web-hoc-tap` (đặt `SKIP_TIMEOUT=1` để bỏ phần chờ hết giờ khoảng 70 giây) |
| Chuẩn bị | Gọi thẳng API: xuất bản di sản, tạo trường, quản trị trường, giáo viên, ba lớp (khối 3, 8, 11), mỗi lớp một bài học xuất bản, đủ tám dạng câu, bốn bài kiểm tra đang mở (cấp 1 không thời gian, cấp 2 15 phút, cấp 3 45 phút và một bài nhanh 1 phút), mỗi lớp một học sinh đã đổi mật khẩu |

| Nhóm bước | Kết quả |
|---|---|
| Học sinh đăng nhập; trang học báo bài kiểm tra chưa nhập mã bằng nhãn "Cần mã bài học" (cấp 1 và 2); nhập mã bài học, mở hộp thoại Bắt đầu bài kiểm tra (số câu, thời gian, lời nhắc một lần) | Đạt |
| Cấp 2: bố cục cân bằng, đồng hồ 15 phút, vào bài không còn thanh điều hướng; làm một đáp án, đúng/sai, sắp xếp, điền từ (kho từ); bảng số câu báo 4 / 4 | Đạt |
| Cấp 2: tải lại giữa chừng vào tiếp đúng lượt, đủ 4 câu đã lưu, đồng hồ không đặt lại; mở thẳng đường dẫn thì hiện Làm tiếp, không tạo lượt mới | Đạt |
| Cấp 2: ngắt mạng thì báo "Mất kết nối", giữ câu vừa chọn; có mạng lại thì tự lưu | Đạt |
| Cấp 2: hộp xác nhận nộp, nộp; kết quả có điểm, câu đúng, sai, bỏ trống, đáp án và giải thích, huy hiệu; lịch sử, tiến độ (biểu đồ điểm theo thời gian), thành thạo, huy hiệu; mở lại bài đã nộp thì chuyển thẳng tới kết quả; trang học thấy bài học và huy hiệu gần đây | Đạt |
| Cấp 1: bố cục từng câu, không đồng hồ, hàng sao; chọn hình, đúng/sai, ghép cặp (kéo tên thả vào hình bằng chuột thật), sắp xếp; câu cuối "Xong rồi!"; kết quả ba sao, lời khen, huy hiệu, không điểm và phần trăm; Sao của em, tab Bài đã chơi; 390px không tràn ngang | Đạt |
| Cấp 3: bố cục gọn, đồng hồ 45 phút, bảng số câu nằm ngang, đánh dấu xem lại, tư liệu ghim bên trái cho nhóm câu đọc tư liệu; một đáp án, nhiều mệnh đề, đọc tư liệu; kết quả có phân tích theo di sản và dạng câu; lịch sử, thành thạo; 390px không tràn ngang | Đạt |
| Cấp 3: bài nhanh 1 phút, dưới 1 phút đồng hồ chuyển cảnh báo "sắp hết giờ", hết giờ tự nộp và kết quả báo "đã được nộp tự động" | Đạt |
| Em khác lớp không xem được lượt của em (404) | Đạt |

Ghi chú: ảnh của Wikimedia Commons có thể không tải được trong môi trường kiểm thử nên một số khung ảnh trống. Đã gặp và sửa trong lúc chạy: bài tự nộp đúng hạn máy chủ ghi là "Đã nộp" nên giao diện giữ cờ "tự nộp khi hết giờ" ở phía máy em để vẫn báo đúng.
