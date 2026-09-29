// Bảng màn hình của web học tập (14 màn hình): khám phá di sản công khai (Khách và học sinh) và khu học của học sinh.
// Nguồn duy nhất cho route guard và thanh điều hướng. Tên màn hình bằng lời, khóa đặt theo nghĩa. Giáo viên và quản trị
// không đăng nhập ở đây; mở các trang khám phá thì họ là Khách.
// Chặn ở giao diện chỉ để điều hướng đúng; backend kiểm vai trò, lớp và lượt làm của chính học sinh ở mọi endpoint.

/** Khách = chưa đăng nhập. */
export type Actor = 'Guest' | 'STUDENT';

/** Khu vực: khám phá công khai, khu học của học sinh. */
export type Area = 'explore' | 'learning';

export interface Screen {
  key: string;
  name: string;
  area: Area;
  actors: readonly Actor[];
  /** Đường dẫn trong router; null với hộp thoại. */
  path: string | null;
  aliases?: readonly string[];
  /** Ẩn thanh điều hướng (làm bài kiểm tra). */
  fullScreen?: boolean;
}

const EVERYONE: readonly Actor[] = ['Guest', 'STUDENT'];
const GUEST_ONLY: readonly Actor[] = ['Guest'];
const STUDENT: readonly Actor[] = ['STUDENT'];

export const SCREENS = [
  // Khám phá công khai
  { key: 'home', name: 'Trang chủ', area: 'explore', actors: EVERYONE, path: '/' },
  { key: 'search', name: 'Tìm kiếm và lọc di sản', area: 'explore', actors: EVERYONE, path: '/di-san' },
  { key: 'map', name: 'Bản đồ di sản', area: 'explore', actors: EVERYONE, path: '/ban-do' },
  { key: 'heritage', name: 'Chi tiết di sản', area: 'explore', actors: EVERYONE, path: '/di-san/:diSan' },
  {
    key: 'timeline',
    name: 'Dòng thời gian di sản',
    area: 'explore',
    actors: EVERYONE,
    path: '/dong-thoi-gian',
    aliases: ['/dong-thoi-gian/:diSan'],
  },

  // Khu học của học sinh
  { key: 'login', name: 'Học sinh đăng nhập', area: 'learning', actors: GUEST_ONLY, path: '/dang-nhap' },
  { key: 'changePassword', name: 'Đổi mật khẩu', area: 'learning', actors: STUDENT, path: '/doi-mat-khau' },
  { key: 'learnHome', name: 'Trang học của em', area: 'learning', actors: STUDENT, path: '/hoc' },
  { key: 'enterCode', name: 'Nhập mã bài học', area: 'learning', actors: STUDENT, path: '/nhap-ma' },
  { key: 'lesson', name: 'Bài học', area: 'learning', actors: STUDENT, path: '/bai-hoc/:maBaiHoc' },
  { key: 'startQuiz', name: 'Bắt đầu bài kiểm tra', area: 'learning', actors: STUDENT, path: null },
  {
    key: 'takeQuiz',
    name: 'Làm bài kiểm tra',
    area: 'learning',
    actors: STUDENT,
    path: '/bai-hoc/:maBaiHoc/kiem-tra/:baiKiemTra',
    fullScreen: true,
  },
  { key: 'result', name: 'Kết quả bài làm', area: 'learning', actors: STUDENT, path: '/ket-qua/:luotLam' },
  { key: 'progress', name: 'Tiến độ của em', area: 'learning', actors: STUDENT, path: '/tien-do' },
] as const satisfies readonly Screen[];

export type ScreenKey = (typeof SCREENS)[number]['key'];

const BY_KEY = new Map<string, Screen>(SCREENS.map((s) => [s.key, s]));

export function screen(key: ScreenKey): Screen {
  const found = BY_KEY.get(key);
  if (!found) throw new Error(`Không có màn hình ${key}`);
  return found;
}

export function pathOf(key: ScreenKey): string {
  const path = screen(key).path;
  if (path === null) throw new Error(`Màn hình ${screen(key).name} là hộp thoại, không có đường dẫn`);
  return path;
}
