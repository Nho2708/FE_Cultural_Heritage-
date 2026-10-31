# Luồng Thống kê và gợi ý (giao diện)

Phần giao diện của hai việc: **giáo viên** xem thống kê của lớp trên **web quản trị** (kết quả từng bài kiểm tra, tiến độ, mức thành thạo, hồ sơ học tập của từng học sinh, gợi ý ôn tập cho lớp)
và **học sinh** nhận khối **"Gợi ý cho em"** trên **web học tập** (ở Trang học và ở Kết quả bài làm). Backend ở `BE_Cultural_Heritage-/docs/thong-ke-goi-y.md` (nhánh `feature/DSVHVN-016-thong-ke-goi-y`);
thiết kế ở Figma (file `AfNZ3KxFxJqqUxmGhYLXuS`) và ảnh trong `doc/design/mockups/` (Kết quả bài kiểm tra, Chi tiết bài làm, Hồ sơ học tập của học sinh, Chi tiết lớp, Trang học của em ba cấp).
Mọi số liệu tính khi hiển thị ở máy chủ từ lượt làm bài; giao diện không tự tính lại điểm hay tỉ lệ, chỉ trình bày và gọi lại khi đổi bộ lọc.

## 1. Màn hình

### Web quản trị (giáo viên)

| Route | Màn hình | Nội dung |
|---|---|---|
| `/giao-vien/kiem-tra/:baiKiemTra/ket-qua` | Kết quả bài kiểm tra | Đầu trang: tên bài, trạng thái, bài học, lớp, cấp, sĩ số, **Mở bài kiểm tra**, **Đóng bài kiểm tra** (chỉ khi đang phát hành, hộp xác nhận ghi số em đã nộp). Bốn tab, tab nằm trên URL (`?tab=`): **Tổng quan** (điểm trung bình, cao nhất, thấp nhất, đã nộp trên sĩ số, phổ điểm 10 khoảng), **Từng câu** (dạng câu, tỉ lệ đúng; câu nhiều phần thêm tỉ lệ theo phần; phương án chọn nhiều nhất; lỗi hay gặp; số em bỏ trống; câu dưới 50% tô đỏ; kèm tỉ lệ đúng theo di sản và theo dạng câu), **Từng học sinh** (lọc trạng thái, tìm theo mã hoặc họ tên không dấu, trang 20 dòng; cả em chưa làm; bấm dòng đã nộp mở Chi tiết bài làm), **Gợi ý** (mục 3) |
| — | Chi tiết bài làm (hộp thoại) | Học sinh, bài kiểm tra, điểm, trạng thái, thời gian làm, số câu đúng, số sao (lớp cấp 1, ghi rõ em chỉ thấy sao); từng câu như em đã thấy, câu em trả lời đặt cạnh đáp án đúng ở cả tám dạng, đúng, sai, bỏ trống hoặc đúng một phần, điểm đạt (câu nhiều phần có số ý đúng), giải thích; huy hiệu của lượt. Mở từ Từng học sinh và Hồ sơ học tập |
| `/giao-vien/lop/:lop?tab=tien-do` | Chi tiết lớp, tab Tiến độ | Tiến độ của lớp (tổng lượt đã nộp ÷ học sinh × bài đã phát hành), số bài đã phát hành, sĩ số, số em chưa đăng nhập lần nào; thẻ từng bài kiểm tra "5 / 6" kèm liên kết sang Kết quả; bảng học sinh × bài kiểm tra (điểm, hoặc Hết giờ tự nộp, Đang làm, Chưa làm), bài học đã hoàn thành, điểm trung bình, số huy hiệu, lần đăng nhập gần nhất; tên học sinh dẫn sang Hồ sơ. Lớp cấp 1 kèm số sao và lời giải thích học sinh chỉ thấy sao |
| `/giao-vien/lop/:lop?tab=thanh-thao` | Chi tiết lớp, tab Thành thạo | Lọc theo tỉnh và loại di sản; **bảng nhiệt học sinh × di sản** (màu theo mức, luôn có phần trăm và nhãn đọc cho trình đọc màn hình, cột đầu dính khi cuộn ngang) với hàng Cả lớp; tỉ lệ đúng của cả lớp theo di sản, theo tỉnh, theo loại di sản và theo dạng câu; chú giải màu: từ 80% thành thạo, 50 đến dưới 80% đạt, dưới 50% nên ôn, dưới 3 câu chưa đủ dữ liệu |
| `/giao-vien/lop/:lop?tab=goi-y-on-tap` | Chi tiết lớp, tab Gợi ý ôn tập | Mục 3, chọn được bài kiểm tra và khoảng thời gian |
| `/giao-vien/lop/:lop/hoc-sinh/:hocSinh` | Hồ sơ học tập của học sinh | Họ tên, mã, lớp, lần đăng nhập gần nhất, trạng thái; bốn thẻ (điểm trung bình, bài kiểm tra đã làm, bài học đã hoàn thành, huy hiệu); **biểu đồ điểm theo thời gian** (thang 10, có bảng số cho trình đọc màn hình); lịch sử làm bài (bấm dòng mở Chi tiết bài làm); bài học đã hoàn thành; mức thành thạo theo di sản, tỉnh, loại di sản; huy hiệu tính khi hiển thị. Mở từ tên học sinh ở tab Học sinh và Tiến độ |

