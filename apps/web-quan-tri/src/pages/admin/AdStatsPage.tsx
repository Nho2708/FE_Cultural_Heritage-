import { formatCount, formatPlanDate, TREND_RANGES, trendRange, type TrendRangeId } from '@dsvhvn/dung-chung';
import type { AdNetwork, AdStats, ClientPlatform } from '@dsvhvn/dung-chung/api';
import { Badge, Button, EmptyState, ErrorState, Icon, LoadingState, SelectField, Table, TabPanel, Tabs, Td, Th, Tr } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { CountBars, HeritageCountTable } from '../../components/ads/AdBits';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { MetricTile, TrendBars } from '../../components/overview/OverviewBits';
import { Block } from '../../components/statistics/StatBits';
import { adStatsApi } from '../../lib/api/overviewEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { useListParams } from '../../lib/listParams';

// Khách và quảng cáo — quản trị hệ thống. Bộ lọc khoảng ngày (ngày Việt Nam). Tab Mở khóa bằng quảng cáo: số lượt mở khóa và lượt bị từ chối, lượt mở khóa theo ngày, nền tảng,
// mạng quảng cáo kèm nguồn báo, di sản được mở khóa nhiều nhất, lượt bị từ chối theo lý do. Tab Khách và di sản: thiết bị khách hoạt động, ngôn ngữ, di sản được xem, nghe, xem 3D nhiều.
// Chỉ số liệu tổng hợp: không có doanh thu (xem ở bảng điều khiển AdMob và Ad Manager của Google), không tra cứu theo từng mã thiết bị.

type TabId = 'mo-khoa' | 'khach';

const RANGES = TREND_RANGES.map(({ id, label }) => ({ id, label }));

const PLATFORM_LABEL: Record<ClientPlatform, string> = { ANDROID: 'Android', IOS: 'iOS', WEB: 'Web' };
const NETWORK_LABEL: Record<AdNetwork, string> = { ADMOB: 'Google AdMob', AD_MANAGER: 'Google Ad Manager' };
const LANGUAGE_LABEL: Record<string, string> = {
  vi: 'Tiếng Việt',
  en: 'Tiếng Anh',
  ko: 'Tiếng Hàn',
  'zh-Hans': 'Tiếng Trung giản thể',
  ja: 'Tiếng Nhật',
};

const EXTERNAL_LINK =
  'inline-flex h-11 items-center gap-2 rounded-sm border border-border-strong px-4 type-control text-on-surface hover:bg-surface-container-low';

/** Chỉ mở liên kết https do máy chủ trả; địa chỉ lạ thì dùng địa chỉ mặc định của Google. */
function safeConsoleUrl(url: string, fallback: string): string {
  return /^https:\/\/[a-z0-9.-]+\.(?:google\.com)(?:\/|$)/i.test(url) ? url : fallback;
}

function RevenueNote({ stats }: { stats: AdStats }) {
  return (
    <Block title="Doanh thu quảng cáo" hint="Doanh thu quảng cáo xem ở bảng điều khiển Google AdMob và Google Ad Manager. Hệ thống không nhận và không lưu số liệu doanh thu từ Google.">
      <div className="flex flex-wrap gap-3">
        <a href={safeConsoleUrl(stats.adMobConsoleUrl, 'https://apps.admob.com')} target="_blank" rel="noreferrer" className={EXTERNAL_LINK}>
          <Icon name="external-link" size={16} />
          Mở bảng điều khiển AdMob
        </a>
        <a href={safeConsoleUrl(stats.adManagerConsoleUrl, 'https://admanager.google.com')} target="_blank" rel="noreferrer" className={EXTERNAL_LINK}>
          <Icon name="external-link" size={16} />
          Mở bảng điều khiển Ad Manager
        </a>
      </div>
      <p className="mt-3 type-body-s text-on-surface-variant">{stats.note}</p>
    </Block>
  );
}

