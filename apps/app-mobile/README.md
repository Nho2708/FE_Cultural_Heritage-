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

### Chạy trên điện thoại từng bước (Windows)

1. Điện thoại cài hoặc **cập nhật Expo Go** (bản hỗ trợ SDK 57). Điện thoại và máy tính **cùng một mạng Wi-Fi**.
2. Lấy IP của máy tính: chạy `ipconfig`, lấy dòng `IPv4 Address` của card Wi-Fi (ví dụ `192.168.1.10`). Sửa `.env` của app:
   `EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://192.168.1.10:5174`.
3. Mở tường lửa Windows cho ba cổng (chạy PowerShell **với quyền Administrator**, một lần):
   `netsh advfirewall firewall add rule name="DSVHVN dev" dir=in action=allow protocol=TCP localport=5080,5174,8081 profile=private`
   và đặt mạng Wi-Fi đang dùng là **Private network** trong Settings → Network.
4. Backend (thư mục `BE_Cultural_Heritage-`): `dotnet run --project src/DSVHVN.Api --launch-profile http --urls http://0.0.0.0:5080`.
   Kiểm từ điện thoại: mở trình duyệt điện thoại vào `http://192.168.1.10:5080/swagger` phải thấy trang Swagger.
5. Web học tập (thư mục gốc FE, cho bản đồ và 3D): `npm run dev:hoc-tap -- --host`.
6. App: `cd apps/app-mobile`, `npm install`, `npx expo start`, rồi quét mã QR (Android: trong Expo Go; iPhone: bằng Camera).
   Mạng trường/quán cà phê thường chặn máy trong cùng Wi-Fi nói chuyện với nhau — khi đó dùng `npx expo start --tunnel` cho app, nhưng API vẫn phải gọi được (bước 4); cách chắc nhất là phát Wi-Fi từ điện thoại hoặc dùng Wi-Fi ở nhà.

Lỗi thường gặp:
- *"Project is incompatible with this version of Expo Go"*: cập nhật Expo Go trong cửa hàng ứng dụng (app dùng SDK 57).
- Quét QR xong quay mãi rồi báo *"Could not connect to the development server"*: máy tính và điện thoại khác mạng, hoặc tường lửa chặn cổng 8081 (bước 3) — thử `--tunnel`.
- App mở được nhưng báo lỗi mạng ở mọi màn hình: sai IP trong `.env`, backend chạy `localhost` thay vì `0.0.0.0`, hoặc tường lửa chặn 5080. Sửa `.env` thì phải tắt `npx expo start` và chạy lại.

### Expo Go

- **Android**: cài Expo Go từ Google Play, mở và quét mã QR của `npx expo start` (điện thoại và máy tính cùng Wi-Fi). Không có Wi-Fi chung thì dùng `npx expo start --tunnel`.
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
  `eas build --profile development --platform android` (hoặc `ios`, cần tài khoản Apple Developer), cài bản dựng lên máy rồi `npx expo start --dev-client`. Đơn vị quảng cáo **không** nằm trong app: lấy từ
  `GET /public/ads/config`; ở môi trường phát triển backend trả **đơn vị thử của Google** (`.../5224354917` Android, `.../1712485313` iOS). Không dùng mã quảng cáo thật khi phát triển và không tự bấm quảng cáo thật (vi phạm chính sách của Google).
