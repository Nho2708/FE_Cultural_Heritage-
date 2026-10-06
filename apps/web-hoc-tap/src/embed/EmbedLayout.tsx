import { parseLanguage } from '@dsvhvn/dung-chung/i18n';
import { EMBED_PARAM } from '@dsvhvn/dung-chung/embed';
import { useMemo } from 'react';
import { Outlet, useSearchParams } from 'react-router';
import { I18nContext, type I18nContextValue } from '../i18n/context';
import { STRINGS } from '../i18n/strings';

// Khung của trang nhúng cho app mobile: không có thanh điều hướng, chân trang hay đăng nhập, kín cả khung WebView. Ngôn ngữ lấy từ tham số `lang`
// của địa chỉ (app truyền ngôn ngữ khách đã chọn), không dùng lựa chọn đã nhớ của trình duyệt.

export function EmbedLayout() {
  const [params] = useSearchParams();
  const language = parseLanguage(params.get(EMBED_PARAM.language)) ?? 'vi';
  const value = useMemo<I18nContextValue>(() => ({ language, t: STRINGS[language], canChoose: false, setLanguage: () => undefined }), [language]);

  return (
    <I18nContext.Provider value={value}>
      <div lang={language} className="h-dvh w-full overflow-hidden bg-background text-on-background">
        <Outlet />
      </div>
    </I18nContext.Provider>
  );
}
