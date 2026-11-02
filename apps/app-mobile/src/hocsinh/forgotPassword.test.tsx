import { ApiError } from '@dsvhvn/dung-chung/api';
import { act, type ReactTestInstance } from 'react-test-renderer';
import StudentLogin from '../../app/dang-nhap';
import { renderLevelOne } from './levelOne/testKit';

// Quên mật khẩu của học sinh trên app: gửi mã học sinh, luôn nhận cùng một câu chung (không hiện tên em hay tên thầy cô), gửi quá nhiều lần thì hiện câu của máy chủ.

const mockForgotPassword = jest.fn();
jest.mock('expo-router', () => ({ Redirect: () => null, useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({
  useApp: () => ({
    mode: 'student',
    chooseMode: jest.fn(),
    services: { studentApi: { forgotPassword: mockForgotPassword, login: jest.fn() }, sessionStore: { clearNotice: jest.fn(), setSession: jest.fn() } },
  }),
  useAuth: () => ({ session: null, notice: null }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SENT = 'Nếu mã học sinh đúng, thầy cô chủ nhiệm của em sẽ nhận được thông báo để đặt lại mật khẩu.';

async function typeCode(view: Awaited<ReturnType<typeof renderLevelOne>>, value: string) {
  const input = view.tree.root.findAll((node: ReactTestInstance) => typeof node.props.onChangeText === 'function' && node.props.accessibilityLabel === 'Mã học sinh')[0]!;
  await act(async () => input.props.onChangeText(value));
}

beforeEach(() => mockForgotPassword.mockReset());

describe('quên mật khẩu của học sinh trên app', () => {
  it('gửi mã: luôn hiện câu chung, không hiện tên em hay tên thầy cô trong phản hồi', async () => {
    mockForgotPassword.mockResolvedValue({ data: { studentName: 'Vũ Thảo My', teacherName: 'Trần Thị Minh Anh' }, message: 'Thông điệp của máy chủ không được dùng.' });
    const view = await renderLevelOne(<StudentLogin />);

    await view.press('Quên mật khẩu?');
    expect(view.has('Tìm tài khoản học sinh')).toBe(true);
    await typeCode(view, 'hs8k2qx7');
    await view.press('Tiếp tục');

    expect(mockForgotPassword).toHaveBeenCalledWith('HS8K2QX7');
    expect(view.has(SENT)).toBe(true);
    expect(view.has('Vũ Thảo My')).toBe(false);
    expect(view.has('Trần Thị Minh Anh')).toBe(false);
    expect(view.has('Thông điệp của máy chủ')).toBe(false);
    expect(view.has('Không tìm thấy tài khoản')).toBe(false);

    await view.press('Đã có tài khoản? Quay lại đăng nhập');
    expect(view.has('Học sinh đăng nhập')).toBe(true);
  });

  it('mã sai định dạng: báo ngay, không gọi máy chủ', async () => {
    const view = await renderLevelOne(<StudentLogin />);
    await view.press('Quên mật khẩu?');
    await view.press('Tiếp tục');
    expect(mockForgotPassword).not.toHaveBeenCalled();
    expect(view.has(SENT)).toBe(false);
  });

  it('gửi quá nhiều lần (429): hiện câu của máy chủ, không hiện câu chung', async () => {
    const blocked = 'Em gửi yêu cầu quá nhiều lần. Em thử lại sau 15 phút nhé.';
    mockForgotPassword.mockRejectedValue(new ApiError(429, 'BLOCKED', blocked, {}, null, 900));
    const view = await renderLevelOne(<StudentLogin />);

    await view.press('Quên mật khẩu?');
    await typeCode(view, 'HS8K2QX7');
    await view.press('Tiếp tục');

    expect(view.has(blocked)).toBe(true);
    expect(view.has(SENT)).toBe(false);
  });
});
