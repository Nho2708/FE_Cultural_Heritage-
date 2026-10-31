import { MESSAGES, SUGGESTION_RANGES, rangeFrom, type SuggestionRangeId } from '@dsvhvn/dung-chung';
import type { ClassRecommendations, ClassRoom, HeritageCard } from '@dsvhvn/dung-chung/api';
import { Button, ErrorState, Icon, InlineMessage, LoadingState, SelectField, useToast } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { classRecommendationsApi, statisticsApi } from '../../lib/api/statisticsEndpoints';
import { CreateLessonDialog } from '../lesson/CreateLessonDialog';

// Gợi ý ôn tập cho lớp — dùng ở tab Gợi ý của Kết quả bài kiểm tra (chỉ bài này) và tab Gợi ý ôn tập của Chi tiết lớp (cả lớp, chọn bài và
// khoảng thời gian). Tính trên các bài đã nộp của lớp; không gửi dữ liệu cá nhân của học sinh sang dịch vụ AI. "Tạo bài ôn tập" mở hộp thoại
// Tạo bài học với lớp và di sản đã chọn sẵn; bài mới là bài nháp của lớp.

function toCard(item: { heritageId: number; slug: string | null; name: string | null; thumbnailUrl: string | null; shortDescription: string | null; provinceName: string | null }): HeritageCard {
  return {
    id: item.heritageId,
    slug: item.slug ?? '',
    name: item.name ?? '',
    shortDescription: item.shortDescription,
    thumbnailUrl: item.thumbnailUrl,
    provinceId: null,
    provinceName: item.provinceName,
    region: null,
    heritageType: null,
    recognitionLevel: null,
    recognizedYear: null,
  };
}

/** Hộp thoại Tạo bài học cho lớp với các di sản gợi ý đã chọn sẵn. */
function ReviewLessonDialog({ classId, heritages, onClose }: { classId: number; heritages: HeritageCard[]; onClose: () => void }) {
  const classRoom = useQuery({ queryKey: queryKeys.classDetail(classId), queryFn: () => classesApi.get(classId).then((r) => r.data) });
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  if (!classRoom.data) return null;
  const room: ClassRoom = classRoom.data;
  return (
    <CreateLessonDialog
      fixedClass={room}
      initialHeritages={heritages}
      initialTitle={heritages[0] ? `Ôn tập: ${heritages[0].name}` : undefined}
      onCreated={(lesson, message) => {
        toast.success(message ?? MESSAGES.success('Tạo bài học'));
        void queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
        void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
        void navigate(PATHS.lesson(lesson.id));
      }}
      onClose={onClose}
    />
  );
}

function SuggestionCard({ title, hint, icon, children }: { title: string; hint: string; icon: 'alert-triangle' | 'map-pin'; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-md border border-border bg-surface p-5">
      <h3 className="flex items-center gap-2 type-h4 text-on-surface">
        <Icon name={icon} size={20} className={icon === 'alert-triangle' ? 'text-danger' : 'text-primary'} />
        {title}
      </h3>
      <p className="mt-1 type-body-s text-on-surface-variant">{hint}</p>
      <ul className="mt-4 flex flex-col gap-3">{children}</ul>
    </section>
  );
}

function Item({ name, reason, onCreate }: { name: string | null; reason: string; onCreate: () => void }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md bg-surface-container-low px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="type-label text-on-surface">{name}</p>
        <p className="type-body-s text-on-surface-variant">{reason}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onCreate} aria-label={`Tạo bài ôn tập về ${name ?? 'di sản này'}`}>
        <Icon name="plus" size={16} />
        Tạo bài ôn tập
      </Button>
    </li>
  );
}

interface FilterProps {
  range: SuggestionRangeId;
  onRange: (next: SuggestionRangeId) => void;
  /** Chỉ tab của lớp: chọn bài kiểm tra. */
  quizId?: number | '';
  quizOptions?: Array<{ value: string; label: string }>;
  onQuiz?: (next: number | '') => void;
  scopeLabel?: string;
}

function Filters({ range, onRange, quizId, quizOptions, onQuiz, scopeLabel }: FilterProps) {
  return (
    <div className="flex flex-wrap items-end gap-4">
      {quizOptions && onQuiz ? (
        <SelectField
          label="Phạm vi"
          containerClassName="min-w-64"
          value={quizId === '' || quizId === undefined ? '' : String(quizId)}
          onChange={(e) => onQuiz(e.target.value === '' ? '' : Number(e.target.value))}
          options={quizOptions}
        />
      ) : (
        <p className="pb-2 type-label text-on-surface">{scopeLabel}</p>
      )}
      <SelectField
        label="Thời gian"
        containerClassName="min-w-52"
        value={range}
        onChange={(e) => onRange(e.target.value as SuggestionRangeId)}
        options={SUGGESTION_RANGES.map((r) => ({ value: r.id, label: r.label }))}
      />
    </div>
  );
}

