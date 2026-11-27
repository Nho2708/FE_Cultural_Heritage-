import { albumGroups, isNewCard, lockedCardHint } from '@dsvhvn/dung-chung';
import type { StudentAlbum, StudentAlbumCard } from '@dsvhvn/dung-chung/api';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Photo } from '../../components/Heritage';
import { Button, Txt } from '../../components/ui';
import { useTheme } from '../../theme/ThemeProvider';
import { BIG, GUTTER, IconCircleButton, Mascot, SmallTag, SpeakButton } from './parts';

// Album di sản của em (cấp 1): mỗi di sản của bài em học xong là một thẻ, không quay số, không hộp quà ngẫu nhiên. Đầu trang có nút quay về,
// tên trang và số thẻ đã có; hàng chip lọc theo nhóm dễ hiểu ("Tất cả" và các nhóm của album). Lưới hai cột trên điện thoại, ba bốn cột trên máy
// tính bảng. Thẻ đã có: ảnh, tên 18 px, nhãn nhóm, nhãn "Mới" khi vừa nhận trong 7 ngày; chạm mở hộp thoại có ảnh lớn, mẩu chuyện ngắn đọc to
// được và lối "Xem về di sản này". Thẻ chưa có: viền đứt, dấu "?", tên và bài sẽ mở thẻ đó.

const ALL = '';

