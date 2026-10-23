# App mobile "DiViet" (React Native + Expo)

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
npx expo start --port 8083        # in mã QR (hoặc npm start)
```

Metro chạy ở cổng **8083**, không dùng cổng mặc định 8081: trên máy demo cổng 8080–8082 là ba site IIS (API, web quản trị, web học tập)
và 8090 là Dịch vụ AI, nên chạy Metro ở 8081 sẽ đụng web quản trị của máy demo.

| Biến | Ý nghĩa |
|---|---|
| `EXPO_PUBLIC_API_BASE_URL` | Gốc API gồm `/api/v1`, ví dụ `http://192.168.1.10:5080/api/v1`. Trên điện thoại thật **không** dùng `localhost`. |
| `EXPO_PUBLIC_WEB_BASE_URL` | Web học tập (cổng 5174): nơi có hai trang nhúng bản đồ và 3D mở trong WebView. |

Backend cần chạy với `--urls http://0.0.0.0:5080` (hoặc cổng khác) để điện thoại trong cùng Wi-Fi gọi được; web học tập chạy `npm run dev:hoc-tap -- --host` ở thư mục gốc.

### Chạy trên điện thoại từng bước (Windows)

1. Điện thoại cài hoặc **cập nhật Expo Go** (bản hỗ trợ SDK 57). Điện thoại và máy tính **cùng một mạng Wi-Fi**.
2. Lấy IP của máy tính: chạy `ipconfig`, lấy dòng `IPv4 Address` của card Wi-Fi (ví dụ `192.168.1.10`). Sửa `.env` của app:
   `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://192.168.1.10:5174`.
3. Mở tường lửa Windows cho ba cổng (chạy PowerShell **với quyền Administrator**, một lần):
   `netsh advfirewall firewall add rule name="DSVHVN dev" dir=in action=allow protocol=TCP localport=5080,5174,8083 profile=private`
   và đặt mạng Wi-Fi đang dùng là **Private network** trong Settings → Network.
4. Backend (thư mục `BE_Cultural_Heritage-`): `dotnet run --project src/DSVHVN.Api --launch-profile http --urls http://0.0.0.0:5080`.
   Kiểm từ điện thoại: mở trình duyệt điện thoại vào `http://192.168.1.10:5080/swagger` phải thấy trang Swagger.
5. Web học tập (thư mục gốc FE, cho bản đồ và 3D): `npm run dev:hoc-tap -- --host`.
6. App: `cd apps/app-mobile`, `npm install`, `npx expo start --port 8083`, rồi quét mã QR (Android: trong Expo Go; iPhone: bằng Camera).
   Mạng trường/quán cà phê thường chặn máy trong cùng Wi-Fi nói chuyện với nhau — khi đó dùng `npx expo start --port 8083 --tunnel` cho app, nhưng API vẫn phải gọi được (bước 4); cách chắc nhất là phát Wi-Fi từ điện thoại hoặc dùng Wi-Fi ở nhà.

Lỗi thường gặp:
- *"Project is incompatible with this version of Expo Go"*: cập nhật Expo Go trong cửa hàng ứng dụng (app dùng SDK 57).
- Quét QR xong quay mãi rồi báo *"Could not connect to the development server"*: máy tính và điện thoại khác mạng, hoặc tường lửa chặn cổng 8083 (bước 3) — thử `--tunnel`.
- App mở được nhưng báo lỗi mạng ở mọi màn hình: sai IP trong `.env`, backend chạy `localhost` thay vì `0.0.0.0`, hoặc tường lửa chặn 5080. Sửa `.env` thì phải tắt `npx expo start --port 8083` và chạy lại.

### Expo Go

- **Android**: cài Expo Go từ Google Play, mở và quét mã QR của `npx expo start --port 8083` (điện thoại và máy tính cùng Wi-Fi). Không có Wi-Fi chung thì dùng `npx expo start --port 8083 --tunnel`.
- **iPhone**: cài Expo Go từ App Store, mở **Camera** của iPhone và quét mã QR rồi chọn mở bằng Expo Go. iPhone chạy được cả giọng đọc, vị trí, bản đồ và 3D (WebView),
  **không có quảng cáo** (Expo Go không có mô-đun quảng cáo).

