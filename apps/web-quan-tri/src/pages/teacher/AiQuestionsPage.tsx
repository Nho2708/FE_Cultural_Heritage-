import { DIFFICULTIES, DIFFICULTY_LABEL, MESSAGES, QUESTION_TYPE_LABEL, typesByLevel } from '@dsvhvn/dung-chung';
import { errorMessage, type QuestionBatch, type QuestionDetail, type QuestionDifficulty, type QuestionType } from '@dsvhvn/dung-chung/api';
import {
  Button,
  CheckboxField,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  SelectField,
  TextField,
  TextLink,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { AiQuotaMeter, PlanNotice } from '../../components/lesson/LessonBits';
import { DifficultyBadge, LevelRangeBadge, ReviewStatusBadge } from '../../components/question/QuestionBits';
import { QuestionFormDialog } from '../../components/question/QuestionFormDialog';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { questionsApi } from '../../lib/api/questionEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Sinh và duyệt câu hỏi bằng AI — giáo viên. Từ một bài học: chọn số câu (1-20), độ khó, các dạng trong dạng của cấp lớp, di sản
// trong các di sản của bài. Mỗi lần sinh là một lượt AI của trường (lượt thất bại không tính). Câu sinh ra vào ngân hàng ở trạng
// thái Chờ duyệt; thầy cô Duyệt / Sửa / Loại từng câu hoặc "Duyệt tất cả câu còn lại".

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }));

