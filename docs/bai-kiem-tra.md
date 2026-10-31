# Luồng Bài kiểm tra của bài học, nhân bản bài học kèm bài kiểm tra (giao diện)

Phần giao diện của khu **Bài kiểm tra** của giáo viên (web quản trị): tạo bài kiểm tra cho **một bài học của mình** (lớp làm bài là lớp của bài học), chọn câu từ ngân hàng
(chỉ câu **đúng dạng của cấp**), đặt điểm, thứ tự, thời gian làm **theo cấp**, giờ mở, giờ đóng, xáo câu, cho xem đáp án sau khi nộp; **phát hành** để khóa danh sách câu;
**đóng** khi muốn dừng nhận bài; **nhân bản** để đổi câu hoặc dùng lại. Cùng luồng này, phía bài học có **nhân bản bài học kèm bài kiểm tra** và **cột, bộ lọc Độ khó**.
Phát hành lần đầu sinh **mã bài kiểm tra** (`KT` + 6 ký tự): em gõ mã này ở ô nhập mã để vào thẳng bài kiểm tra; mã bài học vẫn mở bài học và từ đó vào được bài kiểm tra. Lớp **cấp 1** không đặt giờ mở và đóng: bài chơi mở ngay khi phát hành. Ô giờ theo đồng hồ 24 giờ và đọc lại buổi trong ngày ("12:30 trưa, còn 11 giờ 59 phút nữa") để không nhầm 12:30 với 00:30. Backend ở `BE_Cultural_Heritage-/docs/bai-kiem-tra.md` (nhánh
`feature/DSVHVN-011-bai-kiem-tra`); thiết kế ở Figma (file `AfNZ3KxFxJqqUxmGhYLXuS`) và ảnh trong `doc/design/mockups/`.

## 1. Màn hình (web quản trị, khu giáo viên)

| Route | Màn hình | Nội dung |
|---|---|---|
| `/giao-vien/kiem-tra` | Bài kiểm tra của tôi | Bảng: tên (kèm số câu và thời gian làm), bài học, lớp, trạng thái (Nháp · Đang phát hành · Đã đóng; bài đang phát hành chưa tới giờ mở hoặc đã quá giờ đóng ghi thêm giai đoạn), giờ mở và đóng, đã nộp trên sĩ số. Lọc theo trạng thái, bài học, lớp, từ khóa; bộ lọc và trang nằm trên URL. Thao tác trên dòng: Soạn và Xóa (chỉ bài Nháp), Nhân bản, Đóng (hỏi xác nhận, không mở lại được), Kết quả. Trường hết gói thì "Tạo bài kiểm tra" và "Nhân bản" bị khóa |
| — | Tạo bài kiểm tra | Hộp thoại: chọn một bài học của thầy cô (Nháp hoặc Đã xuất bản, **không có bài Lưu trữ**; bài Nháp ghi "phát hành được sau khi xuất bản bài học") và đặt tên (gợi ý "Kiểm tra: {tên bài học}"). Không có ô chọn lớp, không sinh mã. Mở từ Soạn bài học thì bài học chọn sẵn và khóa |
| `/giao-vien/kiem-tra/:baiKiemTra` | Soạn và phát hành bài kiểm tra | Thông tin chung và danh sách câu, mục 2 |
| — | Chọn câu từ ngân hàng | Hộp thoại chọn nhiều câu, mục 3 |
| `/giao-vien/kiem-tra/:baiKiemTra/ket-qua` | Kết quả bài kiểm tra | Chưa dựng (thuộc luồng làm bài); nút "Kết quả" đã dẫn tới đúng route, hiện màn hình "Đang xây dựng" |
| `/giao-vien/bai-hoc` | Bài học của tôi (sửa) | Thêm cột và bộ lọc **Độ khó** (Dễ, Trung bình, Khó); bài chưa có bài kiểm tra có câu ghi "Chưa có bài kiểm tra" và không khớp mức nào |
| — | Nhân bản bài học sang lớp khác (sửa) | Ô **Chép kèm các bài kiểm tra của bài** (chỉ hiện khi bài có bài kiểm tra, mặc định chọn) |
| `/giao-vien/bai-hoc/:baiHoc` | Soạn bài học (sửa) | Mục "Bài kiểm tra của bài" liệt kê các bài kiểm tra và có nút "Tạo bài kiểm tra" (bài học chọn sẵn) |

