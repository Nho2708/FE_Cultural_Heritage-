import { useState } from 'react';
import { type Account, type ApiResult, errorMessage } from '@dsvhvn/dung-chung/api';
import { MESSAGES } from '@dsvhvn/dung-chung';
import { ConfirmDialog } from '@dsvhvn/dung-chung/ui';

// Khóa, mở khóa, xóa mềm một tài khoản qua hộp xác nhận chung. Dùng ở Giáo viên của trường (quản trị trường với giáo
// viên) và Chi tiết trường (quản trị hệ thống với quản trị trường). Có hiệu lực ngay: tài khoản bị khóa hoặc xóa không
// gọi được API ở yêu cầu kế tiếp; liên kết đặt mật khẩu chưa dùng của tài khoản đó hết dùng được.

export type AccountAction = 'lock' | 'unlock' | 'delete';

const TEXT: Record<AccountAction, { title: string; verb: string; confirm: string; note?: string }> = {
  lock: {
    title: 'Khóa tài khoản',
    verb: 'khóa tài khoản',
    confirm: 'Khóa',
    note: 'Người dùng bị đăng xuất ngay và không đăng nhập được cho tới khi được mở khóa.',
  },
  unlock: { title: 'Mở khóa tài khoản', verb: 'mở khóa tài khoản', confirm: 'Mở khóa' },
  delete: {
    title: 'Xóa tài khoản giáo viên',
    verb: 'xóa tài khoản giáo viên',
    confirm: 'Xóa',
    note: 'Lớp, bài học, câu hỏi, bài kiểm tra và kết quả của giáo viên được giữ nguyên; bài kiểm tra đã phát hành vẫn làm được tới giờ đóng.',
  },
};

interface AccountActionDialogProps {
  action: { kind: AccountAction; account: Account } | null;
  run: (kind: AccountAction, account: Account) => Promise<ApiResult<unknown>>;
  /** Thành công: `message` là câu "… thành công." của máy chủ. */
  onDone: (message: string | null) => void;
  /** Bị quy tắc chặn hoặc lỗi khác: câu hiện ở toast lỗi. */
  onFailed: (message: string) => void;
  onClose: () => void;
}

export function AccountActionDialog({ action, run, onDone, onFailed, onClose }: AccountActionDialogProps) {
  const [busy, setBusy] = useState(false);
  const text = action ? TEXT[action.kind] : null;

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const { message } = await run(action.kind, action.account);
      onDone(message);
    } catch (error) {
      onFailed(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={action !== null}
      title={text?.title ?? ''}
      confirmLabel={text?.confirm ?? ''}
      tone={action?.kind === 'unlock' ? 'primary' : 'danger'}
      confirming={busy}
      onConfirm={() => void confirm()}
      onClose={onClose}
    >
      {action && text && (
        <>
          <p>{MESSAGES.confirm(text.verb, action.account.fullName ?? action.account.username ?? '')}</p>
          {text.note && <p className="mt-2 type-body-s">{text.note}</p>}
        </>
      )}
    </ConfirmDialog>
  );
}
