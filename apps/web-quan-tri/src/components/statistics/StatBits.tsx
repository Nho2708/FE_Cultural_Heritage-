import {
  MASTERY_LABEL,
  MASTERY_TONE,
  QUIZ_STUDENT_STATUS_LABEL,
  QUIZ_STUDENT_STATUS_TONE,
  cn,
  formatPercent,
  masteryOf,
  type MasteryTone,
} from '@dsvhvn/dung-chung';
import type { MasteryLevel, QuizStudentStatus, StudentBadge } from '@dsvhvn/dung-chung/api';
import { Badge, Icon, InlineMessage } from '@dsvhvn/dung-chung/ui';
import type { ReactNode } from 'react';

// Phần nhỏ dùng chung của khu thống kê: thẻ số liệu, thanh tỉ lệ đúng, nhãn mức thành thạo và trạng thái, sao, huy hiệu.
// Màu chỉ để nhấn: mọi mức đều có chữ đi kèm.

/** Thẻ số liệu: nhãn nhỏ, số lớn, dòng chú thích. */
export function StatCard({ label, value, note, children }: { label: string; value: ReactNode; note?: ReactNode; children?: ReactNode }) {
  return (
    <div className="rounded-md border border-border bg-surface p-5">
      <p className="type-label text-on-surface-variant">{label}</p>
      <p className="mt-2 type-h1 text-on-surface">{value}</p>
      {note && <p className="mt-1 type-body-s text-on-surface-variant">{note}</p>}
      {children}
    </div>
  );
}

const BAR_TONE: Record<MasteryTone, string> = {
  good: 'bg-success',
  fair: 'bg-warning',
  weak: 'bg-danger',
  none: 'bg-border-strong',
};

const TEXT_TONE: Record<MasteryTone, string> = {
  good: 'text-success',
  fair: 'text-warning-text',
  weak: 'text-danger',
  none: 'text-on-surface-variant',
};

/** Thanh tỉ lệ đúng: màu theo mức (xanh từ 80%, vàng từ 50%, đỏ dưới 50%), kèm số phần trăm. */
export function RateBar({
  ratePercent,
  answered,
  className,
  label,
}: {
  ratePercent: number | null;
  answered: number;
  className?: string;
  /** Câu đọc cho trình đọc màn hình. */
  label: string;
}) {
  const tone = MASTERY_TONE[masteryOf(ratePercent, answered)];
  const width = Math.min(100, Math.max(0, ratePercent ?? 0));
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span className={cn('w-12 shrink-0 text-right type-label tabular-nums', TEXT_TONE[tone])}>{ratePercent === null ? '—' : formatPercent(ratePercent)}</span>
      <span className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-surface-container-high">
        <span className="sr-only">{label}</span>
        <span aria-hidden="true" className={cn('block h-full rounded-full', BAR_TONE[tone])} style={{ width: `${width}%` }} />
      </span>
    </span>
  );
}

const MASTERY_BADGE: Record<MasteryTone, 'success' | 'warning' | 'danger' | 'neutral'> = {
  good: 'success',
  fair: 'warning',
  weak: 'danger',
  none: 'neutral',
};

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  return <Badge tone={MASTERY_BADGE[MASTERY_TONE[level]]}>{MASTERY_LABEL[level]}</Badge>;
}

export function StudentStatusBadge({ status, label }: { status: QuizStudentStatus; label?: string }) {
  return <Badge tone={QUIZ_STUDENT_STATUS_TONE[status]}>{label ?? QUIZ_STUDENT_STATUS_LABEL[status]}</Badge>;
}

/** Số sao của lớp cấp 1 ("3 sao"), kèm hình sao. */
export function StarCount({ stars }: { stars: number | null }) {
  if (stars === null) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap type-label">
      <span className="inline-flex" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <Icon key={i} name="star" size={14} className={i < stars ? 'fill-current text-warning' : 'text-border-strong'} />
        ))}
      </span>
      {stars} sao
    </span>
  );
}

/** Danh sách huy hiệu của một lượt, tính khi hiển thị. */
export function BadgeChips({ badges }: { badges: StudentBadge[] }) {
  if (badges.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <li key={badge.code}>
          <Badge tone="warning" className="gap-1">
            <Icon name="star" size={12} />
            {badge.name}
          </Badge>
        </li>
      ))}
    </ul>
  );
}

/** Lời báo khi chưa có lượt nộp nào (máy chủ gửi kèm). */
export function NoResultsNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <InlineMessage tone="info">{message}</InlineMessage>;
}

/** Tiêu đề một khối của trang thống kê. */
export function Block({ title, hint, children, actions }: { title: string; hint?: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-md border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="type-h3 text-on-surface">{title}</h2>
          {hint && <p className="mt-1 type-body-s text-on-surface-variant">{hint}</p>}
        </div>
        {actions}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
