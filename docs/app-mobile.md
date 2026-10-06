# App mobile hai chế độ (React Native + Expo)

> Làm ngày 07/10/2026 (+07) trên nhánh `feature/DSVHVN-020-app-mobile` (tách từ nhánh tích hợp `feature/DSVHVN-018-tich-hop`).
> Mã nguồn: [`apps/app-mobile`](../apps/app-mobile), cách cài và chạy trên Expo Go: [`apps/app-mobile/README.md`](../apps/app-mobile/README.md).

Một app, hai chế độ, cùng API `/api/v1` và cùng bộ kiểu dữ liệu, lớp gọi API, kiểm tra hợp lệ, danh mục ngôn ngữ, token theo cấp với hai web.

## Màn hình

| Chế độ | Màn hình | Ghi chú |
|---|---|---|
| Chung | Chọn ngôn ngữ, Chọn chế độ | Lần đầu mở; lần sau mở thẳng chế độ đã chọn. Ngôn ngữ mặc định theo máy nếu thuộc năm ngôn ngữ, không thì tiếng Anh. Chọn Học sinh thì luôn tiếng Việt. |
| Khách tham quan | Trang chủ | Ô tìm, "Gợi ý cho bạn" (theo lịch sử trên máy, chưa có thì di sản nổi bật), "Gần bạn" (xin vị trí, tính khoảng cách trên máy), theo loại và theo vùng, di sản nổi bật |
| | Tìm kiếm | Tìm không dấu (máy chủ), lọc loại, vùng, tỉnh thành, cấp xếp hạng, thời kỳ; tải thêm từng trang; từ khóa gần đây |
| | Bản đồ | Trang nhúng của web học tập (Leaflet + OpenStreetMap, có Hoàng Sa, Trường Sa) trong WebView; chạm ghim rồi "Xem chi tiết" thì app mở trang chi tiết |
| | Chi tiết di sản | Ảnh và ghi công, nhãn bản dịch máy, báo lùi tiếng Việt, tóm tắt (đọc), nghe thuyết minh (từng câu, tô sáng, tạm dừng, tốc độ), Xem 3D, Dòng thời gian, bản đồ, hình ảnh, nguồn tham khảo |
| | Dòng thời gian, Xem 3D | Xem 3D qua trang nhúng `<model-viewer>`; lỗi hoặc thiết bị không có WebGL thì quay về bộ ảnh |
| | Lịch sử và cài đặt | Từ khóa đã tìm, di sản đã xem, nghe, xem 3D; xóa từng mục hoặc xóa hết; tự xóa sau 90 ngày; đổi ngôn ngữ, bật tắt vị trí, đổi chế độ |
| Học sinh | Đăng nhập, Đổi mật khẩu | Mã học sinh + mật khẩu; token trong SecureStore; lần đầu và sau khi được đặt lại bị buộc đổi mật khẩu |
| | Trang học | Cấp 1: linh vật, sao, nút lớn, ít chữ. Cấp 2: cân bằng. Cấp 3: gọn. Lượt làm dở, bài kiểm tra đang mở, bài học của em, "Gợi ý cho em", huy hiệu |
| | Nhập mã bài học | Chỉ gõ mã; cùng mã mở luôn bài kiểm tra |
| | Bài học | Cấp 1: từng bước Nghe chuyện → Xem hình → Chơi → Nhận sao, đọc to, nhớ bước đang dừng. Cấp 2: ba bước chuyển tự do (Đọc bài, Dòng thời gian, Bài kiểm tra). Cấp 3: trang tài liệu có đề mục, tư liệu gốc, câu hỏi gợi suy nghĩ |
| | Bài kiểm tra | Giới thiệu, làm bài tám dạng câu (chạm), đồng hồ theo giờ máy chủ, lưu từng câu, thử lại khi mất mạng, tự nộp khi hết giờ; ba bố cục theo cấp; cấp 3 có đánh dấu xem lại |
| | Kết quả | Cấp 1: sao và lời khen. Cấp 2: điểm, đúng sai, xem lại từng câu. Cấp 3: thêm phân tích theo di sản và theo dạng câu. Gợi ý theo lượt vừa làm |
| | Tiến độ, Của em | Tiến độ, thành thạo theo di sản, huy hiệu, lượt đã nộp; hồ sơ, đổi mật khẩu, đăng xuất, đổi sang chế độ Khách |

## Quyết định thiết kế

