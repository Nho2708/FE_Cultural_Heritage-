# Gói và thanh toán VNPay (giao diện)

Phần giao diện của luồng bán **gói dịch vụ cho trường**. Backend: [`BE_Cultural_Heritage-/docs/goi-thanh-toan.md`](../../BE_Cultural_Heritage-/docs/goi-thanh-toan.md). Chỉ có ở **web quản trị** (chỉ tiếng Việt); web học tập và học sinh không đụng tới luồng này.

| Ai | Màn hình | Đường dẫn |
|---|---|---|
| Quản trị hệ thống | **Gói dịch vụ** | `/quan-tri/goi` |
| Quản trị trường | **Trường và gói** (ba tab: Thông tin trường, Gói và hạn mức, Hóa đơn và giao dịch) | `/truong/thong-tin` (`?tab=goi-va-han-muc`, `?tab=hoa-don`) |
| Quản trị trường | **Chọn gói và thanh toán** | `/truong/chon-goi` (`?goi=` chọn sẵn một gói) |
| Quản trị trường | **Kết quả thanh toán** | `/truong/ket-qua-thanh-toan` (`?payment=` mã giao dịch, hoặc `?error=invalid`) |

Gói chỉ có hiệu lực khi **VNPay báo thanh toán thành công về backend** (IPN). Giao diện không bao giờ tự kích hoạt gói: trang Kết quả thanh toán **chỉ đọc** trạng thái do IPN ghi nhận.

## 1. Gói dịch vụ (quản trị hệ thống)

- Bảng: tên, giá, thời hạn (ngày), số giáo viên tối đa, lượt AI mỗi kỳ, **đang bán** (công tắc), số trường đang dùng. Giá theo đồng, dấu chấm ngăn nhóm nghìn (`1.990.000 ₫`).
- **Tạo gói** và **sửa gói** ở khung bên phải (bấm tên gói để sửa). Kiểm tra phía giao diện cùng luật và cùng câu với backend (`packages/dung-chung/src/billing.ts`): tên bắt buộc tối đa 100 ký tự; giá nguyên đồng 0 đến 999.999.999, **gói trả phí phải lớn hơn 0**; thời hạn 1–730 ngày; giáo viên 1–10.000; lượt AI 0–1.000.000. Ô giá nhận `1990000` hoặc `1.990.000`. Lỗi theo trường của backend (tên trùng 409) hiện ngay dưới ô.
- **Gói Miễn phí** (giá 0 duy nhất): tên và giá chỉ đọc, công tắc bán khóa, có biểu tượng khóa. **Không có thao tác xóa gói.**
- **Tắt bán** trên bảng phải qua hộp xác nhận chung (trường đang dùng giữ gói tới hết hạn, trường khác không mua mới hay gia hạn được); **bật bán lại** không cần xác nhận. Trong khung sửa, công tắc "Đang bán" áp cùng lần lưu (lưu thông tin trước, đổi trạng thái bán sau).
- Đổi giá chỉ áp cho hóa đơn tạo sau đó (có ghi chú trong khung).

## 2. Trường và gói (quản trị trường)

Tab nằm trên URL (`?tab=`), mặc định Thông tin trường.

