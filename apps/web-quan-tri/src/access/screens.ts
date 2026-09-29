// Bảng màn hình và ma trận phân quyền của web quản trị (36 màn hình: xác thực và tài khoản, khu giáo viên, khu quản
// trị trường, khu quản trị hệ thống; 10 hộp thoại không có URL). Đây là nguồn duy nhất cho route guard, thanh bên và
// menu tài khoản. Tên màn hình bằng lời, khóa đặt theo nghĩa. Học sinh không dùng web quản trị (web học tập riêng).
// Ẩn menu ở giao diện chỉ để tiện dùng; backend tự kiểm vai trò ở mọi endpoint.

import type { StaffRole } from '@dsvhvn/dung-chung/api';

/** Khách = chưa đăng nhập. */
export type Actor = 'Guest' | StaffRole;

/** Khu vực: xác thực và tài khoản, giáo viên, quản trị trường, quản trị hệ thống. */
export type Area = 'account' | 'teacher' | 'school' | 'admin';

export interface Screen {
  key: string;
  name: string;
  area: Area;
  /** Vai trò được mở màn hình (cột X của ma trận phân quyền). */
  actors: readonly Actor[];
  /** Đường dẫn trong router; null với hộp thoại (không có URL riêng). */
  path: string | null;
  /** Đường dẫn khác dẫn tới cùng màn hình (trạng thái khác, tham số khác). */
  aliases?: readonly string[];
}

const GUEST_ONLY: readonly Actor[] = ['Guest'];
const SIGNED_IN: readonly Actor[] = ['TEACHER', 'ORG_ADMIN', 'ADMIN'];
const TEACHER: readonly Actor[] = ['TEACHER'];
const ORG_ADMIN: readonly Actor[] = ['ORG_ADMIN'];
const ADMIN: readonly Actor[] = ['ADMIN'];

