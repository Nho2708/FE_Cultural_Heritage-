import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { createContext, useContext } from 'react';
import type { Strings } from './strings';

export interface I18nContextValue {
  /** Ngôn ngữ đang dùng: lựa chọn của khách; học sinh đã đăng nhập luôn là tiếng Việt. */
  language: LanguageCode;
  /** Chữ giao diện của ngôn ngữ đang dùng. */
  t: Strings;
  /** Khách chọn được ngôn ngữ; học sinh đã đăng nhập thì không (không có mục Ngôn ngữ). */
  canChoose: boolean;
  /** Đổi ngôn ngữ và nhớ lựa chọn trên máy này. */
  setLanguage: (language: LanguageCode) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n phải nằm trong <LanguageProvider>.');
  return value;
}

/** Chữ giao diện của ngôn ngữ đang dùng. */
export function useT(): Strings {
  return useI18n().t;
}

/** Ngôn ngữ nội dung đang dùng (gửi lên máy chủ làm `lang`). */
export function useLanguage(): LanguageCode {
  return useI18n().language;
}
