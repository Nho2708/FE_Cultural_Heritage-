import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { en } from './strings/en';
import { studentVi } from './strings/hocsinh';
import { ja } from './strings/ja';
import { ko } from './strings/ko';
import { vi } from './strings/vi';
import { zhHans } from './strings/zh-Hans';

// Chữ giao diện bằng `react-i18next`. Phần công khai có đủ năm ngôn ngữ; khu học của học sinh (`hs.*`) chỉ có tiếng Việt và các ngôn
// ngữ khác tự lùi về tiếng Việt, đúng quy định "khu học chỉ tiếng Việt".

export const resources = {
  vi: { translation: { ...vi, hs: studentVi } },
  en: { translation: en },
  ko: { translation: ko },
  'zh-Hans': { translation: zhHans },
  ja: { translation: ja },
} as const;

export function createI18n(language: LanguageCode) {
  const instance = i18next.createInstance();
  void instance.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'vi',
    interpolation: { escapeValue: false },
    initAsync: false,
  });
  return instance;
}

export const i18n = createI18n('vi');
