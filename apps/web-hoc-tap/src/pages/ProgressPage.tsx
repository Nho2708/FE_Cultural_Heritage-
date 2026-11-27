import { useEffect, useRef, type KeyboardEvent } from 'react';
import { averagePercent, badgeBoard, clampStars, cn, daysLearnedText, formatDate, formatDateTime, formatPercent, formatScore, MESSAGES } from '@dsvhvn/dung-chung';
import type { StudentAttemptRow, StudentProgress } from '@dsvhvn/dung-chung/api';
import { Badge, ButtonLink, ErrorState, Icon, LoadingState, Pagination, TabPanel, Tabs, type IconName } from '@dsvhvn/dung-chung/ui';
import { Illustration, LevelOneButtonLink, LevelOneStars } from '@dsvhvn/dung-chung/lesson';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, useClassroom, whoAmI } from '../learn-home/classroom';
import { useStudentHome } from '../learn-home/useStudentHome';
import { useAuth } from '../lib/auth/context';
import { historyQueryFn, historyQueryKey, progressQueryFn, progressQueryKey, resultPath } from '../quiz/quizData';
import { lessonPath } from '../lessons/lessonData';
import { Bar } from '../quiz/Meters';

// Tiến độ của em. Cấp 1 là "Sao của em": tổng số sao, số ngày đã học, sao từng bài, huy hiệu, danh sách bài đã học, không điểm hay phần trăm,
// một bộ màu cấp 1, không emoji. Cấp 2 và 3 có
// bốn tab: Lịch sử bài làm, Tiến độ (số bài đã làm, bài học hoàn thành, điểm trung bình, biểu đồ điểm theo thời gian), Thành thạo theo di sản
// và Huy hiệu. Số liệu do máy chủ tính; ở đây chỉ trình bày.

const PAGE_SIZE = 10;
const HISTORY_FETCH = 100;

function EmptyHistory({ level }: { level: 1 | 2 | 3 }) {
  if (level === 1) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 rounded-[24px] border-2 border-dashed border-border bg-surface p-8 text-center">
        <Illustration state="trong" className="size-24 rounded-full bg-surface-container-low" />
        <div className="flex flex-col gap-2">
          <h2 className="text-[24px] leading-tight font-bold text-on-surface">Chưa có bài học nào!</h2>
          <p className="text-[20px] leading-snug text-on-surface-variant">Em hãy nhập mã bài học thầy cô đưa để cùng bắt đầu khám phá nhé!</p>
        </div>
        <LevelOneButtonLink to={pathOf('enterCode')}>
          <Icon name="key" size={24} />
          Nhập mã bài học
        </LevelOneButtonLink>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-4 rounded-md border border-dashed border-border-strong p-6">
      <div className="flex items-center gap-4">
        <Illustration state="trong" className={level === 3 ? 'size-14' : undefined} />
        <p className="type-body-m">{MESSAGES.studentNoAttemptsYet}</p>
      </div>
      <ButtonLink to={pathOf('enterCode')} size="md">
        Nhập mã bài học
      </ButtonLink>
    </div>
  );
}

// ---- Biểu đồ điểm theo thời gian ----

