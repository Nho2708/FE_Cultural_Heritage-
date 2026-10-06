import { Button, InlineMessage } from '@dsvhvn/dung-chung/ui';
import { useI18n } from '../i18n/context';
import { useErrorText } from './useErrorText';

/** Khối lỗi kèm nút "Thử lại", theo ngôn ngữ đang chọn. */
export function PublicErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const text = useErrorText();
  return (
    <InlineMessage
      tone="danger"
      action={
        onRetry && (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {t.common.retry}
          </Button>
        )
      }
    >
      {text(error)}
    </InlineMessage>
  );
}
