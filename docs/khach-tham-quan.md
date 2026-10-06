# Khách tham quan trên web học tập

> Chạy ngày 07/10/2026 (+07) với backend nhánh `feature/DSVHVN-019-khach-tham-quan` trên database tạm (đã xóa sau khi chạy).
> Kết quả kiểm trên trình duyệt thật: **57/57 bước đạt**, không có lỗi JavaScript trên trang, không có phản hồi 5xx.
> Script: [`apps/web-hoc-tap/scripts/smoke-khach.mjs`](../apps/web-hoc-tap/scripts/smoke-khach.mjs) (`npm run smoke:khach -w @dsvhvn/web-hoc-tap`).

## Màn hình và chức năng

| Màn hình | Đường dẫn | Nội dung |
|---|---|---|
| Trang chủ | `/` | Chỉ với khách: khu **Gợi ý cho bạn** (chưa có lịch sử thì chỉ có lời mời xem thử, khối di sản nổi bật ngay bên dưới) và khu **Gần bạn** |
| Chi tiết di sản | `/di-san/:diSan` | Cuối trang, chỉ với khách: **Gợi ý cho bạn** theo di sản đang xem và lịch sử của thiết bị, không gợi lại chính di sản đang xem |
| Bản đồ di sản | `/ban-do` | Chỉ với khách: nút nổi **Gần bạn**. Bấm thì trình duyệt hỏi quyền vị trí, bản đồ vẽ chấm vị trí và hiện bảng tối đa 6 di sản gần nhất kèm khoảng cách; chọn một dòng thì mở ghim đó |
| Lịch sử của tôi | `/lich-su` | Tab Lịch sử: nhóm từ khóa đã tìm, di sản đã xem, tóm tắt đã đọc, đã nghe, mô hình 3D đã xem (mới nhất trước, 50 mục mỗi lần, "Xem thêm"); xóa từng mục hoặc xóa tất cả có hộp xác nhận; ghi chú tự xóa sau 90 ngày. Tab Cài đặt (`?tab=cai-dat`): đổi ngôn ngữ, công tắc dùng vị trí, giải thích mã thiết bị ẩn danh |
| Trang nhúng cho app | `/nhung/ban-do`, `/nhung/3d/:diSan` | Không cần đăng nhập, không có thanh điều hướng, nói chuyện với app bằng thông điệp của gói dùng chung |

Mục **Lịch sử của tôi** nằm trên thanh điều hướng của khách (cạnh Ngôn ngữ). Học sinh đã đăng nhập không có mục này, không thấy hai khu gợi ý và Gần bạn, mở `/lich-su` thì được đưa về trang học. Chữ giao diện của mọi mục mới có đủ năm ngôn ngữ (Việt, Anh, Hàn, Trung giản thể, Nhật); web quản trị và khu học của học sinh vẫn chỉ tiếng Việt.

## Mã thiết bị ẩn danh

- Trình duyệt sinh một mã UUID phiên bản 4 ở lần mở đầu tiên, lưu ở `localStorage` (`dsvhvn.hoc-tap.ma-thiet-bi`). Mã sai định dạng thì được thay bằng mã mới. Trình duyệt chặn lưu trữ thì mã chỉ sống trong bộ nhớ của tab.
- Mã đi ở tiêu đề `X-Device-Key` (kèm `X-Client-Platform: WEB`) của các yêu cầu công khai khi người xem là khách, nên máy chủ tự ghi lượt tìm có từ khóa, xem chi tiết, đọc tóm tắt, xem 3D.
- **Không gửi mã** khi: học sinh đã đăng nhập (học sinh không bị ghi lịch sử); đang ở trang nhúng cho app (app có mã riêng, mã sinh trong WebView chỉ tạo thêm thiết bị ma); tải ngầm ảnh bìa trang chủ (không phải việc khách chủ động mở, nên không được vào lịch sử "đã xem"); yêu cầu **Gần bạn** (máy chủ không cần ghép vị trí với thiết bị).
- "Nghe thuyết minh" chạy trên trình duyệt nên web gọi ghi một lượt `LISTEN` ở lần bấm Phát đầu tiên của mỗi lần mở hộp thoại.

## Gần bạn

- Trình duyệt không hỗ trợ vị trí, hoặc khách đã chặn quyền: ẩn cả khu.
- Quyền chưa hỏi hoặc khách chưa bật: chỉ có lời mời và nút "Cho phép dùng vị trí"; bấm thì trình duyệt hỏi. Khách đã bật từ lần trước và trình duyệt vẫn cho phép: danh sách hiện luôn, không hỏi lại. Cờ "đã bật" được nhớ ở máy chủ (`PUT /public/guest/device`), không chứa tọa độ.
- Tọa độ làm tròn 3 chữ số ngay ở trình duyệt, gửi trong **thân** yêu cầu `POST /public/guest/nearby`; không nằm trên đường dẫn, không lưu ở `localStorage`/`sessionStorage`, không vào nhật ký của máy chủ. Khoảng cách định dạng ở máy khách theo ngôn ngữ đang chọn ("Cách 350 m", "1.2 km away").
- Vị trí ngoài Việt Nam: báo bằng lời, không có danh sách.

## Gợi ý cho bạn

Máy chủ trả mã điểm chung (cùng loại hình, tỉnh, vùng, cấp xếp hạng, thời kỳ, nội dung gần giống) và tên di sản giống nhất; giao diện ghép câu theo ngôn ngữ. Tải gợi ý lỗi thì khối này ẩn đi, không che phần còn lại của trang. Ở trang chi tiết, gợi ý chỉ được hỏi sau khi chi tiết đã tải (lượt xem đã được ghi).

## Mã nguồn

- Gói dùng chung `packages/dung-chung`: `src/api/guest.ts` (các endpoint, kiểu dữ liệu, `createGuestApi`: mã thiết bị truyền tường minh nên app mobile dùng lại được), `src/guest.ts` (kiểm và sinh mã thiết bị, định dạng khoảng cách), tùy chọn `headers` cho từng yêu cầu của tầng gọi API.
- Web học tập `apps/web-hoc-tap/src`: `lib/guest` (mã thiết bị, khi nào gửi mã), `guest/` (truy vấn, quyền vị trí, khu Gợi ý cho bạn, khu Gần bạn, bảng Gần bạn trên bản đồ), `pages/GuestHistoryPage.tsx`.

## Lưu ý cho app mobile

Lớp gọi API của app đang gửi mã thiết bị ở tiêu đề `X-Device-Id`; backend nhận `X-Device-Key` (UUID phiên bản 4). Khi ghép nhánh app cần đổi sang `GUEST_HEADERS.deviceKey` của gói dùng chung hoặc dùng `createGuestApi` để lịch sử và gợi ý của khách chạy qua máy chủ.
