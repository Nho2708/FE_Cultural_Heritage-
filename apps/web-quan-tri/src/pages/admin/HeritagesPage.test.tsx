import { MESSAGES } from '@dsvhvn/dung-chung';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, heritageDetailOf, heritageSummaryOf, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Quản lý di sản: bảng, tìm và lọc trên URL, trạng thái rỗng / lỗi, ẩn – hiện lại – xóa qua hộp xác nhận chung.

const PROVINCES = [
  { id: 1, code: '46', name: 'Thành phố Huế', region: 'Trung' },
  { id: 2, code: '48', name: 'Thành phố Đà Nẵng', region: 'Trung' },
];

const page = (items: unknown[], totalItems = items.length) => ({
  items,
  page: 1,
  pageSize: 20,
  totalItems,
  totalPages: totalItems > 0 ? 1 : 0,
});

function api(items: unknown[], extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (call.path === '/admin/provinces') return envelope(200, { data: PROVINCES });
      if (call.path.startsWith('/admin/heritages?')) return envelope(200, { data: page(items) });
      return undefined;
    },
  );
}

describe('Quản lý di sản', () => {
  it('bảng di sản: tên, tỉnh, loại, cấp xếp hạng, trạng thái, số giai đoạn, số nguồn bằng tiếng Việt', async () => {
    signInAs('ADMIN');
    api([
      heritageSummaryOf(1, { name: 'Quần thể di tích Cố đô Huế', status: 'DRAFT' }),
      heritageSummaryOf(2, { name: 'Khu đền tháp Mỹ Sơn', provinceName: 'Thành phố Đà Nẵng', heritageType: 'NATURAL', recognitionLevel: 'NATIONAL_SPECIAL' }),
      heritageSummaryOf(3, { name: '82 bia Tiến sĩ', status: 'ARCHIVED', heritageType: 'DOCUMENTARY', timelineCount: 1, referenceCount: 7 }),
    ]);
    renderApp('/quan-tri/di-san');

    const table = await screen.findByRole('table', { name: 'Danh sách di sản' });
    expect(screen.getByRole('heading', { level: 1, name: 'Di sản' })).toBeInTheDocument();
    expect(screen.getByText(/3 di sản\./)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    expect(within(rows[1]!).getByRole('link', { name: 'Quần thể di tích Cố đô Huế' })).toHaveAttribute('href', '/quan-tri/di-san/1');
    expect(within(rows[1]!).getByText('Nháp')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Vật thể')).toBeInTheDocument();
    expect(within(rows[1]!).getByText('Di sản thế giới (UNESCO)')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Quốc gia đặc biệt')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Thiên nhiên')).toBeInTheDocument();
    expect(within(rows[2]!).getByText('Đã xuất bản')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Đã ẩn')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('Tư liệu')).toBeInTheDocument();
    expect(within(rows[3]!).getByText('7')).toBeInTheDocument();
  });

  it('nút hành động theo trạng thái: Nháp xóa được, Đã xuất bản ẩn được, Đã ẩn hiện lại và xóa được', async () => {
    signInAs('ADMIN');
    api([
      heritageSummaryOf(1, { name: 'A', status: 'DRAFT' }),
      heritageSummaryOf(2, { name: 'B', status: 'PUBLISHED' }),
      heritageSummaryOf(3, { name: 'C', status: 'ARCHIVED' }),
    ]);
    renderApp('/quan-tri/di-san');
    await screen.findByRole('table', { name: 'Danh sách di sản' });

    expect(screen.getByRole('button', { name: 'Xóa di sản A' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ẩn di sản A' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ẩn di sản B' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xóa di sản B' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hiện lại di sản C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Xóa di sản C' })).toBeInTheDocument();
  });

  it('tìm và lọc gửi đúng tham số lên máy chủ và ghi lên URL', async () => {
    signInAs('ADMIN');
    const calls = api([heritageSummaryOf(1)]);
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san');
    await screen.findByRole('table', { name: 'Danh sách di sản' });
    await screen.findByRole('option', { name: 'Thành phố Đà Nẵng' });

    await user.type(screen.getByLabelText('Tìm theo tên di sản'), 'thang long');
    await user.click(screen.getByRole('button', { name: 'Tìm' }));
    await user.selectOptions(screen.getByLabelText('Tỉnh, thành phố'), 'Thành phố Đà Nẵng');
    await user.selectOptions(screen.getByLabelText('Loại'), 'Vật thể');
    await user.selectOptions(screen.getByLabelText('Cấp xếp hạng'), 'Quốc gia đặc biệt');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'Đã xuất bản');

    await waitFor(() => expect(router.state.location.search).toContain('trang-thai=da-xuat-ban'));
    expect(router.state.location.search).toContain('tu-khoa=thang+long');
    expect(router.state.location.search).toContain('loai=vat-the');
    expect(router.state.location.search).toContain('cap=quoc-gia-dac-biet');
    expect(router.state.location.search).toContain('tinh=2');
    const last = [...calls].reverse().find((c) => c.path.startsWith('/admin/heritages?'))!;
    const query = new URLSearchParams(last.path.split('?')[1]);
    expect(Object.fromEntries(query)).toEqual({
      keyword: 'thang long',
      provinceId: '2',
      heritageType: 'TANGIBLE',
      recognitionLevel: 'NATIONAL_SPECIAL',
      status: 'PUBLISHED',
      page: '1',
      pageSize: '20',
    });
  });

  it('không có kết quả khi đang lọc: hiện câu chuẩn và nút "Bỏ bộ lọc"', async () => {
    signInAs('ADMIN');
    api([]);
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/di-san?trang-thai=da-an&loai=tu-lieu');

    expect(await screen.findByText(MESSAGES.noResults)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('chưa có di sản nào: trạng thái rỗng có nút "Tạo di sản"', async () => {
    signInAs('ADMIN');
    api([]);
    renderApp('/quan-tri/di-san');

    expect(await screen.findByText('Chưa có di sản nào.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Tạo di sản' })[0]).toHaveAttribute('href', '/quan-tri/di-san/moi');
  });

  it('lỗi tải danh sách: hiện câu lỗi của máy chủ kèm "Thử lại"', async () => {
    signInAs('ADMIN');
    let fail = true;
    mockApi(
      (call) => {
        if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
        if (call.path === '/admin/provinces') return envelope(200, { data: PROVINCES });
        if (call.path.startsWith('/admin/heritages?'))
          return fail
            ? envelope(400, { errorCode: 'INVALID', message: 'Số trang không hợp lệ: phải từ 1.' })
            : envelope(200, { data: page([heritageSummaryOf(1, { name: 'Sau khi thử lại' })]) });
        return undefined;
      },
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san');

    expect(await screen.findByText('Số trang không hợp lệ: phải từ 1.')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Sau khi thử lại')).toBeInTheDocument();
  });

  it('ẩn di sản qua hộp xác nhận: hỏi lại, gọi ẩn, hiện toast và tải lại bảng', async () => {
    signInAs('ADMIN');
    const calls = api([heritageSummaryOf(2, { name: 'Dân ca Quan họ Bắc Ninh' })], (call) =>
      call.path === '/admin/heritages/2/archive' && call.method === 'POST'
        ? envelope(200, { data: heritageDetailOf({ id: 2, status: 'ARCHIVED' }), message: 'Ẩn di sản thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san');

    await user.click(await screen.findByRole('button', { name: 'Ẩn di sản Dân ca Quan họ Bắc Ninh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Ẩn di sản' });
    expect(within(dialog).getByText(MESSAGES.confirm('ẩn di sản', 'Dân ca Quan họ Bắc Ninh'))).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Ẩn di sản' }));

    expect(await screen.findByText('Ẩn di sản thành công.')).toBeInTheDocument();
    await waitFor(() => expect(calls.filter((c) => c.path.startsWith('/admin/heritages?')).length).toBeGreaterThan(1));
  });

  it('hiện lại khi chưa đủ điều kiện: toast lỗi của máy chủ, không đổi gì', async () => {
    signInAs('ADMIN');
    const notReady = 'Chưa đủ điều kiện hiện lại di sản. Còn thiếu: nguồn tham chiếu (ít nhất một).';
    api([heritageSummaryOf(3, { name: '82 bia Tiến sĩ', status: 'ARCHIVED' })], (call) =>
      call.path === '/admin/heritages/3/restore'
        ? envelope(422, { errorCode: 'NOT_READY', message: notReady, errors: { references: 'Còn thiếu nguồn tham chiếu.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san');

    await user.click(await screen.findByRole('button', { name: 'Hiện lại di sản 82 bia Tiến sĩ' }));
    const dialog = await screen.findByRole('dialog', { name: 'Hiện lại di sản' });
    await user.click(within(dialog).getByRole('button', { name: 'Hiện di sản' }));

    expect(await screen.findByText(notReady)).toBeInTheDocument();
  });

  it('xóa di sản nháp: xác nhận rồi gọi xóa mềm', async () => {
    signInAs('ADMIN');
    const calls = api([heritageSummaryOf(1, { name: 'Bản nháp', status: 'DRAFT' })], (call) =>
      call.path === '/admin/heritages/1' && call.method === 'DELETE'
        ? envelope(200, { message: 'Xóa di sản thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/di-san');

    await user.click(await screen.findByRole('button', { name: 'Xóa di sản Bản nháp' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa di sản' });
    await user.click(within(dialog).getByRole('button', { name: 'Xóa di sản' }));

    expect(await screen.findByText('Xóa di sản thành công.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/admin/heritages/1')).toBe(true);
  });

  it('chỉ quản trị hệ thống vào được: giáo viên thấy trang 403', async () => {
    signInAs('TEACHER');
    mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/quan-tri/di-san');

    expect(await screen.findByText(MESSAGES.forbidden)).toBeInTheDocument();
    expect(screen.queryByRole('table', { name: 'Danh sách di sản' })).not.toBeInTheDocument();
  });
});