Lớp hay bài của giáo viên khác, học sinh ngoài lớp: máy chủ trả 404 và giao diện báo "Không tìm thấy lớp / bài kiểm tra / học sinh" kèm nút Quay lại. Quản trị trường, quản trị hệ thống, học sinh không vào được các màn hình này (khu giáo viên chặn từ route).

### Web học tập (học sinh)

| Route | Màn hình | Nội dung |
|---|---|---|
| `/hoc` | Trang học của em (sửa) | Thêm khối **Gợi ý cho em** (mục 2) giữa Bài học của em và Huy hiệu gần đây. Cấp 3 thêm mục "Gợi ý" vào mục lục |
| `/ket-qua/:luotLam` | Kết quả bài làm (sửa) | Thêm khối Gợi ý cho em ở cuối cả ba bản; phần di sản nên ôn chỉ tính từ lượt đang xem |

## 2. Gợi ý cho em

Năm phần, mỗi phần tối đa 3 mục, cùng nội dung ở mọi cấp (máy chủ chọn; cấp 1 chỉ bỏ số liệu khỏi câu lý do):

| Phần | Cấp 1 (thẻ hình có nút loa) | Cấp 2 (thẻ có hình nhỏ, tiêu đề đầy đủ, lý do) | Cấp 3 (danh sách dạng dòng theo nhóm, "Lý do: …") |
|---|---|---|---|
| Bài kiểm tra nên làm tiếp | "Chơi tiếp"; bài của bài học em chưa mở có nhãn **Cần mã bài học** và dẫn về Nhập mã bài học | "Làm bài" hoặc "Nhập mã bài học" | như cấp 2 |
| Bài học nên ôn lại | "Ôn lại bài" | "Xem lại bài học" | như cấp 2 |
| Di sản nên ôn | "Di sản nên ôn"; em làm đúng hết thì có lời khen thay | "Xem chi tiết" sang trang di sản | như cấp 2 |
| Di sản liên quan | "Di sản giống bài em học" | "Xem chi tiết" | như cấp 2 |
| Bài học mới nên học | "Bài mới", chỉ tiêu đề và câu **Nhờ thầy cô đưa mã bài học** | như cấp 1, không liên kết | như cấp 1 kèm dòng lý do |

- **Không lộ mã bài học mới**: thẻ bài mới không có liên kết và máy chủ không gửi mã.
- Em chưa có lượt nào hoặc lớp chưa xuất bản bài nào thì hiện lời mời nhập mã bài học của máy chủ; không có gợi ý và không có lời mời thì không hiện khối.
- Gợi ý lỗi thì chỉ khối này báo lỗi kèm nút Thử lại, phần còn lại của trang vẫn dùng được. Sau khi nộp bài, gợi ý được làm mới.
- Liên kết di sản dùng `slug` mở trang chi tiết di sản công khai; liên kết bài kiểm tra cần mã bài học của bài em đã mở (lấy từ danh sách bài học của em ở Trang học).

