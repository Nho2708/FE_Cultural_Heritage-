import { type QuestionBatch, type QuestionDetail } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { lessonOf, quotaOf } from '../../test/lessonFixtures';
import { TYPE_TABLE, accessOf, questionDetailOf } from '../../test/questionFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Sinh và duyệt câu hỏi bằng AI: dạng theo cấp của lớp, hạn mức, danh sách câu chờ duyệt (duyệt, loại, duyệt tất cả), lỗi AI.

function pendingQuestion(id: number, content: string): QuestionDetail {
  return questionDetailOf(id, { content, reviewStatus: 'PENDING', source: 'AI', access: accessOf({ canApprove: true, canReject: true }) });
}

function batchOf(questions: QuestionDetail[], overrides: Partial<QuestionBatch> = {}): QuestionBatch {
  return {
    generationId: 3,
    level: 2,
    levelName: 'Cấp 2',
    requested: 5,
    received: questions.length,
    dropped: 5 - questions.length,
    questions,
    aiQuota: quotaOf({ used: 269, remaining: 31 }),
    model: 'mo-phong',
    message: `AI đã sinh ${questions.length} câu hỏi, đang chờ thầy cô duyệt.`,
    ...overrides,
  };
}

function api(extra?: (call: FetchCall) => Response | undefined, lesson = lessonOf({ id: 5, level: 2 }), quota = quotaOf()) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/teacher/lessons/5') return envelope(200, { data: lesson });
      if (call.path === '/teacher/lessons/5/ai/questions/quota') return envelope(200, { data: quota });
      if (call.path === '/teacher/questions/types') return envelope(200, { data: TYPE_TABLE });
      return undefined;
    },
  );
}

