import { Redirect } from 'expo-router';
import { useApp, useAuth } from '../src/state/AppProvider';

// Điểm vào: lần đầu chọn ngôn ngữ rồi chế độ; những lần sau mở thẳng chế độ đã chọn. Học sinh chưa đăng nhập (hoặc phiên đã hết) về màn hình Đăng nhập,
// học sinh bị buộc đổi mật khẩu về màn hình Đổi mật khẩu.

export default function Index() {
  const { chosenLanguage, mode } = useApp();
  const { session } = useAuth();
  if (!chosenLanguage && mode !== 'student') return <Redirect href="/chon-ngon-ngu" />;
  if (!mode) return <Redirect href="/chon-che-do" />;
  if (mode === 'guest') return <Redirect href="/(khach)" />;
  if (!session) return <Redirect href="/dang-nhap" />;
  if (session.user.mustChangePassword) return <Redirect href="/doi-mat-khau" />;
  return <Redirect href="/(hoc-sinh)/hoc" />;
}
