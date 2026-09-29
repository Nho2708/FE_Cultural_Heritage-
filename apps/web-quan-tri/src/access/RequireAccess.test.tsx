import { MESSAGES } from '@dsvhvn/dung-chung';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { sessionStore } from '../lib/auth/session';
import { envelope, mockApi } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Route guard chạy trên cây route thật của ứng dụng (src/app/router.tsx), không dựng cây giả.

beforeEach(() => {
  // AuthProvider đọc lại hồ sơ khi mở ứng dụng; màn hình của khu quản trị gọi API riêng của chúng.
  mockApi((call) => {
    const session = sessionStore.getSession();
    if (call.path === '/me' && session) return envelope(200, { data: session.user });
    if (call.path === '/org') return envelope(200, { data: null });
    if (call.path.startsWith('/org/teachers'))
      return envelope(200, {
        data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0, quota: { used: 0, max: 10, planName: 'Miễn phí', canAddTeacher: true } },
      });
    if (call.path.startsWith('/admin/organizations'))
      return envelope(200, { data: { items: [], page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
    return undefined;
  });
});

describe('route guard theo ma trận phân quyền', () => {
  it('khách mở Hồ sơ cá nhân bị chuyển tới Đăng nhập và nhớ trang đang mở', async () => {
    const { router } = renderApp('/tai-khoan?tab=doi-mat-khau');
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dang-nhap');
    expect(router.state.location.state).toEqual({ from: '/tai-khoan?tab=doi-mat-khau' });
  });

  it('khách mở khu quản trị cũng bị chuyển tới Đăng nhập; mở / thì vào Đăng nhập', async () => {
    const first = renderApp('/quan-tri/nhat-ky');
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' });
    expect(first.router.state.location.pathname).toBe('/dang-nhap');
    first.unmount();

    const second = renderApp('/');
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' });
    expect(second.router.state.location.pathname).toBe('/dang-nhap');
  });

  it('Đăng nhập không có liên kết "Đăng ký" (tài khoản do cấp trên tạo), có dòng cố định chỉ học sinh sang web học tập', async () => {
    renderApp('/dang-nhap');
    await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' });
    expect(screen.queryByRole('link', { name: /đăng ký/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Email hoặc tên đăng nhập')).toBeInTheDocument();
    expect(screen.getByText(/Học sinh đăng nhập ở trang Học di sản hoặc ứng dụng trên điện thoại/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mở trang Học di sản/ })).toHaveAttribute('href', 'http://hoc.test');
  });

  it('giáo viên mở /quan-tri nhận trang 403, URL giữ nguyên, vẫn có thanh bên và menu tài khoản của mình', async () => {
    signInAs('TEACHER');
    const { router } = renderApp('/quan-tri/truong');
    expect(await screen.findByRole('heading', { level: 1, name: MESSAGES.forbidden })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/quan-tri/truong');
    expect(screen.getByRole('button', { name: /^Tài khoản:/ })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Khu giáo viên' })).toBeInTheDocument();
  });

  it('quản trị trường mở /giao-vien nhận 403; quản trị hệ thống mở /truong nhận 403', async () => {
    signInAs('ORG_ADMIN');
    const first = renderApp('/giao-vien/lop');
    expect(await screen.findByRole('heading', { level: 1, name: MESSAGES.forbidden })).toBeInTheDocument();
    first.unmount();

    signInAs('ADMIN');
    renderApp('/truong/giao-vien');
    expect(await screen.findByRole('heading', { level: 1, name: MESSAGES.forbidden })).toBeInTheDocument();
  });

  it('/giao-vien chuyển tới Lớp học (chưa dựng: hiện "đang xây dựng"), trong khung có thanh bên', async () => {
    signInAs('TEACHER');
    const { router } = renderApp('/giao-vien');
    expect(await screen.findByRole('heading', { level: 1, name: 'Lớp học' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/giao-vien/lop');
    expect(screen.getByRole('navigation', { name: 'Khu giáo viên' })).toBeInTheDocument();
    expect(screen.getByText('ĐANG XÂY DỰNG')).toBeInTheDocument();
  });

  it('tới khi có màn hình tổng quan: /truong mở Giáo viên của trường, /quan-tri mở Quản lý trường', async () => {
    signInAs('ORG_ADMIN');
    const first = renderApp('/truong');
    expect(await screen.findByRole('heading', { level: 1, name: 'Giáo viên của trường' })).toBeInTheDocument();
    expect(first.router.state.location.pathname).toBe('/truong/giao-vien');
    first.unmount();

    signInAs('ADMIN');
    const second = renderApp('/quan-tri');
    expect(await screen.findByRole('heading', { level: 1, name: 'Quản lý trường' })).toBeInTheDocument();
    expect(second.router.state.location.pathname).toBe('/quan-tri/truong');
  });

  it('người đã đăng nhập mở Đăng nhập hoặc / được chuyển về trang mặc định của vai trò', async () => {
    signInAs('ADMIN');
    const first = renderApp('/dang-nhap');
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/quan-tri/truong'));
    first.unmount();

    const second = renderApp('/');
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/quan-tri/truong'));
  });

  it('thanh bên chỉ hiện mục vai trò mở được; Hồ sơ cá nhân hiện trong khu của vai trò; có lối sang trang khám phá', async () => {
    signInAs('ORG_ADMIN');
    const first = renderApp('/truong/thong-tin');
    const nav = await screen.findByRole('navigation', { name: 'Quản trị trường' });
    expect([...nav.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Trường và gói', 'Giáo viên']);
    expect(screen.getByRole('link', { name: /Mở trang khám phá di sản/ })).toHaveAttribute('target', '_blank');
    first.unmount();

    renderApp('/tai-khoan');
    expect(await screen.findByRole('heading', { level: 1, name: 'Hồ sơ cá nhân' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Quản trị trường' })).toBeInTheDocument();
  });

  it('đường dẫn không có màn hình nào hiện trang 404, kể cả trong khu làm việc', async () => {
    const first = renderApp('/khong-co-trang-nay');
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument();
    first.unmount();

    signInAs('ADMIN');
    renderApp('/quan-tri/khong-co');
    expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument();
  });

  it('đường dẫn cũ và trang công khai đã chuyển sang web học tập không còn ở đây: 404', async () => {
    for (const path of ['/login', '/register', '/studio', '/di-san', '/bai-hoc']) {
      const view = renderApp(path);
      expect(await screen.findByRole('heading', { level: 1, name: 'Không tìm thấy trang' })).toBeInTheDocument();
      view.unmount();
    }
  });
});

describe('đăng xuất', () => {
  it('đăng xuất ngay trong khu quản trị thì về Đăng nhập, không nhớ trang đang mở', async () => {
    signInAs('ADMIN');
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/truong');
    await user.click(await screen.findByRole('button', { name: /^Tài khoản:/ }));
    await user.click(screen.getByRole('button', { name: 'Đăng xuất' }));
    const dialog = await screen.findByRole('dialog', { name: 'Đăng xuất' });
    await user.click(within(dialog).getByRole('button', { name: 'Đăng xuất' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dang-nhap'));
    expect(router.state.location.state).toBeNull();
    expect(sessionStore.getSession()).toBeNull();
    expect(await screen.findByRole('heading', { level: 1, name: 'Đăng nhập' })).toBeInTheDocument();
  });
});
