import type { ContentStatus } from '@dsvhvn/dung-chung/api';
import { HERITAGE_STATUS_LABEL } from '@dsvhvn/dung-chung';
import { Badge, type BadgeTone } from '@dsvhvn/dung-chung/ui';

const TONE: Record<ContentStatus, BadgeTone> = { DRAFT: 'neutral', PUBLISHED: 'success', ARCHIVED: 'warning' };

/** Trạng thái di sản: Nháp / Đã xuất bản / Đã ẩn. */
export function HeritageStatusBadge({ status }: { status: ContentStatus }) {
  return <Badge tone={TONE[status]}>{HERITAGE_STATUS_LABEL[status]}</Badge>;
}
