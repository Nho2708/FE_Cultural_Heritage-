# Luồng Khám phá di sản — web học tập

Năm màn hình công khai của web học tập (`apps/web-hoc-tap`), khách và học sinh đều xem được, **không cần đăng nhập**, gọi API
`/api/v1/public` của backend (xem `docs/kham-pha-di-san.md` ở repo backend). Chỉ thấy di sản đã xuất bản. Các màn hình này luôn
dùng bộ giao diện mặc định; bộ theo cấp học chỉ dành cho khu học của học sinh.

| Màn hình | Route | Nội dung |
|---|---|---|
| Trang chủ | `/` | Ảnh lớn đầu trang (ảnh của di sản nổi bật đầu tiên, có dòng ghi công), ô tìm kiếm và gợi ý nhanh, lối vào bản đồ và dòng thời gian, di sản nổi bật (tối đa 8, do máy chủ chọn), khám phá theo vùng và loại (kèm số di sản), giới thiệu app mobile; nút "Học sinh đăng nhập" hoặc "Vào trang học của em". Không có ô nhập mã bài học |
| Tìm kiếm và lọc di sản | `/di-san` | Từ khóa (tìm được không dấu), lọc tỉnh, vùng, loại, cấp xếp hạng, thời kỳ; lưới 12 thẻ mỗi trang, phân trang có số trang; nút "Xem trên bản đồ" giữ nguyên bộ lọc |
| Bản đồ di sản | `/ban-do` | Nền OpenStreetMap, ghim theo tọa độ (gom nhóm khi gần nhau), cùng bộ lọc với tìm kiếm, thẻ tóm tắt của ghim (ảnh, tên, tỉnh và loại, mô tả, "Xem chi tiết", "Mở dòng thời gian"), ghi chú số di sản có / không có vị trí, hiện quần đảo Hoàng Sa và Trường Sa thuộc Việt Nam |
| Chi tiết di sản | `/di-san/:diSan` | Ảnh đại diện có ghi công, nhãn loại / cấp / năm / tỉnh, nội dung, bảng thông tin, bản đồ nhỏ, thư viện ảnh ghi công ba phần, dòng thời gian rút gọn, nguồn |
| Dòng thời gian di sản | `/dong-thoi-gian`, `/dong-thoi-gian/:diSan` | Chưa chọn di sản: danh sách để chọn, tìm nhanh theo tên. Đã chọn: trục dọc các giai đoạn, mở giai đoạn để xem sự kiện (năm, tháng / ngày nếu có, mô tả, ảnh kèm ghi công), đổi di sản, về trang di sản |

`:diSan` là `slug` của di sản. Di sản nháp, đã ẩn, đã xóa hoặc không có đều trả 404 và hiện "Không tìm thấy di sản này" kèm lối về
tìm kiếm.

## Địa chỉ trang mang bộ lọc

Từ khóa và bộ lọc nằm trên địa chỉ nên chia sẻ được và nút Back đúng. Tìm kiếm và bản đồ dùng chung một bộ tham số:

| Tham số | Giá trị | Ví dụ |
|---|---|---|
| `tu-khoa` | 2-100 ký tự, có dấu hay không đều được | `?tu-khoa=thang+long` |
| `tinh` | mã số tỉnh trong danh mục | `tinh=20` |
| `vung` | `Bắc`, `Trung`, `Nam` | `vung=Bắc` |
| `loai` | `TANGIBLE`, `INTANGIBLE`, `NATURAL`, `MIXED`, `DOCUMENTARY` | `loai=INTANGIBLE` |
| `cap` | `UNESCO`, `NATIONAL_SPECIAL`, `NATIONAL`, `PROVINCIAL`, `NONE` | `cap=UNESCO` |
| `thoi-ky` | `PREHISTORIC`, `NORTHERN_RULE`, `INDEPENDENT_FEUDAL`, `MODERN`, `CONTEMPORARY` | `thoi-ky=MODERN` |
| `trang` | từ 2 (trang 1 không ghi) | `trang=2` |
| `chon` | `slug` của ghim đang mở trên bản đồ | `chon=quan-the-di-tich-co-do-hue` |