Dùng bản Expo Go hỗ trợ **SDK 57** (cập nhật Expo Go trong cửa hàng ứng dụng nếu app báo không tương thích). Hồ sơ dựng APK qua EAS (`development`, `preview`) có sẵn ở [`eas.json`](eas.json), chưa gắn tài khoản Expo của nhóm.

### Chế độ Khách và quảng cáo

Ở chế độ Khách, mọi yêu cầu gửi `X-Device-Key` (UUID v4 sinh ở lần mở đầu, giữ trong SecureStore) và `X-Client-Platform` (`ANDROID` hoặc `IOS`). Máy chủ nhờ đó tự ghi lịch sử (xem ở tab Lịch sử và cài đặt: xem, xóa từng mục, xóa hết),
tính "Gợi ý cho bạn" và "Gần bạn" (chỉ khi khách cho phép vị trí; tọa độ đi trong thân yêu cầu, không lưu). Chế độ Học sinh không gửi mã thiết bị và không bao giờ có quảng cáo.

Tóm tắt và nghe thuyết minh đi qua cổng quảng cáo có thưởng của máy chủ (`Ads:GateEnabled`). Khi máy chủ trả 403 `AD_UNLOCK_REQUIRED`, app hiện lời mời ([`src/components/AdGatePanel.tsx`](src/components/AdGatePanel.tsx));
khách xem hết quảng cáo thì app hỏi `GET /public/ads/unlock?slug=` mỗi 2 giây (tối đa 20 giây) và chỉ mở khi **máy chủ** báo đã mở (Google gọi xác minh phía máy chủ về backend). Logic ở [`src/ads/gate.ts`](src/ads/gate.ts), phần gọi SDK ở [`src/ads/rewarded.ts`](src/ads/rewarded.ts).

- **Expo Go không có AdMob.** Ở đó app gửi thêm `X-Ads-Unavailable: true`; backend ở môi trường phát triển (`Ads:AllowNoAdsDeclaration` = true) mở thẳng tóm tắt và nghe, app hiện ghi chú "chạy trong Expo Go nên chưa có quảng cáo".
  Nếu backend không bật cờ này (môi trường thật) mà cổng bật, app hiện "cần bản dựng phát triển để xem quảng cáo" và không mở được.
- **Bật AdMob** bằng bản dựng phát triển: `react-native-google-mobile-ads` đã khai trong `package.json` và `app.json` với **mã ứng dụng thử do Google công bố** (`ca-app-pub-3940256099942544~...`). Chạy
  `eas build --profile development --platform android` (hoặc `ios`, cần tài khoản Apple Developer), cài bản dựng lên máy rồi `npx expo start --port 8083 --dev-client`. Đơn vị quảng cáo **không** nằm trong app: lấy từ
  `GET /public/ads/config`; ở môi trường phát triển backend trả **đơn vị thử của Google** (`.../5224354917` Android, `.../1712485313` iOS). Không dùng mã quảng cáo thật khi phát triển và không tự bấm quảng cáo thật (vi phạm chính sách của Google).
  Bản dựng dùng tài khoản AdMob của nhóm đặt mã ứng dụng lúc dựng bằng biến môi trường `ADMOB_ANDROID_APP_ID`, `ADMOB_IOS_APP_ID` ([`app.config.ts`](app.config.ts)); không đặt thì giữ mã thử.
  Muốn thử trọn luồng mở khóa với đơn vị thật thì khai điện thoại là **thiết bị thử** trong AdMob (Settings → Test devices) để Google chỉ trả quảng cáo thử, hoặc đặt
  `EXPO_PUBLIC_ADMOB_TEST_DEVICE_IDS` lúc dựng bằng mã băm mà SDK in ra log ("Use RequestConfiguration.Builder().setTestDeviceIds(...)").
- **Dựng APK tại máy** (không cần tài khoản Expo): đặt các biến trên cùng `EXPO_PUBLIC_API_BASE_URL` (địa chỉ HTTPS công khai của backend, vd đường hầm ngrok), chạy
  `npx expo prebuild --platform android --no-install` rồi trong `android/` chạy `gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`; tệp ra ở `android/app/build/outputs/apk/release/`.
  Trên Windows phải bật đường dẫn dài (`LongPathsEnabled` = 1), vì đường dẫn biên dịch của reanimated dài tới 260 ký tự và ninja sẽ báo "build.ninja still dirty". `prebuild` sửa script
  `android`, `ios` trong `package.json`: trả lại bằng `git checkout -- package.json`. Script [`scripts/dung-apk.ps1`](../../scripts/dung-apk.ps1) ở thư mục gốc làm đủ các bước.
