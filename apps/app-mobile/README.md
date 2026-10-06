# App mobile "Học di sản" (React Native + Expo)

Một app, **hai chế độ**, dùng cùng API `/api/v1` với hai web:

- **Khách tham quan** (không đăng nhập, mã thiết bị ẩn danh, **năm ngôn ngữ**: Việt, Anh, Hàn, Trung giản thể, Nhật): trang chủ, tìm kiếm không dấu, chi tiết di sản
  (tóm tắt, nghe thuyết minh bằng giọng của điện thoại, xem 3D), bản đồ và dòng thời gian, "Gợi ý cho bạn", "Gần bạn", lịch sử và cài đặt.
- **Học sinh** (mã học sinh + mật khẩu, **chỉ tiếng Việt**, không quảng cáo): đăng nhập, đổi mật khẩu lần đầu, trang học, nhập mã bài học,
  bài học và bài kiểm tra theo cấp 1 / 2 / 3 (bố cục, luồng học, cách hiện kết quả khác nhau), tiến độ.

Chi tiết màn hình, kết quả kiểm và giới hạn: [`../../docs/app-mobile.md`](../../docs/app-mobile.md).

## Vì sao app không nằm trong npm workspaces của thư mục gốc

Expo SDK 57 cố định **React 19.2.3** và React Native 0.86.3 (bộ vẽ của React Native phải khớp đúng phiên bản React), còn hai web dùng React 19.3.
Nên `apps/app-mobile` có `package.json`, `package-lock.json` và `node_modules` riêng, không thêm vào `workspaces` của thư mục gốc. Mã dùng chung
(`packages/dung-chung`) được nạp qua bí danh đường dẫn (`tsconfig.json` `paths`, Metro `watchFolders`, Jest `moduleNameMapper`), và app **chỉ nhập các mô-đun TypeScript thuần**
(không import React): `api`, `auth`, `i18n`, `theme`, `speech`, `embed`, `heritage-text`, `lesson-data` và các hàm thuần ở gốc gói (kiểm tra hợp lệ, logic làm bài).

## Cài đặt và chạy

```bash
cd apps/app-mobile
npm install                       # cài riêng cho app
cp .env.example .env              # sửa hai địa chỉ bên dưới thành IP của máy chạy backend và web học tập
npx expo start                    # in mã QR
```

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Gốc API gồm `/api/v1`, ví dụ `http://192.168.1.10:5080/api/v1`. Trên điện thoại thật **không** dùng `localhost`. |
| `EXPO_PUBLIC_WEB_BASE_URL` | Web học tập (cổng 5174): nơi có hai trang nhúng bản đồ và 3D mở trong WebView. |

Backend cần chạy với `--urls http://0.0.0.0:5080` (hoặc cổng khác) để điện thoại trong cùng Wi-Fi gọi được; web học tập chạy `npm run dev:hoc-tap -- --host` ở thư mục gốc.

### Expo Go

- **Android**: cài Expo Go từ Google Play, mở và quét mã QR của `npx expo start` (điện thoại và máy tính cùng Wi-Fi). Không có Wi-Fi chung thì dùng `npx expo start --tunnel`.
- **iPhone**: cài Expo Go từ App Store, mở **Camera** của iPhone và quét mã QR rồi chọn mở bằng Expo Go. iPhone chạy được cả giọng đọc, vị trí, bản đồ và 3D (WebView),
  **không có quảng cáo** (Expo Go không có mô-đun quảng cáo).

Dùng bản Expo Go hỗ trợ **SDK 57** (cập nhật Expo Go trong cửa hàng ứng dụng nếu app báo không tương thích). Hồ sơ dựng APK qua EAS (`development`, `preview`) có sẵn ở [`eas.json`](eas.json), chưa gắn tài khoản Expo của nhóm.

Quảng cáo Google có thưởng (AdMob) **chưa làm**: cần bản dựng phát triển qua EAS, không chạy trong Expo Go. Nơi gắn cổng quảng cáo: [`src/ads/gate.ts`](src/ads/gate.ts).
Bản APK dùng API `http://` (không `https://`) cần cho phép cleartext (plugin `expo-build-properties`, `android.usesCleartextTraffic`); Expo Go không cần.

## Cấu trúc

```
app/                         Expo Router (đường dẫn viết bằng tiếng Việt, không dấu)
  index.tsx                  điểm vào: chọn ngôn ngữ → chọn chế độ → vào chế độ đã chọn
  chon-ngon-ngu.tsx          chọn một trong năm ngôn ngữ
  chon-che-do.tsx            Khách tham quan hoặc Học sinh
  (khach)/                   bốn tab: Trang chủ, Tìm kiếm, Bản đồ, Lịch sử và cài đặt
  di-san/[slug]/             chi tiết, dòng thời gian, xem 3D (dùng chung cho khách và học sinh)
  dang-nhap.tsx, doi-mat-khau.tsx
  (hoc-sinh)/                bốn tab: Trang học, Nhập mã, Tiến độ, Của em
  bai-hoc/[ma]/              bài học theo cấp
  kiem-tra/[quizId].tsx      giới thiệu, làm bài, nộp bài
  ket-qua/[luot].tsx         kết quả theo cấp
src/
  config/        địa chỉ API, web, phiên bản, kênh (expo-go / apk)
  state/         dịch vụ (API, phiên đăng nhập, mã thiết bị) và trạng thái toàn app
  storage/       nơi lưu: SecureStore (token, mã thiết bị) và AsyncStorage (lựa chọn, lịch sử)
  i18n/          react-i18next, năm bộ chữ phần công khai, chữ khu học (chỉ tiếng Việt)
  theme/         bộ token theo cấp học của gói dùng chung → đối tượng theme
  components/    thành phần giao diện đọc token (nút, thẻ, ô nhập, thẻ di sản, tóm tắt)
  guest/         truy vấn khám phá, lịch sử trên máy, gợi ý, "Gần bạn"
  speech/        Narrator (đọc từng câu, tô sáng, tạm dừng, tốc độ) trên expo-speech
  embed/         WebView mở trang nhúng, chỉ đúng origin của web học tập
  hocsinh/       bài học ba cấp, làm bài tám dạng câu, phiên làm bài (lưu từng câu, tự nộp)
  ads/           cổng quảng cáo (giữ chỗ)
```

## Lệnh

| Lệnh | Việc |
|---|---|
| `npm run typecheck` | `tsc` chế độ nghiêm ngặt |
| `npm test` | Jest (`jest-expo`) |
| `npm run lint` | oxlint, coi cảnh báo là lỗi |
| `npm run doctor` | `expo-doctor` (21 kiểm tra) |
| `npm run export:web` | build thử bản web (`expo export --platform web`) |
| `npx expo export --platform android` / `ios` | build thử gói JavaScript cho điện thoại |
