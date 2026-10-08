import { Redirect } from 'expo-router';
import { entryHref } from '../src/navigation/entry';
import { useApp, useAuth } from '../src/state/AppProvider';

// Điểm vào: lần đầu chọn ngôn ngữ rồi chế độ; những lần sau mở thẳng chế độ đã chọn. Học sinh chưa đăng nhập (hoặc phiên đã hết) về màn hình Đăng nhập,
// học sinh bị buộc đổi mật khẩu về màn hình Đổi mật khẩu.

export default function Index() {
  const { chosenLanguage, mode } = useApp();
  const { session } = useAuth();
  return <Redirect href={entryHref({ chosenLanguage, mode, hasSession: Boolean(session), mustChangePassword: Boolean(session?.user.mustChangePassword) })} />;
}
