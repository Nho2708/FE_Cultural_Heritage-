import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { HeritageTile, ListNotes } from '../components/Heritage';
import { Button, Chip, EmptyState, ErrorState, Loading, Notice, Screen, Txt, styles as ui } from '../components/ui';
import { formatDistance } from '../i18n/dates';
import { publicHref } from '../navigation/publicRoutes';
import { useApp } from '../state/AppProvider';
import { NearbyGate } from './NearbyGate';
import { useRecommendationList } from './queries';
import { RecommendationCards } from './RecommendationCards';
import { suggestionIntro, visibleSuggestions, type SuggestionTab } from './suggestions';
import { useNearby } from './useNearby';

// "Xem tất cả" của trang chủ khách: hai tab "Gợi ý cho bạn" (đủ 6 di sản kèm lý do) và "Gần bạn" (di sản gần nhất kèm khoảng cách). Tab "Gần bạn" chỉ dựng, và chỉ hỏi quyền vị trí của
// hệ điều hành, khi khách chọn tab đó rồi bấm nút cho phép; từ chối thì báo nhẹ nhàng và nút cho phép vẫn còn để thử lại.

export function SuggestionsScreen({ initialTab }: { initialTab: SuggestionTab }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SuggestionTab>(initialTab);
  return (
    <Screen>
      <View style={ui.wrap}>
        <Chip label={t('home.recommended')} selected={tab === 'goi-y'} onPress={() => setTab('goi-y')} />
        <Chip label={t('home.nearby')} selected={tab === 'gan-ban'} onPress={() => setTab('gan-ban')} />
      </View>
      {tab === 'goi-y' ? <RecommendedTab /> : <NearbyTab />}
    </Screen>
  );
}

function RecommendedTab() {
  const { t } = useTranslation();
  const query = useRecommendationList({ scope: 'all' });
  if (query.isLoading) return <Loading label={t('recommend.loading')} />;
  if (query.isError || !query.data) return <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />;
  const data = query.data;
  const items = visibleSuggestions(data.items);
  const personal = suggestionIntro(data) === 'personal';
  return (
    <View style={{ gap: 12 }}>
      <Txt muted>{personal ? t('recommend.text') : t('recommend.textFeatured')}</Txt>
      {data.usedFallback ? <Notice text={t('recommend.fallbackNote')} /> : null}
      {items.length === 0 ? (
        <EmptyState message={t('common.noResults')} />
      ) : (
        <>
          <ListNotes cards={items.map((item) => item.heritage)} />
          <RecommendationCards items={items} personalized={personal} />
        </>
      )}
    </View>
  );
}

function NearbyTab() {
  const { t } = useTranslation();
  const { language, mode } = useApp();
  const router = useRouter();
  const nearby = useNearby();
  return (
    <View style={{ gap: 12 }}>
      <NearbyGate nearby={nearby}>
        <View style={{ gap: 12 }}>
          {nearby.items.map(({ item, meters }) => (
            <HeritageTile
              key={item.slug}
              card={item}
              horizontal
              extra={t('home.nearbyDistance', { distance: formatDistance(meters, language) })}
              onPress={() => router.push({ pathname: '/di-san/[slug]', params: { slug: item.slug } })}
            />
          ))}
          <Button label={t('detail.onMap')} variant="secondary" onPress={() => router.push(publicHref(mode, 'map'))} />
        </View>
      </NearbyGate>
    </View>
  );
}
