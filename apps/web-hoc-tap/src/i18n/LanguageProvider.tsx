import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth/context';
import { I18nContext, type I18nContextValue } from './context';
import { initialLanguage, storeLanguage } from './languages';
import { STRINGS } from './strings';

/**
 * Ngôn ngữ của phần công khai. Khách chọn một trong năm ngôn ngữ (mặc định theo trình duyệt nếu thuộc năm ngôn ngữ, không thì tiếng
 * Anh; nhớ trên máy). Học sinh đã đăng nhập luôn dùng tiếng Việt và không đổi được, lựa chọn đã nhớ của khách không bị ghi đè.
 * Đặt `lang` của trang để trình đọc màn hình và trình duyệt chọn đúng phông chữ.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [chosen, setChosen] = useState<LanguageCode>(initialLanguage);
  const canChoose = user === null;
  const language: LanguageCode = canChoose ? chosen : 'vi';

  const setLanguage = useCallback((next: LanguageCode) => {
    setChosen(next);
    storeLanguage(next);
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo<I18nContextValue>(() => ({ language, t: STRINGS[language], canChoose, setLanguage }), [language, canChoose, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