describe('Sinh và duyệt câu hỏi bằng AI', () => {
  it('chỉ liệt kê các dạng của cấp lớp và hiện đồng hồ hạn mức', async () => {
    signInAs('TEACHER');
    api();
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');

    expect(await screen.findByRole('heading', { name: 'Sinh và duyệt câu hỏi bằng AI' })).toBeInTheDocument();
    expect(await screen.findByLabelText('Điền từ')).toBeInTheDocument();
    expect(screen.getByLabelText('Một đáp án đúng')).toBeInTheDocument();
    expect(screen.queryByLabelText('Đọc tư liệu rồi trả lời')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Chọn hình đúng')).not.toBeInTheDocument();
    expect(await screen.findByLabelText('Đã dùng 268 trên 300 lượt')).toBeInTheDocument();
  });

  it('sinh câu gửi số câu, độ khó, dạng và di sản; hiện câu chờ duyệt rồi duyệt từng câu và duyệt tất cả câu còn lại', async () => {
    signInAs('TEACHER');
    const questions = [pendingQuestion(31, 'Câu AI thứ nhất?'), pendingQuestion(32, 'Câu AI thứ hai?'), pendingQuestion(33, 'Câu AI thứ ba?')];
    const calls = api((call) => {
      if (call.method === 'POST' && call.path === '/teacher/lessons/5/ai/questions') return envelope(200, { data: batchOf(questions), message: 'ok' });
      if (call.path === '/teacher/questions/31/approve') return envelope(200, { data: { ...questions[0], reviewStatus: 'APPROVED' }, message: 'Duyệt câu hỏi thành công.' });
      if (call.path === '/teacher/questions/approve') return envelope(200, { data: { approved: [32, 33], skipped: [], message: 'Đã duyệt 2 câu.' } });
      if (call.method === 'GET' && /^\/teacher\/questions\/3[23]$/.test(call.path)) {
        const id = Number(call.path.slice(-2));
        return envelope(200, { data: { ...questions[id - 31], reviewStatus: 'APPROVED' } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');

    await user.clear(await screen.findByLabelText('Số câu'));
    await user.type(screen.getByLabelText('Số câu'), '3');
    await user.selectOptions(screen.getByLabelText('Độ khó'), 'HARD');
    await user.click(screen.getByLabelText('Điền từ'));
    await user.selectOptions(screen.getByLabelText('Di sản'), '11');
    await user.click(screen.getByRole('button', { name: 'Sinh câu hỏi' }));

    const list = await screen.findByRole('region', { name: 'Câu chờ duyệt của lần sinh này' });
    expect(within(list).getByText('Câu AI thứ nhất?')).toBeInTheDocument();
    expect(within(list).getByText(/Yêu cầu 5 câu, nhận 3 câu, 2 câu không đạt quy tắc đã bị bỏ/)).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/lessons/5/ai/questions')?.body).toEqual({
      count: 3,
      difficultyLevel: 'HARD',
      types: ['FILL_BLANK'],
      heritageId: 11,
    });

    await user.click(within(list).getByRole('button', { name: 'Duyệt câu "Câu AI thứ nhất?"' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/teacher/questions/31/approve')).toBe(true));
    expect(await within(list).findByRole('button', { name: 'Duyệt tất cả câu còn lại (2)' })).toBeEnabled();

    await user.click(within(list).getByRole('button', { name: 'Duyệt tất cả câu còn lại (2)' }));
    await waitFor(() => expect(calls.find((c) => c.path === '/teacher/questions/approve')?.body).toEqual({ questionIds: [32, 33] }));
    expect(await within(list).findByRole('button', { name: 'Duyệt tất cả câu còn lại (0)' })).toBeDisabled();
  });

  it('loại một câu gọi máy chủ và câu chuyển sang Bị loại', async () => {
    signInAs('TEACHER');
    const q = pendingQuestion(41, 'Câu cần loại?');
    const calls = api((call) => {
      if (call.method === 'POST' && call.path === '/teacher/lessons/5/ai/questions') return envelope(200, { data: batchOf([q]) });
      if (call.path === '/teacher/questions/41/reject') return envelope(200, { data: { ...q, reviewStatus: 'REJECTED' }, message: 'Loại câu hỏi thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');

    await user.click(await screen.findByRole('button', { name: 'Sinh câu hỏi' }));
    await user.click(await screen.findByRole('button', { name: 'Loại câu "Câu cần loại?"' }));
    await waitFor(() => expect(calls.some((c) => c.path === '/teacher/questions/41/reject')).toBe(true));
    expect(await screen.findByText('Bị loại')).toBeInTheDocument();
  });

  it('AI lỗi: hiện lý do, không có danh sách câu', async () => {
    signInAs('TEACHER');
    const reason = 'Dịch vụ AI tạm thời không phản hồi. Lượt AI không bị tính, thầy cô thử lại sau.';
    api((call) =>
      call.method === 'POST' && call.path === '/teacher/lessons/5/ai/questions' ? envelope(503, { errorCode: 'AI_UNAVAILABLE', message: reason }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');

    await user.click(await screen.findByRole('button', { name: 'Sinh câu hỏi' }));
    expect(await screen.findByText(reason)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Câu chờ duyệt của lần sinh này' })).not.toBeInTheDocument();
  });

  it('trường hết gói: thanh báo và nút Sinh câu hỏi bị khóa', async () => {
    signInAs('TEACHER');
    api(undefined, lessonOf({ id: 5 }), quotaOf({ hasEffectivePlan: false, planName: null, max: null, remaining: null }));
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');

    expect(await screen.findByText(/Trường chưa có gói dịch vụ còn hiệu lực/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sinh câu hỏi' })).toBeDisabled();
  });

  it('bài học đã lưu trữ hoặc hết lượt AI: nút bị khóa kèm lý do', async () => {
    signInAs('TEACHER');
    api(undefined, lessonOf({ id: 5, status: 'ARCHIVED' }));
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');
    expect(await screen.findByText('Bài học đã lưu trữ nên không sinh được câu hỏi.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sinh câu hỏi' })).toBeDisabled();
  });

  it('số câu ngoài 1-20 báo lỗi và khóa nút', async () => {
    signInAs('TEACHER');
    api();
    const user = userEvent.setup();
    renderApp('/giao-vien/bai-hoc/5/sinh-cau-hoi');
    await user.clear(await screen.findByLabelText('Số câu'));
    await user.type(screen.getByLabelText('Số câu'), '25');
    expect(screen.getByText('Nhập số câu từ 1 đến 20.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sinh câu hỏi' })).toBeDisabled();
  });
});
