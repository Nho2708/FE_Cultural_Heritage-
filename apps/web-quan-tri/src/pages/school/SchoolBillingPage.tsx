import { useSearchParams } from 'react-router';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { TabPanel, Tabs, type TabItem } from '@dsvhvn/dung-chung/ui';
import { InvoicesTab } from '../../components/billing/InvoicesTab';
import { PlanTab } from '../../components/billing/PlanTab';

// Gói đã mua (hai tab: Gói và hạn mức, Hóa đơn và giao dịch) — quản trị trường.
// Tab "Gói và hạn mức": gói đang dùng, hạn mức, mua, gia hạn, nâng cấp, hủy gói qua VNPay.
// Tab "Hóa đơn và giao dịch": biên nhận nội bộ và các lần thanh toán.

type TabId = 'goi-va-han-muc' | 'hoa-don';

const TABS: readonly TabItem<TabId>[] = [
  { id: 'goi-va-han-muc', label: 'Gói và hạn mức' },
  { id: 'hoa-don', label: 'Hóa đơn và giao dịch' },
] as const;

const readTab = (value: string | null): TabId => TABS.find((t) => t.id === value)?.id ?? 'goi-va-han-muc';

export default function SchoolBillingPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));

  const setTab = (next: TabId) =>
    setSearchParams(
      (current) => {
        const params = new URLSearchParams(current);
        if (next === 'goi-va-han-muc') params.delete('tab');
        else params.set('tab', next);
        return params;
      },
      { replace: true },
    );

  return (
    <AreaPage>
      <PageHeader
        title="Gói đã mua"
        description="Gói dịch vụ đang dùng, hạn mức và hóa đơn thanh toán."
      />
      <div>
        <Tabs idPrefix="goi" label="Gói đã mua" items={TABS} value={tab} onChange={setTab} />
        <TabPanel idPrefix="goi" id={tab}>
          {tab === 'goi-va-han-muc' ? <PlanTab /> : <InvoicesTab />}
        </TabPanel>
      </div>
    </AreaPage>
  );
}