## 3. Gợi ý ôn tập cho lớp

Trên tab Gợi ý của Kết quả bài kiểm tra (chỉ bài này) và tab Gợi ý ôn tập của Chi tiết lớp (cả lớp hoặc một bài kiểm tra), kèm khoảng thời gian (30, 7, 90 ngày gần đây hoặc từ đầu đến nay).

- **Di sản nên ôn**: tỉ lệ sai từ 40% và ít nhất 10 câu trả lời (xem riêng một bài kiểm tra thì chỉ cần có câu trả lời), tối đa 5, lý do "Lớp sai x% ở n câu về di sản này".
- **Di sản liên quan**: tối đa 5; Dịch vụ AI chưa phản hồi trong 2 giây thì máy chủ tự chọn theo cùng tỉnh hoặc cùng loại và giao diện báo điều đó.
- Giao diện ghi rõ không gửi họ tên, mã học sinh hay tên lớp sang dịch vụ AI.
- **Tạo bài ôn tập** (cả khối hoặc từng dòng): mở hộp thoại **Tạo bài học** với lớp chọn sẵn và khóa, di sản chọn sẵn, tiêu đề "Ôn tập: …"; tạo xong chuyển sang Soạn bài học (bài nháp mới của lớp).
- Đổi khoảng thời gian hay bài kiểm tra thì giữ khối cũ trên màn hình trong lúc tải bản mới.

## 4. Cấu trúc mã

| Vị trí | Nội dung |
|---|---|
| `packages/dung-chung/src/api/statistics.ts`, `recommendations.ts` | Kiểu dữ liệu và lớp gọi API (`createStatisticsApi`, `createClassRecommendationsApi`, `createStudentRecommendationsApi`); gợi ý của học sinh nằm trong `createStudentApi` để app mobile dùng chung |
| `packages/dung-chung/src/statistics.ts` | Nhãn và màu mức thành thạo (ngưỡng trùng máy chủ), nhãn trạng thái, khoảng thời gian gợi ý |
| `apps/web-quan-tri/src/components/statistics/` | Thẻ số liệu, thanh tỉ lệ, biểu đồ phổ điểm và điểm theo thời gian (HTML và SVG, không thêm thư viện), các tab kết quả bài kiểm tra, tab của lớp, Chi tiết bài làm, gợi ý ôn tập |
| `apps/web-quan-tri/src/pages/teacher/QuizResultsPage.tsx`, `StudentRecordPage.tsx` | Hai màn hình có URL |
| `apps/web-hoc-tap/src/learn-home/Recommendations.tsx`, `suggestionData.ts` | Khối Gợi ý cho em ba cách trình bày và việc đổi dữ liệu máy chủ thành thẻ |

## 5. Kiểm thử

Unit test: lớp gọi API, nhãn và ngưỡng mức thành thạo, khoảng thời gian gợi ý; các tab kết quả bài kiểm tra (số liệu, câu dưới 50%, lọc, Chi tiết bài làm, đóng bài, 404), Tiến độ, Thành thạo (bảng nhiệt, bộ lọc), Gợi ý ôn tập (tạo bài ôn tập), Hồ sơ học tập, và Gợi ý cho em ở Trang học ba cấp và Kết quả bài làm (không lộ mã bài mới, cấp 1 không số, lời khen khi đúng hết, lỗi có Thử lại).
Trên trình duyệt thật: [`apps/web-quan-tri/scripts/smoke-thong-ke-goi-y.mjs`](../apps/web-quan-tri/scripts/smoke-thong-ke-goi-y.mjs) (`npm run smoke:thong-ke-goi-y -w @dsvhvn/web-quan-tri`), kết quả ở [kiem-thu-trinh-duyet.md](kiem-thu-trinh-duyet.md).
