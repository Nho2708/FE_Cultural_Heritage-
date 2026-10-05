import { LESSON_STATUS_LABEL, cn, formatPlanDate } from '@dsvhvn/dung-chung';
import type { AiQuota, ContentStatus } from '@dsvhvn/dung-chung/api';
import { Badge, InlineMessage, type BadgeTone } from '@dsvhvn/dung-chung/ui';

// Phần nhỏ dùng chung của khu Bài học: nhãn trạng thái, mã bài học, thanh báo gói hết hiệu lực, đồng hồ lượt AI.

const STATUS_TONE: Record<ContentStatus, BadgeTone> = { DRAFT: 'neutral', PUBLISHED: 'success', ARCHIVED: 'neutral' };

export function LessonStatusBadge({ status }: { status: ContentStatus | null }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status]}>{LESSON_STATUS_LABEL[status]}</Badge>;
}

/** Thanh báo khi trường không có gói hiệu lực: các thao tác tạo, nhân bản, gọi AI bị khóa; học sinh vẫn học bình thường. */
export function PlanNotice({ quota }: { quota: AiQuota | undefined }) {
  if (!quota || quota.hasEffectivePlan) return null;
  return (
    <InlineMessage tone="warning">
      Trường chưa có gói dịch vụ còn hiệu lực. Thầy cô chưa thể tạo bài học, nhân bản bài học hoặc dùng AI; vẫn xem, sửa, xuất bản và lưu
      trữ bài học được, học sinh vẫn học bình thường. Vui lòng liên hệ quản trị trường để gia hạn.
    </InlineMessage>
  );
}

/** Lượt AI đã dùng trong kỳ của gói: "268 / 300", thanh tiến độ và ngày hết kỳ. */
export function AiQuotaMeter({ quota }: { quota: AiQuota }) {
  const max = quota.max ?? 0;
  return (
    <div className="rounded-md border border-border bg-surface p-4" data-testid="ai-quota">
      <p className="type-label text-on-surface-variant">Lượt AI trong kỳ của trường</p>
      {quota.hasEffectivePlan ? (
        <>
          <p className="mt-1 type-h2 text-on-surface">
            <span aria-label={`Đã dùng ${quota.used} trên ${max} lượt`}>{`${quota.used} / ${max}`}</span>
          </p>
          <progress
            aria-label="Lượt AI đã dùng"
            max={max}
            value={quota.used}
            className="mt-2 block h-2 w-full appearance-none overflow-hidden rounded-full bg-surface-container-high [&::-moz-progress-bar]:bg-(--dsv-ai-panel-border) [&::-webkit-progress-bar]:bg-surface-container-high [&::-webkit-progress-value]:bg-(--dsv-ai-panel-border)"
          />
          <p className="mt-2 type-body-s text-on-surface-variant">
            Còn {quota.remaining ?? 0} lượt{quota.periodEnd ? ` đến hết ngày ${formatPlanDate(quota.periodEnd)}` : ''}.
          </p>
        </>
      ) : (
        <p className="mt-1 type-body-s text-on-surface-variant">Trường chưa có gói còn hiệu lực nên chưa dùng được AI.</p>
      )}
    </div>
  );
}

/** Mã bài học bằng chữ mono lớn, dễ đọc cho cả lớp. */
export function CodeDisplay({ code, className }: { code: string; className?: string }) {
  return (
    <span className={cn('font-mono tracking-[0.12em]', className)} translate="no">
      {code}
    </span>
  );
}
