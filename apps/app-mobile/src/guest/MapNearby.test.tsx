import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { MapNearby } from './MapNearby';

// Nút "Gần bạn" nổi trên bản đồ: có mã riêng để kiểm thử giao diện chạm đúng nút (chấm vị trí trong trang nhúng cũng mang tên "Gần bạn"), nằm góc dưới bên trái
// để không che nút phóng to, thu nhỏ của bản đồ; bấm thì mới định vị và mở bảng di sản gần nhất kèm khoảng cách.

const mockLocate = jest.fn();
const mockPush = jest.fn();
let mockNearby = { status: 'ready' as const, items: [] as Array<{ item: { slug: string; name: string; provinceName: string | null }; meters: number }>, position: null, locate: mockLocate, outsideVietnam: false, isLoading: false };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../state/AppProvider', () => ({ useApp: () => ({ language: 'vi' }) }));
jest.mock('./useNearby', () => ({ useNearby: () => mockNearby }));
jest.mock('./queries', () => ({ useMapPins: () => ({ data: { pins: [{ slug: 'thanh-nha-ho' }] } }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render() {
  const onFocus = jest.fn();
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={createI18n('vi')}>
        <ThemeContext.Provider value={themeForLevel(null)}>
          <MapNearby filter={{}} onPosition={() => undefined} onFocus={onFocus} />
        </ThemeContext.Provider>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const byTestId = (id: string) => tree.root.findAll((node: ReactTestInstance) => node.props.testID === id && typeof node.props.onPress === 'function')[0];
  const press = async (node: ReactTestInstance | undefined) => {
    if (!node) throw new Error('Không thấy nút');
    await act(async () => {
      node.props.onPress();
    });
  };
  return { tree, texts, byTestId, press, onFocus };
}

beforeEach(() => {
  mockLocate.mockClear();
  mockPush.mockClear();
  mockNearby = { ...mockNearby, items: [{ item: { slug: 'thanh-nha-ho', name: 'Thành nhà Hồ', provinceName: 'Tỉnh Thanh Hóa' }, meters: 1500 }] };
});

describe('MapNearby', () => {
  it('has a test id on the floating button and keeps it at the bottom-left, away from the zoom controls', async () => {
    const screen = await render();
    const button = screen.byTestId('nut-gan-ban-tren-ban-do');
    expect(button).toBeDefined();
    const overlay = screen.tree.root.findAll((node) => node.props.pointerEvents === 'box-none')[0]!;
    const style = Object.assign({}, ...[overlay.props.style].flat(3));
    expect(style.alignItems).toBe('flex-start');
  });

  it('locates only when the visitor taps the button, then lists the nearest sites with their distance', async () => {
    const screen = await render();
    expect(mockLocate).not.toHaveBeenCalled();
    expect(screen.texts().some((text) => text.includes('1,5 km'))).toBe(false);

    await screen.press(screen.byTestId('nut-gan-ban-tren-ban-do'));
    expect(mockLocate).toHaveBeenCalledTimes(1);
    expect(screen.texts()).toContain('Tỉnh Thanh Hóa · 1,5 km');
  });

  it('highlights a listed site that is on the map instead of leaving the map', async () => {
    const screen = await render();
    await screen.press(screen.byTestId('nut-gan-ban-tren-ban-do'));
    const row = screen.tree.root.findAll((node: ReactTestInstance) => node.props.accessibilityLabel === 'Thành nhà Hồ' && typeof node.props.onPress === 'function')[0];
    await screen.press(row);
    expect(screen.onFocus).toHaveBeenCalledWith('thanh-nha-ho');
    expect(mockPush).not.toHaveBeenCalled();
  });
});
