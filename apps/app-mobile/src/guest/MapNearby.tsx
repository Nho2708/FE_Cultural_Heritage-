import type { DiscoveryFilter } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Divider, Txt, styles as ui } from '../components/ui';
import { formatDistance } from '../i18n/dates';
import { useApp } from '../state/AppProvider';
import { useTheme } from '../theme/ThemeProvider';
import { provinceName } from './format';
import { NearbyGate } from './NearbyGate';
import { useMapPins } from './queries';
import { useNearby } from './useNearby';

// "Gần bạn" trên bản đồ (chỉ khách): nút nổi ở góc dưới bên phải. Bấm nút thì app mới hỏi quyền vị trí (nếu chưa cho phép), đưa bản đồ về vị trí của khách (chấm xanh) và hiện bảng tối đa 6 di sản
// gần nhất kèm khoảng cách; chọn một dòng thì làm nổi ghim đó trên bản đồ, di sản không có trên bản đồ (do đang lọc) thì mở trang chi tiết. Bị từ chối quyền thì bảng báo nhẹ nhàng và cho thử lại.
// Vị trí chỉ nằm trong bộ nhớ, không lưu.

interface Props {
  /** Bộ lọc đang áp trên bản đồ, để biết di sản nào có ghim. */
  filter: DiscoveryFilter;
  /** Báo vị trí của khách cho màn hình bản đồ để gửi vào trang nhúng. */
  onPosition: (position: { latitude: number; longitude: number } | null) => void;
  onFocus: (slug: string) => void;
}

export function MapNearby({ filter, onPosition, onFocus }: Props) {
  const { t } = useTranslation();
  const { language } = useApp();
  const theme = useTheme();
  const router = useRouter();
  const nearby = useNearby();
  const [open, setOpen] = useState(false);
  const pins = useMapPins(filter, open);
  const onMap = new Set(pins.data?.pins.map((pin) => pin.slug));
  const { position } = nearby;

  useEffect(() => {
    if (position) onPosition(position);
  }, [position, onPosition]);

  const choose = (slug: string) => {
    if (onMap.has(slug)) {
      setOpen(false);
      onFocus(slug);
    } else router.push({ pathname: '/di-san/[slug]', params: { slug } });
  };

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {open ? (
        <Card style={[styles.panel, { backgroundColor: theme.color.surface }]}>
          <View style={styles.panelBody}>
            <View style={ui.row}>
              <Txt variant="title" style={ui.grow} accessibilityRole="header">
                {t('home.nearby')}
              </Txt>
              <Button label={t('common.close')} variant="ghost" onPress={() => setOpen(false)} />
            </View>
            <NearbyGate nearby={nearby}>
              <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
                {nearby.items.map(({ item, meters }, index) => (
                  <View key={item.slug}>
                    {index > 0 ? <Divider /> : null}
                    <Pressable accessibilityRole="button" accessibilityLabel={item.name} onPress={() => choose(item.slug)} style={{ minHeight: theme.touchTarget, justifyContent: 'center', paddingVertical: 6 }}>
                      <Txt variant="label" numberOfLines={2}>
                        {item.name}
                      </Txt>
                      <Txt variant="caption">{[provinceName(item.provinceName, language), formatDistance(meters, language)].filter(Boolean).join(' · ')}</Txt>
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </NearbyGate>
          </View>
        </Card>
      ) : null}
      <Button
        label={t('home.nearby')}
        variant="secondary"
        loading={nearby.isLoading}
        style={[styles.fab, { backgroundColor: theme.color.surface }]}
        onPress={() => {
          setOpen(true);
          nearby.locate();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'flex-end', alignItems: 'flex-end', padding: 12, gap: 10 },
  fab: { alignSelf: 'flex-end', elevation: 3, shadowColor: '#000000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  panel: { alignSelf: 'stretch', maxHeight: '55%' },
  panelBody: { padding: 14, gap: 8 },
});