function Panel({ data, classId, filters }: { data: ClassRecommendations; classId: number; filters: ReactNode }) {
  const reviewHint = data.quizId === null ? 'Di sản lớp sai từ 40% và có ít nhất 10 câu trả lời, tối đa 5.' : 'Di sản lớp sai từ 40% trong bài kiểm tra này, tối đa 5.';
  const [creating, setCreating] = useState<HeritageCard[] | null>(null);
  const review = data.heritagesToReview;
  const related = data.relatedHeritages;
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        {filters}
        {review.length > 0 && (
          <Button onClick={() => setCreating(review.map(toCard))}>
            <Icon name="plus" size={16} />
            Tạo bài ôn tập
          </Button>
        )}
      </div>
      <p className="type-body-s text-on-surface-variant">
        Tính trên {data.submittedAttempts} bài đã nộp, {data.answeredQuestions} câu trả lời. Không gửi họ tên, mã học sinh hay tên lớp sang dịch vụ AI.
      </p>
      {data.message && <InlineMessage tone="info">{data.message}</InlineMessage>}
      {data.relatedFromFallback && (
        <InlineMessage tone="warning">Dịch vụ AI chưa phản hồi nên di sản liên quan được chọn theo cùng tỉnh hoặc cùng loại di sản.</InlineMessage>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <SuggestionCard title="Di sản nên ôn" icon="alert-triangle" hint={reviewHint}>
          {review.length === 0 ? (
            <li className="type-body-s text-on-surface-variant">Chưa có di sản nào cần ôn.</li>
          ) : (
            review.map((item) => <Item key={item.heritageId} name={item.name} reason={item.reason} onCreate={() => setCreating([toCard(item)])} />)
          )}
        </SuggestionCard>
        <SuggestionCard title="Di sản liên quan" icon="map-pin" hint="Gần với các di sản lớp đã học: cùng loại, cùng vùng hoặc tỉnh, cùng thời kỳ; tối đa 5.">
          {related.length === 0 ? (
            <li className="type-body-s text-on-surface-variant">Chưa có di sản liên quan để gợi ý.</li>
          ) : (
            related.map((item) => <Item key={item.heritageId} name={item.name} reason={item.reason} onCreate={() => setCreating([toCard(item)])} />)
          )}
        </SuggestionCard>
      </div>
      {creating && <ReviewLessonDialog classId={classId} heritages={creating} onClose={() => setCreating(null)} />}
    </div>
  );
}

/** Tab Gợi ý của Kết quả bài kiểm tra: gợi ý riêng cho bài này. */
export function QuizSuggestions({ quizId, classId, className }: { quizId: number; classId: number; className: string | null }) {
  const [range, setRange] = useState<SuggestionRangeId>('30');
  const query = useQuery({
    queryKey: queryKeys.quizSuggestions(quizId, range),
    queryFn: () => classRecommendationsApi.forQuiz(quizId, { from: rangeFrom(range) }).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const filters = <Filters range={range} onRange={setRange} scopeLabel={`Phạm vi: bài kiểm tra này, lớp ${className ?? ''}`} />;
  if (query.isPending) return <LoadingState rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Panel data={query.data} classId={classId} filters={filters} />;
}

/** Tab Gợi ý ôn tập của Chi tiết lớp: cả lớp, hoặc thu hẹp theo một bài kiểm tra. */
export function ClassSuggestions({ classId }: { classId: number }) {
  const [range, setRange] = useState<SuggestionRangeId>('30');
  const [quizId, setQuizId] = useState<number | ''>('');
  const filter = { quizId, from: rangeFrom(range) };
  const progress = useQuery({ queryKey: queryKeys.classProgress(classId), queryFn: () => statisticsApi.classProgress(classId).then((r) => r.data) });
  const query = useQuery({
    queryKey: queryKeys.classSuggestions(classId, { quizId, from: range }),
    queryFn: () => classRecommendationsApi.forClass(classId, filter).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const quizOptions = [
    { value: '', label: 'Mọi bài kiểm tra của lớp' },
    ...(progress.data?.quizzes ?? []).map((q) => ({ value: String(q.quizId), label: q.name ?? 'Bài kiểm tra' })),
  ];
  const filters = <Filters range={range} onRange={setRange} quizId={quizId} quizOptions={quizOptions} onQuiz={setQuizId} />;
  if (query.isPending) return <LoadingState rows={3} />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <Panel data={query.data} classId={classId} filters={filters} />;
}
