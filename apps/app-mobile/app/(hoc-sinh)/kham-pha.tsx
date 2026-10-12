import { HomeScreen } from '../../src/guest/HomeScreen';
import { DefaultThemeScope } from '../../src/theme/ThemeProvider';

// Khám phá: học sinh xem phần công khai của app (di sản nổi bật, tìm kiếm, bản đồ) bằng tiếng Việt và giao diện mặc định. Không có lịch sử, gợi ý theo lịch sử hay "Gần bạn" (chỉ của khách).
export default function Explore() {
  return (
    <DefaultThemeScope>
      <HomeScreen audience="student" />
    </DefaultThemeScope>
  );
}
