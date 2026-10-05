import { splitApiError } from '@dsvhvn/dung-chung';
import type { ClassRoom, DuplicateLessonResult } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ErrorState, Icon, InlineMessage, LoadingState, Modal, SelectField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Nhân bản bài học sang lớp khác: chọn một lớp khác của chính giáo viên (khối lớp hiện kèm để tránh chọn nhầm cấp). Tạo bài Nháp
// mới chưa có mã, chép nội dung, các phần và các di sản đang xuất bản; di sản đã ẩn bị bỏ. Lớp đích khác cấp thì vẫn chép, kèm lời nhắc
// xem lại hoặc nhờ AI soạn lại. Cần gói hiệu lực; không tốn lượt AI.

export interface DuplicateSource {
  id: number;
  title: string | null;
  classId: number;
  className: string | null;
  schoolLevel: number;
  heritageCount: number;
  isPublished: boolean;
}

interface DuplicateLessonDialogProps {
  source: DuplicateSource;
  onDone: (result: DuplicateLessonResult) => void;
  onClose: () => void;
}

export function DuplicateLessonDialog({ source, onDone, onClose }: DuplicateLessonDialogProps) {
  const [target, setTarget] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
  });
  const others: ClassRoom[] = (classes.data?.items ?? []).filter((c) => c.id !== source.classId);
  const chosen = others.find((c) => String(c.id) === target);
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
      onDone((await lessonsApi.duplicate(source.id, chosen.id)).data);
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
          </InlineMessage>
        )}
        {chosen && !differentLevel && (
          <p className="flex items-center gap-2 type-body-s text-on-surface-variant">
            <Badge tone="neutral">{`Cấp ${chosen.schoolLevel}`}</Badge> Cùng cấp với bài gốc.
          </p>
        )}

        <p className="type-body-s text-on-surface-variant">
          Bài học mới ở trạng thái Nháp, chưa có mã bài học. Di sản đã ẩn không được chép. Không chép bài kiểm tra và lượt làm bài của học sinh.
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
