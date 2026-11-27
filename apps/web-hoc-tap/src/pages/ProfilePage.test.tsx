import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ATTEMPT_ENDPOINTS } from '@dsvhvn/dung-chung/api';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { homeOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

describe('Trang hồ sơ học sinh — ProfilePage', () => {
  it('cấp 1: giao diện Thẻ học sinh của em, có data-bo-cuc="cap-1", tên, mã học sinh, nút loa, ba ô thành tích không điểm số', async () => {
    const student = studentOf(4, { fullName: 'Trần Minh Khôi' });
    signInAs(student);
    mockApi(studentServer(student));
    renderApp('/ho-so');

    // 1. Tiêu đề và Tên học sinh
    expect(await screen.findByRole('heading', { level: 1, name: 'Trần Minh Khôi' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    expect(within(document.querySelector<HTMLElement>('[data-bo-cuc="cap-1"]')!).getByText('Thẻ học sinh của em')).toBeInTheDocument();

    // 2. Mã học sinh
    expect(screen.getAllByText('HS8K2QX7').length).toBeGreaterThanOrEqual(1);

    // 3. Nút loa đọc to
    expect(screen.getByRole('button', { name: 'Nghe thông tin hồ sơ của em' })).toBeInTheDocument();

    // 4. Các ô thành tích khích lệ (Sao, Ngày đã học, Huy hiệu)
    expect(screen.getByText('Sao tích lũy')).toBeInTheDocument();
    expect(screen.getByText('Ngày đã học')).toBeInTheDocument();
    expect(screen.getByText('Huy hiệu')).toBeInTheDocument();

    // 5. Khối Trường & Lớp của em
    const classBlock = screen.getByRole('region', { name: 'Trường & Lớp của em' });
    expect(within(classBlock).getByText('4A1')).toBeInTheDocument();
    expect(within(classBlock).getByText('Trần Văn Bình')).toBeInTheDocument();

    // 6. Liên kết đổi mật khẩu và về trang học
    const cap1Section = document.querySelector('[data-bo-cuc="cap-1"]')!;
    expect(within(cap1Section as HTMLElement).getByRole('link', { name: /Về trang học/ })).toHaveAttribute('href', '/hoc');
    expect(within(cap1Section as HTMLElement).getByRole('link', { name: /Đổi mật khẩu/ })).toHaveAttribute('href', '/doi-mat-khau');
  });

  it('cấp 1: ô "Ngày đã học" hiện số ngày của máy chủ, không còn chữ "Chăm chỉ" và không có biểu tượng cảm xúc', async () => {
    const student = studentOf(4, { fullName: 'Trần Minh Khôi' });
    signInAs(student);
    mockApi((call) => (call.path === ATTEMPT_ENDPOINTS.home ? envelope(200, { data: homeOf(1, { totalStars: 24, streakDays: 12 }) }) : undefined), studentServer(student));
    renderApp('/ho-so');

    await screen.findByRole('heading', { level: 1, name: 'Trần Minh Khôi' });
    const days = (await screen.findByText('Ngày đã học')).closest('a')!;
    expect(days).toHaveTextContent('12');
    expect(days).toHaveAttribute('href', '/tien-do');
    expect(screen.getByText('Sao tích lũy').closest('a')).toHaveTextContent('24');
    expect(screen.queryByText(/chăm chỉ/i)).not.toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc="cap-1"]')!.textContent).not.toMatch(/\p{Extended_Pictographic}/u);
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
    expect(screen.getByText('Bài học')).toBeInTheDocument();
    expect(screen.getByText('Bài kiểm tra chờ')).toBeInTheDocument();
  });
});
