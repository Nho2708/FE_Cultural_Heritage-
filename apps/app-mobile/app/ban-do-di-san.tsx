import { useLocalSearchParams } from 'expo-router';
import { HeritageMapScreen } from '../src/guest/HeritageMapScreen';
import { DefaultThemeScope } from '../src/theme/ThemeProvider';

// Bản đồ di sản mở riêng (không nằm trong tab): học sinh mở từ thẻ di sản của bài học hoặc từ trang chi tiết di sản.
export default function HeritageMapPage() {
  const { chon } = useLocalSearchParams<{ chon?: string }>();
  return (
    <DefaultThemeScope>
      <HeritageMapScreen select={chon || undefined} />
    </DefaultThemeScope>
  );
}
