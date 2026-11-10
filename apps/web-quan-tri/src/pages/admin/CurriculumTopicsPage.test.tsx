import { MESSAGES } from '@dsvhvn/dung-chung';
import { ERROR_CODES, type AdminCurriculumTopic } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { adminTopicOf } from '../../test/curriculumFixtures';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Chủ đề chương trình của quản trị hệ thống: bảng, lọc khối và trạng thái trên URL, thêm, sửa, ngừng dùng, dùng lại.

const TOPICS: AdminCurriculumTopic[] = [
  adminTopicOf(1, { groupTitle: 'Địa phương em (tỉnh, thành phố)', title: 'Thiên nhiên và con người địa phương', localProvince: true, heritageCount: 0, sortOrder: 1 }),
  adminTopicOf(9, { title: 'Thăng Long - Hà Nội', heritageCount: 5, sortOrder: 9 }),
  adminTopicOf(13, { groupTitle: 'Bắc Trung Bộ và Nam Trung Bộ', title: 'Cố đô Huế', heritageCount: 3, sortOrder: 13, isActive: false }),
  adminTopicOf(30, { subject: 'Lịch sử', grade: 10, groupTitle: 'Một số nền văn minh trên đất nước Việt Nam (trước năm 1858)', title: 'Văn minh Champa', heritageCount: 14, sortOrder: 30 }),
];

// Đường dẫn danh sách có hoặc không có tham số lọc.
const LIST = /^\/admin\/curriculum-topics(\?|$)/;

function api(extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('ADMIN') });
      if (LIST.test(call.path)) {
        const params = new URL(`http://x${call.path}`).searchParams;
        const grade = params.get('grade');
        const all = params.get('includeInactive') === 'true';
        return envelope(200, { data: { items: TOPICS.filter((t) => (!grade || t.grade === Number(grade)) && (all || t.isActive)) } });
      }
      return undefined;
    },
  );
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => LIST.test(c.path)).at(-1)?.path ?? '';

