import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { en } from './en';
import { ja } from './ja';
import { ko } from './ko';
import type { PrivacyPolicy } from './types';
import { vi } from './vi';
import { zhHans } from './zh-Hans';

export type { PrivacyBlock, PrivacyPolicy, PrivacySection } from './types';

/** Ngày cập nhật chính sách (giờ UTC); đổi nội dung bản tiếng Việt thì đổi ngày này. */
export const PRIVACY_UPDATED_ON = '2026-10-24';

export const PRIVACY_POLICIES: Record<LanguageCode, PrivacyPolicy> = { vi, en, ko, 'zh-Hans': zhHans, ja };
