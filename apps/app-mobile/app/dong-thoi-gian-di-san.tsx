import { TimelinePickerScreen } from '../src/guest/TimelinePickerScreen';
import { DefaultThemeScope } from '../src/theme/ThemeProvider';

// Chọn di sản để xem dòng thời gian, mở riêng (không nằm trong tab của khách): học sinh mở từ tab Khám phá. Giao diện mặc định.
export default function HeritageTimelinePickerPage() {
  return (
    <DefaultThemeScope>
      <TimelinePickerScreen />
    </DefaultThemeScope>
  );
}
