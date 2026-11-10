import { LESSON_SAMPLE_STATUS_LABEL, MESSAGES, formatDateTime } from '@dsvhvn/dung-chung';
import { errorMessage, type LessonDetail, type LessonSampleStatus } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ConfirmDialog, Icon, InlineMessage, useToast, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import { useState } from 'react';
import { lessonsApi } from '../../lib/api/lessonEndpoints';

// Khối "Thư viện bài mẫu" của màn hình Soạn bài học: trạng thái của bài trong thư viện dùng chung của mọi trường (Chưa đề xuất, Chờ duyệt,
// Trong thư viện kèm số lượt dùng, Bị từ chối kèm lý do), nút đề xuất (chỉ bật khi bài Đã xuất bản và đủ điều kiện xuất bản, đã lưu hết
// thay đổi) và nút rút khỏi thư viện. Quản trị hệ thống duyệt trước khi bài vào thư viện; bài sửa nội dung khi đang ở thư viện sẽ chờ duyệt lại.

interface Props {
  lesson: LessonDetail;
  /** Còn thay đổi chưa lưu: đề xuất phải dựa trên bản đã lưu nên chưa cho đề xuất. */
  dirty: boolean;
  busy: boolean;
  onChanged: (lesson: LessonDetail, message: string) => void;
}

const TONE: Record<LessonSampleStatus, BadgeTone> = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' };

/** Dòng trạng thái ngắn: Chưa đề xuất · Chờ duyệt · Trong thư viện · N lượt dùng · Bị từ chối: lý do. */
function headline(lesson: LessonDetail): string {
  const sample = lesson.sample;
  if (!sample) return 'Chưa đề xuất';
  if (sample.status === 'APPROVED') return `${LESSON_SAMPLE_STATUS_LABEL.APPROVED} · ${sample.useCount} lượt dùng`;
  if (sample.status === 'REJECTED') return `${LESSON_SAMPLE_STATUS_LABEL.REJECTED}${sample.note ? `: ${sample.note}` : ''}`;
  return LESSON_SAMPLE_STATUS_LABEL.PENDING;
}

function statusLine(lesson: LessonDetail): string {
  const sample = lesson.sample;
  if (!sample) return 'Chưa đề xuất. Bài chưa nằm trong thư viện bài mẫu.';
  if (sample.status === 'PENDING') return `Đang chờ quản trị hệ thống duyệt${sample.requestedAt ? ` (đề xuất lúc ${formatDateTime(sample.requestedAt)})` : ''}.`;
  if (sample.status === 'APPROVED') return 'Giáo viên các trường xem và dùng được bài này cho lớp của mình.';
  return 'Bài không nằm trong thư viện. Thầy cô sửa bài rồi đề xuất lại được.';
}

export function SampleLibraryBlock({ lesson, dirty, busy, onChanged }: Props) {
  const toast = useToast();
  const [working, setWorking] = useState<'request' | 'withdraw' | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const sample = lesson.sample ?? null;
  const inLibrary = sample !== null;
  const canPropose = (sample === null || sample.status === 'REJECTED') && lesson.status === 'PUBLISHED' && lesson.readiness.isReady;
  const proposeHint =
    lesson.status !== 'PUBLISHED'
      ? 'Chỉ bài Đã xuất bản mới đề xuất được.'
      : !lesson.readiness.isReady
        ? 'Bài chưa đủ điều kiện xuất bản nên chưa đề xuất được.'
        : dirty
          ? 'Hãy lưu thay đổi trước khi đề xuất.'
          : null;

  const run = async (kind: 'request' | 'withdraw') => {
    setWorking(kind);
    setProblem(null);
    try {
      const { data, message } = await (kind === 'request' ? lessonsApi.requestSample(lesson.id) : lessonsApi.withdrawSample(lesson.id));
      onChanged(data.lesson, data.message ?? message ?? MESSAGES.success(kind === 'request' ? 'Đề xuất bài mẫu' : 'Rút bài khỏi thư viện'));
    } catch (err) {
      const text = errorMessage(err);
      setProblem(text);
      toast.error(text);
    } finally {
      setWorking(null);
      setConfirmWithdraw(false);
    }
  };

  return (
    <section aria-labelledby="thu-vien-bai-mau" className="rounded-md border border-border bg-surface p-5">
      <h2 id="thu-vien-bai-mau" className="type-h3 text-on-surface">
        Thư viện bài mẫu
      </h2>
      <p className="mt-3">
        <Badge tone={sample ? TONE[sample.status] : 'neutral'}>{headline(lesson)}</Badge>
      </p>
      <p className="mt-2 type-body-s text-on-surface-variant">{statusLine(lesson)}</p>
      {problem && (
        <InlineMessage tone="danger" className="mt-3">
          {problem}
        </InlineMessage>
      )}
      <div className="mt-3 flex flex-col gap-2">
        {(!inLibrary || sample?.status === 'REJECTED') && (
          <Button
            variant="secondary"
            fullWidth
            loading={working === 'request'}
            disabled={busy || working !== null || !canPropose || dirty}
            onClick={() => void run('request')}
          >
            <Icon name="cards" size={16} />
            Đề xuất vào thư viện bài mẫu
          </Button>
        )}
        {inLibrary && (
          <Button variant="secondary" fullWidth loading={working === 'withdraw'} disabled={busy || working !== null} onClick={() => setConfirmWithdraw(true)}>
            Rút khỏi thư viện
          </Button>
        )}
      </div>
      {proposeHint && (!inLibrary || sample?.status === 'REJECTED') && <p className="mt-2 type-body-s text-on-surface-variant">{proposeHint}</p>}
      <p className="mt-2 type-body-s text-on-surface-variant">
        Quản trị hệ thống xem và duyệt trước khi bài vào thư viện. Bài đang ở thư viện mà sửa nội dung thì sẽ chờ duyệt lại.
      </p>

      <ConfirmDialog
        open={confirmWithdraw}
        title="Rút bài khỏi thư viện bài mẫu?"
        confirmLabel="Rút khỏi thư viện"
        confirming={working === 'withdraw'}
        onConfirm={() => void run('withdraw')}
        onClose={() => setConfirmWithdraw(false)}
      >
        {sample?.status === 'APPROVED'
          ? 'Giáo viên các trường không còn thấy bài này trong thư viện. Các bài đã được tạo từ bài mẫu vẫn giữ nguyên.'
          : 'Bài sẽ không còn được đề xuất vào thư viện bài mẫu. Thầy cô đề xuất lại sau được.'}
      </ConfirmDialog>
    </section>
  );
}
