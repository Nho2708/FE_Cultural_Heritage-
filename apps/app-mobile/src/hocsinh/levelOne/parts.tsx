import { Ionicons } from '@expo/vector-icons';
import type { StudentAlbumCard } from '@dsvhvn/dung-chung/api';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Photo } from '../../components/Heritage';
import { Txt } from '../../components/ui';
import { useCloudNarration } from '../../speech/useCloudNarration';
import { useTheme } from '../../theme/ThemeProvider';

// Các mảnh giao diện dùng chung của khu học cấp 1: linh vật, nút loa tròn, nút biểu tượng tròn, hàng sao, ô số, thẻ di sản, khối "Về nhà hỏi
// bố mẹ nhé". Mọi màu đọc từ bộ giao diện cấp 1 (xanh dương, vàng, nền kem), không emoji; vùng chạm theo mức của lớp 1-2 (nút chính 64,
// nút loa 56-72, nút quay về 56) vì to hơn không hại các em lớp 5.

type IconName = keyof typeof Ionicons.glyphMap;

/** Chiều cao nút chính của cấp 1. */
export const BIG = 64;
/** Lề hai bên của màn hình cấp 1. */
export const GUTTER = 16;

export type MascotMood = 'chao' | 'chuc-mung' | 'dong-vien';

/**
 * Linh vật vẽ bằng khối tròn theo màu của bộ giao diện (không ảnh, không emoji): tai, mặt, mắt, má, miệng cười. `dong-vien` cười nhẹ,
 * `chuc-mung` có thêm tia sáng. Chỉ để trang trí nên ẩn khỏi trình đọc màn hình.
 */
export function Mascot({ size = 64, mood = 'chao' }: { size?: number; mood?: MascotMood }) {
  const theme = useTheme();
  const k = size / 120;
  const line = theme.color.onBackground;
  const stroke = Math.max(1.5, 3.5 * k);
  const circle = (cx: number, cy: number, r: number, style: ViewStyle) => ({ position: 'absolute' as const, left: (cx - r) * k, top: (cy - r) * k, width: 2 * r * k, height: 2 * r * k, borderRadius: r * k, ...style });
  const oval = (cx: number, cy: number, rx: number, ry: number, style: ViewStyle) => ({ position: 'absolute' as const, left: (cx - rx) * k, top: (cy - ry) * k, width: 2 * rx * k, height: 2 * ry * k, borderRadius: Math.max(rx, ry) * k, ...style });
  return (
    <View style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {mood === 'chuc-mung' ? (
        <>
          <View style={circle(14, 44, 3.5, { backgroundColor: theme.color.accent })} />
          <View style={circle(106, 44, 3.5, { backgroundColor: theme.color.accent })} />
          <View style={circle(60, 10, 3.5, { backgroundColor: theme.color.accent })} />
        </>
      ) : null}
      <View style={circle(34, 32, 14, { backgroundColor: theme.color.accent, borderWidth: stroke, borderColor: line })} />
      <View style={circle(86, 32, 14, { backgroundColor: theme.color.accent, borderWidth: stroke, borderColor: line })} />
      <View style={circle(34, 32, 6, { backgroundColor: theme.color.surfaceContainerLow })} />
      <View style={circle(86, 32, 6, { backgroundColor: theme.color.surfaceContainerLow })} />
      <View style={circle(60, 64, 38, { backgroundColor: theme.color.accent, borderWidth: stroke, borderColor: line })} />
      <View style={oval(45, 56, 5, 6.5, { backgroundColor: line })} />
      <View style={oval(75, 56, 5, 6.5, { backgroundColor: line })} />
      <View style={circle(43.5, 53.5, 1.8, { backgroundColor: theme.color.surface })} />
      <View style={circle(73.5, 53.5, 1.8, { backgroundColor: theme.color.surface })} />
      <View style={oval(33, 68, 6.5, 4, { backgroundColor: theme.color.incorrectContainer })} />
      <View style={oval(87, 68, 6.5, 4, { backgroundColor: theme.color.incorrectContainer })} />
      <View style={oval(60, 63, 4, 3, { backgroundColor: theme.color.onAccent })} />
      {mood === 'dong-vien' ? (
        <View style={{ position: 'absolute', left: 49 * k, top: 70 * k, width: 22 * k, height: 8 * k, borderBottomWidth: stroke, borderColor: line, borderBottomLeftRadius: 11 * k, borderBottomRightRadius: 11 * k }} />
      ) : (
        <View style={{ position: 'absolute', left: 47 * k, top: 70 * k, width: 26 * k, height: 13 * k, backgroundColor: theme.color.onAccent, borderBottomLeftRadius: 13 * k, borderBottomRightRadius: 13 * k }} />
      )}
    </View>
  );
}

/** Nút tròn có biểu tượng (quay về, tạm dừng, đóng): nền trắng, viền xanh nhạt, biểu tượng xanh. */
export function IconCircleButton({ icon, label, onPress, size = 56, style }: { icon: IconName; label: string; onPress: () => void; size?: number; style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [local.round, { width: size, height: size, borderRadius: size / 2, borderColor: theme.color.primaryContainer, backgroundColor: theme.color.surface, opacity: pressed ? 0.8 : 1 }, style]}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={theme.color.primary} />
    </Pressable>
  );
}

/**
 * Nút loa tròn vẽ theo trạng thái đọc; `soft` là nút phụ (nền xanh nhạt) cho lời hướng dẫn. `preparing`: đang chờ máy chủ tạo tiếng, nút hiện vòng xoay và
 * nhãn "Đang chuẩn bị giọng đọc" (chạm vào là dừng).
 */
