import { MESSAGES, formatPlanDate } from '@dsvhvn/dung-chung';
import { InlineMessage, TextLink } from '@dsvhvn/dung-chung/ui';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AREA_ROOT, pathOf } from '../../access/screens';
import { AreaLayout } from '../../components/layout/AreaLayout';
import { schoolNav } from '../../components/layout/navigation';
import { orgApi } from '../../lib/api/endpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { useAuth } from '../../lib/auth/context';

// Khu quản trị trường /truong. Tải lười: chunk này chỉ tải khi người dùng là quản trị trường.
// Trường không có gói hiệu lực: thanh báo trên cùng mọi màn của khu; "Thêm giáo viên" bị khóa ở Giáo viên của trường.

function PlanBanner() {
  const org = useQuery({ queryKey: queryKeys.org, queryFn: () => orgApi.get().then((r) => r.data) });
  const subscription = org.data?.subscription;
  if (!org.data || subscription?.isEffective) return null;
  // Gói bị hủy kết thúc ngay nhưng ngày hết hạn ghi trên đăng ký là ngày dự kiến ban đầu: không dùng làm "hết hiệu lực từ ngày".
  const endedOn = subscription?.status === 'EXPIRED' || subscription?.status === 'ACTIVE' ? subscription.endDate : null;
  return (
    <div className="px-4 pt-4 dsvmd:px-8">
      <InlineMessage
        tone="warning"
        action={
          <TextLink to={pathOf('planPurchase')} className="type-body-s">
            Mua gói
          </TextLink>
        }
      >
        {MESSAGES.noEffectivePlan(formatPlanDate(endedOn) || null)}
      </InlineMessage>
    </div>
  );
}

export default function SchoolArea({ children }: { children?: ReactNode }) {
  const { user } = useAuth();
  return (
    <AreaLayout
      title="Quản trị trường"
      context={user?.organization?.name}
      root={AREA_ROOT.school}
      items={schoolNav(user?.role)}
      banner={<PlanBanner />}
    >
      {children}
    </AreaLayout>
  );
}
