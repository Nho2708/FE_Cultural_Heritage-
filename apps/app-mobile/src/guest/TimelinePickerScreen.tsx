import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { HeritageTile, ListNotes } from '../components/Heritage';
import { Button, EmptyState, ErrorState, Loading, Notice, Txt } from '../components/ui';
import { useTheme } from '../theme/ThemeProvider';
import { keywordInvalid, useSearch } from './queries';

// Chọn di sản để xem dòng thời gian (tab Dòng thời gian của khách, và lối vào từ trang chủ của học sinh): mỗi di sản có dòng thời gian riêng nên chưa có trục chung.
// Danh sách là mọi di sản đã xuất bản, tìm nhanh theo tên; di sản chưa có giai đoạn nào sẽ báo rõ khi mở.

function Separator() {
  return <View style={{ height: 12 }} />;
}

export function TimelinePickerScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const filter = useMemo(() => ({ keyword: keyword.trim() || undefined }), [keyword]);
  const query = useSearch(filter);
  const cards = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);

  const change = (text: string) => {
    setDraft(text);
    if (text.trim() === '') setKeyword('');
  };

  const header = (
    <View style={{ gap: 12, paddingBottom: 12 }}>
      <Txt muted>{t('timeline.pickerText')}</Txt>
      <TextInput
        value={draft}
        onChangeText={change}
        onSubmitEditing={() => setKeyword(draft)}
        returnKeyType="search"
        autoCorrect={false}
        placeholder={t('timeline.pickerPlaceholder')}
        placeholderTextColor={theme.color.onSurfaceVariant}
        accessibilityLabel={t('timeline.pickerPlaceholder')}
        style={[
          local.input,
          { borderColor: theme.color.border, borderRadius: theme.radius.control, color: theme.color.onBackground, backgroundColor: theme.color.surface, minHeight: theme.touchTarget, fontSize: theme.text.bodySize },
        ]}
      />
      {keywordInvalid(draft) ? <Notice tone="error" text={t('search.keywordShort')} /> : null}
      <ListNotes cards={cards} />
    </View>
  );

  return (
    <FlatList
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={{ padding: theme.spacing.inline, paddingBottom: 32 }}
      data={cards}
      keyExtractor={(card) => card.slug}
      keyboardShouldPersistTaps="handled"
      ItemSeparatorComponent={Separator}
      ListHeaderComponent={header}
      renderItem={({ item }) => <HeritageTile card={item} horizontal onPress={() => router.push({ pathname: '/di-san/[slug]/dong-thoi-gian', params: { slug: item.slug } })} />}
      onEndReachedThreshold={0.4}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      ListEmptyComponent={
        query.isLoading ? (
          <Loading label={t('common.loading')} />
        ) : query.isError ? (
          <ErrorState message={t('common.offline')} retryLabel={t('common.retry')} onRetry={() => void query.refetch()} />
        ) : (
          <EmptyState message={t('common.noResults')} />
        )
      }
      ListFooterComponent={
        query.hasNextPage ? <Button label={t('search.loadMore')} variant="secondary" loading={query.isFetchingNextPage} onPress={() => void query.fetchNextPage()} full /> : null
      }
    />
  );
}

const local = StyleSheet.create({
  input: { borderWidth: 1.5, paddingHorizontal: 14 },
});
