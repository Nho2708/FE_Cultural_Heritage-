import {
  LOW_RATE_PERCENT,
  cn,
  QUIZ_STUDENT_STATUS_LABEL,
  formatDateTime,
  formatDuration,
  formatNumber,
  formatPercent,
  isFinishedStatus,
} from '@dsvhvn/dung-chung';
import type { QuestionStat, QuizResultsOverview, QuizStudentRow, QuizStudentStatus, TopicStat } from '@dsvhvn/dung-chung/api';
import { Badge, Blank, Button, EmptyState, ErrorState, Icon, LoadingState, Pagination, SelectField, Table, TextField, Td, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { queryKeys } from '../../lib/api/queryKeys';
import { statisticsApi } from '../../lib/api/statisticsEndpoints';
import { ScoreHistogram } from './ScoreCharts';
import { Block, MasteryBadge, NoResultsNote, RateBar, StarCount, StatCard, StudentStatusBadge } from './StatBits';

// Ba tab đầu của Kết quả bài kiểm tra: Tổng quan, Từng câu, Từng học sinh. Tab Gợi ý dựng ở SuggestionsPanel.

// ---- Tổng quan ----

export function OverviewTab({ quizId }: { quizId: number }) {
  const query = useQuery({ queryKey: queryKeys.quizOverview(quizId), queryFn: () => statisticsApi.quizOverview(quizId).then((r) => r.data) });
  if (query.isPending) return <LoadingState rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Overview data={query.data} />;
}

function Overview({ data }: { data: QuizResultsOverview }) {
  const hasScores = data.finished > 0 && data.averageScore !== null;
  const total = data.totalPoint;
  const score = (value: number | null) => (value === null ? '—' : formatNumber(value));
  return (
    <div className="flex flex-col gap-6">
      <NoResultsNote message={data.message} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Điểm trung bình"
          value={score(data.averageScore)}
          note={hasScores ? `Trên thang ${formatNumber(total ?? 0)} điểm · ${formatPercent(data.averagePercent)} · ${data.finished} bài đã nộp` : 'Chưa có bài nộp'}
        />
        <StatCard label="Cao nhất" value={score(data.highestScore)} note={hasScores ? formatPercent(data.highestPercent) : undefined} />
        <StatCard label="Thấp nhất" value={score(data.lowestScore)} note={hasScores ? formatPercent(data.lowestPercent) : undefined} />
        <StatCard label="Đã nộp" value={`${data.finished} / ${data.enrolled}`} note={`Chưa làm ${data.notStarted} em · ${data.inProgress} em đang làm`}>
          <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-surface-container-high" aria-hidden="true">
            <span className="block h-full rounded-full bg-success" style={{ width: `${data.enrolled > 0 ? Math.round((data.finished / data.enrolled) * 100) : 0}%` }} />
          </span>
        </StatCard>
      </div>
      <p className="type-body-s text-on-surface-variant">
        {data.submitted} em tự nộp bài, {data.autoSubmitted} em hết giờ nên hệ thống tự nộp. {data.questionCount} câu hỏi
        {total !== null ? ` · tổng ${formatNumber(total)} điểm` : ''}.
      </p>
      <Block title="Phổ điểm" hint={`Số học sinh theo phần trăm tổng điểm · ${data.finished} bài đã nộp`}>
        <ScoreHistogram bins={data.distribution} finished={data.finished} />
      </Block>
    </div>
  );
}

// ---- Từng câu ----

function PartsLine({ question }: { question: QuestionStat }) {
  if (question.parts.length === 0) return null;
  return (
    <ul className="mt-1 flex flex-wrap gap-x-3 type-body-s text-on-surface-variant">
      {question.parts.map((part) => (
        <li key={part.label}>
          {part.label}: {formatPercent(part.ratePercent)}
        </li>
      ))}
    </ul>
  );
}

function QuestionsTable({ questions, finished }: { questions: QuestionStat[]; finished: number }) {
  return (
    <Table caption={`Tỉ lệ đúng của ${questions.length} câu hỏi, ${finished} bài đã nộp`}>
      <thead>
        <tr>
          <Th className="w-12">#</Th>
          <Th>Nội dung câu hỏi</Th>
          <Th>Dạng câu</Th>
          <Th className="min-w-44">Tỉ lệ đúng</Th>
          <Th>Phương án chọn nhiều nhất</Th>
          <Th>Lỗi hay gặp</Th>
          <Th className="text-right">Bỏ trống</Th>
        </tr>
      </thead>
      <tbody>
        {questions.map((q) => {
          const low = q.answered > 0 && q.ratePercent < LOW_RATE_PERCENT;
          const blank = q.choices.find((c) => c.answerId === null)?.count ?? 0;
          const wrongest = q.mostChosen;
          return (
            <Tr key={q.questionId} className={cn(low && 'bg-danger-container/40')}>
              <Td className="type-mono-label">{q.position}</Td>
              <Td className="max-w-80">
                <span className="line-clamp-2">{q.content}</span>
                {low && <span className="mt-1 block type-label text-danger">Dưới 50% — nên ôn lại</span>}
                <span className="block type-body-s text-on-surface-variant">{q.heritageName}</span>
              </Td>
              <Td>
                <Badge>{q.typeName}</Badge>
              </Td>
              <Td>
                <RateBar ratePercent={q.answered > 0 ? q.ratePercent : null} answered={Math.max(q.answered, 3)} label={`Tỉ lệ đúng câu ${q.position}: ${formatPercent(q.ratePercent)}`} />
                <span className="block type-body-s text-on-surface-variant">{q.parts.length > 0 ? 'theo phần' : `${q.correct}/${q.answered}`}</span>
                <PartsLine question={q} />
              </Td>
              <Td className="max-w-56">
                {wrongest && wrongest.answerId !== null ? (
                  <>
                    {wrongest.content ?? 'Hình'} · {wrongest.count} em
                    {!wrongest.isCorrect && <span className="ml-1 type-label text-danger">(sai)</span>}
                  </>
                ) : (
                  <Blank />
                )}
              </Td>
              <Td className="max-w-64">
                {q.commonErrors.length === 0 ? (
                  <Blank />
                ) : (
                  <ul className="flex flex-col gap-1 type-body-s">
                    {q.commonErrors.map((error) => (
                      <li key={error.label}>
                        {error.label}
                        {error.mostCommonWrong ? `: ${error.mostCommonWrong}` : ''} · {error.wrong} em
                      </li>
                    ))}
                  </ul>
                )}
              </Td>
              <Td className="text-right type-mono-label">{blank}</Td>
            </Tr>
          );
        })}
      </tbody>
    </Table>
  );
}

function TopicTable({ title, rows, firstColumn }: { title: string; rows: TopicStat[]; firstColumn: string }) {
  if (rows.length === 0) return null;
  return (
    <Table caption={title}>
      <thead>
        <tr>
          <Th>{firstColumn}</Th>
          <Th className="min-w-44">Tỉ lệ đúng</Th>
          <Th className="text-right">Số câu trả lời</Th>
          <Th>Mức</Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <Tr key={`${row.heritageId ?? ''}-${row.questionType ?? ''}-${row.name}`}>
            <Td className="font-medium">
              {row.name}
              {row.needsReview && <span className="ml-2 type-label text-danger">Nên ôn</span>}
            </Td>
            <Td>
              <RateBar ratePercent={row.ratePercent} answered={row.answered} label={`Tỉ lệ đúng ${row.name}: ${formatPercent(row.ratePercent)}`} />
            </Td>
            <Td className="text-right type-mono-label">{row.answered}</Td>
            <Td>
              <MasteryBadge level={row.level} />
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}

export function QuestionsTab({ quizId }: { quizId: number }) {
  const questions = useQuery({ queryKey: queryKeys.quizQuestionStats(quizId), queryFn: () => statisticsApi.quizQuestions(quizId).then((r) => r.data) });
  const topics = useQuery({ queryKey: [...queryKeys.quizQuestionStats(quizId), 'topics'], queryFn: () => statisticsApi.quizTopics(quizId).then((r) => r.data) });
  if (questions.isPending) return <LoadingState rows={4} />;
  if (questions.isError) return <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />;
  const data = questions.data;
  return (
    <div className="flex flex-col gap-6">
      <NoResultsNote message={data.message} />
      <p className="type-body-s text-on-surface-variant">
        Câu có tỉ lệ đúng dưới 50% được tô đỏ. Câu nhiều phần tính tỉ lệ đúng theo từng phần. {data.finished} bài đã nộp.
      </p>
      <QuestionsTable questions={data.questions} finished={data.finished} />
      {topics.data && (topics.data.byHeritage.length > 0 || topics.data.byQuestionType.length > 0) && (
        <div className="flex flex-col gap-6">
          <Block title="Tỉ lệ đúng theo di sản" hint="Câu hỏi của bài này, gộp theo di sản.">
            <TopicTable title="Tỉ lệ đúng theo di sản" rows={topics.data.byHeritage} firstColumn="Di sản" />
          </Block>
          <Block title="Tỉ lệ đúng theo dạng câu" hint="Câu hỏi của bài này, gộp theo dạng câu.">
            <TopicTable title="Tỉ lệ đúng theo dạng câu" rows={topics.data.byQuestionType} firstColumn="Dạng câu" />
          </Block>
        </div>
      )}
    </div>
  );
}

// ---- Từng học sinh ----

const PAGE_SIZE = 20;
const STATUS_OPTIONS: Array<{ value: '' | QuizStudentStatus; label: string }> = [
  { value: '', label: 'Trạng thái: Tất cả' },
  { value: 'SUBMITTED', label: QUIZ_STUDENT_STATUS_LABEL.SUBMITTED },
  { value: 'EXPIRED', label: QUIZ_STUDENT_STATUS_LABEL.EXPIRED },
  { value: 'IN_PROGRESS', label: QUIZ_STUDENT_STATUS_LABEL.IN_PROGRESS },
  { value: 'NOT_STARTED', label: QUIZ_STUDENT_STATUS_LABEL.NOT_STARTED },
];

function foldVietnamese(text: string) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/đ/g, 'd').toLowerCase();
}

