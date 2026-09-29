import type { IconName } from '@dsvhvn/dung-chung/ui';
import { pathOf, type ScreenKey } from '../../access/screens';

// Mục của thanh điều hướng trên (TopBar). Chưa đăng nhập: Khám phá · Bản đồ · Dòng thời gian (và nút "Học sinh đăng
// nhập"). Học sinh đã đăng nhập: Trang học · Nhập mã · Tiến độ · Khám phá · Bản đồ · Dòng thời gian (và menu tài khoản).

export interface NavItem {
  to: string;
  label: string;
  icon?: IconName;
}

const item = (screen: ScreenKey, label: string, icon: IconName): NavItem => ({ to: pathOf(screen), label, icon });

const EXPLORE: readonly NavItem[] = [
  item('search', 'Khám phá', 'search'),
  item('map', 'Bản đồ', 'map-pin'),
  item('timeline', 'Dòng thời gian', 'clock'),
];

const LEARNING: readonly NavItem[] = [
  item('learnHome', 'Trang học', 'home'),
  item('enterCode', 'Nhập mã', 'key'),
  item('progress', 'Tiến độ', 'star'),
];

export function primaryNav(signedIn: boolean): NavItem[] {
  return signedIn ? [...LEARNING, ...EXPLORE] : [...EXPLORE];
}
