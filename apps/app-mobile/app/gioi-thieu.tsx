import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { IntroCards } from '../src/intro/IntroCards';
import { useApp } from '../src/state/AppProvider';

// Giới thiệu ứng dụng: bốn thẻ ngắn. Lần đầu nằm giữa chọn ngôn ngữ và chọn chế độ, chỉ hiện một lần (bỏ qua hay xem hết đều đánh dấu đã xem).
// Mở lại từ "Lịch sử và cài đặt" (Khách) hoặc "Của em" (Học sinh, tiếng Việt) thì xong là quay về màn hình đó. Không nằm giữa đăng nhập, nhập mã, bài học hay bài kiểm tra.

export default function AppIntroduction() {
  const router = useRouter();
  const { mode, markIntroSeen } = useApp();
  const close = useCallback(() => {
    markIntroSeen();
    // Đã chọn chế độ nghĩa là đang xem lại: quay về nơi mở. Lần đầu thì để điểm vào chuyển sang chọn chế độ.
    if (mode && router.canGoBack()) router.back();
    else router.replace('/');
  }, [markIntroSeen, mode, router]);
  return <IntroCards onClose={close} />;
}