## 2. Soạn và phát hành bài kiểm tra

- **Thông tin chung**: tên (tối đa 255 ký tự, theo máy chủ), bài học (chỉ đọc, kèm lớp và cấp), mô tả / hướng dẫn, độ khó chung, thời gian làm, mở lúc, đóng lúc, hai công tắc
  **Xáo câu** và **Cho xem đáp án sau khi nộp**. Giờ nhập dạng `07:00 06/10/2026` (giờ Việt Nam, không dùng ô chọn ngày giờ của trình duyệt vì hiện tháng/ngày/năm) và gửi lên
  với độ lệch `+07:00`.
- **Thời gian làm theo cấp của lớp**: cấp 1 khóa ô, ghi "Không đồng hồ"; cấp 2 tùy chọn 1-180 phút, để trống là không giới hạn; cấp 3 được để trống khi soạn, **bắt buộc khi phát hành**
  ("Lớp cấp 3 bắt buộc nhập thời gian làm.").
- **Danh sách câu**: điểm từng câu (bước 0,25, tối đa 100; gõ `0,25` hoặc `0.25`), kéo thả hoặc phím mũi tên lên, xuống trên tay nắm để đổi thứ tự, dấu x bỏ câu khỏi bài (câu vẫn ở ngân hàng),
  tổng điểm do máy chủ tính. **Mỗi thao tác gửi ngay** (thêm, đặt lại điểm và thứ tự, bỏ câu) qua ba endpoint của backend; các thao tác xếp hàng nên bấm nhanh không chạy chồng nhau.
  "Lưu" chỉ lưu phần thông tin chung. Lớp cấp 1: dòng chú "học sinh cấp 1 thấy sao thay cho điểm".
