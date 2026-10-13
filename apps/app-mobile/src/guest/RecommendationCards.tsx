import type { GuestRecommendation } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HeritageTile } from '../components/Heritage';
import { Badge, Txt, styles as ui } from '../components/ui';

// Danh sách gợi ý dạng thẻ nằm ngang. Gợi ý theo lịch sử (`personalized`) ghi thêm di sản giống nhất mà khách đã quan tâm và các điểm chung; danh sách di sản nổi bật thì chỉ có thẻ.

export function RecommendationCards({ items, personalized }: { items: readonly GuestRecommendation[]; personalized: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={{ gap: 14 }}>
      {items.map((item) => (
        <View key={item.heritage.slug} style={{ gap: 6 }}>
          <HeritageTile card={item.heritage} horizontal onPress={() => router.push({ pathname: '/di-san/[slug]', params: { slug: item.heritage.slug } })} />
          {personalized && item.becauseOfName ? (
            <Txt variant="caption" muted>
              {t('recommend.because', { name: item.becauseOfName })}
            </Txt>
          ) : null}
          {personalized && item.reasons.length > 0 ? (
            <View style={ui.wrap} accessibilityLabel={t('recommend.reasonsLabel')}>
              {item.reasons.map((reason) => (
                <Badge key={reason} label={t(`recommend.reasons.${reason}`)} />
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
