# Luồng Học tập của học sinh theo cấp (giao diện)

Phần giao diện của khu học trên **web học tập**: học sinh mở bài kiểm tra từ bài học, làm bài với **bố cục riêng theo cấp học của lớp** (cấp 1 nút to và hình lớn, cấp 2 cân bằng,
cấp 3 gọn có đồng hồ), lưu từng câu, nộp, xem kết quả theo cấp, lịch sử và tiến độ. Học sinh không chọn bố cục: máy chủ trả cấp của lớp và giao diện theo cấp đó.
Backend ở `BE_Cultural_Heritage-/docs/hoc-tap-theo-cap.md` (nhánh `feature/DSVHVN-012-hoc-tap-theo-cap`); thiết kế ở Figma (file `AfNZ3KxFxJqqUxmGhYLXuS`, các màn hình
"— cấp N") và ảnh trong `doc/design/mockups/`. Phần **"Gợi ý cho em"** và các màn hình giáo viên xem kết quả của lớp chưa dựng.

## 1. Màn hình

| Route | Màn hình | Nội dung |
|---|---|---|
| `/hoc` | Trang học của em (sửa) | Thêm các khối: **Bài em đang làm dở** (Làm tiếp, còn bao lâu), **Bài kiểm tra đang chờ em** (nhãn Đang mở, hoặc **Cần mã bài học** kèm nút Nhập mã bài học), **Bài học của em** (tiến độ bài kiểm tra đã làm, Mở bài học), **Huy hiệu gần đây**. Cấp 1 thẻ to, cấp 2 thẻ hai cột, cấp 3 danh sách dạng dòng |
| `/bai-hoc/:maBaiHoc` | Bài học (sửa) | Nút của bài kiểm tra (Làm bài, Làm tiếp, Xem kết quả) mở hộp thoại **Bắt đầu bài kiểm tra** |
| — | Bắt đầu bài kiểm tra | Hộp thoại: số câu, thời gian làm, giờ đóng, hướng dẫn của thầy cô, lời nhắc "Mỗi em chỉ làm một lần, hết giờ bài tự nộp". Nút theo việc em làm được: Bắt đầu, Làm tiếp, Xem kết quả; bài chưa mở hoặc đã đóng chỉ có Đóng và câu giải thích của máy chủ |
| `/bai-hoc/:maBaiHoc/kiem-tra/:baiKiemTra` | Làm bài kiểm tra | Toàn màn hình, không thanh điều hướng, mục 2. Mở thẳng đường dẫn thì hiện trang giới thiệu để bấm Bắt đầu hoặc Làm tiếp; lượt đã nộp thì chuyển sang kết quả |
| `/ket-qua/:luotLam` | Kết quả bài làm | Ba bản theo cấp, mục 4 |
| `/tien-do` | Tiến độ của em | Cấp 1 là **Sao của em**; cấp 2 và 3 có bốn tab, mục 5 |

## 2. Làm bài: ba bố cục

| | Cấp 1 | Cấp 2 | Cấp 3 |
|---|---|---|---|
| Đầu trang | Nút Tạm dừng, tên bài, hàng sao (số câu đã làm), "Câu 3 / 6" | Tên bài học và bài, đồng hồ khi bài đặt thời gian, nút Nộp bài | Như cấp 2, đồng hồ luôn có, nút Nộp bài |
| Câu hỏi | Từng câu một, chữ lớn, nút loa đọc to lời câu và các phương án | Từng câu, bảng số câu bên phải (đã trả lời, đang xem, chưa trả lời) | Bảng số câu nằm ngang, **tư liệu ghim bên trái** cho nhóm câu dùng chung đoạn tư liệu, nút **Đánh dấu xem lại** (nhớ trên máy này) |
| Chuyển câu | "Tiếp nhé", câu cuối là "Xong rồi!"; còn câu trống thì hỏi Làm tiếp hay Nộp bài | Câu trước, Câu sau, bấm số trên bảng | Như cấp 2 |
| Đồng hồ | Không có | Có khi bài đặt thời gian; dưới 1 phút chuyển cảnh báo "sắp hết giờ" | Luôn có; dưới 1 phút chuyển cảnh báo |

Các dạng câu: một đáp án đúng, Đúng/Sai, đọc tư liệu (chọn một phương án); chọn hình đúng; ghép cặp hình - tên (chạm hình rồi chạm tên, hoặc kéo tên thả vào hình); sắp xếp (chạm lần lượt
theo thứ tự, hoặc kéo; có nút đưa lên, đưa xuống và xếp lại); điền từ (gõ chữ, hoặc chọn từ trong kho từ); nhiều mệnh đề Đúng/Sai. Mọi vị trí trong câu trả lời tính theo thứ tự đang hiện trên màn hình
(máy chủ đã xáo cố định theo lượt, tải lại hay đổi thiết bị vẫn ra đúng thứ tự cũ).

