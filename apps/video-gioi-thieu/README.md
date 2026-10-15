# Video giới thiệu Vietnam Heritage

Dự án video dựng bằng [Remotion](https://www.remotion.dev) (React). Không triển khai, không nằm trong npm workspaces của kho; CI không cài gói này.
Video xuất ra, ảnh chụp màn hình và nhạc đều sinh lại được bằng lệnh nên **không đưa vào git** (`ra/`, `public/man-hinh/`, `public/nhac/`).

| Sản phẩm | Composition | Tệp ra (`ra/video/`) |
|---|---|---|
| Đoạn logo 2,4 giây (giữ tới 3 giây) | `logo-16x9`, `logo-1x1`, `logo-9x16` | `logo-2s4.<tỉ lệ>.1080.mp4` |
| Video cho khách du lịch, 60 giây, 16:9 | `du-khach-60s-<vi\|en\|ko\|zh\|ja>` | `du-khach-60s.<ngôn ngữ>.1080.mp4`, `.720.mp4` |
| Video cho khách du lịch, bản dọc 45 giây, 9:16 | `du-khach-45s-doc-<…>` | `du-khach-45s-doc.<ngôn ngữ>.1080.mp4`, `.720.mp4` |
| Video cho nhà trường, 90 giây, 16:9 | `nha-truong-90s` | `nha-truong-90s.vi.1080.mp4`, `.720.mp4` |
| Phụ đề WebVTT | — | `ra/phu-de/*.vtt` (bản ngang chép sang `apps/web-hoc-tap/public/video/`) |
| Ảnh bìa không chữ (1280×720, 720×1280) | khung huy hiệu của `logo-16x9`, `logo-9x16` | `anh-bia.<cỡ>.jpeg` |
| Video quảng cáo cho khách du lịch, bản dọc 30 giây, 9:16, không lời đọc | `quang-cao-30s-doc-en` | `quang-cao-30s-doc.en.1080.mp4` (H.264 8 Mbps, BT.709, âm thanh -14 LUFS) |

Tên tệp 720p khớp với khung video của web học tập (`apps/web-hoc-tap/src/intro/IntroVideo.tsx`: `<tên>.<ngôn ngữ>.720.mp4`, phụ đề `/video/<tên>.<ngôn ngữ>.vtt`).

## Nguồn chữ, hình và âm thanh

- Chữ trên hình và phụ đề lấy từ `kich-ban/du-khach.json` và `kich-ban/nha-truong.json`. Bản Hàn, Trung, Nhật là bản dịch máy, cần người biết tiếng đọc lại trước khi đăng rộng rãi.
- Logo: hai lớp ảnh (`public/logo/lop-cong.png`, `lop-chu.png`) tách từ logo của nhóm (`doc/design/logo/` ngoài kho), cùng nhịp với huy hiệu chuyển động trên web.
- Màn hình sản phẩm là **ảnh chụp thật** của bản demo (web học tập, web quản trị), chụp bằng Playwright theo kịch bản. Dữ liệu trường, lớp, học sinh là dữ liệu mẫu của CSDL demo.
- Nhạc nền do nhóm tự tạo bằng code (`scripts/tao-nhac.py`, thang ngũ cung gảy như đàn tranh), không dùng nhạc của người khác.
- Lời đọc tiếng Việt của video nhà trường là giọng tổng hợp, tạo trên máy bằng [Piper](https://github.com/rhasspy/piper) với giọng `vi_VN-vais1000-medium` (dữ liệu VAIS-1000, CC BY 4.0; ghi công ở thẻ kết). Câu đọc ở `loiDoc` của `kich-ban/nha-truong.json`, từ tiếng Anh viết theo cách đọc. Nhạc nền tự hạ xuống khi có lời. Muốn dùng giọng người thật: thu từng câu, lưu đè `public/giong/nha-truong/<id cảnh>.wav`, chạy `python scripts/tao-giong-doc.py --chi-do` rồi dựng lại.
- Phông Be Vietnam Pro, Playfair Display, Noto Sans KR/SC/JP (giấy phép SIL OFL) nạp qua `@remotion/google-fonts`.
- Giấy phép Remotion: bản miễn phí dùng được cho cá nhân, tổ chức phi lợi nhuận và công ty đến 3 người (`node_modules/remotion/LICENSE.md`); nhóm sinh viên làm đồ án thuộc diện này.

## Dựng lại

Cần Node 22+, Python 3 có Pillow và numpy, Microsoft Edge (để chụp màn hình), bản demo đang chạy (web học tập `http://localhost:8082`, web quản trị `http://localhost:8081`).

```powershell
cd apps/video-gioi-thieu
npm ci
node scripts/quay-du-khach.mjs            # ảnh màn hình cho khách, 5 ngôn ngữ (mỗi ngôn ngữ 6–10 phút); --lang vi để chụp một ngôn ngữ
node scripts/quay-nha-truong.mjs          # ảnh web quản trị và web học tập; tài khoản đọc từ scripts/tai-khoan.local.json (không đưa vào git)
python scripts/thu-nho-anh.py             # cắt khung "Gợi ý cho bạn", thu ảnh khách về rộng 600 px
python scripts/tao-nhac.py                # nhạc nền
python scripts/tao-giong-doc.py          # lời đọc video nhà trường (cần: pip install piper-tts; tự tải giọng vào .cache/piper)
node scripts/liet-ke-tai-nguyen.mjs       # danh sách ảnh có sẵn, toạ độ cuộn và vùng phóng
node scripts/tao-phu-de.mjs               # phụ đề .vtt
node scripts/dung-video.mjs               # dựng tất cả (khoảng 15 phút trên máy 12 nhân); hoặc chỉ một số: node scripts/dung-video.mjs du-khach-60s-en
npx remotion studio src/index.ts          # xem và chỉnh trong trình duyệt
```

## Video quảng cáo 30 giây

Mã nguồn ở `src/quang-cao/`, kịch bản ở `kich-ban/quang-cao/`:

- `canh.json`: thứ tự cảnh và độ dài theo phách (120 phách mỗi phút, mọi điểm cắt rơi đúng phách). `src/quang-cao/nhip.ts` (mốc chuyển động trong từng cảnh, hai đường cong dùng chung) và script nhạc cùng đọc tệp này, nên đổi độ dài cảnh thì chạy lại script nhạc.
- `en.json`: toàn bộ chữ trên hình của bản tiếng Anh (câu theo cảnh, nhãn giao diện, thẻ kết, địa chỉ trong mã QR) và `moTaBaiDang` là phần ghi công đặt ở mô tả bài đăng (mô hình 3D CC BY 4.0, OpenStreetMap, ảnh, nhạc). Làm bản ngôn ngữ khác: thêm tệp `<mã>.json` cùng cấu trúc, đăng ký trong `src/quang-cao/chuoi.ts` và thêm composition. Kiểm chữ (mỗi câu tối đa 7 từ, không dấu chấm cuối, tổng dưới 45 từ): `node scripts/kiem-chu-quang-cao.mjs`.
- `anh.json`: ảnh Hội An trên Wikimedia Commons, chỉ nhận giấy phép CC0 hoặc phạm vi công cộng.

Tài nguyên không đưa vào git, tạo lại bằng:

```powershell
python scripts/tai-anh-di-tich.py         # ảnh di tích -> public/anh-di-tich/ (kiểm giấy phép khi tải)
python scripts/tai-ban-do.py              # dữ liệu bản đồ OpenStreetMap quanh phố cổ -> public/ban-do/hoi-an.json
python scripts/tao-nhac-quang-cao.py      # nhạc 30 giây theo canh.json, chuẩn hóa -14 LUFS -> public/nhac/quang-cao-30s.wav
node scripts/dung-video.mjs quang-cao-30s-doc-en
```

Mô hình 3D là tệp GLB nhà cổ Hội An mà bản demo đang dùng (bản nén cho web của mô hình "Hoi An house" trên Sketchfab, CC BY 4.0), chép vào `public/mo-hinh/nha-hoi-an.glb`. Mô hình vẽ bằng three.js qua `@remotion/three`; khi dựng phải bật WebGL bằng GPU (`--gl=angle`, script dựng đã đặt sẵn).

## Giới hạn hiện tại

- CSDL demo chưa có bản dịch thật cho nội dung di sản (tên và mô tả ở tiếng Anh, Hàn, Trung, Nhật đang là chữ giữ chỗ dạng "[en] …"). Bản video tiếng Anh, Hàn, Trung, Nhật dùng ảnh chụp đúng ngôn ngữ cho các màn hình giao diện (chọn ngôn ngữ, Trang chủ, mở khóa tóm tắt, 3D, nguồn) và ảnh tiếng Việt cho các màn hình nặng nội dung (Gần bạn, bản đồ, chi tiết, dòng thời gian, lịch sử); thẻ kết ghi rõ điều này. Có bản dịch thật thì chụp lại và bỏ danh sách `NOI_DUNG_VI` trong `src/DuKhach.tsx`.
- Lời đọc video nhà trường là giọng máy; nghe chưa tự nhiên bằng người đọc. Video vẫn xem hiểu được khi tắt tiếng nhờ chữ trên hình.
- Phiếu đăng nhập trong video nhà trường là màn hình thật nhưng mật khẩu tạm là dữ liệu mẫu (script chặn yêu cầu đặt lại mật khẩu ở trình duyệt để không đổi dữ liệu demo).
- Chưa có vòng lặp 8 giây "app trong tay".

## Đưa video lên web

Video 720p đặt trên Cloudinary (kho lưu tệp mà backend đã dùng), thư mục `gioi-thieu`:

```powershell
$env:CLOUDINARY_CLOUD_NAME = '...'; $env:CLOUDINARY_API_KEY = '...'; $env:CLOUDINARY_API_SECRET = '...'   # lấy từ User Secrets backend (Storage:Cloudinary:*), không ghi vào tệp
node scripts/tai-len-cloudinary.mjs        # mọi tệp ra/video/*.720.mp4; ghi đè bản cũ cùng tên
```

Web học tập đọc địa chỉ gốc từ `VITE_INTRO_VIDEO_BASE_URL` (CD lấy từ biến repo `DEMO_INTRO_VIDEO_BASE_URL`,
hiện là `https://res.cloudinary.com/mo8vwbyg/video/upload/gioi-thieu`). Web xin đuôi `.webm` trước: Cloudinary tự chuyển từ bản MP4 nên không cần dựng WebM riêng.
