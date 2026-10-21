# Luồng Bài học cho lớp theo cấp, AI soạn nội dung, mã bài học (giao diện)

Phần giao diện của luồng **Bài học**: giáo viên tạo bài cho **một lớp**, để AI soạn bản nháp **đúng cấp** của lớp, sửa, duyệt rồi xuất bản và đưa mã
bài học cho lớp; học sinh của lớp đăng nhập, gõ mã và thấy bài theo **bố cục riêng của cấp mình**. Backend ở
`BE_Cultural_Heritage-/docs/bai-hoc-theo-cap.md` (nhánh `feature/DSVHVN-008-bai-hoc-theo-cap`); thiết kế ở Figma
(file `AfNZ3KxFxJqqUxmGhYLXuS`, frame đặt đúng tên màn hình) và ảnh trong `doc/design/mockups/`.

## 1. Web quản trị — khu giáo viên

| Route | Màn hình | Nội dung |
|---|---|---|
| `/giao-vien/bai-hoc` | Bài học của tôi | Bảng bài học ở mọi lớp: tiêu đề kèm di sản, lớp, trạng thái (Nháp · Đã xuất bản · Lưu trữ), mã bài học (chỉ bài đã xuất bản), số bài kiểm tra, ngày sửa. Lọc theo lớp, trạng thái, loại di sản, từ khóa; bộ lọc và trang nằm trên URL. Thao tác trên dòng: Mã bài học, Nhân bản sang lớp khác, Soạn, Lưu trữ (hỏi xác nhận), Xóa (chỉ bài chưa có bài kiểm tra) |
| — | Tạo bài học: chọn lớp và di sản | Hộp thoại hai bước: chọn lớp (cấp hiện kèm), rồi chọn 1-10 di sản **đã xuất bản** (tìm theo tên, lọc tỉnh và loại, phân trang) và đặt tiêu đề. Mở từ Chi tiết lớp thì lớp chọn sẵn và khóa, bỏ bước 1. Tạo xong mở Soạn bài học |
| `/giao-vien/bai-hoc/:baiHoc` | Soạn bài học | Thông tin bài (lớp khóa, tiêu đề, di sản); khối **Nội dung bài theo cấp** có bảng AI, tóm tắt, các phần theo khung của cấp, ý chính; cột phải: Mã bài học, điều kiện xuất bản, bài kiểm tra của bài. Nút: Nhân bản sang lớp khác · Lưu trữ · Lưu nháp (Lưu thay đổi) · Xuất bản (Xuất bản lại) |
| — | Mã bài học | Hộp thoại: mã lớn, đường dẫn tới web học tập, Sao chép mã, Sao chép đường dẫn, **Chiếu lên bảng** |
| — | Chiếu lên bảng | Toàn màn hình nền tối: "Mở DiViet → Nhập mã" và mã chia nhóm `BH 7F3 K2Q` chữ rất lớn, Esc để thoát. Học sinh **gõ tay**, không quét mã QR |
| — | Nhân bản bài học sang lớp khác | Chọn lớp đích khác của thầy cô (khối và cấp hiện kèm); lớp khác cấp thì cảnh báo xem lại hoặc nhờ AI soạn lại; tạo bài Nháp chưa có mã |
| `/giao-vien/lop/:lop?tab=bai-hoc` | Chi tiết lớp, tab Bài học | Bài học của riêng lớp và nút "Tạo bài học" với lớp khóa sẵn |

### Khung nội dung theo cấp (màn hình Soạn bài học đổi theo cấp của lớp)

Cấp của bài là cấp của lớp, không có ô chọn cấp; lớp không đổi sau khi tạo. Khung do máy chủ trả (`frame`) nên giao diện không viết cứng quy tắc nào ngoài
các con số nhắc người dùng.

| Cấp | Nội dung chính | Các loại phần thêm được | Bắt buộc để xuất bản | Chỉ nhắc (không chặn) |
|---|---|---|---|---|
| 1 | Câu chuyện 150-250 từ | Bước câu chuyện (đoạn truyện, câu ngắn kèm hình, **hình**; nghe thử giọng đọc), Hình và chú thích | Có bước câu chuyện; mọi bước có hình | 3-6 bước; mỗi bước tối đa 50 từ |
| 2 | Bài đọc 300-500 từ | Đoạn văn, Hình và chú thích, Mốc thời gian (năm; nối với sự kiện của di sản) | Ít nhất một mốc thời gian | 3-8 mốc; nên có hình kèm chú thích |
| 3 | Bài phân tích 600-900 từ | Đoạn văn (có tiêu đề), Trích tư liệu gốc, Mốc thời gian, Câu hỏi gợi suy nghĩ | Ít nhất một đoạn trích; **mọi đoạn trích có nguồn** | Tối đa 3 đoạn trích (150 từ), 1-5 câu hỏi |

