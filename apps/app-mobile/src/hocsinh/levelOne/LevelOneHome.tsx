import { daysLearnedText, LEVEL_ONE_FIXED_PHRASES, levelOneGreetingSpeech, levelOneResume, nextLevelOneLesson } from '@dsvhvn/dung-chung';
import type { StudentHome } from '@dsvhvn/dung-chung/api';
import { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Photo } from '../../components/Heritage';
import { Button, Txt } from '../../components/ui';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { usePrefetchSpeech } from '../../speech/useCloudNarration';
import { useTheme } from '../../theme/ThemeProvider';
import { LessonPath } from './LessonPath';
import { BIG, GUTTER, Mascot, SpeakButton, StatPill } from './parts';

// Trang học cấp 1 (một bố cục cho cả khối 1-5): lời chào của linh vật kèm lời cổ vũ của máy chủ và nút nghe, hai ô số (sao, ngày đã học),
// thẻ bài thầy cô giao (hoặc "Em đang chơi dở"), con đường các bài của lớp kết thúc ở trạm Album di sản, lối phụ nhập mã và thẻ "Lớp của em".
// Bài thầy cô đã xuất bản tự hiện trên con đường nên em không phải gõ mã. Vào trang thì tự cuộn tới trạm em nên học bây giờ.

export interface LevelOneHomeProps {
  home: StudentHome;
  schoolName: string | null;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenLesson: (code: string) => void;
  onPlayOn: (quizId: number) => void;
  onAlbum: () => void;
  onEnterCode: () => void;
}

/** Tên gọi của em (chữ cuối của họ tên, "Nguyễn Văn Minh" thành "Minh"). */
export function givenName(fullName: string | null | undefined): string {
  const parts = (fullName ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.at(-1) ?? 'em';
}

function TodayCard({ home, onOpenLesson, onPlayOn, onAlbum }: Pick<LevelOneHomeProps, 'home' | 'onOpenLesson' | 'onPlayOn' | 'onAlbum'>) {
  const theme = useTheme();
  const { t } = useTranslation();
  const resume = levelOneResume(home);
  const next = nextLevelOneLesson(home);
  const box = [local.today, { backgroundColor: theme.color.surfaceContainerLow, borderColor: theme.color.accent, borderRadius: theme.radius.card }];
  const label = (text: string) => <Text style={{ fontSize: 16, lineHeight: 22, fontWeight: '700', color: theme.color.onSurfaceVariant }}>{text}</Text>;

  if (resume) {
    const thumb = home.classLessons.find((lesson) => lesson.lessonId === resume.lessonId)?.thumbnailUrl ?? null;
    return (
      <View style={box}>
        <View style={local.todayRow}>
          {thumb ? <Photo url={thumb} width={330} height={72} style={local.thumb} /> : <Mascot size={72} mood="chao" />}
          <View style={local.grow}>
            {label(t('hs.one.playingTitle'))}
            <Txt variant="heading" style={local.todayTitle} numberOfLines={2}>
              {resume.quizName ?? resume.lessonTitle ?? t('hs.one.untitled')}
            </Txt>
          </View>
        </View>
        <Button label={t('hs.one.playOn')} onPress={() => onPlayOn(resume.quizId)} full style={{ minHeight: BIG }} />
      </View>
    );
  }
  if (next) {
    return (
      <View style={box}>
        <View style={local.todayRow}>
          {next.thumbnailUrl ? <Photo url={next.thumbnailUrl} width={330} height={72} style={local.thumb} /> : <Mascot size={72} mood="chao" />}
          <View style={local.grow}>
            {label(home.teacherName ? t('hs.one.assignedBy', { teacher: home.teacherName }) : t('hs.one.assignedDefault'))}
            <Txt variant="heading" style={local.todayTitle} numberOfLines={2}>
              {next.title ?? t('hs.one.untitled')}
            </Txt>
          </View>
        </View>
        <Button label={t('hs.one.learnThis')} onPress={() => onOpenLesson(next.accessCode)} full style={{ minHeight: BIG }} />
      </View>
    );
  }
  if (home.classLessons.length === 0) return null;
  return (
    <View style={box}>
      <View style={local.todayRow}>
        <Mascot size={72} mood="chuc-mung" />
        <Txt variant="heading" style={[local.todayTitle, local.grow]}>
          {t('hs.one.allDone')}
        </Txt>
      </View>
      <Button label={t('hs.one.viewAlbum')} onPress={onAlbum} full style={{ minHeight: BIG }} />
    </View>
  );
}

function ClassCard({ home, schoolName }: { home: StudentHome; schoolName: string | null }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const rows: Array<[string, string | null]> = [
    [t('hs.one.classLabel'), home.className],
    [t('hs.one.teacher'), home.teacherName],
    [t('hs.one.school'), schoolName],
    [t('hs.one.studentCode'), home.studentCode],
  ];
  return (
    <View style={[local.classCard, { backgroundColor: theme.color.surface, borderColor: theme.color.border, borderRadius: theme.radius.card }]}>
      <Txt variant="title" accessibilityRole="header">
        {t('hs.one.myClass')}
      </Txt>
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <View key={label} style={local.classRow} accessible accessibilityLabel={`${label}: ${value}`}>
            <Text style={{ fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant, width: 104 }}>{label}</Text>
            <Text style={{ flex: 1, fontSize: 18, lineHeight: 24, fontWeight: '700', color: theme.color.onBackground }}>{value}</Text>
          </View>
        ))}
    </View>
  );
}

