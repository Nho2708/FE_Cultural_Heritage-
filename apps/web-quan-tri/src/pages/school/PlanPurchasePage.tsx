import { formatMoney, formatMoneyPlain, formatPlanDate, formatPlanRange, PURCHASE_KIND_LABEL } from '@dsvhvn/dung-chung';
import { errorMessage, type BillingOverview, type PlanOffer, type PurchaseQuote } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  TextLink,
} from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PATHS } from '../../access/screens';
import { Fact } from '../../components/billing/billingUi';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { SHOW_VNPAY_SANDBOX_NOTE } from '../../config/env';
import { orgBillingApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { useAuth } from '../../lib/auth/context';
import { goToGateway } from '../../lib/gateway';

// Chọn gói và thanh toán — quản trị trường. Thẻ các gói đang bán (gói Miễn phí không bán qua VNPay); chọn một gói thì hiện khối
// xác nhận: loại thao tác (hệ thống tự phân loại mua, gia hạn, nâng cấp), số tiền, ngày hiệu lực dự kiến, lưu ý và cảnh báo vượt
// hạn mức giáo viên. "Thanh toán qua VNPay" tạo yêu cầu mua, hóa đơn và giao dịch rồi chuyển trình duyệt sang VNPay; gói chỉ có
// hiệu lực khi VNPay báo thanh toán thành công (trang Kết quả thanh toán). `?goi=` chọn sẵn một gói (gia hạn gói hiện tại).

function PlanCard({ offer, selected, onSelect }: { offer: PlanOffer; selected: boolean; onSelect: () => void }) {
  const hint = !offer.available
    ? offer.unavailableReason
    : selected
      ? 'Đang chọn'
      : offer.isCurrent
        ? 'Chọn để gia hạn gói hiện tại'
        : offer.kind === 'UPGRADE'
          ? 'Chọn để nâng cấp'
          : 'Chọn để mua gói';
  return (
    <label
      className={[
        'relative flex flex-col gap-4 rounded-md border bg-surface p-6 text-left transition-colors duration-(--dsv-duration-fast)',
        'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
        selected ? 'border-2 border-primary' : 'border-border hover:border-border-strong',
        offer.available ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
      ].join(' ')}
    >
      <input
        type="radio"
        name="goi"
        className="sr-only"
        checked={selected}
        disabled={!offer.available}
        onChange={onSelect}
        aria-label={offer.name ?? 'Gói'}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="type-h3 text-on-surface">{offer.name}</span>
          {offer.isCurrent && <Badge>Gói hiện tại</Badge>}
        </div>
        <span
          aria-hidden="true"
          className={[
            'flex size-6 shrink-0 items-center justify-center rounded-full border-2',
            selected ? 'border-primary bg-primary text-on-primary' : 'border-border-strong',
          ].join(' ')}
        >
          {selected && <Icon name="check" size={14} />}
        </span>
      </div>
      <p>
        <span className="type-h1 text-on-surface">{formatMoney(offer.price)}</span>{' '}
        <span className="type-body-m text-on-surface-variant">/ {offer.durationDays} ngày</span>
      </p>
      <ul className="flex flex-col gap-2 type-body-s text-on-surface">
        {[
          `Tối đa ${offer.maxTeachers ?? 0} tài khoản giáo viên`,
          `${formatMoneyPlain(offer.maxAiRequests ?? 0)} lượt AI mỗi kỳ`,
          'Không giới hạn số học sinh',
          `Hiệu lực ${offer.durationDays} ngày kể từ ngày bắt đầu`,
        ].map((line) => (
          <li key={line} className="flex items-start gap-2">
            <Icon name="check" size={16} className="mt-1 shrink-0 text-success" />
            {line}
          </li>
        ))}
      </ul>
      {hint && <p className={offer.available ? 'type-label text-primary' : 'type-body-s text-on-surface-variant'}>{hint}</p>}
    </label>
  );
}

function quoteNote(quote: PurchaseQuote, overview: BillingOverview | undefined): string {
  const current = overview?.current && overview.hasEffectivePlan ? overview.current : null;
  switch (quote.kind) {
    case 'UPGRADE':
      return current
        ? `Nâng cấp không hoàn phần chưa dùng của gói hiện tại. Gói ${current.planName ?? ''}${current.daysLeft !== null ? ` (còn ${current.daysLeft} ngày)` : ''} kết thúc khi gói ${quote.planName ?? ''} có hiệu lực.`
        : 'Nâng cấp không hoàn phần chưa dùng của gói hiện tại.';
    case 'RENEW':
      return `Gia hạn: gói mới bắt đầu từ ngày ${formatPlanDate(quote.expectedStartDate)}, ngay sau ngày hết hạn của gói hiện tại.`;
    default:
      return 'Gói có hiệu lực từ ngày thanh toán thành công.';
  }
}

function QuoteBlock({
  quote,
  overview,
  paying,
  onPay,
  onCancel,
}: {
  quote: PurchaseQuote;
  overview: BillingOverview | undefined;
  paying: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  return (
    <section aria-labelledby="xac-nhan" className="flex flex-col gap-4 rounded-md border border-border bg-surface p-6">
      <h2 id="xac-nhan" className="type-h3 text-on-surface">
        Xác nhận thanh toán
      </h2>
      <dl className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
        <Fact label="Loại thao tác">{PURCHASE_KIND_LABEL[quote.kind]}</Fact>
        <Fact label="Gói">{quote.planName}</Fact>
        <Fact label="Số tiền">{formatMoney(quote.amount)}</Fact>
        <Fact label="Ngày hiệu lực dự kiến">
          {quote.kind === 'RENEW'
            ? formatPlanRange(quote.expectedStartDate, quote.expectedEndDate)
            : 'Ngay khi thanh toán thành công'}
        </Fact>
      </dl>
      <InlineMessage tone="info">{quoteNote(quote, overview)}</InlineMessage>
      {quote.teacherWarning && <InlineMessage tone="warning">{quote.teacherWarning}</InlineMessage>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onPay} loading={paying}>
          Thanh toán qua VNPay
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={paying}>
          Hủy
        </Button>
      </div>
    </section>
  );
}

export default function PlanPurchasePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const wanted = Number(searchParams.get('goi'));
  const offers = useQuery({ queryKey: queryKeys.planOffers, queryFn: () => orgBillingApi.offers().then((r) => r.data) });
  const overview = useQuery({ queryKey: queryKeys.billingOverview, queryFn: () => orgBillingApi.overview().then((r) => r.data) });

  const [picked, setPicked] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const preselected = offers.data?.find((o) => o.id === wanted && o.available)?.id ?? null;
  const selectedId = picked ?? preselected;
  const quote = useQuery({
    queryKey: queryKeys.planQuote(selectedId ?? 0),
    queryFn: () => orgBillingApi.quote(selectedId as number).then((r) => r.data),
    enabled: selectedId !== null,
    retry: false,
    staleTime: 0,
  });

  const backToPlan = () => void navigate(PATHS.schoolPlan);

  const checkout = async () => {
    if (selectedId === null) return;
    setPaying(true);
    setFailure(null);
    try {
      const { data } = await orgBillingApi.checkout(selectedId);
      if (goToGateway(data.paymentUrl)) return; // trình duyệt đang rời trang
      setFailure('Không mở được trang thanh toán của VNPay. Vui lòng thử lại hoặc liên hệ quản trị viên.');
    } catch (error) {
      setFailure(errorMessage(error));
    }
    setPaying(false);
    setConfirming(false);
    void queryClient.invalidateQueries({ queryKey: queryKeys.billing });
  };

  const schoolName = user?.organization?.name;

  return (
    <AreaPage>
      <PageHeader
        title="Chọn gói"
        before={<TextLink to={PATHS.schoolPlan}>← Trường và gói</TextLink>}
        description={`Chọn gói dịch vụ${schoolName ? ` cho ${schoolName}` : ''}. Thanh toán qua VNPay; gói giới hạn số giáo viên và lượt AI, không giới hạn số học sinh.`}
      />

      {SHOW_VNPAY_SANDBOX_NOTE && (
        <InlineMessage tone="info">
          Môi trường thử VNPay: thanh toán bằng thẻ và tài khoản thử của VNPay sandbox, không trừ tiền thật.
        </InlineMessage>
      )}
      {overview.data?.pending && (
        <InlineMessage
          tone="warning"
          action={
            <TextLink to={PATHS.schoolPlan} className="type-body-s">
              Xử lý yêu cầu chưa thanh toán
            </TextLink>
          }
        >
          {`Trường đang có yêu cầu mua gói ${overview.data.pending.planName ?? ''} chưa thanh toán nên chưa chọn được gói khác.`}
        </InlineMessage>
      )}
      {failure && <InlineMessage tone="danger">{failure}</InlineMessage>}

      {offers.isPending ? (
        <LoadingState rows={3} />
      ) : offers.isError ? (
        <ErrorState error={offers.error} onRetry={() => void offers.refetch()} />
      ) : offers.data.length === 0 ? (
        <EmptyState icon="info" title="Hiện chưa có gói nào đang bán.">
          Quản trị hệ thống chưa mở bán gói trả phí. Bạn quay lại sau hoặc liên hệ quản trị viên.
        </EmptyState>
      ) : (
        <fieldset className="grid min-w-0 gap-4 dsvmd:grid-cols-2">
          <legend className="sr-only">Gói dịch vụ</legend>
          {offers.data.map((offer) => (
            <PlanCard
              key={offer.id}
              offer={offer}
              selected={selectedId === offer.id}
              onSelect={() => {
                setPicked(offer.id);
                setFailure(null);
              }}
            />
          ))}
        </fieldset>
      )}

      {selectedId !== null &&
        (quote.isPending ? (
          <LoadingState rows={2} label="Đang tính số tiền…" />
        ) : quote.isError ? (
          <ErrorState error={quote.error} onRetry={() => void quote.refetch()} />
        ) : (
          <>
            <QuoteBlock
              quote={quote.data}
              overview={overview.data}
              paying={paying}
              onPay={() => setConfirming(true)}
              onCancel={backToPlan}
            />
            <ConfirmDialog
              open={confirming}
              title="Thanh toán qua VNPay"
              confirmLabel="Tiếp tục"
              cancelLabel="Quay lại"
              confirming={paying}
              onConfirm={() => void checkout()}
              onClose={() => setConfirming(false)}
            >
              {quote.data.confirmation}
            </ConfirmDialog>
          </>
        ))}
    </AreaPage>
  );
}
