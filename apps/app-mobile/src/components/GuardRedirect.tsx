import { router, type Href } from 'expo-router';
import { useEffect } from 'react';

// Chuyển hướng đúng một lần cho khung (layout) chặn truy cập, như khi đổi chế độ Khách / Học sinh hoặc đăng xuất. Khung vẫn được vẽ tới khi điều hướng xong, nên chuyển hướng
// phải ở trong hiệu ứng có phụ thuộc cố định (`Redirect` của expo-router chạy lại sau mỗi lần vẽ). Địa chỉ đích phải cụ thể, xem `entryHref`.
export function GuardRedirect({ href }: { href: Href }) {
  useEffect(() => {
    router.replace(href);
  }, [href]);
  return null;
}
