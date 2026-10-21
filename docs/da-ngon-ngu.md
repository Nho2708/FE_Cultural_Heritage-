# Đa ngôn ngữ, AI dịch và tóm tắt di sản, nghe thuyết minh (giao diện)

Phần giao diện của luồng đưa nội dung di sản công khai sang **năm ngôn ngữ**: tiếng Việt (bản gốc), tiếng Anh, tiếng Hàn, tiếng Trung giản thể, tiếng Nhật. Backend:
[`BE_Cultural_Heritage-/docs/da-ngon-ngu.md`](../../BE_Cultural_Heritage-/docs/da-ngon-ngu.md).

| Ứng dụng | Việc đã làm |
|---|---|
| Web học tập (phần công khai) | Bộ chọn ngôn ngữ (nhớ trên máy), tệp chuỗi giao diện năm ngôn ngữ, nội dung di sản theo ngôn ngữ, nhãn "bản dịch máy", thông báo thiếu bản dịch, hộp thoại Tóm tắt và nghe thuyết minh bằng giọng của trình duyệt |
| Web quản trị (quản trị hệ thống) | Tab "Bản dịch và tóm tắt" ở Biên tập di sản (nút "Dịch và tóm tắt bằng AI"), màn hình "Duyệt bản dịch và tóm tắt" (`/quan-tri/ban-dich`), cột và bộ lọc "Bản dịch" ở Quản lý di sản |

Khu học của học sinh và toàn bộ web quản trị **chỉ tiếng Việt**; chỉ phần công khai của web học tập có năm ngôn ngữ.

## 1. Web học tập

### Chọn ngôn ngữ

- Mục "Ngôn ngữ" trên thanh điều hướng (ngăn kéo ở màn hình hẹp) mở hộp thoại **Chọn ngôn ngữ**: năm lựa chọn viết bằng chính ngôn ngữ đó (Tiếng Việt · English · 한국어 · 简体中文 · 日本語), không dùng cờ quốc gia;
  dòng đang chọn có dấu tích; ghi chú "Bản dịch tiếng Hàn, tiếng Trung và tiếng Nhật là bản dịch máy."
- **Mặc định lần đầu mở**: ngôn ngữ đầu tiên của trình duyệt thuộc năm ngôn ngữ (`vi`, `en`, `ko`, `ja`, `zh`, `zh-CN`, `zh-SG`, `zh-Hans`…), không có thì **tiếng Anh**. Tiếng Trung phồn thể (`zh-TW`, `zh-HK`, `zh-Hant`) không thuộc năm ngôn ngữ.
  Lựa chọn nhớ trong `localStorage` (`dsvhvn.hoc-tap.ngon-ngu`) và có hiệu lực ở lần mở sau. Thẻ `<html lang>` đổi theo.
- **Học sinh đã đăng nhập luôn xem tiếng Việt**, không có mục Ngôn ngữ; lựa chọn đã nhớ của khách không bị ghi đè. Máy chủ cũng ép tiếng Việt cho học sinh.
- Mọi lời gọi nội dung di sản gửi `lang` (home, danh sách, bản đồ, chi tiết, dòng thời gian, tóm tắt, xem trước bản nháp) và đưa ngôn ngữ vào khóa bộ nhớ đệm: đổi ngôn ngữ thì tải lại nội dung.
  Luôn gửi `lang=vi` ngay cả khi là tiếng Việt, vì tiêu đề `Accept-Language` của trình duyệt có thể chọn ngôn ngữ khác.

### Chữ giao diện

- `apps/web-hoc-tap/src/i18n/strings/{vi,en,ko,zh-Hans,ja}.ts`: tiếng Việt là bản gốc, bốn tệp còn lại phải đủ khóa và cùng số tham số của hàm (kiểu `Strings`, kiểm lại ở test). Tên riêng giữ nguyên ở mọi ngôn ngữ ("DiViet", UNESCO).
- `i18n/taxonomy.ts`: tên loại di sản, cấp xếp hạng, vùng, thời kỳ và **34 tỉnh, thành phố** ở năm ngôn ngữ. Máy chủ chỉ trả tên tiếng Việt của các danh mục này nên giao diện tra theo giá trị enum hoặc theo tên tiếng Việt; tên lạ giữ nguyên.
- `i18n/format.ts`: số, tọa độ (`16,4694° B · 107,5778° Đ` ở tiếng Việt, `16.4694° N · 107.5778° E` ở ngôn ngữ khác) và **năm trước Công nguyên**: chữ ngày tháng máy chủ trả sẵn ("179 TCN", "1962 – nay") được đổi
  sang `179 BCE`, `기원전 179`, `公元前179`, `紀元前179` và "present", "현재", "至今", "現在".
