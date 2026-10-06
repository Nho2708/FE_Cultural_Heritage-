# Xem trang công khai, xem trước bản nháp và xem như học sinh

Hai nút giúp người soạn nội dung nhìn thấy kết quả trước khi học sinh và khách thấy. API ở backend: `docs/kho-di-san.md` (xem trước bản nháp) và `docs/bai-hoc-theo-cap.md` mục "Xem như học sinh".

## 1. Quản trị hệ thống, màn hình Biên tập di sản

| Di sản | Nút | Việc làm |
|---|---|---|
| Đã xuất bản | **Xem trang công khai** | Liên kết mở tab mới tới trang chi tiết di sản của web học tập (`VITE_LEARNING_WEB_URL` của web quản trị + `/di-san/{đường dẫn}`) |
| Nháp hoặc Đã ẩn | **Xem trước** | Mở tab mới ngay khi bấm (tránh bị chặn cửa sổ bật lên); có thay đổi chưa lưu thì lưu nháp trước; xin mã xem trước (hết hạn sau khoảng 30 phút); chuyển tab sang `/xem-truoc/di-san/{mã}` của web học tập |

Trang xem trước (web học tập) dùng lại đúng thành phần của trang chi tiết công khai, thêm dải "Bản xem trước — chưa xuất bản" kèm giờ hết hạn, thẻ `robots` `noindex, nofollow, noarchive`, bỏ liên kết sang bản đồ và dòng thời gian công khai (bản nháp chưa có ở đó). Mã hết hạn thì trang báo hết hạn và không hiện nội dung.

### Token của quản trị chuyển sang tab xem trước thế nào

Hai web khác nguồn gốc nên không dùng chung phiên đăng nhập. Tab xem trước **hỏi lại chính cửa sổ đã mở nó** bằng `postMessage` (`packages/dung-chung/src/auth/previewToken.ts`):

- web quản trị chỉ trả lời cửa sổ do nó vừa mở, chỉ khi tin đến từ đúng nguồn gốc web học tập, chỉ cho quản trị hệ thống đang đăng nhập, và chỉ gửi tới đúng nguồn gốc đó;
- web học tập chỉ nhận tin từ đúng cửa sổ đã mở nó và đúng nguồn gốc web quản trị (`VITE_ADMIN_WEB_URL`); token nằm trong bộ nhớ của tab, không vào đường dẫn, không ghi ra máy;
- mở thẳng đường dẫn xem trước (không đi từ web quản trị) hoặc đóng web quản trị rồi tải lại thì không có token: trang báo chỉ mở được từ trang quản trị.

## 2. Giáo viên, màn hình Soạn bài học

Nút **Xem như học sinh** (cần lưu bài trước) mở hộp thoại rộng, vẽ bài bằng chính thành phần bố cục cấp 1, 2, 3 của web học tập, trong bộ giao diện của cấp lớp. Thành phần nằm ở `packages/dung-chung/src/lesson` (`LessonView`, `LessonThemeScope`, `LessonLinksProvider`):

- web học tập cấp đường dẫn thật (di sản, bản đồ, dòng thời gian, làm bài, về trang học) và nhớ bước đang dừng của cấp 1;
- web quản trị không cấp đường dẫn nào (`NO_LESSON_LINKS`): không liên kết sang trang công khai của di sản, bài kiểm tra chỉ để xem, không đặt tiêu đề trang, không ghi tiến độ; bộ giao diện ghi trên một khối chứ không ghi lên thẻ `html` của web quản trị.

Quản trị trường, học sinh và khách không có nút này.

## 3. Kiểm thử trên trình duyệt thật

`npm run smoke:xem-truoc -w @dsvhvn/web-quan-tri` (đầu tệp `apps/web-quan-tri/scripts/smoke-xem-truoc.mjs` ghi điều kiện chạy): trang công khai của di sản đã xuất bản, xem trước bản nháp ở tab mới, người ngoài và giáo viên không đọc được bản nháp, mở thẳng đường dẫn không xem được, giáo viên xem như học sinh bài cấp 1 và cấp 3, 390 px không tràn ngang, không có yêu cầu ghi nào.
