import { I18nextProvider } from 'react-i18next';
import { AccessibilityInfo } from 'react-native';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { IntroCards } from './IntroCards';

// Bốn thẻ giới thiệu: không tự chuyển, "Bỏ qua" ở mọi thẻ, "Tiếp" qua từng thẻ rồi "Bắt đầu", bước đọc được cho trình đọc màn hình, đúng ngôn ngữ đã chọn,
// và khi bật giảm chuyển động vẫn dùng được (chỉ mờ dần, không trượt).

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
  return { has, buttons, press, step };
}

describe('IntroCards', () => {
  afterEach(() => jest.restoreAllMocks());

  it('walks through the four cards with Next and finishes with Start', async () => {
    const onClose = jest.fn();
    const screen = await render('vi', onClose);
    expect(screen.has('Khám phá di sản gần bạn')).toBe(true);
    expect(screen.step()).toBe('Bước 1 trên 4');
    await screen.press('Tiếp');
    expect(screen.has('Nghe thuyết minh bằng tiếng của bạn')).toBe(true);
    expect(screen.step()).toBe('Bước 2 trên 4');
    await screen.press('Tiếp');
    expect(screen.has('Xem 3D và dòng thời gian')).toBe(true);
    await screen.press('Tiếp');
    expect(screen.has('Học sinh học theo cấp bằng mã bài học')).toBe(true);
    expect(screen.step()).toBe('Bước 4 trên 4');
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
      expect(screen.has('Khám phá di sản gần bạn')).toBe(true);
      for (let card = 0; card < 4; card++) {
        expect(screen.buttons('Bỏ qua')).toHaveLength(1);
        if (card < 3) await screen.press('Tiếp');
      }
      await screen.press('Bỏ qua');
      expect(onClose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('shows the cards in each of the other four languages', async () => {
    const expected = {
      en: ['Skip', 'Discover heritage near you', 'Step 1 of 4'],
      ko: ['건너뛰기', '내 주변의 유산 찾기', '4단계 중 1단계'],
      'zh-Hans': ['跳过', '发现身边的遗产', '第 1 步，共 4 步'],
      ja: ['スキップ', 'あなたの近くの遺産を探す', 'ステップ 1 / 4'],
    } as const;
    for (const [language, [skip, title, step]] of Object.entries(expected)) {
      const screen = await render(language as keyof typeof expected);
      expect(screen.buttons(skip!)).toHaveLength(1);
      expect(screen.has(title!)).toBe(true);
      expect(screen.step()).toBe(step);
    }
  });

  it('still works when the system asks to reduce motion', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const onClose = jest.fn();
    const screen = await render('vi', onClose);
    expect(screen.has('Khám phá di sản gần bạn')).toBe(true);
    await screen.press('Tiếp');
    await screen.press('Tiếp');
    expect(screen.has('Xem 3D và dòng thời gian')).toBe(true);
    expect(screen.step()).toBe('Bước 3 trên 4');
    await screen.press('Bỏ qua');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
