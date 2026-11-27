import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  MESSAGES,
  QUIZ_LIMITS,
  describeQuizTime,
  draftFromQuiz,
  focusFirstInvalid,
  formatDateTime,
  quizDraftToBody,
  quizNeedsOpenWindow,
  sameQuizDraft,
  splitApiError,
  timeLimitHint,
  validateQuizDraft,
  type QuizDraft,
  type QuizDraftErrors,
} from '@dsvhvn/dung-chung';
import { errorMessage, type QuestionDifficulty, type QuizDetail, type QuizQuestionItem } from '@dsvhvn/dung-chung/api';
import {
  Button,
  ButtonLink,
  ConfirmDialog,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  SelectField,
  TextAreaField,
  TextField,
  TextLink,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { LessonCodeDialog, type CodeTarget } from '../../components/lesson/LessonCodeDialog';
import { QuestionPickerDialog } from '../../components/quiz/QuestionPickerDialog';
import { QuestionPreviewDialog } from '../../components/quiz/QuestionPreviewDialog';
import { QuizQuestionList } from '../../components/quiz/QuizQuestionList';
import { QuizStatusBadge, SubmissionProgress, SwitchRow } from '../../components/quiz/QuizBits';
import { queryKeys } from '../../lib/api/queryKeys';
import { quizzesApi } from '../../lib/api/quizEndpoints';
import { NotFoundPage } from '../errors/ErrorPages';

// Soạn và phát hành bài kiểm tra — giáo viên. Thông tin chung (tên, bài học và lớp chỉ đọc, mô tả, độ khó, thời gian làm theo cấp của
// lớp, giờ mở, giờ đóng, xáo câu, cho xem đáp án sau khi nộp) và danh sách câu (điểm, thứ tự, bỏ câu, tổng điểm tự tính; thêm câu ở hộp
// Chọn câu từ ngân hàng). Không chọn lớp: lớp là lớp của bài học. Lớp cấp 1 không đặt giờ mở và đóng: bài chơi mở ngay khi phát hành.
//   - Nháp: sửa mọi thứ. "Phát hành" lưu thiết lập, hỏi xác nhận (khóa danh sách câu) rồi đưa mã bài kiểm tra để giao cho lớp; thiếu điều kiện
//     thì liệt kê đủ ngay dưới thanh thao tác.
//   - Đang phát hành: danh sách câu, điểm, thứ tự, bài học, thời gian làm, giờ mở, xáo câu, cờ hiện đáp án bị khóa; vẫn sửa tên, mô tả,
//     giờ đóng. Có Nhân bản, Kết quả, Đóng bài kiểm tra. Đã đóng: chỉ đọc, còn Nhân bản và Kết quả.
// Thao tác trên danh sách câu gửi ngay; "Lưu" chỉ lưu phần thông tin chung.

type Fields = 'name' | 'description' | 'timeLimitMinutes' | 'openAt' | 'closeAt';
const FIELDS: readonly Fields[] = ['name', 'description', 'timeLimitMinutes', 'openAt', 'closeAt'];
const DIFFICULTY_OPTIONS = [{ value: '', label: 'Chưa chọn' }, ...DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }))];

export default function QuizEditorPage() {
  const { baiKiemTra } = useParams();
  const id = Number(baiKiemTra);
  const valid = Number.isInteger(id) && id > 0;
  const detail = useQuery({
    queryKey: queryKeys.quizDetail(id),
    queryFn: () => quizzesApi.get(id).then((r) => r.data),
    enabled: valid,
    // Dữ liệu trong ô nhập là bản đang soạn; không tự tải lại khi quay lại tab.
    refetchOnWindowFocus: false,
  });

  if (!valid) return <NotFoundPage />;
  if (detail.isPending)
    return (
      <AreaPage>
        <LoadingState rows={6} />
      </AreaPage>
    );
  if (detail.isError)
    return (
      <AreaPage>
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      </AreaPage>
    );
  return <QuizEditor key={detail.data.id} quiz={detail.data} />;
}

/** Mã bài kiểm tra kèm nút gửi thông báo khi bài còn đang phát hành. */
function quizCodeTarget(quiz: QuizDetail): CodeTarget {
  const canNotify = quiz.status === 'PUBLISHED' && quiz.openState !== 'ENDED';
  return {
    title: quiz.name,
    className: quiz.className,
    accessCode: quiz.accessCode ?? '',
    kind: 'quiz',
    notify: canNotify ? (message) => quizzesApi.notifyClass(quiz.id, message) : undefined,
  };
}

