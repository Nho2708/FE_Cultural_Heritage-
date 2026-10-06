import { ATTEMPT_ENDPOINTS, type SchoolLevel, type StudentHome } from '@dsvhvn/dung-chung/api';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, studentOf, studentServer } from '../test/fixtures';
import { homeOf } from '../test/quizFixtures';
import { renderApp, signInAs } from '../test/renderApp';

// Các khối học tập của trang học: lượt đang làm dở, bài kiểm tra còn mở (nhãn "Cần mã bài học"), bài học của em, huy hiệu gần đây.

function open(level: SchoolLevel, home: StudentHome) {
  const student = studentOf(level === 1 ? 4 : level === 3 ? 11 : 7);
  signInAs(student);
  mockApi((call) => (call.path === ATTEMPT_ENDPOINTS.home ? envelope(200, { data: home }) : undefined), studentServer(student));
  return renderApp('/hoc');
}

const full = (level: SchoolLevel) =>
  homeOf(level, {
    inProgress: [{ attemptId: 31, quizId: 9, quizName: 'Kiểm tra nhanh: Nhã nhạc', lessonId: 5, lessonTitle: 'Ngọ Môn', startedAt: '2026-10-06T08:00:00Z', deadline: null, remainingSeconds: 552 }],
    openQuizzes: [
      { quizId: 9, name: 'Kiểm tra 15 phút: Kinh thành Huế', lessonId: 5, lessonTitle: 'Ngọ Môn', openAt: null, closeAt: '2026-10-30T10:00:00Z', timeLimitMinutes: 15, questionCount: 10, needsLessonCode: false, label: null },
      { quizId: 12, name: 'Kiểm tra 15 phút: Hội An', lessonId: 8, lessonTitle: 'Đô thị cổ Hội An', openAt: null, closeAt: null, timeLimitMinutes: 15, questionCount: 8, needsLessonCode: true, label: 'Cần mã bài học' },
    ],
    myLessons: [{ lessonId: 5, title: 'Ngọ Môn và Kinh thành Huế', accessCode: 'BH7F3K2Q', quizzesDone: 1, quizzesPublished: 2, lastAttemptAt: '2026-09-29T01:00:00Z' }],
    recentBadges: [{ code: 'EXCELLENT', name: 'Xuất sắc', attemptId: 3, quizName: 'Ôn tập: Hoàng thành', earnedAt: '2026-09-25T07:00:00Z' }],
  });

describe('Trang học — các khối học tập', () => {
  it('cấp 2: lượt đang làm dở (Làm tiếp), bài kiểm tra đang chờ kèm nhãn Cần mã bài học, bài học của em có tiến độ, huy hiệu gần đây', async () => {
    open(2, full(2));
    const waiting = await screen.findByRole('region', { name: 'Bài kiểm tra đang chờ em' });
    expect(within(waiting).getByText('Đang mở')).toBeInTheDocument();
    expect(within(waiting).getByText('Cần mã bài học')).toBeInTheDocument();
    expect(within(waiting).getByRole('link', { name: 'Làm bài' })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q/kiem-tra/9');
    // Bài chưa có mã: dẫn về ô nhập mã, không đoán đường dẫn.
    expect(within(waiting).getByRole('link', { name: 'Nhập mã bài học' })).toHaveAttribute('href', '/nhap-ma');

    const doing = screen.getByRole('region', { name: 'Bài em đang làm dở' });
    expect(within(doing).getByText('Còn 9 phút 12 giây')).toBeInTheDocument();
    expect(within(doing).getByRole('link', { name: 'Làm tiếp' })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q/kiem-tra/9');

    const lessons = screen.getByRole('region', { name: 'Bài học của em' });
    expect(within(lessons).getByText('1 / 2')).toBeInTheDocument();
    expect(within(lessons).getByRole('link', { name: 'Mở bài học' })).toHaveAttribute('href', '/bai-hoc/BH7F3K2Q');
    const badges = screen.getByRole('region', { name: 'Huy hiệu gần đây' });
    expect(within(badges).getByText('Xuất sắc')).toBeInTheDocument();
  });

  it('cấp 1: thẻ lớn "Bài chơi đang chờ em" có nút Làm bài; cấp 3: danh sách dạng dòng', async () => {
    const first = open(1, full(1));
    const waiting = await screen.findByRole('region', { name: 'Bài chơi đang chờ em' });
    expect(within(waiting).getByRole('link', { name: 'Làm bài' })).toBeInTheDocument();
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-1');
    first.unmount();

    open(3, full(3));
    const rows = await screen.findByRole('region', { name: 'Bài kiểm tra đang chờ em' });
    expect(within(rows).getAllByRole('listitem')).toHaveLength(2);
    expect(document.querySelector('[data-bo-cuc]')).toHaveAttribute('data-bo-cuc', 'cap-3');
  });

  it('học sinh mới chưa có gì: câu nhắc nhập mã bài học', async () => {
    open(2, homeOf(2));
    expect(await screen.findByText('Em chưa có bài làm nào. Em hãy nhập mã bài học thầy cô đưa để bắt đầu học.')).toBeInTheDocument();
  });

  it('không tải được: báo lỗi có nút Thử lại, phần thông tin lớp vẫn hiện', async () => {
    const student = studentOf(7);
    signInAs(student);
    mockApi((call) => (call.path === ATTEMPT_ENDPOINTS.home ? envelope(500, { errorCode: 'SYSTEM_ERROR', message: 'Hệ thống đang gặp sự cố.' }) : undefined), studentServer(student));
    renderApp('/hoc');
    expect(await screen.findByRole('button', { name: 'Thử lại' }, { timeout: 4000 })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Lớp của em' })).toBeInTheDocument();
  });
});