Giá trị lạ bị bỏ qua, không gửi lên máy chủ. Từ khóa ngoài 2-100 ký tự báo "Từ khóa không hợp lệ: phải dài 2-100 ký tự." ngay dưới ô
nhập (cùng câu với máy chủ) và không gọi API. Đổi bộ lọc thì về trang 1. Danh mục các ô lọc lấy từ `/public/filters` (thời kỳ có
nhãn của máy chủ kèm khoảng năm).

## Bản đồ

| Mục | Giá trị |
|---|---|
| Thư viện | **Leaflet 1.9.4**, giấy phép BSD-2-Clause, cùng plugin gom nhóm ghim **leaflet.markercluster 1.5.3** (MIT). Không dùng `react-leaflet` vì giấy phép Hippocratic-2.1 không phải giấy phép mã nguồn mở thông thường; React chỉ bọc Leaflet bằng một component (`src/discovery/HeritageMap.tsx`, `LocationMap.tsx`; nền bản đồ `leafletBase.ts` và CSS bản đồ nằm ở gói dùng chung `packages/dung-chung/src/map`, dùng chung với bản đồ chọn tọa độ của web quản trị) |
| Bản đồ nền | Ô bản đồ OpenStreetMap `https://tile.openstreetmap.org/{z}/{x}/{y}.png`; dữ liệu © những người đóng góp OpenStreetMap, giấy phép ODbL. Ghi công "Bản đồ nền © Những người đóng góp OpenStreetMap" (có liên kết tới trang bản quyền) và "Leaflet" luôn hiện ở góc bản đồ |
| Hoàng Sa, Trường Sa | Luôn vẽ đè lên bản đồ nền, ở bản đồ di sản lẫn bản đồ nhỏ của trang chi tiết: chấm các đảo chính, nhãn "Quần đảo Hoàng Sa (Việt Nam)", "Quần đảo Trường Sa (Việt Nam)" và "BIỂN ĐÔNG" (`packages/dung-chung/src/map/seas.ts`, có test tọa độ; bản đồ chọn tọa độ của web quản trị dùng chung). Khung nhìn mặc định `VIETNAM_BOUNDS` gồm cả hai quần đảo. Ở hai quần đảo không khoét lỗ lớp che (ô bản đồ nền ở đó ghi tên nước ngoài): lớp che phủ kín, chấm đảo và nhãn tiếng Việt vẽ lên trên |
| Chỉ hiện Việt Nam | Mọi bản đồ (bản đồ di sản, trang nhúng cho app, bản đồ nhỏ của trang chi tiết, bản đồ chọn tọa độ của web quản trị) có **lớp che** phủ kín mọi thứ ngoài đất liền và đảo ven bờ của Việt Nam, màu lấy từ token nên hợp cả chế độ sáng và tối; không thấy nước láng giềng hay tên nước ngoài trên biển (`packages/dung-chung/src/map/landMask.ts`, tắt bằng `onlyVietnam: false` của `createBaseMap`). Đường biên lấy từ **Natural Earth 1:10m**, lớp ranh giới quốc gia theo góc nhìn Việt Nam (phạm vi công cộng), đơn giản hóa và làm tròn phần nghìn độ thành `vietnamLand.ts` (khoảng 56 KB, 17 KB gzip) bằng `scripts/gen-vietnam-land.mjs`; dữ liệu đó không có các đảo rất nhỏ (Lý Sơn, Bạch Long Vĩ, Cồn Cỏ…) nên những đảo này bị che, ghim di sản ở đó vẫn hiện. Không cho thu nhỏ quá một mức dưới khung nhìn cả nước |
| Nạp | Chỉ nạp khi mở trang có bản đồ (`React.lazy`); gói khởi đầu không chứa Leaflet. Chunk bản đồ khoảng 45 KB gzip cộng 9 KB của plugin và 17 KB dữ liệu đường biên |
| Ghim | Ghim là `divIcon` do web dựng bằng màu từ token; ghim đang chọn to và đậm hơn; mỗi ghim là nút bàn phím có tên di sản; nhóm ghim ghi số di sản |
| Giới hạn | Máy chủ trả tối đa 500 ghim; quá thì nhắc thu hẹp bộ lọc. Di sản không có tọa độ (thường là phi vật thể) chỉ được đếm và có liên kết "Xem trong danh sách" |
| Lưu ý vận hành | Máy chủ ô OpenStreetMap chỉ phù hợp lượng truy cập nhỏ theo chính sách sử dụng của họ; khi triển khai thật cần máy chủ ô riêng hoặc nhà cung cấp ô có hợp đồng |