function sortRows(rows: QuizStudentRow[]) {
  // Em đã có điểm lên trước (điểm cao đến thấp), rồi em đang làm, rồi em chưa làm; cùng nhóm theo mã học sinh.
  const rank = (row: QuizStudentRow) => (isFinishedStatus(row.status) ? 0 : row.status === 'IN_PROGRESS' ? 1 : 2);
  return [...rows].sort(
    (a, b) => rank(a) - rank(b) || (b.percent ?? -1) - (a.percent ?? -1) || (a.studentCode ?? '').localeCompare(b.studentCode ?? ''),
  );
}

export function StudentsTab({ quizId, onOpenAttempt }: { quizId: number; onOpenAttempt: (attemptId: number) => void }) {
  const query = useQuery({ queryKey: queryKeys.quizStudentRows(quizId), queryFn: () => statisticsApi.quizStudents(quizId).then((r) => r.data) });
  const [status, setStatus] = useState<'' | QuizStudentStatus>('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const folded = foldVietnamese(keyword.trim());
    return sortRows(query.data?.students ?? []).filter(
      (row) => (status === '' || row.status === status) && (folded === '' || foldVietnamese(`${row.studentCode ?? ''} ${row.fullName ?? ''}`).includes(folded)),
    );
  }, [query.data, status, keyword]);

  if (query.isPending) return <LoadingState rows={4} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const data = query.data;
  const stars = data.level === 1;
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <SelectField
          label="Trạng thái"
          containerClassName="min-w-52"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as '' | QuizStudentStatus);
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
        <TextField
          label="Tìm theo mã hoặc họ tên"
          type="search"
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setPage(1);
          }}
          containerClassName="min-w-64 flex-1"
        />
      </div>
      {data.students.length === 0 ? (
        <EmptyState icon="users" title="Lớp chưa có học sinh nào đang hoạt động." />
      ) : rows.length === 0 ? (
        <EmptyState icon="search" title="Không có học sinh nào khớp bộ lọc.">
          <Button variant="secondary" onClick={() => { setStatus(''); setKeyword(''); }}>
            Xóa bộ lọc
          </Button>
        </EmptyState>
      ) : (
        <>
          <p className="type-body-s text-on-surface-variant">Bấm một dòng đã có bài làm để mở Chi tiết bài làm.</p>
          <Table caption="Kết quả từng học sinh">
            <thead>
              <tr>
                <Th>Mã học sinh</Th>
                <Th>Họ tên</Th>
                <Th>Trạng thái</Th>
                <Th>{stars ? 'Điểm và sao' : 'Điểm'}</Th>
                <Th>Thời gian làm</Th>
                <Th>Nộp lúc</Th>
                <Th className="w-12">
                  <span className="sr-only">Xem bài làm</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const done = isFinishedStatus(row.status) && row.attemptId !== null;
                return (
                  <Tr
                    key={row.studentId}
                    className={done ? 'cursor-pointer' : undefined}
                    onClick={done ? () => onOpenAttempt(row.attemptId!) : undefined}
                  >
                    <Td className="type-mono-label whitespace-nowrap">{row.studentCode}</Td>
                    <Td className="font-medium">
                      {done ? (
                        <button type="button" className="text-left hover:underline" onClick={(e) => { e.stopPropagation(); onOpenAttempt(row.attemptId!); }}>
                          {row.fullName}
                        </button>
                      ) : (
                        row.fullName
                      )}
                    </Td>
                    <Td>
                      <StudentStatusBadge status={row.status} label={row.statusLabel} />
                    </Td>
                    <Td className="whitespace-nowrap">
                      {done && row.score !== null ? (
                        <span className="inline-flex flex-wrap items-center gap-x-3">
                          <span className="type-label">{formatNumber(row.score)}{row.totalPoint !== null ? `/${formatNumber(row.totalPoint)}` : ''}</span>
                          {stars && <StarCount stars={row.stars} />}
                        </span>
                      ) : (
                        <Blank />
                      )}
                    </Td>
                    <Td className="whitespace-nowrap">
                      {done && row.durationSeconds !== null ? formatDuration(row.durationSeconds) : row.status === 'IN_PROGRESS' && row.startedAt ? `Bắt đầu ${formatDateTime(row.startedAt).slice(0, 5)}` : <Blank />}
                    </Td>
                    <Td className="type-mono-label whitespace-nowrap">{done && row.submittedAt ? formatDateTime(row.submittedAt) : <Blank />}</Td>
                    <Td>{done && <Icon name="chevron-right" size={18} className="text-on-surface-variant" />}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <Pagination label="học sinh" page={current} pageSize={PAGE_SIZE} totalItems={rows.length} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
