import { resources } from '../i18n';
import { GUEST_TABS, STUDENT_TABS } from './tabs';

const { existsSync } = jest.requireActual<{ existsSync: (path: string) => boolean }>('fs');
const { join } = jest.requireActual<{ join: (...parts: string[]) => string }>('path');
// Jest chạy với thư mục gốc của app nên `app` nằm ngay dưới thư mục làm việc.
const appDir = join(process.cwd(), 'app');

function lookup(tree: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), tree);
}

describe('bottom tabs', () => {
  it('gives a student five tabs with Explore between Enter code and Progress', () => {
    expect(STUDENT_TABS.map((tab) => tab.name)).toEqual(['hoc', 'nhap-ma', 'kham-pha', 'tien-do', 'cua-em']);
  });

  it.each([
    ['(hoc-sinh)', STUDENT_TABS],
    ['(khach)', GUEST_TABS],
  ] as const)('has a screen file and a Vietnamese title for every tab of %s', (group, tabs) => {
    for (const tab of tabs) {
      expect(existsSync(join(appDir, group, `${tab.name}.tsx`))).toBe(true);
      expect(typeof lookup(resources.vi.translation, tab.title)).toBe('string');
    }
  });

  it('has a title in every language for the visitor tabs', () => {
    for (const language of ['en', 'ko', 'zh-Hans', 'ja'] as const) {
      for (const tab of GUEST_TABS) expect(typeof lookup(resources[language].translation, tab.title)).toBe('string');
    }
  });
});