- Hình chọn trong **thư viện ảnh của các di sản trong bài** (kèm chú thích và ghi công), không dán đường dẫn ngoài; mốc nối với sự kiện trên dòng thời gian của di sản.
- Điều kiện xuất bản được tính ngay trên màn hình (`lessonForm.checkForm`, cùng quy tắc với máy chủ) và hiện ở "Trước khi xuất bản". Bấm Xuất bản khi còn thiếu thì
  báo ngay lý do, không gọi máy chủ. Máy chủ vẫn kiểm lại khi lưu và xuất bản.
- Phần thuộc khung của cấp khác (bài nhân bản sang lớp khác cấp) bị cảnh báo; máy chủ từ chối lưu cho tới khi xóa.
- Sắp xếp phần và ý chính bằng nút mũi tên lên, xuống (không kéo thả) để dùng được bằng bàn phím.

### AI soạn nội dung

- Bảng AI: độ dài **Ngắn / Vừa / Chi tiết** (số từ theo khoảng của cấp), nút **Soạn nội dung bằng AI** (bài trống) hoặc **Tạo lại**, đồng hồ lượt AI của trường ("268 / 300", ngày hết kỳ).
- Kết quả luôn là **bản nháp**: điền vào biểu mẫu, hiện "Có thay đổi chưa lưu"; AI không tự lưu hay xuất bản. Tạo lại khi đã có nội dung thì hỏi xác nhận vì thay nội dung đang soạn.
- Dịch vụ AI lỗi: toast hiện câu của máy chủ, nội dung bài giữ nguyên, lượt không bị tính. Hết lượt hoặc không có gói: nút khóa kèm lý do; vẫn nhập tay được.
- Đây là **bản giả lập** ở phía máy chủ (`Ai:Mode = Simulated`, mặc định): ghép câu từ dữ liệu di sản đúng khung cấp, không gọi nhà cung cấp AI thật và không dùng khóa API nào.
  Giao diện không biết bản nào đang chạy; chuyển sang dịch vụ AI thật (`Ai:Mode = Remote`) chỉ đổi cấu hình máy chủ. Cần nhắc thầy cô đọc lại nội dung trước khi dùng (câu này nằm trong thông báo của máy chủ).

### Gói của trường

Thanh báo màu vàng khi trường không có gói hiệu lực (đọc từ `GET /teacher/lessons/ai-quota`). Khi đó "Tạo bài học", "Nhân bản" và nút AI bị khóa; vẫn xem, sửa, xuất bản, lưu trữ
được, học sinh không bị ảnh hưởng.

### Lưu, rời trang, bài đã lưu trữ

- Lưu gửi toàn bộ nội dung (tiêu đề, tóm tắt, ý chính, các phần theo thứ tự). Lỗi theo phần (`sections[2].body`) hiện ngay trong phần đó.
- Còn thay đổi chưa lưu thì rời trang bị hỏi (cả đóng tab). Xuất bản tự lưu trước.
- Bài **Lưu trữ** chỉ xem: mọi ô chỉ đọc, nút "Xuất bản lại" mở lại cho lớp và **giữ nguyên mã**. Lưu trữ bị chặn khi còn bài kiểm tra đang mở (toast hiện lý do máy chủ).

## 2. Web học tập — học sinh

| Route | Màn hình | Nội dung |
|---|---|---|
| `/nhap-ma` | Nhập mã bài học | Gõ tay, tự viết hoa, bỏ khoảng trắng và dấu gạch (`bh 7f3-k2q` vẫn đúng). Mã sai dạng báo ngay, **không gọi máy chủ** (không tính vào giới hạn nhập sai). Mã sai, bài chưa xuất bản hoặc không thuộc lớp của em cùng một câu 404; nhập sai quá nhiều lần hiện câu chặn của máy chủ (429) và khóa nút. Dưới ô nhập là các mã em đã mở gần đây **trên máy này** (tối đa 5, mỗi học sinh một khóa riêng) |
| `/bai-hoc/:maBaiHoc` | Bài học | Bố cục theo **cấp của lớp em** (học sinh không chọn): ba bản dưới đây |

### Ba bố cục

