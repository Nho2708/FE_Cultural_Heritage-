// Câu thông báo chép nguyên danh mục thông báo đã chốt của dự án — cùng câu với backend (Messages.cs).
// Giao diện không tự đặt câu thông báo mới: cần câu mới thì bổ sung vào danh mục trước.
// Lời với giáo viên và quản trị viên xưng "bạn"; lời với học sinh xưng "em", cùng một câu cho cả ba cấp học.
// Tên hằng đặt theo nghĩa của câu, không theo số thứ tự trong danh mục.

/** Lý do khi thao tác bị chặn vì trường không có gói hiệu lực — cùng câu với phần kiểm gói của backend. */
export const NO_EFFECTIVE_PLAN = 'Trường chưa có gói dịch vụ còn hiệu lực.';

/** Phần sau của thanh báo gói hết hiệu lực: các thao tác bị chặn và điều vẫn chạy bình thường. */
const PLAN_BANNER_TAIL =
  'Tạm thời chưa thể tạo hoặc nhân bản bài học, dùng AI, tạo, nhân bản hoặc phát hành bài kiểm tra, thêm tài khoản ' +
  'giáo viên. Học sinh vẫn học bài và làm bài kiểm tra đã phát hành bình thường.';

export const MESSAGES = {
  /** Tìm kiếm, lọc không có kết quả. */
  noResults: 'Không tìm thấy kết quả phù hợp. Hãy bớt tiêu chí lọc hoặc thử từ khóa khác.',
  /** Trường bắt buộc bị bỏ trống. */
  required: (field: string) => `Vui lòng nhập ${field}.`,
  /** Giá trị sai định dạng hoặc vượt độ dài. */
  invalid: (field: string, rule: string) => `${field} không hợp lệ: ${rule}.`,
  /** Mật khẩu không đạt quy tắc 8-64 ký tự, có chữ hoa, chữ thường và chữ số (mọi vai trò). */
  passwordPolicy: 'Mật khẩu phải dài 8-64 ký tự, có chữ hoa, chữ thường và chữ số.',
  /** Mật khẩu mới trùng mật khẩu hiện tại hoặc mật khẩu tạm. */
  samePassword: 'Mật khẩu mới phải khác mật khẩu cũ.',
  /** Hai lần nhập mật khẩu mới không giống nhau. */
  passwordMismatch: 'Hai lần nhập mật khẩu chưa giống nhau.',
  /** Email hoặc tên đăng nhập đã có tài khoản khác dùng. */
  taken: (field: string, value: string) => `${field} "${value}" đã được sử dụng cho một tài khoản khác.`,
  /** Sai thông tin đăng nhập web quản trị, không cho biết sai ô nào. */
  invalidCredentials: 'Email, tên đăng nhập hoặc mật khẩu không đúng.',
  /** Tài khoản người lớn không đăng nhập được: tạm khóa, bị khóa, ngừng sử dụng, trường đã ngừng. */
  cannotSignIn: (reason: string) => `Tài khoản không đăng nhập được. ${reason}`.trim(),
  /** Thông báo khi tài khoản tồn tại và đã gửi liên kết đặt lại mật khẩu. */
  forgotPasswordAccepted:
    'Liên kết đặt lại mật khẩu đã được gửi tới hộp thư của bạn. Vui lòng kiểm tra hộp thư (kể cả mục thư rác/spam) trong 1-2 phút tới. Liên kết có hiệu lực 30 phút.',
  /** Không tìm thấy tài khoản theo email hoặc số điện thoại. */
  accountNotFound: 'Không tìm thấy tài khoản. Hãy kiểm tra số di động hoặc email của bạn rồi thử lại.',
  /** Liên kết đặt mật khẩu hết hạn, đã dùng hoặc đã bị thay bằng liên kết mới. */
  passwordLinkInvalid: 'Liên kết đã hết hạn hoặc không còn dùng được. Vui lòng yêu cầu gửi liên kết mới.',
  /** Đã tạo tài khoản quản trị trường hoặc giáo viên và gửi liên kết đặt mật khẩu lần đầu. */
  passwordLinkSent: (email: string) => `Đã gửi email đặt mật khẩu tới ${email}. Liên kết có hiệu lực 48 giờ.`,
  /** Thao tác thành công. */
  success: (action: string) => `${action} thành công.`,
  /** Thao tác ngoài phạm vi vai trò, ngoài trường hoặc lớp của mình. */
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
  /** Thao tác bị quy tắc chặn. */
  blocked: (action: string, reason: string) => `Không thể ${action}. ${reason}`,
  /** Hộp xác nhận trước khi xóa, ẩn, khóa, vô hiệu, đóng. */
  confirm: (action: string, objectName: string) => `Bạn có chắc muốn ${action} "${objectName}"?`,
  /** Tạo giáo viên khi trường đã đủ số giáo viên tối đa của gói. */
  teacherLimitReached: (used: number, max: number, planName: string) =>
    `Trường đã dùng ${used}/${max} tài khoản giáo viên của gói ${planName}. ` +
    'Hãy nâng cấp gói hoặc xóa tài khoản không còn dùng để thêm giáo viên.',
  /**
   * Thanh báo trường không có gói hiệu lực ở khu giáo viên và quản trị trường. Trường chưa từng có gói hiệu lực (chỉ có
   * đăng ký chờ thanh toán) thì không có ngày để điền: vế đầu dùng lý do "Trường chưa có gói dịch vụ còn hiệu lực."
   */
  noEffectivePlan: (endDate: string | null) =>
    (endDate ? `Gói dịch vụ của trường đã hết hiệu lực từ ngày ${endDate}. ` : `${NO_EFFECTIVE_PLAN} `) + PLAN_BANNER_TAIL,
  /** Phiên hết hạn, tài khoản vừa bị khóa hoặc mật khẩu vừa đổi ở thiết bị khác: hiện trên màn hình đăng nhập. */
  sessionExpired: 'Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.',
  /** Lỗi hệ thống ngoài dự kiến (kể cả lỗi mạng, phản hồi không đúng khuôn). */
  systemError: 'Đã có lỗi xảy ra. Vui lòng thử lại hoặc liên hệ quản trị viên.',

  // Học sinh (web học tập và app mobile)

  /** Sai mã học sinh hoặc mật khẩu, không cho biết sai ô nào. */
  studentInvalidCredentials: 'Mã học sinh hoặc mật khẩu chưa đúng. Em hãy kiểm tra lại phiếu đăng nhập.',
  /** Học sinh không đăng nhập được: tạm khóa, bị vô hiệu, lớp đã xóa hoặc trường đã ngừng. */
  studentCannotSignIn: (reason: string) => `Tài khoản của em tạm thời chưa đăng nhập được. ${reason}`.trim(),
  /** Dòng nhắc cố định trên màn hình đăng nhập của học sinh. */
  studentForgotPassword: 'Quên mật khẩu?',
  /** Không tìm thấy tài khoản học sinh. */
  studentAccountNotFound: 'Không tìm thấy tài khoản học sinh. Hãy kiểm tra lại mã học sinh rồi thử lại.',
  /** Đã gửi yêu cầu tới giáo viên chủ nhiệm. */
  studentPasswordResetRequested: 'Đã báo thầy cô, em chờ thầy cô đặt lại mật khẩu nhé.',
  /** Mô tả phụ cho form quên mật khẩu học sinh. */
  studentForgotPasswordSubtitle: 'Hãy nhập mã học sinh của em để báo thầy cô đặt lại mật khẩu.',
  /** Màn hình đổi mật khẩu bắt buộc: lần đầu đăng nhập hoặc sau khi giáo viên đặt lại. */
  studentMustChangePassword:
    'Em hãy đặt mật khẩu mới của riêng em để bắt đầu học. Mật khẩu cần 8-64 ký tự, có chữ hoa, chữ thường và chữ số.',
  /** Cùng màn hình đó với học sinh cấp 1: quy tắc đơn giản, chỉ cần dài 6-64 ký tự. */
  studentMustChangeSimplePassword: 'Em hãy đặt mật khẩu mới của riêng em để bắt đầu học. Mật khẩu cần 6-64 ký tự, ví dụ 6 chữ số dễ nhớ.',
  /** Mở đường dẫn bài học khi chưa đăng nhập. */
  studentSignInToOpenLesson: 'Em hãy đăng nhập để mở bài học. Đăng nhập xong, bài học sẽ tự mở.',
  /** Trang học, tiến độ khi em chưa có lượt làm bài nào. */
  studentNoAttemptsYet: 'Em chưa có bài làm nào. Em hãy nhập mã bài học thầy cô đưa để bắt đầu học.',
} as const;
