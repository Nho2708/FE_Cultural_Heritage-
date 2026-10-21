import { useEffect, useRef, type KeyboardEvent } from 'react';
import { averagePercent, badgeBoard, clampStars, cn, formatDate, formatDateTime, formatPercent, formatScore, MESSAGES } from '@dsvhvn/dung-chung';
import type { StudentAttemptRow, StudentProgress } from '@dsvhvn/dung-chung/api';
import { Badge, ButtonLink, ErrorState, Icon, LoadingState, Pagination, TabPanel, Tabs } from '@dsvhvn/dung-chung/ui';
import { Illustration } from '@dsvhvn/dung-chung/lesson';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, useClassroom, whoAmI } from '../learn-home/classroom';
import { useAuth } from '../lib/auth/context';
import { historyQueryFn, historyQueryKey, progressQueryFn, progressQueryKey, resultPath } from '../quiz/quizData';
import { Bar, Stars as StarRow } from '../quiz/Meters';

// Tiến độ của em. Cấp 1 là "Sao của em": tổng số sao, sao từng bài, huy hiệu, danh sách bài đã học, không điểm hay phần trăm. Cấp 2 và 3 có
// bốn tab: Lịch sử bài làm, Tiến độ (số bài đã làm, bài học hoàn thành, điểm trung bình, biểu đồ điểm theo thời gian), Thành thạo theo di sản
// và Huy hiệu. Số liệu do máy chủ tính; ở đây chỉ trình bày.

const PAGE_SIZE = 10;
const HISTORY_FETCH = 100;

