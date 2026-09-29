import type { ReactNode } from 'react';
import { Button } from './Button';
import { Modal } from './Modal';

// Hộp xác nhận chung: xóa, ẩn, khóa, ngừng trường, đăng xuất…
// Nội dung là câu xác nhận "Bạn có chắc muốn {thao tác} "{tên đối tượng}"?". Nút hành động chính bên phải, nút hủy bên trái.

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** danger cho thao tác phá hủy (xóa, khóa, ngừng trường); đăng xuất dùng primary. */
  tone?: 'primary' | 'danger';
  confirming?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Hủy',
  tone = 'primary',
  confirming = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      description={children}
      busy={confirming}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={confirming}>
            {cancelLabel}
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={confirming}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
