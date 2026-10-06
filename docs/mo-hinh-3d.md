# Mô hình 3D di sản (giao diện)

Phần giao diện của luồng đưa **mô hình 3D giấy phép mở** vào di sản. Backend: [`BE_Cultural_Heritage-/docs/mo-hinh-3d.md`](../../BE_Cultural_Heritage-/docs/mo-hinh-3d.md).

| Ứng dụng | Việc đã làm |
|---|---|
| Web quản trị (quản trị hệ thống) | Tab **Mô hình 3D** ở Biên tập di sản (tải tệp `.glb` lên hoặc dùng tệp đã lưu trong kho, ghi công, xem thử, hiện, ẩn, thay tệp, sửa, gỡ); cột và bộ lọc **Mô hình 3D** ở Quản lý di sản; nhãn mã thao tác mới ở Nhật ký thao tác |
| Web học tập (phần công khai, khu học của học sinh) | Nút **Xem 3D** ở chi tiết di sản và ở trang xem trước bản nháp; hộp thoại Xem mô hình 3D toàn màn hình; quay về bộ ảnh khi không có mô hình, tải lỗi hoặc thiết bị không hỗ trợ |
| Gói dùng chung | Trình xem 3D `ModelViewer` (`@dsvhvn/dung-chung/model3d`), quy tắc kiểm tệp và ghi công (`model3d.ts`), kiểu dữ liệu và lời gọi API công khai |

Xem 3D **miễn phí, không cần đăng nhập, không có quảng cáo**; lời gọi lấy mô hình không gắn token kể cả khi học sinh đã đăng nhập. Web quản trị và khu học của học sinh chỉ tiếng Việt; hộp thoại Xem 3D ở phần công khai có năm ngôn ngữ.

## 1. Trình xem dùng chung

`packages/dung-chung/src/model3d/ModelViewer.tsx` bọc thành phần `<model-viewer>` chính thức của Google (thư viện `@google/model-viewer`, glTF 2.0 / `.glb`). Cả web quản trị (xem thử trong tab) và web học tập dùng đúng một thành phần; chữ giao diện do nơi dùng truyền vào (`labels`).

- Kéo để xoay, cuộn hoặc chụm hai ngón để phóng to và thu nhỏ, phím mũi tên để xoay; nút **Đặt lại góc nhìn**; thanh tiến trình khi tải (theo sự kiện `progress`); ảnh xem trước (`poster`) hiện trong lúc tải.
- Mô hình tự xoay chậm, trừ khi người dùng đã tắt chuyển động của hệ điều hành (`prefers-reduced-motion`).
- Thư viện nặng (khoảng 1 MB, 290 KB nén) nên **chỉ nạp khi mở trình xem lần đầu** (`import()` động, thành một tệp riêng khi build); không có WebGL thì không nạp.
- Quay về phương án thay thế (`fallback`) khi thiết bị không có WebGL, không nạp được thư viện hoặc tệp mô hình tải lỗi; nơi dùng hiện bộ ảnh kèm câu thông báo.
- Nút Đặt lại góc nhìn xen kẽ hai giá trị lệch nhau 0,001 độ, vì thư viện bỏ qua việc đặt lại cùng một chuỗi hai lần liên tiếp.
- Ánh sáng môi trường mặc định do thư viện tự sinh, không tải từ mạng. Mô hình nén Draco hoặc KTX2 sẽ tải bộ giải mã từ `www.gstatic.com`; nếu sau này đặt chính sách bảo mật nội dung (CSP) thì phải cho phép địa chỉ đó và `res.cloudinary.com` (tệp mô hình khi dùng Cloudinary).
- Tên đọc cho trình đọc màn hình của khung xem lấy từ `labels.viewerAria` (có tiếng Việt và bốn ngôn ngữ còn lại); các câu thông báo hướng nhìn có sẵn của thư viện (ví dụ "View from stage front") vẫn bằng tiếng Anh, chưa Việt hóa.

## 2. Web quản trị: tab Mô hình 3D

Chỉ quản trị hệ thống. Mở bằng `?tab=mo-hinh-3d` (tab thứ sáu, sau Bản dịch và tóm tắt). Di sản mới chưa lưu thì tab nhắc lưu thông tin chung trước.

