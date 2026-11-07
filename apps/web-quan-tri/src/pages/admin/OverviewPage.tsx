import {
  PAYMENT_STATUS_LABEL,
  TREND_METRICS,
  TREND_RANGES,
  formatCount,
  formatDateTime,
  formatMoney,
  formatPrice,
  trendRange,
  usagePercent,
  type TrendMetricId,
  type TrendRangeId,
} from '@dsvhvn/dung-chung';
import type { PaymentStatus, SystemOverview, SystemPaymentQuery } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Blank,
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
  LoadingState,
  Pagination,
  SelectField,
  Table,
  TabPanel,
  Tabs,
  Td,
  TextLink,
  Th,
  Tr,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { PATHS, pathOf } from '../../access/screens';
import { PaymentStatusBadge } from '../../components/billing/billingUi';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { MetricTile, TrendBars, UsageBar } from '../../components/overview/OverviewBits';
import { Block } from '../../components/statistics/StatBits';
import { adminOrganizationsApi } from '../../lib/api/endpoints';
import { overviewApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';

// Tổng quan và doanh thu — quản trị hệ thống. Tab Tổng quan: số trường, giáo viên, học sinh, lượt AI toàn hệ thống, nội dung, số trường đang
// dùng từng gói, việc cần chú ý và biểu đồ theo thời gian (ngày Việt Nam). Tab Doanh thu: doanh thu từ giao dịch VNPay thành công theo ngày thanh
// toán (tháng này, hôm nay, từ trước tới nay, biểu đồ theo kỳ) và danh sách giao dịch lọc theo trạng thái, trường, khoảng ngày.

type TabId = 'tong-quan' | 'doanh-thu';

const PAYMENT_SLUG = slugMap<PaymentStatus>({ PENDING: 'dang-cho', SUCCEEDED: 'thanh-cong', FAILED: 'that-bai', REFUNDED: 'da-hoan-tien' });
const PAYMENT_RANGES = [{ id: 'tat-ca', label: 'Mọi thời điểm' }, ...TREND_RANGES] as const;

/** Số khoản thanh toán đến muộn hiện ngay trong mục Cần chú ý; phần còn lại chỉ nêu số. */
const LATE_PAYMENTS_SHOWN = 5;

function LatePayments({ data }: { data: SystemOverview }) {
  const total = data.latePaymentsToReview ?? 0;
  const rows = (data.latePayments ?? []).slice(0, LATE_PAYMENTS_SHOWN);
  return (
    <li className="border-b border-border pb-4 last:border-b-0 last:pb-0">
      <p className="type-body-m text-on-surface">Có {formatCount(total)} khoản thanh toán đến muộn cần xử lý.</p>
      <p className="mt-1 type-body-s text-on-surface-variant">
        Tiền đã ghi nhận nhưng trường đã có gói mới hơn nên gói cũ không kích hoạt lại. Hãy liên hệ trường hoặc hoàn tiền ngoài hệ thống.
      </p>
      {rows.length > 0 && (
        <ul aria-label="Khoản thanh toán đến muộn" className="mt-2 flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.paymentId} className="type-body-s text-on-surface">
              <span className="font-medium">Hóa đơn {row.invoiceNumber}</span>
              {' · '}
              <TextLink to={PATHS.school(row.organizationId)}>{row.organizationName}</TextLink>
              {row.planName ? ` · gói ${row.planName}` : ''}
              {` · ${formatMoney(row.amount)} · ${formatDateTime(row.paidAt)}`}
            </li>
          ))}
        </ul>
      )}
      {total > rows.length && <p className="mt-2 type-body-s text-on-surface-variant">Còn {formatCount(total - rows.length)} khoản khác.</p>}
    </li>
  );
}