- **App không nằm trong npm workspaces.** Expo SDK 57 cố định React 19.2.3 (bộ vẽ của React Native phải khớp đúng phiên bản React); hai web dùng React 19.3. App cài phụ thuộc riêng, mã dùng chung nạp qua bí danh đường dẫn và chỉ gồm mô-đun TypeScript thuần.
- **Chuyển mã dùng chung sang `packages/dung-chung`** (web học tập đổi sang nhập từ gói, hành vi giữ nguyên, test web vẫn xanh): danh mục năm ngôn ngữ và đọc mã ngôn ngữ, tên danh mục theo ngôn ngữ (loại di sản, cấp xếp hạng, vùng, thời kỳ, tỉnh thành), tách câu và chọn giọng đọc, xử lý chữ nội dung di sản (đề mục, chữ đậm, ghi công, nguồn tham khảo, địa chỉ ảnh), hợp đồng thông điệp với trang nhúng.
- **Bản đồ và 3D viết một lần.** Web học tập có hai trang nhúng không cần đăng nhập, không thanh điều hướng: `/nhung/ban-do` và `/nhung/3d/:slug`. App mở trong `react-native-webview`, chỉ cho đúng origin của web học tập, không đưa token nào vào trang, bỏ qua thông điệp lạ hoặc sai phiên bản. Hợp đồng thông điệp: `packages/dung-chung/src/embed`.
- **Giọng đọc của điện thoại** (`expo-speech`), đọc từng câu để tô sáng; tạm dừng làm giống nhau trên iOS và Android (dừng ở đầu câu rồi đọc tiếp từ câu đó) vì Android không có tạm dừng gốc. Thiếu giọng của ngôn ngữ thì báo và vẫn hiện chữ.
- **Lịch sử và gợi ý của khách nằm trên máy** (AsyncStorage, không gửi lên máy chủ). Backend hiện chưa có API lịch sử theo mã thiết bị; app vẫn gửi header `X-Device-Id`, `X-App-Version`, `X-App-Channel` (chỉ bản chạy trên điện thoại, không gửi từ trình duyệt để khỏi cần cấu hình CORS) để khi có API đó thì dùng ngay.
- **Phiên học sinh** giữ bằng `SessionStore` của gói dùng chung, cầu nối `PersistentStorage` (đọc đồng bộ từ bộ nhớ, ghi nền xuống SecureStore). Chỉ có access token, máy chủ trả 401 thì kết thúc phiên; không lưu mật khẩu.
- **Lượt làm bài dùng chung với web**: bắt đầu ở nơi này thì vào tiếp được ở nơi kia (cùng `attempts`). Phiên làm bài (`useQuizAttempt`) là bản chuyển từ web: hàng đợi lưu từng câu, thử lại sau 3 giây, 409 thì lấy kết quả, hết giờ tự nộp.
- **Cổng quảng cáo chỉ giữ chỗ** ([`src/ads/gate.ts`](../apps/app-mobile/src/ads/gate.ts)): AdMob cần bản dựng phát triển qua EAS, không chạy trong Expo Go. Tóm tắt và nghe đang mở sẵn; khi có AdMob chỉ thay phần hiện thực của `useAdGate()`.

## Kiểm

| Kiểm | Kết quả |
|---|---|
| `npm run typecheck`, `npm run lint` (app) | sạch |
| `npm test` (app, Jest + `jest-expo`) | 48 test: lịch sử 90 ngày, gợi ý, haversine, đọc từng câu và tạm dừng, phiên làm bài (lưu, mất mạng, 409, hết giờ), tám dạng câu và ba bố cục bài học vẽ bằng bộ vẽ của React Native, đủ khóa năm ngôn ngữ |
| `npx expo-doctor` | 21/21 |
| `npx expo export --platform web` / `android` / `ios` | build được cả ba |
| Gói dùng chung (Vitest) | 273 test, gồm hợp đồng thông điệp trang nhúng |
| Web học tập (Vitest) | 251 test, gồm hai trang nhúng |
| Web quản trị (Vitest) | 391 test |
| Trình duyệt thật (Edge, khung 390 × 844, bản web của app) với **API thật nhánh tích hợp** trên database tạm, `Email__Mode=Log`, AI giả lập, kho tệp Local | Khách: chọn ngôn ngữ tiếng Hàn, trang chủ, tìm kiếm, lọc cấp xếp hạng, danh sách tỉnh, chi tiết di sản, tóm tắt kèm nhãn "bản dịch máy", thiếu giọng đọc, Xem 3D (model-viewer hiện mô hình), bản đồ (ghim và nhóm ghim), lịch sử. Học sinh cấp 1, 2, 3: sai mật khẩu, đăng nhập, nhập mã bài học, bài học theo cấp, làm bài tám dạng câu, nộp, kết quả, tiến độ; học sinh mới: bị buộc đổi mật khẩu, báo quy tắc mật khẩu, đổi xong vào trang học, mở lại app vẫn đăng nhập |

Chưa kiểm trên **thiết bị thật** (Android, iPhone): các phần chỉ có trên điện thoại (giọng đọc `expo-speech`, vị trí `expo-location`, WebView, SecureStore, bàn phím) đã được vẽ và kiểm logic bằng Jest với bộ vẽ của React Native và bằng bản web, nhưng cần người chạy thử trên Expo Go theo README.

## Giới hạn và việc tiếp theo

- AdMob và hộp đồng ý UMP (cần EAS development build); chưa có biểu tượng và màn hình chờ riêng (`icon`, `splash` trong `app.json`) và hồ sơ EAS (`eas.json`).
- Lịch sử và "Gợi ý cho bạn" của khách chưa đồng bộ với máy chủ; "Gần bạn" tính từ tối đa 500 ghim bản đồ.
- Kéo thả chưa có: ghép cặp, sắp xếp và điền từ làm bằng chạm (có nút lên xuống ở cấp 2 và 3).
- Bản APK gọi API `http://` cần bật cleartext (xem README); khuyến nghị API `https://` khi phát hành.
