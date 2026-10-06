import {
  HERITAGE_TYPE_LABEL,
  MASTERY_LABEL,
  MASTERY_TONE,
  cn,
  formatDateTime,
  formatNumber,
  formatPercent,
  type MasteryTone,
} from '@dsvhvn/dung-chung';
import type { ClassMastery, ClassProgress, ClassProgressCell, HeatmapCell, HeritageType, MasteryLevel } from '@dsvhvn/dung-chung/api';
import { Blank, EmptyState, ErrorState, Icon, LoadingState, SelectField, Table, Td, TextLink, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PATHS } from '../../access/screens';
import { queryKeys } from '../../lib/api/queryKeys';
import { publishedHeritagesApi } from '../../lib/api/lessonEndpoints';
import { statisticsApi } from '../../lib/api/statisticsEndpoints';
import { Block, MasteryBadge, NoResultsNote, RateBar, StarCount, StatCard, StudentStatusBadge } from './StatBits';

// Hai tab thống kê của Chi tiết lớp: Tiến độ (bài kiểm tra đã phát hành, bảng học sinh × bài kiểm tra, bài học hoàn thành, huy hiệu) và
// Thành thạo (tỉ lệ đúng theo di sản, tỉnh, loại, dạng câu; bảng nhiệt học sinh × di sản). Giáo viên luôn thấy điểm; lớp cấp 1 kèm số sao.

// ---- Tiến độ ----

export function ProgressTab({ classId }: { classId: number }) {
  const query = useQuery({ queryKey: queryKeys.classProgress(classId), queryFn: () => statisticsApi.classProgress(classId).then((r) => r.data) });
  if (query.isPending) return <LoadingState rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Progress data={query.data} />;
}

function cellText(cell: ClassProgressCell) {
  return cell.score !== null && cell.totalPoint !== null ? `${formatNumber(cell.score)}/${formatNumber(cell.totalPoint)}` : '';
}

