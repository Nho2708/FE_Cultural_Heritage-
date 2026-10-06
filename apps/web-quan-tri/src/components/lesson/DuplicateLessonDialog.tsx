import { splitApiError } from '@dsvhvn/dung-chung';
import type { ClassRoom, DuplicateLessonResult } from '@dsvhvn/dung-chung/api';
import { Badge, Button, CheckboxField, ErrorState, Icon, InlineMessage, LoadingState, Modal, SelectField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Nhân bản bài học sang lớp khác: chọn một lớp khác của chính giáo viên (khối lớp hiện kèm để tránh chọn nhầm cấp). Tạo bài Nháp
// mới chưa có mã, chép nội dung, các phần và các di sản đang xuất bản; di sản đã ẩn bị bỏ. Lớp đích khác cấp thì vẫn chép, kèm lời nhắc
// xem lại hoặc nhờ AI soạn lại. Chép kèm các bài kiểm tra của bài (mặc định chọn khi bài có bài kiểm tra): mỗi bài kiểm tra thành bản
// Nháp, bỏ giờ mở và giờ đóng, bỏ câu đã ẩn và câu có dạng không dùng được ở cấp của lớp đích. Cần gói hiệu lực; không tốn lượt AI.

export interface DuplicateSource {
  id: number;
  title: string | null;
  classId: number;
  className: string | null;
  schoolLevel: number;
  heritageCount: number;
  /** Số bài kiểm tra của bài nguồn; có thì hiện ô "Chép kèm các bài kiểm tra của bài". */
  quizCount?: number;
  isPublished: boolean;
}

interface DuplicateLessonDialogProps {
  source: DuplicateSource;
  onDone: (result: DuplicateLessonResult) => void;
  onClose: () => void;
}

export function DuplicateLessonDialog({ source, onDone, onClose }: DuplicateLessonDialogProps) {
  const [target, setTarget] = useState('');
  const [includeQuizzes, setIncludeQuizzes] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const others: ClassRoom[] = (classes.data?.items ?? []).filter((c) => c.id !== source.classId);
  const chosen = others.find((c) => String(c.id) === target);
  const hasQuizzes = (source.quizCount ?? 0) > 0;
  const differentLevel = chosen !== undefined && chosen.schoolLevel !== source.schoolLevel;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!chosen) {
      setFieldError('Vui lòng chọn lớp đích.');
      return;
    }
    setFieldError(null);
    setSaving(true);
    try {
      onDone((await lessonsApi.duplicate(source.id, chosen.id, hasQuizzes && includeQuizzes)).data);
    } catch (err) {
      const failure = splitApiError<'targetClassId'>(err, ['targetClassId']);
      setFieldError(failure.fields.targetClassId ?? null);
      setError(failure.form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open title="Nhân bản bài học sang lớp khác" size="panel" busy={saving} onClose={onClose}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        {error && <InlineMessage tone="danger">{error}</InlineMessage>}
        <div>
          <p className="type-label text-on-surface">Bài nguồn</p>
          <div className="mt-2 flex items-start gap-3 rounded-md bg-surface-container-low px-4 py-3">
            <Icon name="book-open" size={20} className="mt-0.5 shrink-0 text-on-surface-variant" />
            <div className="min-w-0">
              <p className="type-label text-on-surface">
                {source.title} — {source.className}
              </p>
              <p className="type-body-s text-on-surface-variant">
                Cấp {source.schoolLevel} · {source.isPublished ? 'Đã xuất bản' : 'Chưa xuất bản'} · {source.heritageCount} di sản
                {hasQuizzes ? ` · ${source.quizCount} bài kiểm tra` : ''}
              </p>
            </div>
          </div>
        </div>

        {classes.isPending ? (
          <LoadingState rows={1} />
        ) : classes.isError ? (
          <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
        ) : others.length === 0 ? (
          <InlineMessage tone="info">Thầy cô chưa có lớp nào khác để nhân bản bài học. Hãy tạo thêm lớp ở màn hình Lớp học.</InlineMessage>
        ) : (
          <SelectField
            label="Lớp đích"
            name="targetClassId"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            error={fieldError}
            hint="Chỉ hiện các lớp khác của thầy cô; khối lớp hiện kèm để tránh chọn nhầm cấp."
            options={[
              { value: '', label: 'Chọn lớp đích' },
              ...others.map((c) => ({
                value: String(c.id),
                label: `${c.name} · Khối ${c.grade} · Cấp ${c.schoolLevel}${c.schoolLevel !== source.schoolLevel ? ' (khác cấp bài gốc)' : ''}`,
              })),
            ]}
          />
        )}

        {chosen && differentLevel && (
          <InlineMessage tone="warning">
            Lớp {chosen.name} thuộc cấp {chosen.schoolLevel}, khác cấp {source.schoolLevel} của bài gốc. Nội dung đang theo khung của cấp bài gốc;
            bạn nên xem lại hoặc nhờ AI soạn lại cho đúng cấp.
            {hasQuizzes && includeQuizzes && ` Câu hỏi có dạng không dùng được ở cấp ${chosen.schoolLevel} sẽ không được chép.`}
          </InlineMessage>
        )}
        {chosen && !differentLevel && (
          <p className="flex items-center gap-2 type-body-s text-on-surface-variant">
            <Badge tone="neutral">{`Cấp ${chosen.schoolLevel}`}</Badge> Cùng cấp với bài gốc.
          </p>
        )}

        {hasQuizzes && (
          <CheckboxField
            label="Chép kèm các bài kiểm tra của bài"
            checked={includeQuizzes}
            onChange={(e) => setIncludeQuizzes(e.target.checked)}
            hint="Các bài kiểm tra được chép thành bài kiểm tra Nháp; giờ mở và giờ đóng để trống."
          />
        )}

        <p className="type-body-s text-on-surface-variant">
          Bài học mới ở trạng thái Nháp, chưa có mã bài học. Di sản đã ẩn không được chép.{' '}
          {hasQuizzes && includeQuizzes ? 'Câu hỏi đã bị ẩn cũng không được chép. ' : hasQuizzes ? 'Không chép bài kiểm tra. ' : ''}
          Không chép lượt làm bài của học sinh.
        </p>

        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving} disabled={others.length === 0}>
            <Icon name="copy" size={16} />
            Nhân bản
          </Button>
        </div>
      </form>
    </Modal>
  );
}
