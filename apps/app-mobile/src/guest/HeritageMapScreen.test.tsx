import type { EmbedCommand, EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { HeritageMapScreen } from './HeritageMapScreen';

// Bản đồ trong app: sau khi trang nhúng báo sẵn sàng, đổi bộ lọc đi bằng lệnh (không tải lại trang); ghim mở chi tiết hoặc dòng thời gian; khách có nút "Gần bạn", học sinh thì không.

const mockPush = jest.fn();
const mockSent: EmbedCommand[] = [];
let mockMode: 'guest' | 'student' = 'guest';
let mockEmit: (message: EmbedMessage) => void = () => undefined;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({ useApp: () => ({ language: 'vi', mode: mockMode }) }));
jest.mock('../config/env', () => ({ WEB_BASE_URL: 'http://web.test' }));
jest.mock('../embed/EmbedWebView', () => {
  const React = jest.requireActual('react');
  return {
    EmbedWebView: ({ ref, onMessage }: { ref?: { current: unknown }; onMessage?: (message: EmbedMessage) => void }) => {
      React.useImperativeHandle(ref, () => ({ send: (command: EmbedCommand) => mockSent.push(command) }), []);
      mockEmit = (message) => onMessage?.(message);
      return null;
    },
  };
});
jest.mock('./MapNearby', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return { MapNearby: () => React.createElement(Text, null, 'NUT-GAN-BAN') };
});
jest.mock('./ExtraFilters', () => {
  const React = jest.requireActual('react');
  const { Pressable, Text } = jest.requireActual('react-native');
  return {
    ExtraFilters: ({ onLevel }: { onLevel: (level: string) => void }) => React.createElement(Pressable, { accessibilityLabel: 'chon-unesco', onPress: () => onLevel('UNESCO') }, React.createElement(Text, null, 'BO-LOC-THEM')),
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(select?: string) {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={themeForLevel(null)}>
          <HeritageMapScreen select={select} />
        </ThemeContext.Provider>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const press = async (label: string) => {
    const found = tree.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label || node.findAll((child) => (child.type as unknown) === 'Text' && [child.props.children].flat().join('') === label).length > 0),
    );
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => {
      found[0]!.props.onPress();
    });
  };
  const emit = async (message: EmbedMessage) => {
    await act(async () => {
      mockEmit(message);
    });
  };
  return { has, press, emit };
}

beforeEach(() => {
  mockPush.mockClear();
  mockSent.length = 0;
  mockMode = 'guest';
});

describe('HeritageMapScreen', () => {
  it('sends filters to the embedded page only after it is ready, without reloading it', async () => {
    const screen = await render();
    await screen.press('Vật thể');
    expect(mockSent.filter((command) => command.type === 'set-filter')).toHaveLength(0);

    await screen.emit({ type: 'ready', version: 1 });
    expect(mockSent.at(-1)).toEqual({ type: 'set-filter', version: 1, filter: { heritageType: 'TANGIBLE' } });

    await screen.press('Trung');
    expect(mockSent.at(-1)).toEqual({ type: 'set-filter', version: 1, filter: { heritageType: 'TANGIBLE', region: 'Trung' } });
  });

  it('sends the filters of the more-filters panel and clears everything with All', async () => {
    const screen = await render();
    await screen.emit({ type: 'ready', version: 1 });
    await screen.press('Thêm bộ lọc');
    expect(screen.has('BO-LOC-THEM')).toBe(true);
    await screen.press('chon-unesco');
    expect(mockSent.at(-1)).toEqual({ type: 'set-filter', version: 1, filter: { recognitionLevel: 'UNESCO' } });
    expect(screen.has('Thêm bộ lọc (1)')).toBe(true);

    await screen.press('Tất cả');
    expect(mockSent.at(-1)).toEqual({ type: 'set-filter', version: 1, filter: {} });
  });

  it('highlights the requested pin once the page is ready', async () => {
    const screen = await render('co-do-hue');
    await screen.emit({ type: 'ready', version: 1 });
    expect(mockSent).toContainEqual({ type: 'focus', version: 1, slug: 'co-do-hue' });
  });

  it('opens the detail, the timeline or the directions of the pin the visitor picked', async () => {
    const screen = await render();
    await screen.emit({ type: 'pin-selected', version: 1, slug: 'hoang-thanh' });
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/di-san/[slug]', params: { slug: 'hoang-thanh' } });
    await screen.emit({ type: 'timeline-selected', version: 1, slug: 'hoang-thanh' });
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/di-san/[slug]/dong-thoi-gian', params: { slug: 'hoang-thanh' } });
    await screen.emit({ type: 'directions-selected', version: 1, slug: 'hoang-thanh' });
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/di-san/[slug]/chi-duong', params: { slug: 'hoang-thanh' } });
  });

  it('offers Near you to a visitor but not to a student', async () => {
    expect((await render()).has('NUT-GAN-BAN')).toBe(true);
    mockMode = 'student';
    expect((await render()).has('NUT-GAN-BAN')).toBe(false);
  });
});
