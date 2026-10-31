import { cn, daysLearnedText, LEVEL_ONE_FIXED_PHRASES, levelOneGreetingSpeech, levelOneResume, levelOneStations, nextLevelOneLesson, type LevelOneStation } from '@dsvhvn/dung-chung';
import { studentCodeOf, type StudentClassDetail, type StudentHome, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { Illustration, LevelOneButtonLink, LevelOneSpeak, usePrefetchSpeech } from '@dsvhvn/dung-chung/lesson';
import { ErrorState, Icon, LoadingState, type IconName } from '@dsvhvn/dung-chung/ui';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { lessonPath } from '../lessons/lessonData';
import { takeQuizPath } from '../quiz/quizData';
import { useStudentHome } from './useStudentHome';

// Trang học của em — bản cấp 1 (một bố cục cho cả khối 1-5). Đầu trang: linh vật, lời chào, lời cổ vũ của máy chủ có nút nghe, hai ô số
// (sao và ngày đã học). Thẻ "Bài thầy cô giao": bài nên học bây giờ, hoặc lượt chơi đang dở để chơi tiếp, hoặc lời khen khi đã học hết.
// Con đường: các bài thầy cô đã xuất bản cho lớp hiện thẳng theo thứ tự học (không phải gõ mã, không khóa bài nào), cuối đường là album
// di sản. Nhập mã chỉ còn là lối phụ. Màn hình rộng thì lối nhập mã và Lớp của em sang cột phụ. Không emoji, màu lấy từ bộ giao diện cấp 1.

/** Tên gọi của em: chữ cuối của họ tên ("Nguyễn Minh An" → "An"). */
function givenName(fullName: string | null | undefined): string {
  return fullName?.trim().split(/\s+/u).at(-1) || 'em';
}

/** Mã bài học của một bài trên trang học: bài của lớp trước, rồi bài em đã mở. */
function codeOfLesson(home: StudentHome, lessonId: number): string | null {
  return home.classLessons?.find((l) => l.lessonId === lessonId)?.accessCode ?? home.myLessons?.find((l) => l.lessonId === lessonId)?.accessCode ?? null;
}

export function LevelOne({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const home = useStudentHome();
  const name = givenName(user.fullName);
  const greeting = `Chào ${name}!`;
  // Lời chào đọc to không có tên em (tên học sinh không gửi sang dịch vụ giọng đọc).
  const greetingSpeech = levelOneGreetingSpeech(home.data?.cheer);
  // Vào trang học thì nhờ máy chủ tạo trước tiếng lời chào, lời cổ vũ và các câu cố định của cấp 1 (hướng dẫn, phản hồi, số sao).
  usePrefetchSpeech([greetingSpeech, ...LEVEL_ONE_FIXED_PHRASES], true);

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Trang học của em · DiViet</title>
      <div className="mx-auto grid w-full max-w-[1040px] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <header className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Illustration state="chao" className="size-16 rounded-full bg-surface-container-low sm:size-[72px]" />
              <h1 className="min-w-0 flex-1 text-[30px] leading-tight font-bold text-on-surface sm:text-[32px]">{greeting}</h1>
              <LevelOneSpeak text={greetingSpeech} label="Nghe lời chào" size={56} />
            </div>
            {home.data?.cheer && <p className="text-[20px] leading-snug text-on-surface">{home.data.cheer}</p>}
            {home.data && (
              <div className="flex flex-wrap gap-3">
                <StatChip to={pathOf('progress')} icon="star" label={`${home.data.totalStars ?? 0} sao`} filled>
                  {home.data.totalStars ?? 0}
                </StatChip>
                <StatChip to={pathOf('progress')} icon="calendar" label={daysLearnedText(home.data.streakDays)}>
                  {daysLearnedText(home.data.streakDays)}
                </StatChip>
              </div>
            )}
          </header>

          {home.isPending ? (
            <LoadingState rows={3} />
          ) : home.isError ? (
            <ErrorState error={home.error} onRetry={() => void home.refetch()} />
          ) : !home.data ? (
            <LoadingState rows={3} />
          ) : (
            <>
              <TodayCard home={home.data} teacherName={home.data.teacherName ?? classroom.teacherName} />
              {(home.data.classLessons?.length ?? 0) > 0 && <LessonPath home={home.data} />}
            </>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-24">
          <section aria-labelledby="nhap-ma-bai" className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border-2 border-dashed border-border p-4">
            <h2 id="nhap-ma-bai" className="text-[18px] leading-snug font-medium text-on-surface-variant">
              Thầy cô đưa mã bài?
            </h2>
            <LevelOneButtonLink to={pathOf('enterCode')} variant="secondary" size="md">
              <Icon name="key" size={22} />
              Nhập mã
            </LevelOneButtonLink>
          </section>
          <ClassCard user={user} classroom={classroom} />
        </aside>
      </div>
    </section>
  );
}

function StatChip({ to, icon, label, filled, children }: { to: string; icon: IconName; label: string; filled?: boolean; children: string | number }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-secondary-container bg-surface-container-low px-4 text-[20px] font-bold text-on-surface no-underline hover:bg-surface"
    >
      <Icon name={icon} size={24} className={filled ? 'fill-current text-secondary-container stroke-on-secondary-container/40' : 'text-primary'} />
      {children}
    </Link>
  );
}

// ---- Thẻ bài thầy cô giao ----

function TodayCard({ home, teacherName }: { home: StudentHome; teacherName: string | null | undefined }) {
  const resume = levelOneResume(home);
  const lesson = nextLevelOneLesson(home);
  const resumeCode = resume ? codeOfLesson(home, resume.lessonId) : null;
  const shell = 'grid grid-cols-[96px_minmax(0,1fr)] items-center gap-x-4 gap-y-4 rounded-[24px] border-2 border-secondary-container bg-surface-container-low p-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:p-5';

  if (resume) {
    const thumb = home.classLessons?.find((l) => l.lessonId === resume.lessonId)?.thumbnailUrl ?? null;
    return (
      <section aria-labelledby="the-hom-nay" className={shell}>
        <Thumb url={thumb} />
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-on-surface-variant">Em đang chơi dở</p>
          <h2 id="the-hom-nay" className="text-[24px] leading-tight font-bold text-on-surface">
            {resume.quizName ?? resume.lessonTitle ?? 'Bài chơi'}
          </h2>
        </div>
        <LevelOneButtonLink
          to={resumeCode ? takeQuizPath(resumeCode, resume.quizId) : pathOf('enterCode')}
          state={resumeCode ? { confirmed: true } : undefined}
          className="col-span-2 w-full"
        >
          <Icon name="play" size={24} className="fill-current" />
          Chơi tiếp
        </LevelOneButtonLink>
      </section>
    );
  }

  if (lesson) {
    return (
      <section aria-labelledby="the-hom-nay" className={shell}>
        <Thumb url={lesson.thumbnailUrl} />
        <div className="min-w-0">
          <p className="text-[16px] font-bold text-on-surface-variant">{teacherName ? `Bài ${teacherName} giao` : 'Bài thầy cô giao'}</p>
          <h2 id="the-hom-nay" className="text-[24px] leading-tight font-bold text-on-surface">
            {lesson.title ?? 'Bài học'}
          </h2>
        </div>
        <LevelOneButtonLink to={lessonPath(lesson.accessCode)} className="col-span-2 w-full">
          <Icon name="play" size={24} className="fill-current" />
          Học bài này
        </LevelOneButtonLink>
      </section>
    );
  }

  if ((home.classLessons?.length ?? 0) > 0) {
    return (
      <section aria-labelledby="the-hom-nay" className="flex flex-col items-center gap-4 rounded-[24px] border-2 border-secondary-container bg-surface-container-low p-5 text-center">
        <Illustration state="chuc-mung" className="size-24 rounded-full bg-surface" />
        <h2 id="the-hom-nay" className="text-[24px] leading-tight font-bold text-on-surface">
          Em học hết các bài rồi!
        </h2>
        <LevelOneButtonLink to={pathOf('album')} className="w-full sm:w-auto">
          <Icon name="cards" size={24} />
          Xem album
        </LevelOneButtonLink>
      </section>
    );
  }

  return (
    <section aria-labelledby="the-hom-nay" className="flex items-center gap-4 rounded-[24px] border-2 border-dashed border-border bg-surface p-5">
      <Illustration state="trong" className="size-20 rounded-full bg-surface-container-low" />
      <h2 id="the-hom-nay" className="min-w-0 flex-1 text-[20px] leading-snug font-bold text-on-surface">
        Chưa có bài nào trên con đường của em.
      </h2>
    </section>
  );
}

function Thumb({ url }: { url: string | null }) {
  return url ? (
    <img src={url} alt="" className="aspect-[4/3] w-full rounded-[16px] border-2 border-surface object-cover" />
  ) : (
    <span className="flex aspect-[4/3] w-full items-center justify-center rounded-[16px] bg-surface text-primary">
      <Icon name="book-open" size={36} />
    </span>
  );
}

// ---- Con đường ----

const ROW = 152;
const DOT = 84;

/** Vị trí ngang (%) của trạm thứ `index`: lần lượt bên trái, bên phải; trạm album ở giữa. */
const xOf = (index: number, album: boolean) => (album ? 50 : index % 2 === 0 ? 30 : 70);

function stationLabel(station: LevelOneStation): string {
  const title = station.lesson.title ?? 'Bài học';
  if (station.state === 'done') return `${title}, đã học xong${station.lesson.stars !== null ? `, ${station.lesson.stars} sao` : ''}`;
  if (station.state === 'current') return `${title}, học tiếp bài này`;
  return title;
}

const STATION_DOT: Record<LevelOneStation['state'], string> = {
  done: 'size-20 bg-primary-container text-on-primary-container shadow-[0_5px_0_var(--dsv-color-border)]',
  current: 'size-[88px] bg-primary text-on-primary ring-[7px] ring-primary/25 shadow-[0_5px_0_var(--dsv-color-primary-active)]',
  open: 'size-20 border-[3px] border-primary/30 bg-surface text-primary shadow-[0_5px_0_var(--dsv-color-border)]',
};

const STATION_ICON: Record<LevelOneStation['state'], IconName> = { done: 'check', current: 'play', open: 'book-open' };

function LessonPath({ home }: { home: StudentHome }) {
  const stations = levelOneStations(home);
  const currentRef = useRef<HTMLAnchorElement>(null);
  const count = stations.length + 1;
  // Chừa chỗ cho bong bóng "Học tiếp" khi trạm nên học là trạm đầu.
  const TOP = stations[0]?.state === 'current' ? 56 : 12;
  const height = TOP + (count - 1) * ROW + 132;
  const points = Array.from({ length: count }, (_, i) => ({ x: xOf(i, i === count - 1), y: TOP + i * ROW + DOT / 2 }));
  const road = points
    .map((p, i) => {
      if (i === 0) return `M${p.x} ${p.y}`;
      const prev = points[i - 1]!;
      const mid = (prev.y + p.y) / 2;
      return `C${prev.x} ${mid} ${p.x} ${mid} ${p.x} ${p.y}`;
    })
    .join(' ');

  // Vào trang thì cuộn tới trạm nên học, nếu trạm đó đang nằm dưới mép màn hình. Trạm nên học là trạm đầu thì không cuộn: thẻ bài được giao
  // ngay trên đã dẫn tới đúng bài đó, cuộn xuống chỉ làm mất lời chào.
  const firstIsCurrent = stations[0]?.state === 'current';
  useEffect(() => {
    const element = currentRef.current;
    if (firstIsCurrent || !element || typeof element.scrollIntoView !== 'function') return;
    if (element.getBoundingClientRect().bottom <= window.innerHeight) return;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    element.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  }, [firstIsCurrent]);

  const collected = home.albumCollected ?? 0;

  return (
    <section aria-labelledby="con-duong" className="flex flex-col gap-2">
      <h2 id="con-duong" className="text-[22px] font-bold text-on-surface">
        Con đường bài học
      </h2>
      <ol className="relative mx-auto w-full max-w-[520px]" style={{ height }}>
        <svg aria-hidden="true" className="absolute inset-0 size-full" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
          <path d={road} fill="none" stroke="var(--dsv-color-border)" strokeOpacity="0.55" strokeWidth="22" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path d={road} fill="none" stroke="var(--dsv-color-surface)" strokeWidth="3" strokeDasharray="2 12" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </svg>
        {stations.map((station, index) => (
          <li
            key={station.lesson.lessonId}
            className="absolute flex w-[46%] max-w-[190px] -translate-x-1/2 justify-center"
            style={{ left: `${xOf(index, false)}%`, top: TOP + index * ROW - (station.state === 'current' ? 2 : 0) }}
          >
            <Link
              ref={station.state === 'current' ? currentRef : undefined}
              to={lessonPath(station.lesson.accessCode)}
              aria-label={stationLabel(station)}
              aria-current={station.state === 'current' ? 'step' : undefined}
              className="group relative flex flex-col items-center gap-2 rounded-[20px] text-center no-underline"
            >
              {station.state === 'current' && (
                <span aria-hidden="true" className="dsv-bob absolute bottom-full left-1/2 mb-3 rounded-[14px] border-2 border-secondary-container bg-surface px-4 py-1 text-[17px] font-bold whitespace-nowrap text-on-surface shadow-1">
                  Học tiếp
                </span>
              )}
              <span aria-hidden="true" className={cn('flex items-center justify-center rounded-full transition-transform motion-safe:group-active:translate-y-0.5', STATION_DOT[station.state])}>
                <Icon name={STATION_ICON[station.state]} size={36} strokeWidth={station.state === 'done' ? 3 : 2.2} className={station.state === 'current' ? 'fill-current' : undefined} />
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  'line-clamp-2 rounded-[8px] bg-background px-1.5 text-[18px] leading-tight',
                  station.state === 'open' ? 'font-medium text-on-surface-variant' : 'font-bold text-on-surface',
                )}
              >
                {station.lesson.title ?? 'Bài học'}
              </span>
              {station.state === 'done' && station.lesson.stars !== null && (
                <span aria-hidden="true" className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <Icon
                      key={i}
                      name="star"
                      size={20}
                      className={i < (station.lesson.stars ?? 0) ? 'fill-current text-secondary-container stroke-on-secondary-container/40' : 'fill-current text-border stroke-border'}
                    />
                  ))}
                </span>
              )}
            </Link>
          </li>
        ))}
        <li className="absolute flex w-[80%] max-w-[260px] -translate-x-1/2 justify-center" style={{ left: '50%', top: TOP + (count - 1) * ROW }}>
          <Link
            to={pathOf('album')}
            aria-label={`Album di sản, em có ${collected} thẻ`}
            className="group flex flex-col items-center gap-2 rounded-[20px] text-center no-underline"
          >
            <span aria-hidden="true" className="flex size-20 items-center justify-center rounded-full border-[3px] border-dashed border-secondary-container bg-surface-container-low text-primary">
              <Icon name="cards" size={36} />
            </span>
            <span aria-hidden="true" className="rounded-[8px] bg-background px-1.5 text-[18px] leading-tight font-bold whitespace-nowrap text-on-surface">
              {`Album di sản · ${collected} thẻ`}
            </span>
          </Link>
        </li>
      </ol>
    </section>
  );
}

