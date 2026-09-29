import type { UserStatus } from '@dsvhvn/dung-chung/api';
import { USER_STATUS_LABEL } from '@dsvhvn/dung-chung';
import { Badge, Blank, type BadgeTone } from '@dsvhvn/dung-chung/ui';

const TONE: Record<UserStatus, BadgeTone> = { ACTIVE: 'success', LOCKED: 'danger', INACTIVE: 'neutral' };

/** Trạng thái tài khoản (`users.status`): Hoạt động / Bị khóa / Ngừng sử dụng; không có giá trị thì hiện gạch ngang. */
export function AccountStatusBadge({ status }: { status: UserStatus | null }) {
  if (!status) return <Blank />;
  return <Badge tone={TONE[status]}>{USER_STATUS_LABEL[status]}</Badge>;
}
