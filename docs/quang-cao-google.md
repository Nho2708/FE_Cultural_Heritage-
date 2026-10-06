# Quảng cáo Google có thưởng trên web

> Làm trên nhánh `feature/DSVHVN-021-quang-cao-google` (tách từ nhánh khách tham quan), chạy thử ngày 07/10/2026 (+07) với backend cùng tên nhánh trên database tạm (đã xóa sau khi chạy).
> Kết quả kiểm trên trình duyệt thật, với **quảng cáo có thưởng thật của Google** (đơn vị thử): xem mục "Kiểm thử".
> Script: [`apps/web-hoc-tap/scripts/smoke-quang-cao.mjs`](../apps/web-hoc-tap/scripts/smoke-quang-cao.mjs) (`npm run smoke:quang-cao -w @dsvhvn/web-hoc-tap`). Backend: `BE_Cultural_Heritage-/docs/quang-cao-google.md`.

Khách tham quan (chưa đăng nhập) xem một quảng cáo ngắn của Google để mở **tóm tắt và nghe thuyết minh** của một di sản trong 24 giờ trên thiết bị đó. Mọi nội dung khác (ảnh, bản đồ, dòng thời gian,
nội dung đầy đủ, xem 3D, gợi ý, lịch sử) vẫn miễn phí. **Học sinh đã đăng nhập không bao giờ thấy quảng cáo.** Web dùng Google Ad Manager (Google Publisher Tag, quảng cáo có thưởng cho web);
app dùng AdMob nên không đi qua phần này.

## Màn hình

| Màn hình | Ứng dụng | Nội dung |
|---|---|---|
| Cổng quảng cáo (trong hộp thoại Tóm tắt và thuyết minh) | Web học tập | Hiện thay nội dung khi khách bấm **Tóm tắt** hoặc **Nghe** ở di sản chưa mở khóa (máy chủ trả 403 `AD_UNLOCK_REQUIRED`). Lời mời "Xem một quảng cáo ngắn để mở tóm tắt và nghe thuyết minh của "{tên di sản}" trong 24 giờ trên thiết bị này", dòng "Xem ảnh, bản đồ, dòng thời gian và mô hình 3D vẫn miễn phí", nút **Xem quảng cáo** và **Để sau**, ghi chú "Quảng cáo do Google cung cấp, hiện không cá nhân hóa". Năm ngôn ngữ |
| Tóm tắt và thuyết minh đã mở khóa | Web học tập | Cùng hộp thoại, thêm dòng "Đã mở khóa đến {giờ}" (giờ máy chủ, đổi theo múi giờ và ngôn ngữ của khách). Một lượt mở khóa dùng cho cả hai tab Đọc và Nghe, ở mọi ngôn ngữ |
| Khách và quảng cáo | Web quản trị, `/quan-tri/khach-va-quang-cao` (chỉ quản trị hệ thống) | Bộ lọc khoảng ngày (30 ngày, 90 ngày, 12 tháng; giờ Việt Nam). Tab **Mở khóa bằng quảng cáo**: thẻ số (lượt mở khóa, lượt bị từ chối), lượt mở khóa theo ngày, theo nền tảng (Android, iOS, Web), theo mạng quảng cáo kèm nguồn báo (máy chủ xác minh hay trình duyệt báo), di sản được mở khóa nhiều nhất, lượt bị từ chối theo sáu lý do. Tab **Khách và di sản**: thiết bị khách hoạt động, ngôn ngữ khách dùng, di sản được xem, nghe, xem 3D nhiều nhất. Có khối ghi chú "Doanh thu quảng cáo xem ở bảng điều khiển Google AdMob và Google Ad Manager" kèm hai liên kết; **không có doanh thu, không có chiến dịch** |

Thanh bên của quản trị hệ thống: Tổng quan · Trường · Di sản · Bản dịch · Câu hỏi · Gói dịch vụ · **Khách và quảng cáo** · Nhật ký. Nhật ký thao tác có thêm hành động "Từ chối phần thưởng quảng cáo"
và đối tượng "Lượt mở khóa bằng quảng cáo".

## Luồng của khách trên web

1. Khách bấm **Tóm tắt** hoặc **Nghe**: hộp thoại gọi `GET /public/heritages/{slug}/summary` (kèm mã thiết bị). Còn hạn mở khóa thì có nội dung; chưa thì 403 và hộp thoại hiện cổng quảng cáo. Di sản chưa có tóm tắt tiếng Việt
   đã duyệt vẫn là "chưa có tóm tắt" (không hiện cổng, không gọi API quảng cáo).
2. Khách bấm **Xem quảng cáo** (chưa bấm thì **chưa nạp gì của Google**, không có yêu cầu nào tới máy chủ quảng cáo): `POST /public/ads/web/start` cấp mã giao dịch một lần (hết hạn sau 10 phút, gắn thiết bị và di sản)
   kèm đơn vị quảng cáo. Máy chủ báo di sản đã mở khóa thì khỏi xem. Môi trường chưa có đơn vị quảng cáo cho web: báo "chưa có quảng cáo".
3. Trang nạp Google Publisher Tag lần đầu, dựng ô quảng cáo có thưởng ngoài trang và chờ. Quảng cáo hiện trên trang nên **hộp thoại tạm đóng** trong lúc quảng cáo chạy (lớp trên cùng của hộp thoại sẽ che mất quảng cáo).
4. Khách xem đủ và đóng quảng cáo: Google đã phát sự kiện "đã cấp thưởng" trước đó thì trình duyệt gọi `POST /public/ads/web/rewarded` (slug, mã giao dịch, đơn vị quảng cáo đã phát). Máy chủ ghi mở khóa 24 giờ,
   hộp thoại mở lại và hỏi lại tóm tắt. Chỉ sự kiện "đã cấp thưởng" mới được tính; "sẵn sàng", "đã đóng" thì không.
