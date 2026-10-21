import { useLocalSearchParams } from 'expo-router';
import { DirectionsScreen } from '../../../src/guest/DirectionsScreen';
import { DefaultThemeScope } from '../../../src/theme/ThemeProvider';

// Chỉ đường tới di sản (khách và học sinh đều dùng được, bộ giao diện mặc định): mở từ nút "Chỉ đường" ở chi tiết di sản hoặc từ thẻ di sản trên bản đồ.
export default function DirectionsPage() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  return (
    <DefaultThemeScope>
      <DirectionsScreen slug={slug} />
    </DefaultThemeScope>
  );
}
