import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button, Loading, Notice, Section, Txt } from '../components/ui';
import { ListNotes } from '../components/Heritage';
import { useRecommendationList } from './queries';
import { RecommendationCards } from './RecommendationCards';
import { suggestionIntro, visibleSuggestions } from './suggestions';

// "Gợi ý cho bạn" ở cuối trang chi tiết di sản (chỉ khách): di sản giống những gì khách đã tìm, xem, nghe, trừ di sản đang xem. Máy chủ ghi lượt xem khi tải chi tiết nên khối này
// được dựng sau khi chi tiết đã có. Gợi ý chỉ là phần thêm: lỗi hoặc không có gì thì ẩn cả khối, không báo lỗi che phần còn lại của trang.

export function DetailSuggestions({ slug }: { slug: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const query = useRecommendationList({ scope: slug });
  const data = query.data;
  const items = visibleSuggestions(data?.items, slug);

  if (query.isLoading) {
    return (
      <Section title={t('home.recommended')}>
        <Loading label={t('recommend.loading')} />
      </Section>
    );
  }
  if (!data || items.length === 0) return null;

  const personal = suggestionIntro(data) === 'personal';
  return (
    <Section
      title={t('home.recommended')}
      right={<Button label={t('common.seeAll')} variant="ghost" onPress={() => router.push({ pathname: '/goi-y', params: { tab: 'goi-y' } })} />}
    >
      <Txt muted>{personal ? t('recommend.text') : t('recommend.textFeatured')}</Txt>
      {data.usedFallback ? <Notice text={t('recommend.fallbackNote')} /> : null}
      <ListNotes cards={items.map((item) => item.heritage)} />
      <RecommendationCards items={items} personalized={personal} />
    </Section>
  );
}