- Để lượt xem mở khóa được, backend phải bật `Ads__GateEnabled=true` và địa chỉ `https://<máy chủ công khai>/api/v1/ads/admob/ssv` phải khai ở AdMob (dùng đường hầm khi chạy trên máy cá nhân); khách có hộp đồng ý UMP của Google ở EU và UK, nội dung giới hạn mức G.

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
  storage/       nơi lưu: SecureStore (token, mã thiết bị) và AsyncStorage (lựa chọn)
  i18n/          react-i18next, năm bộ chữ phần công khai, chữ khu học (chỉ tiếng Việt)
  theme/         bộ token theo cấp học của gói dùng chung → đối tượng theme
  components/    thành phần giao diện đọc token (nút, thẻ, ô nhập, thẻ di sản, tóm tắt)
  guest/         truy vấn khám phá, lịch sử, gợi ý, "Gần bạn" gọi API của khách
  speech/        Narrator (đọc từng câu, tô sáng, tạm dừng, tốc độ) trên expo-speech
  embed/         WebView mở trang nhúng, chỉ đúng origin của web học tập
  hocsinh/       bài học ba cấp, làm bài tám dạng câu, phiên làm bài (lưu từng câu, tự nộp)
  ads/           cổng quảng cáo có thưởng (AdMob ở bản dựng phát triển)
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
   adb -s <số hiệu> reverse tcp:8081 tcp:8081
   adb -s <số hiệu> reverse tcp:5080 tcp:5080
   adb -s <số hiệu> reverse tcp:5174 tcp:5174
   ```
3. Chạy backend ở cổng 5080 và web học tập ở cổng 5174 (`VITE_API_BASE_URL=http://localhost:5080/api/v1`), rồi Metro trong `apps/app-mobile` với biến môi trường của tiến trình:
   `EXPO_PUBLIC_API_BASE_URL=http://localhost:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://localhost:5174`, lệnh `npx expo start` (không thêm `--android`).
4. Mở app trong Expo Go: `adb -s <số hiệu> shell am start -a android.intent.action.VIEW -d exp://127.0.0.1:8081 host.exp.exponent`.
5. Xong thì `adb -s <số hiệu> reverse --remove-all`.

Lưu ý: Xiaomi/MIUI chặn cài ứng dụng qua adb nếu chưa bật "Cài đặt qua USB" (và đăng nhập tài khoản Xiaomi), nên Maestro, vốn cài trình điều khiển lên điện thoại, sẽ bị "Install canceled by user"; chỉ dùng Maestro trên máy ảo
hoặc bật "Cài đặt qua USB" trước. Trên MIUI, `adb shell uiautomator dump` có thể bị hệ thống tắt giữa chừng; khi đó đọc cây giao diện bằng `dumpsys activity top` hoặc chụp ảnh `adb exec-out screencap -p`.
Lệnh `adb shell input text` chỉ gõ được chữ không dấu.

## Kiểm thử trên máy ảo Android

