import { splitApiError } from '@dsvhvn/dung-chung';
import type { ClassRoom, DuplicateLessonResult, LessonLibraryItem } from '@dsvhvn/dung-chung/api';
import { Badge, Button, CheckboxField, ErrorState, Icon, InlineMessage, LoadingState, Modal, SelectField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonLibraryApi } from '../../lib/api/libraryEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Dùng một bài mẫu cho lớp của mình: chọn một lớp (khối lớp hiện kèm để tránh chọn nhầm cấp) và, nếu bài mẫu có bài kiểm tra, chọn chép kèm.
// Tạo bài Nháp mới ở lớp đó bằng cách nhân bản bài mẫu (bỏ di sản đã ẩn; lớp khác cấp thì kèm lời nhắc cấp); bài mẫu gốc không đổi.
// Cần gói hiệu lực; không tốn lượt AI.

interface Props {
  item: Pick<LessonLibraryItem, 'id' | 'title' | 'schoolLevel' | 'grade' | 'quizCount'>;
  onDone: (result: DuplicateLessonResult) => void;
  onClose: () => void;
}

export function UseSampleDialog({ item, onDone, onClose }: Props) {
  const [target, setTarget] = useState('');
  const [includeQuizzes, setIncludeQuizzes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const options: ClassRoom[] = classes.data?.items ?? [];
  const chosen = options.find((c) => String(c.id) === target);
  const hasQuizzes = item.quizCount > 0;
  const differentLevel = chosen !== undefined && chosen.schoolLevel !== item.schoolLevel;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!chosen) {
      setFieldError('Vui lòng chọn lớp.');
      return;
    }
    setFieldError(null);
    setSaving(true);
    try {
      const { data } = await lessonLibraryApi.use(item.id, { targetClassId: chosen.id, includeQuizzes: hasQuizzes && includeQuizzes });
      onDone(data);
    } catch (err) {
      const failure = splitApiError<'targetClassId'>(err, ['targetClassId']);
      setFieldError(failure.fields.targetClassId ?? null);
      setError(failure.form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Dùng bài mẫu cho lớp" size="panel" busy={saving} onClose={onClose}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {error && <InlineMessage tone="danger">{error}</InlineMessage>}
        <div>
          <p className="type-label text-on-surface">Bài mẫu</p>
          <div className="mt-2 flex items-start gap-3 rounded-md bg-surface-container-low px-4 py-3">
            <Icon name="book-open" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
            <div className="min-w-0">
              <p className="type-label text-on-surface">{item.title}</p>
              <p className="type-body-s text-on-surface-variant">
                Cấp {item.schoolLevel} · Khối {item.grade}
                {hasQuizzes ? ` · ${item.quizCount} bài kiểm tra` : ''}
              </p>
            </div>
          </div>
        </div>

        {classes.isPending ? (
          <LoadingState rows={1} />
        ) : classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
        ) : options.length === 0 ? (
          <InlineMessage tone="info">Thầy cô chưa có lớp nào. Hãy tạo lớp ở màn hình Lớp học rồi quay lại dùng bài mẫu.</InlineMessage>
        ) : (
          <SelectField
            label="Lớp"
            name="targetClassId"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={fieldError}
            hint="Chỉ hiện các lớp của thầy cô; khối lớp hiện kèm để tránh chọn nhầm cấp."
            options={[
              { value: '', label: 'Chọn lớp' },
              ...options.map((c) => ({
                value: String(c.id),
                label: `${c.name} · Khối ${c.grade} · Cấp ${c.schoolLevel}${c.schoolLevel !== item.schoolLevel ? ' (khác cấp bài mẫu)' : ''}`,
              })),
            ]}
          />
        )}

        {chosen && differentLevel && (
          <InlineMessage tone="warning">
            Lớp {chosen.name} thuộc cấp {chosen.schoolLevel}, khác cấp {item.schoolLevel} của bài mẫu. Nội dung đang theo khung của cấp bài mẫu; thầy cô nên xem lại hoặc
            nhờ AI soạn lại cho đúng cấp.
            {hasQuizzes && includeQuizzes && ` Câu hỏi có dạng không dùng được ở cấp ${chosen.schoolLevel} sẽ không được chép.`}
          </InlineMessage>
        )}
        {chosen && !differentLevel && (
          <p className="flex items-center gap-2 type-body-s text-on-surface-variant">
            <Badge tone="neutral">{`Cấp ${chosen.schoolLevel}`}</Badge> Cùng cấp với bài mẫu.
          </p>
        )}

        {hasQuizzes && (
          <CheckboxField
            label="Chép kèm bài kiểm tra"
            checked={includeQuizzes}
            onChange={(e) => setIncludeQuizzes(e.target.checked)}
            hint="Các bài kiểm tra được chép thành bài kiểm tra Nháp, giờ mở và giờ đóng để trống; câu đã ẩn hoặc thầy cô chưa được dùng sẽ không được chép."
          />
        )}

        <p className="type-body-s text-on-surface-variant">
          Bài học mới ở trạng thái Nháp, chưa có mã bài học. Di sản đã ẩn không được chép. Dùng bài mẫu không tốn lượt AI và không thay đổi bài mẫu gốc.
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={options.length === 0}>
            <Icon name="copy" size={16} />
            Dùng bài mẫu
          </Button>
        </div>
      </form>
    </Modal>
  );
}
