import type { Subscription, SubscriptionStatus, TeacherQuota } from '@dsvhvn/dung-chung/api';
import { formatPlanDate, SUBSCRIPTION_STATUS_LABEL } from '@dsvhvn/dung-chung';
import { Badge, Blank, type BadgeTone } from '@dsvhvn/dung-chung/ui';

// Gói hiện tại của trường, chỉ đọc (Trường và gói tới khi có tab Gói và hạn mức; Chi tiết trường). Máy chủ trả gói
// hiệu lực nếu có, không thì đăng ký gần nhất để hiện "Hết hạn", "Đã hủy". Số giáo viên đếm tài khoản giáo viên chưa
// xóa mềm (mọi trạng thái), không đếm quản trị trường.

const TONE: Record<SubscriptionStatus, BadgeTone> = {
  PENDING: 'warning',
  ACTIVE: 'success',
  EXPIRED: 'danger',
  CANCELLED: 'neutral',
};

export function SubscriptionBadge({ status, effective }: { status: SubscriptionStatus | null; effective: boolean }) {
  if (!status) return <Blank />;
  // Đăng ký ACTIVE đã qua end_date mà tác vụ hết hạn hằng ngày chưa chuyển sang EXPIRED: không còn là gói hiệu lực nên
  // hiện "Hết hạn" như máy chủ đang áp dụng (phần kiểm gói so ngày trực tiếp).
  if (status === 'ACTIVE' && !effective) return <Badge tone={TONE.EXPIRED}>{SUBSCRIPTION_STATUS_LABEL.EXPIRED}</Badge>;
  return <Badge tone={TONE[status]}>{SUBSCRIPTION_STATUS_LABEL[status]}</Badge>;
}

export function SubscriptionSummary({ subscription, quota }: { subscription: Subscription | null; quota: TeacherQuota }) {
  return (
    <section aria-labelledby="goi-hien-tai" className="w-full max-w-[400px] rounded-md bg-surface-container-low p-6">
      <h2 id="goi-hien-tai" className="type-h4 text-on-surface">
        Gói hiện tại
      </h2>
      {subscription ? (
        <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 type-body-s">
          <dt className="text-on-surface-variant">Gói</dt>
          <dd className="text-on-surface">{subscription.planName ?? <Blank />}</dd>
          <dt className="text-on-surface-variant">Trạng thái</dt>
          <dd>
            <SubscriptionBadge status={subscription.status} effective={subscription.isEffective} />
          </dd>
          <dt className="text-on-surface-variant">Ngày bắt đầu</dt>
          <dd className="type-mono-label text-on-surface">{formatPlanDate(subscription.startDate) || '—'}</dd>
          <dt className="text-on-surface-variant">Ngày hết hạn</dt>
          <dd className="type-mono-label text-on-surface">{formatPlanDate(subscription.endDate) || '—'}</dd>
          <dt className="text-on-surface-variant">Giáo viên</dt>
          <dd className="type-mono-label text-on-surface">{quota.max === null ? quota.used : `${quota.used} / ${quota.max}`}</dd>
        </dl>
      ) : (
        <p className="mt-4 type-body-s text-on-surface-variant">Trường chưa có gói dịch vụ nào.</p>
      )}
    </section>
  );
}
