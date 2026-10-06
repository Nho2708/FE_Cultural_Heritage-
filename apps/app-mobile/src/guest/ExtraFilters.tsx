import type { HeritagePeriod, LanguageCode, RecognitionLevel } from '@dsvhvn/dung-chung/api';
import { PERIOD_NAME, RECOGNITION_LEVEL_NAME, provinceName } from '@dsvhvn/dung-chung/i18n';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Chip, Txt, styles as ui } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { useFilterCatalog } from './queries';

// Bộ lọc thêm của trang Tìm kiếm: tỉnh, thành phố (chọn trong danh sách), cấp xếp hạng và thời kỳ. Tên danh mục dịch sẵn theo ngôn ngữ đang chọn.

export const LEVELS: RecognitionLevel[] = ['UNESCO', 'NATIONAL_SPECIAL', 'NATIONAL', 'PROVINCIAL'];
export const PERIODS: HeritagePeriod[] = ['PREHISTORIC', 'NORTHERN_RULE', 'INDEPENDENT_FEUDAL', 'MODERN', 'CONTEMPORARY'];

interface Props {
  language: LanguageCode;
  provinceId: number | undefined;
  level: RecognitionLevel | undefined;
  period: HeritagePeriod | undefined;
  onProvince: (id: number | undefined) => void;
  onLevel: (level: RecognitionLevel | undefined) => void;
  onPeriod: (period: HeritagePeriod | undefined) => void;
}

export function ExtraFilters({ language, provinceId, level, period, onProvince, onLevel, onPeriod }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const catalog = useFilterCatalog();
  const [picking, setPicking] = useState(false);
  const provinces = catalog.data?.provinces ?? [];
  const current = provinces.find((province) => province.id === provinceId);
  const currentName = (current ? (provinceName(current.name, language) ?? current.name) : null) ?? t('search.anyProvince');

  return (
    <View style={{ gap: 12 }}>
      <Txt variant="label">{t('search.province')}</Txt>
      <Button label={currentName} variant="secondary" onPress={() => setPicking(true)} accessibilityLabel={`${t('search.province')}: ${currentName}`} />
      <Txt variant="label">{t('search.level')}</Txt>
      <View style={ui.wrap}>
        <Chip label={t('search.all')} selected={!level} onPress={() => onLevel(undefined)} />
        {LEVELS.map((item) => (
          <Chip key={item} label={RECOGNITION_LEVEL_NAME[language][item]} selected={level === item} onPress={() => onLevel(level === item ? undefined : item)} />
        ))}
      </View>
      <Txt variant="label">{t('search.period')}</Txt>
      <View style={ui.wrap}>
        <Chip label={t('search.all')} selected={!period} onPress={() => onPeriod(undefined)} />
        {PERIODS.map((item) => (
          <Chip key={item} label={PERIOD_NAME[language][item]} selected={period === item} onPress={() => onPeriod(period === item ? undefined : item)} />
        ))}
      </View>

      <Modal visible={picking} transparent animationType="slide" onRequestClose={() => setPicking(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <View style={{ maxHeight: '75%', backgroundColor: theme.color.surface, borderTopLeftRadius: theme.radius.card, borderTopRightRadius: theme.radius.card, paddingBottom: insets.bottom }}>
            <View style={[ui.row, { padding: theme.spacing.inline }]}>
              <Txt variant="title" style={ui.grow}>
                {t('search.chooseProvince')}
              </Txt>
              <Button label={t('common.close')} variant="ghost" onPress={() => setPicking(false)} />
            </View>
            <ScrollView>
              {[{ id: undefined as number | undefined, name: t('search.anyProvince') }, ...provinces.map((province) => ({ id: province.id as number | undefined, name: provinceName(province.name, language) ?? province.name }))].map((item) => (
                <Pressable
                  key={item.id ?? 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.id === provinceId }}
                  onPress={() => {
                    onProvince(item.id);
                    setPicking(false);
                  }}
                  style={{ minHeight: theme.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.inline, backgroundColor: item.id === provinceId ? theme.color.primaryContainer : 'transparent' }}
                >
                  <Txt variant={item.id === provinceId ? 'label' : 'body'}>{item.name}</Txt>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