// ---- Lớp của em ----

function ClassCard({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const rows: Array<[string, string | null | undefined]> = [
    ['Lớp', classroom.name],
    ['Thầy cô', classroom.teacherName],
    ['Trường', classroom.organization?.name],
    ['Mã học sinh', studentCodeOf(user)],
  ];
  return (
    <section aria-labelledby="lop-cua-em" className="rounded-[20px] border-2 border-border bg-surface p-4">
      <div className="flex items-center gap-3">
        <h2 id="lop-cua-em" className="min-w-0 flex-1 text-[20px] font-bold text-on-surface">
          Lớp của em
        </h2>
        <LevelOneSpeak
          text={`Em học lớp ${classroom.name}.${classroom.teacherName ? ` Thầy cô của em là ${classroom.teacherName}.` : ''}`}
          label="Nghe thông tin lớp của em"
          size={48}
          soft
        />
      </div>
      <dl className="mt-3 flex flex-col divide-y divide-border">
        {rows
          .filter((row): row is [string, string] => Boolean(row[1]))
          .map(([label, value]) => (
            <div key={label} className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-[16px] text-on-surface-variant">{label}</dt>
              <dd className={cn('min-w-0 text-right text-[18px] font-bold text-on-surface', label === 'Mã học sinh' && 'font-mono tracking-wider')}>{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  );
}
