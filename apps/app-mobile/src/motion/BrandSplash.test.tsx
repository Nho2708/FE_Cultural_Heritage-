import { AccessibilityInfo, Image } from 'react-native';
import { act, create } from 'react-test-renderer';
import { BrandSplash } from './BrandSplash';

// Màn hình chờ trong app: không có thời gian chờ giả (nạp xong thì phần ra chạy ngay và gỡ sau 300 ms), và bật giảm chuyển động thì biểu tượng đứng yên
// và gỡ ngay khi nạp xong.

jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(async () => true), hideAsync: jest.fn(async () => true), setOptions: jest.fn() }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<ReturnType<typeof create>> = [];

async function render(ready: boolean, onDone: () => void) {
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(<BrandSplash ready={ready} onDone={onDone} />);
  });
  mounted.push(tree);
  return tree;
}

describe('BrandSplash', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(async () => {
    await act(async () => {
      mounted.splice(0).forEach((tree) => tree.unmount());
    });
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('shows the four logo layers and the name while loading and does not finish by itself', async () => {
    const onDone = jest.fn();
    const tree = await render(false, onDone);
    expect(tree.root.findAllByType(Image)).toHaveLength(4);
    expect(tree.root.findAll((node) => node.props.children === 'DiViet').length).toBeGreaterThan(0);
    await act(async () => {
      jest.advanceTimersByTime(10_000);
    });
    expect(onDone).not.toHaveBeenCalled();
  });

  it('fades out within 300 ms once loading is finished, without waiting for the entrance to end', async () => {
    const onDone = jest.fn();
    const tree = await render(false, onDone);
    await act(async () => {
      jest.advanceTimersByTime(100);
    });
    await act(async () => {
      tree.update(<BrandSplash ready onDone={onDone} />);
    });
    await act(async () => {
      jest.advanceTimersByTime(400);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('keeps the logo still and finishes at once when reduce motion is on', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onDone = jest.fn();
    const tree = await render(false, onDone);
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      tree.update(<BrandSplash ready onDone={onDone} />);
    });
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