Trên điện thoại (dưới 841px) hàng lọc thu thành nút "Bộ lọc" mở ra các ô; ghi chú số di sản nằm dưới bản đồ để không che ghi công của
bản đồ nền; thẻ tóm tắt là popup tự cuộn bản đồ cho khỏi bị thanh lọc che.

## Chỉ đường tới di sản

| Mục | Giá trị |
|---|---|
| Nơi có | Mục vị trí của trang chi tiết di sản (nút "Chỉ đường" cạnh "Xem trên bản đồ"), thẻ ghim trên trang Bản đồ (mở trang chi tiết với `?chi-duong=1`, bảng mở sẵn và trang cuộn tới), trang nhúng `/nhung/chi-duong/:slug?lang=…` cho app mobile (web và app dùng chung một bảng, mã ở `src/directions/`) |
| Tính đường | Gọi **thẳng máy chủ OSRM từ trình duyệt** (mặc định máy chủ công cộng của FOSSGIS `https://routing.openstreetmap.de`, đổi bằng `VITE_ROUTING_BASE_URL`), không qua backend của dự án: vị trí của khách không tới máy chủ của Vietnam Heritage, không lưu, không vào địa chỉ trang. Hai cách đi: "Đi xe" (hồ sơ ô tô, ghi chú là ước tính cho xe máy, ô tô) và "Đi bộ". Chỉ gọi khi khách bấm, mỗi cách đi một lần cho một vị trí, hủy khi rời trang (`packages/dung-chung/src/map/route.ts`) |
| Vị trí | Bấm "Chỉ đường" mới xin quyền vị trí của trình duyệt (làm tròn 4 chữ số, khoảng 11 m). Trang nhúng không tự xin: app gửi vị trí bằng lệnh `set-position` |
| Trạng thái | Đang lấy vị trí, đang tìm đường, bị chặn quyền, không lấy được vị trí, ở ngoài khung tọa độ Việt Nam (không hỏi máy chủ), không có đường (mã `NoRoute` hoặc điểm bị nắn về đường xa hơn 3 km, ví dụ di sản ngoài biển), dịch vụ lỗi; mỗi trạng thái một câu bằng năm ngôn ngữ và luôn có nút "Mở trong Google Maps" (`maps/dir/?api=1&destination=…&travelmode=…`, thêm `origin` khi đã có vị trí) |
| Hiển thị | Tuyến vẽ lên bản đồ nhỏ ở lớp riêng (`routeLayer.ts`, trên lớp phủ mặc định, dưới nhãn biển đảo), chấm xuất phát, khớp khung theo tuyến và cho kéo, phóng; tóm tắt quãng đường, thời gian (định dạng theo ngôn ngữ bằng `Intl`); danh sách bước với câu hướng dẫn do web tự dựng cho năm ngôn ngữ (`routeInstructions.ts`, không dùng osrm-text-instructions vì gói đó gộp 31 ngôn ngữ và bản tiếng Việt dùng phương ngữ); dòng ghi công "Chỉ đường: OSRM · dữ liệu © những người đóng góp OpenStreetMap" |
| Lưu ý vận hành | Máy chủ OSRM công cộng chỉ phù hợp lượng truy cập nhỏ theo chính sách của FOSSGIS; triển khai thật cần máy chủ OSRM riêng (đặt `VITE_ROUTING_BASE_URL`) |

## Ảnh và ghi công

- Ảnh di sản lưu đường dẫn tới **tệp gốc** trên Wikimedia Commons (thường vài MB). Trang hiển thị bản thu nhỏ do chính Commons phục vụ
  (`.../commons/thumb/.../500px-<tên tệp>`, bậc 250 / 330 / 500 / 960 / 1280 / 1920 nhỏ nhất đủ độ rộng khung), lỗi thì thử ảnh gốc, vẫn
  lỗi thì hiện ô giữ chỗ (`displayImageUrl`, `Thumbnail`). Lý do: tải nhiều ảnh gốc cùng lúc bị Commons trả 429 và trình duyệt chặn ảnh
  (đã gặp khi chạy thử). Ảnh không thuộc Commons hoặc không phải jpg / png dùng nguyên đường dẫn. Nên chuyển ảnh về kho của dự án khi
  backend có kho tệp.
