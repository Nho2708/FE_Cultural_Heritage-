import type { Href } from 'expo-router';
import type { AppMode } from '../state/services';

/**
 * Màn hình đúng cho trạng thái hiện tại: chọn ngôn ngữ lần đầu, rồi các thẻ giới thiệu (một lần, chỉ khi chưa chọn chế độ), rồi chọn chế độ, rồi vào thẳng chế độ đã chọn;
 * học sinh chưa đăng nhập về Đăng nhập, bị buộc đổi mật khẩu về Đổi mật khẩu.
 * Luôn trả về đường dẫn cụ thể, không trả "/": địa chỉ gốc trùng với trang chủ của nhóm Khách (`(khach)/index`), nên từ trong nhóm đó "/" lại tìm về chính nhóm Khách và chuyển hướng lặp mãi.
 */
export function entryHref(state: { chosenLanguage: string | null; mode: AppMode | null; introSeen: boolean; hasSession: boolean; mustChangePassword: boolean }): Href {
  if (!state.chosenLanguage && state.mode !== 'student') return '/chon-ngon-ngu';
  if (!state.mode) return state.introSeen ? '/chon-che-do' : '/gioi-thieu';
  if (state.mode === 'guest') return '/(khach)';
  if (!state.hasSession) return '/dang-nhap';
  if (state.mustChangePassword) return '/doi-mat-khau';
  return '/(hoc-sinh)/hoc';
}