describe('Chủ đề chương trình của quản trị hệ thống', () => {
  it('có mục điều hướng; bảng hiện khối, chủ đề lớn, nội dung, số di sản, trạng thái; xin cả chủ đề đã ngừng dùng', async () => {
    signInAs('ADMIN');
    const calls = api();
    renderApp('/quan-tri/chu-de-chuong-trinh');

    const nav = await screen.findByRole('navigation', { name: 'Quản trị hệ thống' });
    expect(within(nav).getByRole('link', { name: 'Chủ đề chương trình' })).toHaveAttribute('href', '/quan-tri/chu-de-chuong-trinh');
    const table = await screen.findByRole('table', { name: 'Chủ đề chương trình' });
    expect(lastList(calls)).toContain('includeInactive=true');
    const row = within(table).getByRole('row', { name: /Thăng Long - Hà Nội/ });
    expect(within(row).getByText('Khối 4')).toBeInTheDocument();
    expect(within(row).getByText('Đồng bằng Bắc Bộ')).toBeInTheDocument();
    expect(within(row).getByText('5')).toBeInTheDocument();
    expect(within(row).getByText('Đang dùng')).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Cố đô Huế/ })).getByText('Đã ngừng dùng')).toBeInTheDocument();
    expect(within(within(table).getByRole('row', { name: /Thiên nhiên và con người địa phương/ })).getByText('Theo tỉnh của trường')).toBeInTheDocument();
    expect(within(row).getByRole('link', { name: 'Quản lý di sản của "Thăng Long - Hà Nội"' })).toHaveAttribute('href', '/quan-tri/chu-de-chuong-trinh/9/di-san');
  });

  it('lọc khối gửi grade và nằm trên URL; lọc Đang dùng không xin chủ đề ngừng dùng; Đã ngừng dùng lọc ngay trên trang', async () => {
    signInAs('ADMIN');
    const calls = api();
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/chu-de-chuong-trinh');

    await screen.findByRole('table', { name: 'Chủ đề chương trình' });
    await user.selectOptions(screen.getByLabelText('Khối'), '10');
    await waitFor(() => expect(lastList(calls)).toContain('grade=10'));
    expect(router.state.location.search).toContain('khoi=10');
    expect(await screen.findByRole('row', { name: /Văn minh Champa/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Thăng Long/ })).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Khối'), '');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'Đang dùng');
    await waitFor(() => expect(lastList(calls)).not.toContain('includeInactive'));
    expect(router.state.location.search).toContain('trang-thai=dang-dung');
    await waitFor(() => expect(screen.queryByRole('row', { name: /Cố đô Huế/ })).not.toBeInTheDocument());

    // Danh sách đủ chủ đề (gồm cả chủ đề ngừng dùng) đã có trong bộ nhớ đệm nên không xin lại.
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'Đã ngừng dùng');
    expect(await screen.findByRole('row', { name: /Cố đô Huế/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /Thăng Long/ })).not.toBeInTheDocument();
  });

  it('lọc không có kết quả: báo và có nút Bỏ bộ lọc', async () => {
    signInAs('ADMIN');
    api();
    const user = userEvent.setup();
    const { router } = renderApp('/quan-tri/chu-de-chuong-trinh?khoi=7');

    await screen.findByText(/Không tìm thấy kết quả phù hợp/);
    await user.click(screen.getByRole('button', { name: 'Bỏ bộ lọc' }));
    expect(await screen.findByRole('table', { name: 'Chủ đề chương trình' })).toBeInTheDocument();
    expect(router.state.location.search).toBe('');
  });

  it('Thêm chủ đề: thiếu ô bắt buộc thì báo, không gọi máy chủ; đủ thì gửi đúng thân và làm mới bảng', async () => {
    signInAs('ADMIN');
    const calls = api((call) =>
      call.method === 'POST' && call.path === '/admin/curriculum-topics' ? envelope(201, { data: adminTopicOf(99), message: 'Thêm chủ đề thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/chu-de-chuong-trinh');

    await user.click(await screen.findByRole('button', { name: 'Thêm chủ đề' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm chủ đề chương trình' });
    expect(within(dialog).getByLabelText('Thứ tự')).toHaveValue('31');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm chủ đề' }));
    expect(await within(dialog).findByText('Vui lòng nhập môn học.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập khối.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập chủ đề lớn.')).toBeInTheDocument();
    expect(within(dialog).getByText('Vui lòng nhập nội dung chủ đề.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.type(within(dialog).getByLabelText('Môn học'), '  Lịch sử và Địa lí ');
    await user.selectOptions(within(dialog).getByLabelText('Khối'), 'Khối 5');
    await user.type(within(dialog).getByLabelText('Chủ đề lớn'), 'Xây dựng và bảo vệ đất nước Việt Nam');
    await user.type(within(dialog).getByLabelText('Nội dung chủ đề'), 'Triều Nguyễn');
    await user.type(within(dialog).getByLabelText('Đường dẫn nguồn (không bắt buộc)'), 'nguon-khong-hop-le');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm chủ đề' }));
    expect(await within(dialog).findByText(/bắt đầu bằng http:\/\/ hoặc https:\/\//)).toBeInTheDocument();
    await user.clear(within(dialog).getByLabelText('Đường dẫn nguồn (không bắt buộc)'));
    await user.click(within(dialog).getByRole('button', { name: 'Thêm chủ đề' }));

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        subject: 'Lịch sử và Địa lí',
        grade: 5,
        groupTitle: 'Xây dựng và bảo vệ đất nước Việt Nam',
        title: 'Triều Nguyễn',
        description: null,
        localProvince: false,
        sortOrder: 31,
        sourceUrl: null,
      }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Thêm chủ đề chương trình' })).not.toBeInTheDocument());
    expect(calls.filter((c) => LIST.test(c.path)).length).toBeGreaterThan(1);
  });

  it('Thêm chủ đề trùng: câu 409 của máy chủ hiện ngay trong hộp thoại, hộp vẫn mở', async () => {
    signInAs('ADMIN');
    const reason = 'Chủ đề này đã có trong cùng khối, môn và chủ đề lớn.';
    api((call) =>
      call.method === 'POST' && call.path === '/admin/curriculum-topics' ? envelope(409, { errorCode: ERROR_CODES.duplicate, message: reason }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/chu-de-chuong-trinh?khoi=4');

    await user.click(await screen.findByRole('button', { name: 'Thêm chủ đề' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm chủ đề chương trình' });
    expect(within(dialog).getByLabelText('Môn học')).toHaveValue('Lịch sử và Địa lí');
    expect(within(dialog).getByLabelText('Khối')).toHaveValue('4');
    await user.type(within(dialog).getByLabelText('Chủ đề lớn'), 'Đồng bằng Bắc Bộ');
    await user.type(within(dialog).getByLabelText('Nội dung chủ đề'), 'Thăng Long - Hà Nội');
    await user.click(within(dialog).getByRole('button', { name: 'Thêm chủ đề' }));

    expect(await within(dialog).findByText(reason)).toBeInTheDocument();
  });

  it('Sửa chủ đề: hộp điền sẵn, lưu gửi PUT với thân đã sửa', async () => {
    signInAs('ADMIN');
    const calls = api((call) =>
      call.method === 'PUT' && call.path === '/admin/curriculum-topics/9'
        ? envelope(200, { data: adminTopicOf(9, { title: 'Thăng Long - Hà Nội xưa và nay' }), message: 'Lưu chủ đề thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/quan-tri/chu-de-chuong-trinh');

    await user.click(await screen.findByRole('button', { name: 'Sửa "Thăng Long - Hà Nội"' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa chủ đề chương trình' });
    expect(within(dialog).getByLabelText('Nội dung chủ đề')).toHaveValue('Thăng Long - Hà Nội');
    expect(within(dialog).getByLabelText('Khối')).toHaveValue('4');
    await user.type(within(dialog).getByLabelText('Nội dung chủ đề'), ' xưa và nay');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu chủ đề' }));

    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ title: 'Thăng Long - Hà Nội xưa và nay', grade: 4, sortOrder: 9, localProvince: false }),
    );
  });

  it('Ngừng dùng cần xác nhận; Dùng lại gọi ngay', async () => {
    signInAs('ADMIN');
    const calls = api((call) => {
      if (call.method === 'POST' && call.path === '/admin/curriculum-topics/9/deactivate') return envelope(200, { data: adminTopicOf(9, { isActive: false }), message: 'Đã ngừng dùng chủ đề.' });
      if (call.method === 'POST' && call.path === '/admin/curriculum-topics/13/activate') return envelope(200, { data: adminTopicOf(13), message: 'Đã dùng lại chủ đề.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/quan-tri/chu-de-chuong-trinh');

    await user.click(await screen.findByRole('button', { name: 'Ngừng dùng "Thăng Long - Hà Nội"' }));
    const confirm = await screen.findByRole('dialog', { name: 'Ngừng dùng chủ đề?' });
    expect(calls.some((c) => c.method === 'POST')).toBe(false);
    await user.click(within(confirm).getByRole('button', { name: 'Ngừng dùng' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/curriculum-topics/9/deactivate')).toBe(true));

    await user.click(await screen.findByRole('button', { name: 'Dùng lại "Cố đô Huế"' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/admin/curriculum-topics/13/activate')).toBe(true));
  });

  it('giáo viên không mở được trang này: báo không có quyền', async () => {
    signInAs('TEACHER');
    mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('TEACHER') }) : undefined));
    renderApp('/quan-tri/chu-de-chuong-trinh');
    expect(await screen.findByText(MESSAGES.forbidden)).toBeInTheDocument();
  });
});
