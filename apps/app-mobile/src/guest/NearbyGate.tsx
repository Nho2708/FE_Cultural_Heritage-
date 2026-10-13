import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, EmptyState, Loading, Notice } from '../components/ui';
import type { useNearby } from './useNearby';

// Phần dùng chung của "Gần bạn" ở trang chủ và màn hình "Xem tất cả": các trạng thái trước khi có danh sách (chưa cho phép, bị từ chối, đang xác định vị trí, lỗi,
// ngoài Việt Nam, không có di sản có tọa độ) và nút xin quyền. Có danh sách thì hiện `children`. Quyền vị trí của hệ điều hành chỉ được hỏi khi khách bấm nút trong khối này.

export function NearbyGate({ nearby, children }: { nearby: ReturnType<typeof useNearby>; children: ReactNode }) {
  const { t } = useTranslation();
  const { status } = nearby;

  if (status === 'off' || status === 'denied' || status === 'error') {
    const text = status === 'denied' ? t('home.nearbyDenied') : status === 'error' ? t('home.nearbyError') : t('home.nearbyAsk');
    return (
      <View style={{ gap: 10 }}>
        <Notice text={text} />
        <Button label={t('home.nearbyAllow')} variant="secondary" onPress={() => void nearby.locate()} />
      </View>
    );
  }
  if (status === 'locating') return <Loading label={t('home.nearbyLocating')} />;
  if (nearby.outsideVietnam) return <Notice text={t('home.nearbyOutside')} />;
  if (nearby.items.length === 0) return <EmptyState message={t('home.nearbyEmpty')} />;
  return <>{children}</>;
}
