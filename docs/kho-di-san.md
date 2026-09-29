# Luồng Kho di sản — web quản trị (quản trị hệ thống)

Ba màn hình cho quản trị hệ thống, gọi API `/api/v1/admin` của backend (xem `docs/kho-di-san.md` ở repo backend):

| Màn hình | Route | Nội dung |
|---|---|---|
| Quản lý di sản | `/quan-tri/di-san` | Bảng ảnh, tên, tỉnh, loại, cấp xếp hạng, trạng thái, số giai đoạn, số nguồn; tìm theo tên không phân biệt dấu; lọc theo tỉnh, loại, cấp, trạng thái (nằm trên URL); ẩn, hiện lại, xóa qua hộp xác nhận chung |
| Biên tập di sản | `/quan-tri/di-san/moi`, `/quan-tri/di-san/:diSan?tab=` | Bốn tab: Thông tin chung, Ảnh và media, Dòng thời gian, Nguồn tham chiếu. Lưu nháp, Xuất bản, Ẩn, Hiện lại tùy trạng thái |
| Biểu mẫu giai đoạn và sự kiện | hộp thoại trong tab Dòng thời gian | Thêm, sửa giai đoạn và sự kiện (năm âm là trước Công nguyên, tháng, ngày tùy chọn, thời điểm kết thúc, thứ tự, ảnh minh họa kèm ghi công) |

## Điểm cần biết

- **Kiểm dữ liệu ở máy khách khớp máy chủ**: `packages/dung-chung/src/validation/heritage.ts` chép luật và câu của backend (độ dài, đường dẫn, tọa độ trong lãnh thổ Việt Nam, năm công nhận, ngày có thật kể cả năm nhuận và năm âm, kết thúc không trước bắt đầu, giấy phép ảnh, ghi công đủ ba phần, nguồn website bắt buộc có đường dẫn). Lỗi của máy chủ (`errors` theo tên trường) hiện dưới đúng ô.
- **Điều kiện xuất bản**: backend quyết định. Thiếu thì trả 422 `NOT_READY` kèm danh sách; giao diện hiện thanh báo và nút mở đúng tab. Di sản nháp còn thiếu luôn hiện thanh báo lấy từ `readiness` của chi tiết. Bấm Xuất bản khi có thay đổi chưa lưu thì lưu trước rồi mới xuất bản.
- **Đổi thứ tự**: kéo thả hoặc phím mũi tên lên, xuống trên biểu tượng kéo; gửi toàn bộ id theo thứ tự mới.
- **Thay đổi chưa lưu**: rời trang hoặc đóng tab khi tab Thông tin chung đang sửa dở thì hỏi lại.
- **Tiêu đề nguồn** ghép từ ba ô (tên tài liệu, cơ quan hoặc tác giả, ngày truy cập) theo mẫu "Tên — Cơ quan, truy cập dd/mm/yyyy"; backend chỉ lưu một chuỗi tiêu đề.
- **Khác thiết kế Figma**: chưa có bản đồ chọn điểm (nhập vĩ độ, kinh độ và mở bản đồ ngoài để xem); chưa có nút "Xem trang công khai" vì web học tập chưa có trang chi tiết di sản; ảnh là đường dẫn (backend chưa có kho tệp) nên ô "Chọn ảnh khác" thành các ô đường dẫn và ghi công; năm bắt đầu của giai đoạn không bắt buộc theo backend; thêm nút xóa cho di sản nháp hoặc đã ẩn.

## Kiểm thử

- Test đơn vị: `packages/dung-chung` (kiểm dữ liệu, nhãn, ghép và tách tiêu đề nguồn), `apps/web-quan-tri` (đổi thứ tự, ô nhập ⇄ dữ liệu gửi).
- Test màn hình với API giả: `HeritagesPage.test.tsx`, `HeritageEditorPage.test.tsx`.
- Trình duyệt thật: `npm run smoke:di-san -w @dsvhvn/web-quan-tri` (34 bước; tạo di sản, ảnh, giai đoạn, sự kiện, nguồn, xuất bản, ẩn, hiện lại, xóa) với API chạy trên **database tạm mới** (đã nạp 20 di sản đợt 1 ở trạng thái Nháp), xóa database sau khi chạy.
