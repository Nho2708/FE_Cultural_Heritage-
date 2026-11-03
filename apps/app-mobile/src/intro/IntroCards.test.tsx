import { I18nextProvider } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { IntroCards } from './IntroCards';

// Năm thẻ giới thiệu: thẻ chào mừng đứng đầu, không tự chuyển, "Bỏ qua" ở mọi thẻ, "Tiếp" qua từng thẻ rồi "Bắt đầu", bước đọc được cho trình đọc màn hình,
// đúng ngôn ngữ đã chọn, ảnh và biểu tượng ẩn khỏi trình đọc màn hình, và khi bật giảm chuyển động vẫn dùng được (chỉ mờ dần, không trượt).

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mounted: Array<ReturnType<typeof create>> = [];
afterEach(async () => {
  // Gỡ cây đã dựng để các chuyển động còn chạy dừng lại, không rò sang bài kiểm tra khác.
  await act(async () => {
    mounted.splice(0).forEach((tree) => tree.unmount());
  });
});

async function render(language: 'vi' | 'en' | 'ko' | 'zh-Hans' | 'ja' = 'vi', onClose: () => void = jest.fn()) {
  const i18n = createI18n(language);
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <IntroCards onClose={onClose} />
      </I18nextProvider>,
    );
  });
  mounted.push(tree);
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const buttons = (label: string): ReactTestInstance[] => tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label);
  const press = async (label: string) => {
    const found = buttons(label);
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => {
      found[0]!.props.onPress();
    });
  };
  const step = () =>
    tree.root.findAll((node) => typeof node.props.accessibilityLabel === 'string' && /^(Bước|Step) |단계|第 |ステップ/.test(node.props.accessibilityLabel))[0]?.props.accessibilityLabel as
      | string
      | undefined;
  // Mọi ảnh (biểu tượng, ảnh di sản) phải nằm trong khối ẩn khỏi trình đọc màn hình.
  const images = () => tree.root.findAll((node) => (node.type as unknown) === 'Image');
  const visibleImages = () =>
    images().filter((image) => {
      for (let node: ReactTestInstance | null = image; node; node = node.parent) {
        if (node.props.accessibilityElementsHidden === true && node.props.importantForAccessibility === 'no-hide-descendants') return false;
      }
      return true;
    });
  return { has, buttons, press, step, images, visibleImages };
}

describe('IntroCards', () => {
  afterEach(() => jest.restoreAllMocks());

  it('opens on the welcome card with the DiViet name and tagline, then walks through all five cards', async () => {
    const onClose = jest.fn();
    const screen = await render('vi', onClose);
    expect(screen.has('DiViet')).toBe(true);
    expect(screen.has('Khám phá di sản Việt Nam')).toBe(true);
    expect(screen.has('gói gọn trong một ứng dụng')).toBe(true);
    expect(screen.step()).toBe('Bước 1 trên 5');
    await screen.press('Tiếp');
    expect(screen.has('Khám phá di sản gần bạn')).toBe(true);
    expect(screen.step()).toBe('Bước 2 trên 5');
    await screen.press('Tiếp');
    expect(screen.has('Nghe thuyết minh bằng tiếng của bạn')).toBe(true);
    await screen.press('Tiếp');
    expect(screen.has('Xem 3D và dòng thời gian')).toBe(true);
    await screen.press('Tiếp');
    expect(screen.has('Học sinh học theo cấp bằng mã bài học')).toBe(true);
    expect(screen.step()).toBe('Bước 5 trên 5');
    expect(screen.buttons('Tiếp')).toHaveLength(0);
    expect(onClose).not.toHaveBeenCalled();
    await screen.press('Bắt đầu');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('offers Skip on every card and does not advance on its own', async () => {
    jest.useFakeTimers();
    try {
      const onClose = jest.fn();
      const screen = await render('vi', onClose);
      await act(async () => {
        jest.advanceTimersByTime(60_000);
      });
      expect(screen.step()).toBe('Bước 1 trên 5');
      for (let card = 0; card < 5; card++) {
        expect(screen.buttons('Bỏ qua')).toHaveLength(1);
        if (card < 4) await screen.press('Tiếp');
      }
      await screen.press('Bỏ qua');
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('hides the logo and the heritage photos from screen readers on every card', async () => {
    const screen = await render('vi');
    // Thẻ chào mừng: bốn lớp ảnh của biểu tượng.
    expect(screen.images()).toHaveLength(4);
    expect(screen.visibleImages()).toHaveLength(0);
    for (let card = 1; card < 5; card++) {
      await screen.press('Tiếp');
      expect(screen.images()).toHaveLength(1);
      expect(screen.visibleImages()).toHaveLength(0);
    }
  });

  it('shows the cards in each of the other four languages', async () => {
    const expected = {
      en: ['Skip', 'Next', 'Discover Vietnamese heritage', 'Step 1 of 5', 'Discover heritage near you'],
      ko: ['건너뛰기', '다음', '베트남의 유산을 만나다', '5단계 중 1단계', '내 주변의 유산 찾기'],
      'zh-Hans': ['跳过', '下一步', '探索越南遗产', '第 1 步，共 5 步', '发现身边的遗产'],
      ja: ['スキップ', '次へ', 'ベトナムの遺産をめぐる', 'ステップ 1 / 5', 'あなたの近くの遺産を探す'],
    } as const;
    for (const [language, [skip, next, tagline, step, title]] of Object.entries(expected)) {
      const screen = await render(language as keyof typeof expected);
      expect(screen.buttons(skip)).toHaveLength(1);
      expect(screen.has('DiViet')).toBe(true);
      expect(screen.has(tagline)).toBe(true);
      expect(screen.step()).toBe(step);
      await screen.press(next);
      expect(screen.has(title)).toBe(true);
    }
  });

  it('still works when the system asks to reduce motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onClose = jest.fn();
    const screen = await render('vi', onClose);
    expect(screen.has('DiViet')).toBe(true);
    await screen.press('Tiếp');
    await screen.press('Tiếp');
    await screen.press('Tiếp');
    expect(screen.has('Xem 3D và dòng thời gian')).toBe(true);
    expect(screen.step()).toBe('Bước 4 trên 5');
    await screen.press('Bỏ qua');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
