import type { Href } from 'expo-router';
import type { AppMode } from '../state/services';

// Các màn hình công khai (tìm kiếm, bản đồ, chọn di sản xem dòng thời gian) có hai lối vào: khách đi qua tab của chế độ Khách tham quan, học sinh đi từ tab Khám phá nên mở bản đứng riêng
// ngoài thanh tab (học sinh không vào được nhóm tab của khách). Hai bản dùng chung một màn hình bên trong, chỉ khác đường dẫn.

export type PublicScreen = 'search' | 'map' | 'timeline';

const PATHS: Record<'guest' | 'student', Record<PublicScreen, string>> = {
  guest: { search: '/(khach)/tim-kiem', map: '/(khach)/ban-do', timeline: '/(khach)/dong-thoi-gian' },
  student: { search: '/tim-kiem-di-san', map: '/ban-do-di-san', timeline: '/dong-thoi-gian-di-san' },
};

export function publicHref(mode: AppMode | null, screen: PublicScreen, params?: Record<string, string | undefined>): Href {
  const pathname = PATHS[mode === 'student' ? 'student' : 'guest'][screen];
  return params ? { pathname, params } : pathname;
}
