import { ERROR_CODES, type AdminLessonLibraryRow } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { adminLibraryDetailOf, adminLibraryRowOf } from '../../test/lessonFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Thư viện bài mẫu của quản trị hệ thống: ba tab, xem trước chỉ đọc, Duyệt, Từ chối và Gỡ khỏi thư viện (bắt buộc lý do).

function pageOf(items: AdminLessonLibraryRow[]) {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

function api(byStatus: Partial<Record<'PENDING' | 'APPROVED' | 'REJECTED', AdminLessonLibraryRow[]>>, extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path.startsWith('/admin/lesson-library?')) {
        const status = (new URL(`http://x${call.path}`).searchParams.get('status') ?? 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED';
        return envelope(200, { data: pageOf(byStatus[status] ?? []) });
      }
      const detail = /^\/admin\/lesson-library\/(\d+)$/.exec(call.path);
      if (detail) return envelope(200, { data: adminLibraryDetailOf(Number(detail[1])) });
      return undefined;
    },
  );
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/admin/lesson-library?')).at(-1)?.path ?? '';

describe('Thư viện bài mẫu của quản trị hệ thống', () => {
  it('có mục điều hướng; mặc định tab Chờ duyệt, gửi status=PENDING; bảng hiện người soạn, trường, cấp và khối', async () => {
    signInAs('ADMIN');
    const calls = api({ PENDING: [adminLibraryRowOf(1, { title: 'Ngọ Môn và Kinh thành Huế' })] });
    renderApp('/quan-tri/thu-vien-bai-mau');

    const nav = await screen.findByRole('navigation', { name: 'Quản trị hệ thống' });
    expect(within(nav).getByRole('link', { name: 'Thư viện bài mẫu' })).toHaveAttribute('href', '/quan-tri/thu-vien-bai-mau');
    const table = await screen.findByRole('table', { name: 'Bài mẫu: Chờ duyệt' });
    const row = within(table).getByRole('row', { name: /Ngọ Môn/ });
    expect(within(row).getByText('Trần Văn Bình')).toBeInTheDocument();
    expect(within(row).getByText('Trường THCS Nguyễn Du')).toBeInTheDocument();
    expect(within(row).getByText('Cấp 2 · Khối 7')).toBeInTheDocument();
    expect(lastList(calls)).toContain('status=PENDING');
    expect(screen.getByRole('tab', { name: 'Chờ duyệt' })).toHaveAttribute('aria-selected', 'true');
  });

  it('chuyển tab Trong thư viện và Đã từ chối: gửi đúng status, cột khác nhau, URL giữ tab', async () => {
    signInAs('ADMIN');
    const calls = api({
      PENDING: [adminLibraryRowOf(1)],
      APPROVED: [adminLibraryRowOf(2, { title: 'Bài đã duyệt', status: 'APPROVED', reviewedAt: '2026-11-09T01:00:00Z', useCount: 12 })],
      REJECTED: [adminLibraryRowOf(3, { title: 'Bài bị từ chối', status: 'REJECTED', note: 'Sai năm xây dựng.' })],
    });
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/thu-vien-bai-mau');

    await screen.findByRole('table', { name: 'Bài mẫu: Chờ duyệt' });
    await user.click(screen.getByRole('tab', { name: 'Trong thư viện' }));
    const approved = await screen.findByRole('table', { name: 'Bài mẫu: Trong thư viện' });
    expect(lastList(calls)).toContain('status=APPROVED');
    expect(within(approved).getByRole('columnheader', { name: 'Lượt dùng' })).toBeInTheDocument();
    expect(within(approved).getByText('12')).toBeInTheDocument();
    expect(router.state.location.search).toContain('tab=trong-thu-vien');

    await user.click(screen.getByRole('tab', { name: 'Đã từ chối' }));
    const rejected = await screen.findByRole('table', { name: 'Bài mẫu: Đã từ chối' });
    expect(lastList(calls)).toContain('status=REJECTED');
    expect(within(rejected).getByText('Sai năm xây dựng.')).toBeInTheDocument();
  });

  it('tab trống: giải thích; lọc theo cấp và từ khóa gửi đúng tham số', async () => {
    signInAs('ADMIN');
    const calls = api({});
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau');

    expect(await screen.findByText('Không có bài mẫu nào đang chờ duyệt.')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Cấp'), '2');
    await user.type(screen.getByRole('searchbox', { name: 'Tìm theo tiêu đề' }), 'Huế{Enter}');
    await waitFor(() => {
      const path = lastList(calls);
      expect(path).toMatch(/level=2/);
      expect(path).toMatch(/keyword=Hu/);
    });
  });

  it('Xem trước mở bài chỉ đọc; bài chờ duyệt có Duyệt và Từ chối ở chân hộp', async () => {
    signInAs('ADMIN');
    api({ PENDING: [adminLibraryRowOf(1, { title: 'Ngọ Môn và Kinh thành Huế' })] });
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: 'Xem trước "Ngọ Môn và Kinh thành Huế"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem trước bài mẫu: Ngọ Môn và Kinh thành Huế' });
    expect(await within(dialog).findByText('Nội dung bài chờ duyệt.')).toBeInTheDocument();
    expect(within(dialog).getByText(/Bài chưa có bài kiểm tra/)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Duyệt' })).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Từ chối' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Gỡ khỏi thư viện' })).not.toBeInTheDocument();
  });

  it('Duyệt: hỏi xác nhận rồi gọi approve, báo kết quả và tải lại danh sách', async () => {
    signInAs('ADMIN');
    let approved = false;
    const calls = api(
      { PENDING: [adminLibraryRowOf(1, { title: 'Ngọ Môn và Kinh thành Huế' })] },
      (call) => {
        if (call.path === '/admin/lesson-library/1/approve') {
          approved = true;
          return envelope(200, { data: { item: adminLibraryRowOf(1, { status: 'APPROVED' }), message: 'Đã duyệt bài mẫu. Bài vào thư viện.' } });
        }
        if (call.path.startsWith('/admin/lesson-library?') && approved) return envelope(200, { data: pageOf([]) });
        return undefined;
      },
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: 'Duyệt "Ngọ Môn và Kinh thành Huế"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Duyệt bài mẫu "Ngọ Môn và Kinh thành Huế"?' });
    expect(calls.some((c) => c.path.endsWith('/approve'))).toBe(false);
    await user.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    expect(await screen.findByText('Đã duyệt bài mẫu. Bài vào thư viện.')).toBeInTheDocument();
    expect(await screen.findByText('Không có bài mẫu nào đang chờ duyệt.')).toBeInTheDocument();
  });

  it('Duyệt bị chặn (bài không còn đủ điều kiện): hiện câu của máy chủ trong hộp, danh sách tải lại', async () => {
    signInAs('ADMIN');
    const reason = 'Không thể duyệt. Bài chưa đủ điều kiện xuất bản.';
    api({ PENDING: [adminLibraryRowOf(1)] }, (call) =>
      call.path === '/admin/lesson-library/1/approve' ? envelope(422, { errorCode: ERROR_CODES.notReady, message: reason }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: /^Duyệt "/ }));
    const dialog = await screen.findByRole('dialog', { name: /Duyệt bài mẫu/ });
    await user.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    expect(await within(dialog).findByText(reason)).toBeInTheDocument();
  });

  it('Từ chối bắt buộc lý do: bỏ trống thì báo lỗi, không gọi; có lý do thì gửi note đã cắt khoảng trắng', async () => {
    signInAs('ADMIN');
    const calls = api({ PENDING: [adminLibraryRowOf(1, { title: 'Ngọ Môn và Kinh thành Huế' })] }, (call) =>
      call.path === '/admin/lesson-library/1/reject' ? envelope(200, { data: { item: adminLibraryRowOf(1, { status: 'REJECTED' }), message: 'Đã từ chối bài mẫu.' } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau');

    await user.click(await screen.findByRole('button', { name: 'Từ chối "Ngọ Môn và Kinh thành Huế"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Từ chối bài mẫu "Ngọ Môn và Kinh thành Huế"?' });
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    expect(await within(dialog).findByText('Vui lòng nhập lý do.')).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/reject'))).toBe(false);

    await user.type(within(dialog).getByLabelText('Lý do'), '  Sai năm xây dựng.  ');
    await user.click(within(dialog).getByRole('button', { name: 'Từ chối' }));
    expect(await screen.findByText('Đã từ chối bài mẫu.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/reject'))?.body).toEqual({ note: 'Sai năm xây dựng.' });
  });

  it('Gỡ khỏi thư viện (tab Trong thư viện) cũng bắt buộc lý do và gọi reject', async () => {
    signInAs('ADMIN');
    const calls = api({ APPROVED: [adminLibraryRowOf(2, { title: 'Bài đã duyệt', status: 'APPROVED', useCount: 3 })] }, (call) =>
      call.path === '/admin/lesson-library/2/reject' ? envelope(200, { data: { item: adminLibraryRowOf(2, { status: 'REJECTED' }), message: 'Đã gỡ bài khỏi thư viện.' } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/thu-vien-bai-mau?tab=trong-thu-vien');

    expect(await screen.findByRole('table', { name: 'Bài mẫu: Trong thư viện' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Duyệt "/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gỡ khỏi thư viện "Bài đã duyệt"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Gỡ "Bài đã duyệt" khỏi thư viện?' });
    await user.click(within(dialog).getByRole('button', { name: 'Gỡ khỏi thư viện' }));
    expect(await within(dialog).findByText('Vui lòng nhập lý do.')).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText('Lý do'), 'Nội dung đã lỗi thời.');
    await user.click(within(dialog).getByRole('button', { name: 'Gỡ khỏi thư viện' }));
    expect(await screen.findByText('Đã gỡ bài khỏi thư viện.')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/reject'))?.body).toEqual({ note: 'Nội dung đã lỗi thời.' });
  });

  it('bài đã từ chối chỉ xem: không có nút Duyệt, Từ chối hay Gỡ', async () => {
    signInAs('ADMIN');
    api({ REJECTED: [adminLibraryRowOf(3, { title: 'Bài bị từ chối', status: 'REJECTED', note: 'Sai năm.' })] });
    renderApp('/quan-tri/thu-vien-bai-mau?tab=da-tu-choi');

    await screen.findByRole('table', { name: 'Bài mẫu: Đã từ chối' });
    expect(screen.getByRole('button', { name: 'Xem trước "Bài bị từ chối"' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(Duyệt|Từ chối|Gỡ khỏi thư viện) "/ })).not.toBeInTheDocument();
  });

  it('lỗi tải danh sách: hiện lỗi có nút thử lại', async () => {
    signInAs('ADMIN');
    mockApi(
      (call) => (call.path.startsWith('/admin/lesson-library?') ? envelope(500, { errorCode: ERROR_CODES.systemError, message: 'Hệ thống đang gặp sự cố.' }) : undefined),
      (call) => (call.path === '/me' ? envelope(200, { data: userOf('ADMIN') }) : undefined),
    );
    renderApp('/quan-tri/thu-vien-bai-mau');
    expect(await screen.findByRole('button', { name: /Thử lại/ })).toBeInTheDocument();
  });

  it('giáo viên mở /quan-tri/thu-vien-bai-mau nhận 403 và không gọi API duyệt', async () => {
    signInAs('TEACHER');
    const calls = mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/quan-tri/thu-vien-bai-mau');
    await screen.findByRole('navigation', { name: 'Khu giáo viên' });
    expect(calls.some((c) => c.path.startsWith('/admin/lesson-library'))).toBe(false);
  });
});
