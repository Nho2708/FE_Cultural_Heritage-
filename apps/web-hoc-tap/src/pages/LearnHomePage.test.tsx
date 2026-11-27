import { STUDENT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { sessionStore } from '../lib/auth/session';
import { classroomOf, envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Trang học của em: ba bản bố cục riêng theo cấp của lớp, dữ liệu lớp lấy từ máy chủ.

describe('Trang học của em — ba bản bố cục theo cấp', () => {
  it('cấp 1: lời chào bằng tên gọi có nút loa, lối phụ "Nhập mã", thẻ Lớp của em, không bảng', async () => {
    const student = studentOf(4, { fullName: 'Trần Minh Khôi' });
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/hoc');

    expect(await screen.findByRole('heading', { level: 1, name: 'Chào Khôi!' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.getByRole('button', { name: 'Nghe lời chào' })).toBeInTheDocument();
    const classBlock = screen.getByRole('region', { name: 'Lớp của em' });
    expect(within(classBlock).getByText('4A1')).toBeInTheDocument();
    expect(within(classBlock).getByText('Trần Văn Bình')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Thầy cô đưa mã bài?' })).getByRole('link', { name: 'Nhập mã' })).toHaveAttribute('href', '/nhap-ma');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('cấp 2: hai cột, đầu trang có họ tên và mã học sinh, khối Lớp của em đủ năm học, giáo viên, trường', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/hoc');

    expect(await screen.findByRole('heading', { level: 1, name: 'Trang học của em' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2');
    expect(screen.getByText('Nguyễn Minh An · HS8K2QX7')).toBeInTheDocument();
    const classBlock = screen.getByRole('region', { name: 'Lớp của em' });
    expect(within(classBlock).getByText('2026-2027')).toBeInTheDocument();
    expect(within(classBlock).getByText('Cấp 2 (Trung học cơ sở)')).toBeInTheDocument();
    expect(within(classBlock).getByText('Trường THCS Nguyễn Du')).toBeInTheDocument();
  });

  it('cấp 3: thanh bên mục lục, danh sách dạng dòng, không linh vật', async () => {
    const student = studentOf(11);
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/hoc');

    expect(await screen.findByRole('navigation', { name: 'Mục lục' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
    expect(screen.getByRole('link', { name: 'Việc cần làm' })).toHaveAttribute('href', '#viec-can-lam');
    await waitFor(() => expect(document.querySelector('figure[data-bo-hinh]')).toHaveAttribute('data-bo-hinh', 'toi-gian'));
    expect(screen.getByText('Cấp 3 (Trung học phổ thông)')).toBeInTheDocument();
  });

  it('giáo viên sửa khối lớp sang cấp khác: trang đổi bố cục và bộ giao diện theo cấp mới', async () => {
    signInAs(studentOf(4));
    mockApi((call) => (call.path === STUDENT_ENDPOINTS.class ? envelope(200, { data: classroomOf(studentOf(8)) }) : undefined));
    renderApp('/hoc');

    await waitFor(() => expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-2'));
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-bo-giao-dien', 'cap-2'));
    expect(sessionStore.getSession()?.user.schoolLevel).toBe(2);
  });

  it('lỗi tải lớp: báo lỗi của máy chủ kèm nút thử lại', async () => {
    signInAs(studentOf(7));
    mockApi((call) =>
      call.path === STUDENT_ENDPOINTS.class
        ? envelope(403, { errorCode: 'STUDENT_ACCOUNT_BLOCKED', message: 'Em hãy báo thầy cô phụ trách lớp.' })
        : undefined,
    );
    renderApp('/hoc');

    expect(await screen.findByText('Em hãy báo thầy cô phụ trách lớp.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument();
  });
});
