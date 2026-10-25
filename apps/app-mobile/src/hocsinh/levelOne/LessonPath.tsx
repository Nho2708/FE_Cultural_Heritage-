import { Ionicons } from '@expo/vector-icons';
import { levelOneStations, type LevelOneStation } from '@dsvhvn/dung-chung';
import type { StudentHome } from '@dsvhvn/dung-chung/api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { useTheme } from '../../theme/ThemeProvider';
import { StarRow } from './parts';
import { pathHeight, roadSegments, stationPoints, type PathPoint } from './pathLayout';

// Con đường các bài học của lớp ở trang học cấp 1: mỗi bài thầy cô đã xuất bản là một trạm theo đúng thứ tự học, không khóa bài nào.
// Trạm đã xong có dấu tích và sao nhỏ, trạm hiện tại nền xanh có vòng sáng và bong bóng "Học tiếp", trạm còn lại nhạt hơn nhưng vẫn bấm được.
// Cuối đường là trạm Album di sản. Trạng thái thể hiện bằng hình nên em chưa đọc được chữ vẫn hiểu.

const DOT = 80;
const DOT_NOW = 88;
const ROAD = 22;
const SLOT = 150;
const ALBUM_SLOT = 240;

function Road({ points }: { points: PathPoint[] }) {
  const theme = useTheme();
  const segments = useMemo(() => roadSegments(points, 18), [points]);
  return (
    <>
      {segments.map((segment, index) => (
        <View
          key={`r${index}`}
          style={[local.segment, { left: segment.x - (segment.length + 2) / 2, top: segment.y - ROAD / 2, width: segment.length + 2, height: ROAD, backgroundColor: theme.color.border, transform: [{ rotate: `${segment.angle}rad` }] }]}
        />
      ))}
      {segments.map((segment, index) =>
        index % 3 === 0 ? (
          <View key={`d${index}`} style={[local.segment, { left: segment.x - segment.length / 2, top: segment.y - 2, width: segment.length, height: 4, borderRadius: 2, backgroundColor: theme.color.surface, transform: [{ rotate: `${segment.angle}rad` }] }]} />
        ) : null,
      )}
    </>
  );
}

/** Vòng sáng quanh trạm hiện tại; phồng nhẹ theo nhịp, tắt khi máy bật giảm chuyển động. */
function Glow() {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (reduced !== false) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 900, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [reduced, scale]);
  const size = DOT_NOW + 16;
  return <Animated.View pointerEvents="none" style={[local.glow, { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.color.accent, transform: [{ scale }] }]} />;
}

function StationView({ station, point, onPress }: { station: LevelOneStation; point: PathPoint; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { lesson, state } = station;
  const title = lesson.title ?? t('hs.one.untitled');
  const now = state === 'current';
  const size = now ? DOT_NOW : DOT;
  const label =
    state === 'done'
      ? lesson.stars !== null
        ? t('hs.one.stationStars', { title, count: lesson.stars })
        : t('hs.one.stationDone', { title })
      : state === 'current'
        ? t('hs.one.stationCurrent', { title })
        : title;
  const dotStyle =
    state === 'done'
      ? { backgroundColor: theme.color.primary, borderBottomWidth: 5, borderColor: theme.color.primaryActive }
      : state === 'current'
        ? { backgroundColor: theme.color.primary, borderWidth: 4, borderColor: theme.color.surface }
        : { backgroundColor: theme.color.surface, borderWidth: 3, borderColor: theme.color.primaryContainer };
  return (
    <View style={[local.station, { left: point.x - SLOT / 2, top: point.y - DOT_NOW / 2 }]} pointerEvents="box-none">
      {now ? (
        <View style={[local.bubble, { backgroundColor: theme.color.surface, borderColor: theme.color.accent }]} pointerEvents="none">
          <Text style={{ fontSize: 17, lineHeight: 22, fontWeight: '800', color: theme.color.onBackground }}>{t('hs.one.learnNext')}</Text>
        </View>
      ) : null}
      <View style={local.dotSlot}>
        {now ? <Glow /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [local.dot, { width: size, height: size, borderRadius: size / 2, opacity: pressed ? 0.85 : 1 }, dotStyle]}
        >
          <Ionicons name={state === 'done' ? 'checkmark' : state === 'current' ? 'play' : 'book'} size={38} color={state === 'open' ? theme.color.primary : theme.color.onPrimary} />
        </Pressable>
      </View>
      <Text
        numberOfLines={2}
        style={[local.name, { color: state === 'open' ? theme.color.onSurfaceVariant : theme.color.onBackground, fontWeight: state === 'open' ? '600' : '700' }]}
      >
        {title}
      </Text>
      {state === 'done' && lesson.stars !== null ? <StarRow count={lesson.stars} size={18} /> : null}
    </View>
  );
}

function AlbumStation({ point, count, onPress }: { point: PathPoint; count: number; onPress: () => void }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const label = t('hs.one.albumStation', { count });
  return (
    <View style={[local.station, { left: point.x - ALBUM_SLOT / 2, top: point.y - DOT_NOW / 2, width: ALBUM_SLOT }]} pointerEvents="box-none">
      <View style={local.dotSlot}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={onPress}
          style={({ pressed }) => [local.dot, { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: theme.color.surface, borderWidth: 3, borderStyle: 'dashed', borderColor: theme.color.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="albums" size={36} color={theme.color.primary} />
        </Pressable>
      </View>
      <Text numberOfLines={2} style={[local.name, { color: theme.color.onBackground, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

/**
 * Con đường. `onCurrentY` báo tọa độ dọc (trong khung con đường) của trạm em nên học bây giờ, hoặc trạm album khi đã xong hết, để trang học
 * tự cuộn tới đó.
 */
export function LessonPath({ home, onOpen, onAlbum, onCurrentY }: { home: Pick<StudentHome, 'classLessons' | 'albumCollected'>; onOpen: (code: string) => void; onAlbum: () => void; onCurrentY?: (y: number) => void }) {
  const { t } = useTranslation();
  const [width, setWidth] = useState(0);
  const stations = useMemo(() => levelOneStations(home), [home]);
  const count = stations.length + 1;
  const points = useMemo(() => (width > 0 ? stationPoints(count, width) : []), [count, width]);
  const reported = useRef(false);

  useEffect(() => {
    if (reported.current || points.length === 0 || !onCurrentY) return;
    reported.current = true;
    const current = stations.findIndex((station) => station.state === 'current');
    onCurrentY(points[current >= 0 ? current : points.length - 1]!.y);
  }, [points, stations, onCurrentY]);

  return (
    <View accessibilityLabel={t('hs.one.path')} style={{ height: pathHeight(count) }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {points.length > 0 ? (
        <>
          <Road points={points} />
          {stations.map((station, index) => (
            <StationView key={station.lesson.lessonId} station={station} point={points[index]!} onPress={() => onOpen(station.lesson.accessCode)} />
          ))}
          <AlbumStation point={points[points.length - 1]!} count={home.albumCollected ?? 0} onPress={onAlbum} />
        </>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  segment: { position: 'absolute' },
  station: { position: 'absolute', width: SLOT, alignItems: 'center', gap: 6 },
  dotSlot: { width: DOT_NOW + 16, height: DOT_NOW, alignItems: 'center', justifyContent: 'center' },
  dot: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', top: -8, opacity: 0.35 },
  bubble: { position: 'absolute', bottom: '100%', marginBottom: -6, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 2, zIndex: 2 },
  name: { fontSize: 18, lineHeight: 23, textAlign: 'center', paddingHorizontal: 6, borderRadius: 8, overflow: 'hidden' },
});
