// Gói dùng chung của web quản trị, web học tập (và app mobile về sau): câu thông báo, định dạng hiển thị, kiểm tra
// hợp lệ, xử lý lỗi của biểu mẫu. Lớp gọi API ở `@dsvhvn/dung-chung/api`, phiên đăng nhập ở `/auth`, component giao
// diện web ở `/ui`, bộ giao diện theo cấp học ở `/theme`, CSS token ở `/styles/*`.

export * from './cn';
export * from './format';
export * from './forms';
export * from './messages';
export * from './validation/fields';
export * from './validation/password';
export * from './validation/studentCode';