**Gói và hạn mức**
- Có gói hiệu lực: tên gói, nhãn trạng thái, giá và hạn mức, ngày bắt đầu, ngày hết hạn, số ngày còn lại, thanh giáo viên `x / tối đa` và thanh lượt AI trong kỳ (kèm khoảng ngày của kỳ), ba dòng giải thích gia hạn, nâng cấp, hủy gói.
- Nút theo trạng thái do backend trả: **Gia hạn** (tới Chọn gói với gói hiện tại chọn sẵn), **Nâng cấp**, **Hủy gói**. Gói Miễn phí chỉ có Nâng cấp. Khóa **Gia hạn** khi đã có gói gia hạn chờ bắt đầu (kèm dòng báo ngày bắt đầu); khóa **Gia hạn** và **Nâng cấp** khi đang có yêu cầu mua chưa thanh toán.
- **Hủy gói** mở hộp xác nhận với **câu của backend** (`cancelConfirmation`): gói kết thúc ngay, không hoàn tiền, các việc bị khóa. Gói gia hạn đã trả không hủy được, nên khi có gói gia hạn chờ thì không có nút Hủy gói.
- Không có gói hiệu lực: thẻ **Trường chưa có gói hiệu lực** với **Mua gói** và **Kích hoạt gói Miễn phí** (chỉ khi backend cho phép; có hộp xác nhận, kích hoạt ngay, không qua VNPay, không hóa đơn) và bốn ô quyền lợi còn lại (giáo viên hiện có, lượt AI không dùng được, bài học và bài kiểm tra mới tạm khóa, học sinh vẫn học bình thường).
- **Yêu cầu mua chưa thanh toán** (mỗi trường tối đa một): thẻ hiện gói, số hóa đơn, số tiền, hạn thanh toán; **Thanh toán** chuyển sang VNPay, **Hủy yêu cầu** (xác nhận; hóa đơn bị hủy).
- Thanh báo gói hết hiệu lực ở đầu mọi màn của khu có liên kết **Mua gói**. Gói bị hủy không ghi "hết hiệu lực từ ngày …" vì ngày hết hạn trên đăng ký là ngày dự kiến ban đầu, không phải ngày gói kết thúc.
- Chưa có màn lịch sử gói: backend chưa có API liệt kê đăng ký cũ.

**Hóa đơn và giao dịch**
- Bảng mới nhất trước: số hóa đơn, nội dung, số tiền, trạng thái, ngày xuất, hạn; phân trang. **Thanh toán** chỉ hiện với hóa đơn còn thanh toán được; **Xem giao dịch** mở dòng, tải các giao dịch (mã giao dịch VNPay, thời điểm, số tiền, trạng thái Đang chờ, Thành công, Thất bại, Đã hoàn tiền).
- Ghi chú: hóa đơn là biên nhận nội bộ, không phải hóa đơn giá trị gia tăng; hóa đơn chưa trả quá hạn thì tự hủy.

## 3. Chọn gói và thanh toán

1. Thẻ các gói đang bán (không gồm gói Miễn phí): tên, giá, thời hạn, số giáo viên, lượt AI, "Không giới hạn số học sinh". Đánh dấu **Gói hiện tại**. Gói backend báo không mua được hiện **lý do của backend** và không chọn được. Mỗi thẻ là một ô chọn thật (bàn phím và trình đọc màn hình dùng được).
2. Chọn gói thì gọi báo giá và hiện khối **Xác nhận thanh toán**: loại thao tác (**hệ thống tự phân loại**: Mua gói, Gia hạn, Nâng cấp), gói, số tiền, ngày hiệu lực dự kiến (gia hạn: khoảng ngày bắt đầu sau khi gói hiện tại hết; còn lại "Ngay khi thanh toán thành công"), lưu ý (nâng cấp không hoàn phần chưa dùng và gói hiện tại kết thúc khi gói mới có hiệu lực) và **cảnh báo vượt hạn mức giáo viên** của backend nếu có (không chặn thanh toán).
3. **Thanh toán qua VNPay** mở hộp xác nhận với câu của backend ("Trường sẽ thanh toán … đồng cho gói … qua VNPay. … Tiếp tục?"). **Tiếp tục** tạo yêu cầu mua, hóa đơn và giao dịch rồi chuyển trình duyệt sang địa chỉ VNPay mà backend trả. Địa chỉ chỉ được mở khi là `http` hoặc `https` hợp lệ (`src/lib/gateway.ts`). Lỗi (đã có yêu cầu chưa trả 422, cổng chưa cấu hình 503…) hiện bằng câu của backend, hộp xác nhận đóng.
4. Ghi chú **môi trường thử VNPay** ở đầu màn hình, bật mặc định, tắt bằng `VITE_VNPAY_SANDBOX_NOTE=false` khi dùng cổng thật.

