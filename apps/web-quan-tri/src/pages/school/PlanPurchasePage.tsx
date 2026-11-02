import { formatMoney, formatMoneyPlain, formatPlanDate, formatPlanPeriod, PURCHASE_KIND_LABEL } from '@dsvhvn/dung-chung';
import { errorMessage, type BillingOverview, type PaymentProvider, type PlanOffer, type PurchaseQuote } from '@dsvhvn/dung-chung/api';
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
// xác nhận: loại thao tác (hệ thống tự phân loại mua, gia hạn, nâng cấp), số tiền, thời hạn dự kiến, lưu ý và cảnh báo vượt
// hạn mức giáo viên. Có nhiều phương thức thanh toán (VNPay, MoMo, PayOS) thì chọn một bằng thẻ radio; "Thanh toán qua …" tạo yêu cầu
// mua, hóa đơn và giao dịch rồi chuyển trình duyệt sang cổng đã chọn; gói chỉ có hiệu lực khi cổng báo thanh toán thành công (trang Kết quả thanh toán). `?goi=` chọn sẵn một gói (gia hạn gói hiện tại).

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

function ProviderPicker({
  providers,
  value,
  onChange,
  disabled,
}: {
  providers: PaymentProvider[];
  value: string;
  onChange: (code: string) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3" disabled={disabled}>
      <legend className="type-label text-on-surface">Phương thức thanh toán</legend>
      <div className="grid gap-3 dsvsm:grid-cols-3">
        {providers.map((p) => (
          <label
            key={p.code}
            className={[
              'flex cursor-pointer items-center gap-3 rounded-md border bg-surface p-4',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary',
              value === p.code ? 'border-2 border-primary' : 'border-border hover:border-border-strong',
            ].join(' ')}
          >
            <input type="radio" name="phuong-thuc" className="sr-only" checked={value === p.code} onChange={() => onChange(p.code)} />
            <span
              aria-hidden="true"
              className={[
                'flex size-5 shrink-0 items-center justify-center rounded-full border-2',
                value === p.code ? 'border-primary bg-primary text-on-primary' : 'border-border-strong',
              ].join(' ')}
            >
              {value === p.code && <Icon name="check" size={12} />}
            </span>
            <span className="type-body-m text-on-surface">{p.name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function quoteNote(quote: PurchaseQuote, overview: BillingOverview | undefined): string {
  const current = overview?.current && overview.hasEffectivePlan ? overview.current : null;
  switch (quote.kind) {
    case 'UPGRADE':
      if (current?.isFree) return 'Gói Miễn phí sẽ kết thúc ngay khi gói mới có hiệu lực (không cộng dồn lượt AI cũ).';
      return current
        ? `Nâng cấp không hoàn tiền hoặc khấu trừ thời gian chưa dùng của gói ${current.planName ?? ''} hiện tại.`
        : 'Gói có hiệu lực từ ngày thanh toán thành công.';
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
  providerName,
  onPay,
  onCancel,
}: {
  quote: PurchaseQuote;
  overview: BillingOverview | undefined;
  paying: boolean;
  providerName: string;
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
        <Fact label="Thời hạn dự kiến">{formatPlanPeriod(quote.expectedStartDate, quote.expectedEndDate)}</Fact>
      </dl>
      <InlineMessage tone="info">{quoteNote(quote, overview)}</InlineMessage>
      {quote.teacherWarning && <InlineMessage tone="warning">{quote.teacherWarning}</InlineMessage>}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onPay} loading={paying}>
          Thanh toán qua {providerName}
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

  const providers = useQuery({
    queryKey: queryKeys.paymentProviders,
    queryFn: () => orgBillingApi.providers().then((r) => r.data),
    staleTime: 60_000,
  });
  const [pickedProvider, setPickedProvider] = useState<string | null>(null);
  const providerList = providers.data ?? [];
  // Chưa chọn thì lấy phương thức đầu tiên (VNPay đứng đầu); danh sách chưa tải xong hoặc lỗi thì để trống và backend dùng VNPay.
  const providerCode = providerList.find((p) => p.code === pickedProvider)?.code ?? providerList[0]?.code ?? '';
  const providerName = providerList.find((p) => p.code === providerCode)?.name ?? 'VNPay';

  const [picked, setPicked] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const preselected = offers.data?.find((o) => o.id === wanted && o.available)?.id ?? null;
  const selectedId = picked ?? preselected;
  const quote = useQuery({
    queryKey: queryKeys.planQuote(selectedId ?? 0, providerCode),
    queryFn: () => orgBillingApi.quote(selectedId as number, providerCode || undefined).then((r) => r.data),
    enabled: selectedId !== null && !providers.isPending,
    retry: false,
    staleTime: 0,
  });

  const backToPlan = () => void navigate(PATHS.schoolPlan);

  const checkout = async () => {
    if (selectedId === null) return;
    setPaying(true);
    setFailure(null);
    try {
      const { data } = await orgBillingApi.checkout(selectedId, providerCode || undefined);
      if (goToGateway(data.paymentUrl)) return; // trình duyệt đang rời trang
      setFailure(`Không mở được trang thanh toán của ${providerName}. Vui lòng thử lại hoặc liên hệ quản trị viên.`);
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
        description={`Chọn gói dịch vụ${schoolName ? ` cho ${schoolName}` : ''}. Thanh toán trực tuyến qua cổng thanh toán; gói giới hạn số giáo viên và lượt AI, không giới hạn số học sinh.`}
      />

      {SHOW_VNPAY_SANDBOX_NOTE && (providerCode === '' || providerCode === 'VNPAY') && (
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
            {providerList.length > 1 && (
              <ProviderPicker providers={providerList} value={providerCode} onChange={setPickedProvider} disabled={paying} />
            )}
            {providerCode === 'MOMO' && (
              <InlineMessage tone="info">Môi trường thử MoMo: thanh toán bằng ứng dụng MoMo thử nghiệm, không trừ tiền thật.</InlineMessage>
            )}
            {providerCode === 'PAYOS' && (
              <InlineMessage tone="info">PayOS không có môi trường thử riêng: quét mã QR bằng ứng dụng ngân hàng, giao dịch là chuyển khoản thật.</InlineMessage>
            )}
            <QuoteBlock
              quote={quote.data}
              overview={overview.data}
              paying={paying}
              providerName={providerName}
              onPay={() => setConfirming(true)}
              onCancel={backToPlan}
            />
            <ConfirmDialog
              open={confirming}
              title={`Thanh toán qua ${providerName}`}
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
