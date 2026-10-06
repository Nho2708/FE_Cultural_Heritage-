# Luồng Quản trị và tổng quan (giao diện)

Phần giao diện của ba việc trên **web quản trị**: **quản trị trường** xem Tổng quan trường; **quản trị hệ thống** xem Tổng quan và doanh thu, và kiểm duyệt ngân hàng câu hỏi.
Backend ở `BE_Cultural_Heritage-/docs/quan-tri-tong-quan.md` (nhánh `feature/DSVHVN-017-quan-tri-tong-quan`); thiết kế ở Figma (file `AfNZ3KxFxJqqUxmGhYLXuS`) và ảnh trong `doc/design/mockups/`
(Tổng quan trường, Tổng quan và doanh thu, Kiểm duyệt ngân hàng câu hỏi). Mọi số liệu máy chủ tính khi hiển thị; giao diện chỉ trình bày, không tự tính lại điểm hay tỉ lệ.

## 1. Màn hình

| Route | Vai trò | Màn hình | Nội dung |
|---|---|---|---|
| `/truong` | Quản trị trường | Tổng quan trường | Tám thẻ số liệu: giáo viên so với hạn mức (thanh dùng hạn mức), lớp chia theo cấp, học sinh (đã và chưa đăng nhập), bài học, bài kiểm tra đã phát hành (đang mở), lượt nộp, lượt AI trong kỳ so với hạn mức (thanh chuyển vàng từ 90%, ghi ngày hết kỳ), điểm trung bình toàn trường thang 10. Khối **Điểm trung bình theo lớp**: thanh ngang, lớp điểm cao trước, lớp chưa có lượt nộp xếp cuối, lọc theo cấp, mặc định 8 lớp đầu và nút hiện cả. Thẻ **Gói hiện tại**: ngày bắt đầu, hết hạn, còn lại, hạn mức, nút "Xem gói và hóa đơn". Gói còn không quá 14 ngày: lời nhắc gia hạn ở đầu trang; trường không có gói hiệu lực: trang vẫn xem được, hạn mức ghi "chưa có hạn mức" (thanh báo của khu vẫn hiện). Chỉ có số tổng, không có tên giáo viên hay học sinh |
| `/quan-tri` | Quản trị hệ thống | Tổng quan và doanh thu, tab Tổng quan (`?tab=` bỏ trống) | Thẻ số liệu: trường (có và không có gói hiệu lực), giáo viên, học sinh, lượt AI toàn hệ thống (trong tháng, của giáo viên, của quản trị hệ thống), di sản, bài học, bài kiểm tra, ngân hàng câu hỏi (chờ duyệt, đã ẩn). Bảng **Trường đang dùng từng gói** (giá, số trường, sắp hết hạn, nhãn Ngừng bán). Khối **Cần chú ý** suy từ số liệu (trường không có gói, gói sắp hết hạn, câu bị ẩn kèm liên kết). **Biến động theo thời gian**: chọn số liệu (lượt nộp, học sinh, giáo viên, trường mới, bài học, bài kiểm tra, lượt AI) và khoảng (30 ngày, 90 ngày, 12 tháng); biểu đồ cột theo ngày Việt Nam, khoảng dài hơn 92 ngày máy chủ gom theo tháng, kỳ trống vẫn có cột; có bảng số ẩn cho trình đọc màn hình. Khoảng và số liệu nằm trên URL (`?khoang=`, `?chi-so=`) |
| `/quan-tri?tab=doanh-thu` | Quản trị hệ thống | Tổng quan và doanh thu, tab Doanh thu | Doanh thu tính từ **giao dịch VNPay thành công** theo ngày thanh toán giờ Việt Nam: thẻ doanh thu tháng này (kèm hôm nay), từ trước tới nay, số giao dịch thành công; **biểu đồ doanh thu theo kỳ** (30 ngày, 90 ngày, 12 tháng; khoảng chọn giữ trên URL `?khoang-doanh-thu=`); **danh sách giao dịch** của mọi trường (thời điểm tạo, trường, hóa đơn, gói, số tiền, trạng thái, thời điểm thanh toán, mã giao dịch VNPay) lọc theo trạng thái, trường, thời gian giao dịch (`?trang-thai=`, `?truong=`, `?khoang-giao-dich=`), có phân trang. Doanh thu quảng cáo không tính ở đây: hai liên kết mở bảng điều khiển AdMob và Ad Manager ở tab mới. |
| `/quan-tri/cau-hoi` | Quản trị hệ thống | Kiểm duyệt ngân hàng câu hỏi | Ba thẻ đếm cả ngân hàng (đang trong ngân hàng, đã ẩn, cần xem lại; bấm để lọc). Bộ lọc: trường của người tạo, dạng câu, cấp, độ khó, trạng thái, sắp xếp (mới nhất, tỉ lệ đúng thấp nhất), chỉ câu cần xem lại, di sản, từ khóa; tất cả nằm trên URL. Bảng: nội dung, người tạo và trường, dạng, cấp và độ khó, **lượt trả lời**, **tỉ lệ đúng** kèm dấu "Cần xem lại", số bài kiểm tra; hành động Xem, Ẩn câu, Hiện lại câu |
| — | Quản trị hệ thống | Xem câu (hộp thoại lớn, chỉ đọc) | Người tạo, cấp, độ khó, số bài kiểm tra đang dùng, kết quả làm bài (số lượt trả lời, số lượt đúng hoàn toàn); câu cần xem lại có lời báo; đáp án đúng đánh dấu bằng chữ và biểu tượng ở mọi dạng (một đáp án, đúng sai, chọn hình, ghép cặp, sắp xếp, điền từ, nhiều mệnh đề, đọc tư liệu); giải thích; nút Ẩn câu hoặc Hiện lại câu. Không có ô nhập |
| — | Quản trị hệ thống | Xác nhận ẩn hoặc hiện lại câu (hộp thoại) | Câu xác nhận "Bạn có chắc muốn ẩn câu hỏi …?", nói rõ câu không còn chọn được vào bài kiểm tra mới, bài đã phát hành và kết quả cũ giữ nguyên; ô **lý do** tùy chọn (tối đa 500 ký tự) ghi vào nhật ký thao tác. Lỗi của máy chủ (ví dụ câu đã bị ẩn ở nơi khác) hiện ngay trong hộp |

