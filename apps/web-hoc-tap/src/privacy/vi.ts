import type { PrivacyPolicy } from './types';

// Bản gốc tiếng Việt của Chính sách quyền riêng tư. Mọi câu phải đúng với cách hệ thống đang chạy (thời hạn lưu, dữ liệu gửi đi,
// nhà cung cấp); đổi hành vi của hệ thống thì sửa bản này rồi sửa bốn bản dịch và ngày cập nhật trong index.ts.

export const vi: PrivacyPolicy = {
  title: 'Chính sách quyền riêng tư',
  description:
    'DiViet thu thập dữ liệu nào, dùng vào việc gì, chia sẻ với ai, giữ trong bao lâu và bạn có những quyền gì với dữ liệu của mình.',
  updatedLabel: 'Cập nhật lần cuối',
  intro: [
    'DiViet là nền tảng giúp nhà trường và giáo viên tạo bài học, bài kiểm tra về di sản Việt Nam, đồng thời cho mọi người khám phá di sản. Chính sách này giải thích DiViet thu thập dữ liệu nào, dùng vào việc gì, chia sẻ với ai, giữ trong bao lâu và bạn có những quyền gì với dữ liệu của mình.',
    'Chính sách áp dụng cho web học tập https://diviet.id.vn, web quản trị https://quantri.diviet.id.vn và ứng dụng DiViet trên Android.',
  ],
  contentsLabel: 'Nội dung',
  sections: [
    {
      id: 'ben-chiu-trach-nhiem',
      heading: '1. Ai chịu trách nhiệm về dữ liệu',
      body: [
        'DiViet do nhóm phát triển DiViet, một nhóm sinh viên thực hiện đồ án tốt nghiệp, xây dựng và vận hành. Nhóm là bên quyết định mục đích và cách xử lý dữ liệu cá nhân nêu trong chính sách này.',
        'Mọi câu hỏi hoặc yêu cầu về dữ liệu cá nhân, vui lòng gửi tới vietnamheritage.id@gmail.com.',
      ],
    },
    {
      id: 'du-lieu-thu-thap',
      heading: '2. Dữ liệu chúng tôi thu thập',
      body: [
        'Dữ liệu khác nhau tùy bạn dùng DiViet với tư cách nào:',
        [
          'Khách tham quan (không cần tài khoản): một mã thiết bị ẩn danh do trình duyệt hoặc ứng dụng tạo ngẫu nhiên; loại thiết bị (web, Android, iOS); ngôn ngữ đang dùng; bạn có bật "Gần bạn" hay không; lịch sử tìm kiếm, xem, nghe thuyết minh và xem mô hình 3D; các lượt mở khóa tóm tắt bằng quảng cáo. Chúng tôi không hỏi tên, email hay số điện thoại của khách và không ghép mã thiết bị với tài khoản học sinh.',
          'Học sinh: tài khoản do giáo viên hoặc nhà trường tạo, gồm mã học sinh (dùng làm tên đăng nhập), họ tên, lớp, cấp học và trường; mật khẩu chỉ lưu ở dạng đã băm. Khi học, hệ thống lưu bài làm, câu trả lời, điểm, tiến độ và thời điểm đăng nhập gần nhất. Học sinh không phải cung cấp email hay số điện thoại.',
          'Giáo viên, quản trị trường và quản trị hệ thống: họ tên, email, tên đăng nhập, trường; số điện thoại và ảnh đại diện nếu bạn tự thêm; bài học, câu hỏi và nội dung bạn soạn; nhật ký các thao tác quan trọng (ví dụ tạo tài khoản, đặt lại mật khẩu, thanh toán) kèm địa chỉ IP.',
          'Nhà trường: tên, địa chỉ, số điện thoại và email của trường; gói dịch vụ đã mua, hóa đơn và kết quả giao dịch do VNPay trả về (mã giao dịch, số tiền, trạng thái). DiViet không nhận và không lưu số thẻ hay thông tin tài khoản ngân hàng.',
          'Biểu mẫu liên hệ trên trang Dành cho nhà trường: tên trường, tỉnh, người liên hệ, chức vụ, email, số điện thoại và lời nhắn bạn nhập. Thông tin này được gửi qua email tới nhóm phát triển để trả lời bạn, không lưu trong cơ sở dữ liệu của DiViet.',
          'Vị trí: chỉ khi bạn bật "Gần bạn" hoặc dùng Chỉ đường và cho phép trình duyệt hay ứng dụng dùng vị trí. Với "Gần bạn", tọa độ được làm tròn còn khoảng 110 m, chỉ dùng để tính khoảng cách tới các di sản rồi bỏ đi, không lưu. Khi chỉ đường, vị trí đi thẳng từ thiết bị của bạn tới dịch vụ tìm đường (mục 5), không qua máy chủ của DiViet.',
          'Dữ liệu kỹ thuật: như mọi trang web, máy chủ ghi nhật ký truy cập gồm địa chỉ IP, thời điểm, đường dẫn được yêu cầu và loại trình duyệt, để vận hành, tìm lỗi và chống lạm dụng.',
        ],
      ],
    },
    {
      id: 'muc-dich',
      heading: '3. Chúng tôi dùng dữ liệu để làm gì',
      body: [
        [
          'Cung cấp các chức năng: đăng nhập, học bài, làm và chấm bài kiểm tra, thống kê tiến độ cho giáo viên, lịch sử và gợi ý di sản cho khách.',
          'Gửi email cần thiết cho tài khoản của người lớn: đặt mật khẩu lần đầu, quên mật khẩu, trả lời liên hệ của nhà trường.',
          'Xử lý việc nhà trường mua gói dịch vụ.',
          'Mở khóa tóm tắt và nghe thuyết minh sau khi Google xác nhận khách đã xem hết quảng cáo.',
          'Giữ an toàn cho hệ thống: phân quyền, chống đoán mật khẩu, chống lạm dụng, truy vết sự cố.',
          'Thống kê tổng hợp không gắn với cá nhân (ví dụ số lượt xem một di sản) để cải thiện nội dung.',
        ],
        'Chúng tôi không bán dữ liệu cá nhân, không dùng dữ liệu của học sinh cho quảng cáo và không lập hồ sơ quảng cáo về học sinh.',
      ],
    },
    {
      id: 'quang-cao',
      heading: '4. Quảng cáo',
      body: [
        'Học sinh đã đăng nhập không bao giờ thấy quảng cáo. Khách tham quan có thể tự chọn xem một quảng cáo ngắn của Google để mở tóm tắt và nghe thuyết minh của một di sản trong 24 giờ; mọi nội dung khác đều miễn phí, không cần xem quảng cáo.',
        [
          'Trên ứng dụng Android, quảng cáo do Google AdMob cung cấp. Google có thể dùng mã quảng cáo và thông tin của thiết bị để phân phối, đo lường quảng cáo và chống gian lận. Nội dung quảng cáo được giới hạn ở mức phù hợp với mọi lứa tuổi. Người dùng ở Liên minh châu Âu và Vương quốc Anh được hỏi ý kiến đồng ý trước. Bạn có thể đặt lại hoặc xóa mã quảng cáo trong phần Cài đặt của Android.',
          'Trên web, mã quảng cáo của Google (Google Ad Manager) chỉ được tải khi bạn bấm xem quảng cáo, và DiViet yêu cầu quảng cáo không cá nhân hóa.',
          'Để mở khóa đúng thiết bị, DiViet gửi cho Google mã thiết bị ẩn danh và mã di sản; Google gửi lại xác nhận bạn đã xem hết. DiViet không nhận mã quảng cáo của thiết bị và không lưu nội dung quảng cáo.',
        ],
        'Cách Google dùng dữ liệu khi bạn dùng trang web hoặc ứng dụng của đối tác: https://policies.google.com/technologies/partner-sites',
      ],
    },
    {
      id: 'chia-se',
      heading: '5. Chia sẻ dữ liệu với bên thứ ba',
      body: [
        'Chúng tôi chỉ chia sẻ dữ liệu với các nhà cung cấp cần thiết để DiViet hoạt động:',
        [
          'Google Cloud: máy chủ, cơ sở dữ liệu và bản sao lưu, đặt tại khu vực Singapore.',
          'Google AdMob và Google Ad Manager: quảng cáo cho khách tham quan (mục 4).',
          'Google Gemini: dịch vụ AI dùng để dịch, tóm tắt nội dung di sản và giúp giáo viên soạn bài, tạo câu hỏi. Chỉ nội dung di sản, nội dung bài học và yêu cầu soạn bài được gửi đi; không gửi tên hay bài làm của học sinh. Theo điều khoản của dịch vụ này, Google có thể dùng nội dung được gửi để cải thiện sản phẩm của Google.',
          'Gmail của Google: gửi email của hệ thống.',
          'VNPay: xử lý thanh toán khi nhà trường mua gói; thông tin thanh toán được nhập trực tiếp trên trang của VNPay.',
          'OpenStreetMap: bản đồ (tile.openstreetmap.org, tile.openstreetmap.de) và tìm đường (routing.openstreetmap.de). Thiết bị của bạn tải bản đồ trực tiếp từ các máy chủ này; khi bạn chỉ đường, vị trí của bạn và vị trí di sản được gửi tới dịch vụ tìm đường. Nút mở Google Maps chuyển hai vị trí đó sang Google Maps.',
          'Wikimedia Commons, Google Fonts và Cloudinary: ảnh di sản, phông chữ và video giới thiệu được tải trực tiếp từ các dịch vụ này, nên họ nhận được địa chỉ IP và thông tin trình duyệt của bạn.',
        ],
        'Vì máy chủ đặt tại Singapore và nhiều nhà cung cấp ở nước ngoài, dữ liệu của bạn có thể được lưu trữ và xử lý ngoài Việt Nam. Chúng tôi cũng có thể cung cấp dữ liệu khi cơ quan nhà nước có thẩm quyền yêu cầu theo quy định của pháp luật.',
      ],
    },
    {
      id: 'thoi-gian-luu',
      heading: '6. Thời gian lưu giữ',
      body: [
        [
          'Lịch sử của khách: tối đa 90 ngày và 500 lượt gần nhất cho mỗi thiết bị; quá hạn thì tự động xóa hẳn. Bạn có thể xóa từng mục hoặc xóa hết bất cứ lúc nào trong mục Lịch sử của tôi.',
          'Lượt mở khóa bằng quảng cáo: 12 tháng, sau đó tự động xóa hẳn.',
          'Vị trí dùng cho "Gần bạn": không lưu.',
          'Tài khoản, bài học và kết quả học tập: trong thời gian nhà trường còn dùng DiViet, hoặc tới khi có yêu cầu xóa (mục 8).',
          'Liên kết đặt mật khẩu gửi qua email: hết hạn sau 48 giờ (tài khoản mới) hoặc 30 phút (quên mật khẩu), chỉ lưu ở dạng đã băm.',
          'Bản sao lưu cơ sở dữ liệu: tạo hằng đêm và tự xóa sau 30 ngày.',
          'Nhật ký truy cập của máy chủ: chỉ giữ trong thời gian cần cho vận hành và bảo mật.',
          'Hóa đơn và giao dịch thanh toán: theo thời hạn mà pháp luật về kế toán, thuế yêu cầu.',
        ],
      ],
    },
    {
      id: 'bao-mat',
      heading: '7. Bảo mật',
      body: [
        'Mọi kết nối tới DiViet đều được mã hóa bằng HTTPS. Mật khẩu được băm (PBKDF2 có muối) nên không ai, kể cả nhóm phát triển, đọc được mật khẩu gốc. Quyền truy cập chia theo vai trò: giáo viên chỉ thấy học sinh trong lớp mình, quản trị trường chỉ thấy dữ liệu của trường mình. Trên web học tập, phiên đăng nhập của học sinh tự mất khi đóng thẻ trình duyệt vì học sinh hay dùng chung máy của trường.',
        'Không hệ thống nào an toàn tuyệt đối. Nếu xảy ra sự cố lộ lọt dữ liệu, chúng tôi sẽ thông báo cho nhà trường, người dùng bị ảnh hưởng và cơ quan có thẩm quyền theo quy định của pháp luật.',
      ],
    },
    {
      id: 'quyen-cua-ban',
      heading: '8. Quyền của bạn',
      body: [
        'Theo pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền được biết về việc xử lý dữ liệu của mình, đồng ý hoặc rút lại sự đồng ý, xem, chỉnh sửa, yêu cầu xóa, hạn chế xử lý dữ liệu và khiếu nại. Cách thực hiện:',
        [
          'Khách tham quan: xóa lịch sử trong mục Lịch sử của tôi; tắt "Gần bạn" hoặc tắt quyền vị trí; xóa dữ liệu trang web hoặc dữ liệu ứng dụng để bắt đầu lại với một mã thiết bị mới.',
          'Học sinh: xem thông tin trong mục Hồ sơ của em; nhờ giáo viên sửa thông tin, đặt lại mật khẩu hoặc xóa tài khoản.',
          'Giáo viên và quản trị trường: tự sửa hồ sơ trong web quản trị; quản trị trường quản lý tài khoản giáo viên của trường.',
          'Mọi người dùng: gửi yêu cầu tới vietnamheritage.id@gmail.com. Để bảo vệ bạn, chúng tôi có thể cần xác minh bạn là chủ tài khoản, ví dụ qua email của tài khoản hoặc qua nhà trường.',
        ],
        'Khi một tài khoản bị xóa theo yêu cầu, chúng tôi xóa hoặc ẩn danh dữ liệu cá nhân đi kèm, trừ dữ liệu mà pháp luật buộc phải giữ; bản sao trong các bản sao lưu tự mất sau 30 ngày.',
      ],
    },
    {
      id: 'hoc-sinh-va-tre-em',
      heading: '9. Học sinh và trẻ em',
      body: [
        'Nhiều học sinh dùng DiViet là trẻ em. Vì vậy:',
        [
          'Học sinh không tự tạo tài khoản; chỉ giáo viên hoặc nhà trường tạo tài khoản cho học sinh. Nhà trường chịu trách nhiệm có được sự đồng ý của cha mẹ hoặc người giám hộ, và của học sinh khi pháp luật yêu cầu, trước khi tạo tài khoản, theo Luật Bảo vệ dữ liệu cá nhân và các văn bản hướng dẫn.',
          'Chúng tôi chỉ thu thập dữ liệu học sinh cần cho việc học; không hỏi email, số điện thoại hay địa chỉ nhà của học sinh.',
          'Học sinh đã đăng nhập không thấy quảng cáo, và dữ liệu của học sinh không được dùng cho quảng cáo.',
          'Cha mẹ hoặc người giám hộ có thể đề nghị xem, sửa hoặc xóa dữ liệu của con thông qua giáo viên, nhà trường hoặc email ở mục 11.',
        ],
      ],
    },
    {
      id: 'thay-doi',
      heading: '10. Thay đổi chính sách',
      body: [
        'Khi chính sách thay đổi, chúng tôi cập nhật trang này và ngày "Cập nhật lần cuối" ở đầu trang. Thay đổi quan trọng sẽ được nêu rõ ở đầu trang trong một thời gian.',
      ],
    },
    {
      id: 'lien-he',
      heading: '11. Liên hệ',
      body: ['Nhóm phát triển DiViet. Email: vietnamheritage.id@gmail.com. Trang web: https://diviet.id.vn'],
    },
  ],
};
