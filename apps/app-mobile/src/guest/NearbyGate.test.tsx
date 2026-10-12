import { I18nextProvider } from 'react-i18next';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { NearbyGate } from './NearbyGate';
import type { useNearby } from './useNearby';

// "Gần bạn": quyền vị trí chỉ được hỏi khi khách bấm nút cho phép; bị từ chối thì báo nhẹ nhàng, ngoài Việt Nam thì báo riêng, có danh sách thì hiện danh sách.

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Nearby = ReturnType<typeof useNearby>;

function nearbyOf(overrides: Partial<Nearby>): Nearby {
  return { status: 'off', items: [], position: null, locate: jest.fn(), outsideVietnam: false, isLoading: false, ...overrides };
}

async function render(nearby: Nearby) {
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <NearbyGate nearby={nearby}>
          <Text>DANH-SACH</Text>
        </NearbyGate>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const allowButton = () => tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === 'Cho phép vị trí')[0];
  return { has, allowButton };
}

describe('NearbyGate', () => {
  it('explains and waits for the visitor to press the button before asking for the location', async () => {
    const nearby = nearbyOf({ status: 'off' });
    const screen = await render(nearby);
    expect(screen.has('Cho phép dùng vị trí')).toBe(true);
    expect(nearby.locate).not.toHaveBeenCalled();
    await act(async () => {
      screen.allowButton()!.props.onPress();
    });
    expect(nearby.locate).toHaveBeenCalledTimes(1);
  });

  it('tells a visitor who denied the permission how to turn it back on, and still offers to try again', async () => {
    const screen = await render(nearbyOf({ status: 'denied' }));
    expect(screen.has('Bạn chưa cho phép dùng vị trí')).toBe(true);
    expect(screen.allowButton()).toBeDefined();
  });

  it('says so when the visitor is outside Viet Nam', async () => {
    const screen = await render(nearbyOf({ status: 'ready', outsideVietnam: true }));
    expect(screen.has('ngoài Việt Nam')).toBe(true);
    expect(screen.has('DANH-SACH')).toBe(false);
  });

  it('says so when no heritage with a location is nearby', async () => {
    const screen = await render(nearbyOf({ status: 'ready' }));
    expect(screen.has('Chưa tìm thấy di sản')).toBe(true);
  });

  it('shows the list once there are nearby heritage sites', async () => {
    const items = [{ item: { slug: 'a' }, meters: 120 }] as unknown as Nearby['items'];
    const screen = await render(nearbyOf({ status: 'ready', items }));
    expect(screen.has('DANH-SACH')).toBe(true);
  });
});
