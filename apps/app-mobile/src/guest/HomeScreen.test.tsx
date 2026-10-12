import type { DiscoveryHome } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { TextInput } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { HomeScreen } from './HomeScreen';

// Trang chủ phần công khai cho hai đối tượng: khách thấy thêm "Gợi ý cho bạn" và "Gần bạn" và ghi từ khóa vào lịch sử; học sinh (tab Khám phá) chỉ thấy phần chung và không ghi gì vào lịch sử.
// Cả hai đều có lối vào bản đồ và dòng thời gian, mở đúng màn hình của chế độ mình.

const mockPush = jest.fn();
const mockHistoryAdd = jest.fn();

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({ useApp: () => ({ language: 'vi' }) }));
jest.mock('./HistoryProvider', () => ({ useHistory: () => ({ entries: [], add: mockHistoryAdd }) }));
jest.mock('./GuestSections', () => {
  const React = jest.requireActual('react');
  const { Text } = jest.requireActual('react-native');
  return {
    RecommendedSection: () => React.createElement(Text, null, 'KHU-GOI-Y'),
    NearbySection: () => React.createElement(Text, null, 'KHU-GAN-BAN'),
  };
});

const mockHome: DiscoveryHome = { featured: [], totalHeritages: 12, byType: [], byRegion: [] };
jest.mock('./queries', () => ({ useHome: () => ({ isLoading: false, isError: false, isRefetching: false, refetch: jest.fn(), data: mockHome }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(audience: 'guest' | 'student') {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={themeForLevel(null)}>
          <HomeScreen audience={audience} />
        </ThemeContext.Provider>
      </I18nextProvider>,
    );
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
  const search = async (text: string) => {
    const input = tree.root.findByType(TextInput);
    await act(async () => {
      input.props.onChangeText(text);
    });
    await act(async () => {
      tree.root.findByType(TextInput).props.onSubmitEditing();
    });
  };
  return { has, press, search };
}

beforeEach(() => {
  mockPush.mockClear();
  mockHistoryAdd.mockClear();
});

describe('HomeScreen', () => {
  it('shows a visitor the personal sections and opens the visitor tabs', async () => {
    const screen = await render('guest');
    expect(screen.has('KHU-GOI-Y')).toBe(true);
    expect(screen.has('KHU-GAN-BAN')).toBe(true);
    await screen.press('Bản đồ di sản');
    expect(mockPush).toHaveBeenLastCalledWith('/(khach)/ban-do');
    await screen.press('Dòng thời gian');
    expect(mockPush).toHaveBeenLastCalledWith('/(khach)/dong-thoi-gian');
  });

  it('records a visitor search in the history', async () => {
    const screen = await render('guest');
    await screen.search('chùa');
    expect(mockHistoryAdd).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/(khach)/tim-kiem', params: { q: 'chùa' } });
  });

  it('shows a student only the shared part, opens the stand-alone screens and never records history', async () => {
    const screen = await render('student');
    expect(screen.has('KHU-GOI-Y')).toBe(false);
    expect(screen.has('KHU-GAN-BAN')).toBe(false);
    await screen.press('Bản đồ di sản');
    expect(mockPush).toHaveBeenLastCalledWith('/ban-do-di-san');
    await screen.press('Dòng thời gian');
    expect(mockPush).toHaveBeenLastCalledWith('/dong-thoi-gian-di-san');
    await screen.search('chùa');
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: '/tim-kiem-di-san', params: { q: 'chùa' } });
    expect(mockHistoryAdd).not.toHaveBeenCalled();
  });
});