## 4. Kết quả thanh toán

VNPay đưa trình duyệt về backend, backend kiểm chữ ký rồi chuyển (302) sang trang này. Trang chỉ gọi `GET /org/payments/{id}`:

| Kết quả | Hiển thị |
|---|---|
| **Đã thanh toán** | Câu thành công của backend (gói, ngày hiệu lực), số hóa đơn, nội dung, số tiền, mã giao dịch VNPay, thời gian thanh toán; **Xem gói và hóa đơn** (tab Gói và hạn mức) |
| **Chưa thanh toán** (thất bại hoặc hủy) | Câu của backend; **Thanh toán lại** nếu hóa đơn còn hạn (tạo giao dịch mới), nếu không thì **Chọn gói**; **Xem gói và hóa đơn** (tab Hóa đơn) |
| **Đang xử lý** (chưa nhận IPN) | Vòng quay, "Đã kiểm tra N lần, lần tiếp theo sau 5 giây."; **tự kiểm tra lại mỗi 5 giây tối đa 24 lần** rồi dừng và hiện **Kiểm tra lại**; có kết quả cuối thì dừng và tự đổi giao diện |
| Liên kết sai (`?error=invalid`, thiếu hoặc sai `?payment=`) | Câu "Không thể xem kết quả thanh toán. Liên kết trả về từ VNPay không hợp lệ…", không gọi API giao dịch |

Khi có kết quả cuối, dữ liệu trường (`/org`, tab gói, hóa đơn) được làm mới để thanh báo gói và hạn mức giáo viên đúng ngay. Giao dịch của trường khác trả 404 và hiện lỗi của backend.

## 5. Tệp chính

| Tệp | Nội dung |
|---|---|
| `packages/dung-chung/src/api/billing.ts` | Kiểu dữ liệu trùng DTO của backend |
| `packages/dung-chung/src/billing.ts` | Nhãn tiếng Việt, định dạng và đọc tiền, kiểm tra biểu mẫu gói |
| `apps/web-quan-tri/src/pages/admin/PlansPage.tsx` | Gói dịch vụ |
| `apps/web-quan-tri/src/pages/school/{SchoolInfoPage,PlanPurchasePage,PaymentResultPage}.tsx` | Trường và gói, Chọn gói và thanh toán, Kết quả thanh toán |
| `apps/web-quan-tri/src/components/billing/` | Tab Gói và hạn mức, tab Hóa đơn và giao dịch, công tắc bán, thanh hạn mức, hook thanh toán một hóa đơn |
| `apps/web-quan-tri/src/lib/gateway.ts` | Chuyển trình duyệt sang cổng thanh toán (thay được khi kiểm thử) |
| `apps/web-quan-tri/scripts/smoke-goi.mjs` | Kiểm thử trình duyệt thật (`npm run smoke:goi -w @dsvhvn/web-quan-tri`) |

## 6. Điều chưa làm hoặc cần biết

- Chưa thử với **VNPay sandbox thật** (chưa có khóa cửa hàng và địa chỉ IPN công khai). Kiểm thử trình duyệt thay trang VNPay bằng trang giả và tự ký IPN, lời trả về bằng khóa thử, đúng thuật toán của backend (xem `docs/kiem-thu-trinh-duyet.md`).
- Quản trị hệ thống chưa có màn xem hóa đơn của mọi trường (backend đã có `GET /admin/invoices`, ngoài phạm vi màn hình đã thiết kế).
- Chưa có lịch sử gói (bảng "Lịch sử gói" trong bản thiết kế) vì backend chưa có API.
- Backend giữ nguyên ngày hết hạn dự kiến khi hủy gói trả phí; giao diện chỉ ghi "đã bị hủy", không dùng ngày đó làm ngày kết thúc.
