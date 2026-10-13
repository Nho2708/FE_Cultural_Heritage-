import type { Ionicons } from '@expo/vector-icons';

// Các tab dưới của từng chế độ, theo đúng thứ tự hiển thị. `name` là tên tệp màn hình trong nhóm tương ứng, `title` là khóa chữ giao diện.
// Để thành dữ liệu riêng nên kiểm được bằng test mà không phải dựng thanh tab.

type IconName = keyof typeof Ionicons.glyphMap;

export interface TabSpec {
  name: string;
  /** Khóa chữ của tiêu đề màn hình (thanh tiêu đề phía trên). */
  title: string;
  /** Khóa chữ ngắn hơn cho nhãn trên thanh tab khi tiêu đề dài quá một ô tab; bỏ trống thì nhãn là tiêu đề. */
  label?: string;
  icon: IconName;
  focusedIcon: IconName;
}

/** Chế độ Học sinh: Trang học, Nhập mã, Khám phá, Tiến độ, Của em. */
export const STUDENT_TABS: readonly TabSpec[] = [
  { name: 'hoc', title: 'hs.tabs.learn', icon: 'school-outline', focusedIcon: 'school' },
  { name: 'nhap-ma', title: 'hs.tabs.code', icon: 'key-outline', focusedIcon: 'key' },
  { name: 'kham-pha', title: 'hs.tabs.explore', icon: 'compass-outline', focusedIcon: 'compass' },
  { name: 'tien-do', title: 'hs.tabs.progress', icon: 'star-outline', focusedIcon: 'star' },
  { name: 'cua-em', title: 'hs.tabs.account', icon: 'person-outline', focusedIcon: 'person' },
];

/** Chế độ Khách tham quan: Trang chủ, Tìm kiếm, Bản đồ, Dòng thời gian, Lịch sử và cài đặt. */
export const GUEST_TABS: readonly TabSpec[] = [
  { name: 'index', title: 'tabs.home', icon: 'home-outline', focusedIcon: 'home' },
  { name: 'tim-kiem', title: 'tabs.search', icon: 'search-outline', focusedIcon: 'search' },
  { name: 'ban-do', title: 'tabs.map', icon: 'map-outline', focusedIcon: 'map' },
  { name: 'dong-thoi-gian', title: 'timeline.title', label: 'tabs.timeline', icon: 'hourglass-outline', focusedIcon: 'hourglass' },
  { name: 'lich-su', title: 'tabs.history', icon: 'time-outline', focusedIcon: 'time' },
];