- Bản đồ: nhãn nút phóng to, thu nhỏ, ghi công nền, tên hai quần đảo luôn kèm "Việt Nam" ở mọi ngôn ngữ (`MapLabels` của `@dsvhvn/dung-chung/map/base`). Đổi ngôn ngữ thì bản đồ dựng lại.
- Lỗi: tiếng Việt dùng câu của máy chủ; ngôn ngữ khác dùng câu lỗi chung trong tệp chuỗi (câu của máy chủ chỉ có tiếng Việt).

### Nhãn và thông báo

| Tình huống | Hiển thị |
|---|---|
| Tiếng Hàn, Trung, Nhật | Nhãn "Bản dịch máy, có thể chưa chính xác." một lần ở đầu trang chi tiết và dòng thời gian; ở danh sách, bản đồ có dòng chú thích riêng |
| Chưa có bản hiện hành (tiếng Anh chờ duyệt hoặc bị từ chối, chưa dịch) | Hiện nội dung tiếng Việt kèm **một thông báo cho cả trang**: "Nội dung này chưa có bản {ngôn ngữ}. Đang hiển thị bản tiếng Việt." Thẻ ở danh sách lùi về tiếng Việt từng thẻ, thông báo một lần ở đầu danh sách |
| Di sản chưa có tóm tắt tiếng Việt đã duyệt (`hasSummary` = false) | Bấm "Tóm tắt" hoặc "Nghe" chỉ báo "Di sản này chưa có tóm tắt. Bạn vẫn có thể đọc nội dung đầy đủ bên dưới."; không mở hộp thoại, không gọi API tóm tắt, **không có cổng quảng cáo** (luồng quảng cáo làm sau) |
| Từ khóa tìm kiếm | Khớp bản tiếng Việt và bản dịch hiện hành của ngôn ngữ đang chọn; gợi ý ở trang chủ dùng từ khóa tiếng Việt để khớp ở mọi ngôn ngữ |

### Tóm tắt và nghe thuyết minh

Nút "Tóm tắt" và "Nghe" ở trang chi tiết (không có ở trang xem trước bản nháp) mở hộp thoại **Tóm tắt và thuyết minh** với hai tab (khách phải xem một quảng cáo có thưởng của Google để mở, xem [quang-cao-google.md](quang-cao-google.md); học sinh mở thẳng):

- **Đọc**: bản tóm tắt chi tiết theo ngôn ngữ đang chọn, lấy từ bản đã lưu (`GET /public/heritages/{slug}/summary`), không gọi AI khi xem; tiếng Hàn, Trung, Nhật có nhãn bản dịch máy.
- **Nghe**: chữ của bản tóm tắt ngắn, **Phát · Tạm dừng · Tiếp tục · Dừng**, tốc độ 0,75× · 1× · 1,25× · 1,5×, câu đang đọc được tô sáng, dòng trạng thái "Đang đọc câu 2 / 3 · Giọng đọc của thiết bị".
  Dùng **Web Speech API** của trình duyệt (không có tệp âm thanh, không tốn băng thông, không gọi dịch vụ ngoài). Đọc **từng câu một** (tách bằng `Intl.Segmenter`) để tô sáng, tạm dừng và đổi tốc độ ổn định; đổi tốc độ khi đang đọc thì đọc lại từ câu hiện tại.
- **Giọng**: chọn theo mã giọng của ngôn ngữ (`vi-VN`, `en-US`, `ko-KR`, `zh-CN`, `ja-JP`; trùng cả vùng thì ưu tiên, không thì giọng cùng ngôn ngữ). Thiết bị chưa có giọng (danh sách giọng đã nạp mà không có giọng nào khớp): báo
  "Thiết bị chưa có giọng đọc cho ngôn ngữ này" kèm hướng dẫn cài giọng, khóa nút Phát, **vẫn hiện đủ chữ**. Trình duyệt không có Web Speech API: báo riêng. Danh sách giọng chưa nạp xong (Chrome nạp muộn): cho thử đọc.
- Khi ngôn ngữ chưa có tóm tắt hiện hành, máy chủ trả tóm tắt tiếng Việt với `localization.isFallback`: hộp thoại hiện thông báo thiếu bản dịch và đọc bằng **giọng tiếng Việt**, không đọc bằng giọng của ngôn ngữ khác.
- Máy chủ trả 404 `SUMMARY_UNAVAILABLE`: hiện câu chưa có tóm tắt, không có nút Thử lại.

## 2. Web quản trị

### Tab Bản dịch và tóm tắt (Biên tập di sản)

Tab thứ năm (`?tab=ban-dich`). Bảng năm ngôn ngữ × hai đơn vị duyệt (Bản dịch: mô tả ngắn, nội dung, giai đoạn, sự kiện, chú thích ảnh cùng lúc; Tóm tắt: bản ngắn và bản chi tiết cùng lúc), mỗi ô có trạng thái:
Chưa có · Bản dịch máy · Chờ duyệt · Đã duyệt · Bị từ chối · Cần dịch lại. Tiếng Việt là bản gốc nên chỉ có tóm tắt.

