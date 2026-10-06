import { useLocalSearchParams } from 'expo-router';
import { HeritageMapScreen } from '../../src/guest/HeritageMapScreen';

// Tab Bản đồ của khách; `chon` là ghim cần làm nổi (từ nút "Xem trên bản đồ" ở chi tiết di sản).
export default function MapTab() {
  const { chon } = useLocalSearchParams<{ chon?: string }>();
  return <HeritageMapScreen select={chon || undefined} />;
}