export const SCREENS = [
  // Xác thực và tài khoản
  { key: 'login', name: 'Đăng nhập', area: 'account', actors: GUEST_ONLY, path: '/dang-nhap' },
  {
    key: 'password',
    name: 'Quên và đặt mật khẩu',
    area: 'account',
    actors: GUEST_ONLY,
    path: '/quen-mat-khau',
    aliases: ['/dat-mat-khau'],
  },
  { key: 'profile', name: 'Hồ sơ cá nhân', area: 'account', actors: SIGNED_IN, path: '/tai-khoan' },

  // Giáo viên — /giao-vien
  { key: 'classes', name: 'Lớp học', area: 'teacher', actors: TEACHER, path: '/giao-vien/lop' },
  { key: 'classDetail', name: 'Chi tiết lớp', area: 'teacher', actors: TEACHER, path: '/giao-vien/lop/:lop' },
  { key: 'addStudents', name: 'Thêm học sinh và tạo tài khoản', area: 'teacher', actors: TEACHER, path: null },
  { key: 'loginSlips', name: 'Phiếu đăng nhập của học sinh', area: 'teacher', actors: TEACHER, path: null },
  {
    key: 'studentRecord',
    name: 'Hồ sơ học tập của học sinh',
    area: 'teacher',
    actors: TEACHER,
    path: '/giao-vien/lop/:lop/hoc-sinh/:hocSinh',
  },
  { key: 'lessons', name: 'Bài học của tôi', area: 'teacher', actors: TEACHER, path: '/giao-vien/bai-hoc' },
  { key: 'lessonCreate', name: 'Tạo bài học: chọn lớp và di sản', area: 'teacher', actors: TEACHER, path: null },
  { key: 'lessonEditor', name: 'Soạn bài học', area: 'teacher', actors: TEACHER, path: '/giao-vien/bai-hoc/:baiHoc' },
  { key: 'lessonCode', name: 'Mã bài học', area: 'teacher', actors: TEACHER, path: null },
  { key: 'lessonCopy', name: 'Nhân bản bài học sang lớp khác', area: 'teacher', actors: TEACHER, path: null },
  {
    key: 'aiQuestions',
    name: 'Sinh và duyệt câu hỏi bằng AI',
    area: 'teacher',
    actors: TEACHER,
    path: '/giao-vien/bai-hoc/:baiHoc/sinh-cau-hoi',
  },
  { key: 'questionBank', name: 'Ngân hàng câu hỏi', area: 'teacher', actors: TEACHER, path: '/giao-vien/cau-hoi' },
  // Quản trị hệ thống mở biểu mẫu câu hỏi ở chế độ chỉ đọc từ màn hình Kiểm duyệt ngân hàng câu hỏi.
  { key: 'questionForm', name: 'Biểu mẫu câu hỏi', area: 'teacher', actors: ['TEACHER', 'ADMIN'], path: null },
  { key: 'quizzes', name: 'Bài kiểm tra của tôi', area: 'teacher', actors: TEACHER, path: '/giao-vien/kiem-tra' },
  {
    key: 'quizEditor',
    name: 'Soạn và phát hành bài kiểm tra',
    area: 'teacher',
    actors: TEACHER,
    path: '/giao-vien/kiem-tra/:baiKiemTra',
  },
  { key: 'questionPicker', name: 'Chọn câu từ ngân hàng', area: 'teacher', actors: TEACHER, path: null },
  {
    key: 'quizResults',
    name: 'Kết quả bài kiểm tra',
    area: 'teacher',
    actors: TEACHER,
    path: '/giao-vien/kiem-tra/:baiKiemTra/ket-qua',
  },
  { key: 'attemptDetail', name: 'Chi tiết bài làm', area: 'teacher', actors: TEACHER, path: null },

  // Quản trị trường — /truong
  { key: 'schoolOverview', name: 'Tổng quan trường', area: 'school', actors: ORG_ADMIN, path: '/truong' },
  { key: 'schoolInfo', name: 'Trường và gói', area: 'school', actors: ORG_ADMIN, path: '/truong/thong-tin' },
  { key: 'schoolTeachers', name: 'Giáo viên của trường', area: 'school', actors: ORG_ADMIN, path: '/truong/giao-vien' },
  // Quản trị trường mở để tạo giáo viên; quản trị hệ thống mở từ Chi tiết trường để tạo quản trị trường.
  { key: 'accountForm', name: 'Biểu mẫu tài khoản', area: 'school', actors: ['ORG_ADMIN', 'ADMIN'], path: null },
  { key: 'planPurchase', name: 'Chọn gói và thanh toán', area: 'school', actors: ORG_ADMIN, path: '/truong/chon-goi' },
  {
    key: 'paymentResult',
    name: 'Kết quả thanh toán',
    area: 'school',
    actors: ORG_ADMIN,
    path: '/truong/ket-qua-thanh-toan',
  },

  // Quản trị hệ thống — /quan-tri
  { key: 'adminOverview', name: 'Tổng quan và doanh thu', area: 'admin', actors: ADMIN, path: '/quan-tri' },
  { key: 'schools', name: 'Quản lý trường', area: 'admin', actors: ADMIN, path: '/quan-tri/truong' },
  {
    key: 'schoolDetail',
    name: 'Chi tiết trường',
    area: 'admin',
    actors: ADMIN,
    path: '/quan-tri/truong/:truong',
    aliases: ['/quan-tri/truong/moi'],
  },
  { key: 'heritages', name: 'Quản lý di sản', area: 'admin', actors: ADMIN, path: '/quan-tri/di-san' },
  {
    key: 'heritageEditor',
    name: 'Biên tập di sản',
    area: 'admin',
    actors: ADMIN,
    path: '/quan-tri/di-san/:diSan',
    aliases: ['/quan-tri/di-san/moi'],
  },
  { key: 'timelineForm', name: 'Biểu mẫu giai đoạn và sự kiện', area: 'admin', actors: ADMIN, path: null },
  { key: 'questionModeration', name: 'Kiểm duyệt ngân hàng câu hỏi', area: 'admin', actors: ADMIN, path: '/quan-tri/cau-hoi' },
  { key: 'plans', name: 'Gói dịch vụ', area: 'admin', actors: ADMIN, path: '/quan-tri/goi' },
  { key: 'auditLog', name: 'Nhật ký thao tác', area: 'admin', actors: ADMIN, path: '/quan-tri/nhat-ky' },
] as const satisfies readonly Screen[];

export type ScreenKey = (typeof SCREENS)[number]['key'];

const BY_KEY = new Map<string, Screen>(SCREENS.map((s) => [s.key, s]));

export function screen(key: ScreenKey): Screen {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Không có màn hình ${key}`);
  return found;
}

/** Đường dẫn của một màn hình có URL (ném lỗi nếu là hộp thoại). */
export function pathOf(key: ScreenKey): string {
  const path = screen(key).path;
  if (path === null) throw new Error(`Màn hình ${screen(key).name} là hộp thoại, không có đường dẫn`);
  return path;
}

/** Tiền tố route của ba khu làm việc. */
export const AREA_ROOT = {
  teacher: '/giao-vien',
  school: '/truong',
  admin: '/quan-tri',
} as const;

/** Đường dẫn cụ thể của các màn hình có trạng thái phụ hoặc tham số (dùng khi tạo liên kết). */
export const PATHS = {
  /** Đặt mật khẩu, mở từ liên kết trong thư (`App:SetPasswordPath` của backend). */
  setPassword: '/dat-mat-khau',
  /** Chi tiết trường ở trạng thái tạo mới. */
  newSchool: '/quan-tri/truong/moi',
  /** Chi tiết trường: xem / sửa một trường. */
  school: (id: number) => `/quan-tri/truong/${id}`,
  /** Biên tập di sản ở trạng thái tạo mới. */
  newHeritage: '/quan-tri/di-san/moi',
  /** Biên tập di sản: sửa một di sản (tab nằm trong tham số `?tab=`). */
  heritage: (id: number) => `/quan-tri/di-san/${id}`,
} as const;