- **Dựng cho Google Play**: mã gói `vn.id.diviet` (theo tên miền `diviet.id.vn`; không đổi được sau lần tải lên đầu). Tạo khóa tải lên một lần bằng
  `scripts/tao-khoa-tai-len.ps1` (lưu ở `%APPDATA%\DSVHVN\google-play`, ngoài repo; cất thêm một bản ở nơi an toàn), rồi `scripts/dung-apk.ps1 -ChoGooglePlay`
  ra tệp AAB đủ bốn kiến trúc ký bằng khóa đó ([`app.config.ts`](app.config.ts) thêm cấu hình ký đọc biến môi trường). Mỗi lần tải lên phải tăng `expo.android.versionCode` trong `app.json`.
- **Chính sách Gia đình của Google Play**: học sinh (có cả học sinh tiểu học) dùng app nên đối tượng khai trên Play gồm trẻ em. Mọi yêu cầu quảng cáo đều xử lý như cho trẻ em
  (không cá nhân hóa, mức G, cờ dưới tuổi đồng ý nên Google không hiện hộp đồng ý UMP) và `app.json` chặn quyền `com.google.android.gms.permission.AD_ID`, nên app không gửi mã quảng cáo của máy.
- Để lượt xem mở khóa được, backend phải bật `Ads__GateEnabled=true` và địa chỉ `https://<máy chủ công khai>/api/v1/ads/admob/ssv` phải khai ở AdMob (dùng đường hầm khi chạy trên máy cá nhân).

Bản APK dùng API `http://` (không `https://`) cần cho phép cleartext (plugin `expo-build-properties`, `android.usesCleartextTraffic`); Expo Go không cần.

## Cấu trúc

```
app/                         Expo Router (đường dẫn viết bằng tiếng Việt, không dấu)
  index.tsx                  điểm vào: chọn ngôn ngữ → giới thiệu ứng dụng (một lần) → chọn chế độ → vào chế độ đã chọn
  chon-ngon-ngu.tsx          chọn một trong năm ngôn ngữ
  gioi-thieu.tsx             bốn thẻ giới thiệu ứng dụng (lần đầu, hoặc xem lại từ Lịch sử và cài đặt / Của em)
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
  storage/       nơi lưu: SecureStore (token, mã thiết bị) và AsyncStorage (lựa chọn)
  i18n/          react-i18next, năm bộ chữ phần công khai, chữ khu học (chỉ tiếng Việt)
  theme/         bộ token theo cấp học của gói dùng chung → đối tượng theme
  components/    thành phần giao diện đọc token (nút, thẻ, ô nhập, thẻ di sản, tóm tắt)
  guest/         truy vấn khám phá, lịch sử, gợi ý, "Gần bạn" gọi API của khách
  speech/        Narrator (đọc từng câu, tô sáng, tạm dừng, tốc độ) trên expo-speech
  embed/         WebView mở trang nhúng, chỉ đúng origin của web học tập
  hocsinh/       bài học ba cấp, làm bài tám dạng câu, phiên làm bài (lưu từng câu, tự nộp)
  ads/           cổng quảng cáo có thưởng (AdMob ở bản dựng phát triển)
  intro/         bốn thẻ giới thiệu ứng dụng và hình minh họa vẽ bằng khối View theo màu logo
  motion/        chuyển động dùng chung: màn hình chờ trong app, hiện dần lệch nhịp, đọc cài đặt giảm chuyển động
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

## Chạy trên điện thoại Android qua cáp hoặc gỡ lỗi không dây (adb reverse)

Cách này cho điện thoại gọi `localhost` như máy tính nên không cần cùng Wi-Fi, không cần mở tường lửa, không cần sửa `.env`.

1. Bật **Tùy chọn nhà phát triển** rồi **Gỡ lỗi USB** (cắm cáp) hoặc **Gỡ lỗi không dây** (cùng Wi-Fi). Không dây: chọn "Ghép nối thiết bị bằng mã ghép nối", rồi trên máy tính chạy
   `adb pair <ip>:<cổng ghép nối>` và nhập mã; sau đó `adb connect <ip>:<cổng kết nối>` (cổng kết nối hiện ở màn hình Gỡ lỗi không dây và đổi mỗi lần bật lại).
   Có nhiều thiết bị cùng nối thì mọi lệnh `adb` phải kèm `-s <số hiệu>`.
2. Chuyển cổng từ điện thoại về máy tính (Metro, backend, web học tập), chạy lại sau mỗi lần nối lại:
   ```
   adb -s <số hiệu> reverse tcp:8083 tcp:8083
   adb -s <số hiệu> reverse tcp:5080 tcp:5080
   adb -s <số hiệu> reverse tcp:5174 tcp:5174
   ```
3. Chạy backend ở cổng 5080 và web học tập ở cổng 5174 (`VITE_API_BASE_URL=http://localhost:5080/api/v1`). Web học tập chạy bằng `npm run dev:hoc-tap -- --host 127.0.0.1`:
   để mặc định thì Vite có thể chỉ nghe trên `::1` (IPv6) và trang bản đồ, 3D mở qua `adb reverse` sẽ không tải được. Sau đó chạy Metro trong `apps/app-mobile` với biến môi trường của tiến trình:
   `EXPO_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://localhost:5174`, lệnh `npx expo start --port 8083` (không thêm `--android`).