/** Lời nhắc dưới ô giờ, kèm cách đọc giờ đang nhập để không nhầm 12:30 với 00:30. */
function timeHint(text: string, base: string): string {
  const described = describeQuizTime(text);
  return described ? `${base} Đang đặt: ${described}.` : base;
}

function QuizEditor({ quiz }: { quiz: QuizDetail }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const [draft, setDraft] = useState<QuizDraft>(() => draftFromQuiz(quiz));
  const [baseline, setBaseline] = useState<QuizDraft>(() => draftFromQuiz(quiz));
  const [serverErrors, setServerErrors] = useState<QuizDraftErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  /** Sau lần bấm Lưu hoặc Phát hành đầu tiên, lỗi nhập hiện theo từng ô và cập nhật khi gõ. */
  const [attempt, setAttempt] = useState<'save' | 'publish' | null>(null);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(0);
  const [picking, setPicking] = useState(false);
  const [previewAt, setPreviewAt] = useState<number | null>(null);
  const [confirmingPublish, setConfirmingPublish] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [busy, setBusy] = useState<'publish' | 'close' | 'duplicate' | null>(null);
  const [code, setCode] = useState<CodeTarget | null>(null);

  const draftStatus = quiz.status === 'DRAFT';
  const published = quiz.status === 'PUBLISHED';
  const closed = quiz.status === 'CLOSED';
  const level = quiz.schoolLevel;
  const canSettings = quiz.access.canEditSettings;
  const canClose = quiz.access.canEditCloseTime;
  const canQuestions = quiz.access.canEditQuestions;
  const dirty = !sameQuizDraft(draft, baseline);
  const title = quiz.name ?? 'Bài kiểm tra chưa có tên';

  const store = (next: QuizDetail) => queryClient.setQueryData(queryKeys.quizDetail(quiz.id), next);
  const refreshList = () => void queryClient.invalidateQueries({ queryKey: queryKeys.quizzes });
  const edit = (patch: Partial<QuizDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setServerErrors({});
    setFormError(null);
  };

  /** Xếp thao tác trên danh sách câu vào hàng đợi để chạy lần lượt (bấm nhanh hai lần không chạy chồng nhau). */
  const enqueue = (action: () => Promise<QuizDetail>, fallbackMessage?: string) => {
    setWorking((n) => n + 1);
    const run = queue.current.then(async () => {
      try {
        store(await action());
        refreshList();
      } catch (err) {
        toast.error(errorMessage(err) || fallbackMessage || 'Không thực hiện được.');
        void queryClient.invalidateQueries({ queryKey: queryKeys.quizDetail(quiz.id) });
      } finally {
        setWorking((n) => n - 1);
      }
    });
    queue.current = run;
    return run;
  };

  const replaceQuestions = (items: QuizQuestionItem[]) => void enqueue(() => quizzesApi.replaceQuestions(quiz.id, items).then((r) => r.data));
  const removeQuestion = (questionId: number) => void enqueue(() => quizzesApi.removeQuestion(quiz.id, questionId).then((r) => r.data));
  const addQuestions = async (questionIds: number[]) => {
    const { data } = await quizzesApi.addQuestions(quiz.id, questionIds);
    store(data);
    refreshList();
    setPicking(false);
    toast.success(`Đã thêm ${questionIds.length} câu vào bài kiểm tra.`);
  };

  /** Lưu phần thông tin chung; trả chi tiết mới, hoặc null khi còn lỗi nhập. */
  const save = async (forPublish = false): Promise<QuizDetail | null> => {
    setAttempt(forPublish ? 'publish' : 'save');
    const found = validateQuizDraft(draft, level, { forPublish });
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return null;
    }
    setSaving(true);
    setFormError(null);
    try {
      await queue.current;
      const { data } = await quizzesApi.update(quiz.id, quizDraftToBody(draft, quiz));
      store(data);
      refreshList();
      const next = draftFromQuiz(data);
      setDraft(next);
      setBaseline(next);
      return data;
    } catch (err) {
      const failure = splitApiError<Fields>(err, FIELDS);
      setServerErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    const saved = await save();
    if (saved) toast.success(MESSAGES.success('Lưu bài kiểm tra'));
  };

  const onPublishClick = async () => {
    setAttempt('publish');
    await queue.current;
    const found = validateQuizDraft(draft, level, { forPublish: true });
    if (Object.keys(found).length > 0) {
      focusFirstInvalid(formRef.current);
      return;
    }
    // Lưu thiết lập đang soạn rồi mới xét điều kiện, để lời xác nhận và danh sách còn thiếu theo đúng điều đang thấy trên màn hình.
    const latest = queryClient.getQueryData<QuizDetail>(queryKeys.quizDetail(quiz.id)) ?? quiz;
    const saved = dirty ? await save(true) : latest;
    if (!saved || !saved.readiness.isReady) return;
    setConfirmingPublish(true);
  };

  const publish = async () => {
    setBusy('publish');
    try {
      const { data, message } = await quizzesApi.publish(quiz.id);
      store(data.quiz);
      refreshList();
      setConfirmingPublish(false);
      toast.success(data.message ?? message ?? MESSAGES.success('Phát hành bài kiểm tra'));
      const next = draftFromQuiz(data.quiz);
      setDraft(next);
      setBaseline(next);
      if (data.quiz.accessCode) setCode(quizCodeTarget(data.quiz));
    } catch (err) {
      setConfirmingPublish(false);
      setFormError(errorMessage(err));
      void queryClient.invalidateQueries({ queryKey: queryKeys.quizDetail(quiz.id) });
    } finally {
      setBusy(null);
    }
  };

  const close = async () => {
    setBusy('close');
    try {
      const { data } = await quizzesApi.close(quiz.id);
      store(data.quiz);
      refreshList();
      toast.success(data.message);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
      setConfirmingClose(false);
    }
  };

  const duplicate = async () => {
    setBusy('duplicate');
    try {
      const { data } = await quizzesApi.duplicate(quiz.id);
      refreshList();
      toast.success(data.message);
      void navigate(PATHS.quiz(data.quiz.id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const errors: QuizDraftErrors = attempt ? { ...validateQuizDraft(draft, level, { forPublish: attempt === 'publish' }), ...serverErrors } : serverErrors;
  const unusableAt = quiz.questions.findIndex((q) => !q.isUsable);
  const lessonDraft = quiz.lessonStatus !== 'PUBLISHED';
  const showMissing = draftStatus && quiz.readiness.missing.length > 0 && (attempt === 'publish' || quiz.questionCount > 0 || quiz.openAt !== null);
  const timeDisabled = !canSettings || level === 1;
  // Bài cấp 1 không đặt giờ; bài cũ đã có giờ thì vẫn hiện để thầy cô thấy.
  const showTimes = quizNeedsOpenWindow(level) || quiz.openAt !== null || quiz.closeAt !== null;
  const editedBy = quiz.updatedAt ? `sửa lần cuối ${formatDateTime(quiz.updatedAt)}` : null;

  return (
    <AreaPage>
      <PageHeader
        title={title}
        before={
          <nav aria-label="Vị trí" className="type-body-s text-on-surface-variant">
            <TextLink to={pathOf('quizzes')}>Bài kiểm tra</TextLink> / <span aria-current="page">{title}</span>
          </nav>
        }
        description={
          <span className="flex flex-wrap items-center gap-3">
            <QuizStatusBadge status={quiz.status} openState={quiz.openState} openStateLabel={quiz.openStateLabel} />
            <span>
              Bài học: {quiz.lessonTitle} · Lớp {quiz.className} · Cấp {level}
              {editedBy ? ` · ${editedBy}` : ''}
            </span>
          </span>
        }
        actions={
          <>
            <ButtonLink to={PATHS.lesson(quiz.lessonId)} variant="secondary">
              <Icon name="arrow-left" size={16} />
              Về bài học
            </ButtonLink>
            {!closed && (
              <Button variant="secondary" onClick={() => void onSave()} loading={saving} disabled={!dirty || busy !== null}>
                Lưu
              </Button>
            )}
            {draftStatus && (
              <Button onClick={() => void onPublishClick()} disabled={saving || busy !== null}>
                Phát hành
              </Button>
            )}
          </>
        }
      />

      {(published || closed) && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface px-4 py-3" data-testid="thanh-trang-thai">
          <QuizStatusBadge status={quiz.status} openState={quiz.openState} openStateLabel={quiz.openStateLabel} />
          <span className="type-body-m text-on-surface">
            <SubmissionProgress submitted={quiz.submittedCount} students={quiz.studentCount} /> em đã nộp
          </span>
          <span className="flex-1" />
          {quiz.accessCode && (
            <Button variant="secondary" onClick={() => setCode(quizCodeTarget(quiz))}>
              <Icon name="key" size={16} />
              Mã bài kiểm tra
            </Button>
          )}
          <Button variant="secondary" onClick={() => void duplicate()} loading={busy === 'duplicate'} disabled={!quiz.access.canDuplicate || busy !== null}>
            <Icon name="copy" size={16} />
            Nhân bản
          </Button>
          <ButtonLink to={PATHS.quizResults(quiz.id)} variant="secondary">
            <Icon name="bar-chart" size={16} />
            Kết quả
          </ButtonLink>
          {quiz.access.canClose && (
            <Button variant="danger" onClick={() => setConfirmingClose(true)} disabled={busy !== null}>
              <Icon name="lock" size={16} />
              Đóng bài kiểm tra
            </Button>
          )}
        </div>
      )}

      {published && (
        <InlineMessage tone="success">
          Bài kiểm tra đã phát hành: danh sách câu, điểm, thứ tự, bài học, thời gian làm, giờ mở, xáo câu và cách hiện đáp án đã bị khóa. Vẫn sửa
          được tên, mô tả và giờ đóng (không sớm hơn hiện tại). Muốn đổi câu thì bấm "Nhân bản".
        </InlineMessage>
      )}
      {closed && (
        <InlineMessage tone="info">Bài kiểm tra đã đóng và không mở lại được. Bấm "Nhân bản" để làm bản mới cho lần sau.</InlineMessage>
      )}

      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      {showMissing && (
        <InlineMessage
          tone="danger"
          action={
            lessonDraft ? (
              <TextLink to={PATHS.lesson(quiz.lessonId)} className="font-medium">
                Mở bài học
              </TextLink>
            ) : unusableAt >= 0 ? (
              <a href={`#cau-${unusableAt + 1}`} className="font-medium underline">
                Xem câu số {unusableAt + 1}
              </a>
            ) : undefined
          }
        >
          Chưa đủ điều kiện phát hành. Còn thiếu: {quiz.readiness.missing.join('; ')}.
        </InlineMessage>
      )}
      {draftStatus && quiz.readiness.warnings.length > 0 && quiz.readiness.missing.length === 0 && (
        <InlineMessage tone="info">Lưu ý: {quiz.readiness.warnings.join('; ')}.</InlineMessage>
      )}

      <form ref={formRef} noValidate onSubmit={(e) => e.preventDefault()} className="rounded-md border border-border bg-surface p-5 dsvmd:p-6" aria-labelledby="thong-tin-chung">
        <h2 id="thong-tin-chung" className="type-h3 text-on-surface">
          Thông tin chung
        </h2>
        <div className="mt-4 grid gap-4 dsvmd:grid-cols-2">
          <TextField
            label="Tên bài kiểm tra *"
            name="name"
            value={draft.name}
            maxLength={QUIZ_LIMITS.nameMaxLength}
            autoComplete="off"
            disabled={!canClose}
            onChange={(e) => edit({ name: e.target.value })}
            error={errors.name}
            hint={`Tối đa ${QUIZ_LIMITS.nameMaxLength} ký tự.`}
          />
          <TextField
            label="Bài học"
            name="lesson"
            value={`${quiz.lessonTitle ?? ''} · Lớp ${quiz.className} · Cấp ${level}`}
            disabled
            readOnly
            hint="Không đổi sau khi tạo; lớp làm bài là lớp của bài học."
          />
        </div>
        <div className="mt-4">
          <TextAreaField
            label="Mô tả / hướng dẫn"
            name="description"
            value={draft.description}
            rows={3}
            disabled={!canClose}
            onChange={(e) => edit({ description: e.target.value })}
            error={errors.description}
          />
        </div>
        <div className="mt-4 grid gap-4 dsvsm:grid-cols-2 dsvmd:grid-cols-4">
          <SelectField
            label="Độ khó"
            name="difficultyLevel"
            value={draft.difficultyLevel}
            disabled={!canSettings}
            options={DIFFICULTY_OPTIONS}
            onChange={(e) => edit({ difficultyLevel: e.target.value as QuestionDifficulty | '' })}
          />
          <TextField
            label={level === 3 ? 'Thời gian làm (phút) *' : 'Thời gian làm (phút)'}
            name="timeLimitMinutes"
            inputMode="numeric"
            value={level === 1 ? '' : draft.timeLimitMinutes}
            placeholder={level === 1 ? 'Không đồng hồ' : 'Nhập số phút'}
            disabled={timeDisabled}
            onChange={(e) => edit({ timeLimitMinutes: e.target.value })}
            error={errors.timeLimitMinutes}
            hint={timeLimitHint(level)}
          />
          {showTimes && (
            <>
              <TextField
                label="Mở lúc *"
                name="openAt"
                value={draft.openAt}
                placeholder="07:00 06/10/2026"
                autoComplete="off"
                disabled={!canSettings}
                onChange={(e) => edit({ openAt: e.target.value })}
                error={errors.openAt}
                hint={timeHint(draft.openAt, 'Giờ Việt Nam, đồng hồ 24 giờ: 00:30 là nửa đêm, 12:30 là giữa trưa.')}
              />
              <TextField
                label="Đóng lúc *"
                name="closeAt"
                value={draft.closeAt}
                placeholder="17:00 07/10/2026"
                autoComplete="off"
                disabled={!canClose}
                onChange={(e) => edit({ closeAt: e.target.value })}
                error={errors.closeAt}
                hint={timeHint(draft.closeAt, 'Phải sau giờ mở. Quá giờ đóng, hệ thống tự đóng bài.')}
              />
            </>
          )}
        </div>
        {!showTimes && (
          <InlineMessage tone="info" className="mt-4">
            Lớp cấp 1 không đặt giờ mở và đóng để em không bị áp lực: bài chơi mở ngay khi phát hành, thầy cô bấm "Đóng bài kiểm tra" khi không dùng nữa.
          </InlineMessage>
        )}
        <div className="mt-4 grid gap-4 dsvmd:grid-cols-2">
          <SwitchRow
            label="Xáo câu"
            hint="Mỗi em một thứ tự câu, giữ nguyên suốt lượt làm."
            checked={draft.shuffleQuestions}
            disabled={!canSettings}
            onChange={(checked) => edit({ shuffleQuestions: checked })}
          />
          <SwitchRow
            label="Cho xem đáp án sau khi nộp"
            hint="Hiện đáp án đúng và giải thích ngay sau khi em nộp bài."
            checked={draft.showAnswersAfterSubmit}
            disabled={!canSettings}
            onChange={(checked) => edit({ showAnswersAfterSubmit: checked })}
          />
        </div>
      </form>

      <QuizQuestionList
        quiz={quiz}
        editable={canQuestions && !saving && busy === null}
        onReplace={replaceQuestions}
        onRemove={removeQuestion}
        onAdd={() => setPicking(true)}
        onPreview={setPreviewAt}
      />
      {working > 0 && (
        <output className="block type-body-s text-on-surface-variant">Đang lưu thay đổi của danh sách câu…</output>
      )}

      {picking && <QuestionPickerDialog quiz={quiz} onAdd={addQuestions} onClose={() => setPicking(false)} />}
      {previewAt !== null && (
        <QuestionPreviewDialog
          heading="Xem trước như học sinh"
          items={quiz.questions.map((q) => ({ questionId: q.questionId, point: q.point }))}
          startIndex={previewAt}
          level={level}
          onClose={() => setPreviewAt(null)}
        />
      )}
      {code && <LessonCodeDialog target={code} onClose={() => setCode(null)} />}

      <ConfirmDialog
        open={confirmingPublish}
        title="Phát hành bài kiểm tra?"
        confirmLabel="Phát hành"
        confirming={busy === 'publish'}
        onConfirm={() => void publish()}
        onClose={() => setConfirmingPublish(false)}
      >
        {quiz.publishNotice ?? 'Sau khi phát hành, danh sách câu hỏi và điểm sẽ bị khóa.'}
        {draft.openAt.trim() !== '' && ` Bài mở lúc ${describeQuizTime(draft.openAt) ?? draft.openAt}.`}
      </ConfirmDialog>
      <ConfirmDialog
        open={confirmingClose}
        title={`Đóng bài kiểm tra "${title}"?`}
        confirmLabel="Đóng bài kiểm tra"
        tone="danger"
        confirming={busy === 'close'}
        onConfirm={() => void close()}
        onClose={() => setConfirmingClose(false)}
      >
        Sau khi đóng, học sinh lớp {quiz.className} không vào làm được nữa và bài kiểm tra không mở lại được. Lượt đang làm dở được tự nộp theo
        các câu đã lưu. Hiện {quiz.submittedCount}/{quiz.studentCount} em đã nộp.
      </ConfirmDialog>
    </AreaPage>
  );
}