function ScoreChart({ rows }: { rows: StudentAttemptRow[] }) {
  const points = rows
    .filter((r) => r.percent !== null)
    .slice(0, 8)
    .reverse();
  if (points.length === 0) return <p className="type-body-m text-on-surface-variant">Chưa có bài làm nào có điểm để vẽ biểu đồ.</p>;
  const W = 680;
  const H = 250;
  const left = 60;
  const right = 50;
  const top = 34;
  const bottom = 52;
  const x = (i: number) => (points.length === 1 ? (left + W - right) / 2 : left + (i * (W - left - right)) / (points.length - 1));
  const y = (p: number) => top + ((100 - p) * (H - top - bottom)) / 100;
  const label = points.map((p) => `${p.quizName}: ${formatPercent(p.percent)}`).join('; ');

  const anchorFor = (i: number) => {
    if (points.length === 1) return 'middle';
    if (i === 0) return 'start';
    if (i === points.length - 1) return 'end';
    return 'middle';
  };

  const textXFor = (i: number) => {
    if (points.length === 1) return x(i);
    if (i === 0) return x(i) - 4;
    if (i === points.length - 1) return x(i) + 4;
    return x(i);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface p-2 shadow-2xs">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full min-w-[500px]">
        <title>{`Điểm theo thời gian. ${label}`}</title>
        <defs>
          <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--dsv-color-primary)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--dsv-color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map((tick) => (
          <g key={tick}>
            <line x1={left} x2={W - right} y1={y(tick)} y2={y(tick)} stroke="var(--dsv-color-border)" strokeWidth="1" strokeDasharray={tick > 0 && tick < 100 ? '4 4' : undefined} />
            <text x={left - 10} y={y(tick) + 4} textAnchor="end" fontSize="11" fill="var(--dsv-color-on-surface-variant)">
              {tick}%
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <polygon
            fill="url(#scoreAreaGradient)"
            points={`${x(0)},${H - bottom} ${points.map((p, i) => `${x(i)},${y(p.percent ?? 0)}`).join(' ')} ${x(points.length - 1)},${H - bottom}`}
          />
        )}
        <polyline fill="none" stroke="var(--dsv-color-primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.percent ?? 0)}`).join(' ')} />
        {points.map((p, i) => {
          const anchor = anchorFor(i);
          const tx = textXFor(i);
          const rawName = p.quizName ?? '';
          const shortName = rawName.length > 20 ? `${rawName.slice(0, 19)}…` : rawName;
          return (
            <g key={p.attemptId}>
              <circle cx={x(i)} cy={y(p.percent ?? 0)} r="5.5" fill="var(--dsv-color-surface)" stroke="var(--dsv-color-primary)" strokeWidth="2.5" />
              <text x={tx} y={y(p.percent ?? 0) - 12} textAnchor={anchor} fontSize="11" fontWeight="600" fill="var(--dsv-color-on-surface)">
                {formatScore(p.score, p.totalPoint)} · {formatPercent(p.percent)}
              </text>
              <text x={tx} y={H - 26} textAnchor={anchor} fontSize="11" fill="var(--dsv-color-on-surface-variant)">
                {formatDate(p.submittedAt)}
              </text>
              <text x={tx} y={H - 11} textAnchor={anchor} fontSize="10.5" fill="var(--dsv-color-on-surface-muted)">
                {shortName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---- Tab của cấp 2 và 3 ----

function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return <Bar className="mt-2" ratio={max > 0 ? value / max : 0} label={label} />;
}

function OverviewTab({ progress, rows }: { progress: StudentProgress; rows: StudentAttemptRow[] }) {
  const average = averagePercent(rows);
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="type-label text-on-surface-variant uppercase">Bài kiểm tra</p>
          <p className="mt-1 flex items-baseline justify-between type-h3">
            <span>Bài kiểm tra đã làm</span>
            <span className="tabular-nums">
              {progress.quizzesSubmitted} / {progress.quizzesPublished}
            </span>
          </p>
          <Meter value={progress.quizzesSubmitted} max={progress.quizzesPublished} label={`Đã làm ${progress.quizzesSubmitted} trên ${progress.quizzesPublished} bài kiểm tra`} />
          <p className="mt-3 type-body-s text-on-surface-variant">Trên {progress.quizzesPublished} bài kiểm tra thầy cô đã phát hành cho lớp.</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="type-label text-on-surface-variant uppercase">Bài học</p>
          <p className="mt-1 flex items-baseline justify-between type-h3">
            <span>Bài học đã hoàn thành</span>
            <span className="tabular-nums">
              {progress.lessonsCompleted} / {progress.lessonsWithQuiz}
            </span>
          </p>
          <Meter value={progress.lessonsCompleted} max={progress.lessonsWithQuiz} label={`Hoàn thành ${progress.lessonsCompleted} trên ${progress.lessonsWithQuiz} bài học`} />
          <p className="mt-3 type-body-s text-on-surface-variant">Bài học hoàn thành khi em đã làm hết các bài kiểm tra đã phát hành của bài.</p>
        </div>
        <div className="rounded-md border border-border bg-surface p-5">
          <p className="type-label text-on-surface-variant uppercase">Điểm trung bình</p>
          <p className="mt-2 type-h1 text-primary">{average === null ? '—' : formatPercent(average)}</p>
          <p className="mt-2 type-body-s text-on-surface-variant">Tính trên {rows.filter((r) => r.percent !== null).length} lượt em đã nộp.</p>
        </div>
      </div>
      <section aria-labelledby="diem-theo-thoi-gian" className="rounded-md border border-border bg-surface p-5">
        <h2 id="diem-theo-thoi-gian" className="type-h3">
          Điểm theo thời gian
        </h2>
        <p className="mt-1 mb-4 type-body-s text-on-surface-variant">Tỉ lệ điểm của từng bài kiểm tra em đã nộp, xếp theo ngày nộp.</p>
        <ScoreChart rows={rows} />
      </section>
    </div>
  );
}

function HistoryTab({ rows, page, onPage, level }: { rows: StudentAttemptRow[]; page: number; onPage: (page: number) => void; level: 1 | 2 | 3 }) {
  if (rows.length === 0) return <EmptyHistory level={level} />;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  return (
    <div>
      <div className="overflow-x-auto rounded-md border border-border bg-surface">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="bg-surface-container-low type-label text-on-surface-variant uppercase">
              <th scope="col" className="px-4 py-3 text-left">Bài kiểm tra</th>
              <th scope="col" className="px-4 py-3 text-left">Bài học</th>
              <th scope="col" className="px-4 py-3 text-left">Điểm</th>
              <th scope="col" className="px-4 py-3 text-left">Ngày nộp</th>
              <th scope="col" className="px-4 py-3 text-left">Trạng thái</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Xem kết quả</span></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr key={row.attemptId} className="border-t border-border type-body-m">
                <th scope="row" className="px-4 py-3 text-left font-normal">{row.quizName}</th>
                <td className="px-4 py-3 text-on-surface-variant">{row.lessonTitle}</td>
                <td className="px-4 py-3 font-medium tabular-nums">{formatScore(row.score, row.totalPoint)}</td>
                <td className="px-4 py-3 tabular-nums">{formatDateTime(row.submittedAt)}</td>
                <td className="px-4 py-3">
                  <Badge tone={row.status === 'EXPIRED' ? 'warning' : 'success'}>{row.status === 'EXPIRED' ? 'Hết giờ, tự nộp' : row.statusLabel}</Badge>
                </td>
                <td className="px-4 py-3 text-right">
                  <ButtonLink to={resultPath(row.attemptId)} variant="link" aria-label={`Xem kết quả: ${row.quizName}`}>
                    Xem kết quả
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={PAGE_SIZE} totalItems={rows.length} totalPages={totalPages} onChange={onPage} label="lịch sử bài làm" />
    </div>
  );
}

function MasteryTab({ progress }: { progress: StudentProgress }) {
  if (progress.mastery.length === 0) {
    return <p className="type-body-m text-on-surface-variant">Em chưa trả lời đủ câu hỏi nào để tính mức thành thạo. Em làm thêm bài kiểm tra nhé.</p>;
  }
  return (
    <section aria-labelledby="ti-le-dung" className="rounded-md border border-border bg-surface p-5">
      <h2 id="ti-le-dung" className="type-h3">
        Tỉ lệ đúng theo di sản
      </h2>
      <ul className="mt-4 flex flex-col gap-5">
        {progress.mastery.map((m) => {
          const weak = m.level === 'NEEDS_REVIEW';
          return (
            <li key={m.heritageId}>
              <p className="flex flex-wrap items-baseline justify-between gap-3">
                <span className="type-label text-on-surface">{m.name}</span>
                <span className="flex items-center gap-3 type-body-s text-on-surface-variant">
                  <span className="tabular-nums">
                    {formatPercent(m.percent)} · {m.correct}/{m.answered} câu
                  </span>
                  <Badge tone={m.level === 'MASTERED' ? 'success' : weak ? 'warning' : 'neutral'}>{m.label}</Badge>
                </span>
              </p>
              <Bar className="mt-2" ratio={(m.percent ?? 0) / 100} label={`${m.name}: ${formatPercent(m.percent)}`} tone={weak ? 'danger' : m.level === 'MASTERED' ? 'success' : 'primary'} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BadgesTab({ progress }: { progress: StudentProgress }) {
  const board = badgeBoard(progress.badges);
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {board.map((badge) => (
        <li
          key={badge.code}
          className={cn(
            'flex flex-col items-center gap-3 rounded-md border p-5 text-center',
            badge.earned ? 'border-border bg-surface' : 'border-dashed border-border-strong bg-surface-container-low',
          )}
        >
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-full',
              badge.earned ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high text-on-surface-variant',
            )}
          >
            <Icon name={badge.earned ? 'star' : 'lock'} size={26} />
          </span>
          <p className="type-h4 text-on-surface">{badge.name}</p>
          <p className="type-body-s text-on-surface-variant">
            {badge.earned
              ? `Đạt ${badge.earned.count > 1 ? `${badge.earned.count} lần, gần nhất ` : ''}ngày ${formatDate(badge.earned.lastEarnedAt)}`
              : `Chưa đạt · ${badge.hint}`}
          </p>
          {badge.code === 'PERSEVERANCE' && !badge.earned && (
            <p className="type-body-s text-on-surface-variant">
              Em đã nộp {progress.finishedAttempts} / 5 lượt.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

const TABS = [
  { id: 'lich-su', label: 'Lịch sử bài làm' },
  { id: 'tien-do', label: 'Tiến độ' },
  { id: 'thanh-thao', label: 'Thành thạo' },
  { id: 'huy-hieu', label: 'Huy hiệu' },
] as const;
type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

function LevelTwoThreeProgress({ progress, rows, level }: { progress: StudentProgress; rows: StudentAttemptRow[]; level: 2 | 3 }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabId = isTab(raw) ? raw : 'tien-do';
  const page = Math.max(1, Number(params.get('trang')) || 1);
  const { user } = useAuth();
  const classroom = useClassroom();
  const facts = classroom.data ? classFacts(classroom.data) : [];
  const subtitle = [user ? whoAmI(user) : null, ...facts.filter((f) => ['Lớp', 'Giáo viên', 'Trường'].includes(f.label)).map((f) => (f.label === 'Lớp' ? `Lớp ${f.value}` : f.value))]
    .filter(Boolean)
    .join(' · ');
  const go = (id: TabId) => setParams({ tab: id }, { replace: true });

  useEffect(() => {
    document.title = 'Tiến độ của em · DiViet';
  }, []);

  return (
    <section data-bo-cuc={`cap-${level}`} className="dsv-content dsv-section">
      <h1 className="type-h1 text-on-surface">Tiến độ của em</h1>
      <p className="mt-2 type-body-m text-on-surface-variant">{subtitle}</p>
      <div className="mt-6">
        <Tabs idPrefix="tien-do" label="Các mục tiến độ" items={TABS} value={tab} onChange={go} />
        <TabPanel idPrefix="tien-do" id={tab}>
          {tab === 'lich-su' && (
            <HistoryTab rows={rows} page={page} level={level} onPage={(next) => setParams({ tab: 'lich-su', trang: String(next) }, { replace: true })} />
          )}
          {tab === 'tien-do' && (rows.length === 0 && progress.quizzesPublished === 0 ? <EmptyHistory level={level} /> : <OverviewTab progress={progress} rows={rows} />)}
          {tab === 'thanh-thao' && <MasteryTab progress={progress} />}
          {tab === 'huy-hieu' && <BadgesTab progress={progress} />}
        </TabPanel>
      </div>
    </section>
  );
}

// ---- Cấp 1: Sao của em ----

/** Hàng sao nhỏ của cấp 1: sao vàng token, sao chưa có màu viền; chữ đọc được nằm trong sr-only. */
function SmallStars({ count, size = 24 }: { count: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="sr-only">{`${count} trên 3 sao`}</span>
      {[0, 1, 2].map((i) => (
        <Icon
          key={i}
          name="star"
          size={size}
          className={i < count ? 'fill-current text-secondary-container stroke-on-secondary-container/40' : 'fill-current text-border stroke-border'}
        />
      ))}
    </span>
  );
}

interface LevelOneTabItem<T extends string> {
  id: T;
  label: string;
  icon?: IconName;
}

function LevelOneTabs<T extends string>({
  idPrefix,
  label,
  items,
  value,
  onChange,
}: {
  idPrefix: string;
  label: string;
  items: ReadonlyArray<LevelOneTabItem<T>>;
  value: T;
  onChange: (id: T) => void;
}) {
  const refs = useRef(new Map<T, HTMLButtonElement>());

  const focusAt = (index: number) => {
    const item = items[(index + items.length) % items.length];
    if (!item) return;
    onChange(item.id);
    refs.current.get(item.id)?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const current = items.findIndex((t) => t.id === value);
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: items.length - 1 };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    focusAt(next);
  };

  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full flex-wrap gap-2 rounded-full border-2 border-secondary-container bg-surface-container-low p-1.5">
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) refs.current.set(item.id, el);
              else refs.current.delete(item.id);
            }}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${item.id}`}
            aria-selected={selected}
            aria-controls={selected ? `${idPrefix}-panel-${item.id}` : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={onKeyDown}
            className={cn(
              'flex min-h-14 items-center gap-2 rounded-full px-5 py-2 text-[18px] leading-tight font-bold transition-colors',
              selected ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:bg-surface',
            )}
          >
            {item.icon && <Icon name={item.icon} size={24} className={selected && item.icon === 'star' ? 'fill-current' : undefined} />}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ id, icon, children }: { id: string; icon: IconName; children: string }) {
  return (
    <h2 id={id} className="flex items-center gap-2 text-[22px] leading-tight font-bold text-on-surface">
      <Icon name={icon} size={26} className="text-primary" />
      {children}
    </h2>
  );
}

function LevelOneProgress({ progress, rows }: { progress: StudentProgress; rows: StudentAttemptRow[] }) {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab = rawTab === 'bai-da-hoc' || rawTab === 'bai-da-choi' ? 'bai-da-hoc' : 'sao';
  const { user } = useAuth();
  const home = useStudentHome();
  const latest = rows[0];
  const earned = progress.badges;
  const items = [
    { id: 'sao', label: 'Sao & Huy hiệu', icon: 'star' },
    { id: 'bai-da-hoc', label: 'Bài đã học', icon: 'book-open' },
  ] as const;

  const completedClassLessons = home.data?.classLessons?.filter((l) => l.completed) ?? [];
  const attemptedLessonIds = new Set(rows.map((r) => r.lessonId));
  const unattemptedCompletedLessons = completedClassLessons.filter((l) => !attemptedLessonIds.has(l.lessonId));

  const quizCards = rows.map((row) => ({
    key: `attempt-${row.attemptId}`,
    title: row.quizName ?? 'Bài chơi',
    stars: row.stars,
  }));
  const lessonCards = unattemptedCompletedLessons.map((lesson) => ({
    key: `lesson-${lesson.lessonId}`,
    title: lesson.title ?? 'Bài học',
    stars: lesson.stars,
  }));
  const starCards = [...quizCards, ...lessonCards].slice(0, 8);

  const masteredNames = new Set(progress.mastery.map((m) => m.name?.trim().toLowerCase()).filter(Boolean));
  const additionalHeritages: Array<{ id: string; name: string; stars: number | null }> = [];
  for (const lesson of completedClassLessons) {
    for (const hName of lesson.heritageNames) {
      const lower = hName.trim().toLowerCase();
      if (!masteredNames.has(lower)) {
        masteredNames.add(lower);
        additionalHeritages.push({
          id: `lesson-${lesson.lessonId}-${hName}`,
          name: hName,
          stars: lesson.stars,
        });
      }
    }
  }

  const discoveredHeritages = [
    ...progress.mastery.map((m) => ({ id: `mastery-${m.heritageId}`, name: m.name, stars: m.stars })),
    ...additionalHeritages,
  ];

  useEffect(() => {
    document.title = 'Sao của em · DiViet';
  }, []);

  return (
    <section data-bo-cuc="cap-1" className="dsv-content dsv-section">
      <div className="mx-auto flex max-w-[960px] flex-col gap-(--dsv-block-gap)">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Illustration state="chao" className="size-16 shrink-0 rounded-full bg-surface-container-low" />
            <div className="min-w-0">
              <h1 className="text-[30px] leading-tight font-bold text-on-surface">Sao của em</h1>
              {user && <p className="mt-1 text-[18px] leading-snug text-on-surface-variant">{whoAmI(user)}</p>}
            </div>
          </div>
          {home.data && (
            <p className="inline-flex min-h-12 items-center gap-2 self-start rounded-full border-2 border-secondary-container bg-surface-container-low px-4 text-[20px] font-bold text-on-surface sm:self-auto">
              <Icon name="calendar" size={24} className="text-primary" />
              {daysLearnedText(home.data.streakDays)}
            </p>
          )}
        </header>

        <LevelOneTabs idPrefix="sao" label="Các mục sao" items={items} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />

        <TabPanel idPrefix="sao" id={tab}>
          {tab === 'sao' ? (
            rows.length === 0 && earned.length === 0 && unattemptedCompletedLessons.length === 0 ? (
              <EmptyHistory level={1} />
            ) : (
              <div className="flex flex-col gap-(--dsv-block-gap)">
                <div className="grid gap-4 sm:grid-cols-[260px_1fr]">
                  <div className="flex flex-col items-center justify-center gap-2 rounded-[24px] border-2 border-secondary-container bg-surface-container-low p-6 text-center">
                    <span className="flex size-20 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                      <Icon name="star" size={44} className="fill-current" />
                    </span>
                    <p className="text-[36px] leading-tight font-bold text-on-surface">{progress.totalStars ?? 0} sao</p>
                    <p className="text-[18px] leading-snug text-on-surface-variant">Em đã hoàn thành {progress.finishedAttempts} bài</p>
                  </div>
                  {latest && (
                    <div className="flex flex-col justify-between gap-3 rounded-[24px] border-2 border-border bg-surface p-5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-[16px] font-bold text-on-primary-container">
                          <Icon name="check" size={18} strokeWidth={3} />
                          Vừa hoàn thành
                        </span>
                        <span className="text-[16px] text-on-surface-variant">{formatDate(latest.submittedAt)}</span>
                      </div>
                      <p className="text-[22px] leading-tight font-bold text-on-surface">Bài gần nhất: {latest.quizName}</p>
                      <div className="flex flex-col items-center gap-2 rounded-[20px] bg-surface-container-low p-4 text-center">
                        <LevelOneStars count={clampStars(latest.stars)} />
                        <p className="text-[22px] leading-tight font-bold text-on-surface">Em được {clampStars(latest.stars)} sao!</p>
                      </div>
                    </div>
                  )}
                </div>

                {starCards.length > 0 && (
                  <section aria-labelledby="sao-tung-bai" className="flex flex-col gap-3">
                    <SectionTitle id="sao-tung-bai" icon="star">
                      Sao của từng bài
                    </SectionTitle>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {starCards.map((card) => (
                        <li key={card.key} className="flex flex-col justify-between gap-3 rounded-[20px] border-2 border-border bg-surface p-4">
                          <p className="line-clamp-2 text-[18px] leading-tight font-bold text-on-surface">{card.title}</p>
                          <div className="flex items-center justify-center">
                            <SmallStars count={clampStars(card.stars)} size={26} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {discoveredHeritages.length > 0 && (
                  <section aria-labelledby="di-san-em-kham-pha" className="flex flex-col gap-3">
                    <SectionTitle id="di-san-em-kham-pha" icon="building">
                      Di sản em đã khám phá
                    </SectionTitle>
                    <ul className="flex flex-col gap-3">
                      {discoveredHeritages.map((item) => (
                        <li key={item.id} className="flex items-center justify-between gap-4 rounded-[20px] border-2 border-border bg-surface p-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
                              <Icon name="map-pin" size={26} />
                            </span>
                            <span className="min-w-0 text-[20px] leading-tight font-bold text-on-surface">{item.name}</span>
                          </div>
                          <SmallStars count={clampStars(item.stars)} size={26} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section aria-labelledby="huy-hieu-cua-em" className="flex flex-col gap-3">
                  <SectionTitle id="huy-hieu-cua-em" icon="shield-check">
                    Huy hiệu của em
                  </SectionTitle>
                  {earned.length === 0 ? (
                    <div className="rounded-[24px] border-2 border-dashed border-border bg-surface-container-low p-6 text-center">
                      <p className="text-[20px] leading-snug font-bold text-on-surface">Em hoàn thành thêm bài để nhận huy hiệu nhé!</p>
                    </div>
                  ) : (
                    <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {earned.map((badge) => (
                        <li key={badge.code} className="flex flex-col items-center gap-3 rounded-[20px] border-2 border-secondary-container bg-surface-container-low p-5 text-center">
                          <span className="flex size-16 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
                            <Icon name="star" size={34} className="fill-current" />
                          </span>
                          <div>
                            <p className="text-[20px] leading-tight font-bold text-on-surface">{badge.name}</p>
                            <p className="mt-1 text-[16px] leading-snug text-on-surface-variant">{badge.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )
          ) : rows.length === 0 && unattemptedCompletedLessons.length === 0 ? (
            <EmptyHistory level={1} />
          ) : (
            <ul className="flex flex-col gap-3">
              {rows.map((row) => (
                <li key={row.attemptId} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-2 border-border bg-surface p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[22px] leading-tight font-bold text-on-surface">{row.quizName}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[16px] text-on-surface-variant">
                      <Icon name="calendar" size={18} />
                      {formatDate(row.submittedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <SmallStars count={clampStars(row.stars)} size={28} />
                    <LevelOneButtonLink to={resultPath(row.attemptId)} variant="secondary" size="md" aria-label={`Xem kết quả: ${row.quizName}`}>
                      Xem kết quả
                    </LevelOneButtonLink>
                  </div>
                </li>
              ))}
              {unattemptedCompletedLessons.map((lesson) => (
                <li key={`lesson-${lesson.lessonId}`} className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border-2 border-border bg-surface p-4 sm:p-5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[22px] leading-tight font-bold text-on-surface">{lesson.title ?? 'Bài học'}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-[16px] text-on-surface-variant">
                      <Icon name="check" size={18} className="text-primary" />
                      <span>Đã học xong bài học</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    <SmallStars count={clampStars(lesson.stars)} size={28} />
                    <LevelOneButtonLink to={lessonPath(lesson.accessCode)} variant="secondary" size="md" aria-label={`Vào bài học: ${lesson.title}`}>
                      Vào bài học
                    </LevelOneButtonLink>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </TabPanel>
      </div>
    </section>
  );
}

export function ProgressPage() {
  const progress = useQuery({ queryKey: progressQueryKey, queryFn: progressQueryFn });
  const history = useQuery({ queryKey: [...historyQueryKey, HISTORY_FETCH], queryFn: historyQueryFn(1, HISTORY_FETCH) });

  if (progress.isPending || history.isPending) {
    return (
      <section className="dsv-content dsv-section">
        <LoadingState rows={4} />
      </section>
    );
  }
  if (progress.isError || history.isError) {
    return (
      <section className="dsv-content dsv-section">
        <ErrorState
          error={progress.error ?? history.error}
          onRetry={() => {
            void progress.refetch();
            void history.refetch();
          }}
        />
      </section>
    );
  }
  const rows = history.data.items;
  if (progress.data.level === 1) return <LevelOneProgress progress={progress.data} rows={rows} />;
  return <LevelTwoThreeProgress progress={progress.data} rows={rows} level={progress.data.level} />;
}
