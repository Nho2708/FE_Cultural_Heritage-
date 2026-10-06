import type { LanguageCode } from '@dsvhvn/dung-chung/api';
import { en } from './en';
import { ja } from './ja';
import { ko } from './ko';
import { vi, type Strings } from './vi';
import { zhHans } from './zh-Hans';

export type { Strings };

/** Chữ giao diện của năm ngôn ngữ; mỗi tệp phải đủ khóa như tiếng Việt (kiểm bằng kiểu `Strings`). */
export const STRINGS: Record<LanguageCode, Strings> = { vi, en, ko, 'zh-Hans': zhHans, ja };
