import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import IntroVideoPage from '../../app/video-gioi-thieu';
import { createI18n } from '../i18n';

// Màn hình xem video giới thiệu: mở trang nhúng video của web học tập theo ngôn ngữ của app; trang tải lỗi (mất mạng) thì báo cần kết nối mạng,
// có nút thử lại (dựng lại trang) và nút quay lại.

const mockBack = jest.fn();
let mockLanguage = 'en';
let mockLoads: Array<{ url: string; fail: () => void }> = [];

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('../state/AppProvider', () => ({ useApp: () => ({ language: mockLanguage, mode: 'guest' }) }));
jest.mock('../config/env', () => ({ WEB_BASE_URL: 'http://web.test' }));
jest.mock('../embed/EmbedWebView', () => {
  const React = jest.requireActual('react');
  return {
    EmbedWebView: ({ url, onFail }: { url: string; onFail: () => void }) => {
      // Mỗi lần dựng WebView mới ghi một lần tải.
      React.useEffect(() => {
        mockLoads.push({ url, fail: onFail });
      }, [url, onFail]);
      return null;
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<ReturnType<typeof create>> = [];
afterEach(async () => {
  await act(async () => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
});
beforeEach(() => {
  jest.clearAllMocks();
  mockLoads = [];
});

async function render(language: 'vi' | 'en' | 'ko' | 'zh-Hans' | 'ja') {
  mockLanguage = language;
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={createI18n(language)}>
        <IntroVideoPage />
      </I18nextProvider>,
    );
  });
  mounted.push(tree);
  const press = async (label: string) => {
    const found = tree.root.findAll((node: ReactTestInstance) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => {
      found[0]!.props.onPress();
    });
  };
  const texts = () => tree.root.findAll((node) => typeof node.props.children === 'string').map((node) => node.props.children as string);
  return { press, texts };
}

describe('video giới thiệu', () => {
  it.each(['vi', 'en', 'ko', 'zh-Hans', 'ja'] as const)('mở trang nhúng video theo ngôn ngữ %s của app', async (language) => {
    await render(language);
    expect(mockLoads.map((load) => load.url)).toEqual([`http://web.test/nhung/video-gioi-thieu?lang=${encodeURIComponent(language)}`]);
  });

  it('mất mạng thì báo cần kết nối mạng, thử lại dựng lại trang và quay lại được', async () => {
    const screen = await render('vi');
    await act(async () => {
      mockLoads[0]!.fail();
    });
    expect(screen.texts()).toContain('Cần kết nối mạng để xem video');

    await screen.press('Thử lại');
    expect(mockLoads).toHaveLength(2);
    expect(screen.texts()).not.toContain('Cần kết nối mạng để xem video');

    await act(async () => {
      mockLoads[1]!.fail();
    });
    await screen.press('Quay lại');
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('báo bằng ngôn ngữ của app', async () => {
    const screen = await render('ja');
    await act(async () => {
      mockLoads[0]!.fail();
    });
    expect(screen.texts()).toContain('動画を見るにはインターネット接続が必要です');
  });
});
