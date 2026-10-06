import type { TranslationCell, TranslationStatus } from '@dsvhvn/dung-chung/api';
import { Badge, type BadgeTone } from '@dsvhvn/dung-chung/ui';

// Nhãn trạng thái dùng chung của tab Bản dịch và tóm tắt (Biên tập di sản) và màn hình Duyệt bản dịch và tóm tắt.

const STATUS_TONE: Record<TranslationStatus, BadgeTone> = {
  MACHINE: 'neutral',
  PENDING: 'danger',
  APPROVED: 'success',
  REJECTED: 'danger',
};

/** Nhãn của một ô: "Cần dịch lại" đè lên trạng thái khi nội dung tiếng Việt đã sửa sau lần dịch (bản cũ vẫn hiện cho khách). */
export function CellBadge({ cell }: { cell: Pick<TranslationCell, 'status' | 'isOutdated' | 'label'> }) {
  if (cell.status === null) return <Badge>{cell.label || 'Chưa có'}</Badge>;
  if (cell.isOutdated) return <Badge tone="warning">Cần dịch lại</Badge>;
  return <Badge tone={STATUS_TONE[cell.status]}>{cell.label}</Badge>;
}

export function StatusBadge({ status, outdated = false }: { status: TranslationStatus; outdated?: boolean }) {
  const label = { MACHINE: 'Bản dịch máy', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối' }[status];
  return outdated ? <Badge tone="warning">Cần dịch lại</Badge> : <Badge tone={STATUS_TONE[status]}>{label}</Badge>;
}
