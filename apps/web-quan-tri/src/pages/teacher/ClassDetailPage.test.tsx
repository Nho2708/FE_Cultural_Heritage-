import { ERROR_CODES, type ClassStudent } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { classOf, classStudentOf, envelope, mockApi, sheetOf, studentPage, userOf, type FetchCall } from '../../test/fixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Chi tiết lớp, tab Học sinh: bảng học sinh, thêm từng em, nhập danh sách có xem trước, phiếu đăng nhập, đặt lại mật khẩu,
// vô hiệu / mở lại / xóa, sửa họ tên tại chỗ.

const BASE = '/teacher/classes/1';

function api(students: ClassStudent[], extra?: (call: FetchCall) => Response | undefined, classOverrides = {}) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === BASE) return envelope(200, { data: classOf(1, classOverrides) });
      if (call.path.startsWith(`${BASE}/students?`)) return envelope(200, { data: studentPage(students) });
      return undefined;
    },
  );
}

const three = () => [
  classStudentOf(1, { fullName: 'Nguyễn Minh Anh', studentCode: 'HS8K2QX7' }),
  classStudentOf(2, { fullName: 'Trần Gia Bảo', studentCode: 'HS3F7PLM', lastLoginAt: null, passwordChanged: false }),
  classStudentOf(3, { fullName: 'Lê Ngọc Châu', studentCode: 'HS5T9WQE', isActive: false }),
];

