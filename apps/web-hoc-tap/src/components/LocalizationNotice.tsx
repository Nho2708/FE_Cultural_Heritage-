import type { Localization } from '@dsvhvn/dung-chung/api';
import { Icon } from '@dsvhvn/dung-chung/ui';
import { useI18n } from '../i18n/context';

/**
 * Thông báo về ngôn ngữ của nội dung đang hiện, một lần cho cả trang: chưa có bản ở ngôn ngữ yêu cầu thì nói đang hiện bản tiếng Việt; bản
 * Hàn, Trung, Nhật luôn gắn nhãn "bản dịch máy". Nội dung đã có bản duyệt (tiếng Việt, tiếng Anh) không có thông báo.
 */
export function LocalizationNotice({ localization, tone = 'surface' }: { localization: Localization | null | undefined; tone?: 'surface' | 'image' }) {
  const { t } = useI18n();
  if (!localization || (!localization.isFallback && !localization.isMachineTranslated)) return null;
  const text = localization.isFallback
    ? t.language.fallbackPage(t.language.names[localization.requestedLanguage])
    : t.language.machineHint;
  return (
    <p
      role="note"
      data-localization={localization.isFallback ? 'fallback' : 'machine'}
      className={
        tone === 'image'
          ? 'flex items-start gap-2 type-label text-on-image-variant'
          : 'flex items-start gap-2 rounded-sm bg-surface-container-low px-4 py-3 type-body-s text-on-surface-variant'
      }
    >
      <Icon name={localization.isFallback ? 'info' : 'languages'} size={16} className="mt-[3px] shrink-0" />
      <span>{text}</span>
    </p>
  );
}
