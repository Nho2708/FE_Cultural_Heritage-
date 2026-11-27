import { LESSON_STATUS_LABEL, QUIZ_LIMITS, MESSAGES, cn, createQuizBody, focusFirstInvalid, splitApiError } from '@dsvhvn/dung-chung';
import type { LessonRow, QuizDetail } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, InlineMessage, LoadingState, Modal, TextField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { quizzesApi } from '../../lib/api/quizEndpoints';

// Tạo bài kiểm tra (hộp thoại): chọn một bài học của giáo viên (bài Nháp hoặc Đã xuất bản; bài Lưu trữ không hiện), đặt tên. Lớp làm bài
// là lớp của bài học nên không có ô chọn lớp; mã bài kiểm tra sinh lúc phát hành. Bài học còn Nháp vẫn chọn được: soạn xong chờ xuất bản
// bài học rồi mới phát hành. Tạo xong chuyển sang màn hình Soạn và phát hành bài kiểm tra. Mở từ trang Soạn bài học thì bài học được
// chọn sẵn và khóa.

interface CreateQuizDialogProps {
  /** Bài học chọn sẵn và khóa (mở từ trang Soạn bài học). */
  fixedLessonId?: number;
  onCreated: (quiz: QuizDetail, message: string | null) => void;
  onClose: () => void;
}

function lessonNote(lesson: LessonRow): string {
  const status = lesson.status ? LESSON_STATUS_LABEL[lesson.status] : '';
  if (lesson.status === 'PUBLISHED') return `Lớp ${lesson.className} · ${status}${lesson.accessCode ? ` · mã ${lesson.accessCode}` : ''}`;
  return `Lớp ${lesson.className} · ${status} — phát hành được sau khi xuất bản bài học`;
}

export function CreateQuizDialog({ fixedLessonId, onCreated, onClose }: CreateQuizDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [lessonId, setLessonId] = useState<number | null>(fixedLessonId ?? null);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; lessonId?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lessons = useQuery({
    queryKey: queryKeys.lessonList({ page: 1, pageSize: 100 }),
    queryFn: () => lessonsApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const items = (lessons.data?.items ?? []).filter((l) => l.status !== 'ARCHIVED' && (fixedLessonId === undefined || l.id === fixedLessonId));

  const choose = (lesson: LessonRow) => {
    setLessonId(lesson.id);
    setErrors((current) => ({ ...current, lessonId: undefined }));
  };

  // Tên gợi ý theo bài học đang chọn cho tới khi giáo viên tự gõ.
  const chosenLesson = items.find((l) => l.id === lessonId);
  const suggested = chosenLesson ? `Kiểm tra: ${chosenLesson.title ?? ''}`.trim().slice(0, QUIZ_LIMITS.nameMaxLength) : '';
  const nameValue = nameTouched ? name : suggested;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found: typeof errors = {};
    if (lessonId === null) found.lessonId = 'Vui lòng chọn bài học.';
    if (nameValue.trim() === '') found.name = MESSAGES.required('tên bài kiểm tra');
    else if (nameValue.trim().length > QUIZ_LIMITS.nameMaxLength) found.name = MESSAGES.invalid('Tên bài kiểm tra', `tối đa ${QUIZ_LIMITS.nameMaxLength} ký tự`);
    setErrors(found);
    if (Object.keys(found).length > 0 || lessonId === null) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await quizzesApi.create(createQuizBody(lessonId, nameValue));
      onCreated(data, message);
    } catch (err) {
      const failure = splitApiError<'name' | 'lessonId'>(err, ['name', 'lessonId']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title="Tạo bài kiểm tra"
      description="Lớp làm bài là lớp của bài học. Khi phát hành, bài kiểm tra có mã riêng để học sinh vào thẳng bài."
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}

        {lessons.isPending ? (
          <LoadingState rows={2} />
        ) : lessons.isError ? (
          <ErrorState error={lessons.error} onRetry={() => void lessons.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon="book-open" title="Thầy cô chưa có bài học nào để tạo bài kiểm tra.">
            Hãy tạo bài học ở màn hình Bài học trước. Bài học đã lưu trữ không tạo thêm bài kiểm tra được.
          </EmptyState>
        ) : (
          <fieldset>
            <legend className="type-label text-on-surface">Chọn bài học</legend>
            <ul className="mt-2 flex max-h-72 flex-col gap-2 overflow-y-auto" aria-describedby={errors.lessonId ? 'loi-bai-hoc' : undefined}>
              {items.map((lesson) => (
                <li key={lesson.id}>
                  <label
                    htmlFor={`bai-hoc-${lesson.id}`}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-md border px-4 py-3',
                      lessonId === lesson.id ? 'border-2 border-primary bg-primary-container/40' : 'border-border bg-surface hover:bg-surface-container-low',
                    )}
                  >
                    <input
                      id={`bai-hoc-${lesson.id}`}
                      type="radio"
                      name="bai-hoc"
                      className="mt-1"
                      checked={lessonId === lesson.id}
                      disabled={fixedLessonId !== undefined}
                      onChange={() => choose(lesson)}
                      aria-label={lesson.title ?? 'Bài học chưa có tiêu đề'}
                    />
                    <span className="min-w-0">
                      <span className="block type-label text-on-surface">{lesson.title ?? 'Bài học chưa có tiêu đề'}</span>
                      <span className="block type-body-s text-on-surface-variant">{lessonNote(lesson)}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {errors.lessonId && (
              <p id="loi-bai-hoc" role="alert" className="mt-2 type-body-s text-danger">
                {errors.lessonId}
              </p>
            )}
          </fieldset>
        )}

        <TextField
          label="Tên bài kiểm tra"
          name="name"
          value={nameValue}
          maxLength={QUIZ_LIMITS.nameMaxLength}
          autoComplete="off"
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          error={errors.name}
          hint={`Tối đa ${QUIZ_LIMITS.nameMaxLength} ký tự.`}
        />

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={items.length === 0}>
            Tạo bài kiểm tra
          </Button>
        </div>
      </form>
    </Modal>
  );
}
