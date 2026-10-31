import { formatDateTime, formatMoney, formatPlanDate, formatPlanRange, MESSAGES } from '@dsvhvn/dung-chung';
import { errorMessage, type BillingOverview, type PendingPurchase } from '@dsvhvn/dung-chung/api';
import { Button, ButtonLink, ConfirmDialog, ErrorState, Icon, InlineMessage, LoadingState, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PATHS, pathOf } from '../../access/screens';
import { orgBillingApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { SubscriptionBadge } from '../account/SubscriptionSummary';
import { Fact, Meter } from './billingUi';
import { usePayInvoice } from './usePayInvoice';

// Tab "Gói và hạn mức" của Trường và gói — quản trị trường: gói đang dùng, hạn mức giáo viên và lượt AI, gói gia hạn chờ
// bắt đầu, yêu cầu mua chưa thanh toán; "Gia hạn", "Nâng cấp", "Hủy gói", "Mua gói", "Kích hoạt gói Miễn phí". Mua, gia hạn,
// nâng cấp chỉ chọn và xác nhận ở màn hình Chọn gói và thanh toán; gói chỉ có hiệu lực khi VNPay báo thanh toán thành công.

type Dialog = 'cancel' | 'free' | null;

function PendingCard({ pending }: { pending: PendingPurchase }) {
  const { pay, payingId } = usePayInvoice();
  const [asking, setAsking] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

  const cancel = async () => {
    setCancelling(true);
    try {
      const { data, message } = await orgBillingApi.cancel(pending.subscriptionId);
      queryClient.setQueryData(queryKeys.billingOverview, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
      void queryClient.invalidateQueries({ queryKey: queryKeys.org });
      toast.success(message ?? MESSAGES.success('Hủy'));
      setAsking(false);
    } catch (error) {
      toast.error(errorMessage(error));
      setAsking(false);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <section aria-labelledby="yeu-cau-mua" className="flex flex-col gap-4 rounded-md border border-warning bg-warning-container p-6">
      <div>
        <h2 id="yeu-cau-mua" className="type-h4 text-on-warning-container">
          Yêu cầu mua gói chưa thanh toán
        </h2>
        <p className="mt-1 type-body-s text-on-warning-container">
          Mỗi trường chỉ có một yêu cầu mua chưa thanh toán. Hãy thanh toán hoặc hủy yêu cầu này trước khi mua gói khác.
        </p>
      </div>
      <dl className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
        <Fact label="Gói">{pending.planName ?? '—'}</Fact>
        <Fact label="Hóa đơn" mono>
          {pending.invoiceNumber ?? '—'}
        </Fact>
        <Fact label="Số tiền">{formatMoney(pending.amount) || '—'}</Fact>
        <Fact label="Hạn thanh toán">{formatDateTime(pending.dueAt) || '—'}</Fact>
      </dl>
      <div className="flex flex-wrap gap-3">
        {pending.invoiceId !== null && (
          <Button
            onClick={() => void pay(pending.invoiceId as number)}
            loading={payingId === pending.invoiceId}
            disabled={payingId !== null}
          >
            Thanh toán
          </Button>
        )}
        <Button variant="danger" onClick={() => setAsking(true)}>
          Hủy yêu cầu
        </Button>
      </div>
      <ConfirmDialog
        open={asking}
        title="Hủy yêu cầu mua gói?"
        confirmLabel="Hủy yêu cầu"
        cancelLabel="Giữ yêu cầu"
        tone="danger"
        confirming={cancelling}
        onConfirm={() => void cancel()}
        onClose={() => setAsking(false)}
      >
        {MESSAGES.confirm('hủy yêu cầu mua', pending.planName ? `gói ${pending.planName}` : 'gói')}
        {pending.invoiceNumber ? ` Hóa đơn ${pending.invoiceNumber} sẽ bị hủy.` : ''}
      </ConfirmDialog>
    </section>
  );
}

function NoPlanCard({ overview, onActivateFree }: { overview: BillingOverview; onActivateFree: () => void }) {
  const { current, canActivateFreePlan, pending, teacherQuota } = overview;
  const planName = current?.planName ? ` ${current.planName}` : '';
  const reason = !current
    ? 'Trường chưa có gói dịch vụ nào.'
    : current.status === 'CANCELLED'
      ? `Gói${planName} của trường đã bị hủy.`
      : `Gói${planName} của trường đã hết hạn ngày ${formatPlanDate(current.endDate)}.`;

  return (
    <>
      <section aria-labelledby="khong-co-goi" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6 dsvlg:flex-row dsvlg:items-center">
        <Icon name="alert-triangle" size={28} className="shrink-0 text-warning-text" />
        <div className="min-w-0 flex-1">
          <h2 id="khong-co-goi" className="type-h4 text-on-surface">
            Trường chưa có gói hiệu lực
          </h2>
          <p className="mt-1 type-body-s text-on-surface-variant">
            {reason} Mua gói trả phí qua VNPay
            {canActivateFreePlan ? ', hoặc kích hoạt gói Miễn phí ngay mà không cần thanh toán.' : '.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {pending ? (
            <Button disabled>Mua gói</Button>
          ) : (
            <ButtonLink to={pathOf('planPurchase')}>Mua gói</ButtonLink>
          )}
          {canActivateFreePlan && (
            <Button variant="secondary" onClick={onActivateFree}>
              Kích hoạt gói Miễn phí
            </Button>
          )}
        </div>
      </section>
      <section aria-label="Quyền lợi khi chưa có gói" className="rounded-md border border-border bg-surface p-6">
        <dl className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
          <Fact label="Giáo viên hiện có">{teacherQuota.used} tài khoản</Fact>
          <Fact label="Lượt AI">Không dùng được</Fact>
          <Fact label="Bài học, bài kiểm tra mới">Tạm khóa</Fact>
          <Fact label="Học sinh">Vẫn học bình thường</Fact>
        </dl>
      </section>
    </>
  );
}

function CurrentCard({
  overview,
  onCancel,
  blocked,
}: {
  overview: BillingOverview;
  onCancel: () => void;
  blocked: boolean;
}) {
  const current = overview.current!;
  const { teacherQuota, aiQuota, upcoming } = overview;
  const details = [
    formatMoney(current.price),
    current.maxTeachers !== null ? `tối đa ${current.maxTeachers} giáo viên` : null,
    current.maxAiRequests !== null ? `${current.maxAiRequests} lượt AI mỗi kỳ` : null,
  ].filter(Boolean);
  const rules = [
    !current.isFree && 'Gia hạn: gói mới bắt đầu ngay sau ngày hết hạn của gói hiện tại, thanh toán qua VNPay.',
    current.isFree
      ? 'Nâng cấp: gói mới có hiệu lực ngay khi thanh toán thành công; gói Miễn phí kết thúc, không cộng dồn lượt AI cũ.'
      : 'Nâng cấp: gói mới có hiệu lực ngay khi thanh toán thành công; không hoàn tiền hoặc khấu trừ thời gian chưa dùng của gói hiện tại.',
    !current.isFree &&
      'Hủy gói: gói kết thúc ngay, không được hoàn tiền. Giáo viên không tạo được bài học, bài kiểm tra mới cho đến khi trường có gói khác.',
  ].filter(Boolean) as string[];

  return (
    <section aria-labelledby="goi-dang-dung" className="flex flex-col gap-6 rounded-md border border-border bg-surface p-6">
      <div className="flex flex-col gap-4 dsvmd:flex-row dsvmd:items-start dsvmd:justify-between">
        <div className="min-w-0">
          <p className="type-label-kicker text-on-surface-muted">GÓI ĐANG DÙNG</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 id="goi-dang-dung" className="type-h2 text-on-surface">
              {current.planName}
            </h2>
            <SubscriptionBadge status={current.status} effective={current.isEffective} />
          </div>
          <p className="mt-2 type-body-s text-on-surface-variant">{details.join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!current.isFree &&
            (blocked || upcoming ? (
              <Button disabled title={upcoming ? 'Trường đã có gói gia hạn chờ bắt đầu.' : undefined}>
                Gia hạn
              </Button>
            ) : (
              <ButtonLink to={PATHS.planPurchaseFor(current.planId)}>Gia hạn</ButtonLink>
            ))}
          {blocked ? (
            <Button variant="secondary" disabled>
              Nâng cấp
            </Button>
          ) : (
            <ButtonLink variant={current.isFree ? 'primary' : 'secondary'} to={pathOf('planPurchase')}>
              Nâng cấp
            </ButtonLink>
          )}
          {overview.canCancelCurrent && (
            <Button variant="danger" onClick={onCancel}>
              Hủy gói
            </Button>
          )}
        </div>
      </div>

      <dl className="grid gap-3 dsvsm:grid-cols-3">
        <Fact label="Ngày bắt đầu" mono>
          {formatPlanDate(current.startDate) || '—'}
        </Fact>
        <Fact label="Ngày hết hạn" mono>
          {formatPlanDate(current.endDate) || '—'}
        </Fact>
        <Fact label="Còn lại" mono>
          {current.daysLeft === null ? '—' : `${current.daysLeft} ngày`}
        </Fact>
      </dl>

      <div className="grid gap-6 dsvmd:grid-cols-2">
        <Meter
          label="Giáo viên"
          used={teacherQuota.used}
          max={teacherQuota.max}
          tone="success"
          note="Đếm mọi tài khoản giáo viên chưa xóa, kể cả tài khoản bị khóa hoặc chưa đặt mật khẩu."
        />
        <Meter
          label="Lượt AI trong kỳ"
          used={aiQuota.used}
          max={aiQuota.max}
          tone="warning"
          note={
            aiQuota.periodStart && aiQuota.periodEnd
              ? `Kỳ hiện tại từ ${formatPlanDate(aiQuota.periodStart)} đến ${formatPlanDate(aiQuota.periodEnd)}; lượt AI được đặt lại vào đầu mỗi kỳ.`
              : undefined
          }
        />
      </div>

      {upcoming && (
        <InlineMessage tone="info">
          {`Gói gia hạn${upcoming.planName ? ` ${upcoming.planName}` : ''} đã thanh toán, có hiệu lực ${formatPlanRange(upcoming.startDate, upcoming.endDate)}.`}
        </InlineMessage>
      )}

      <ul className="flex flex-col gap-2 rounded-sm bg-surface-container-low px-4 py-3 type-body-s text-on-surface-variant">
        {rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
    </section>
  );
}

export function PlanTab() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const overview = useQuery({ queryKey: queryKeys.billingOverview, queryFn: () => orgBillingApi.overview().then((r) => r.data) });
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => ReturnType<typeof orgBillingApi.cancel>) => {
    setBusy(true);
    try {
      const { data, message } = await action();
      queryClient.setQueryData(queryKeys.billingOverview, data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
      void queryClient.invalidateQueries({ queryKey: queryKeys.org });
      toast.success(message ?? MESSAGES.success('Thao tác'));
    } catch (error) {
      toast.error(errorMessage(error));
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
    } finally {
      setBusy(false);
      setDialog(null);
    }
  };

  if (overview.isPending) return <LoadingState rows={4} />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

  const data = overview.data;
  const hasPlan = data.hasEffectivePlan && data.current !== null;

  return (
    <div className="flex flex-col gap-6">
      {data.pending && <PendingCard pending={data.pending} />}
      {hasPlan ? (
        <CurrentCard overview={data} blocked={data.pending !== null} onCancel={() => setDialog('cancel')} />
      ) : (
        <NoPlanCard overview={data} onActivateFree={() => setDialog('free')} />
      )}

      <ConfirmDialog
        open={dialog === 'cancel' && data.current !== null}
        title={data.current?.planName ? `Hủy gói ${data.current.planName}?` : 'Hủy gói?'}
        confirmLabel="Hủy gói"
        cancelLabel="Giữ gói"
        tone="danger"
        confirming={busy}
        onConfirm={() => data.current && void run(() => orgBillingApi.cancel(data.current!.id))}
        onClose={() => setDialog(null)}
      >
        {data.cancelConfirmation}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === 'free'}
        title="Kích hoạt gói Miễn phí?"
        confirmLabel="Kích hoạt"
        confirming={busy}
        onConfirm={() => void run(() => orgBillingApi.activateFreePlan())}
        onClose={() => setDialog(null)}
      >
        {MESSAGES.confirm('kích hoạt gói', 'Miễn phí')} Gói có hiệu lực ngay, không qua VNPay và không tạo hóa đơn.
      </ConfirmDialog>
    </div>
  );
}
