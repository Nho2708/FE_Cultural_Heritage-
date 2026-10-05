import { LEARNING_THEMES } from '@dsvhvn/dung-chung/theme';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { mockApi, studentOf, studentServer } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Bộ giao diện theo cấp học: cùng bố cục, cùng component, chỉ khác giá trị token ghi trên <html>.

const root = () => document.documentElement;
const cssVar = (name: string) => root().style.getPropertyValue(name);

describe('bộ giao diện theo cấp học', () => {
  it('khách dùng bộ mặc định', async () => {
    mockApi();
    renderApp('/');
    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(root()).toHaveAttribute('data-bo-giao-dien', 'mac-dinh');
    expect(cssVar('--dsv-color-primary')).toBe(LEARNING_THEMES['mac-dinh'].color.primary);
    expect(screen.getAllByRole('link', { name: 'Học sinh đăng nhập' }).length).toBeGreaterThan(0);
  });

  it.each([
    [5, 'cap-1', '19px', '48px', 'linh-vat'],
    [6, 'cap-2', '17px', '44px', 'bieu-tuong-net'],
    [12, 'cap-3', '16px', '44px', 'toi-gian'],
  ] as const)('khối %i → %s: cỡ chữ %s, vùng bấm %s, bộ hình %s ở khu học', async (grade, key, body, touch, set) => {
    signInAs(studentOf(grade));
    mockApi(studentServer(studentOf(grade)));
    renderApp('/hoc');

    expect(await screen.findByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(root()).toHaveAttribute('data-bo-giao-dien', key);
    expect(cssVar('--dsv-color-primary')).toBe(LEARNING_THEMES[key].color.primary);
    expect(cssVar('--dsv-text-body-m-size')).toBe(body);
    expect(cssVar('--dsv-touch-target')).toBe(touch);
    expect(document.querySelector('figure[data-bo-hinh]')).toHaveAttribute('data-bo-hinh', set);
  });

  it('trang khám phá công khai luôn dùng bộ mặc định kể cả khi học sinh đã đăng nhập; vào khu học thì đổi theo cấp', async () => {
    signInAs(studentOf(5));
    mockApi(studentServer(studentOf(5)));
    const user = userEvent.setup();
    const { router } = renderApp('/');

    await user.click(await screen.findByRole('link', { name: 'Vào trang học của em' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/hoc'));
    expect(root()).toHaveAttribute('data-bo-giao-dien', 'cap-1');

    await router.navigate('/di-san');
    await waitFor(() => expect(root()).toHaveAttribute('data-bo-giao-dien', 'mac-dinh'));
    expect(cssVar('--dsv-color-primary')).toBe(LEARNING_THEMES['mac-dinh'].color.primary);
    expect(cssVar('--dsv-touch-target')).toBe('44px');
  });

  it('máy chủ trả cấp học thì ưu tiên cấp đó; giáo viên sửa khối thì lần tải trang sau đổi bộ giao diện', async () => {
    signInAs(studentOf(9, { schoolLevel: 2 }));
    mockApi(studentServer(studentOf(10, { schoolLevel: 3 })));
    renderApp('/hoc');

    await waitFor(() => expect(root()).toHaveAttribute('data-bo-giao-dien', 'cap-3'));
    expect(await screen.findByText('Cấp 3 (Trung học phổ thông)')).toBeInTheDocument();
  });

  it('đăng xuất: về trang chủ, trở lại bộ mặc định', async () => {
    signInAs(studentOf(3));
    mockApi(studentServer(studentOf(3)));
    const user = userEvent.setup();
    const { router } = renderApp('/hoc');

    expect(await screen.findByRole('heading', { level: 1, name: /^Chào Nguyễn Minh An/ })).toBeInTheDocument();
    expect(root()).toHaveAttribute('data-bo-giao-dien', 'cap-1');
    await user.click(screen.getByRole('button', { name: /^Tài khoản:/ }));
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Đăng xuất' })).getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(root()).toHaveAttribute('data-bo-giao-dien', 'mac-dinh');
    expect(cssVar('--dsv-touch-target')).toBe('44px');
  });
});

describe('khu học chỉ cho học sinh đã đăng nhập', () => {
  it('khách mở trang học thì sang Học sinh đăng nhập và nhớ trang đang mở', async () => {
    mockApi();
    const { router } = renderApp('/hoc');
    expect(await screen.findByRole('heading', { level: 1, name: 'Học sinh đăng nhập' })).toBeInTheDocument();
    expect(router.state.location.state).toEqual({ from: '/hoc' });
  });

  it('học sinh đã đăng nhập mở Học sinh đăng nhập thì về trang học; màn hình chưa dựng hiện "đang xây dựng"', async () => {
    signInAs(studentOf(7));
    mockApi(studentServer(studentOf(7)));
    const first = renderApp('/dang-nhap');
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/hoc'));
    first.unmount();

    renderApp('/nhap-ma');
    expect(await screen.findByRole('heading', { level: 1, name: 'Nhập mã bài học' })).toBeInTheDocument();
    expect(screen.getByText('ĐANG XÂY DỰNG')).toBeInTheDocument();
  });

  it('đường dẫn lạ hiện trang 404; trang quản trị không có ở web học tập', async () => {
    mockApi();
    renderApp('/quan-tri/truong');
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument();
  });
});