function Progress({ data }: { data: ClassProgress }) {
  const cells = useMemo(() => new Map(data.cells.map((c) => [`${c.studentId}-${c.quizId}`, c])), [data.cells]);
  const stars = data.level === 1;
  if (data.students.length === 0) {
    return (
      <EmptyState icon="users" title="Lớp chưa có học sinh đang hoạt động.">
        Thêm học sinh ở tab Học sinh; tiến độ hiện khi các em bắt đầu làm bài.
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <NoResultsNote message={data.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tiến độ của lớp" value={formatPercent(data.progressPercent)} note={`${data.submittedTotal} lượt đã nộp`} />
        <StatCard label="Bài kiểm tra đã phát hành" value={data.quizzesPublished} note="Đã tới giờ mở" />
        <StatCard label="Học sinh đang hoạt động" value={data.enrolled} />
        <StatCard label="Chưa đăng nhập lần nào" value={data.neverLoggedIn} note={data.neverLoggedIn > 0 ? 'Nhắc các em đăng nhập bằng phiếu đăng nhập' : undefined} />
      </div>

      {data.quizzes.length > 0 && (
        <section aria-label="Bài kiểm tra đã phát hành" className="flex flex-col gap-3">
          <h2 className="type-h3 text-on-surface">Tiến độ làm bài của lớp {data.className}</h2>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.quizzes.map((quiz) => (
              <li key={quiz.quizId} className="rounded-md border border-border bg-surface p-4">
                <TextLink to={PATHS.quizResults(quiz.quizId)} className="type-label">
                  {quiz.name}
                </TextLink>
                <p className="mt-2 type-h2 text-on-surface">
                  {quiz.submitted} / {quiz.enrolled}
                </p>
                <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
                  <span className="block h-full rounded-full bg-success" style={{ width: `${Math.min(100, quiz.ratePercent)}%` }} />
                </span>
                <p className="mt-2 type-body-s text-on-surface-variant">
                  đã nộp{quiz.closeAt ? ` · đóng lúc ${formatDateTime(quiz.closeAt)}` : ''} · {quiz.lessonTitle}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Table caption="Học sinh và bài kiểm tra của lớp">
        <thead>
          <tr>
            <Th>Học sinh</Th>
            {data.quizzes.map((quiz) => (
              <Th key={quiz.quizId} className="h-auto min-w-40 max-w-56 py-2 align-bottom" style={{ whiteSpace: 'normal' }}>
                {quiz.name}
              </Th>
            ))}
            <Th>Bài học đã hoàn thành</Th>
            <Th>Điểm trung bình</Th>
            <Th>Huy hiệu</Th>
            <Th>Đăng nhập gần nhất</Th>
          </tr>
        </thead>
        <tbody>
          {data.students.map((student) => (
            <Tr key={student.studentId}>
              <Td>
                <TextLink to={PATHS.studentRecord(data.classId, student.studentId)} className="font-medium">
                  {student.fullName}
                </TextLink>
                <span className="block type-mono-label text-on-surface-variant">{student.studentCode}</span>
              </Td>
              {data.quizzes.map((quiz) => {
                const cell = cells.get(`${student.studentId}-${quiz.quizId}`);
                return (
                  <Td key={quiz.quizId} className="whitespace-nowrap">
                    {cell ? (
                      <span className="flex flex-col items-start gap-1">
                        {cell.status === 'SUBMITTED' || cell.status === 'EXPIRED' ? (
                          <>
                            <span className="type-label">{cellText(cell)}</span>
                            {cell.status === 'EXPIRED' && <StudentStatusBadge status="EXPIRED" />}
                            {stars && <StarCount stars={cell.stars} />}
                          </>
                        ) : (
                          <StudentStatusBadge status={cell.status} />
                        )}
                      </span>
                    ) : (
                      <StudentStatusBadge status="NOT_STARTED" />
                    )}
                  </Td>
                );
              })}
              <Td className="type-mono-label whitespace-nowrap">
                {student.lessonsCompleted}/{student.lessonsWithQuizzes}
              </Td>
              <Td className="whitespace-nowrap">
                {student.averagePercent === null ? <Blank /> : formatPercent(student.averagePercent)}
                {stars && student.totalStars !== null && <span className="block type-body-s text-on-surface-variant">{student.totalStars} sao</span>}
              </Td>
              <Td className="type-mono-label">{student.badges.reduce((sum, b) => sum + b.count, 0)}</Td>
              <Td className="whitespace-nowrap type-body-s">{student.neverLoggedIn ? 'Chưa đăng nhập' : formatDateTime(student.lastLoginAt)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {stars && (
        <p className="flex gap-2 rounded-md bg-surface-container-low p-4 type-body-s text-on-surface-variant">
          <Icon name="info" size={18} className="shrink-0" />
          Với lớp cấp 1, học sinh chỉ thấy số sao và lời khen, không thấy điểm số; thầy cô vẫn thấy điểm và số sao của từng em. Từ 80% được 3 sao, từ 50%
          đến dưới 80% được 2 sao, dưới 50% được 1 sao.
        </p>
      )}
    </div>
  );
}

// ---- Thành thạo ----

const HEAT: Record<MasteryTone, string> = {
  good: 'bg-success-container text-on-success-container',
  fair: 'bg-warning-container text-on-warning-container',
  weak: 'bg-danger-container text-on-danger-container',
  none: 'bg-surface-container text-on-surface-variant',
};

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 type-body-s text-on-surface-variant" aria-label="Chú giải màu">
      {(['MASTERED', 'FAIR', 'NEEDS_REVIEW', 'INSUFFICIENT_DATA'] as const).map((level) => (
        <li key={level} className="flex items-center gap-2">
          <span aria-hidden="true" className={cn('size-4 rounded-xs', HEAT[MASTERY_TONE[level]])} />
          {level === 'MASTERED' ? 'Từ 80%: thành thạo' : level === 'FAIR' ? '50–79%: đạt, cần cố gắng' : level === 'NEEDS_REVIEW' ? 'Dưới 50%: nên ôn' : MASTERY_LABEL[level]}
        </li>
      ))}
    </ul>
  );
}

function Heatmap({ data }: { data: ClassMastery }) {
  const cells = useMemo(() => new Map<string, HeatmapCell>(data.heatmapCells.map((c) => [`${c.studentId}-${c.heritageId}`, c])), [data.heatmapCells]);
  const columns = useMemo(() => {
    const ids = new Set(data.heatmapCells.map((c) => c.heritageId));
    return data.byHeritage.filter((row) => row.id !== null && ids.has(row.id));
  }, [data.byHeritage, data.heatmapCells]);
  if (columns.length === 0 || data.heatmapStudents.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[640px] border-collapse text-left type-body-s">
        <caption className="sr-only">Tỉ lệ đúng của từng học sinh theo di sản</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 h-11 border-b border-border bg-surface px-4 type-label text-on-surface-variant">
              Học sinh
            </th>
            {columns.map((col) => (
              <th key={col.id} scope="col" className="h-11 max-w-36 border-b border-border px-3 py-2 align-bottom type-label whitespace-normal text-on-surface-variant" title={col.name ?? ''}>
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface px-4 py-2 type-label">
              Cả lớp
            </th>
            {columns.map((col) => (
              <td key={col.id} className="border-b border-border p-1">
                <span className={cn('flex h-9 items-center justify-center rounded-xs type-label tabular-nums', HEAT[MASTERY_TONE[col.level]])}>
                  {col.level === 'INSUFFICIENT_DATA' ? '—' : formatPercent(col.ratePercent)}
                </span>
              </td>
            ))}
          </tr>
          {data.heatmapStudents.map((student) => (
            <tr key={student.studentId}>
              <th scope="row" className="sticky left-0 z-10 border-b border-border bg-surface px-4 py-2 type-label whitespace-nowrap">
                {student.fullName}
              </th>
              {columns.map((col) => {
                const cell = cells.get(`${student.studentId}-${col.id}`);
                return (
                  <td key={col.id} className="border-b border-border p-1">
                    <span
                      className={cn('flex h-9 items-center justify-center rounded-xs type-label tabular-nums', HEAT[cell ? MASTERY_TONE[cell.level] : 'none'])}
                      aria-label={cell ? `${student.fullName}, ${col.name}: ${formatPercent(cell.ratePercent)}, ${MASTERY_LABEL[cell.level]}` : `${student.fullName}, ${col.name}: chưa có dữ liệu`}
                    >
                      {cell && cell.level !== 'INSUFFICIENT_DATA' ? formatPercent(cell.ratePercent) : '—'}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MasteryList({ title, rows }: { title: string; rows: Array<{ key: string; name: string | null; answered: number; ratePercent: number; level: MasteryLevel }> }) {
  if (rows.length === 0) return null;
  return (
    <Block title={title}>
      <ul className="flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.key} className="grid items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto]">
            <span className="min-w-0 type-body-m text-on-surface">
              {row.name}
              <span className="block type-body-s text-on-surface-variant">{row.answered} lượt trả lời</span>
            </span>
            <RateBar ratePercent={row.ratePercent} answered={row.answered} label={`Tỉ lệ đúng ${row.name}: ${formatPercent(row.ratePercent)}`} />
            <MasteryBadge level={row.level} />
          </li>
        ))}
      </ul>
    </Block>
  );
}

export function MasteryTab({ classId }: { classId: number }) {
  const [provinceId, setProvinceId] = useState('');
  const [heritageType, setHeritageType] = useState<'' | HeritageType>('');
  const filter = { provinceId: provinceId === '' ? '' : Number(provinceId), heritageType } as const;
  const catalog = useQuery({
    queryKey: queryKeys.discoveryFilters,
    queryFn: ({ signal }) => publishedHeritagesApi.filters({ signal }),
    staleTime: 60 * 60_000,
  });
  const query = useQuery({
    queryKey: queryKeys.classMastery(classId, filter),
    queryFn: () => statisticsApi.classMastery(classId, filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <SelectField
          label="Tỉnh"
          containerClassName="min-w-52"
          value={provinceId}
          onChange={(e) => setProvinceId(e.target.value)}
          options={[{ value: '', label: 'Tất cả tỉnh' }, ...(catalog.data?.provinces ?? []).map((p) => ({ value: String(p.id), label: p.name ?? '' }))]}
        />
        <SelectField
          label="Loại di sản"
          containerClassName="min-w-52"
          value={heritageType}
          onChange={(e) => setHeritageType(e.target.value as '' | HeritageType)}
          options={[
            { value: '', label: 'Tất cả loại' },
            ...(Object.entries(HERITAGE_TYPE_LABEL) as Array<[HeritageType, string]>).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>
      {query.isPending ? (
        <LoadingState rows={3} />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <MasteryBody data={query.data} />
      )}
    </div>
  );
}

function MasteryBody({ data }: { data: ClassMastery }) {
  if (data.byHeritage.length === 0 && data.byQuestionType.length === 0) {
    return (
      <EmptyState icon="bar-chart" title="Chưa có dữ liệu thành thạo.">
        {data.message ?? 'Thống kê và gợi ý sẽ hiện khi lớp có lượt nộp.'}
      </EmptyState>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <NoResultsNote message={data.message} />
      <Block title="Tỉ lệ trả lời đúng theo di sản" hint="Mỗi dòng là một di sản; mỗi ô là một học sinh. Bảng nhiệt tối đa 60 di sản có nhiều câu trả lời nhất.">
        <div className="flex flex-col gap-4">
          <Legend />
          <Heatmap data={data} />
          <MasteryList title="Cả lớp theo di sản" rows={data.byHeritage.map((r) => ({ key: String(r.id), name: r.name, answered: r.answered, ratePercent: r.ratePercent, level: r.level }))} />
        </div>
      </Block>
      <div className="grid gap-6 xl:grid-cols-2">
        <MasteryList title="Theo tỉnh" rows={data.byProvince.map((r) => ({ key: String(r.id), name: r.name, answered: r.answered, ratePercent: r.ratePercent, level: r.level }))} />
        <MasteryList title="Theo loại di sản" rows={data.byHeritageType.map((r) => ({ key: String(r.id), name: r.name, answered: r.answered, ratePercent: r.ratePercent, level: r.level }))} />
      </div>
      <MasteryList
        title="Tỉ lệ đúng theo dạng câu"
        rows={data.byQuestionType.map((r) => ({ key: r.questionType ?? r.name, name: r.name, answered: r.answered, ratePercent: r.ratePercent, level: r.level }))}
      />
    </div>
  );
}
