import { formatCount, formatPlanDate, TREND_RANGES, trendRange, type TrendRangeId } from '@dsvhvn/dung-chung';
import type { AdStats as ServerStats } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon, LoadingState, SelectField } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { MetricTile } from '../../components/overview/OverviewBits';
import { Block } from '../../components/statistics/StatBits';
import { CountBars, HeritageCountTable } from '../../components/visitors/VisitorBits';
import { visitorStatsApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { useListParams } from '../../lib/listParams';

// Thống kê khách tham quan — quản trị hệ thống. Bộ lọc khoảng ngày (ngày Việt Nam): thiết bị khách hoạt động, ngôn ngữ khách dùng, di sản được xem,
// nghe thuyết minh và xem 3D nhiều nhất. Chỉ số liệu tổng hợp, không tra cứu theo từng mã thiết bị.

const RANGES = TREND_RANGES.map(({ id, label }) => ({ id, label }));

const LANGUAGE_LABEL: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  ko: 'Tiếng Hàn',
  'zh-Hans': 'Tiếng Trung giản thể',
  ja: 'Tiếng Nhật',
};

type Guests = ServerStats['guests'];

function VisitorBlocks({ guests }: { guests: Guests }) {
  const devices = guests.byLanguage.reduce((sum, l) => sum + l.devices, 0);
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Số liệu khách tham quan" className="grid gap-4 dsvsm:grid-cols-2">
        <MetricTile label="Thiết bị khách hoạt động" value={formatCount(guests.activeDevices)} note="Thiết bị ẩn danh có lượt xem trong khoảng này; không có tên hay tài khoản" />
      </section>

      <Block title="Ngôn ngữ khách dùng" hint="Mỗi thiết bị tính một lần cho mỗi ngôn ngữ đã dùng trong khoảng này.">
        {guests.byLanguage.length === 0 ? (
          <p className="type-body-m text-on-surface-variant">Chưa có khách nào trong khoảng này.</p>
        ) : (
          <CountBars
            caption="Ngôn ngữ khách dùng"
            unit="thiết bị"
            total={devices}
            rows={guests.byLanguage.map((l) => ({ key: l.language, label: LANGUAGE_LABEL[l.language] ?? l.language, count: l.devices }))}
          />
        )}
      </Block>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 dsvlg:grid-cols-3">
        <Block title="Được xem nhiều nhất">
          <HeritageCountTable caption="Di sản được xem nhiều nhất" items={guests.mostViewed} unit="lượt xem" />
        </Block>
        <Block title="Được nghe nhiều nhất">
          <HeritageCountTable caption="Di sản được nghe nhiều nhất" items={guests.mostListened} unit="lượt nghe" />
        </Block>
        <Block title="Được xem 3D nhiều nhất">
          <HeritageCountTable caption="Di sản được xem 3D nhiều nhất" items={guests.mostViewed3D} unit="lượt xem 3D" />
        </Block>
      </div>
    </div>
  );
}

export default function VisitorStatsPage() {
  const { params, update } = useListParams();
  const range = (RANGES.some((r) => r.id === params.get('khoang')) ? params.get('khoang') : '30') as TrendRangeId;
  // Ngày của khoảng chỉ tính lại khi đổi khoảng chọn, để khóa cache ổn định trong lúc xem.
  const query = useMemo(() => trendRange(range), [range]);
  const stats = useQuery({ queryKey: queryKeys.visitorStats(query), queryFn: () => visitorStatsApi.stats(query).then((r) => r.data) });
  const data = stats.data;
  return (
    <AreaPage>
      <PageHeader
        title="Thống kê khách tham quan"
        description={
          data
            ? `Từ ${formatPlanDate(data.from)} đến ${formatPlanDate(data.to)} (ngày Việt Nam). Chỉ số liệu tổng hợp, không tra cứu theo từng thiết bị.`
            : 'Hoạt động của khách tham quan: ngôn ngữ dùng và các di sản được xem, nghe thuyết minh, xem 3D nhiều nhất.'
        }
        actions={
          <>
            <div className="min-w-48">
              <SelectField
                label="Khoảng thời gian"
                value={range}
                options={RANGES.map((r) => ({ value: r.id, label: r.label }))}
                onChange={(e) => update({ khoang: e.target.value === '30' ? null : e.target.value }, true)}
              />
            </div>
            <Button variant="secondary" onClick={() => void stats.refetch()} loading={stats.isFetching && !stats.isPending}>
              <Icon name="refresh" size={16} />
              Làm mới
            </Button>
          </>
        }
      />
      {stats.isPending ? (
        <LoadingState rows={4} />
      ) : stats.isError ? (
        <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
      ) : data ? (
        <VisitorBlocks guests={data.guests} />
      ) : (
        <EmptyState icon="bar-chart" title="Chưa có số liệu." />
      )}
    </AreaPage>
  );
}