4. Mở app trong Expo Go: `adb -s <số hiệu> shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8083 host.exp.exponent`.
5. Xong thì `adb -s <số hiệu> reverse --remove-all`.

Lưu ý: Xiaomi/MIUI chặn cài ứng dụng qua adb nếu chưa bật "Cài đặt qua USB" (và đăng nhập tài khoản Xiaomi), nên Maestro, vốn cài trình điều khiển lên điện thoại, sẽ bị "Install canceled by user"; chỉ dùng Maestro trên máy ảo
hoặc bật "Cài đặt qua USB" trước. Trên MIUI, `adb shell uiautomator dump` có thể bị hệ thống tắt giữa chừng; khi đó đọc cây giao diện bằng `dumpsys activity top` hoặc chụp ảnh `adb exec-out screencap -p`.
Lệnh `adb shell input text` chỉ gõ được chữ không dấu.

## Kiểm thử trên máy ảo Android

Chạy app thật trong Expo Go trên máy ảo, đi qua các hành trình chính bằng [Maestro](https://maestro.mobile.dev) rồi báo đạt hoặc không đạt từng luồng.
Các luồng nằm ở [`e2e/`](e2e/) (YAML, mở app qua `exp://10.0.2.2:8083`); phần dùng chung ở `e2e/chung/`.

| Luồng | Nội dung |
|---|---|
| `gioi-thieu-ung-dung` | bốn thẻ giới thiệu: lần mở đầu (Next, Next, Next, Get started rồi chọn chế độ; chỉ chạy khi app còn mới) và xem lại từ Lịch sử và cài đặt (đi hết bốn thẻ, rồi chỉ bấm Skip) |
| `khach-tham-quan` | chọn tiếng Anh và chế độ Khách, trang chủ, tìm "thang long", chi tiết, tóm tắt, nghe, xem 3D, bản đồ, lịch sử (xoá từng mục và xoá hết) |
| `khach-dong-thoi-gian` | hai thẻ Bản đồ, Dòng thời gian trên trang chủ; màn chọn di sản (tìm nhanh, từ khóa ngắn); dòng thời gian một di sản; tab Dòng thời gian |
| `khach-ban-do` | bản đồ: chip loại, vùng; bảng Thêm bộ lọc (tỉnh, cấp xếp hạng, thời kỳ); nút Gần bạn trên bản đồ; nút mở dòng thời gian trong thẻ ghim |
| `khach-goi-y` | Gợi ý cho bạn ở trang chủ và cuối trang chi tiết; màn Xem tất cả với tab Gợi ý và Gần bạn (xin quyền khi bấm; điện thoại đã cấp quyền thì thấy khoảng cách) |
| `khach-cai-dat` | Cài đặt: mục Quảng cáo trong Expo Go (không có nút mở lại lựa chọn, app giải thích), phiên bản và kênh, địa chỉ máy chủ |
| `khach-ngon-ngu` | đổi ngôn ngữ trong Cài đặt: Hàn, Nhật, Trung giản thể rồi Việt; chụp trang chủ, tìm kiếm, bản đồ, dòng thời gian, lịch sử từng ngôn ngữ |
| `hoc-sinh-dang-nhap-sai` | bỏ trống và nhập sai mật khẩu |
| `hoc-sinh-kham-pha` | học sinh khối 8: tab Khám phá (không có lịch sử, gợi ý, Gần bạn), bản đồ và dòng thời gian mở riêng, tìm kiếm, chi tiết không có khối gợi ý |
| `hoc-sinh-ma-gan-day` | học sinh khối 3: bài cấp 1 có thanh tiến độ theo bước, công tắc Tự đọc to tắt bật; mã vừa mở hiện ở "Mã em đã mở gần đây", chạm để mở lại |
| `hoc-sinh-khoi-3` | cấp 1: đăng nhập mật khẩu tạm, đổi mật khẩu bắt buộc, nhập mã bài học, học từng bước, bài chơi bốn dạng câu, kết quả bằng sao |
| `hoc-sinh-khoi-11` | cấp 3: bài dạng tài liệu, bài kiểm tra có giờ ba dạng câu, điểm và phân tích |
| `khach-gan-ban-tu-choi` | (không chạy mặc định) khách từ chối quyền vị trí: app báo và vẫn cho thử lại; cần Expo Go chưa có quyền vị trí (máy ảo mới hoặc đã `pm revoke`, cấp lại sau) |

**Chạy một lệnh** (PowerShell 7, từ thư mục gốc FE; cần cổng 5080, 5174, 8083 đang rảnh):

```powershell
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1                          # mọi luồng trên máy ảo
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -Flows khach-tham-quan   # một luồng
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -KeepRunning             # giữ máy ảo, dịch vụ và cơ sở dữ liệu tạm để xem lại
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -RealDevice              # điện thoại thật đang nối adb (xem bên dưới)
```

Script làm lần lượt: bật máy ảo `dsvhvn_pixel` (tự tạo AVD pixel_7 nếu chưa có; dùng `-gpu host` vì GPU phần mềm làm WebGL của trình xem 3D sập), chạy backend trên **cơ sở dữ liệu tạm**
`dsvhvn_tam_app_<giờ>` (LocalDB; email ghi log, AI giả lập, lưu tệp trong máy, CORS thêm `http://10.0.2.2:5174`), nạp dữ liệu thử bằng [`scripts/seed-du-lieu-thu.py`](scripts/seed-du-lieu-thu.py)
(di sản đã xuất bản kèm bản dịch, tóm tắt và mô hình 3D; trường, giáo viên, lớp khối 3, 8, 11, học sinh, bài học và bài kiểm tra đã phát hành), chạy web học tập, chạy Metro với
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://10.0.2.2:5174` (đặt bằng biến môi trường, không sửa `.env` của điện thoại thật),
chạy từng luồng Maestro (xoá dữ liệu Expo Go trước mỗi luồng, chạy lại tối đa ba lần nếu máy ảo hoặc trình điều khiển Maestro rớt kết nối), rồi tắt mọi tiến trình đã bật và xoá cơ sở dữ liệu tạm.
Ảnh chụp từng bước nằm trong thư mục tạm mà script in ra cuối cùng (`ket-qua/<luồng>/.../takeScreenshot/`). Maestro tự tải về `%USERPROFILE%\tools\maestro` ở lần đầu.

Chạy tay từng phần khi sửa lỗi: bật máy ảo, `adb shell pm clear host.exp.exponent`, giữ Metro đang chạy, rồi
`maestro --device emulator-5554 test -e STUDENT_CODE=... apps/app-mobile/e2e/<luồng>.yaml`. Lệnh `maestro` cần biến `JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8` để đọc đúng chữ có dấu.
Lần mở đầu có thêm bốn thẻ giới thiệu ngay sau chọn ngôn ngữ: `e2e/chung/bo-qua-gioi-thieu.yaml` bấm "Bỏ qua" và được `vao-khach.yaml`, `vao-hoc-sinh.yaml` gọi.
Luồng học sinh dùng tài khoản một lần (đăng nhập lần đầu đổi mật khẩu, bài kiểm tra chỉ làm một lần) nên mỗi lần chạy phải nạp dữ liệu mới.
Địa chỉ Metro nhìn từ thiết bị đi vào luồng bằng biến `METRO_URL` (mặc định `exp://10.0.2.2:8083` của máy ảo; điện thoại thật qua adb reverse truyền `-e METRO_URL=exp://127.0.0.1:8083`).

### Chạy các luồng trên điện thoại thật (`-RealDevice`)

Cùng script, thêm `-RealDevice` (và `-Serial <số hiệu>` nếu nối nhiều máy). Script không bật máy ảo, không đổi cài đặt nào của điện thoại và **không xoá dữ liệu Expo Go**:
điện thoại gọi máy tính qua `adb reverse` (backend, web học tập, Metro đều là `localhost` trên điện thoại), các luồng tự đưa app về trạng thái cần từ bất kỳ trạng thái nào
(`e2e/chung/vao-khach.yaml`: về chế độ Khách với ngôn ngữ cho trước; `vao-hoc-sinh.yaml`: về màn đăng nhập học sinh, kể cả khi đang đăng nhập hay đang dở màn đổi mật khẩu bắt buộc).
Xong thì script đóng Expo Go và bỏ các cổng đã chuyển. Đã chạy xanh cả 11 luồng trên Xiaomi Redmi Note 10 Pro (Android 13, MIUI) qua gỡ lỗi không dây.

Lưu ý riêng khi dùng điện thoại:
- Maestro cài lại trình điều khiển của nó mỗi lần chạy; MIUI hiện hộp "Cài đặt qua USB" và tự từ chối sau 10 giây. Bật "Cài đặt qua USB" trong Tùy chọn nhà phát triển và
  bấm "Cài đặt" khi hộp hiện (tích "Nhớ lựa chọn của tôi" nếu muốn khỏi hỏi lại), nếu không Maestro báo `INSTALL_FAILED_USER_RESTRICTED`.
- Nút bánh răng nổi của Expo Go kéo được và nhận cả vuốt; nó che góc phải trên và làm luồng chạm nhầm. Tắt nó trong menu nhà phát triển của Expo Go (lắc máy → "Tools button") trong lúc chạy, xong bật lại.
- Màn hình điện thoại cao hơn máy ảo nên nhiều phần nằm dưới mép: luồng dùng `scrollUntilVisible` thay cho `assertVisible` với phần ở cuối trang, và không dùng `hideKeyboard`
  sau phím Enter (bàn phím đã đóng thì Maestro gửi phím Back và thanh tab nhảy về Trang chủ). Hàng chip cuộn ngang vuốt bằng `swipe` bắt đầu cách mép màn hình (MIUI coi vuốt từ mép là Quay lại).
- Luồng `khach-goi-y` và `khach-ban-do` dùng quyền vị trí đã cấp cho Expo Go (không hỏi lại); đường từ chối quyền ở `khach-gan-ban-tu-choi.yaml`, chạy tay sau khi `pm revoke` và cấp lại sau.
- Tài khoản học sinh "mới" dùng một lần: chạy lại `hoc-sinh-khoi-3` hay `hoc-sinh-khoi-11` thì tạo học sinh mới bằng tài khoản giáo viên trong tệp dữ liệu thử hoặc chạy lại script.

**Lưu ý khi chạy với máy ảo hoặc điện thoại:**
- Máy tính là `10.0.2.2` trong máy ảo. Web học tập phải chạy với `VITE_API_BASE_URL=http://10.0.2.2:5080/api/v1` (trang bản đồ và 3D trong WebView gọi API từ chính địa chỉ này), `npm run dev:hoc-tap -- --host`
  và backend phải cho phép origin của web đó (`Cors__AllowedOrigins__N=http://10.0.2.2:5174`). Với điện thoại thật thay `10.0.2.2` bằng IP của máy tính.
- Script chỉ gắn vào `emulator-5554`. Nếu đang cắm hoặc kết nối không dây điện thoại thật qua adb thì phải luôn truyền `--device` (script đã làm), kẻo Maestro cài trình điều khiển lên nhầm điện thoại.

**Không kiểm được trên máy ảo:** giọng đọc thật (máy ảo không có giọng tiếng Việt, app báo "điện thoại chưa có giọng"), vị trí thật ("Gần bạn" cần cấp quyền và tọa độ giả lập),
quảng cáo AdMob và hộp đồng ý của Google (cần bản dựng phát triển, Expo Go không có mô-đun quảng cáo), cảm ứng nhiều ngón khi chụm để phóng to mô hình 3D, hiệu năng thật của thiết bị yếu.
Nút bánh răng nổi của Expo Go che một phần góc phải đầu màn hình (ví dụ nút Nộp bài của cấp 3); chỉ có trong Expo Go, bản dựng thật không có.
