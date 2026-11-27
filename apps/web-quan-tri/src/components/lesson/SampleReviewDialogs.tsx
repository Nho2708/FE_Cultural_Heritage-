import { LESSON_LIMITS, MESSAGES, splitApiError } from '@dsvhvn/dung-chung';
import type { AdminLessonLibraryRow } from '@dsvhvn/dung-chung/api';
import { Button, ConfirmDialog, InlineMessage, Modal, TextAreaField, useToast } from '@dsvhvn/dung-chung/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { adminLessonLibraryApi } from '../../lib/api/libraryEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Hộp thoại duyệt thư viện bài mẫu của quản trị hệ thống: xác nhận Duyệt, và Từ chối (bài chờ duyệt) hoặc Gỡ khỏi thư viện (bài đang ở thư viện),
// cả hai bắt buộc nhập lý do 1-500 ký tự để giáo viên biết vì sao. Sau khi xong thì làm mới cả nhóm danh sách.

export type SampleReviewAction = 'approve' | 'reject' | 'remove';

interface Props {
  action: SampleReviewAction;
  row: Pick<AdminLessonLibraryRow, 'id' | 'title'>;
  onClose: () => void;
  onDone: () => void;
}

export function SampleReviewDialog({ action, row, onClose, onDone }: Props) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const title = row.title ?? 'Bài học chưa có tiêu đề';

  const finish = (message: string | null, fallback: string) => {
    toast.success(message ?? fallback);
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessonLibrary });
    onDone();
  };

  const approve = async () => {
    setBusy(true);
    setError(null);
    try {
      const { data } = await adminLessonLibraryApi.approve(row.id);
      finish(data.message, MESSAGES.success('Duyệt bài mẫu'));
    } catch (err) {
      const failure = splitApiError<never>(err, []);
      setError(failure.form);
      toast.error(failure.form ?? MESSAGES.systemError);
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminLessonLibrary });
      setBusy(false);
    }
  };

  const reject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = note.trim();
    if (text === '') {
      setNoteError('Vui lòng nhập lý do.');
      return;
    }
    setNoteError(null);
    setError(null);
    setBusy(true);
    try {
      const { data } = await adminLessonLibraryApi.reject(row.id, text);
      finish(data.message, MESSAGES.success(action === 'remove' ? 'Gỡ bài khỏi thư viện' : 'Từ chối bài mẫu'));
    } catch (err) {
      const failure = splitApiError<'note'>(err, ['note']);
      setNoteError(failure.fields.note ?? null);
      setError(failure.form);
      setBusy(false);
    }
  };

  if (action === 'approve') {
    return (
      <ConfirmDialog open title={`Duyệt bài mẫu "${title}"?`} confirmLabel="Duyệt" confirming={busy} onConfirm={() => void approve()} onClose={onClose}>
        {error ? error : 'Bài vào thư viện bài mẫu: giáo viên các trường xem trước và dùng được bài này cho lớp của mình.'}
      </ConfirmDialog>
    );
  }

  const remove = action === 'remove';
  return (
    <Modal
      open
      size="panel"
      busy={busy}
      title={remove ? `Gỡ "${title}" khỏi thư viện?` : `Từ chối bài mẫu "${title}"?`}
      description={
        remove
          ? 'Giáo viên các trường không còn thấy bài này; các bài đã tạo từ bài mẫu vẫn giữ nguyên.'
          : 'Bài không vào thư viện bài mẫu. Giáo viên soạn thấy lý do và đề xuất lại được sau khi sửa.'
      }
      onClose={onClose}
    >
      <form noValidate onSubmit={reject} className="flex flex-col gap-4">
        {error && <InlineMessage tone="danger">{error}</InlineMessage>}
        <TextAreaField
          label="Lý do"
          name="note"
          rows={4}
          required
          maxLength={LESSON_LIMITS.sampleNoteMaxLength}
          value={note}
          error={noteError}
          hint={`Bắt buộc, hiện cho giáo viên soạn. ${note.length}/${LESSON_LIMITS.sampleNoteMaxLength} ký tự.`}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Hủy
          </Button>
          <Button type="submit" variant="danger" loading={busy}>
            {remove ? 'Gỡ khỏi thư viện' : 'Từ chối'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