Trang vào mặc định sau đăng nhập: quản trị trường vào `/truong`, quản trị hệ thống vào `/quan-tri`. Thanh bên có mục **Tổng quan** ở đầu cả hai khu. Vai trò khác mở các màn hình này nhận trang 403 và không gọi API của chúng (máy chủ cũng trả 403).

## 2. Quy tắc hiển thị

- **Điểm trung bình** hiện trên thang 10 (phần trăm ÷ 10, làm tròn một chữ số, dấu phẩy thập phân); máy chủ tính trung bình phần trăm của từng lượt nên so được các bài có tổng điểm khác nhau.
- **Câu cần xem lại**: ngưỡng lấy từ máy chủ (`minAnswers`, `lowCorrectPercent`, hiện 10 lượt và dưới 30%), giao diện chỉ hiển thị và giải thích. Đây là đề xuất của nhóm vì đặc tả không có chức năng báo cáo câu hỏi.
- **Hiện lại câu** và mã nhật ký "Hiện lại câu hỏi" là phần thêm ngoài đặc tả (nhãn có trong bộ lọc của màn hình Nhật ký thao tác, 22 mã).
- **Doanh thu**: đã nối với luồng gói và thanh toán VNPay khi gộp hai chuỗi nhánh; chưa có xuất danh sách giao dịch ra tệp.
- Màn hình hẹp (390px): thẻ xếp một cột, bảng cuộn ngang trong khung, trang không tràn ngang.

## 3. Mã

- `packages/dung-chung/src/api/overview.ts`: kiểu dữ liệu và lớp gọi API (tổng quan trường, tổng quan hệ thống, biểu đồ, kiểm duyệt, ẩn, hiện lại); `packages/dung-chung/src/overview.ts`: nhãn, tỉ lệ dùng hạn mức, kỳ biểu đồ theo giờ Việt Nam, sắp xếp lớp (có test).
- `apps/web-quan-tri/src/pages/school/SchoolOverviewPage.tsx`, `pages/admin/OverviewPage.tsx`, `pages/admin/QuestionModerationPage.tsx`; hộp thoại ở `components/question/ModerationDialogs.tsx`, xem câu chỉ đọc ở `QuestionReadOnlyView.tsx`; thẻ, thanh, biểu đồ ở `components/overview/OverviewBits.tsx`.

## 4. Kiểm

`npm run lint`, `npm run typecheck`, `npm test`, `npm run build` đều xanh. Trên trình duyệt thật: `npm run smoke:quan-tri-tong-quan -w @dsvhvn/web-quan-tri`, kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).