export function LevelOneHome(props: LevelOneHomeProps) {
  const { home, schoolName, refreshing, onRefresh, onOpenLesson, onAlbum, onEnterCode } = props;
  const theme = useTheme();
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scroll = useRef<ScrollView>(null);
  // Vị trí của con đường trong trang và của trạm hiện tại trong con đường; hai sự kiện đo đến theo thứ tự bất kỳ nên giữ trong ref.
  const pathTop = useRef<number | null>(null);
  const stationY = useRef<number | null>(null);
  const scrolled = useRef(false);
  const cheer = home.cheer ?? '';
  const stars = home.totalStars ?? 0;
  const days = daysLearnedText(home.streakDays);
  // Lời chào đọc to không có tên em (tên học sinh không gửi sang dịch vụ giọng đọc). Vào trang học thì nhờ máy chủ tạo trước tiếng lời chào, lời cổ vũ và các
  // câu cố định của cấp 1 (hướng dẫn, phản hồi, số sao).
  const greetingSpeech = levelOneGreetingSpeech(cheer);
  usePrefetchSpeech([greetingSpeech, ...LEVEL_ONE_FIXED_PHRASES]);

  // Tự cuộn tới trạm hiện tại khi đã biết vị trí của con đường và của trạm (một lần mỗi lần vào trang).
  const maybeScroll = useCallback(() => {
    const top = pathTop.current;
    const y = stationY.current;
    if (scrolled.current || top === null || y === null) return;
    scrolled.current = true;
    scroll.current?.scrollTo({ y: Math.max(0, top + y - 220), animated: reduced === false });
  }, [reduced]);

  return (
    <ScrollView
      ref={scroll}
      style={{ backgroundColor: theme.color.background }}
      contentContainerStyle={local.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.primary} />}
    >
      <View style={{ gap: 14 }}>
        <View style={local.headRow}>
          <Mascot size={68} mood="chao" />
          <Text accessibilityRole="header" style={[local.hello, { color: theme.color.onBackground }]} numberOfLines={2}>
            {t('hs.one.hello', { name: givenName(home.fullName) })}
          </Text>
        </View>
        {cheer ? (
          <View style={local.cheerRow}>
            <Txt style={local.grow}>{cheer}</Txt>
            <SpeakButton text={greetingSpeech} label={t('hs.one.speakCheer')} soft />
          </View>
        ) : null}
        <View style={local.stats} accessible accessibilityLabel={t('hs.one.statsLabel', { stars, days })}>
          <StatPill icon="star" text={t('hs.one.starsStat', { count: stars })} />
          <StatPill icon="calendar" text={days} />
        </View>
      </View>

      <TodayCard {...props} />

      <View
        onLayout={(event) => {
          pathTop.current = event.nativeEvent.layout.y;
          maybeScroll();
        }}
      >
        <LessonPath
          home={home}
          onOpen={onOpenLesson}
          onAlbum={onAlbum}
          onCurrentY={(y) => {
            stationY.current = y;
            maybeScroll();
          }}
        />
      </View>

      <View style={[local.codeBox, { borderColor: theme.color.border, borderRadius: 18 }]}>
        <Text style={{ flex: 1, fontSize: 16, lineHeight: 22, color: theme.color.onSurfaceVariant }}>{t('hs.one.hasCode')}</Text>
        <Button label={t('hs.one.enterCode')} variant="secondary" onPress={onEnterCode} style={{ minHeight: 56 }} />
      </View>

      <ClassCard home={home} schoolName={schoolName} />
    </ScrollView>
  );
}

const local = StyleSheet.create({
  content: { paddingHorizontal: GUTTER, paddingTop: 16, paddingBottom: 40, gap: 20 },
  grow: { flex: 1 },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hello: { flex: 1, fontSize: 28, lineHeight: 36, fontWeight: '800' },
  cheerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  today: { padding: 14, gap: 14, borderWidth: 2 },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  todayTitle: { fontSize: 24, lineHeight: 30 },
  thumb: { width: 96, borderRadius: 14 },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 2, borderStyle: 'dashed' },
  classCard: { padding: 16, gap: 10, borderWidth: 2 },
  classRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
});
