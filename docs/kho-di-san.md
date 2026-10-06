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
- **Tải ảnh lên** (tab Ảnh và media, nút Tải ảnh lên): kéo thả hoặc chọn tệp, xem trước ngay, ghi công đủ ba phần vẫn bắt buộc, có thanh tiến độ khi gửi (`XMLHttpRequest`, vì `fetch` không báo tiến độ gửi). Tệp được kiểm ngay khi chọn: JPG, PNG, WEBP và tối đa 5 MB, cùng câu với backend (`packages/dung-chung/src/files.ts`); backend kiểm lại theo nội dung tệp (đổi đuôi `.jpg` cho chương trình thì bị từ chối), bỏ EXIF và tạo ảnh thu nhỏ WEBP. Danh sách ảnh dùng `previewUrl` (ảnh thu nhỏ), chưa có thì dùng ảnh gốc. Thêm ảnh bằng đường dẫn vẫn còn (nút Thêm bằng đường dẫn) và nhận cả đường dẫn dạng `/files/images/...`. Xóa ảnh khỏi di sản là xóa mềm: chỉ gỡ khỏi thư viện, tệp vẫn nằm trong kho. Ảnh minh họa của sự kiện (hộp thoại sự kiện) vẫn thêm bằng đường dẫn; backend đã có endpoint tải lên cho sự kiện, giao diện chưa dùng.
- **Đường dẫn tệp trong kho** là tương đối (`/files/images/...`) khi backend không đặt `Storage:PublicBaseUrl`, nên giao diện ghép với địa chỉ gốc của máy chủ API (`resolveFileUrl`, `src/lib/fileUrl.ts`). Đặt `Storage:PublicBaseUrl` thì đường dẫn đã là địa chỉ đủ và giữ nguyên. Web học tập ghép ở `safeUrl` của trang khám phá; ảnh trong các bài học (`LessonParts`, bài học theo cấp) chưa ghép, cần đặt `Storage:PublicBaseUrl` khi dùng ảnh tải lên trong bài học.
- **Chọn tọa độ trên bản đồ** (tab Thông tin chung): bản đồ OpenStreetMap dùng chung với web học tập, kèm Hoàng Sa, Trường Sa thuộc Việt Nam và ghi công OpenStreetMap. Bấm lên bản đồ để đặt ghim, kéo ghim để chỉnh; hai ô vĩ độ, kinh độ vẫn là nơi nhập chính xác (và là cách dùng bằng bàn phím), gõ số thì ghim dời theo. Bấm hoặc thả ngoài vĩ độ 8,0 đến 23,5 và kinh độ 102,0 đến 117,5 thì không nhận và báo. Có nút Xóa tọa độ. Tọa độ làm tròn 6 chữ số thập phân. Component `CoordinatePicker`, nền bản đồ và danh sách Hoàng Sa, Trường Sa nằm ở `packages/dung-chung/src/map` (web học tập cũng nhập từ đó); CSS bản đồ ở `styles/ban-do.css`.
- **Khác thiết kế Figma**: chưa có nút "Xem trang công khai" vì web học tập chưa có trang chi tiết di sản cho khu quản trị; năm bắt đầu của giai đoạn không bắt buộc theo backend; thêm nút xóa cho di sản nháp hoặc đã ẩn; ô "Chọn ảnh khác" thành chọn trong thư viện ảnh của di sản.

## Kiểm thử

- Test đơn vị: `packages/dung-chung` (kiểm dữ liệu, nhãn, ghép và tách tiêu đề nguồn), `apps/web-quan-tri` (đổi thứ tự, ô nhập ⇄ dữ liệu gửi).
- Test màn hình với API giả: `HeritagesPage.test.tsx`, `HeritageEditorPage.test.tsx`.
- Trình duyệt thật, tải ảnh và chọn tọa độ: `npm run smoke:tai-anh -w @dsvhvn/web-quan-tri` (28 bước; bản đồ bấm, kéo ghim, ngoài lãnh thổ; tệp văn bản, tệp giả ảnh, tệp quá 5 MB bị từ chối; ảnh JPG được lưu, bỏ EXIF, có ảnh thu nhỏ; xuất bản; xóa mềm; trang công khai hiện ảnh) với API nhánh có tải tệp trên database tạm, `Storage__Local__RootPath` trỏ thư mục tạm và `Email__Mode=Log`.
- Trình duyệt thật: `npm run smoke:di-san -w @dsvhvn/web-quan-tri` (34 bước; tạo di sản, ảnh, giai đoạn, sự kiện, nguồn, xuất bản, ẩn, hiện lại, xóa) với API chạy trên **database tạm mới** (đã nạp 20 di sản đợt 1 ở trạng thái Nháp), xóa database sau khi chạy.
