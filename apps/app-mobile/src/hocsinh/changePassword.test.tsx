import { act, type ReactTestInstance } from 'react-test-renderer';
import ChangePassword from '../../app/doi-mat-khau';
import { renderLevelOne } from './levelOne/testKit';

// Đổi mật khẩu theo cấp lớp của em: cấp 1 chỉ cần dài 6-64 ký tự (thầy cô phát mật khẩu 6 chữ số), cấp 2, 3 theo quy tắc chung.

const mockChangePassword = jest.fn();
let mockLevel: 1 | 2 = 1;
jest.mock('expo-router', () => ({ Redirect: () => null, useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../state/AppProvider', () => ({
  useApp: () => ({ mode: 'student', services: { studentApi: { changePassword: mockChangePassword }, sessionStore: { setSession: jest.fn() } } }),
  useAuth: () => ({ session: { user: { id: 1, fullName: 'Minh', schoolLevel: mockLevel, mustChangePassword: false } } }),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function fill(view: Awaited<ReturnType<typeof renderLevelOne>>, label: string, value: string) {
  const input = view.tree.root.findAll((node: ReactTestInstance) => typeof node.props.onChangeText === 'function' && node.props.accessibilityLabel === label)[0]!;
  await act(async () => input.props.onChangeText(value));
}

beforeEach(() => {
  mockChangePassword.mockReset();
  mockChangePassword.mockRejectedValue(new Error('không gọi trong test'));
});

describe('đổi mật khẩu của học sinh', () => {
  it('cấp 1: hiện điều kiện 6-64 ký tự, mật khẩu ngắn bị báo, 6 chữ số được nhận', async () => {
    mockLevel = 1;
    const view = await renderLevelOne(<ChangePassword />);
    expect(view.has('Dài 6-64 ký tự')).toBe(true);
    expect(view.has('6-64 ký tự, ví dụ 6 chữ số dễ nhớ')).toBe(true);
    expect(view.has('Có chữ hoa')).toBe(false);

    await fill(view, 'Mật khẩu hiện tại', '482913');
    await fill(view, 'Mật khẩu mới', '12345');
    await fill(view, 'Nhập lại mật khẩu mới', '12345');
    await view.press('Đổi mật khẩu');
    expect(view.has('Mật khẩu dài 6-64 ký tự.')).toBe(true);
    expect(mockChangePassword).not.toHaveBeenCalled();

    await fill(view, 'Mật khẩu mới', '123456');
    await fill(view, 'Nhập lại mật khẩu mới', '123456');
    await view.press('Đổi mật khẩu');
    expect(mockChangePassword).toHaveBeenCalledWith({ currentPassword: '482913', newPassword: '123456', confirmNewPassword: '123456' });
  });

  it('cấp 2: 6 chữ số chưa đủ quy tắc chung', async () => {
    mockLevel = 2;
    const view = await renderLevelOne(<ChangePassword />);
    await fill(view, 'Mật khẩu hiện tại', 'Cu1234567');
    await fill(view, 'Mật khẩu mới', '123456');
    await fill(view, 'Nhập lại mật khẩu mới', '123456');
    await view.press('Đổi mật khẩu');
    expect(mockChangePassword).not.toHaveBeenCalled();
    expect(view.has('Dài 6-64 ký tự')).toBe(false);
  });
});