- Ghi công tách ba phần tác giả · giấy phép · nguồn, hiện dưới từng ảnh dạng "Ảnh: Tác giả · CC BY 4.0 · Wikimedia Commons"; thiếu phần
  nào bỏ phần đó, cả ba trống thì dùng chuỗi ghi công gộp của máy chủ. Ảnh đầu trang chủ, ảnh đại diện, ảnh trong thư viện và ảnh sự kiện
  đều có dòng này. Chân trang ghi "Nội dung di sản tham khảo từ Cục Di sản văn hóa (dsvh.gov.vn). Ảnh từ Wikimedia Commons, ghi công theo từng ảnh."
- Nguồn tham khảo tách tiêu đề theo mẫu "Tên tài liệu — Cơ quan, truy cập dd/mm/yyyy"; dòng tóm tắt "Nguồn: …" gom các cơ quan không trùng;
  chỉ đường dẫn http / https mới thành liên kết (mở tab mới, `rel="noopener noreferrer"`).
- Nội dung di sản là chữ có tiêu đề `## …`, đoạn cách nhau dòng trống, danh sách gạch đầu dòng và chữ đậm `**…**`; dựng bằng phần tử React,
  không chèn HTML thô nên thẻ HTML trong nội dung chỉ hiện là chữ.

## Khác thiết kế Figma và chỗ còn thiếu

- **Sắp xếp**: thiết kế ghi "Sắp xếp theo mới cập nhật"; máy chủ xếp cụm từ khóa khớp tên trước rồi cấp xếp hạng cao trước nên trang ghi
  "Cấp xếp hạng cao xếp trước".
- **Ô lọc thời kỳ**: dùng năm khoảng cố định của máy chủ (tiền sử, Bắc thuộc, phong kiến độc lập, cận đại, hiện đại), không phải năm
  trong chú thích của thiết kế.
- **Vòng tròn theo vùng và loại** ở trang chủ hiện biểu tượng trên nền màu thay cho ảnh vì API không có ảnh đại diện cho từng vùng, từng loại.
- **Dòng thời gian, chưa chọn di sản**: API chưa có bộ lọc "di sản có giai đoạn" (thẻ di sản không có cờ `hasTimeline`, chỉ ghim bản đồ có),
  nên danh sách chọn liệt kê mọi di sản (tối đa 100); di sản chưa có giai đoạn hiện "Di sản này chưa có dòng thời gian" kèm lối chọn di sản khác.
- **Phần giới thiệu app**: tệp cài đặt Android chưa có; đặt `VITE_ANDROID_APP_URL` khi có thì nút "Tải tệp cài đặt cho Android" và liên kết
  ở chân trang tự hiện, chưa đặt thì trang ghi rõ tệp sẽ có sau. Chân trang chưa có "Giới thiệu", "Điều khoản sử dụng" vì chưa có trang đó.
- Nút phóng to / thu nhỏ đặt ở góc dưới bên phải (thiết kế đặt trên phải) để không trùng thanh lọc nổi khi thanh lọc xuống hai hàng.

## Kiểm thử

- Test đơn vị: `filters.test.ts` (tham số địa chỉ, từ khóa 2-100 ký tự), `format.test.ts` (ghi công, tọa độ, nội dung, chữ đậm, nguồn, ảnh thu nhỏ,
  khoảng năm thời kỳ), `pagination.test.ts`, `seas.test.ts` (hai quần đảo nằm đúng khu vực và trong khung nhìn); `packages/dung-chung/src/api/discovery.test.ts`
  (đường dẫn, tham số, không gắn token, trừ tóm tắt gắn token của học sinh nếu có phiên).
- Test màn hình với API giả: `HomePage`, `SearchPage`, `MapPage` (Leaflet thay bằng khung giả), `HeritageDetailPage`, `TimelinePage`.
- Test Leaflet thật trong jsdom: `HeritageMap.test.tsx`, `LocationMap.test.tsx` (ghi công OpenStreetMap, nhãn Hoàng Sa và Trường Sa, ghim, chọn ghim mở popup, tên
  địa phương không chèn HTML).
- Trình duyệt thật: `npm run smoke -w @dsvhvn/web-hoc-tap` (48 bước, 1440 × 900 và 390 × 844) với API chạy trên **database tạm mới** đã nạp 20 di sản đợt 1 và
  xuất bản, xóa database sau khi chạy. Ảnh chụp ở `smoke-shots/` (không vào git).