function Attention({ data }: { data: SystemOverview }) {
  const expiring = data.plans.reduce((sum, p) => sum + p.expiringSoonSchools, 0);
  const latePayments = data.latePaymentsToReview ?? 0;
  const items: Array<{ key: string; text: string; to: string; action: string }> = [];
  if (data.schools.withoutEffectivePlan > 0)
    items.push({
      key: 'no-plan',
      text: `${formatCount(data.schools.withoutEffectivePlan)} trường không có gói đang hiệu lực.`,
      to: pathOf('schools'),
      action: 'Xem danh sách trường',
    });
  if (expiring > 0)
    items.push({
      key: 'expiring',
      text: `${formatCount(expiring)} trường có gói sắp hết hạn trong 14 ngày tới.`,
      to: pathOf('schools'),
      action: 'Xem danh sách trường',
    });
  if (data.content.questions.pending > 0)
    items.push({
      key: 'pending-questions',
      text: `Có ${formatCount(data.content.questions.pending)} câu hỏi đang chờ giáo viên duyệt.`,
      to: pathOf('questionModeration'),
      action: 'Mở kiểm duyệt câu hỏi',
    });
  if (data.recentFailedPayments > 0)
    items.push({
      key: 'failed-payments',
      text: `${formatCount(data.recentFailedPayments)} giao dịch thanh toán thất bại trong 7 ngày gần nhất.`,
      to: `${pathOf('adminOverview')}?tab=doanh-thu&trang-thai=${PAYMENT_SLUG.toSlug('FAILED')}`,
      action: 'Xem giao dịch thất bại',
    });
  if (data.content.questions.hidden > 0)
    items.push({
      key: 'hidden',
      text: `${formatCount(data.content.questions.hidden)} câu hỏi đang bị ẩn khỏi ngân hàng.`,
      to: pathOf('questionModeration'),
      action: 'Mở kiểm duyệt câu hỏi',
    });
  return (
    <Block title="Cần chú ý" hint="Tính từ số liệu hiện có, không phải cảnh báo thời gian thực.">
      {items.length === 0 && latePayments === 0 ? (
        <p className="type-body-m text-on-surface-variant">Chưa có việc nào cần chú ý.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {latePayments > 0 && <LatePayments data={data} />}
          {items.map((item) => (
            <li key={item.key} className="border-b border-border pb-4 last:border-b-0 last:pb-0">
              <p className="type-body-m text-on-surface">{item.text}</p>
              <TextLink to={item.to} className="mt-1 inline-block type-body-s">
                {item.action}
              </TextLink>
            </li>
          ))}
        </ul>
      )}
    </Block>
  );
}

