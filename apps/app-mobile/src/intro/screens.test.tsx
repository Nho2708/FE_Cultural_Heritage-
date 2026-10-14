import type { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import StudentAccount from '../../app/(hoc-sinh)/cua-em';
import GuestHistoryAndSettings from '../../app/(khach)/lich-su';
import ChooseMode from '../../app/chon-che-do';
import AppIntroduction from '../../app/gioi-thieu';
import { createI18n } from '../i18n';

// Các màn hình quanh thẻ giới thiệu: màn hình giới thiệu đánh dấu đã xem khi bỏ qua và đi tiếp đúng nơi (lần đầu về điểm vào, xem lại thì quay lại),
// "Lịch sử và cài đặt" (Khách) và "Của em" (Học sinh) có mục mở lại giới thiệu, và màn chọn chế độ vẫn chọn được ở cả hai thẻ.

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockMarkIntroSeen = jest.fn();
const mockChooseMode = jest.fn();
let mockMode: 'guest' | 'student' | null = null;

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush, back: mockBack, canGoBack: () => true }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));
jest.mock('../components/AdChoices', () => ({ AdChoices: () => null }));
jest.mock('../guest/HistoryProvider', () => ({ useHistory: () => ({ entries: [], remove: jest.fn(), clear: jest.fn() }) }));
jest.mock('../state/AppProvider', () => ({
  useApp: () => ({ language: 'vi', mode: mockMode, locationEnabled: false, setLocationEnabled: jest.fn(), markIntroSeen: mockMarkIntroSeen, chooseMode: mockChooseMode, signOut: jest.fn() }),
  useAuth: () => ({ session: { user: { studentCode: 'HS1', fullName: 'Em A', class: { name: '3A' }, schoolLevel: 'LEVEL_1', organization: { name: 'Trường A' } } } }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<ReturnType<typeof create>> = [];
afterEach(async () => {
  // Gỡ cây đã dựng để các chuyển động còn chạy dừng lại, không rò sang bài kiểm tra khác.
  await act(async () => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
});

async function render(element: ReactElement, language: 'vi' | 'en' = 'vi') {
  const i18n = createI18n(language);
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<I18nextProvider i18n={i18n}>{element}</I18nextProvider>);
  });
  mounted.push(tree);
  const buttons = (label: string): ReactTestInstance[] => tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
  const press = async (label: string) => {
    const found = buttons(label);
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => {
      found[0]!.props.onPress();
    });
  };
  return { buttons, press };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockMode = null;
});

describe('app introduction screen', () => {
  it('marks the introduction as seen when skipped on first launch and returns to the entry point', async () => {
    const screen = await render(<AppIntroduction />);
    await screen.press('Bỏ qua');
    expect(mockMarkIntroSeen).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('marks it as seen after the last card and goes on to the mode choice through the entry point', async () => {
    const screen = await render(<AppIntroduction />);
    await screen.press('Tiếp');
    await screen.press('Tiếp');
    await screen.press('Tiếp');
    await screen.press('Bắt đầu');
    expect(mockMarkIntroSeen).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('goes back to where it was opened from when replayed after a mode was chosen', async () => {
    mockMode = 'guest';
    const screen = await render(<AppIntroduction />);
    await screen.press('Bỏ qua');
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('replay entries', () => {
  it('lets a visitor open the introduction again from History and settings, in the visitor language', async () => {
    mockMode = 'guest';
    const screen = await render(<GuestHistoryAndSettings />, 'en');
    expect(screen.buttons('View again')).toHaveLength(1);
    await screen.press('View again');
    expect(mockPush).toHaveBeenCalledWith('/gioi-thieu');
  });

  it('lets a visitor open the intro video from History and settings, with its own label apart from the replay', async () => {
    mockMode = 'guest';
    const screen = await render(<GuestHistoryAndSettings />, 'en');
    expect(screen.buttons('Watch intro video')).toHaveLength(1);
    await screen.press('Watch intro video');
    expect(mockPush).toHaveBeenCalledWith('/video-gioi-thieu');
    expect(mockPush).not.toHaveBeenCalledWith('/gioi-thieu');
  });

  it('does not offer the intro video to students', async () => {
    mockMode = 'student';
    const screen = await render(<StudentAccount />);
    expect(screen.buttons('Xem video giới thiệu')).toHaveLength(0);
  });

  it('lets a student open the introduction again from the account tab, in Vietnamese', async () => {
    mockMode = 'student';
    const screen = await render(<StudentAccount />);
    expect(screen.buttons('Giới thiệu ứng dụng')).toHaveLength(1);
    await screen.press('Giới thiệu ứng dụng');
    expect(mockPush).toHaveBeenCalledWith('/gioi-thieu');
  });
});

describe('mode picker', () => {
  it('shows both mode cards and picks the mode that was pressed', async () => {
    const screen = await render(<ChooseMode />);
    expect(screen.buttons('Khách tham quan')).toHaveLength(1);
    expect(screen.buttons('Học sinh')).toHaveLength(1);
    await screen.press('Học sinh');
    expect(mockChooseMode).toHaveBeenCalledWith('student');
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