- **Lưu từng câu**: ngay khi em chọn, ghi đè cả câu (câu bỏ trống gửi `{}` để xóa); điền chữ bằng bàn phím chờ 0,5 giây sau khi gõ xong. Câu sắp xếp chỉ được lưu khi đã đặt đủ mọi mục.
  Dòng "Đã lưu câu trả lời lúc 08:04" cho em biết đã lưu.
- **Mất kết nối**: hiện "Mất kết nối. Đang thử lưu lại câu trả lời…", giữ câu trả lời trên màn hình, thử lại mỗi 3 giây và ngay khi có mạng trở lại.
- **Đồng hồ**: tính theo giờ máy chủ (đo độ lệch một lần lúc tải lượt, mỗi giây tính lại, không trôi khi tab bị làm chậm). Hết giờ thì **tự nộp** (thử lại tới khi nộp được nếu đang mất mạng) và
  kết quả ghi "Đã hết thời gian làm bài. Bài của em đã được nộp tự động…". Máy chủ cũng tự chốt lượt quá hạn (nhận thêm 30 giây ân hạn); khi lưu hoặc nộp gặp 409 thì giao diện chuyển sang kết quả.
- **Nộp bài**: hộp xác nhận nêu rõ còn bao nhiêu câu chưa trả lời (cấp 2 và 3 liệt kê số câu; câu bỏ trống không được điểm). Nộp xong về kết quả; nộp lần hai trả lại kết quả cũ.
- **Tải lại giữa chừng**: vào tiếp đúng lượt, câu đã lưu còn nguyên, đồng hồ không đặt lại.

## 3. Cấu trúc mã

| Nơi | Nội dung |
|---|---|
| `packages/dung-chung/src/api/attempts.ts` | Kiểu dữ liệu và lớp gọi API (gộp vào `createStudentApi`, app mobile dùng lại) |
| `packages/dung-chung/src/attempts.ts` | Logic thuần: độ lệch đồng hồ, định dạng điểm và thời lượng, câu trả lời rỗng hay đủ, thân gửi lên, ghép cặp, sắp xếp, điền từ, nhóm tư liệu, danh mục huy hiệu |
| `apps/web-hoc-tap/src/quiz/` | `QuestionInput` (tám dạng câu), `useQuizAttempt` (lưu, thử lại, đồng hồ, tự nộp), `QuizRunner` (ba bố cục), `QuestionReview`, `QuizIntro` |
| `apps/web-hoc-tap/src/pages/` | `TakeQuizPage`, `ResultPage`, `ProgressPage` |
| `apps/web-hoc-tap/src/learn-home/LearningSections.tsx` | Các khối học tập của trang học |

## 4. Kết quả theo cấp

- **Cấp 1**: 1 đến 3 sao, lời khen, huy hiệu mới, đọc to; "Cùng xem đáp án nhé" chỉ tô đáp án đúng (không có dấu sai, không điểm, không phần trăm).
- **Cấp 2**: điểm, số câu đúng, sai, bỏ trống, thời gian làm; từng câu đúng hoặc sai kèm đáp án và giải thích; huy hiệu của lượt. Chỉ hiện năm câu đầu, nút "Xem … câu còn lại" mở nốt.
- **Cấp 3**: thêm **Phân tích theo chủ đề**: bảng và biểu đồ tỉ lệ đúng theo di sản và theo dạng câu, chủ đề dưới 50% đánh dấu "Cần ôn" và gợi ý ôn.
- Phần xem lại từng câu chỉ có khi bài kiểm tra cho xem đáp án sau khi nộp.

## 5. Tiến độ của em

- **Cấp 1 — Sao của em**: tab Sao và huy hiệu (tổng số sao, bài gần nhất, sao từng bài, di sản em đã chơi dạng sao, huy hiệu) và tab Bài đã chơi (nút Xem sao).
- **Cấp 2 và 3**: bốn tab, nhớ trên URL (`?tab=`): **Lịch sử bài làm** (bảng, phân trang 10 dòng), **Tiến độ** (bài kiểm tra đã làm, bài học hoàn thành, điểm trung bình, biểu đồ điểm theo thời gian),
  **Thành thạo** (tỉ lệ đúng theo di sản kèm nhãn mức) và **Huy hiệu** (bốn huy hiệu, huy hiệu chưa đạt có khóa và điều kiện).

## 6. Kiểm thử

- Đơn vị và màn hình: `npm test` (thêm bài kiểm tra cho logic thuần, lớp gọi API, tám dạng câu, ba bố cục làm bài, mất kết nối, hết giờ tự nộp, kết quả ba cấp, tiến độ, trang học).
- Trình duyệt thật với API thật: [`apps/web-hoc-tap/scripts/smoke-lam-bai.mjs`](../apps/web-hoc-tap/scripts/smoke-lam-bai.mjs) (`npm run smoke:lam-bai -w @dsvhvn/web-hoc-tap`); kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).
