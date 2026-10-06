import { QUIZ_STATUS_LABEL, cn, submissionRatio } from '@dsvhvn/dung-chung';
import type { QuizOpenState, QuizStatus } from '@dsvhvn/dung-chung/api';
import { Badge, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import { useId, type ReactNode } from 'react';

// Phần nhỏ dùng chung của khu Bài kiểm tra: nhãn trạng thái, thanh số đã nộp, công tắc bật tắt.

const STATUS_TONE: Record<QuizStatus, BadgeTone> = { DRAFT: 'neutral', PUBLISHED: 'danger', CLOSED: 'success' };

/** Nháp, Đang phát hành, Đã đóng. Bài đang phát hành chưa tới giờ mở hoặc đã quá giờ đóng có thêm dòng nhỏ nói rõ giai đoạn. */
export function QuizStatusBadge({ status, openState, openStateLabel }: { status: QuizStatus | null; openState?: QuizOpenState; openStateLabel?: string }) {
  if (!status) return null;
  const showStage = status === 'PUBLISHED' && (openState === 'NOT_OPEN' || openState === 'ENDED') && openStateLabel;
  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Badge tone={STATUS_TONE[status]}>{QUIZ_STATUS_LABEL[status]}</Badge>
      {showStage && <span className="type-body-s text-on-surface-variant">{openStateLabel}</span>}
    </span>
  );
}

/** "18/32" và thanh tiến độ nhỏ cạnh đó. */
export function SubmissionProgress({ submitted, students }: { submitted: number; students: number }) {
  const ratio = submissionRatio(submitted, students);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="type-mono-label">{`${submitted}/${students}`}</span>
      <span aria-hidden="true" className="h-1.5 w-12 overflow-hidden rounded-full bg-surface-container-high">
        <span className="block h-full rounded-full bg-success" style={{ width: `${Math.round(ratio * 100)}%` }} />
      </span>
    </span>
  );
}

interface SwitchRowProps {
  label: string;
  hint: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}

/** Công tắc bật tắt có nhãn và dòng giải thích (xáo câu, cho xem đáp án sau khi nộp). Bàn phím bấm cách như ô chọn; cả khung là vùng bấm. */
export function SwitchRow({ label, hint, checked, disabled, onChange }: SwitchRowProps) {
  const id = useId();
  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-md border border-border bg-surface px-4 py-3',
        disabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer',
      )}
    >
      <span className="relative z-10 mt-0.5 inline-flex h-6 w-10 shrink-0 items-center">
        <input
          id={id}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="peer absolute inset-0 size-full cursor-[inherit] appearance-none rounded-full bg-border-strong transition-colors checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 size-5 rounded-full bg-surface shadow-2 transition-transform peer-checked:translate-x-4"
        />
      </span>
      <label htmlFor={id} className="min-w-0 cursor-[inherit] after:absolute after:inset-0 after:content-['']">
        <span className="block type-label text-on-surface">{label}</span>
        <span className="block type-body-s text-on-surface-variant">{hint}</span>
      </label>
    </div>
  );
}
