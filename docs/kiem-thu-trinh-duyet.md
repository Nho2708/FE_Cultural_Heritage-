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

## Đa ngôn ngữ, AI dịch và tóm tắt di sản, nghe thuyết minh (web quản trị và web học tập)

> Chạy ngày 06/10/2026 (+07) với backend nhánh `feature/DSVHVN-013-da-ngon-ngu`. Kết quả: **42/42 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-hoc-tap/scripts/smoke-da-ngon-ngu.mjs`](../apps/web-hoc-tap/scripts/smoke-da-ngon-ngu.mjs) (`npm run smoke:da-ngon-ngu -w @dsvhvn/web-hoc-tap`). Chi tiết luồng: [da-ngon-ngu.md](da-ngon-ngu.md).

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844; các ngữ cảnh trình duyệt riêng cho ngôn ngữ `ko-KR`, `en-US` |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5080`, LocalDB **database tạm** `dsvhvn_tam_a2_ui_da_ngon_ngu` (migrate và nạp 20 di sản đợt 1 lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log`, `Ai__Mode=Simulated` (không gọi nhà cung cấp AI), `Storage__Provider=Local` |
| Giao diện | `npx vite --port 5173` (web quản trị) và `--port 5174` (web học tập), `VITE_API_BASE_URL=http://localhost:5080/api/v1`; đã tắt mọi tiến trình đã bật |
| Chuẩn bị | Gọi thẳng API: xuất bản ba di sản có dòng thời gian, một trường, giáo viên, lớp khối 7 và một học sinh đã đổi mật khẩu lần đầu; dịch di sản B bằng API. Mọi thao tác với bản dịch của di sản A đi qua giao diện |

| Nhóm | Bước | Kết quả |
|---|---|---|
| Quản trị hệ thống | Mục Bản dịch ở thanh bên; cột và bộ lọc Bản dịch ở Quản lý di sản; dải nhắc dịch sau khi xuất bản; tab Bản dịch và tóm tắt (năm ngôn ngữ, tiếng Việt là bản gốc) | Đạt |
| | "Dịch và tóm tắt bằng AI": trạng thái đang xử lý; tiếng Anh và tóm tắt tiếng Việt chờ duyệt; Hàn, Trung, Nhật là bản dịch máy hiện ngay | Đạt |
| | Duyệt bản dịch: hai cột, sửa tại chỗ, lưu, duyệt (khung đóng); duyệt tóm tắt tiếng Việt và tiếng Anh; từ chối bản dịch tiếng Anh của di sản B kèm lý do | Đạt |
| | Tab Đã duyệt, Bản dịch máy, Bị từ chối; nhật ký ghi duyệt và từ chối | Đạt |
| Khách | Mặc định theo trình duyệt (`ko-KR`, `en-US`); hộp thoại Chọn ngôn ngữ có năm lựa chọn; chọn tiếng Nhật, tải lại vẫn nhớ | Đạt |
| | Tiếng Hàn: bản dịch máy dịch lại từ bản tiếng Anh đã duyệt kèm nhãn; tìm kiếm khớp bản dịch; bản đồ có nhãn hai quần đảo kèm "Việt Nam" bằng tiếng Hàn | Đạt |
| | Tiếng Anh: di sản đã duyệt hiện bản tiếng Anh; di sản bị từ chối hiện tiếng Việt kèm thông báo; di sản chưa dịch báo chưa có tóm tắt, không mở hộp thoại | Đạt |
| | Tóm tắt tab Đọc theo ngôn ngữ; tab Nghe; Web Speech API giả: đọc câu 1, câu 2, tô sáng, đổi tốc độ, tạm dừng, tiếp tục, dừng; tiếng Nhật trên máy không có giọng Nhật: báo, khóa nút Phát | Đạt |
| | 390px bằng tiếng Trung (chọn ngôn ngữ trong ngăn kéo): trang chủ, chi tiết, tìm kiếm, bản đồ, dòng thời gian không tràn ngang; nhãn năm không còn "TCN", "nay" | Đạt |
| Học sinh | Đã nhớ tiếng Hàn trên máy nhưng đăng nhập thì không có mục Ngôn ngữ, mọi lời gọi gửi `lang=vi`, chi tiết di sản bằng tiếng Việt | Đạt |

Ghi chú: Edge headless trên máy kiểm thử chỉ có giọng đọc `en-US` (ba giọng). Vì vậy tiếng Anh kiểm được trạng thái đang đọc nhưng không nghe được âm thanh trong môi trường không giao diện, còn tiếng Nhật (và Hàn, Trung, Việt) rơi đúng vào trường hợp thiết bị
chưa có giọng: giao diện báo kèm hướng dẫn cài giọng, khóa nút Phát, vẫn hiện đủ chữ (đã kiểm với tiếng Nhật). Luồng tiến câu, tô sáng, đổi tốc độ, tạm dừng và dừng kiểm bằng Web Speech API giả đặt trước khi trang tải.
Nội dung bản dịch lấy từ bản AI giả lập (gắn tiền tố mã ngôn ngữ), không phải chất lượng dịch thật. Ảnh của Wikimedia Commons không tải được trong môi trường kiểm thử nên các khung ảnh trống.

## Mô hình 3D di sản (web quản trị và web học tập)

> Chạy ngày 07/10/2026 (+07) với backend nhánh `feature/DSVHVN-014-mo-hinh-3d`. Kết quả: **60/60 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-hoc-tap/scripts/smoke-mo-hinh-3d.mjs`](../apps/web-hoc-tap/scripts/smoke-mo-hinh-3d.mjs) (`npm run smoke:mo-hinh-3d -w @dsvhvn/web-hoc-tap`). Chi tiết luồng: [mo-hinh-3d.md](mo-hinh-3d.md).

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core` với `--use-angle=swiftshader --enable-unsafe-swiftshader` (WebGL chạy bằng phần mềm); khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5080`, LocalDB **database tạm** `dsvhvn_tam_a2_ui_mo_hinh_3d` (migrate và nạp 20 di sản đợt 1 lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log`, `Ai__Mode=Simulated`, `Storage__Provider=Local` với thư mục kho tệp tạm |
| Giao diện | `npx vite --port 5173` (web quản trị) và `--port 5174` (web học tập), `VITE_API_BASE_URL=http://localhost:5080/api/v1`; đã tắt mọi tiến trình đã bật |
| Chuẩn bị | Gọi thẳng API: xuất bản ba di sản, một di sản nháp có mô hình, một mô hình nặng hơn 6 MB, trường, giáo viên, lớp khối 7 và một học sinh. Tệp `.glb` thử do script tự dựng (khối lập phương glTF 2.0). Việc khai báo mô hình của di sản A đi qua giao diện |

| Nhóm | Bước | Kết quả |
|---|---|---|
| Quản trị hệ thống | Tab Mô hình 3D (tab thứ sáu), trạng thái rỗng; chọn `.gltf` và tệp đổi đuôi `.glb` bị từ chối ngay; CC BY-NC bị chặn; giấy phép mở thiếu nguồn bị chặn; ghi công ghép hiện trước khi lưu | Đạt |
| | Tải `.glb` lên và hiện ngay: "Đang hiển thị", "Khách đang thấy", dung lượng do máy chủ đo | Đạt |
| | Xem thử: trình xem WebGL thật tải xong và vẽ hình khối nhiều màu; kéo chuột xoay, cuộn chuột phóng to, "Đặt lại góc nhìn" đưa camera về góc ban đầu; người tắt chuyển động thì không tự xoay | Đạt |
| | Dán đường dẫn ngoài kho bị từ chối; dùng tệp đã lưu, mô hình nhóm tự dựng không cần nguồn; một mô hình hiển thị (ô "hiện ngay" và nút Hiện bị khóa); ẩn rồi hiện mô hình khác | Đạt |
| | Thay tệp (dung lượng đo lại, ghi công giữ nguyên), sửa tác giả, gỡ (xóa mềm, tệp vẫn tải được) | Đạt |
| | Quản lý di sản: cột và bộ lọc "Có mô hình 3D", "Chưa có mô hình 3D"; nhật ký ghi thao tác mô hình, không ghi đường dẫn tệp | Đạt |
| Khách | Di sản không có mô hình: không có nút Xem 3D, chỉ có thư viện ảnh; di sản có mô hình: nút cùng hàng với Tóm tắt và Nghe, chưa bấm thì chưa tải | Đạt |
| | Xem 3D: trình xem WebGL vẽ hình khối, tự xoay khi không tắt chuyển động, kéo xoay được, ghi công kèm liên kết giấy phép và nguồn, lời gọi mô hình không mang token, không quảng cáo, Esc đóng | Đạt |
| | Năm ngôn ngữ: nút, tiêu đề hộp thoại, nút Đặt lại góc nhìn bằng en, ko, zh-Hans, ja; ghi công không dịch | Đạt |
| | 390px: hộp thoại không tràn ngang, trình xem vừa màn hình | Đạt |
| | Tệp mô hình bị chặn tải, và thiết bị không có WebGL: quay về bộ ảnh kèm câu thông báo | Đạt |
| | Mô hình nặng trên mạng di động giả lập: hỏi trước, "Vẫn tải mô hình" thì tải; trên mạng thường tải luôn | Đạt |
| | Ẩn di sản: API mô hình trả 404, nút biến mất, tab của quản trị giải thích khách chưa thấy; hiện lại thì nút trở lại | Đạt |
| Học sinh | Đã nhớ tiếng Hàn trên máy nhưng đăng nhập thì xem tiếng Việt; Xem 3D bình thường, không cần token | Đạt |
| Xem trước | Bản nháp có mô hình: tab xem trước có nút Xem 3D (không có Tóm tắt và Nghe), trình xem tải mô hình bằng token quản trị; mô hình của di sản nháp không lộ ra API công khai | Đạt |

Ghi chú: trình duyệt không giao diện vẽ 3D bằng phần mềm nên chỉ kiểm được kết quả đúng (khung vẽ có màu, góc nhìn đổi), không đo hiệu năng. Ảnh của Wikimedia Commons không tải được trong môi trường kiểm thử nên các khung ảnh trống (giao diện vẫn hiện chú thích và ghi công).

## Gói và thanh toán VNPay (web quản trị)

> Chạy ngày 07/10/2026 (+07) với backend nhánh `feature/DSVHVN-015-goi-thanh-toan-vnpay`. Kết quả: **44/44 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-quan-tri/scripts/smoke-goi.mjs`](../apps/web-quan-tri/scripts/smoke-goi.mjs) (`npm run smoke:goi -w @dsvhvn/web-quan-tri`).

**Chưa thử với VNPay sandbox thật** (chưa có khóa cửa hàng và địa chỉ IPN công khai). Trang thanh toán của VNPay được thay bằng trang giả
(trình duyệt không ra ngoài); IPN và lời trả về do script **tự ký bằng khóa thử** (HMAC-SHA512, cùng thuật toán của backend) rồi gọi vào API
thật, đúng như VNPay làm. Phần chưa kiểm: trang thanh toán thật của VNPay, khóa thật, IPN từ máy chủ VNPay qua mạng công khai.

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development` (nạp hai gói mẫu), `http://localhost:5080`, LocalDB **database tạm** `dsvhvn_tam_a2_goi_fe` (**đã xóa sau khi chạy**), `Email__Mode=Log`, `Ai__Mode=Simulated`, `Storage__Provider=Local`, `VnPay__TmnCode` và `VnPay__HashSecret` là khóa thử |
| Giao diện | `npx vite` trong `apps/web-quan-tri` (cổng 5173); đã tắt mọi tiến trình đã bật |
| Chuẩn bị | Gọi thẳng API: tạo trường và quản trị trường, đặt mật khẩu qua thư giả trong log |

| Nhóm | Bước | Kết quả |
|---|---|---|
| Quản trị hệ thống | Gói dịch vụ: bảng ba gói, giá `500.000 ₫`, công tắc gói Miễn phí bị khóa; tạo gói để trống báo bắt buộc từng ô; giá 0 cho gói trả phí bị chặn; tạo gói 750.000 ₫; sửa giá; đổi tên trùng báo dưới ô Tên; tắt bán phải xác nhận, bật lại không cần | Đạt |
| Quản trị trường | Trường mới có gói Miễn phí: chỉ có Nâng cấp; Chọn gói không có gói Miễn phí, có ghi chú môi trường thử VNPay | Đạt |
| | Chọn Cơ bản: loại Nâng cấp, 500.000 ₫, hiệu lực ngay; hộp xác nhận đúng câu; chuyển sang địa chỉ VNPay có chữ ký, `vnp_Amount` = số tiền × 100 | Đạt |
| | IPN báo hủy → Kết quả "Chưa thanh toán"; **Thanh toán lại** tạo giao dịch mới; IPN thành công → "Thanh toán thành công" kèm hóa đơn, số tiền, mã giao dịch VNPay; IPN gửi lặp trả mã 02 | Đạt |
| | Tab Hóa đơn: một hóa đơn Đã thanh toán, mở dòng thấy hai giao dịch (Thất bại, Thành công) | Đạt |
| | Nâng cấp Nâng cao: trình duyệt về trước IPN → "Đang chờ xác nhận", IPN tới sau → trang tự đổi sang thành công không tải lại | Đạt |
| | Hủy gói (hộp xác nhận câu của backend), thanh báo gói hết hiệu lực kèm Mua gói, kích hoạt gói Miễn phí (xác nhận, ngay lập tức, không qua VNPay) | Đạt |
| | Bỏ dở thanh toán: thẻ yêu cầu mua chưa thanh toán, khóa Nâng cấp, Chọn gói khóa gói kèm lý do; Hủy yêu cầu → hóa đơn Đã hủy | Đạt |
| | Mua Cơ bản rồi **Gia hạn**: loại Gia hạn, hiệu lực là khoảng ngày sau khi gói hết; báo gói gia hạn chờ, khóa Gia hạn, không có Hủy gói | Đạt |
| | Lời trả về sai chữ ký: chuyển `?error=invalid`, báo liên kết không hợp lệ | Đạt |
| Quản trị hệ thống | Số trường đang dùng gói Cơ bản tăng thêm 1 sau khi trường mua | Đạt |
| Điện thoại | 390px: tab Gói và hạn mức và Chọn gói không tràn ngang | Đạt |

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

## Thống kê và gợi ý (web quản trị và web học tập)

> Chạy ngày 07/10/2026 (+07) với backend nhánh `feature/DSVHVN-016-thong-ke-goi-y`. Kết quả: **51/51 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx mà trình duyệt nhận.
> Script: [`apps/web-quan-tri/scripts/smoke-thong-ke-goi-y.mjs`](../apps/web-quan-tri/scripts/smoke-thong-ke-goi-y.mjs) (`npm run smoke:thong-ke-goi-y -w @dsvhvn/web-quan-tri`).

| Mục | Giá trị |
|---|---|
| Máy, trình duyệt | Windows 11, Node 24.19, Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `http://localhost:5180`, LocalDB **database tạm** `dsvhvn_tam_wt_…` (migrate và nạp di sản lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log` (không gửi thư thật), `Ai__Mode=Simulated`, CORS cho hai cổng web |
| Web | `VITE_API_BASE_URL=http://localhost:5180/api/v1 npx vite --port 5273 --strictPort` (web quản trị) và `--port 5274` (web học tập) |
| Lệnh | `API_LOG=<log của API> ADMIN_PASSWORD=<mật khẩu seed> npm run smoke:thong-ke-goi-y -w @dsvhvn/web-quan-tri` |
| Chuẩn bị | Gọi thẳng API: xuất bản ba di sản, tạo trường, quản trị trường, hai giáo viên, ba lớp của giáo viên thứ nhất (khối 3, 8, 11) và một lớp của giáo viên thứ hai; mỗi lớp ba bài học đã xuất bản, câu hỏi đã duyệt theo cấp, hai bài kiểm tra đang mở; lớp cấp 2 có 6 học sinh làm bài đúng và sai khác nhau (5 em làm bài thứ nhất, 1 em làm cả hai, 1 em chưa làm gì), lớp cấp 1 và 3 mỗi lớp 2 em |

| Nhóm bước | Kết quả |
|---|---|
| Chi tiết lớp, tab Tiến độ: 6 em, 2 bài đã phát hành, tiến độ 50% (6 lượt trên 12 ô), điểm 8/8 của em làm đúng hết, em chưa làm ghi "Chưa làm"; tên học sinh mở Hồ sơ học tập | Đạt |
| Hồ sơ học tập: biểu đồ điểm theo thời gian, lịch sử 2 lượt, thẻ "2 trên 2 bài đã phát hành"; mở Chi tiết bài làm từ lịch sử: 4 câu, bài sai hết, câu em trả lời cạnh đáp án đúng và giải thích | Đạt |
| Tab Thành thạo: bảng nhiệt hàng Cả lớp và 6 em, ô 100% là Thành thạo, chú giải màu, tỉ lệ theo dạng câu; lọc theo loại gọi lại không lỗi | Đạt |
| Tab Gợi ý ôn tập: di sản nên ôn "Lớp sai 60% ở 20 câu về di sản này", di sản liên quan; Tạo bài ôn tập mở hộp thoại Tạo bài học với lớp khóa, tiêu đề "Ôn tập: …", tạo xong chuyển sang Soạn bài học | Đạt |
| Kết quả bài kiểm tra: Tổng quan (5 / 6, chưa làm 1 em, điểm trung bình 3,2, phổ điểm 10 khoảng); Từng câu (bốn câu, câu dưới 50% cảnh báo, lỗi hay gặp của câu điền từ); Từng học sinh (cả em chưa làm, lọc trạng thái), Chi tiết bài làm 0/8, tab Gợi ý chỉ bài này | Đạt |
| Lớp cấp 1: giáo viên thấy điểm kèm số sao của từng em; tab Tiến độ giải thích học sinh chỉ thấy sao | Đạt |
| Đóng bài: hộp xác nhận ghi số em đã nộp, sau khi đóng trạng thái Đã đóng và không còn nút Đóng bài kiểm tra | Đạt |
| Giáo viên khác mở lớp, kết quả bài, hồ sơ học sinh không phải của mình: báo không tìm thấy | Đạt |
| Học sinh cấp 2: Gợi ý cho em có đủ phần, nhãn Cần mã bài học, bài mới không lộ mã, lý do có số liệu, thẻ di sản mở chi tiết di sản, kết quả của một lượt có gợi ý; học sinh chưa làm gì thấy lời mời nhập mã và bài mới | Đạt |
| Học sinh cấp 1: thẻ hình nhãn ngắn, không số và phần trăm ở Trang học và Kết quả bài làm; cấp 3: danh sách theo nhóm kèm "Lý do: …", mục lục có Gợi ý | Đạt |
| 390px: Kết quả bài kiểm tra và tab Thành thạo (bảng nhiệt cuộn trong khung) không tràn ngang | Đạt |

Ghi chú: ảnh của Wikimedia Commons không tải được trong môi trường kiểm thử nên các khung ảnh di sản gợi ý trống. Log của API có vài dòng `SqlException` kèm "A severe error occurred on the current command"
khi trình duyệt đóng yêu cầu đang chạy (chuyển trang giữa chừng); đó là hủy yêu cầu, không phải lỗi của chức năng, và trình duyệt không nhận 5xx nào.

## Quản trị và tổng quan (web quản trị)

> Chạy ngày 07/10/2026 (+07) với backend nhánh `feature/DSVHVN-017-quan-tri-tong-quan`. Kết quả: **43/43 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx, log của API không có dòng lỗi.
> Script: [`apps/web-quan-tri/scripts/smoke-quan-tri-tong-quan.mjs`](../apps/web-quan-tri/scripts/smoke-quan-tri-tong-quan.mjs) (`npm run smoke:quan-tri-tong-quan -w @dsvhvn/web-quan-tri`).

| Mục | Giá trị |
|---|---|
| Máy, trình duyệt | Windows 11, Node 24.19, Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 800 |
| API | Bản build của backend, `http://localhost:5180`, LocalDB **database tạm** `dsvhvn_tam_wt_…` (nạp di sản lúc khởi động, **đã xóa sau khi chạy**), `Email__Mode=Log`, `Ai__Mode=Simulated`, CORS cho cổng 5273 và 5274 |
| Lệnh | `API_LOG=<log của API> ADMIN_PASSWORD=<mật khẩu seed> npm run smoke:quan-tri-tong-quan -w @dsvhvn/web-quan-tri` |
| Chuẩn bị | Gọi thẳng API: xuất bản một di sản, tạo trường, quản trị trường, giáo viên, lớp cấp 2, bài học, hai câu hỏi (một đáp án đúng, đúng sai), bài kiểm tra đã phát hành, mười học sinh làm bài (sai câu một đáp án, đúng câu đúng sai) |

| Nhóm bước | Kết quả |
|---|---|
| Quản trị trường vào thẳng Tổng quan trường: giáo viên 1 / hạn mức, 1 lớp, 10 học sinh đã đăng nhập hết, 1 bài học, 1 bài kiểm tra đang mở, 10 lượt nộp, điểm trung bình 5, lượt AI so với hạn mức có thanh dùng hạn mức, tên lớp trong biểu đồ theo lớp, thanh bên có Tổng quan | Đạt |
| Chỉ có số tổng: trang không chứa tên giáo viên hay tên học sinh; nút Xem gói và hóa đơn mở Trường và gói; 390px không tràn ngang | Đạt |
| Quản trị trường mở Kiểm duyệt câu hỏi nhận trang 403, máy chủ cũng trả 403 cho tổng quan hệ thống | Đạt |
| Quản trị hệ thống vào thẳng Tổng quan: các thẻ số liệu, bảng số trường theo từng gói, biểu đồ 30 ngày (30 cột) có đủ lượt nộp vừa làm; khoảng 12 tháng tự gom theo tháng; đổi số liệu sang Học sinh mới | Đạt |
| Tab Doanh thu: ghi rõ chờ nối thanh toán, không có số doanh thu, hai liên kết mở AdMob và Ad Manager ở tab mới, giữ trên URL; 390px không tràn ngang | Đạt |
| Kiểm duyệt: câu một đáp án đúng 10 lượt, 0%, "Cần xem lại"; câu đúng sai 10 lượt, 100%; ba số đếm; lọc chỉ câu cần xem lại (trên URL); xem chỉ đọc có đáp án đúng, giải thích, kết quả làm bài, không có ô nhập | Đạt |
| Ẩn câu có lý do: giáo viên không còn thấy câu ở tab Dùng chung, bài kiểm tra đã phát hành giữ nguyên câu; lọc Đã ẩn; Hiện lại câu có lý do: giáo viên thấy lại; nhật ký có "Ẩn câu hỏi" và "Hiện lại câu hỏi" kèm lý do, lọc được theo hành động | Đạt |
| 390px: Kiểm duyệt không tràn ngang (bảng cuộn trong khung) | Đạt |

Ghi chú: lần chạy đầu phát hiện trang Tổng quan hệ thống tràn ngang ở 390px vì ô lưới không co theo bảng; đã sửa (cột lưới `minmax(0, 1fr)`) và chạy lại.

## Nhánh tích hợp: chạy lại các luồng chính sau khi gộp hai chuỗi nhánh (web quản trị và web học tập)

> Chạy ngày 07/10/2026 (+07) với backend và giao diện nhánh `feature/DSVHVN-018-tich-hop` (gộp chuỗi gói và thanh toán VNPay với chuỗi bài kiểm tra, học tập, thống kê, tổng quan).
> Kết quả: **mọi script đạt**, không có lỗi JavaScript trên trang, trình duyệt không nhận phản hồi 5xx.

| Mục | Giá trị |
|---|---|
| Trình duyệt | Microsoft Edge headless qua `playwright-core`; khung 1440 × 900 và 390 × 844 |
| API | Bản build của backend, `ASPNETCORE_ENVIRONMENT=Development`, `http://localhost:5080`, LocalDB **database tạm** `dsvhvn_tam_a2_tich_hop` (tạo mới, áp đủ chín migration theo thứ tự, nạp di sản đợt 1, **đã xóa sau khi chạy**), `Email__Mode=Log`, `Ai__Mode=Simulated`, `Storage__Provider=Local`, khóa VNPay thử |
| Giao diện | `npx vite --port 5173` (web quản trị) và `--port 5174` (web học tập), `VITE_API_BASE_URL=http://localhost:5080/api/v1`; đã tắt mọi tiến trình đã bật |

| Luồng | Script | Kết quả |
|---|---|---|
| Đăng nhập quản trị, quản lý trường, giáo viên, đặt mật khẩu, nhật ký | `smoke.mjs` (web quản trị) | 45/45 |
| Bài học cho lớp theo cấp, học sinh mở bài bằng mã | `smoke-bai-hoc.mjs` | 29/29 |
| Bài kiểm tra của bài học (bỏ phần chờ tự đóng) | `smoke-bai-kiem-tra.mjs` | 47/47 |
| Học sinh làm bài theo cấp: nút trên trang bài học mở hộp thoại Bắt đầu bài kiểm tra (bố cục bài học dùng chung) | `smoke-lam-bai.mjs` (bỏ phần chờ hết giờ) | 40/40 |
| Khám phá công khai nhiều ngôn ngữ (Hàn, Anh, Nhật, Trung), duyệt bản dịch | `smoke-da-ngon-ngu.mjs` | 42/42 |
| Gói và thanh toán VNPay (IPN ký bằng khóa thử) | `smoke-goi.mjs` | 44/44 |
| Thống kê và gợi ý | `smoke-thong-ke-goi-y.mjs` | 51/51 |
| Tổng quan và doanh thu: tab Doanh thu có số tiền từ các giao dịch vừa thanh toán ở `smoke-goi.mjs`, biểu đồ theo kỳ, danh sách 6 giao dịch | `smoke-quan-tri-tong-quan.mjs` | 44/44 |
| Tạo lớp khối 6 và thêm một học sinh bằng giao diện, phiếu đăng nhập hiện mã học sinh và mật khẩu tạm | thao tác tay | Đạt |

Ghi chú: sau khi gộp, trang mặc định của quản trị hệ thống là Tổng quan (`/quan-tri`) và của quản trị trường là Tổng quan trường (`/truong`), nên `smoke.mjs` đổi các bước chờ trang mặc định;
`smoke-bai-hoc.mjs` chờ danh sách bài học tải xong rồi mới kiểm câu "chưa có bài nào". Log của API có vài dòng `SqlException` "Operation cancelled by user" khi trình duyệt hủy yêu cầu
lúc chuyển trang; đó là hủy yêu cầu, không phải lỗi của chức năng.
