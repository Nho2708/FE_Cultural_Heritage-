import { LANGUAGES } from '@dsvhvn/dung-chung/i18n';
import { createI18n, resources } from './index';
import { en } from './strings/en';
import { ja } from './strings/ja';
import { ko } from './strings/ko';
import { vi } from './strings/vi';
import { zhHans } from './strings/zh-Hans';

// Năm ngôn ngữ của phần công khai phải đủ đúng các khóa như tiếng Việt, chỗ chèn giá trị phải khớp, và không bản nào để trống.

function flatten(value: unknown, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  if (!value || typeof value !== 'object') return {};
  return Object.entries(value).reduce<Record<string, string>>((all, [key, child]) => ({ ...all, ...flatten(child, prefix ? `${prefix}.${key}` : key) }), {});
}

const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map((match) => match[1]!).sort();

const BY_LANGUAGE = { vi, en, ko, 'zh-Hans': zhHans, ja } as const;

describe('chữ giao diện năm ngôn ngữ', () => {
  const source = flatten(vi);

  it.each(Object.entries(BY_LANGUAGE))('%s đủ khóa, không để trống và chèn đúng giá trị', (_code, strings) => {
    const flat = flatten(strings);
    expect(Object.keys(flat).sort()).toEqual(Object.keys(source).sort());
    const empty = Object.entries(flat).filter(([, text]) => text.trim() === '').map(([key]) => key);
    const mismatched = Object.entries(flat).filter(([key, text]) => placeholders(text).join() !== placeholders(source[key]!).join()).map(([key]) => key);
    expect(empty).toEqual([]);
    expect(mismatched).toEqual([]);
  });

  it('danh mục ngôn ngữ khớp với bộ chữ có trong app', () => {
    expect(LANGUAGES.map((option) => option.code).sort()).toEqual(Object.keys(resources).sort());
  });

  it('chèn giá trị và lùi về tiếng Việt cho khu học của học sinh', async () => {
    const instance = createI18n('en');
    expect(instance.t('common.sites', { count: 3 })).toBe('3 sites');
    await instance.changeLanguage('ko');
    expect(instance.t('tabs.search')).toBe('검색');
  });
});