| Cấp | Bố cục | Chi tiết |
|---|---|---|
| 1 (khối 1-5) | Kể chuyện từng bước (`data-bo-cuc="cap-1"`) | Luồng **Nghe chuyện → Xem hình → Chơi → Nhận sao** đi lần lượt. Mỗi lần một đoạn có hình lớn, chữ to, nút loa đọc to bằng giọng đọc của trình duyệt ("Đang đọc cho em nghe…", "Nghe lại"; không có giọng thì không hiện nút), nút lớn "Tiếp nhé". Chơi liệt kê bài kiểm tra kèm trạng thái. Đoạn và bước em đang dừng được nhớ **trên máy này** (localStorage, có try/catch) |
| 2 (khối 6-9) | Bài đọc và dòng thời gian (`cap-2`) | Đầu bài ảnh lớn; ba tab chuyển tự do: **Đọc bài** (tóm tắt, đoạn văn, hình kèm chú thích và ghi công, Ý chính đánh số, Di sản trong bài), **Dòng thời gian của bài** (các mốc theo năm), **Bài kiểm tra**; cột phải liệt kê bài kiểm tra kèm trạng thái với riêng em |
| 3 (khối 10-12) | Trang tài liệu (`cap-3`) | Mục lục cố định bên trái theo các phần của bài, một cột rộng, đề mục và đường kẻ, mốc thời gian dạng bảng, **tư liệu gốc có khung và nguồn**, câu hỏi gợi suy nghĩ ("không chấm điểm và không lưu câu trả lời"), liên kết di sản, bài kiểm tra dạng dòng. Không linh vật, không thẻ hình lớn |

Trạng thái bài kiểm tra với riêng em: Chưa mở · Đang mở · Em đang làm · Em đã làm · Đã đóng. "Làm bài" và "Làm tiếp" dẫn tới `/bai-hoc/:mã/kiem-tra/:id`; **màn hình làm bài kiểm tra chưa dựng**
(thuộc luồng bài kiểm tra) nên đang hiện "Đang xây dựng". Bước **Nhận sao** của cấp 1 chưa tính sao: sao gắn với kết quả làm bài, dựng cùng luồng bài kiểm tra.

Đăng nhập: khách mở đường dẫn bài học thì sang Học sinh đăng nhập, đăng nhập xong mở lại đúng bài (đã có từ luồng học sinh).

## 3. Cấu trúc mã

| Nơi | Tệp |
|---|---|
| `packages/dung-chung` | `src/api/lessons.ts` (kiểu dữ liệu giáo viên và học sinh), `studentApi.lessonByCode`, `src/lessons.ts` (chuẩn hóa và chia nhóm mã, nhãn, giới hạn, đếm từ), icon mới (sao chép, lấp lánh, bàn phím, tai nghe…) |
| `apps/web-quan-tri` | `lib/api/lessonEndpoints.ts`; `components/lesson/` (`lessonForm.ts` biểu mẫu và kiểm điều kiện xuất bản, `SectionCard`, `ContentParts` bảng AI và ý chính, `CreateLessonDialog`, `LessonCodeDialog` kèm chiếu lên bảng, `DuplicateLessonDialog`, `ImagePickerDialog`, `ClassLessonsTab`); `pages/teacher/LessonsPage`, `LessonEditorPage` |
| `apps/web-hoc-tap` | `pages/EnterCodePage`, `pages/LessonPage`; `lessons/` (`LevelOneLesson`, `LevelTwoLesson`, `LevelThreeLesson`, `LessonParts`, `useSpeech`, `recent.ts`, `lessonData.ts`) |

## 4. Kiểm thử

- Đơn vị và giao diện (vitest + Testing Library, API giả theo khuôn phản hồi thật): gói dùng chung 111, web quản trị 171, web học tập 127 bài; lint, typecheck, build đều sạch.
  Phần mới: `lessonForm.test.ts` (đổi qua lại dữ liệu, kiểm điều kiện từng cấp), `LessonsPage.test.tsx` (danh sách, lọc, mã, chiếu lên bảng, lưu trữ, khóa theo gói, tạo bài hai bước),
  `LessonEditorPage.test.tsx` (khung ba cấp, AI soạn và lỗi, lưu, xuất bản, bài lưu trữ, nhân bản), `EnterCodePage.test.tsx`, `LessonPage.test.tsx` (ba bố cục), `recent.test.ts`.
- **Trình duyệt thật + API thật**: xem mục "Bài học theo cấp" trong [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md) — 29/29 bước đạt.

## 5. Chưa có trong luồng này

- "Xem trước" bài như học sinh thấy ngay trong màn hình Soạn bài học; thêm hoặc bớt di sản của bài Nháp ngay trong Soạn bài học (hiện chọn di sản khi tạo bài).
- Cột "Độ khó" của Bài học của tôi (suy từ câu hỏi của bài kiểm tra) và "Chép kèm các bài kiểm tra" khi nhân bản: thuộc luồng bài kiểm tra.
- Màn hình làm bài kiểm tra, kết quả, tiến độ, sao của cấp 1; các tab Tiến độ, Thành thạo, Gợi ý ôn tập của Chi tiết lớp.
- Kéo thả để sắp xếp phần (đang dùng nút mũi tên).
- Bố cục cấp 3 chưa chạy trên trình duyệt thật (chỉ có test giao diện); lần chạy thật dùng lớp khối 3 và khối 8.
