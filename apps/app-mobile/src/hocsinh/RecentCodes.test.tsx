import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { RecentCodes } from './RecentCodes';

// Màn hình Nhập mã của em: các mã đã mở gần đây hiện dưới ô nhập, chạm một mã thì mở lại bài; chưa mở bài nào thì không hiện gì.

const mockPush = jest.fn();
let mockSaved: string | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  // Chạy hàm của màn hình mỗi khi hiện ra, như điều hướng thật làm khi màn hình được chọn.
  useFocusEffect: (effect: () => void | (() => void)) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({ useAuth: () => ({ session: { user: { id: 7 } } }) }));
jest.mock('../storage/keyValue', () => ({
  KEYS: { recentLessons: 'dsvhvn.app.ma-gan-day' },
  prefs: { get: async () => mockSaved },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render() {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={themeForLevel(2)}>
          <RecentCodes />
        </ThemeContext.Provider>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const row = (label: string) => tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label)[0];
  return { has, row };
}

beforeEach(() => {
  mockPush.mockClear();
  mockSaved = null;
});

describe('RecentCodes', () => {
  it('shows nothing before the student has opened any lesson', async () => {
    const screen = await render();
    expect(screen.has('Mã em đã mở gần đây')).toBe(false);
  });

  it('lists the recent codes and reopens a lesson when one is tapped', async () => {
    mockSaved = JSON.stringify([
      { code: 'BH12345A', title: 'Hoàng thành Thăng Long', openedAt: '2026-10-10T03:00:00Z' },
      { code: 'BH99999Z', title: 'Phố cổ Hội An', openedAt: '2026-10-09T03:00:00Z' },
    ]);
    const screen = await render();
    expect(screen.has('Mã em đã mở gần đây trên máy này')).toBe(true);
    expect(screen.has('Hoàng thành Thăng Long')).toBe(true);
    expect(screen.has('Mở lần cuối 10/10/2026')).toBe(true);
    await act(async () => {
      screen.row('BH99999Z Phố cổ Hội An')!.props.onPress();
    });
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/bai-hoc/[ma]', params: { ma: 'BH99999Z' } });
  });
});