Chạy app thật trong Expo Go trên máy ảo, đi qua các hành trình chính bằng [Maestro](https://maestro.mobile.dev) rồi báo đạt hoặc không đạt từng luồng.
Các luồng nằm ở [`e2e/`](e2e/) (YAML, mở app qua `exp://10.0.2.2:8081`); phần dùng chung ở `e2e/chung/`.

| Luồng | Nội dung |
|---|---|
| `khach-tham-quan` | chọn tiếng Anh và chế độ Khách, trang chủ, tìm "thang long", chi tiết, tóm tắt, nghe, xem 3D, bản đồ, lịch sử (xoá từng mục và xoá hết) |
| `hoc-sinh-dang-nhap-sai` | bỏ trống và nhập sai mật khẩu |
| `hoc-sinh-khoi-3` | cấp 1: đăng nhập mật khẩu tạm, đổi mật khẩu bắt buộc, nhập mã bài học, học từng bước, bài chơi bốn dạng câu, kết quả bằng sao |
| `hoc-sinh-khoi-11` | cấp 3: bài dạng tài liệu, bài kiểm tra có giờ ba dạng câu, điểm và phân tích |

**Chạy một lệnh** (PowerShell 7, từ thư mục gốc FE; cần cổng 5080, 5174, 8081 đang rảnh):

```powershell
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1                          # mọi luồng
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -Flows khach-tham-quan   # một luồng
pwsh -File apps/app-mobile/scripts/chay-kiem-thu-may-ao.ps1 -KeepRunning             # giữ máy ảo, dịch vụ và cơ sở dữ liệu tạm để xem lại
```

Script làm lần lượt: bật máy ảo `dsvhvn_pixel` (tự tạo AVD pixel_7 nếu chưa có; dùng `-gpu host` vì GPU phần mềm làm WebGL của trình xem 3D sập), chạy backend trên **cơ sở dữ liệu tạm**
`dsvhvn_tam_app_<giờ>` (LocalDB; email ghi log, AI giả lập, lưu tệp trong máy, CORS thêm `http://10.0.2.2:5174`), nạp dữ liệu thử bằng [`scripts/seed-du-lieu-thu.py`](scripts/seed-du-lieu-thu.py)
(di sản đã xuất bản kèm bản dịch, tóm tắt và mô hình 3D; trường, giáo viên, lớp khối 3, 8, 11, học sinh, bài học và bài kiểm tra đã phát hành), chạy web học tập, chạy Metro với
`EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:5080/api/v1` và `EXPO_PUBLIC_WEB_BASE_URL=http://10.0.2.2:5174` (đặt bằng biến môi trường, không sửa `.env` của điện thoại thật),
chạy từng luồng Maestro (xoá dữ liệu Expo Go trước mỗi luồng, chạy lại tối đa ba lần nếu máy ảo hoặc trình điều khiển Maestro rớt kết nối), rồi tắt mọi tiến trình đã bật và xoá cơ sở dữ liệu tạm.
Ảnh chụp từng bước nằm trong thư mục tạm mà script in ra cuối cùng (`ket-qua/<luồng>/.../takeScreenshot/`). Maestro tự tải về `%USERPROFILE%\tools\maestro` ở lần đầu.

Chạy tay từng phần khi sửa lỗi: bật máy ảo, `adb shell pm clear host.exp.exponent`, giữ Metro đang chạy, rồi
`maestro --device emulator-5554 test -e STUDENT_CODE=... apps/app-mobile/e2e/<luồng>.yaml`. Lệnh `maestro` cần biến `JAVA_TOOL_OPTIONS=-Dfile.encoding=UTF-8` để đọc đúng chữ có dấu.
Luồng học sinh dùng tài khoản một lần (đăng nhập lần đầu đổi mật khẩu, bài kiểm tra chỉ làm một lần) nên mỗi lần chạy phải nạp dữ liệu mới.

**Lưu ý khi chạy với máy ảo hoặc điện thoại:**
- Máy tính là `10.0.2.2` trong máy ảo. Web học tập phải chạy với `VITE_API_BASE_URL=http://10.0.2.2:5080/api/v1` (trang bản đồ và 3D trong WebView gọi API từ chính địa chỉ này), `npm run dev:hoc-tap -- --host`
  và backend phải cho phép origin của web đó (`Cors__AllowedOrigins__N=http://10.0.2.2:5174`). Với điện thoại thật thay `10.0.2.2` bằng IP của máy tính.
- Script chỉ gắn vào `emulator-5554`. Nếu đang cắm hoặc kết nối không dây điện thoại thật qua adb thì phải luôn truyền `--device` (script đã làm), kẻo Maestro cài trình điều khiển lên nhầm điện thoại.

**Không kiểm được trên máy ảo:** giọng đọc thật (máy ảo không có giọng tiếng Việt, app báo "điện thoại chưa có giọng"), vị trí thật ("Gần bạn" cần cấp quyền và tọa độ giả lập),
quảng cáo AdMob và hộp đồng ý của Google (cần bản dựng phát triển, Expo Go không có mô-đun quảng cáo), cảm ứng nhiều ngón khi chụm để phóng to mô hình 3D, hiệu năng thật của thiết bị yếu.
Nút bánh răng nổi của Expo Go che một phần góc phải đầu màn hình (ví dụ nút Nộp bài của cấp 3); chỉ có trong Expo Go, bản dựng thật không có.
