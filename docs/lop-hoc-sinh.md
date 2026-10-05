# Luồng Lớp, học sinh và tài khoản học sinh (giao diện)

Phần giao diện của luồng này trên hai ứng dụng web, nối với backend ở `BE_Cultural_Heritage-/docs/lop-hoc-sinh.md`
(nhánh `feature/DSVHVN-007-lop-hoc-sinh`). Không có bảng mới và không có migration mới.

| Mục | Giá trị |
|---|---|
| Chức năng | Học sinh đăng nhập · Đổi mật khẩu của học sinh · Quản lý lớp học · Thêm học sinh vào lớp và tạo tài khoản (từng em, nhập danh sách) · Đặt lại mật khẩu cho học sinh · Quản lý thông tin học sinh |
| Web quản trị (giáo viên) | Lớp học · Chi tiết lớp (tab Học sinh) · Thêm học sinh và tạo tài khoản (hộp thoại) · Phiếu đăng nhập của học sinh (hộp thoại, có chế độ in) |
| Web học tập (học sinh) | Học sinh đăng nhập · Đổi mật khẩu (bắt buộc lần đầu, tự đổi) · Trang học của em (ba bản bố cục theo cấp, phần Lớp của em) |
| Gói dùng chung | `api/studentApi.ts` (đúng endpoint thật), `api/classroom.ts` (kiểu dữ liệu), `api/client.ts` (gửi tệp `FormData`, tải tệp về), `validation/classroom.ts` |

## 1. Web quản trị — khu giáo viên

| Route | Màn hình | Nội dung |
|---|---|---|
| `/giao-vien/lop` | Lớp học | Khối "Tạo lớp" ngay trên trang (tên lớp, khối 1-12, năm học mặc định theo năm học hiện hành), bảng lớp (khối kèm cấp học, năm học, sĩ số, số bài học, số em chưa đăng nhập lần nào), tìm theo tên, lọc theo khối, sửa và xóa mềm từng dòng |
| `/giao-vien/lop/:lop` | Chi tiết lớp | Đầu trang: tên lớp, khối và cấp học, năm học, sĩ số, "Sửa lớp". Năm tab nằm trên URL (`?tab=`): **Học sinh** dựng ở luồng này; Bài học, Tiến độ, Thành thạo, Gợi ý ôn tập báo "sẽ có ở bản sau" |
| — | Thêm học sinh và tạo tài khoản | Hộp thoại hai chế độ: **Thêm từng em** (một hoặc vài dòng họ tên) và **Nhập danh sách** (tệp `.xlsx` / `.csv` kéo thả hoặc chọn, hoặc dán họ tên; tải tệp mẫu; xem trước từng dòng; "Lưu các dòng hợp lệ") |
| — | Phiếu đăng nhập của học sinh | Hộp thoại rộng, mỗi em một phiếu (mã học sinh, mật khẩu tạm, hướng dẫn); "In phiếu" khổ A4 8 phiếu mỗi trang có đường cắt; đóng thì hỏi "Thầy cô đã in hoặc lưu phiếu chưa?" |

### Tab Học sinh

- Bảng: mã học sinh, họ tên, trạng thái (Hoạt động / Đã vô hiệu), đăng nhập gần nhất ("Chưa đăng nhập lần nào"), đã đổi mật khẩu lần đầu chưa;
  tìm theo họ tên hoặc mã, lọc theo trạng thái, phân trang 20 dòng; bộ lọc và trang nằm trên URL (`?tu-khoa=`, `?trang-thai=`, `?trang=`).
- Sửa họ tên tại chỗ (Enter hoặc nút dấu tích để lưu, Esc để hủy); vô hiệu / mở lại; xóa mềm. Mỗi thao tác qua hộp xác nhận chung; lý do máy chủ chặn
  (đang có bài làm dở, đủ sĩ số) hiện ở thông báo.
- Chọn một hoặc nhiều em đang hoạt động (kể cả khác trang) rồi "Đặt lại mật khẩu": hộp xác nhận, rồi hiện Phiếu đăng nhập mới. Em đã vô hiệu không chọn được.
- Lớp đủ 60 học sinh đang hoạt động thì "Thêm học sinh" và "Nhập danh sách" bị khóa kèm lý do.
- Danh sách tải lại khi thầy cô quay lại cửa sổ (em có thể vừa đăng nhập hoặc đổi mật khẩu).

### Sửa khối sang cấp khác

Hộp thoại sửa lớp cảnh báo ngay khi đổi sang cấp khác. Nếu lớp đã có bài học, máy chủ trả 422 `CLASS_LEVEL_CHANGE_NEEDS_CONFIRMATION`
kèm câu nhắc; giao diện hiện hộp xác nhận chung "Đổi cấp học của lớp" và gửi lại với `confirmLevelChange: true` khi giáo viên đồng ý.

### Phiếu đăng nhập và bản in

- Mật khẩu tạm chỉ nằm trong bộ nhớ của hộp thoại: không vào bộ nhớ đệm của React Query, không vào `localStorage`; đóng hộp thoại là mất.
- Bản in là một khối `#dsv-print-root` gắn vào cuối `<body>` (ẩn trên màn hình). CSS `@media print` ở `src/styles/index.css` ẩn mọi phần khác của trang và xếp
  2 cột × 4 hàng mỗi trang A4 (lề 6 mm), phiếu không bị cắt ngang trang. Đã đo trên trình duyệt thật: nội dung mỗi phiếu vừa ô cao 262 px.
- "Tải tệp PDF" mở cùng hộp thoại in của trình duyệt, đặt sẵn tên tệp `Phieu-dang-nhap-lop-<tên lớp>` và nhắc chọn "Lưu dưới dạng PDF" làm máy in:
  giao diện không tự dựng tệp PDF (không thêm thư viện PDF, tránh nhúng phông chữ tiếng Việt).