export function SpeakCircle({ speaking, preparing = false, onPress, label, size = 56, soft = false }: { speaking: boolean; preparing?: boolean; onPress: () => void; label: string; size?: number; soft?: boolean }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const color = soft ? theme.color.primary : theme.color.onPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={preparing ? t('hs.one.preparing') : speaking ? t('hs.one.stop') : label}
      accessibilityState={{ busy: speaking }}
      onPress={onPress}
      style={({ pressed }) => [
        local.round,
        { width: size, height: size, borderRadius: size / 2, borderWidth: 0, backgroundColor: soft ? theme.color.primaryContainer : theme.color.primary, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {preparing ? <ActivityIndicator color={color} /> : <Ionicons name={speaking ? 'stop' : 'volume-high'} size={Math.round(size * 0.48)} color={color} />}
    </Pressable>
  );
}

/** Đọc to khi `auto` bật. Khối dùng nút loa dựng lại theo `key` để mỗi câu chỉ tự đọc một lần. */
export function useAutoSpeak(narration: { playWhenReady: () => Promise<void> }, auto: boolean) {
  const { playWhenReady } = narration;
  useEffect(() => {
    if (auto) void playWhenReady();
  }, [auto, playWhenReady]);
}

/** Nút loa đọc một đoạn bằng giọng tiếng Việt của máy chủ (cả đoạn là một lời xin, để máy chủ nhớ tiếng cho lần sau). Chưa có tiếng thì đọc bằng giọng điện thoại nếu máy có giọng tiếng Việt, không thì báo ngắn. */
export function SpeakButton({ text, label, size = 56, soft = false, auto = false }: { text: string; label: string; size?: number; soft?: boolean; auto?: boolean }) {
  const narration = useCloudNarration(text, 'whole');
  useAutoSpeak(narration, auto);
  if (narration.sentences.length === 0) return null;
  const speaking = narration.status === 'playing';
  return <SpeakCircle speaking={speaking} preparing={narration.preparing} onPress={() => (speaking ? narration.stop() : narration.play())} label={label} size={size} soft={soft} />;
}

/** Hàng sao: sao đầy màu vàng, sao chưa có chỉ có viền. */
export function StarRow({ count, max = 3, size = 20, label }: { count: number; max?: number; size?: number; label?: string }) {
  const theme = useTheme();
  const filled = Math.min(max, Math.max(0, Math.round(count)));
  return (
    <View style={[local.row, { gap: Math.max(2, size / 6) }]} accessible={label !== undefined} accessibilityLabel={label} importantForAccessibility={label ? 'yes' : 'no-hide-descendants'}>
      {Array.from({ length: max }, (_, index) => (
        <Ionicons key={index} name={index < filled ? 'star' : 'star-outline'} size={size} color={index < filled ? theme.color.accent : theme.color.border} />
      ))}
    </View>
  );
}

/** Ô số nhỏ ở đầu trang (sao, ngày đã học): biểu tượng và chữ 18 px trên nền kem viền vàng. */
export function StatPill({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={[local.pill, { backgroundColor: theme.color.surfaceContainerLow, borderColor: theme.color.accent }]}>
      <Ionicons name={icon} size={24} color={icon === 'star' ? theme.color.accent : theme.color.primary} />
      <Text style={{ fontSize: 18, lineHeight: 24, fontWeight: '800', color: theme.color.onBackground }}>{text}</Text>
    </View>
  );
}

/** Nhãn nhỏ chữ thường 14 px (nhóm thẻ, huy hiệu, "Mới"). */
export function SmallTag({ text, tone = 'soft' }: { text: string; tone?: 'soft' | 'sun' }) {
  const theme = useTheme();
  return (
    <View style={[local.tag, { backgroundColor: tone === 'sun' ? theme.color.accent : theme.color.primaryContainer }]}>
      <Text style={{ fontSize: 14, lineHeight: 18, fontWeight: '700', color: tone === 'sun' ? theme.color.onAccent : theme.color.onPrimaryContainer }}>{text}</Text>
    </View>
  );
}

/** Thẻ di sản (bước Nhận thẻ, trang kết quả): ảnh, tên, một dòng ghi chú. */
export function HeritageCardTile({ card, note, onPress }: { card: Pick<StudentAlbumCard, 'name' | 'thumbnailUrl'>; note: string; onPress?: () => void }) {
  const theme = useTheme();
  const body = (
    <View style={[local.cardTile, { backgroundColor: theme.color.surface, borderColor: theme.color.accent, borderRadius: theme.radius.card }]}>
      <Photo url={card.thumbnailUrl} width={330} height={84} style={{ width: 112, borderRadius: 16 }} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="title" numberOfLines={2}>
          {card.name}
        </Txt>
        <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '600', color: theme.color.onSurfaceVariant }}>{note}</Text>
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${card.name}. ${note}`} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
      {body}
    </Pressable>
  );
}

/** Lời đọc to của khối câu mang về nhà: lời nhắc rồi câu hỏi. */
export function takeHomeSpeech(title: string, text: string): string {
  return `${title}. ${text}`;
}

/** Khối "Về nhà hỏi bố mẹ nhé" và câu mang về nhà, có nút nghe. */
export function TakeHome({ text }: { text: string }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const title = t('hs.one.takeHomeTitle');
  return (
    <View style={[local.takeHome, { backgroundColor: theme.color.surfaceContainerLow, borderColor: theme.color.border, borderRadius: theme.radius.card }]}>
      <SpeakButton text={takeHomeSpeech(title, text)} label={t('hs.one.speakTakeHome')} soft />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="label">{title}</Txt>
        <Txt>{text}</Txt>
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  round: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 999, borderWidth: 2 },
  tag: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  cardTile: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderWidth: 2 },
  takeHome: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, padding: 16, borderWidth: 2 },
});