- Nút **"Dịch và tóm tắt bằng AI"**: một lần bấm gọi AI năm lần (một tóm tắt tiếng Việt, bốn bản dịch chạy song song) nên có thể mất vài phút; trong lúc chờ nút khóa và có dòng "AI đang xử lý, vui lòng đợi trong giây lát". Thành công thì hiện bảng mới
  và thông báo; Dịch vụ AI lỗi (503) thì báo, **không lưu gì, bản cũ giữ nguyên**, có nút "Thử lại"; đang có lần dịch khác chạy (409) và chưa có nội dung tiếng Việt hoặc đang ẩn (422) hiện đúng câu của máy chủ. Việc dịch không tính vào hạn mức lượt AI của trường.
- Dải nhắc **"cần dịch lại"** khi nội dung tiếng Việt đã sửa sau lần dịch (bản cũ vẫn hiện cho khách). Sau khi xuất bản mà chưa có bản dịch, Biên tập di sản nhắc ở mọi tab kèm nút mở tab này.
- Ô chờ duyệt có liên kết "Duyệt" sang màn hình duyệt, mở sẵn đúng mục; ô đã duyệt có "Xem và sửa".

### Duyệt bản dịch và tóm tắt

`/quan-tri/ban-dich`, thanh bên mục "Bản dịch". Tab, bộ lọc (di sản, ngôn ngữ, loại), mục đang mở và số trang nằm trên URL (`?tab=cho-duyet|da-duyet|ban-dich-may|bi-tu-choi&di-san=&ngon-ngu=&loai=ban-dich|tom-tat&muc=<di sản>.<loại>.<ngôn ngữ>`).

- Tab **Chờ duyệt** (có số đếm), **Đã duyệt**, **Bản dịch máy** (tiếng Hàn, Trung, Nhật: chỉ xem, không có bước duyệt), **Bị từ chối** (chờ dịch lại).
- Mở một mục thì hiện khung **hai cột**: bản gốc tiếng Việt bên trái (chỉ đọc), bản đang duyệt bên phải. Bản dịch tiếng Anh và tóm tắt tiếng Việt, tiếng Anh **sửa được tại chỗ**; chỉ các ô đã đổi được gửi lên. "Lưu chỉnh sửa" xuất hiện khi có thay đổi.
- **Duyệt** (hiện công khai, ghi người và thời điểm duyệt), **Duyệt cả bản dịch và tóm tắt của ngôn ngữ này** (tiếng Anh), **Từ chối** (yêu cầu dịch lại; ô lý do không bắt buộc, tối đa 500 ký tự, chỉ ghi vào nhật ký thao tác).
  Có chỉnh sửa chưa lưu thì Duyệt lưu trước. Duyệt bản tiếng Anh thì máy chủ dịch lại bản Hàn, Trung, Nhật từ bản đã duyệt; lỗi ở bước đó chỉ trả cảnh báo và lần duyệt vẫn giữ.
- Sửa bản đã duyệt thì bản đó quay về Chờ duyệt và ngừng hiện cho khách cho tới khi được duyệt lại; Từ chối được cả bản đã duyệt (gỡ một bản đã hiện mà còn sai).

### Quản lý di sản và nhật ký

- Cột "Bản dịch" (Chưa dịch · Chờ duyệt · Đã duyệt · Cần dịch lại) và bộ lọc `?ban-dich=` (gửi `translationState`).
- Nhật ký thao tác có thêm ba hành động: cấp liên kết xem trước bản nháp, duyệt, từ chối bản dịch hoặc tóm tắt di sản; đối tượng "Bản dịch di sản" và "Tóm tắt di sản".

## 3. Kiểm thử

- Đơn vị và giao diện (Vitest): đọc mã ngôn ngữ và ngôn ngữ mặc định, tệp chuỗi đủ khóa ở năm ngôn ngữ, tên danh mục và 34 tỉnh, định dạng năm trước Công nguyên và tọa độ, tách câu và chọn giọng,
  chọn ngôn ngữ và nhớ trên máy, học sinh luôn tiếng Việt, nhãn bản dịch máy và thông báo thiếu bản dịch, tóm tắt và nghe (Web Speech giả: phát từng câu, tô sáng, tạm dừng, tốc độ, thiếu giọng, không hỗ trợ),
  tab Bản dịch và tóm tắt, màn hình duyệt (hàng chờ, bộ lọc trên URL, hai cột, sửa chỉ gửi ô đã đổi, duyệt, duyệt cả hai, từ chối kèm lý do, bản dịch máy chỉ xem).
- Trình duyệt thật với API thật: [`apps/web-hoc-tap/scripts/smoke-da-ngon-ngu.mjs`](../apps/web-hoc-tap/scripts/smoke-da-ngon-ngu.mjs) (`npm run smoke:da-ngon-ngu -w @dsvhvn/web-hoc-tap`); kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).
