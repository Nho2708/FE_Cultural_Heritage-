import { useState } from 'react';
import { errorMessage } from '@dsvhvn/dung-chung/api';
import { adminOrganizationsApi } from '../../lib/api/endpoints';
import { MESSAGES } from '@dsvhvn/dung-chung';
import { ConfirmDialog } from '@dsvhvn/dung-chung/ui';

// Ngừng trường qua hộp xác nhận chung: xóa mềm `organizations`. Mọi tài khoản của trường (kể cả học sinh) không đăng
// nhập được ngay (token cũ bị từ chối ở yêu cầu kế tiếp), mã bài học của trường không nhận truy cập mới, dữ liệu giữ
// nguyên. Dùng ở Quản lý trường và Chi tiết trường.

interface DeactivateOrganizationDialogProps {
  organization: { id: number; name: string } | null;
  onDone: (message: string | null) => void;
  onFailed: (message: string) => void;
  onClose: () => void;
}

export function DeactivateOrganizationDialog({ organization, onDone, onFailed, onClose }: DeactivateOrganizationDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!organization) return;
    setBusy(true);
    try {
      const { message } = await adminOrganizationsApi.deactivate(organization.id);
      onDone(message);
    } catch (error) {
      onFailed(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={organization !== null}
      title="Ngừng trường"
      confirmLabel="Ngừng trường"
      tone="danger"
      confirming={busy}
      onConfirm={() => void confirm()}
      onClose={onClose}
    >
      {organization && (
        <>
          <p>{MESSAGES.confirm('ngừng trường', organization.name)}</p>
          <p className="mt-2 type-body-s">
            Mọi tài khoản của trường, kể cả học sinh, không đăng nhập được nữa; mã bài học của trường không nhận lượt truy cập mới.
            Dữ liệu của trường được giữ nguyên.
          </p>
        </>
      )}
    </ConfirmDialog>
  );
}
