import type { IconName } from '@dsvhvn/dung-chung/ui';
import { pathOf, type ScreenKey } from '../../access/screens';
import type { Strings } from '../../i18n/strings';

// Mục của thanh điều hướng trên (TopBar). Chưa đăng nhập: Khám phá · Bản đồ · Dòng thời gian · Lịch sử của tôi (và nút "Học sinh đăng
// nhập"). Học sinh đã đăng nhập: Trang học · Nhập mã · Tiến độ · Khám phá · Bản đồ · Dòng thời gian (và menu tài khoản).

export interface NavItem {
  to: string;
  label: string;
  icon?: IconName;
}

const item = (screen: ScreenKey, label: string, icon: IconName): NavItem => ({ to: pathOf(screen), label, icon });

/** Mục khám phá theo ngôn ngữ đang chọn (khách chọn một trong năm ngôn ngữ; học sinh luôn thấy tiếng Việt). */
const explore = (t: Strings): NavItem[] => [
  item('search', t.nav.explore, 'search'),
  item('map', t.nav.map, 'map-pin'),
  item('timeline', t.nav.timeline, 'clock'),
];

const LEARNING: readonly NavItem[] = [
  item('learnHome', 'Trang học', 'home'),
  item('enterCode', 'Nhập mã', 'key'),
  item('progress', 'Tiến độ', 'star'),
];

export function primaryNav(signedIn: boolean, t: Strings): NavItem[] {
  // Lịch sử xem chỉ có với khách; học sinh đã đăng nhập không bị ghi lịch sử nên không có mục này.
  return signedIn ? [...LEARNING, ...explore(t)] : [...explore(t), item('guestHistory', t.nav.history, 'clock')];
}
