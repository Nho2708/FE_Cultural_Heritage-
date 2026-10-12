import { SearchScreen } from '../src/guest/SearchScreen';
import { DefaultThemeScope } from '../src/theme/ThemeProvider';

// Tìm kiếm di sản mở riêng (không nằm trong tab của khách): học sinh mở từ tab Khám phá. Giao diện mặc định, không ghi lịch sử.
export default function HeritageSearchPage() {
  return (
    <DefaultThemeScope>
      <SearchScreen audience="student" />
    </DefaultThemeScope>
  );
}