export default function AiQuestionsPage() {
  const lessonId = Number(useParams().baiHoc);
  const toast = useToast();
  const queryClient = useQueryClient();

  const lesson = useQuery({ queryKey: queryKeys.lessonDetail(lessonId), queryFn: () => lessonsApi.get(lessonId).then((r) => r.data) });
  const quota = useQuery({ queryKey: queryKeys.questionQuota(lessonId), queryFn: () => questionsApi.quota(lessonId).then((r) => r.data) });
  const typeTable = useQuery({ queryKey: queryKeys.questionTypes, queryFn: () => questionsApi.types().then((r) => r.data) });

  const [count, setCount] = useState('5');
  const [difficulty, setDifficulty] = useState<QuestionDifficulty>('MEDIUM');
  const [chosenTypes, setChosenTypes] = useState<Set<QuestionType>>(new Set());
  const [heritageId, setHeritageId] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [batch, setBatch] = useState<QuestionBatch | null>(null);
  const [items, setItems] = useState<QuestionDetail[]>([]);
  const [busyId, setBusyId] = useState<number | 'all' | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const back = <TextLink to={pathOf('lessons')}>← Bài học</TextLink>;
  if (lesson.isPending) {
    return (
      <AreaPage>
        <PageHeader title="Sinh và duyệt câu hỏi bằng AI" before={back} />
        <LoadingState />
      </AreaPage>
    );
  }
  if (lesson.isError) {
    return (
      <AreaPage>
        <PageHeader title="Sinh và duyệt câu hỏi bằng AI" before={back} />
        <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />
      </AreaPage>
    );
  }

  const level = lesson.data.schoolLevel;
  const levelTypes = typesByLevel(typeTable.data, level);
  const published = lesson.data.heritages.filter((h) => h.status === 'PUBLISHED');
  const archived = lesson.data.status === 'ARCHIVED';
  const noPlan = quota.data?.hasEffectivePlan === false;
  const noQuota = quota.data?.hasEffectivePlan === true && quota.data.remaining !== null && quota.data.remaining <= 0;
  const countNumber = Number(count);
  const countInvalid = !Number.isInteger(countNumber) || countNumber < 1 || countNumber > 20;
  const blockedReason = archived
    ? 'Bài học đã lưu trữ nên không sinh được câu hỏi.'
    : published.length === 0
      ? 'Bài học không còn di sản đang xuất bản nên không sinh được câu hỏi.'
      : noQuota
        ? 'Trường đã dùng hết lượt AI trong kỳ này.'
        : null;

  const refreshBatch = async (ids: number[]) => {
    const fresh = await Promise.all(ids.map((id) => questionsApi.get(id).then((r) => r.data).catch(() => null)));
    setItems((current) => current.map((item) => fresh.find((f) => f?.id === item.id) ?? item));
    void queryClient.invalidateQueries({ queryKey: queryKeys.questions });
  };

  const generate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const { data } = await questionsApi.generate(lessonId, {
        count: countNumber,
        difficultyLevel: difficulty,
        types: chosenTypes.size > 0 ? levelTypes.filter((t) => chosenTypes.has(t)) : undefined,
        heritageId: heritageId ? Number(heritageId) : undefined,
      });
      setBatch(data);
      setItems(data.questions);
      void queryClient.invalidateQueries({ queryKey: queryKeys.questions });
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionQuota(lessonId) });
      toast.success(data.message);
    } catch (err) {
      setError(errorMessage(err));
      void queryClient.invalidateQueries({ queryKey: queryKeys.questionQuota(lessonId) });
    } finally {
      setGenerating(false);
    }
  };

  const decide = async (item: QuestionDetail, kind: 'approve' | 'reject') => {
    setBusyId(item.id);
    try {
      const { data, message } = await (kind === 'approve' ? questionsApi.approve(item.id) : questionsApi.reject(item.id));
      setItems((current) => current.map((i) => (i.id === item.id ? data : i)));
      toast.success(message ?? MESSAGES.success(kind === 'approve' ? 'Duyệt câu hỏi' : 'Loại câu hỏi'));
      void queryClient.invalidateQueries({ queryKey: queryKeys.questions });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const pending = items.filter((i) => i.reviewStatus === 'PENDING');
  const approveRest = async () => {
    setBusyId('all');
    try {
      const { data } = await questionsApi.approveMany(pending.map((i) => i.id));
      toast.success(data.skipped.length > 0 ? `${data.message} ${data.skipped.length} câu chưa duyệt được: ${data.skipped[0]?.reason ?? ''}` : data.message);
      await refreshBatch(pending.map((i) => i.id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const toggleType = (type: QuestionType) =>
    setChosenTypes((current) => {
      const next = new Set(current);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });

  return (
    <AreaPage>
      <PlanNotice quota={quota.data} />
      <PageHeader
        title="Sinh và duyệt câu hỏi bằng AI"
        before={
          <>
            <TextLink to={pathOf('lessons')}>Bài học</TextLink> / <TextLink to={PATHS.lesson(lessonId)}>{lesson.data.title ?? 'Bài học'}</TextLink>
          </>
        }
        description={`Lớp ${lesson.data.className} · ${lesson.data.schoolLevelName}. AI chỉ sinh các dạng câu dùng được ở cấp này; câu sinh ra chờ thầy cô duyệt trước khi dùng.`}
      />

      <div className="grid gap-6 dsvmd:grid-cols-[2fr_1fr]">
        <form
          className="flex flex-col gap-4 rounded-md border border-border bg-surface p-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!countInvalid && !noPlan && !blockedReason) void generate();
          }}
        >
          <div className="grid gap-4 dsvsm:grid-cols-3">
            <TextField
              label="Số câu"
              type="number"
              min={1}
              max={20}
              value={count}
              error={countInvalid ? 'Nhập số câu từ 1 đến 20.' : null}
              onChange={(e) => setCount(e.target.value)}
            />
            <SelectField label="Độ khó" value={difficulty} options={DIFFICULTY_OPTIONS} onChange={(e) => setDifficulty(e.target.value as QuestionDifficulty)} />
            <SelectField
              label="Di sản"
              value={heritageId}
              onChange={(e) => setHeritageId(e.target.value)}
              options={[{ value: '', label: 'Cả bài học' }, ...published.map((h) => ({ value: String(h.id), label: h.name ?? `Di sản ${h.id}` }))]}
            />
          </div>
          <fieldset>
            <legend className="type-label text-on-surface-variant">Dạng câu (để trống là mọi dạng của cấp)</legend>
            <div className="mt-2 grid gap-2 dsvsm:grid-cols-2">
              {levelTypes.map((type) => (
                <CheckboxField key={type} label={QUESTION_TYPE_LABEL[type]} checked={chosenTypes.has(type)} onChange={() => toggleType(type)} />
              ))}
            </div>
          </fieldset>
          {blockedReason && <InlineMessage tone="warning">{blockedReason}</InlineMessage>}
          {error && <InlineMessage tone="danger">{error}</InlineMessage>}
          <div>
            <Button type="submit" loading={generating} disabled={countInvalid || noPlan || blockedReason !== null}>
              <Icon name={noPlan ? 'lock' : 'sparkles'} size={16} />
              {batch ? 'Sinh lại' : 'Sinh câu hỏi'}
            </Button>
            <p className="mt-2 type-body-s text-on-surface-variant">Mỗi lần sinh là một lượt AI của trường, bất kể số câu; lần sinh lỗi không tính lượt.</p>
          </div>
        </form>
        {quota.data && <AiQuotaMeter quota={quota.data} />}
      </div>

      {generating && <LoadingState rows={3} label="AI đang sinh câu hỏi…" />}

      {batch && !generating && (
        <section aria-label="Câu chờ duyệt của lần sinh này" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="type-h3 text-on-surface">Câu của lần sinh này</h2>
              <p className="type-body-s text-on-surface-variant">
                Yêu cầu {batch.requested} câu, nhận {batch.received} câu{batch.dropped > 0 ? `, ${batch.dropped} câu không đạt quy tắc đã bị bỏ` : ''}.
              </p>
            </div>
            <Button disabled={pending.length === 0} loading={busyId === 'all'} onClick={() => void approveRest()}>
              <Icon name="check" size={16} />
              Duyệt tất cả câu còn lại ({pending.length})
            </Button>
          </div>
          {items.length === 0 ? (
            <EmptyState icon="file-text" title="AI chưa trả được câu nào." />
          ) : (
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="rounded-md border border-border bg-surface p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewStatusBadge status={item.reviewStatus} />
                    <span className="type-label text-on-surface-variant">{item.typeName}</span>
                    <LevelRangeBadge min={item.levelMin} max={item.levelMax} />
                    <DifficultyBadge value={item.difficultyLevel} />
                    <span className="type-body-s text-on-surface-variant">{item.heritageName}</span>
                  </div>
                  <p className="mt-2 type-body-m text-on-surface">{item.content}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.reviewStatus === 'PENDING' && (
                      <>
                        <Button size="sm" loading={busyId === item.id} onClick={() => void decide(item, 'approve')} aria-label={`Duyệt câu "${item.content}"`}>
                          Duyệt
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditing(item.id)} aria-label={`Sửa câu "${item.content}"`}>
                          Sửa
                        </Button>
                        <Button size="sm" variant="secondary" disabled={busyId === item.id} onClick={() => void decide(item, 'reject')} aria-label={`Loại câu "${item.content}"`}>
                          Loại
                        </Button>
                      </>
                    )}
                    {item.reviewStatus !== 'PENDING' && (
                      <Button size="sm" variant="ghost" onClick={() => setEditing(item.id)} aria-label={`Xem câu "${item.content}"`}>
                        Xem
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {editing !== null && (
        <QuestionFormDialog
          key={editing}
          questionId={editing}
          onClose={() => setEditing(null)}
          onChanged={() => void refreshBatch(items.map((i) => i.id))}
          onOpen={setEditing}
        />
      )}
    </AreaPage>
  );
}
