import type { HeritageCard } from '@dsvhvn/dung-chung/api';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { HeritageTile, ListNotes } from '../components/Heritage';
import { Button, EmptyState, Section } from '../components/ui';
import { formatDistance } from '../i18n/dates';
import { useApp } from '../state/AppProvider';
import { useHistory } from './HistoryProvider';
import { useRecommendations } from './queries';
import { NearbyGate } from './NearbyGate';
import { useNearby } from './useNearby';

// Hai khu chỉ của khách trên trang chủ: "Gợi ý cho bạn" (theo lịch sử của thiết bị) và "Gần bạn" (khi khách cho dùng vị trí). Là hai thành phần riêng để học sinh vào tab Khám phá
// không dựng chúng: lịch sử và vị trí chỉ của khách, máy chủ từ chối yêu cầu của học sinh.

export const TILE_WIDTH = 240;

export function RecommendedSection({ featured }: { featured: readonly HeritageCard[] }) {
  const { t } = useTranslation();
  const router = useRouter();
  const history = useHistory();
  const recommendations = useRecommendations(history.entries.length, featured);
  const open = (slug: string) => router.push({ pathname: '/di-san/[slug]', params: { slug } });
  return (
    <Section
      title={recommendations.personal ? t('home.recommended') : t('home.recommendedEmpty')}
      right={<Button label={t('common.seeAll')} variant="ghost" onPress={() => router.push({ pathname: '/goi-y', params: { tab: 'goi-y' } })} />}
    >
      <ListNotes cards={recommendations.cards} />
      {recommendations.cards.length === 0 ? (
        <EmptyState message={t('common.noResults')} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.row}>
          {recommendations.cards.map((card) => (
            <HeritageTile key={card.slug} card={card} width={TILE_WIDTH} onPress={() => open(card.slug)} />
          ))}
        </ScrollView>
      )}
    </Section>
  );
}

export function NearbySection() {
  const { t } = useTranslation();
  const { language } = useApp();
  const router = useRouter();
  const nearby = useNearby();
  const open = (slug: string) => router.push({ pathname: '/di-san/[slug]', params: { slug } });
  return (
    <Section
      title={t('home.nearby')}
      right={nearby.status === 'ready' ? <Button label={t('common.seeAll')} variant="ghost" onPress={() => router.push({ pathname: '/goi-y', params: { tab: 'gan-ban' } })} /> : null}
    >
      <NearbyGate nearby={nearby}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.row}>
          {nearby.items.map(({ item, meters }) => (
            <HeritageTile key={item.slug} card={item} width={TILE_WIDTH} extra={t('home.nearbyDistance', { distance: formatDistance(meters, language) })} onPress={() => open(item.slug)} />
          ))}
        </ScrollView>
      </NearbyGate>
    </Section>
  );
}

const local = StyleSheet.create({
  row: { gap: 12, paddingRight: 16 },
});