function EmptyHistory({ level }: { level: 1 | 2 | 3 }) {
  if (level === 1) {
    return (
      <div className="dsv-empty-box mx-auto flex max-w-lg flex-col items-center gap-5 p-8 text-center">
        <div className="dsv-mascot-avatar flex size-24 items-center justify-center p-2">
          <Illustration state="trong" className="size-20" />
        </div>
        <div className="space-y-2">
          <h3 className="type-h2 font-black text-amber-950">Chưa có bài học nào!</h3>
          <p className="type-body-m font-medium text-amber-900/80 max-w-sm">
            Em hãy nhập mã bài học cô giáo đưa để cùng bắt đầu khám phá nhé!
          </p>
        </div>
        <ButtonLink to={pathOf('enterCode')} className="duo-btn-yellow px-8 py-3.5 text-base font-extrabold shadow-md">
          <span aria-hidden="true">🔑 </span>Nhập mã bài học
        </ButtonLink>
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

interface LevelOneTabItem<T extends string> {
  id: T;
  label: string;
  icon?: string;
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
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-2.5 rounded-full border-2 border-amber-200/80 bg-amber-100/50 p-1.5 shadow-inner"
    >
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
              'flex items-center gap-2 rounded-full px-5 py-2.5 font-black text-sm transition-all duration-150',
              selected
                ? 'duo-btn-yellow scale-100 shadow-md text-amber-950'
                : 'text-amber-900/70 hover:text-amber-950 hover:bg-amber-200/50',
            )}
          >
            {item.icon && <span aria-hidden="true">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function LevelOneProgress({ progress, rows }: { progress: StudentProgress; rows: StudentAttemptRow[] }) {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get('tab');
  const tab = rawTab === 'bai-da-hoc' || rawTab === 'bai-da-choi' ? 'bai-da-hoc' : 'sao';
  const { user } = useAuth();
  const latest = rows[0];
  const earned = progress.badges;
  const items = [
    { id: 'sao', label: 'Sao & Huy hiệu', icon: '⭐' },
    { id: 'bai-da-hoc', label: 'Bài đã học', icon: '📖' },
  ] as const;

  useEffect(() => {
    document.title = 'Sao của em · DiViet';
  }, []);

  return (
    <section data-bo-cuc="cap-1" className="dsv-content dsv-section">
      <div className="mx-auto flex max-w-[960px] flex-col gap-(--dsv-block-gap)">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100 px-3.5 py-1 text-xs font-black text-amber-900 shadow-xs">
              <span aria-hidden="true">🏆</span> BẢNG VÀNG THÀNH TÍCH
            </div>
            <h1 className="type-h1 font-black tracking-tight text-slate-800">Sao của em</h1>
            {user && <p className="mt-1 type-body-m font-medium text-slate-600">{whoAmI(user)}</p>}
          </div>
        </div>

        <LevelOneTabs idPrefix="sao" label="Các mục sao" items={items} value={tab} onChange={(id) => setParams({ tab: id }, { replace: true })} />

        <TabPanel idPrefix="sao" id={tab}>
          {tab === 'sao' ? (
            rows.length === 0 && earned.length === 0 ? (
              <EmptyHistory level={1} />
            ) : (
              <div className="flex flex-col gap-(--dsv-block-gap)">
                <div className="grid gap-5 sm:grid-cols-[260px_1fr]">
                  <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border-3 border-amber-300 bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-400 p-6 text-center text-amber-950 shadow-md">
                    <div className="mb-3 flex size-20 items-center justify-center rounded-full bg-white/80 text-4xl shadow-inner">
                      ⭐
                    </div>
                    <p className="type-h1 font-black text-amber-950 drop-shadow-xs">{progress.totalStars ?? 0} sao</p>
                    <p className="mt-1 text-base font-bold text-amber-900">Em đã hoàn thành {progress.finishedAttempts} bài</p>
                  </div>
                  {latest && (
                    <div className="duo-card flex flex-col justify-between p-6">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-black text-blue-800">
                          ✨ Vừa hoàn thành
                        </span>
                        <span className="text-xs font-bold text-slate-500">{formatDate(latest.submittedAt)}</span>
                      </div>
                      <p className="mt-3 type-h3 font-black text-slate-800">
                        Bài gần nhất: {latest.quizName}
                      </p>
                      <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border-2 border-amber-200/60 bg-amber-50/80 p-4 text-center">
                        <StarRow count={clampStars(latest.stars)} size={44} />
                        <p className="type-h3 font-black text-amber-900">Em được {clampStars(latest.stars)} sao!</p>
                      </div>
                    </div>
                  )}
                </div>

                {rows.length > 0 && (
                  <section aria-labelledby="sao-tung-bai">
                    <h2 id="sao-tung-bai" className="type-h2 flex items-center gap-2 font-black text-slate-800">
                      <span aria-hidden="true">⭐</span> Sao của từng bài
                    </h2>
                    <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                      {rows.slice(0, 8).map((row) => (
                        <li
                          key={row.attemptId}
                          className="duo-card flex flex-col justify-between p-4 transition-all hover:-translate-y-1 hover:shadow-md"
                        >
                          <p className="type-h4 line-clamp-2 font-bold text-slate-800">{row.quizName}</p>
                          <div className="mt-3 flex items-center justify-center">
                            <StarRow count={clampStars(row.stars)} size={24} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                {progress.mastery.length > 0 && (
                  <section aria-labelledby="di-san-em-kham-pha">
                    <h2 id="di-san-em-kham-pha" className="type-h2 flex items-center gap-2 font-black text-slate-800">
                      <span aria-hidden="true">🏛️</span> Di sản em đã khám phá
                    </h2>
                    <ul className="mt-4 flex flex-col gap-3">
                      {progress.mastery.map((m) => (
                        <li
                          key={m.heritageId}
                          className="duo-card flex items-center justify-between gap-4 p-4 transition-all hover:-translate-y-0.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-100 text-xl">
                              📍
                            </div>
                            <span className="type-h4 font-black text-slate-800">{m.name}</span>
                          </div>
                          <StarRow count={clampStars(m.stars)} size={26} />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}

                <section aria-labelledby="huy-hieu-cua-em">
                  <h2 id="huy-hieu-cua-em" className="type-h2 flex items-center gap-2 font-black text-slate-800">
                    <span aria-hidden="true">🎖️</span> Huy hiệu của em
                  </h2>
                  {earned.length === 0 ? (
                    <div className="mt-4 rounded-3xl border-2 border-dashed border-amber-200 bg-amber-50/50 p-6 text-center">
                      <p className="type-h4 font-bold text-amber-900/80">
                        Em hoàn thành thêm bài để nhận huy hiệu nhé!
                      </p>
                    </div>
                  ) : (
                    <ul className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                      {earned.map((badge) => (
                        <li
                          key={badge.code}
                          className="duo-card flex flex-col items-center gap-3 p-5 text-center transition-all hover:-translate-y-1 hover:shadow-md"
                        >
                          <div className="flex size-20 items-center justify-center rounded-full border-3 border-amber-400 bg-gradient-to-br from-amber-200 to-yellow-300 text-3xl text-amber-900 shadow-sm">
                            🎖️
                          </div>
                          <div>
                            <p className="type-h4 font-black text-slate-800">{badge.name}</p>
                            <p className="mt-1 type-body-s font-medium text-slate-600">{badge.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>
            )
          ) : rows.length === 0 ? (
            <EmptyHistory level={1} />
          ) : (
            <ul className="flex flex-col gap-4">
              {rows.map((row) => (
                <li
                  key={row.attemptId}
                  className="duo-card flex flex-wrap items-center justify-between gap-4 p-5 transition-all hover:-translate-y-0.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="type-h3 font-black text-slate-800">{row.quizName}</p>
                    <p className="mt-1 type-body-m font-medium text-slate-500">
                      <span aria-hidden="true">📅 </span>{formatDate(row.submittedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StarRow count={clampStars(row.stars)} size={28} />
                    <ButtonLink
                      to={resultPath(row.attemptId)}
                      className="duo-btn-blue px-6 py-2.5 text-sm font-extrabold shadow-sm"
                    >
                      Xem kết quả ⭐
                    </ButtonLink>
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