describe('Chi tiết lớp — tab Học sinh', () => {
  it('đầu trang có lớp, khối kèm cấp, năm học, sĩ số; bảng có mã, trạng thái, lần đăng nhập, đã đổi mật khẩu chưa', async () => {
    signInAs('TEACHER');
    api(three());
    renderApp('/giao-vien/lop/1');

    // Lần render đầu của file còn phải nạp module, máy bận có thể quá 1 giây mặc định.
    expect(await screen.findByRole('heading', { level: 1, name: 'Lớp 7A1' }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/Năm học 2026-2027/)).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Học sinh của lớp' });
    const second = within(table).getByRole('row', { name: /Trần Gia Bảo/ });
    expect(within(second).getByText('HS3F7PLM')).toBeInTheDocument();
    expect(within(second).getByText('Chưa đăng nhập lần nào')).toBeInTheDocument();
    expect(within(second).getByText('Chưa đổi')).toBeInTheDocument();
    const third = within(table).getByRole('row', { name: /Lê Ngọc Châu/ });
    expect(within(third).getByText('Đã vô hiệu')).toBeInTheDocument();
    expect(within(third).getByRole('checkbox')).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Học sinh', selected: true })).toBeInTheDocument();
  });

  it('các tab chưa dựng ở chức năng này báo sẽ có ở bản sau; tab nằm trên URL', async () => {
    signInAs('TEACHER');
    api(three());
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('tab', { name: 'Tiến độ' }));
    expect(await screen.findByText('Tab Tiến độ sẽ có ở bản sau.')).toBeInTheDocument();
    expect(router.state.location.search).toBe('?tab=tien-do');
  });

  it('lớp không có hoặc của giáo viên khác (404): báo không tìm thấy lớp', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      return envelope(404, { errorCode: ERROR_CODES.blocked, message: 'Không thể thực hiện. Không tìm thấy dữ liệu.' });
    });
    renderApp('/giao-vien/lop/77');
    expect(await screen.findByText('Không tìm thấy lớp.')).toBeInTheDocument();
  });

  it('thêm từng em: gửi họ tên, hiện phiếu đăng nhập có mã và mật khẩu tạm; đóng thì hỏi đã in chưa', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) => {
      if (call.path === `${BASE}/students` && call.method === 'POST') {
        return envelope(201, {
          data: {
            students: [classStudentOf(9, { fullName: 'Đỗ Minh Khang', studentCode: 'HS6Y3RJB' })],
            sheet: sheetOf([{ id: 9, name: 'Đỗ Minh Khang', code: 'HS6Y3RJB', password: 'Zc5gH7rk' }]),
          },
          message: 'Thêm học sinh thành công.',
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Thêm học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm học sinh vào lớp 7A1' });
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));
    expect(await within(dialog).findByText('Vui lòng nhập họ tên.')).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText('Họ và tên'), '  Đỗ Minh Khang ');
    await user.click(within(dialog).getByRole('button', { name: 'Tạo tài khoản' }));

    const slips = await screen.findByRole('dialog', { name: 'Phiếu đăng nhập — Lớp 7A1' });
    expect(calls.find((c) => c.path === `${BASE}/students` && c.method === 'POST')?.body).toEqual({ fullName: 'Đỗ Minh Khang' });
    const slip = within(slips).getByRole('article', { name: 'Phiếu đăng nhập của Đỗ Minh Khang' });
    expect(within(slip).getByText('HS6Y3RJB')).toBeInTheDocument();
    expect(within(slip).getByText('Zc5gH7rk')).toBeInTheDocument();
    expect(within(slips).getByText(/Mật khẩu tạm chỉ hiện một lần/)).toBeInTheDocument();
    expect(within(slips).getByRole('button', { name: 'In phiếu' })).toBeInTheDocument();

    await user.click(within(slips).getByRole('button', { name: 'Đóng' }));
    const ask = await screen.findByRole('dialog', { name: 'Thầy cô đã in hoặc lưu phiếu chưa?' });
    await user.click(within(ask).getByRole('button', { name: 'Quay lại in' }));
    expect(screen.getByRole('article', { name: 'Phiếu đăng nhập của Đỗ Minh Khang' })).toBeInTheDocument();

    await user.click(within(screen.getByRole('dialog', { name: 'Phiếu đăng nhập — Lớp 7A1' })).getByRole('button', { name: 'Đóng' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Thầy cô đã in hoặc lưu phiếu chưa?' })).getByRole('button', { name: 'Đã in, đóng' }));
    await waitFor(() => expect(screen.queryByText('Zc5gH7rk')).not.toBeInTheDocument());
  });

  it('nhập danh sách dán: xem trước báo dòng trống, trùng họ tên; chỉ lưu các dòng hợp lệ', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) => {
      if (call.path === `${BASE}/students/import/preview`) {
        return envelope(200, {
          data: {
            rows: [
              { rowNumber: 1, fullName: 'Nguyễn Minh Anh', isValid: true, errors: [], warnings: ['Trùng họ tên với học sinh đã có.'] },
              { rowNumber: 2, fullName: null, isValid: false, errors: ['Họ tên đang trống.'], warnings: [] },
              { rowNumber: 3, fullName: 'Võ Thảo Linh', isValid: true, errors: [], warnings: [] },
            ],
            totalRows: 3,
            validCount: 2,
            errorCount: 1,
            warningCount: 1,
            remainingCapacity: 57,
            maxStudents: 60,
          },
        });
      }
      if (call.path === `${BASE}/students/import` && call.method === 'POST') {
        return envelope(201, {
          data: {
            addedCount: 2,
            skippedCount: 1,
            skipped: [{ rowNumber: 2, fullName: null, errors: ['Họ tên đang trống.'] }],
            message: 'Đã thêm 2 học sinh vào lớp 7A1. 1 dòng bị bỏ qua: dòng 2 (Họ tên đang trống).',
            created: {
              students: [],
              sheet: sheetOf([
                { id: 11, name: 'Nguyễn Minh Anh', code: 'HS2R6KDN', password: 'Pq9tM2wa' },
                { id: 12, name: 'Võ Thảo Linh', code: 'HS6Y3RJB', password: 'Zc5gH7rk' },
              ]),
            },
          },
          message: 'Đã thêm 2 học sinh vào lớp 7A1. 1 dòng bị bỏ qua: dòng 2 (Họ tên đang trống).',
        });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Nhập danh sách' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm học sinh vào lớp 7A1' });
    expect(within(dialog).getByRole('tab', { name: 'Nhập danh sách', selected: true })).toBeInTheDocument();
    const save = within(dialog).getByRole('button', { name: 'Lưu các dòng hợp lệ' });
    expect(save).toBeDisabled();

    await user.type(within(dialog).getByLabelText('Hoặc dán họ tên, mỗi dòng một em'), 'Nguyễn Minh Anh{Enter}{Enter}Võ Thảo Linh');
    await user.click(within(dialog).getByRole('button', { name: 'Xem trước' }));

    const preview = await within(dialog).findByRole('table', { name: 'Xem trước danh sách học sinh' });
    expect(within(preview).getByText('Trùng họ tên với học sinh đã có.')).toBeInTheDocument();
    expect(within(preview).getByText('Họ tên đang trống.')).toBeInTheDocument();
    expect(within(dialog).getByText('2 hợp lệ')).toBeInTheDocument();
    expect(within(dialog).getByText('1 bị bỏ qua')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/import/preview'))?.body).toEqual({ text: 'Nguyễn Minh Anh\n\nVõ Thảo Linh' });

    await user.click(save);
    const slips = await screen.findByRole('dialog', { name: 'Phiếu đăng nhập — Lớp 7A1' });
    expect(calls.find((c) => c.path === `${BASE}/students/import` && c.method === 'POST')?.body).toEqual({
      rows: [
        { rowNumber: 1, fullName: 'Nguyễn Minh Anh' },
        { rowNumber: 3, fullName: 'Võ Thảo Linh' },
      ],
    });
    expect(within(slips).getAllByRole('article')).toHaveLength(2);
    expect(await screen.findByText(/1 dòng bị bỏ qua: dòng 2/)).toBeInTheDocument();
  });

  it('nhập danh sách bằng tệp: gửi tệp để xem trước; tệp sai loại bị chặn ngay, không gọi máy chủ', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) =>
      call.path.endsWith('/import/preview')
        ? envelope(200, {
            data: {
              rows: [{ rowNumber: 2, fullName: 'Bùi Khánh Vy', isValid: true, errors: [], warnings: [] }],
              totalRows: 1,
              validCount: 1,
              errorCount: 0,
              warningCount: 0,
              remainingCapacity: 57,
              maxStudents: 60,
            },
          })
        : undefined,
    );
    const user = userEvent.setup({ applyAccept: false });
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Nhập danh sách' }));
    const dialog = await screen.findByRole('dialog', { name: 'Thêm học sinh vào lớp 7A1' });
    const input = within(dialog).getByLabelText('Chọn tệp danh sách học sinh');

    await user.upload(input, new File(['x'], 'danh-sach.docx'));
    expect(await within(dialog).findByText(/chỉ nhận tệp Excel \(\.xlsx\) hoặc CSV UTF-8/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/import/preview'))).toBe(false);

    const csv = new File(['Họ và tên\nBùi Khánh Vy'], 'danh-sach-lop-7A1.csv', { type: 'text/csv' });
    await user.upload(input, csv);
    expect(await within(dialog).findByText('Bùi Khánh Vy')).toBeInTheDocument();
    expect(calls.find((c) => c.path.endsWith('/import/preview'))?.body).toEqual({
      file: { fileName: 'danh-sach-lop-7A1.csv', size: csv.size },
    });
    expect(within(dialog).getByText('danh-sach-lop-7A1.csv · 1 dòng')).toBeInTheDocument();
  });

  it('chọn hai em rồi đặt lại mật khẩu: hộp xác nhận, gửi mã các em, hiện phiếu mới', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) =>
      call.path === `${BASE}/students/reset-password`
        ? envelope(200, {
            data: sheetOf([
              { id: 1, name: 'Nguyễn Minh Anh', code: 'HS8K2QX7', password: 'Tm7kQ4pZ' },
              { id: 2, name: 'Trần Gia Bảo', code: 'HS3F7PLM', password: 'Rb4nW8xe' },
            ]),
            message: 'Đặt lại mật khẩu thành công.',
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('checkbox', { name: 'Chọn Nguyễn Minh Anh' }));
    await user.click(screen.getByRole('checkbox', { name: 'Chọn Trần Gia Bảo' }));
    expect(screen.getByText('2 học sinh đã chọn')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đặt lại mật khẩu' }));

    const confirm = await screen.findByRole('dialog', { name: 'Đặt lại mật khẩu' });
    expect(within(confirm).getByText('Bạn có chắc muốn đặt lại mật khẩu cho 2 học sinh?')).toBeInTheDocument();
    await user.click(within(confirm).getByRole('button', { name: 'Đặt lại mật khẩu' }));

    const slips = await screen.findByRole('dialog', { name: 'Phiếu đăng nhập — Lớp 7A1' });
    expect(calls.find((c) => c.path.endsWith('/reset-password'))?.body).toEqual({ studentIds: [1, 2] });
    expect(within(slips).getByText('Tm7kQ4pZ')).toBeInTheDocument();
    expect(within(slips).getByText('2 học sinh vừa được đặt lại mật khẩu', { exact: false })).toBeInTheDocument();
  });

  it('vô hiệu một em đang hoạt động và mở lại một em đã vô hiệu', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) => {
      if (call.method === 'POST' && /\/students\/\d+\/(de|re)activate$/.test(call.path)) {
        return envelope(200, { data: classStudentOf(1), message: 'Thao tác thành công.' });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Vô hiệu Nguyễn Minh Anh' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Vô hiệu học sinh' })).getByRole('button', { name: 'Vô hiệu' }));
    await waitFor(() => expect(calls.some((c) => c.path === `${BASE}/students/1/deactivate`)).toBe(true));

    await user.click(await screen.findByRole('button', { name: 'Mở lại Lê Ngọc Châu' }));
    await user.click(within(await screen.findByRole('dialog', { name: 'Mở lại học sinh' })).getByRole('button', { name: 'Mở lại' }));
    await waitFor(() => expect(calls.some((c) => c.path === `${BASE}/students/3/reactivate`)).toBe(true));
  });

  it('xóa học sinh đang có bài dở: máy chủ chặn, toast hiện lý do', async () => {
    signInAs('TEACHER');
    const blocked = 'Không thể xóa học sinh. Em đang có bài kiểm tra làm dở.';
    api(three(), (call) => (call.method === 'DELETE' ? envelope(422, { errorCode: ERROR_CODES.blocked, message: blocked }) : undefined));
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Xóa Trần Gia Bảo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xóa học sinh' });
    expect(within(dialog).getByText('Bạn có chắc muốn xóa học sinh "Trần Gia Bảo"?')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Xóa' }));
    expect(await screen.findByText(blocked)).toBeInTheDocument();
  });

  it('sửa họ tên tại chỗ: kiểm họ tên, lưu bằng PUT', async () => {
    signInAs('TEACHER');
    const calls = api(three(), (call) =>
      call.method === 'PUT' && call.path === `${BASE}/students/1`
        ? envelope(200, { data: classStudentOf(1, { fullName: 'Nguyễn Minh Anh B' }), message: 'Lưu học sinh thành công.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/lop/1');

    await user.click(await screen.findByRole('button', { name: 'Sửa họ tên Nguyễn Minh Anh' }));
    const input = await screen.findByLabelText('Họ và tên của HS8K2QX7');
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: 'Lưu họ tên' }));
    expect(await screen.findByText('Vui lòng nhập họ tên.')).toBeInTheDocument();

    await user.type(input, 'Nguyễn Minh Anh B');
    await user.click(screen.getByRole('button', { name: 'Lưu họ tên' }));
    expect(await screen.findByText('Lưu học sinh thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ fullName: 'Nguyễn Minh Anh B' });
  });

  it('lớp đủ sĩ số: khóa Thêm học sinh và Nhập danh sách, báo lý do', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === BASE) return envelope(200, { data: classOf(1, { activeStudentCount: 60 }) });
      if (call.path.startsWith(`${BASE}/students?`)) return envelope(200, { data: studentPage(three(), { activeCount: 60 }) });
      return undefined;
    });
    renderApp('/giao-vien/lop/1');

    expect(await screen.findByText(/Lớp đã đủ 60 học sinh đang hoạt động/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thêm học sinh' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Nhập danh sách' })).toBeDisabled();
  });
});
