import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { createQueryClient } from '../app/queryClient';
import { envelope, mockApi } from '../test/fixtures';
import { introOf } from '../test/quizFixtures';
import { signInAs } from '../test/renderApp';
import { QuizIntroView } from './QuizIntro';

// Hộp thoại bắt đầu bài kiểm tra: nội dung đổi theo cấp, cấp 1 gọi bài kiểm tra là bài chơi nên nút ghi "Bắt đầu chơi".

afterEach(cleanup);

function show(level: 1 | 2 | 3) {
  signInAs();
  mockApi((call) => (call.path.startsWith('/student/quizzes/') ? envelope(200, { data: introOf(level) }) : undefined));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <QuizIntroView quizId={9} code="BH7F3K2Q" onClose={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('nút bắt đầu theo cấp', () => {
  it('cấp 1: nút "Bắt đầu chơi", số câu bằng chữ to, lời nhắc cách chơi của máy chủ, không chữ nhỏ về giờ đóng', async () => {
    show(1);

    expect(await screen.findByRole('button', { name: 'Bắt đầu chơi' })).toBeInTheDocument();
    expect(screen.getByText('Bài chơi có 10 câu')).toBeInTheDocument();
    expect(screen.getByText('Em trả lời từng câu. Chưa đúng thì em được thử lại. Mỗi bài em chơi một lần.')).toBeInTheDocument();
    expect(screen.queryByText(/Đóng lúc/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Bắt đầu' })).not.toBeInTheDocument();
  });

  it('cấp 2 và 3 giữ nút "Bắt đầu"', async () => {
    show(3);

    expect(await screen.findByRole('button', { name: 'Bắt đầu' })).toBeInTheDocument();
    expect(screen.getByText(/Bấm “Bắt đầu” để làm bài\./)).toBeInTheDocument();
  });
});