- **Câu không dùng được ở cấp của lớp** (câu bị ẩn, đã xóa, hoặc lớp vừa đổi khối): hàng nền đỏ kèm lý do của máy chủ, dòng báo thiếu điều kiện có liên kết "Xem câu số N".
- **Xem trước như học sinh**: con mắt ở mỗi dòng và nút "Xem trước như học sinh" mở từng câu theo bố cục của cấp (gọi xem trước câu hỏi của luồng ngân hàng), có Câu trước, Câu sau; không hiện đáp án, không chấm.
- **Phát hành**: lưu thiết lập đang soạn (nếu có thay đổi), kiểm giờ và thời gian làm, rồi hỏi xác nhận bằng lời của máy chủ ("Sau khi phát hành, danh sách câu hỏi và điểm sẽ bị khóa. Học sinh lớp … làm được bài
  kiểm tra … bằng mã đó hoặc qua mã bài học … từ … đến …"). Phát hành xong mở hộp thoại Mã bài kiểm tra (sao chép, chiếu lên bảng, gửi thông báo cho lớp). **Chưa đủ điều kiện** thì liệt kê đủ một lượt ngay dưới thanh thao tác
  ("Chưa đủ điều kiện phát hành. Còn thiếu: …"), bài học chưa xuất bản có liên kết "Mở bài học"; không hỏi xác nhận.
- **Sau khi phát hành**: khóa danh sách câu, điểm, thứ tự, bài học, độ khó, thời gian làm, giờ mở, hai công tắc. Còn sửa tên, mô tả, **giờ đóng** (giao diện gửi lại nguyên giá trị các trường khóa, giữ đúng mốc giờ
  cũ của máy chủ để không bị từ chối vì lệch giây). Thanh trạng thái có số đã nộp trên sĩ số, **Nhân bản**, **Kết quả**, **Đóng bài kiểm tra** (hỏi xác nhận: không mở lại được, lượt đang dở được tự nộp).
  Bài **Đã đóng** chỉ đọc, còn Nhân bản và Kết quả. Máy chủ tự đóng bài quá giờ đóng (tác vụ nền mỗi 60 giây); giao diện thấy trạng thái này khi tải lại danh sách.

## 3. Chọn câu từ ngân hàng

Câu đã duyệt, chưa ẩn, dùng chung mọi trường; **chỉ hiện câu có dạng dùng được ở cấp của lớp** (dòng giải thích liệt kê các dạng). Mặc định lọc theo các di sản của bài (chip "Di sản của bài", bấm để xem mọi
di sản), lọc thêm độ khó, dạng câu (chỉ các dạng của cấp), từ khóa. Chọn nhiều câu, kể cả qua nhiều trang; câu đã có trong bài hiện mờ và không chọn lại; bài chỉ còn chỗ cho đủ 50 câu. Con mắt mở câu ở chế độ xem như
học sinh, chồng lên hộp thoại và **không làm mất các câu đang chọn**. Mỗi câu thêm vào được 1 điểm, sửa ở danh sách câu. Một câu sai thì máy chủ không thêm câu nào và lý do hiện trong hộp thoại.

## 4. Nhân bản bài học kèm bài kiểm tra và độ khó của bài học

- Nhân bản bài học (từ danh sách hoặc từ Soạn bài học): ô chép kèm gửi `includeQuizzes`. Lớp đích khác cấp thì lời cảnh báo thêm "Câu hỏi có dạng không dùng được ở cấp N sẽ không được chép". Kết quả hiện lời của máy chủ
  ("Đã chép N bài kiểm tra thành bản nháp; hãy đặt lại giờ mở và giờ đóng. Bỏ qua M câu hỏi đã ẩn hoặc không dùng được ở cấp của lớp."). Bài kiểm tra chép sang luôn là Nháp, không có giờ mở và đóng; thời gian làm
  được chuẩn hóa theo cấp lớp đích (cấp 1 bỏ giới hạn).
- Độ khó của bài học **không nhập tay**: máy chủ tính từ các câu trong các bài kiểm tra chưa xóa của bài (mức nhiều câu nhất, hòa thì mức cao hơn). Lọc theo độ khó gửi `difficulty` và nằm trên URL (`?do-kho=kho`).

## 5. Mã nguồn

| Phần | Vị trí |
|---|---|
| Kiểu dữ liệu và lớp gọi API | `packages/dung-chung/src/api/quizzes.ts` (`createQuizzesApi`, `QUIZ_ENDPOINTS`); trường thêm của bài học ở `api/lessons.ts` |
| Quy tắc thuần (điểm, giờ Việt Nam, thời gian làm theo cấp, biểu mẫu thiết lập) | `packages/dung-chung/src/quizzes.ts` |
| Màn hình | `apps/web-quan-tri/src/pages/teacher/QuizzesPage.tsx`, `QuizEditorPage.tsx` |
| Thành phần | `apps/web-quan-tri/src/components/quiz/` (tạo, chọn câu, danh sách câu, xem trước, nhãn và công tắc) |

## 6. Kiểm thử

- Đơn vị và giao diện (Vitest, jsdom): `quizzes.test.ts`, `api/quizzesApi.test.ts` (gói dùng chung), `QuizzesPage.test.tsx`, `QuizEditorPage.test.tsx`, cùng phần mở rộng của `LessonsPage.test.tsx` và `LessonEditorPage.test.tsx`.
- Trình duyệt thật với API thật: [`apps/web-quan-tri/scripts/smoke-bai-kiem-tra.mjs`](../apps/web-quan-tri/scripts/smoke-bai-kiem-tra.mjs) (`npm run smoke:bai-kiem-tra -w @dsvhvn/web-quan-tri`); kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).

## 7. Điểm khác thiết kế cần biết

| Điểm | Hiện thực | Lý do |
|---|---|---|
| Tên bài kiểm tra | Giới hạn 255 ký tự (ảnh thiết kế ghi 200) | Khớp máy chủ |
| Tên khi tạo | Hộp Tạo bài kiểm tra có thêm ô tên (gợi ý theo bài học) | Máy chủ bắt buộc tên khi tạo |
| Lọc di sản trong hộp chọn câu | Chip "Di sản của bài" bật tắt, chưa có ô chọn một di sản bất kỳ | Backend hỗ trợ `heritageId` nhưng thiết kế chỉ có chip |
| Kết quả bài kiểm tra | Nút và route có sẵn, màn hình chưa dựng | Thuộc luồng làm bài của học sinh |
| "Xem như học sinh" cả bài | Duyệt từng câu bằng xem trước của ngân hàng, chưa có phần giờ, đồng hồ, nộp bài | Luồng làm bài của học sinh sẽ làm phần còn lại |