| Việc | Cách làm |
|---|---|
| Thêm | **Tải mô hình lên** (chọn hoặc kéo thả tệp `.glb`, có thanh tiến độ) hoặc **Dùng tệp đã lưu** (dán đường dẫn tệp đã nằm trong kho tệp); ghi công bắt buộc; ô "Hiện cho khách và học sinh ngay" (khóa nếu di sản đã có mô hình đang hiển thị) |
| Kiểm ngay khi chọn tệp | Đuôi `.glb`, tối đa 15 MB, **12 byte đầu của tệp** (dấu `glTF`, phiên bản 2, độ dài khớp dung lượng); tệp đổi đuôi hoặc `.gltf` nhiều tệp bị từ chối trước khi tải lên. Máy chủ vẫn kiểm lại theo nội dung và tự đo dung lượng (giao diện không gửi dung lượng) |
| Ghi công | Tác giả, giấy phép, đường dẫn nguồn; dòng "tác giả · giấy phép · nguồn" hiện trước khi lưu và do máy chủ ghép khi lưu. Giấy phép gợi ý: CC BY 4.0, CC BY-SA 4.0, CC0 1.0, Phạm vi công cộng, Mô hình nhóm tự dựng. CC BY-NC, CC BY-ND bị chặn; chỉ mô hình nhóm tự dựng được bỏ trống nguồn (khi đó phần nguồn là "Nhóm thực hiện") |
| Dán đường dẫn | Chỉ nhận dạng `/files/models/{mã}.glb` (có thể kèm địa chỉ máy chủ) hoặc địa chỉ Cloudinary loại raw; trang ngoài kho bị chặn ở giao diện, máy chủ còn kiểm tệp có thật và đúng kho |
| Xem thử | Nút **Xem thử** mở trình xem dùng chung ngay trong dòng của mô hình (xoay, phóng to, đặt lại góc nhìn); tải lỗi thì báo và nhắc khách sẽ thấy bộ ảnh |
| Hiện, ẩn | Mỗi di sản một mô hình đang hiển thị; nút **Hiện** của mô hình khác bị khóa khi đã có mô hình hiển thị (hai quản trị bấm cùng lúc thì người đến sau nhận 422 và câu của máy chủ hiện ở thông báo) |
| Thay tệp | Hộp thoại riêng, tải `.glb` mới; thông tin và ghi công giữ nguyên, tệp cũ vẫn nằm trong kho |
| Sửa | Thông tin và ghi công; đường dẫn tệp khác (trong kho) là tùy chọn, bỏ trống thì giữ tệp |
| Gỡ | Hộp xác nhận chung: xóa mềm, tệp trong kho giữ lại |
| Khách có thấy không | Nhãn **Khách đang thấy** khi mô hình hiển thị và di sản đã xuất bản; di sản chưa xuất bản hoặc đang ẩn thì dòng giải thích "Khách chưa thấy mô hình này…", mô hình giữ nguyên trạng thái |

Quản lý di sản: cột **Mô hình 3D** ("Có 3D" khi có mô hình đang hiển thị) và bộ lọc **Mô hình 3D** (tất cả, có, chưa có), lên URL là `?mo-hinh-3d=co` hoặc `?mo-hinh-3d=chua-co` và gửi `hasModel=true|false`.
Nhật ký thao tác có thêm hành động "Thêm, thay, gỡ, ẩn hoặc hiện mô hình 3D của di sản" (đối tượng "Mô hình 3D của di sản"); backend không ghi đường dẫn tệp vào nhật ký.

## 3. Web học tập: Xem 3D

- Chi tiết di sản: nút **Xem 3D** (năm ngôn ngữ: Xem 3D · View in 3D · 3D로 보기 · 查看 3D · 3Dで見る) cùng hàng với Tóm tắt và Nghe, **chỉ khi** `hasModel` bật (di sản có mô hình đang hiển thị). Di sản không có mô hình thì không có nút, chỉ có thư viện ảnh.
- Bấm nút mới gọi `GET /public/heritages/{slug}/model` (không gửi token), hộp thoại toàn màn hình hiện tên mô hình (không đặt tên thì tên di sản), trình xem, **ghi công** ("Ghi công: tác giả · giấy phép · nguồn", không dịch ở mọi ngôn ngữ) kèm liên kết "Xem giấy phép" và "Xem nguồn". Esc hoặc nút Đóng thoát.
- **Mạng di động**: mô hình từ 5 MB trở lên mà trình duyệt báo mạng di động, tiết kiệm dữ liệu hoặc mạng 2G, 3G thì hỏi trước ("Mô hình này khá nặng", kèm dung lượng đo bởi máy chủ, nút "Vẫn tải mô hình"); trình duyệt không báo tình trạng mạng thì tải luôn.
- **Quay về bộ ảnh** kèm câu "Không tải được mô hình 3D. Bạn có thể xem bộ ảnh của di sản." (năm ngôn ngữ) và tối đa sáu ảnh có ghi công, khi: máy chủ trả 404 `MODEL_UNAVAILABLE` (mô hình vừa bị ẩn, di sản vừa bị ẩn), tệp tải lỗi, thiết bị không hỗ trợ WebGL. Lỗi mạng hoặc lỗi máy chủ khác 404 thì thêm nút "Thử lại".
- **Trang xem trước bản nháp**: có nút Xem 3D (vẫn không có Tóm tắt và Nghe), đọc `GET /preview/heritages/{mã}/model` bằng token quản trị đã chuyển sang tab; mô hình của bản nháp không lộ ra API công khai.
- Học sinh đã đăng nhập dùng đúng hộp thoại này bằng tiếng Việt; không có quảng cáo ở bất kỳ bước nào.
- Chưa làm: ghi lượt xem 3D vào lịch sử của khách (thuộc luồng Khách tham quan, cần bảng thiết bị khách ở backend); app mobile dùng lại trình xem khi làm app.

## 4. Kiểm thử

- Test đơn vị: `model3d.test.ts` (kiểm tệp, đầu tệp glTF, đường dẫn trong kho, giấy phép, ghi công, biểu mẫu), `model3d/ModelViewer.test.tsx` (thuộc tính, tiến trình, tải xong, đặt lại góc nhìn, quay về phương án thay thế), `HeritageModelTab.test.tsx` (tab, biểu mẫu, hiện, ẩn, thay tệp, sửa, gỡ, cột và bộ lọc), `HeritageModel3D.test.tsx` (nút, hộp thoại, bộ ảnh, mạng di động, năm ngôn ngữ, xem trước), `modelData.test.ts`.
- Trình duyệt thật với API thật: [`apps/web-hoc-tap/scripts/smoke-mo-hinh-3d.mjs`](../apps/web-hoc-tap/scripts/smoke-mo-hinh-3d.mjs) (`npm run smoke:mo-hinh-3d -w @dsvhvn/web-hoc-tap`), trình xem chạy WebGL thật bằng SwiftShader; kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).
