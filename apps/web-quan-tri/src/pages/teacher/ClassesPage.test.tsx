import { ERROR_CODES, type ClassRoom } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Lớp học của giáo viên: danh sách, tạo lớp, sửa (xác nhận đổi cấp), xóa mềm.

function pageOf(items: ClassRoom[]) {
  return { items, page: 1, pageSize: 20, totalItems: items.length, totalPages: items.length ? 1 : 0 };
}

function api(classes: ClassRoom[], extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path.startsWith('/teacher/classes?')) return envelope(200, { data: pageOf(classes) });
      return undefined;
    },
  );
}

describe('Lớp học', () => {
  it('bảng lớp: khối kèm cấp học, năm học, sĩ số, số bài học, số em chưa đăng nhập; tên lớp dẫn tới Chi tiết lớp', async () => {
    signInAs('TEACHER');
    api([
      classOf(1, { name: '4B1', grade: 4, schoolLevel: 1, activeStudentCount: 29, neverLoggedInCount: 6, lessonCount: 2 }),
      classOf(2, { name: '10A1', grade: 10, schoolLevel: 3, activeStudentCount: 0, neverLoggedInCount: 0 }),
    ]);
    renderApp('/giao-vien/lop');

    const table = await screen.findByRole('table', { name: 'Lớp học' });
    const first = within(table).getByRole('row', { name: /4B1/ });
    expect(within(first).getByText('Khối 4')).toBeInTheDocument();
    expect(within(first).getByText('Cấp 1')).toBeInTheDocument();
    expect(within(first).getByText('6 em')).toBeInTheDocument();
    expect(within(table).getByRole('link', { name: '4B1' })).toHaveAttribute('href', '/giao-vien/lop/1');
    expect(within(table).getByRole('row', { name: /10A1/ })).toHaveTextContent('Cấp 3');
    expect(screen.getByText('Thầy cô có 2 lớp · 29 học sinh đang hoạt động.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Lớp học' }).length).toBeGreaterThan(0);
  });

  it('chưa có lớp: trạng thái rỗng hướng dẫn tạo lớp', async () => {
    signInAs('TEACHER');
    api([]);
    renderApp('/giao-vien/lop');
    expect(await screen.findByText('Thầy cô chưa có lớp nào.')).toBeInTheDocument();
  });

  it('tạo lớp: kiểm trước khi gửi, rồi gửi tên, khối, năm học; danh sách làm mới', async () => {
    signInAs('TEACHER');
    const classes: ClassRoom[] = [];
    const calls = api(classes, (call) => {
      if (call.path === '/teacher/classes' && call.method === 'POST') {
        classes.push(classOf(9, { name: '7A3' }));
        return envelope(201, { data: classOf(9, { name: '7A3' }), message: 'Tạo lớp thành công.' });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop');

    await user.click(await screen.findByRole('button', { name: 'Tạo lớp' }));
    expect(await screen.findByText('Vui lòng nhập tên lớp.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập khối lớp.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST')).toBe(false);

    await user.type(screen.getByLabelText('Tên lớp'), '7A3');
    await user.selectOptions(screen.getByLabelText('Khối'), '7');
    await user.click(screen.getByRole('button', { name: 'Tạo lớp' }));

    expect(await screen.findByText('Tạo lớp thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST')?.body).toEqual({ name: '7A3', grade: 7, schoolYear: '2026-2027' });
    expect(await screen.findByRole('link', { name: '7A3' })).toBeInTheDocument();
  });

  it('tên lớp trùng trong cùng năm học: câu của máy chủ hiện dưới ô Tên lớp', async () => {
    signInAs('TEACHER');
    const duplicate = 'Tên lớp "7A1" đã được sử dụng cho một lớp khác.';
    api([], (call) =>
      call.method === 'POST' ? envelope(409, { errorCode: ERROR_CODES.duplicate, message: duplicate, errors: { name: duplicate } }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/lop');

    await user.type(await screen.findByLabelText('Tên lớp'), '7A1');
    await user.selectOptions(screen.getByLabelText('Khối'), '7');
    await user.click(screen.getByRole('button', { name: 'Tạo lớp' }));

    expect(await screen.findByText(duplicate)).toBeInTheDocument();
    expect(screen.getByLabelText('Tên lớp')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sửa khối sang cấp khác khi lớp đã có bài học: máy chủ đòi xác nhận, đồng ý thì gửi lại kèm xác nhận', async () => {
    signInAs('TEACHER');
    const confirmText = 'Lớp 7A1 sẽ chuyển từ cấp 2 sang cấp 3. Giao diện học của học sinh đổi theo cấp mới. Bạn có chắc muốn đổi?';
    const calls = api([classOf(1, { lessonCount: 3 })], (call) => {
      if (call.path === '/teacher/classes/1' && call.method === 'PUT') {
        const body = call.body as { confirmLevelChange?: boolean };
        return body.confirmLevelChange
          ? envelope(200, { data: classOf(1, { grade: 10, schoolLevel: 3, lessonCount: 3 }), message: 'Lưu lớp thành công.' })
          : envelope(422, { errorCode: ERROR_CODES.classLevelChangeNeedsConfirmation, message: confirmText });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop');

    await user.click(await screen.findByRole('button', { name: 'Sửa lớp 7A1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa lớp' });
    await user.selectOptions(within(dialog).getByLabelText('Khối'), '10');
    expect(within(dialog).getByText(/sẽ đổi theo cấp mới/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Lưu lớp' }));

    const confirm = await screen.findByRole('dialog', { name: 'Đổi cấp học của lớp' });
    expect(within(confirm).getByText(confirmText)).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Đổi cấp học' }));

    expect(await screen.findByText('Lưu lớp thành công.')).toBeInTheDocument();
    const puts = calls.filter((c) => c.method === 'PUT');
    expect(puts).toHaveLength(2);
    expect(puts[0]?.body).toEqual({ name: '7A1', grade: 10, schoolYear: '2026-2027' });
    expect(puts[1]?.body).toEqual({ name: '7A1', grade: 10, schoolYear: '2026-2027', confirmLevelChange: true });
  });

  it('xóa lớp còn bài kiểm tra đang mở: máy chủ chặn, toast hiện lý do, lớp vẫn còn', async () => {
    signInAs('TEACHER');
    const blocked = 'Không thể xóa lớp. Lớp còn bài kiểm tra đang mở.';
    api([classOf(1)], (call) =>
      call.method === 'DELETE' ? envelope(422, { errorCode: ERROR_CODES.blocked, message: blocked }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/lop');

    await user.click(await screen.findByRole('button', { name: 'Xóa lớp 7A1' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa lớp' });
    expect(within(dialog).getByText('Bạn có chắc muốn xóa lớp "7A1"?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }));

    expect(await screen.findByText(blocked)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '7A1' })).toBeInTheDocument();
  });

  it('xóa lớp thành công: gọi xóa mềm và báo thành công', async () => {
    signInAs('TEACHER');
    const calls = api([classOf(1)], (call) =>
      call.method === 'DELETE' ? envelope(200, { data: null, message: 'Xóa lớp thành công.' }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/lop');

    await user.click(await screen.findByRole('button', { name: 'Xóa lớp 7A1' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Xóa lớp' })).getByRole('button', { name: 'Xóa' }));

    expect(await screen.findByText('Xóa lớp thành công.')).toBeInTheDocument();
    await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/teacher/classes/1')).toBe(true));
  });

  it('quản trị trường không mở được Lớp học (403)', async () => {
    signInAs('ORG_ADMIN');
    mockApi((call) => (call.path === '/me' ? envelope(200, { data: userOf('ORG_ADMIN') }) : undefined));
    renderApp('/giao-vien/lop');
    expect(await screen.findByRole('heading', { level: 1, name: /không có quyền|Không có quyền/ })).toBeInTheDocument();
  });
});