### Tệp mẫu

`GET .../import/template?format=xlsx|csv` tải qua `apiClient.download`. Backend chưa công bố header `Content-Disposition` cho trình duyệt (CORS), nên tên tệp lấy
từ tên dự phòng `mau-danh-sach-hoc-sinh.xlsx` / `.csv` khi không đọc được header.

## 2. Web học tập — khu học của học sinh

| Route | Màn hình | Nội dung |
|---|---|---|
| `/dang-nhap` | Học sinh đăng nhập | Mã học sinh (tự viết hoa, bỏ khoảng trắng và dấu gạch) + mật khẩu; sai mã, sai mật khẩu, người lớn đăng nhập nhầm đều cùng một câu; tạm khóa / vô hiệu hiện nguyên câu của máy chủ |
| `/doi-mat-khau` | Đổi mật khẩu | **Bắt buộc** (lần đầu hoặc sau khi giáo viên đặt lại): không hỏi mật khẩu hiện tại, phải khác mật khẩu tạm, nhập hai lần, không có thanh điều hướng. **Tự đổi**: thêm mật khẩu hiện tại. Đổi xong nhận token mới ngay |
| `/hoc` | Trang học của em | Ba bản bố cục theo cấp của lớp (dưới đây) |

Trang học của em đọc `GET /student/class` mỗi lần mở (giáo viên có thể vừa sửa khối). Cấp học của lớp chọn bản bố cục **và** bộ giao diện: nếu khác cấp trong phiên thì phiên được cập nhật ngay.

| Cấp | Bố cục |
|---|---|
| 1 (khối 1-5) | Một cột; thẻ chào có linh vật và nút loa đọc to (giọng đọc có sẵn của trình duyệt, vi-VN; không có giọng thì không hiện nút); nút lớn "Nhập mã bài học"; thẻ Lớp của em (lớp, giáo viên, trường); không bảng, không điểm |
| 2 (khối 6-9) | Hai cột: lời chào, họ tên · mã học sinh, khối Lớp của em đủ sáu thông tin; cột phụ có lối vào nhập mã bài học |
| 3 (khối 10-12) | Gọn như trang tài liệu: thanh bên mục lục, một dòng thông tin đầu trang, Lớp của em dạng bảng dòng, biểu tượng tối giản |

Bài kiểm tra đang chờ, bài học của em, gợi ý và huy hiệu dựng cùng chức năng bài học và làm bài; trang hiện lời nhắc nhập mã bài học tới lúc đó.

### Hồ sơ học sinh

Máy chủ trả hồ sơ học sinh dạng riêng (`userId`, `studentCode`, lớp lồng bên trong). `studentApi.ts` đổi sang `StudentProfile` dùng chung với các hồ sơ khác
(`toStudentProfile`): `username` = mã học sinh, `email` = `null`, trường lấy từ lớp. Đổi mật khẩu trả `{ accessToken, student }`; phiên nhận token mới cùng hồ sơ.
Máy chủ trả 401 (vô hiệu, xóa học sinh, xóa lớp, ngừng trường, đặt lại mật khẩu, đổi mật khẩu ở nơi khác) thì phiên kết thúc và màn hình đăng nhập hiện
"Phiên đăng nhập đã hết. Vui lòng đăng nhập lại."

## 3. Chưa làm ở luồng này

- Hồ sơ học tập của học sinh (nhóm bài học và kết quả): route `/giao-vien/lop/:lop/hoc-sinh/:hocSinh` còn "Đang xây dựng"; dòng học sinh chưa là liên kết.
- Tab Bài học, Tiến độ, Thành thạo, Gợi ý ôn tập của Chi tiết lớp.
- Tổng quan trường (số lớp, số học sinh theo cấp từ `GET /org/school-summary`): màn hình Tổng quan trường chưa dựng nên chưa dùng endpoint này.
- Tải tệp PDF thật (xem trên): đang dùng hộp thoại in của trình duyệt.

## 4. Kiểm thử

- Đơn vị và màn hình với API giả: `ClassesPage.test.tsx`, `ClassDetailPage.test.tsx` (thêm từng em, nhập dán và nhập tệp, đặt lại mật khẩu, vô hiệu / mở lại / xóa,
  sửa tại chỗ, đủ sĩ số, 404), `slips.test.ts`; `LearnHomePage.test.tsx` (ba bản bố cục, đổi cấp, lỗi), `LoginPage.test.tsx`, `ChangePasswordPage.test.tsx`;
  gói dùng chung: `classroomApi.test.ts` (hồ sơ máy chủ, `FormData`, tải tệp), `validation/classroom.test.ts`.
- Trình duyệt thật (Chrome) với API nhánh `feature/DSVHVN-007-lop-hoc-sinh` trên **database tạm** tạo bằng migration, `Email__Mode=Log`: giáo viên tạo ba lớp (khối 7, 3, 11),
  nhập 3 học sinh bằng văn bản dán (có dòng trống), tải tệp mẫu `.xlsx`, xem phiếu và đo bản in, học sinh đăng nhập sai rồi đúng (gõ `hs 69x9-yw`), đổi mật khẩu
  lần đầu (trùng mật khẩu tạm bị từ chối), vào Lớp của em; giáo viên đặt lại mật khẩu thì phiên cũ của học sinh hết dùng ngay, đăng nhập lại bằng mật khẩu mới;
  sửa khối sang 4 và 11 thì trang học đổi sang bản cấp 1 và cấp 3. Không có lỗi hay cảnh báo trong console. Database tạm và các tiến trình đã tắt sau khi chạy.