function CardSheet({ card, onClose, onOpenHeritage }: { card: StudentAlbumCard; onClose: () => void; onOpenHeritage: (slug: string) => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const story = card.shortDescription?.trim() ?? '';
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={local.backdrop}>
        <View accessibilityViewIsModal style={[local.sheet, { backgroundColor: theme.color.background, paddingBottom: 20 + insets.bottom }]}>
          <View style={local.sheetHead}>
            <Txt variant="heading" accessibilityRole="header" numberOfLines={2} style={{ flex: 1, fontSize: 26, lineHeight: 32 }}>
              {card.name}
            </Txt>
            <IconCircleButton icon="close" label={t('hs.one.close')} onPress={onClose} />
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <Photo url={card.thumbnailUrl} width={960} height={220} style={{ borderRadius: theme.radius.card }} />
            <SmallTag text={card.groupName} />
            {story ? (
              <View style={local.story}>
                <Text style={{ flex: 1, fontSize: 21, lineHeight: 33, color: theme.color.onBackground }}>{story}</Text>
                <SpeakButton text={`${card.name}. ${story}`} label={t('hs.one.speakCard', { name: card.name })} />
              </View>
            ) : null}
            <Button label={t('hs.one.aboutHeritage')} variant="secondary" onPress={() => onOpenHeritage(card.slug)} full style={{ minHeight: BIG }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function CardTile({ card, width, now, onOpen }: { card: StudentAlbumCard; width: number; now: number; onOpen: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  if (!card.collected) {
    const hint = lockedCardHint(card);
    return (
      <View
        accessible
        accessibilityLabel={t('hs.one.lockedCard', { name: card.name, hint })}
        style={[local.card, local.locked, { width, borderColor: theme.color.border, backgroundColor: theme.color.surfaceContainerLow, borderRadius: theme.radius.card }]}
      >
        <View style={[local.question, { borderColor: theme.color.border }]}>
          <Text style={{ fontSize: 36, lineHeight: 42, fontWeight: '800', color: theme.color.onSurfaceVariant }}>?</Text>
        </View>
        <Text numberOfLines={2} style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', color: theme.color.onBackground, textAlign: 'center' }}>
          {card.name}
        </Text>
        <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 20, color: theme.color.onSurfaceVariant, textAlign: 'center' }}>
          {hint}
        </Text>
      </View>
    );
  }
  const fresh = isNewCard(card, now);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('hs.one.openCard', { name: card.name })}${fresh ? `, ${t('hs.one.newCard')}` : ''}`}
      onPress={onOpen}
      style={({ pressed }) => [local.card, { width, borderColor: theme.color.accent, backgroundColor: theme.color.surface, borderRadius: theme.radius.card, opacity: pressed ? 0.85 : 1 }]}
    >
      <Photo url={card.thumbnailUrl} width={500} height={112} style={{ borderRadius: 16 }} />
      {fresh ? (
        <View style={local.newBadge}>
          <SmallTag text={t('hs.one.newCard')} tone="sun" />
        </View>
      ) : null}
      <Text numberOfLines={2} style={{ fontSize: 18, lineHeight: 23, fontWeight: '700', color: theme.color.onBackground }}>
        {card.name}
      </Text>
      <Text numberOfLines={2} style={{ fontSize: 14, lineHeight: 19, fontWeight: '600', color: theme.color.onSurfaceVariant }}>
        {card.groupName}
      </Text>
    </Pressable>
  );
}

export function AlbumScreen({ album, onBack, onOpenHeritage, now: fixedNow }: { album: StudentAlbum; onBack: () => void; onOpenHeritage: (slug: string) => void; now?: number }) {
  // Mốc "bây giờ" lấy một lần khi mở trang để nhãn "Mới" không đổi giữa các lần vẽ.
  const [now] = useState(() => fixedNow ?? Date.now());
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [group, setGroup] = useState(ALL);
  const [open, setOpen] = useState<StudentAlbumCard | null>(null);
  const groups = albumGroups(album.cards);
  const cards = group === ALL ? album.cards : album.cards.filter((card) => card.groupName === group);
  const columns = width >= 900 ? 4 : width >= 600 ? 3 : 2;
  const gap = 12;
  const cardWidth = Math.floor((Math.min(width, 1100) - GUTTER * 2 - gap * (columns - 1)) / columns);

  return (
    <View style={[local.fill, { backgroundColor: theme.color.background }]}>
      <View style={[local.head, { paddingTop: insets.top + 10 }]}>
        <IconCircleButton icon="arrow-back" label={t('hs.one.backHome')} onPress={onBack} />
        <Text accessibilityRole="header" style={{ flex: 1, fontSize: 26, lineHeight: 32, fontWeight: '800', color: theme.color.onBackground }}>
          {t('hs.one.albumTitle')}
        </Text>
        <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '800', color: theme.color.primary }}>{t('hs.one.albumCount2', { collected: album.collected, total: album.total })}</Text>
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32, gap: 16 }}>
        {groups.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityLabel={t('hs.one.filter')} contentContainerStyle={local.chips}>
            {[ALL, ...groups].map((name) => {
              const on = group === name;
              return (
                <Pressable
                  key={name || 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setGroup(name)}
                  style={[local.chip, { backgroundColor: on ? theme.color.primary : theme.color.surface, borderColor: on ? theme.color.primary : theme.color.border }]}
                >
                  <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '700', color: on ? theme.color.onPrimary : theme.color.onBackground }}>{name || t('hs.one.all')}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
        {album.collected === 0 ? (
          <View style={[local.empty, { backgroundColor: theme.color.surfaceContainerLow, borderRadius: theme.radius.card }]}>
            <Mascot size={72} mood="chao" />
            <Txt style={{ flex: 1 }}>{t('hs.one.albumEmpty')}</Txt>
          </View>
        ) : null}
        <View style={[local.grid, { gap }]}>
          {cards.map((card) => (
            <CardTile key={card.heritageId} card={card} width={cardWidth} now={now} onOpen={() => setOpen(card)} />
          ))}
        </View>
      </ScrollView>
      {open ? (
        <CardSheet
          card={open}
          onClose={() => setOpen(null)}
          onOpenHeritage={(slug) => {
            setOpen(null);
            onOpenHeritage(slug);
          }}
        />
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  fill: { flex: 1 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: GUTTER, paddingBottom: 12 },
  chips: { gap: 10, paddingHorizontal: GUTTER },
  chip: { minHeight: 48, paddingHorizontal: 16, borderRadius: 999, borderWidth: 2, justifyContent: 'center' },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, marginHorizontal: GUTTER },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GUTTER },
  card: { padding: 10, gap: 6, borderWidth: 2 },
  locked: { borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', minHeight: 200 },
  question: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  newBadge: { position: 'absolute', top: 16, right: 16 },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { maxHeight: '90%', paddingHorizontal: GUTTER, paddingTop: 18, gap: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  story: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
});
