import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import type { PrivacyOptionsState } from '../ads/consent';
import { createI18n } from '../i18n';
import { AdChoices } from './AdChoices';

// Cài đặt của khách: nút mở lại lựa chọn quảng cáo của Google chỉ hiện khi vùng của khách yêu cầu; nơi khác thì có lời giải thích.

let mockState: PrivacyOptionsState = 'required';
const mockShow = jest.fn(async () => true);

jest.mock('../ads/rewarded', () => ({
  privacyOptionsState: async () => mockState,
  showPrivacyOptions: () => mockShow(),
}));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function render(language: 'vi' | 'en' = 'vi') {
  const i18n = createI18n(language);
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <AdChoices />
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  const has = (text: string) => texts().some((item) => item.includes(text));
  const button = (label: string): ReactTestInstance | undefined => tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label)[0];
  return { has, button };
}

beforeEach(() => {
  mockShow.mockClear();
  mockState = 'required';
});

describe('AdChoices', () => {
  it('shows the button when the region requires the choice and reopens the Google form on press', async () => {
    const screen = await render();
    const button = screen.button('Mở lại lựa chọn quảng cáo cá nhân hóa');
    expect(button).toBeDefined();
    await act(async () => {
      button!.props.onPress();
    });
    expect(mockShow).toHaveBeenCalledTimes(1);
  });

  it('shows the button in the language the visitor chose', async () => {
    const screen = await render('en');
    expect(screen.button('Review personalized ad choices')).toBeDefined();
  });

  it('explains instead of showing a button when consent is not required in the region', async () => {
    mockState = 'not-required';
    const screen = await render();
    expect(screen.button('Mở lại lựa chọn quảng cáo cá nhân hóa')).toBeUndefined();
    expect(screen.has('không cần hộp đồng ý quảng cáo')).toBe(true);
  });

  it('explains when the build has no ads module', async () => {
    mockState = 'unavailable';
    const screen = await render();
    expect(screen.button('Mở lại lựa chọn quảng cáo cá nhân hóa')).toBeUndefined();
    expect(screen.has('chưa có quảng cáo của Google')).toBe(true);
  });

  it('offers a retry when Google cannot be reached', async () => {
    mockState = 'failed';
    const screen = await render();
    expect(screen.has('Không kiểm tra được lựa chọn quảng cáo')).toBe(true);
    expect(screen.button('Thử lại')).toBeDefined();
  });
});
