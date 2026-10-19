import type { EmbedCommand, EmbedMessage } from '@dsvhvn/dung-chung/embed';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { I18nextProvider } from 'react-i18next';
import { Linking } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { DirectionsScreen } from './DirectionsScreen';

// Màn hình chỉ đường: xin vị trí ngay khi mở, gửi vị trí vào trang nhúng sau khi trang báo sẵn sàng (không tải lại trang); bị từ chối thì giải thích,
// vẫn mở được Google Maps (không có điểm xuất phát); trang không tải được thì báo kèm thử lại.

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockSent: EmbedCommand[] = [];
let mockEmit: (message: EmbedMessage) => void = () => undefined;
let mockEmbedFail: () => void = () => undefined;

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({ useApp: () => ({ language: 'vi', mode: 'guest' }) }));
jest.mock('../config/env', () => ({ WEB_BASE_URL: 'http://web.test' }));
jest.mock('./queries', () => ({
  useHeritageDetail: () => ({ isLoading: false, isError: false, data: { slug: 'co-do-hue', name: 'Cố đô Huế', latitude: 16.4694, longitude: 107.5778 }, refetch: jest.fn() }),
}));
jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3 },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));
jest.mock('../embed/EmbedWebView', () => {
  const React = jest.requireActual('react');
  return {
    EmbedWebView: ({ ref, onMessage, onFail, url }: { ref?: { current: unknown }; onMessage?: (message: EmbedMessage) => void; onFail: () => void; url: string }) => {
      const { Text } = jest.requireActual('react-native');
      React.useImperativeHandle(ref, () => ({ send: (command: EmbedCommand) => mockSent.push(command) }), []);
      mockEmit = (message) => onMessage?.(message);
      mockEmbedFail = onFail;
      return React.createElement(Text, null, `TRANG-NHUNG ${url}`);
    },
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const location = Location as jest.Mocked<typeof Location>;

function grant(position = { latitude: 21.0287, longitude: 105.8524 }) {
  location.getForegroundPermissionsAsync.mockResolvedValue({ granted: true } as never);
  location.getLastKnownPositionAsync.mockResolvedValue({ coords: position } as never);
}

function deny() {
  location.getForegroundPermissionsAsync.mockResolvedValue({ granted: false } as never);
  location.requestForegroundPermissionsAsync.mockResolvedValue({ granted: false } as never);
}

async function render() {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <I18nextProvider i18n={i18n}>
          <ThemeContext.Provider value={themeForLevel(null)}>
            <DirectionsScreen slug="co-do-hue" />
          </ThemeContext.Provider>
        </I18nextProvider>
      </QueryClientProvider>,
    );
  });
  // Lời xin vị trí trả về qua vài lượt promise: chờ chúng xong rồi mới đọc giao diện.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const press = async (label: string) => {
    const found = tree.root.findAll((node: ReactTestInstance) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
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
  const fail = async () => {
    await act(async () => {
      mockEmbedFail();
    });
  };
  return { has, press, emit, fail };
}

beforeEach(() => {
  mockPush.mockClear();
  mockBack.mockClear();
  mockSent.length = 0;
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
  jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined as never);
});

describe('DirectionsScreen', () => {
  it('opens the embedded directions page in the chosen language and sends the position only after the page is ready', async () => {
    grant();
    const screen = await render();
    expect(screen.has('TRANG-NHUNG http://web.test/nhung/chi-duong/co-do-hue?lang=vi')).toBe(true);
    expect(mockSent).toHaveLength(0);

    await screen.emit({ type: 'ready', version: 1 });
    expect(mockSent).toEqual([{ type: 'set-position', version: 1, position: { latitude: 21.0287, longitude: 105.8524 } }]);
    expect(screen.has('Vị trí chỉ dùng để tính đường và không được lưu.')).toBe(true);

    await screen.press('Mở trong Google Maps');
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=16.4694%2C107.5778&travelmode=driving&origin=21.0287%2C105.8524');
  });

  it('explains when location is denied, offers settings and Google Maps without an origin', async () => {
    deny();
    const screen = await render();
    expect(screen.has('Bạn chưa cho phép dùng vị trí')).toBe(true);
    await screen.emit({ type: 'ready', version: 1 });
    expect(mockSent).toHaveLength(0);

    await screen.press('Mở cài đặt');
    expect(Linking.openSettings).toHaveBeenCalled();
    await screen.press('Mở trong Google Maps');
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.google.com/maps/dir/?api=1&destination=16.4694%2C107.5778&travelmode=driving');

    // Thử lại sau khi khách cho phép ở cài đặt.
    grant();
    await screen.press('Thử lại');
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    expect(mockSent).toEqual([{ type: 'set-position', version: 1, position: { latitude: 21.0287, longitude: 105.8524 } }]);
  });

  it('falls back to a message with retry when the embedded page cannot load', async () => {
    grant();
    const screen = await render();
    await screen.fail();
    expect(screen.has('Không tải được phần chỉ đường')).toBe(true);
    expect(screen.has('TRANG-NHUNG')).toBe(false);
    await screen.press('Thử lại');
    expect(screen.has('TRANG-NHUNG')).toBe(true);
  });
});
