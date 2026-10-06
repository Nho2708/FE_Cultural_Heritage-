import { TRANSLATION_STATE_LABEL } from '@dsvhvn/dung-chung';
import type { TranslationState } from '@dsvhvn/dung-chung/api';
import { Badge, type BadgeTone } from '@dsvhvn/dung-chung/ui';

const TONE: Record<TranslationState, BadgeTone> = { NONE: 'neutral', PENDING: 'danger', APPROVED: 'success', OUTDATED: 'warning' };

/** Tình trạng bản dịch của cả di sản: Chưa dịch / Chờ duyệt / Đã duyệt / Cần dịch lại. */
export function TranslationStateBadge({ state }: { state: TranslationState }) {
  return <Badge tone={TONE[state]}>{TRANSLATION_STATE_LABEL[state]}</Badge>;
}
