import type { OrganizationState } from '@dsvhvn/dung-chung/api';
import { ORGANIZATION_STATE_LABEL } from '@dsvhvn/dung-chung';
import { Badge } from '@dsvhvn/dung-chung/ui';

/** Trạng thái trường: Đang hoạt động / Đã ngừng (xóa mềm `organizations`). */
export function OrganizationStateBadge({ state }: { state: OrganizationState }) {
  return <Badge tone={state === 'ACTIVE' ? 'success' : 'neutral'}>{ORGANIZATION_STATE_LABEL[state]}</Badge>;
}