function UnlockTab({ stats }: { stats: AdStats }) {
  const { unlocks, rejections } = stats;
  const dayPoints = unlocks.byDay.map((day) => ({ period: day.date, count: day.count }));
  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Số liệu mở khóa bằng quảng cáo" className="grid gap-4 dsvsm:grid-cols-2">
        <MetricTile label="Lượt mở khóa bằng quảng cáo" value={formatCount(unlocks.total)} note="Mỗi lượt mở tóm tắt và nghe thuyết minh của một di sản trong 24 giờ trên một thiết bị" />
        <MetricTile label="Lượt bị từ chối" value={formatCount(rejections.total)} note="Phần thưởng không hợp lệ; lần gọi lại trùng mã giao dịch không tính" />
      </section>

      <Block title="Lượt mở khóa theo ngày" hint="Tính theo ngày Việt Nam; ngày không có lượt nào vẫn hiện.">
        <TrendBars points={dayPoints} granularity="DAY" metric="count" metricLabel="Lượt mở khóa" />
      </Block>

      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 dsvlg:grid-cols-2">
        <Block title="Theo nền tảng">
          {unlocks.total === 0 ? (
            <p className="type-body-m text-on-surface-variant">Chưa có lượt mở khóa nào trong khoảng này.</p>
          ) : (
            <CountBars
              caption="Lượt mở khóa theo nền tảng"
              unit="lượt"
              total={unlocks.total}
              rows={unlocks.byPlatform.map((p) => ({ key: p.platform, label: PLATFORM_LABEL[p.platform], count: p.count }))}
            />
          )}
        </Block>
        <Block title="Theo mạng quảng cáo và nguồn báo" hint="Máy chủ xác minh (AdMob) đáng tin hơn trình duyệt báo (Ad Manager trên web).">
          {unlocks.byNetwork.length === 0 ? (
            <p className="type-body-m text-on-surface-variant">Chưa có lượt mở khóa nào trong khoảng này.</p>
          ) : (
            <Table caption="Lượt mở khóa theo mạng quảng cáo">
              <thead>
                <tr>
                  <Th>Mạng quảng cáo</Th>
                  <Th>Nguồn báo</Th>
                  <Th className="text-right">Số lượt</Th>
                </tr>
              </thead>
              <tbody>
                {unlocks.byNetwork.map((n) => (
                  <Tr key={n.network}>
                    <Td className="font-medium">{NETWORK_LABEL[n.network]}</Td>
                    <Td>
                      <Badge tone={n.network === 'ADMOB' ? 'success' : 'warning'}>{n.sourceLabel}</Badge>
                    </Td>
                    <Td className="text-right tabular-nums">{formatCount(n.count)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </Block>
      </div>

      <Block title="Di sản được mở khóa nhiều nhất">
        <HeritageCountTable caption="Di sản được mở khóa nhiều nhất" items={unlocks.topHeritages} unit="lượt mở khóa" />
      </Block>

      <Block title="Lượt bị từ chối theo lý do" hint="Mỗi lượt vượt giới hạn tần suất của web chỉ ghi một dòng cho mỗi thiết bị trong một giờ.">
        <Table caption="Lượt bị từ chối theo lý do">
          <thead>
            <tr>
              <Th>Lý do</Th>
              <Th className="text-right">Số lượt</Th>
            </tr>
          </thead>
          <tbody>
            {rejections.byReason.map((r) => (
              <Tr key={r.reason}>
                <Td>{r.label}</Td>
                <Td className="text-right tabular-nums">{formatCount(r.count)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </Block>

      <RevenueNote stats={stats} />
    </div>
  );
}

function GuestTab({ stats }: { stats: AdStats }) {
  const { guests } = stats;
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

      <RevenueNote stats={stats} />
    </div>
  );
}

export default function AdStatsPage() {
  const { params, update } = useListParams();
  const tab: TabId = params.get('tab') === 'khach' ? 'khach' : 'mo-khoa';
  const range = (RANGES.some((r) => r.id === params.get('khoang')) ? params.get('khoang') : '30') as TrendRangeId;
  // Ngày của khoảng chỉ tính lại khi đổi khoảng chọn, để khóa cache ổn định trong lúc xem.
  const query = useMemo(() => trendRange(range), [range]);
  const stats = useQuery({ queryKey: queryKeys.adStats(query), queryFn: () => adStatsApi.stats(query).then((r) => r.data) });
  const data = stats.data;
  return (
    <AreaPage>
      <PageHeader
        title="Khách và quảng cáo"
        description={
          data
            ? `Từ ${formatPlanDate(data.from)} đến ${formatPlanDate(data.to)} (ngày Việt Nam). Chỉ số liệu tổng hợp, không có doanh thu.`
            : 'Lượt mở khóa tóm tắt và nghe thuyết minh bằng quảng cáo Google có thưởng, và hoạt động của khách tham quan.'
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
      <div>
        <Tabs
          idPrefix="khach-va-quang-cao"
          label="Thống kê khách và quảng cáo"
          items={[
            { id: 'mo-khoa' as const, label: 'Mở khóa bằng quảng cáo' },
            { id: 'khach' as const, label: 'Khách và di sản' },
          ]}
          value={tab}
          onChange={(next) => update({ tab: next === 'mo-khoa' ? null : next }, true)}
        />
        <TabPanel idPrefix="khach-va-quang-cao" id={tab}>
          {stats.isPending ? (
            <LoadingState rows={4} />
          ) : stats.isError ? (
            <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
          ) : data ? (
            tab === 'mo-khoa' ? (
              <UnlockTab stats={data} />
            ) : (
              <GuestTab stats={data} />
            )
          ) : (
            <EmptyState icon="bar-chart" title="Chưa có số liệu." />
          )}
        </TabPanel>
      </div>
    </AreaPage>
  );
}
