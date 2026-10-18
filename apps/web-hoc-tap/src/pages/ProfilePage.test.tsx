import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockApi, studentOf, studentServer } from '../test/fixtures';
import { renderApp, signInAs } from '../test/renderApp';

describe('Trang hồ sơ học sinh — ProfilePage', () => {
  it('cấp 1: giao diện Hộ chiếu Di sản Nhí, có data-bo-cuc="cap-1", tên, mã học sinh, nút loa, thẻ thành tích không điểm số', async () => {
    const student = studentOf(4, { fullName: 'Trần Minh Khôi' });
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/ho-so');

    // 1. Tiêu đề và Tên học sinh
    expect(await screen.findByRole('heading', { level: 1, name: 'Trần Minh Khôi' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(screen.getByText('HỘ CHIẾU DI SẢN NHÍ')).toBeInTheDocument();

    // 2. Mã học sinh
    expect(screen.getAllByText('HS8K2QX7').length).toBeGreaterThanOrEqual(1);

    // 3. Nút loa đọc to
    expect(screen.getByRole('button', { name: 'Nghe thông tin hồ sơ của em' })).toBeInTheDocument();

    // 4. Các thẻ thành tích khích lệ (Sao, Chăm chỉ, Bài học, Huy hiệu)
    expect(screen.getByText('Sao tích lũy')).toBeInTheDocument();
    expect(screen.getByText('Chăm chỉ')).toBeInTheDocument();
    expect(screen.getByText('Bài đã mở')).toBeInTheDocument();
    expect(screen.getByText('Huy hiệu')).toBeInTheDocument();

    // 5. Khối Trường & Lớp của em
    const classBlock = screen.getByRole('region', { name: 'Trường & Lớp của em' });
    expect(within(classBlock).getByText('4A1')).toBeInTheDocument();
    expect(within(classBlock).getByText('Trần Văn Bình')).toBeInTheDocument();

    // 6. Liên kết đổi mật khẩu và về trang học
    const cap1Section = document.querySelector('[data-bo-cuc="cap-1"]')!;
    expect(within(cap1Section as HTMLElement).getByRole('link', { name: /Trang học ▶/ })).toHaveAttribute('href', '/hoc');
    expect(within(cap1Section as HTMLElement).getByRole('link', { name: /Đổi mật khẩu/ })).toHaveAttribute('href', '/doi-mat-khau');
  });

  it('cấp 2: giao diện thẻ học sinh chuẩn mực, có thông tin trường lớp và liên kết xem tiến độ', async () => {
    const student = studentOf(8, { fullName: 'Lê Hoàng Nam' });
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/ho-so');

    expect(await screen.findByRole('heading', { level: 1, name: 'Lê Hoàng Nam' })).toBeInTheDocument();
    expect(screen.getByText(/Mã học sinh:/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Thông tin lớp học' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem tiến độ' })).toHaveAttribute('href', '/tien-do');
    expect(screen.getByRole('link', { name: /Đổi mật khẩu/ })).toHaveAttribute('href', '/doi-mat-khau');
  });
});
