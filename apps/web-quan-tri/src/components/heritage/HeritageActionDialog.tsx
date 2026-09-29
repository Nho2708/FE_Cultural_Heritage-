import { useState } from 'react';
import { errorMessage, type HeritageDetail } from '@dsvhvn/dung-chung/api';
import { MESSAGES } from '@dsvhvn/dung-chung';
import { ConfirmDialog } from '@dsvhvn/dung-chung/ui';
import { adminHeritagesApi } from '../../lib/api/endpoints';

// Ẩn, hiện lại và xóa di sản qua hộp xác nhận chung. Dùng ở Quản lý di sản và Biên tập di sản.
// Ẩn: di sản không còn hiện ở trang khám phá, bản đồ, dòng thời gian; bài học đã gắn giữ nguyên. Hiện lại kiểm lại điều
// kiện xuất bản. Xóa là xóa mềm, chỉ với di sản nháp hoặc đã ẩn mà chưa gắn với bài học hay câu hỏi nào.

export type HeritageActionKind = 'archive' | 'restore' | 'delete';
export type HeritageAction = { kind: HeritageActionKind; heritage: { id: number; name: string } };

interface HeritageActionDialogProps {
  action: HeritageAction | null;
  /** `detail` có với ẩn và hiện lại (trạng thái mới của di sản); xóa thì null. */
  onDone: (kind: HeritageActionKind, message: string | null, detail: HeritageDetail | null) => void;
  onFailed: (message: string) => void;
  onClose: () => void;
}

const COPY = {
  archive: {
    title: 'Ẩn di sản',
    confirm: 'Ẩn di sản',
    verb: 'ẩn di sản',
    tone: 'danger',
    note: 'Di sản không còn hiện trên trang khám phá, bản đồ và dòng thời gian của web học tập. Bài học đã gắn di sản này vẫn giữ nguyên nội dung.',
  },
  restore: {
    title: 'Hiện lại di sản',
    confirm: 'Hiện di sản',
    verb: 'hiện lại di sản',
    tone: 'primary',
    note: 'Di sản sẽ hiện lại trên trang khám phá, bản đồ và dòng thời gian với nội dung đã xuất bản gần nhất. Hệ thống kiểm lại điều kiện xuất bản trước khi hiện.',
  },
  delete: {
    title: 'Xóa di sản',
    confirm: 'Xóa di sản',
    verb: 'xóa di sản',
    tone: 'danger',
    note: 'Giai đoạn, sự kiện, ảnh và nguồn tham chiếu của di sản không còn xem được. Di sản đã gắn với bài học hoặc câu hỏi thì chỉ ẩn được.',
  },
} as const;

export function HeritageActionDialog({ action, onDone, onFailed, onClose }: HeritageActionDialogProps) {
  const [busy, setBusy] = useState(false);
  const copy = action ? COPY[action.kind] : COPY.archive;

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const { id } = action.heritage;
      if (action.kind === 'delete') {
        const { message } = await adminHeritagesApi.remove(id);
        onDone('delete', message, null);
      } else {
        const call = action.kind === 'archive' ? adminHeritagesApi.archive : adminHeritagesApi.restore;
        const { data, message } = await call(id);
        onDone(action.kind, message, data);
      }
    } catch (error) {
      onFailed(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={action !== null}
      title={copy.title}
      confirmLabel={copy.confirm}
      tone={copy.tone}
      confirming={busy}
      onConfirm={() => void confirm()}
      onClose={onClose}
    >
      {action && (
        <>
          <p>{MESSAGES.confirm(copy.verb, action.heritage.name)}</p>
          <p className="mt-2 type-body-s">{copy.note}</p>
        </>
      )}
    </ConfirmDialog>
  );
}
