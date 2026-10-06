import { INVOICE_STATUS_LABEL, PAYMENT_STATUS_LABEL } from '@dsvhvn/dung-chung';
import type { InvoiceStatus, PaymentStatus } from '@dsvhvn/dung-chung/api';
import { Badge, Blank, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';

// Phần dùng chung của các màn hình Gói và thanh toán của quản trị trường: nhãn trạng thái, ô số liệu, thanh hạn mức.

const INVOICE_TONE: Record<InvoiceStatus, BadgeTone> = { UNPAID: 'warning', PAID: 'success', CANCELLED: 'neutral' };
const PAYMENT_TONE: Record<PaymentStatus, BadgeTone> = { PENDING: 'neutral', SUCCEEDED: 'success', FAILED: 'danger', REFUNDED: 'neutral' };

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus | null }) {
  return status ? <Badge tone={INVOICE_TONE[status]}>{INVOICE_STATUS_LABEL[status]}</Badge> : <Blank />;
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus | null }) {
  return status ? <Badge tone={PAYMENT_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge> : <Blank />;
}

/** Ô số liệu: nhãn nhỏ trên, giá trị dưới. */
export function Fact({ label, children, mono = false }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-sm bg-surface-container-low px-4 py-3">
      <dt className="type-label text-on-surface-variant">{label}</dt>
      <dd className={mono ? 'type-mono-label break-words text-on-surface' : 'type-h4 break-words text-on-surface'}>{children}</dd>
    </div>
  );
}

/** Thanh hạn mức "đã dùng / tối đa" (giáo viên, lượt AI). `max` null thì chỉ hiện số đã dùng. */
export function Meter({
  label,
  used,
  max,
  tone,
  note,
}: {
  label: string;
  used: number;
  max: number | null;
  tone: 'success' | 'warning';
  note?: string;
}) {
  const percent = max && max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 type-body-s text-on-surface">
        <span>{label}</span>
        <span className="type-mono-label">{max === null ? used : `${used} / ${max}`}</span>
      </div>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-surface-container-high">
        <div className={tone === 'success' ? 'h-full bg-success' : 'h-full bg-warning'} style={{ width: `${percent}%` }} />
      </div>
      {note && <p className="type-label text-on-surface-muted">{note}</p>}
    </div>
  );
}