function PlanUsage({ data }: { data: SystemOverview }) {
  return (
    <Block title="Trường đang dùng từng gói" hint="Mỗi trường có tối đa một gói đang hiệu lực. Gói đã ngừng bán vẫn tính nếu trường còn dùng.">
      {data.plans.length === 0 ? (
        <EmptyState icon="star" title="Chưa có gói dịch vụ nào." />
      ) : (
        <Table caption="Số trường đang dùng từng gói">
          <thead>
            <tr>
              <Th>Gói</Th>
              <Th>Giá mỗi kỳ</Th>
              <Th>Trường đang hiệu lực</Th>
              <Th>Sắp hết hạn</Th>
            </tr>
          </thead>
          <tbody>
            {data.plans.map((plan) => (
              <Tr key={plan.planId}>
                <Td className="font-medium">
                  {plan.planName}
                  {!plan.isActive && (
                    <span className="ml-2">
                      <Badge>Ngừng bán</Badge>
                    </span>
                  )}
                </Td>
                <Td className="type-mono-label whitespace-nowrap">{formatPrice(plan.price) || '—'}</Td>
                <Td>
                  <div className="flex min-w-40 items-center gap-3">
                    <div className="flex-1">
                      <UsageBar percent={usagePercent(plan.activeSchools, data.schools.total) ?? 0} label={`${plan.planName}: ${plan.activeSchools} trường`} />
                    </div>
                    <span className="type-label tabular-nums">{formatCount(plan.activeSchools)} trường</span>
                  </div>
                </Td>
                <Td className="tabular-nums">{plan.expiringSoonSchools > 0 ? `${formatCount(plan.expiringSoonSchools)} trường` : '—'}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Block>
  );
}

function TrendBlock() {
  const { params, update } = useListParams();
  const range = (TREND_RANGES.some((r) => r.id === params.get('khoang')) ? params.get('khoang') : '30') as TrendRangeId;
  const metric = (TREND_METRICS.some((m) => m.id === params.get('chi-so')) ? params.get('chi-so') : 'attemptsFinished') as TrendMetricId;
  // Ngày của khoảng chỉ tính lại khi đổi khoảng chọn, để khóa cache của biểu đồ ổn định trong lúc xem.
  const query = useMemo(() => trendRange(range), [range]);
  const trend = useQuery({ queryKey: queryKeys.systemTrend(query), queryFn: () => overviewApi.trend(query).then((r) => r.data) });
  const metricLabel = TREND_METRICS.find((m) => m.id === metric)?.label ?? '';
  return (
    <Block
      title="Biến động theo thời gian"
      hint="Tính theo ngày Việt Nam; khoảng dài hơn 92 ngày gom theo tháng, kỳ không có gì vẫn hiện."
      actions={
        <div className="flex w-full flex-wrap gap-3 dsvsm:w-auto">
          <div className="min-w-44 flex-1">
            <SelectField
              label="Số liệu"
              value={metric}
              options={TREND_METRICS.map((m) => ({ value: m.id, label: m.label }))}
              onChange={(e) => update({ 'chi-so': e.target.value === 'attemptsFinished' ? null : e.target.value }, true)}
            />
          </div>
          <div className="min-w-44 flex-1">
            <SelectField
              label="Khoảng thời gian"
              value={range}
              options={TREND_RANGES.map((r) => ({ value: r.id, label: r.label }))}
              onChange={(e) => update({ khoang: e.target.value === '30' ? null : e.target.value }, true)}
            />
          </div>
        </div>
      }
    >
      {trend.isPending ? (
        <LoadingState rows={3} />
      ) : trend.isError ? (
        <ErrorState error={trend.error} onRetry={() => void trend.refetch()} />
      ) : (
        <>
          <p className="mb-3 type-body-m text-on-surface">
            Tổng cả khoảng: <strong className="tabular-nums">{formatCount(trend.data.totals[metric])}</strong> {metricLabel.toLocaleLowerCase('vi')}
          </p>
          <TrendBars points={trend.data.points} granularity={trend.data.granularity} metric={metric} metricLabel={metricLabel} />
        </>
      )}
    </Block>
  );
}

function OverviewTab({ data }: { data: SystemOverview }) {
  const { schools, teachers, content, ai } = data;
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Số liệu toàn hệ thống" className="grid gap-4 dsvsm:grid-cols-2 dsvlg:grid-cols-4">
        <MetricTile
          label="Trường"
          value={formatCount(schools.total)}
          note={`${formatCount(schools.withEffectivePlan)} trường có gói đang hiệu lực, ${formatCount(schools.withoutEffectivePlan)} trường không có`}
        />
        <MetricTile label="Giáo viên" value={formatCount(teachers.total)} note={`${formatCount(teachers.active)} giáo viên đang hoạt động`} />
        <MetricTile label="Học sinh" value={formatCount(data.activeStudents)} note="Học sinh đang hoạt động của các trường chưa ngừng" />
        <MetricTile
          label="Lượt AI toàn hệ thống"
          value={formatCount(ai.total)}
          note={`${formatCount(ai.thisMonth)} lượt trong tháng này; giáo viên ${formatCount(ai.byTeachers)}, quản trị hệ thống ${formatCount(ai.byAdmin)}`}
        />
        <MetricTile label="Di sản đã xuất bản" value={formatCount(content.publishedHeritages)} />
        <MetricTile label="Bài học" value={formatCount(content.lessons)} note={`${formatCount(content.publishedLessons)} bài đã xuất bản`} />
        <MetricTile label="Bài kiểm tra đã phát hành" value={formatCount(content.publishedQuizzes)} note={`${formatCount(content.finishedAttempts)} lượt đã nộp`} />
        <MetricTile
          label="Ngân hàng câu hỏi"
          value={formatCount(content.questions.approved)}
          note={`${formatCount(content.questions.pending)} câu chờ duyệt, ${formatCount(content.questions.hidden)} câu đã ẩn`}
        />
      </section>
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 dsvlg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <PlanUsage data={data} />
        <Attention data={data} />
      </div>
      <TrendBlock />
    </div>
  );
}

function RevenueTrend() {
  const { params, update } = useListParams();
  const range = (TREND_RANGES.some((r) => r.id === params.get('khoang-doanh-thu')) ? params.get('khoang-doanh-thu') : '30') as TrendRangeId;
  const query = useMemo(() => trendRange(range), [range]);
  const trend = useQuery({ queryKey: queryKeys.systemTrend(query), queryFn: () => overviewApi.trend(query).then((r) => r.data) });
  return (
    <Block
      title="Doanh thu theo kỳ"
      hint="Tổng số tiền giao dịch thành công theo ngày thanh toán giờ Việt Nam; khoảng dài hơn 92 ngày gom theo tháng."
      actions={
        <div className="min-w-44">
          <SelectField
            label="Khoảng thời gian"
            value={range}
            options={TREND_RANGES.map((r) => ({ value: r.id, label: r.label }))}
            onChange={(e) => update({ 'khoang-doanh-thu': e.target.value === '30' ? null : e.target.value }, true)}
          />
        </div>
      }
    >
      {trend.isPending ? (
        <LoadingState rows={3} />
      ) : trend.isError ? (
        <ErrorState error={trend.error} onRetry={() => void trend.refetch()} />
      ) : (
        <>
          <p className="mb-3 type-body-m text-on-surface">
            Tổng cả khoảng: <strong className="tabular-nums">{formatMoney(trend.data.totals.revenue)}</strong>
          </p>
          <TrendBars points={trend.data.points} granularity={trend.data.granularity} metric="revenue" metricLabel="Doanh thu" format={formatMoney} />
        </>
      )}
    </Block>
  );
}

function PaymentList() {
  const { params, update, page } = useListParams();
  const status = PAYMENT_SLUG.fromSlug(params.get('trang-thai'));
  const organizationId = Number(params.get('truong')) || '';
  const range = PAYMENT_RANGES.some((r) => r.id === params.get('khoang-giao-dich')) ? (params.get('khoang-giao-dich') as (typeof PAYMENT_RANGES)[number]['id']) : 'tat-ca';
  const dates = useMemo(() => (range === 'tat-ca' ? {} : trendRange(range)), [range]);
  const query: SystemPaymentQuery = { status, organizationId, ...dates, page, pageSize: PAGE_SIZE };
  const list = useQuery({
    queryKey: queryKeys.systemPayments(query),
    queryFn: () => overviewApi.payments(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const orgQuery = { pageSize: 100 };
  const schools = useQuery({
    queryKey: queryKeys.organizationList(orgQuery),
    queryFn: () => adminOrganizationsApi.list(orgQuery).then((r) => r.data),
  });
  const filtered = status !== '' || organizationId !== '' || range !== 'tat-ca';
  return (
    <Block title="Giao dịch thanh toán" hint="Mọi giao dịch VNPay của các trường, mới nhất trước. Khoảng thời gian tính theo ngày tạo giao dịch.">
      <div className="mb-4 grid gap-3 dsvsm:grid-cols-3">
        <SelectField
          label="Trạng thái"
          value={PAYMENT_SLUG.toSlug(status)}
          options={[
            { value: '', label: 'Mọi trạng thái' },
            ...(Object.keys(PAYMENT_STATUS_LABEL) as PaymentStatus[]).map((s) => ({ value: PAYMENT_SLUG.toSlug(s), label: PAYMENT_STATUS_LABEL[s] })),
          ]}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
        />
        <SelectField
          label="Trường"
          value={organizationId === '' ? '' : String(organizationId)}
          options={[{ value: '', label: 'Mọi trường' }, ...(schools.data?.items ?? []).map((o) => ({ value: String(o.id), label: o.name }))]}
          onChange={(e) => update({ truong: e.target.value })}
        />
        <SelectField
          label="Thời gian giao dịch"
          value={range}
          options={PAYMENT_RANGES.map((r) => ({ value: r.id, label: r.label }))}
          onChange={(e) => update({ 'khoang-giao-dich': e.target.value === 'tat-ca' ? null : e.target.value })}
        />
      </div>
      {list.isPending ? (
        <LoadingState rows={4} />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState
          icon={filtered ? 'search' : 'file-text'}
          title={filtered ? 'Không có giao dịch nào khớp bộ lọc.' : 'Chưa có giao dịch thanh toán nào.'}
          action={
            filtered && (
              <Button variant="secondary" onClick={() => update({ 'trang-thai': null, truong: null, 'khoang-giao-dich': null })}>
                Bỏ lọc
              </Button>
            )
          }
        />
      ) : (
        <div>
          <Table caption="Giao dịch thanh toán" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Thời điểm tạo</Th>
                <Th>Trường</Th>
                <Th>Hóa đơn</Th>
                <Th>Gói</Th>
                <Th className="text-right">Số tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Thanh toán lúc</Th>
                <Th>Mã giao dịch VNPay</Th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((p) => (
                <Tr key={p.id}>
                  <Td className="type-mono-label whitespace-nowrap">{p.createdAt ? formatDateTime(p.createdAt) : <Blank />}</Td>
                  <Td>{p.organizationName ?? <Blank />}</Td>
                  <Td className="type-mono-label whitespace-nowrap">{p.invoiceNumber ?? <Blank />}</Td>
                  <Td className="whitespace-nowrap">{p.planName ?? <Blank />}</Td>
                  <Td className="text-right type-mono-label whitespace-nowrap">{formatMoney(p.amount) || <Blank />}</Td>
                  <Td>
                    <PaymentStatusBadge status={p.status} />
                  </Td>
                  <Td className="type-mono-label whitespace-nowrap">{p.paidAt ? formatDateTime(p.paidAt) : <Blank />}</Td>
                  <Td className="type-mono-label">{p.providerTransactionId ?? <Blank />}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="giao dịch"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
    </Block>
  );
}

function RevenueTab({ data }: { data: SystemOverview }) {
  const { revenue } = data;
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Doanh thu từ gói dịch vụ" className="grid gap-4 dsvsm:grid-cols-3">
        <MetricTile label="Doanh thu tháng này" value={formatMoney(revenue.thisMonth)} note={`Hôm nay ${formatMoney(revenue.today)}`} />
        <MetricTile label="Doanh thu từ trước tới nay" value={formatMoney(revenue.total)} note={revenue.message} />
        <MetricTile label="Giao dịch thành công" value={formatCount(revenue.succeededPayments)} note="Gói Miễn phí không qua VNPay nên không tạo doanh thu" />
      </section>
      <RevenueTrend />
      <PaymentList />
    </div>
  );
}

export default function OverviewPage() {
  const { params, update } = useListParams();
  const tab: TabId = params.get('tab') === 'doanh-thu' ? 'doanh-thu' : 'tong-quan';
  const overview = useQuery({ queryKey: queryKeys.systemOverview, queryFn: () => overviewApi.system().then((r) => r.data) });
  const data = overview.data;
  return (
    <AreaPage>
      <PageHeader
        title="Tổng quan"
        description={data ? `Số liệu toàn hệ thống, cập nhật lúc ${formatDateTime(data.generatedAt)}.` : 'Số liệu toàn hệ thống.'}
        actions={
          <>
            <Button variant="secondary" onClick={() => void overview.refetch()} loading={overview.isFetching && !overview.isPending}>
              <Icon name="refresh" size={16} />
              Làm mới
            </Button>
            <ButtonLink to={pathOf('questionModeration')} variant="secondary">
              <Icon name="shield-check" size={16} />
              Kiểm duyệt câu hỏi
            </ButtonLink>
          </>
        }
      />
      <div>
        <Tabs
          idPrefix="tong-quan"
          label="Tổng quan và doanh thu"
          items={[
            { id: 'tong-quan' as const, label: 'Tổng quan' },
            { id: 'doanh-thu' as const, label: 'Doanh thu' },
          ]}
          value={tab}
          onChange={(next) => update({ tab: next === 'tong-quan' ? null : next }, true)}
        />
        <TabPanel idPrefix="tong-quan" id={tab}>
          {overview.isPending ? (
            <LoadingState rows={4} />
          ) : overview.isError ? (
            <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />
          ) : data ? (
            tab === 'tong-quan' ? (
              <OverviewTab data={data} />
            ) : (
              <RevenueTab data={data} />
            )
          ) : null}
        </TabPanel>
      </div>
    </AreaPage>
  );
}