5. Các trường hợp không mở khóa đều báo đúng lý do và cho thử lại: đóng khi chưa xem hết ("Bạn chưa xem hết quảng cáo…", nút **Xem lại quảng cáo**), Google không có quảng cáo (hoặc quá 15 giây chưa sẵn sàng), thiết bị hoặc trình duyệt
   không hiện được quảng cáo có thưởng, trình chặn quảng cáo hoặc mất mạng khi nạp thư viện, máy chủ từ chối phần thưởng (400), xem quá nhiều quảng cáo (429, "thử lại sau ít phút"). Mất mạng đúng lúc báo thưởng:
   giữ mã giao dịch, nút **Gửi lại** báo lại mà không bắt xem quảng cáo lần nữa (gửi trùng là thành công, máy chủ không ghi thêm).
6. **Hết hạn**: hộp thoại đang mở hẹn đúng lúc hết hạn (giờ máy chủ), hỏi lại tóm tắt, máy chủ trả 403 và hộp thoại quay về cổng quảng cáo, nội dung cũ biến mất (đang nghe thì dừng). Khách đóng hộp thoại thì tóm tắt đã tải bị bỏ,
   lần mở sau luôn hỏi lại máy chủ nên không hiện nội dung đã hết hạn.
7. Học sinh đã đăng nhập: máy chủ nhận ra học sinh **theo phiên đăng nhập**, nên riêng yêu cầu tóm tắt gắn token của học sinh (`auth: 'optional'` ở `createDiscoveryApi`; mọi yêu cầu công khai khác vẫn không gắn token) và mở thẳng;
   giao diện không gọi API quảng cáo nào, không gửi mã thiết bị, không nạp thư viện của Google. Lần chạy trình duyệt thật đầu tiên phát hiện học sinh vẫn bị chặn vì yêu cầu tóm tắt chưa mang token; đã sửa và có test.

## Quyền riêng tư và chính sách của Google

- Yêu cầu quảng cáo luôn **không cá nhân hóa** (`nonPersonalizedAds`), nên không dùng dữ liệu cá nhân để chọn quảng cáo. **Chưa có hộp đồng ý quảng cáo cá nhân hóa của Google cho khách ở EU và UK trên web**: hộp này do
  Google cấp theo tài khoản Ad Manager (Privacy & messaging) mà nhóm chưa có; khi có tài khoản thì bật hộp đó trước lần yêu cầu quảng cáo đầu tiên. Mức xếp hạng nội dung tối đa (`G`) cũng cấu hình ở tài khoản Ad Manager.
- Khi phát triển và demo **chỉ dùng đơn vị quảng cáo thử của Google** (`/22639388115/rewarded_web_example`, do máy chủ cấp qua cấu hình); mã thật không có trong mã nguồn.
- Giới hạn của máy chủ: 10 lượt mở khóa mỗi giờ mỗi thiết bị và 60 lượt mỗi giờ mỗi IP. Máy chủ gửi `Retry-After` với phản hồi 429 nhưng chưa công bố tiêu đề đó cho trình duyệt khác nguồn gốc, nên giao diện hiện
  "thử lại sau ít phút" khi không đọc được số phút.
- Google đặt `#goog_rewarded` vào địa chỉ trang khi hiện quảng cáo có thưởng và không gỡ; giao diện gỡ dấu này (giữ nguyên trạng thái lịch sử) sau khi quảng cáo đóng.

## Mã nguồn

- Gói dùng chung `packages/dung-chung`: `src/api/ads.ts` (endpoint, kiểu dữ liệu, `createAdsApi` cho khách, `createAdminAdsApi` cho thống kê; mã thiết bị truyền tường minh nên app dùng lại được, kể cả tiêu đề
  `X-Ads-Unavailable` của bản demo iOS), mã lỗi của cổng trong `ERROR_CODES`, `ApiError.retryAfterSeconds`, nhãn nhật ký cho hành động và đối tượng mới.
- Web học tập `apps/web-hoc-tap/src`: `ads/gpt.ts` (nạp và điều khiển Google Publisher Tag), `ads/useRewardedUnlock.ts` (các bước của một lượt xem quảng cáo), `ads/adsData.ts` (cấu hình, trạng thái mở khóa, hẹn giờ hết hạn),
  `components/AdGate.tsx` (cổng), `components/SummaryDialog.tsx` (nối cổng vào hộp thoại), chữ giao diện năm ngôn ngữ ở khóa `ads` của `i18n/strings`.
- Web quản trị `apps/web-quan-tri/src`: `pages/admin/AdStatsPage.tsx`, `components/ads/AdBits.tsx`, mục điều hướng và quyền ở `access/screens.ts`.

## Chưa làm

- Hộp đồng ý của Google cho khách EU và UK (cần tài khoản Ad Manager thật, xem trên).
- Chưa kiểm với tài khoản AdMob và Ad Manager thật: mã đơn vị thật chưa có. Toàn bộ kiểm thử dùng đơn vị thử của Google.
- Từ khóa tìm nhiều nhất chưa có ở màn hình Khách và quảng cáo vì API thống kê chưa trả số liệu này.
