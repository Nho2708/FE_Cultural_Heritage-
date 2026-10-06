import { formatDateTime, formatMoney, MESSAGES } from '@dsvhvn/dung-chung';
import type { PaymentOutcome, PaymentResult } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ButtonLink, ErrorState, Icon, InlineMessage, LoadingState, type BadgeTone } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { PATHS, pathOf } from '../../access/screens';
import { Fact } from '../../components/billing/billingUi';
import { usePayInvoice } from '../../components/billing/usePayInvoice';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { orgBillingApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Kết quả thanh toán — quản trị trường. Trang VNPay đưa trình duyệt về (`?payment=` là mã giao dịch; `?error=invalid` khi chữ ký
// của lời trả về sai). Trang chỉ đọc trạng thái do IPN ghi nhận, không đổi gì: Đã thanh toán (gói và ngày hiệu lực) / Chưa
// thanh toán (thất bại hoặc hủy, "Thanh toán lại" nếu hóa đơn còn hạn) / Đang xử lý (chưa nhận IPN, tự kiểm tra lại mỗi 5 giây).

/** Khoảng cách giữa hai lần kiểm tra khi chưa nhận IPN, và số lần kiểm tra tự động trước khi dừng chờ người dùng bấm. */
export const POLL_INTERVAL_MS = 5000;
export const MAX_AUTO_CHECKS = 24;

const OUTCOME: Record<PaymentOutcome, { badge: string; tone: BadgeTone; title: string }> = {
  PAID: { badge: 'Đã thanh toán', tone: 'success', title: 'Thanh toán thành công' },
  UNPAID: { badge: 'Chưa thanh toán', tone: 'warning', title: 'Thanh toán chưa thành công' },
  PROCESSING: { badge: 'Đang xử lý', tone: 'neutral', title: 'Đang chờ xác nhận' },
};

function OutcomeIcon({ outcome }: { outcome: PaymentOutcome }) {
  if (outcome === 'PROCESSING')
    return (
      <span
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-4 border-primary border-r-transparent"
      />
    );
  return (
    <span
      aria-hidden="true"
      className={[
        'flex size-14 shrink-0 items-center justify-center rounded-full',
        outcome === 'PAID' ? 'bg-success-container text-success' : 'bg-danger-container text-danger',
      ].join(' ')}
    >
      <Icon name={outcome === 'PAID' ? 'check' : 'x'} size={28} />
    </span>
  );
}

function ResultCard({
  result,
  checks,
  onCheckAgain,
  checking,
}: {
  result: PaymentResult;
  checks: number;
  onCheckAgain: () => void;
  checking: boolean;
}) {
  const { pay, payingId } = usePayInvoice();
  const { outcome, invoice, payment } = result;
  const view = OUTCOME[outcome];
  const stalled = outcome === 'PROCESSING' && checks >= MAX_AUTO_CHECKS;

  const actions: ReactNode = (
    <div className="flex flex-wrap gap-3">
      {outcome === 'UNPAID' && result.canPayAgain && (
        <Button onClick={() => void pay(invoice.id)} loading={payingId === invoice.id} disabled={payingId !== null}>
          Thanh toán lại
        </Button>
      )}
      {outcome === 'UNPAID' && !result.canPayAgain && <ButtonLink to={pathOf('planPurchase')}>Chọn gói</ButtonLink>}
      {stalled && (
        <Button variant="secondary" onClick={onCheckAgain} loading={checking}>
          Kiểm tra lại
        </Button>
      )}
      <ButtonLink variant={outcome === 'PAID' ? 'primary' : 'secondary'} to={outcome === 'PAID' ? PATHS.schoolPlan : PATHS.schoolInvoices}>
        Xem gói và hóa đơn
      </ButtonLink>
    </div>
  );

  return (
    <section
      aria-labelledby="ket-qua"
      aria-live="polite"
      className="flex max-w-[960px] flex-col gap-6 rounded-md border border-border bg-surface p-6 dsvmd:p-8"
    >
      <div className="flex items-start gap-5">
        <OutcomeIcon outcome={outcome} />
        <div className="min-w-0">
          <Badge tone={view.tone}>{view.badge}</Badge>
          <h2 id="ket-qua" className="mt-2 type-h2 text-on-surface">
            {view.title}
          </h2>
          <p className="mt-2 type-body-m text-on-surface-variant">{result.message}</p>
          {outcome === 'PROCESSING' && (
            <p className="mt-3 flex items-center gap-2 type-body-s text-on-surface-variant">
              <Icon name="clock" size={16} />
              {stalled
                ? `Đã kiểm tra ${checks} lần, chưa có xác nhận. Bạn bấm "Kiểm tra lại" để chờ tiếp.`
                : `Đã kiểm tra ${checks} lần, lần tiếp theo sau ${POLL_INTERVAL_MS / 1000} giây.`}
            </p>
          )}
        </div>
      </div>

      {outcome === 'PAID' && (
        <dl className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
          <Fact label="Số hóa đơn" mono>
            {invoice.invoiceNumber ?? '—'}
          </Fact>
          <Fact label="Nội dung">{invoice.description ?? '—'}</Fact>
          <Fact label="Số tiền">{formatMoney(payment.amount ?? invoice.amount) || '—'}</Fact>
          <Fact label="Mã giao dịch VNPay" mono>
            {payment.providerTransactionId ?? '—'}
          </Fact>
          <Fact label="Thời gian thanh toán" mono>
            {formatDateTime(payment.paidAt) || '—'}
          </Fact>
        </dl>
      )}
      {outcome !== 'PAID' && invoice.invoiceNumber && (
        <dl className="grid gap-3 dsvsm:grid-cols-2">
          <Fact label="Số hóa đơn" mono>
            {invoice.invoiceNumber}
          </Fact>
          <Fact label="Số tiền">{formatMoney(invoice.amount) || '—'}</Fact>
        </dl>
      )}
      {actions}
    </section>
  );
}

function PaymentStatus({ paymentId }: { paymentId: number }) {
  const queryClient = useQueryClient();
  const [round, setRound] = useState(0);
  const key = [...queryKeys.paymentResult(paymentId), round];
  const result = useQuery({
    queryKey: key,
    queryFn: () => orgBillingApi.payment(paymentId).then((r) => r.data),
    refetchInterval: (query) =>
      query.state.data?.outcome === 'PROCESSING' && query.state.dataUpdateCount < MAX_AUTO_CHECKS ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: true,
    staleTime: 0,
    gcTime: 0,
  });

  const outcome = result.data?.outcome;
  useEffect(() => {
    // Gói, hóa đơn và số giáo viên đổi theo kết quả: làm mới để thanh báo gói và hai tab của Trường và gói đúng ngay.
    if (outcome === 'PAID' || outcome === 'UNPAID') void queryClient.invalidateQueries({ queryKey: queryKeys.org });
  }, [outcome, queryClient]);

  if (result.isPending) return <LoadingState rows={3} label="Đang lấy kết quả thanh toán…" />;
  if (result.isError) return <ErrorState error={result.error} onRetry={() => void result.refetch()} />;
  return (
    <ResultCard
      result={result.data}
      checks={queryClient.getQueryState(key)?.dataUpdateCount ?? 0}
      checking={result.isFetching}
      onCheckAgain={() => setRound((r) => r + 1)}
    />
  );
}

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const raw = searchParams.get('payment');
  const paymentId = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
  const invalid = searchParams.get('error') === 'invalid' || paymentId === null;

  return (
    <AreaPage>
      <PageHeader
        title="Kết quả thanh toán"
        description="Trang VNPay chuyển về sau khi thanh toán. Trạng thái hóa đơn do hệ thống cập nhật theo xác nhận của VNPay; trang này chỉ hiển thị."
      />
      {invalid ? (
        <>
          <InlineMessage tone="danger">
            {MESSAGES.blocked(
              'xem kết quả thanh toán',
              'Liên kết trả về từ VNPay không hợp lệ. Bạn xem trạng thái hóa đơn ở Trường và gói.',
            )}
          </InlineMessage>
          <div>
            <ButtonLink variant="secondary" to={PATHS.schoolInvoices}>
              Xem gói và hóa đơn
            </ButtonLink>
          </div>
        </>
      ) : (
        <PaymentStatus paymentId={paymentId} />
      )}
    </AreaPage>
  );
}
