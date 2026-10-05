import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  MESSAGES,
  QUESTION_TYPES,
  QUESTION_TYPE_LABEL,
  QUESTION_TYPE_LEVELS,
  changeDraftType,
  clampLevels,
  draftFromDetail,
  draftToBody,
  emptyDraft,
  fieldError,
  syncBlanks,
  type QuestionDraft,
} from '@dsvhvn/dung-chung';
import { ApiError, errorMessage, type QuestionDetail, type QuestionDifficulty, type QuestionType, type ValidateQuestionResult } from '@dsvhvn/dung-chung/api';
import { Button, ConfirmDialog, ErrorState, Icon, InlineMessage, LoadingState, Modal, SelectField, TextAreaField, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { questionsApi } from '../../lib/api/questionEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { AnswerFields } from './QuestionAnswerFields';
import { HeritageSelect } from './QuestionPickers';
import { QuestionPreviewCard, ReviewStatusBadge } from './QuestionBits';

// Biểu mẫu câu hỏi theo dạng (hộp thoại lớn): dùng chung cho tạo thủ công, sửa, duyệt câu AI và xem chỉ đọc. Cấu trúc đáp án đổi
// theo dạng; mỗi lần gõ (chờ nửa giây) gọi kiểm hợp lệ của máy chủ để hiện lỗi theo ô và dựng "xem trước như học sinh" theo cấp.
// Câu đã nằm trong bài kiểm tra, câu của người khác, câu bị quản trị hệ thống ẩn chỉ xem được; có "Nhân bản để sửa" (trừ câu bị ẩn).

interface QuestionFormDialogProps {
  /** Mở câu có sẵn; bỏ trống là tạo câu mới. */
  questionId: number | null;
  /** Dạng chọn sẵn khi tạo mới (theo bộ lọc dạng của danh sách). */
  initialType?: QuestionType;
  onClose: () => void;
  /** Có thay đổi trong ngân hàng (lưu, duyệt, loại, xóa, nhân bản): danh sách cần tải lại. */
  onChanged: (message: string | null) => void;
  /** Chuyển sang xem một câu khác (sau khi nhân bản). */
  onOpen: (id: number) => void;
}

const DIFFICULTY_OPTIONS = DIFFICULTIES.map((d) => ({ value: d, label: DIFFICULTY_LABEL[d] }));
const TYPE_OPTIONS = QUESTION_TYPES.map((t) => ({ value: t, label: QUESTION_TYPE_LABEL[t] }));
const SHOWN_KEYS = [
  'questionType',
  'heritageId',
  'content',
  'explanation',
  'difficultyLevel',
  'levelMin',
  'levelMax',
  'imageUrl',
  'passage',
  'passageSource',
  'distractors',
  'options',
  'pairs',
  'steps',
  'statements',
  'blanks',
];

function isShown(key: string) {
  return SHOWN_KEYS.some((k) => key === k || key.startsWith(`${k}[`) || key.startsWith(`${k}.`));
}

export function QuestionFormDialog({ questionId, initialType, onClose, onChanged, onOpen }: QuestionFormDialogProps) {
  const detail = useQuery({
    queryKey: queryKeys.questionDetail(questionId ?? 0),
    queryFn: () => questionsApi.get(questionId!).then((r) => r.data),
    enabled: questionId !== null,
    gcTime: 0,
  });

  const title = questionId === null ? 'Tạo câu hỏi' : 'Câu hỏi';
  if (questionId !== null && !detail.data) {
    return (
      <Modal open title={title} size="wide" onClose={onClose}>
        {detail.isError ? <ErrorState error={detail.error} onRetry={() => void detail.refetch()} /> : <LoadingState rows={3} />}
      </Modal>
    );
  }
  return <QuestionForm key={detail.data?.id ?? 'moi'} detail={detail.data ?? null} initialType={initialType} onClose={onClose} onChanged={onChanged} onOpen={onOpen} />;
}

function QuestionForm({ detail, initialType, onClose, onChanged, onOpen }: { detail: QuestionDetail | null } & Omit<QuestionFormDialogProps, 'questionId'>) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<QuestionDraft>(() => (detail ? draftFromDetail(detail) : emptyDraft(initialType ?? 'SINGLE_CHOICE')));
  const [dirty, setDirty] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [checked, setChecked] = useState<ValidateQuestionResult | null>(null);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [previewLevel, setPreviewLevel] = useState<number>(draft.levelMin);
  const [busy, setBusy] = useState<'save' | 'approve' | 'reject' | 'delete' | 'duplicate' | null>(null);
  const [deleting, setDeleting] = useState(false);

  const access = detail?.access ?? null;
  const readOnly = detail !== null && (access?.isReadOnly === true || !access?.canEdit);
  const typeLocked = detail !== null && detail.source === 'AI';
  const range = QUESTION_TYPE_LEVELS[draft.questionType];
  const level = Math.min(Math.max(previewLevel, draft.levelMin), draft.levelMax);

  const edit = (next: QuestionDraft) => {
    setDraft(next);
    setPick(null);
    setDirty(true);
    setServerErrors({});
    setFormError(null);
  };

  // Kiểm hợp lệ không lưu, chờ nửa giây sau lần gõ cuối; bỏ kết quả của yêu cầu đã cũ.
  const body = useMemo(() => draftToBody(draft), [draft]);
  const sequence = useRef(0);
  useEffect(() => {
    const id = ++sequence.current;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      questionsApi
        .validate(body, { previewLevel: level, submission: pick === null ? undefined : { selectedIndex: pick } }, controller.signal)
        .then((r) => {
          if (id === sequence.current) setChecked(r.data);
        })
        .catch(() => undefined);
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [body, level, pick]);

  const showErrors = dirty || attempted;
  const errors: Record<string, string> = readOnly ? {} : { ...(showErrors ? (checked?.errors ?? {}) : {}), ...serverErrors };
  const unplaced = Object.entries(errors).filter(([key]) => !isShown(key));

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.questions });

  const fail = (error: unknown) => {
    if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) setServerErrors(error.fieldErrors);
    setFormError(errorMessage(error));
  };

  /** Lưu câu (tạo hoặc sửa); trả về câu đã lưu hoặc null khi lỗi. */
  const save = async (): Promise<QuestionDetail | null> => {
    setAttempted(true);
    if (checked && !checked.isValid && !detail) {
      setFormError('Câu hỏi chưa hợp lệ. Thầy cô xem các ô báo lỗi bên dưới.');
    }
    setBusy('save');
    try {
      const { data, message } = detail ? await questionsApi.update(detail.id, body) : await questionsApi.create(body);
      setDirty(false);
      toast.success(message ?? MESSAGES.success(detail ? 'Lưu câu hỏi' : 'Tạo câu hỏi'));
      await refresh();
      onChanged(message);
      return data;
    } catch (error) {
      fail(error);
      return null;
    } finally {
      setBusy(null);
    }
  };

  const act = async (kind: 'approve' | 'reject' | 'delete' | 'duplicate') => {
    if (!detail) return;
    setBusy(kind);
    try {
      if (kind === 'approve' && dirty) {
        const saved = await save();
        if (!saved) return;
        setBusy(kind);
      }
      const result =
        kind === 'approve'
          ? await questionsApi.approve(detail.id)
          : kind === 'reject'
            ? await questionsApi.reject(detail.id)
            : kind === 'duplicate'
              ? await questionsApi.duplicate(detail.id)
              : await questionsApi.remove(detail.id);
      toast.success(result.message ?? MESSAGES.success(kind === 'approve' ? 'Duyệt câu hỏi' : kind === 'reject' ? 'Loại câu hỏi' : kind === 'duplicate' ? 'Nhân bản câu hỏi' : 'Xóa câu hỏi'));
      await refresh();
      onChanged(result.message);
      if (kind === 'duplicate') onOpen((result.data as QuestionDetail).id);
      else onClose();
    } catch (error) {
      fail(error);
      setDeleting(false);
    } finally {
      setBusy(null);
    }
  };

  const canApprove = detail?.reviewStatus === 'PENDING' && access?.canApprove === true;
  const pageTitle = detail === null ? 'Tạo câu hỏi' : readOnly ? 'Xem câu hỏi' : canApprove ? 'Duyệt câu hỏi' : 'Sửa câu hỏi';
  const levelChoices = Array.from({ length: draft.levelMax - draft.levelMin + 1 }, (_, i) => draft.levelMin + i);
  const levelOptions = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: `Cấp ${from + i}` }));

  return (
    <Modal open title={pageTitle} size="wide" busy={busy !== null} onClose={onClose}>
      <div className="flex flex-col gap-4">
        {detail && (
          <p className="flex flex-wrap items-center gap-2 type-body-s text-on-surface-variant">
            <ReviewStatusBadge status={detail.reviewStatus} hidden={detail.reviewStatus === 'REJECTED' && access?.reason === 'HIDDEN_BY_ADMIN'} />
            <span>{detail.source === 'AI' ? 'Do AI sinh' : 'Tự tạo'}</span>
            {detail.creatorName && <span>· {detail.creatorName}</span>}
            {detail.organizationName && <span>· {detail.organizationName}</span>}
            {detail.quizCount > 0 && <span>· dùng trong {detail.quizCount} bài kiểm tra</span>}
          </p>
        )}
        {readOnly && access?.message && <InlineMessage tone="info">{access.message}</InlineMessage>}
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        {unplaced.length > 0 && (
          <InlineMessage tone="danger">
            <ul>
              {unplaced.map(([key, message]) => (
                <li key={key}>{message}</li>
              ))}
            </ul>
          </InlineMessage>
        )}

        <div className="grid gap-6 dsvmd:grid-cols-[3fr_2fr]">
          <form
            className="flex min-w-0 flex-col gap-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (!readOnly) void save().then((saved) => saved && onClose());
            }}
          >
            <fieldset disabled={readOnly || busy !== null} className="flex flex-col gap-5">
              <div className="grid gap-4 dsvsm:grid-cols-2">
                <SelectField
                  label="Dạng câu"
                  value={draft.questionType}
                  options={TYPE_OPTIONS}
                  disabled={typeLocked || readOnly}
                  hint={typeLocked ? 'Câu do AI sinh không đổi dạng được.' : undefined}
                  error={fieldError(errors, 'questionType')}
                  onChange={(e) => edit(changeDraftType(draft, e.target.value as QuestionType))}
                />
                <SelectField
                  label="Độ khó"
                  value={draft.difficultyLevel}
                  options={DIFFICULTY_OPTIONS}
                  error={fieldError(errors, 'difficultyLevel')}
                  onChange={(e) => edit({ ...draft, difficultyLevel: e.target.value as QuestionDifficulty })}
                />
                <SelectField
                  label="Từ cấp"
                  value={String(draft.levelMin)}
                  options={levelOptions(range.min, range.max)}
                  hint={`Dạng này dùng được ở cấp ${range.min === range.max ? range.min : `${range.min}-${range.max}`}.`}
                  error={fieldError(errors, 'levelMin')}
                  onChange={(e) => edit({ ...draft, ...clampLevels(draft.questionType, Number(e.target.value), Math.max(draft.levelMax, Number(e.target.value))) })}
                />
                <SelectField
                  label="Đến cấp"
                  value={String(draft.levelMax)}
                  options={levelOptions(range.min, range.max)}
                  error={fieldError(errors, 'levelMax')}
                  onChange={(e) => edit({ ...draft, ...clampLevels(draft.questionType, Math.min(draft.levelMin, Number(e.target.value)), Number(e.target.value)) })}
                />
              </div>

              <HeritageSelect
                heritageId={draft.heritageId}
                heritageName={draft.heritageName}
                error={fieldError(errors, 'heritageId')}
                disabled={readOnly}
                onChange={(id, name) => edit({ ...draft, heritageId: id, heritageName: name })}
              />

              <TextAreaField
                label={draft.questionType === 'FILL_BLANK' ? 'Lời câu (đánh dấu chỗ trống bằng ___)' : draft.questionType === 'SOURCE_READING' ? 'Câu hỏi về tư liệu' : draft.questionType === 'MULTI_TRUE_FALSE' ? 'Đoạn dẫn' : 'Lời câu'}
                rows={3}
                value={draft.content}
                maxLength={1000}
                error={fieldError(errors, 'content')}
                onChange={(e) => {
                  const content = e.target.value;
                  edit({ ...draft, content, blanks: draft.questionType === 'FILL_BLANK' ? syncBlanks(draft.blanks, content) : draft.blanks });
                }}
              />

              <AnswerFields draft={draft} errors={errors} disabled={readOnly || busy !== null} onChange={edit} />

              <TextAreaField
                label="Giải thích đáp án"
                rows={3}
                value={draft.explanation}
                maxLength={2000}
                error={fieldError(errors, 'explanation')}
                onChange={(e) => edit({ ...draft, explanation: e.target.value })}
              />
            </fieldset>
            <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
          </form>

          <aside className="flex min-w-0 flex-col gap-3 dsvmd:sticky dsvmd:top-0 dsvmd:self-start" aria-label="Xem trước như học sinh">
            <h3 className="type-h4 text-on-surface">Xem trước như học sinh</h3>
            {levelChoices.length > 1 && (
              <SelectField
                label="Cấp xem trước"
                value={String(level)}
                options={levelChoices.map((l) => ({ value: String(l), label: `Cấp ${l}` }))}
                onChange={(e) => setPreviewLevel(Number(e.target.value))}
              />
            )}
            {checked?.preview ? (
              <QuestionPreviewCard
                preview={checked.preview}
                selectedIndex={pick}
                onSelectOption={checked.preview.options.length > 0 && checked.isValid ? setPick : undefined}
              />
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 type-body-s text-on-surface-variant">
                Điền lời câu và đáp án để xem câu như học sinh thấy.
              </p>
            )}
            {checked?.trial && pick !== null && (
              <output className="block type-body-s" data-testid="cham-thu">
                Chấm thử: {checked.trial.isCorrect ? 'đúng' : 'chưa đúng'} ({checked.trial.partsCorrect}/{checked.trial.partsTotal} phần).
              </output>
            )}
            {checked && (
              <p className="type-body-s text-on-surface-variant" data-testid="trang-thai-hop-le">
                {checked.isValid ? (
                  <span className="inline-flex items-center gap-1 text-success">
                    <Icon name="check" size={16} />
                    Câu hợp lệ, chấm {checked.partsTotal} phần.
                  </span>
                ) : (
                  'Câu chưa hợp lệ, xem các ô báo lỗi.'
                )}
              </p>
            )}
          </aside>
        </div>

        <div className="flex flex-wrap justify-end gap-3">
          {detail && access?.canDelete && !readOnly && (
            <Button variant="danger" className="mr-auto" disabled={busy !== null} onClick={() => setDeleting(true)}>
              Xóa câu hỏi
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={busy !== null}>
            {readOnly ? 'Đóng' : 'Hủy'}
          </Button>
          {readOnly && access?.canDuplicate && (
            <Button loading={busy === 'duplicate'} onClick={() => void act('duplicate')}>
              <Icon name="copy" size={16} />
              Nhân bản để sửa
            </Button>
          )}
          {!readOnly && canApprove && access?.canReject && (
            <Button variant="secondary" loading={busy === 'reject'} onClick={() => void act('reject')}>
              Loại
            </Button>
          )}
          {!readOnly && (
            <Button variant={canApprove ? 'secondary' : 'primary'} loading={busy === 'save'} onClick={() => void save().then((saved) => saved && onClose())}>
              {detail ? 'Lưu' : 'Tạo câu hỏi'}
            </Button>
          )}
          {!readOnly && canApprove && (
            <Button loading={busy === 'approve'} onClick={() => void act('approve')}>
              Duyệt
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog open={deleting} title="Xóa câu hỏi" confirmLabel="Xóa" tone="danger" confirming={busy === 'delete'} onConfirm={() => void act('delete')} onClose={() => setDeleting(false)}>
        {MESSAGES.confirm('xóa câu hỏi', detail?.content ?? '')} Xóa là xóa mềm; câu đã nằm trong bài kiểm tra không xóa được.
      </ConfirmDialog>
    </Modal>
  );
}
