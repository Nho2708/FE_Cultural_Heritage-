import { ERROR_CODES, type QuizDetail } from '@dsvhvn/dung-chung/api';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { pageOf, previewOf } from '../../test/questionFixtures';
import { candidateOf, candidatePageOf, publishedQuizOf, quizOf, quizQuestionOf } from '../../test/quizFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Soạn và phát hành bài kiểm tra: thông tin chung theo cấp, danh sách câu (điểm, thứ tự, bỏ câu, thêm từ ngân hàng), xem trước như học
// sinh, phát hành (lưu rồi xác nhận, thiếu điều kiện), bài đã phát hành bị khóa, đóng.

const THREE = [quizQuestionOf(101, 1), quizQuestionOf(102, 2, { point: 2, typeName: 'Đúng - Sai' }), quizQuestionOf(103, 3)];

/** API giả giữ bài kiểm tra hiện tại để các lần ghi trả về chi tiết mới. */
function api(initial: QuizDetail, extra?: (call: FetchCall, current: () => QuizDetail, set: (next: QuizDetail) => void) => Response | undefined) {
  let current = initial;
  const set = (next: QuizDetail) => {
    current = next;
  };
  const calls = mockApi(
    (call) => extra?.(call, () => current, set),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === `/teacher/quizzes/${initial.id}` && call.method === 'GET') return envelope(200, { data: current });
      if (call.path === `/teacher/quizzes/${initial.id}` && call.method === 'PUT') {
        const body = call.body as Partial<QuizDetail>;
        current = { ...current, ...body, updatedAt: '2026-10-06T03:00:00Z' };
        return envelope(200, { data: current });
      }
      if (call.path.startsWith('/teacher/quizzes?')) return envelope(200, { data: pageOf([]) });
      if (call.path.startsWith('/teacher/questions/') && call.path.includes('/preview')) return envelope(200, { data: previewOf({ content: `Xem trước ${call.path}` }) });
      return undefined;
    },
  );
  return calls;
}

const draft = (overrides: Partial<QuizDetail> & { level?: 1 | 2 | 3 } = {}) => quizOf({ questions: THREE, ...overrides });

describe('Soạn bài kiểm tra: thông tin chung', () => {
  it('hiện tên, bài học chỉ đọc kèm lớp và cấp, mô tả, độ khó, thời gian, giờ mở đóng, hai công tắc và tổng điểm', async () => {
    signInAs('TEACHER');
    api(draft());
    renderApp('/giao-vien/kiem-tra/9');

    expect(await screen.findByRole('heading', { level: 1, name: 'Kiểm tra 15 phút: Kinh thành Huế' })).toBeInTheDocument();
    expect(screen.getByText(/Bài học: Ngọ Môn và Kinh thành Huế · Lớp 7A1 · Cấp 2 · sửa lần cuối 21:10 05\/10\/2026/)).toBeInTheDocument();
    expect(screen.getByLabelText('Tên bài kiểm tra *')).toHaveValue('Kiểm tra 15 phút: Kinh thành Huế');
    expect(screen.getByLabelText('Bài học')).toHaveValue('Ngọ Môn và Kinh thành Huế · Lớp 7A1 · Cấp 2');
    expect(screen.getByLabelText('Bài học')).toBeDisabled();
    expect(screen.getByLabelText('Mô tả / hướng dẫn')).toHaveValue('Các em đọc kỹ từng câu.');
    expect(screen.getByLabelText('Độ khó')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('Thời gian làm (phút)')).toHaveValue('15');
    expect(screen.getByLabelText('Mở lúc *')).toHaveValue('07:00 06/10/2026');
    expect(screen.getByLabelText('Đóng lúc *')).toHaveValue('17:00 07/10/2026');
    expect(screen.getByRole('switch', { name: /Xáo câu/ })).toBeChecked();
    expect(screen.getByRole('switch', { name: /Cho xem đáp án sau khi nộp/ })).not.toBeChecked();
    expect(screen.getByText('Danh sách câu hỏi (3 câu)')).toBeInTheDocument();
    expect(screen.getByText(/Tổng điểm tự tính: 4 điểm · chỉ thêm được câu đã duyệt có dạng dùng được ở lớp cấp 2/)).toBeInTheDocument();
    expect(screen.getByLabelText('Điểm câu 2')).toHaveValue('2');
  });

  it('lớp cấp 1: ô thời gian làm bị khóa, ghi "Không đồng hồ"; học sinh thấy sao thay cho điểm', async () => {
    signInAs('TEACHER');
    api(draft({ level: 1, timeLimitMinutes: null }));
    renderApp('/giao-vien/kiem-tra/9');

    const time = await screen.findByLabelText('Thời gian làm (phút)');
    expect(time).toBeDisabled();
    expect(time).toHaveAttribute('placeholder', 'Không đồng hồ');
    expect(screen.getByText(/Lớp cấp 1 làm bài không giới hạn thời gian; ô này bị khóa/)).toBeInTheDocument();
    expect(screen.getByText(/học sinh cấp 1 thấy sao thay cho điểm/)).toBeInTheDocument();
  });

  it('lớp cấp 3: thời gian làm bắt buộc khi phát hành; để trống thì báo lỗi dưới ô và không gọi máy chủ', async () => {
    signInAs('TEACHER');
    const calls = api(draft({ level: 3, timeLimitMinutes: null }));
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    expect(await screen.findByLabelText('Thời gian làm (phút) *')).toBeEnabled();
    await user.click(screen.getByRole('button', { name: 'Phát hành' }));
    expect(await screen.findByText('Lớp cấp 3 bắt buộc nhập thời gian làm.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT' || c.path.endsWith('/publish'))).toBe(false);

    await user.type(screen.getByLabelText('Thời gian làm (phút) *'), '45');
    await waitFor(() => expect(screen.queryByText('Lớp cấp 3 bắt buộc nhập thời gian làm.')).not.toBeInTheDocument());
  });

  it('Lưu gửi đủ mọi trường, giờ giữ nguyên mốc cũ của máy chủ, giờ mới có độ lệch +07:00', async () => {
    signInAs('TEACHER');
    const calls = api(draft());
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    const save = await screen.findByRole('button', { name: 'Lưu' });
    expect(save).toBeDisabled();
    await user.clear(screen.getByLabelText('Tên bài kiểm tra *'));
    await user.type(screen.getByLabelText('Tên bài kiểm tra *'), 'Kiểm tra giữa kỳ');
    await user.clear(screen.getByLabelText('Đóng lúc *'));
    await user.type(screen.getByLabelText('Đóng lúc *'), '18:30 07/10/2026');
    await user.click(screen.getByRole('switch', { name: /Cho xem đáp án sau khi nộp/ }));
    await user.click(save);

    expect(await screen.findByText('Lưu bài kiểm tra thành công.')).toBeInTheDocument();
    expect(calls.find((c) => c.method === 'PUT' && c.path === '/teacher/quizzes/9')?.body).toEqual({
      name: 'Kiểm tra giữa kỳ',
      description: 'Các em đọc kỹ từng câu.',
      difficultyLevel: 'MEDIUM',
      timeLimitMinutes: 15,
      openAt: '2026-10-06T00:00:00Z',
      closeAt: '2026-10-07T18:30:00+07:00',
      shuffleQuestions: true,
      showAnswersAfterSubmit: true,
    });
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu' })).toBeDisabled());
  });

  it('tên trống, giờ sai dạng, giờ đóng trước giờ mở: báo lỗi theo ô, không gọi máy chủ', async () => {
    signInAs('TEACHER');
    const calls = api(draft());
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.clear(await screen.findByLabelText('Tên bài kiểm tra *'));
    await user.clear(screen.getByLabelText('Mở lúc *'));
    await user.type(screen.getByLabelText('Mở lúc *'), '6/10/2026');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    expect(await screen.findByText('Vui lòng nhập tên bài kiểm tra.')).toBeInTheDocument();
    expect(screen.getByText(/giờ:phút ngày\/tháng\/năm, ví dụ 07:00 06\/10\/2026/)).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);

    await user.type(screen.getByLabelText('Tên bài kiểm tra *'), 'Tên mới');
    await user.clear(screen.getByLabelText('Mở lúc *'));
    await user.type(screen.getByLabelText('Mở lúc *'), '18:00 07/10/2026');
    expect(await screen.findByText('Giờ đóng phải sau giờ mở.')).toBeInTheDocument();
  });

  it('lỗi theo trường của máy chủ hiện dưới đúng ô', async () => {
    signInAs('TEACHER');
    api(draft(), (call) =>
      call.method === 'PUT' && call.path === '/teacher/quizzes/9'
        ? envelope(400, { errorCode: ERROR_CODES.invalid, message: 'Thời gian làm bài không hợp lệ.', errors: { timeLimitMinutes: 'Thời gian làm bài không hợp lệ: từ 1 đến 180 phút.' } })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.type(await screen.findByLabelText('Mô tả / hướng dẫn'), ' Thêm.');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Thời gian làm bài không hợp lệ: từ 1 đến 180 phút.')).toBeInTheDocument();
  });
});

describe('Soạn bài kiểm tra: danh sách câu', () => {
  it('đổi điểm một câu gửi cả danh sách theo thứ tự hiện tại; điểm sai bước bị chặn ngay trên giao diện', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call, current, set) => {
      if (call.method === 'PUT' && call.path === '/teacher/quizzes/9/questions') {
        const items = (call.body as { items: Array<{ questionId: number; point: number }> }).items;
        const next = quizOf({ questions: items.map((item, i) => ({ ...current().questions.find((q) => q.questionId === item.questionId)!, point: item.point, sortOrder: i + 1 })) });
        set(next);
        return envelope(200, { data: next });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    const second = await screen.findByLabelText('Điểm câu 3');
    await user.clear(second);
    await user.type(second, '0,1');
    await user.tab();
    expect(await screen.findByText('Điểm lớn hơn 0, không quá 100, theo bước 0,25.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/questions'))).toBe(false);

    await user.clear(second);
    await user.type(second, '2,5');
    await user.tab();
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/questions'))).toBe(true));
    expect(calls.find((c) => c.method === 'PUT' && c.path.endsWith('/questions'))?.body).toEqual({
      items: [
        { questionId: 101, point: 1 },
        { questionId: 102, point: 2 },
        { questionId: 103, point: 2.5 },
      ],
    });
    expect(await screen.findByText(/Tổng điểm tự tính: 5,5 điểm/)).toBeInTheDocument();
  });

  it('đổi thứ tự bằng phím mũi tên trên tay nắm gửi thứ tự mới', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call, current, set) => {
      if (call.method === 'PUT' && call.path === '/teacher/quizzes/9/questions') {
        const items = (call.body as { items: Array<{ questionId: number; point: number }> }).items;
        const next = quizOf({ questions: items.map((item, i) => ({ ...current().questions.find((q) => q.questionId === item.questionId)!, sortOrder: i + 1 })) });
        set(next);
        return envelope(200, { data: next });
      }
      return undefined;
    });
    renderApp('/giao-vien/kiem-tra/9');

    fireEvent.keyDown(await screen.findByRole('button', { name: /Đổi thứ tự "Câu 1"/ }), { key: 'ArrowDown' });
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path.endsWith('/questions'))).toBe(true));
    const replaced = calls.find((c) => c.method === 'PUT' && c.path.endsWith('/questions'));
    expect((replaced!.body as { items: Array<{ questionId: number }> }).items.map((i) => i.questionId)).toEqual([102, 101, 103]);
    await waitFor(() => expect(screen.getByTestId('cau-1')).toHaveTextContent('Câu hỏi số 102'));
  });

  it('bỏ câu: gọi máy chủ, các câu còn lại đánh lại thứ tự', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call, current, set) => {
      if (call.method === 'DELETE' && call.path === '/teacher/quizzes/9/questions/102') {
        const next = quizOf({ questions: current().questions.filter((q) => q.questionId !== 102).map((q, i) => ({ ...q, sortOrder: i + 1 })) });
        set(next);
        return envelope(200, { data: next });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Bỏ câu 2 khỏi bài kiểm tra' }));
    await waitFor(() => expect(screen.getByText('Danh sách câu hỏi (2 câu)')).toBeInTheDocument());
    expect(calls.some((c) => c.method === 'DELETE' && c.path === '/teacher/quizzes/9/questions/102')).toBe(true);
    expect(screen.getByTestId('cau-2')).toHaveTextContent('Câu hỏi số 103');
  });

  it('câu không dùng được ở cấp của lớp: hàng đỏ kèm lý do, thanh thiếu điều kiện, liên kết "Xem câu số"', async () => {
    signInAs('TEACHER');
    const questions = [
      quizQuestionOf(101, 1),
      quizQuestionOf(102, 2, { isUsable: false, unusableReason: 'Câu hỏi dạng "Ghép cặp" không dùng được ở lớp cấp 3.', typeName: 'Ghép cặp' }),
    ];
    api(
      quizOf({
        level: 3,
        questions,
        timeLimitMinutes: null,
        readiness: { isReady: false, missing: ['thời gian làm bài', '1 câu hỏi không dùng được'], warnings: [] },
        access: { canEditSettings: true, canEditCloseTime: true, canEditQuestions: true, canPublish: false, canClose: false, canDelete: true, canDuplicate: true },
      }),
    );
    renderApp('/giao-vien/kiem-tra/9');

    expect(await screen.findByText(/Chưa đủ điều kiện phát hành\. Còn thiếu: thời gian làm bài; 1 câu hỏi không dùng được\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xem câu số 2' })).toHaveAttribute('href', '#cau-2');
    const row = screen.getByTestId('cau-2');
    expect(within(row).getByText(/Câu hỏi dạng "Ghép cặp" không dùng được ở lớp cấp 3\. Bấm dấu x để bỏ câu này khỏi bài kiểm tra\./)).toBeInTheDocument();
  });

  it('thêm câu từ ngân hàng: chỉ câu hợp cấp, câu đã có hiện mờ, chọn nhiều rồi thêm; một lần gọi', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call, current, set) => {
      if (call.path.startsWith('/teacher/quizzes/9/question-candidates'))
        return envelope(200, {
          data: candidatePageOf([candidateOf(101, { inQuiz: true }), candidateOf(201), candidateOf(202, { question: { ...candidateOf(202).question, typeName: 'Đúng - Sai', content: 'Khuê Văn Các dựng thời Nguyễn.' } })]),
        });
      if (call.method === 'POST' && call.path === '/teacher/quizzes/9/questions') {
        const ids = (call.body as { questionIds: number[] }).questionIds;
        const next = quizOf({ questions: [...current().questions, ...ids.map((id, i) => quizQuestionOf(id, 4 + i))] });
        set(next);
        return envelope(200, { data: next });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Thêm câu từ ngân hàng' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn câu từ ngân hàng' });
    expect(await within(dialog).findByText(/Chỉ hiện câu có dạng dùng được ở lớp cấp 2 \(Một đáp án đúng, Đúng\/Sai, Sắp xếp, Điền từ\)/)).toBeInTheDocument();
    expect(calls.find((c) => c.path.includes('question-candidates'))?.path).toContain('lessonHeritagesOnly=true');
    const existing = within(dialog).getByRole('checkbox', { name: /Chọn câu: Câu hỏi số 101/ });
    expect(existing).toBeChecked();
    expect(existing).toBeDisabled();
    expect(within(dialog).getByText('Đã có trong bài kiểm tra')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Thêm vào bài kiểm tra' })).toBeDisabled();

    await user.click(within(dialog).getByRole('checkbox', { name: /Chọn câu: Câu hỏi số 201/ }));
    await user.click(within(dialog).getByRole('checkbox', { name: /Chọn câu: Khuê Văn Các/ }));
    expect(within(dialog).getByText('Đã chọn 2 câu')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Thêm vào bài kiểm tra' }));

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Chọn câu từ ngân hàng' })).not.toBeInTheDocument());
    expect(calls.filter((c) => c.method === 'POST' && c.path === '/teacher/quizzes/9/questions')).toHaveLength(1);
    expect(calls.find((c) => c.method === 'POST' && c.path === '/teacher/quizzes/9/questions')?.body).toEqual({ questionIds: [201, 202] });
    expect(await screen.findByText('Danh sách câu hỏi (5 câu)')).toBeInTheDocument();
  });

  it('hộp chọn câu: bỏ lọc di sản của bài, lọc độ khó, dạng câu và từ khóa gửi đúng tham số; câu không khớp thì báo rỗng', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call) =>
      call.path.startsWith('/teacher/quizzes/9/question-candidates') ? envelope(200, { data: candidatePageOf([]) }) : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Thêm câu từ ngân hàng' }));
    const dialog = await screen.findByRole('dialog', { name: 'Chọn câu từ ngân hàng' });
    expect(await within(dialog).findByText(/Không tìm thấy kết quả phù hợp/)).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: /Di sản của bài/ }));
    await user.selectOptions(within(dialog).getByLabelText('Độ khó'), 'HARD');
    await user.selectOptions(within(dialog).getByLabelText('Dạng câu'), 'FILL_BLANK');
    await user.type(within(dialog).getByLabelText('Từ khóa'), 'văn miếu{enter}');

    await waitFor(() => {
      const last = decodeURIComponent(calls.filter((c) => c.path.includes('question-candidates')).at(-1)?.path ?? '');
      expect(last).toContain('lessonHeritagesOnly=false');
      expect(last).toContain('difficultyLevel=HARD');
      expect(last).toContain('questionType=FILL_BLANK');
      expect(last).toContain('keyword=văn+miếu');
    });
  });

  it('xem trước như học sinh: mở từng câu theo cấp của lớp và duyệt câu trước, câu sau', async () => {
    signInAs('TEACHER');
    const calls = api(draft());
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Xem trước như học sinh' }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem trước như học sinh' });
    expect(await within(dialog).findByText(/Xem trước \/teacher\/questions\/101\/preview\?level=2/)).toBeInTheDocument();
    expect(within(dialog).getByText('Câu 1/3 · 1 điểm')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /Câu trước/ })).toBeDisabled();

    await user.click(within(dialog).getByRole('button', { name: /Câu sau/ }));
    expect(await within(dialog).findByText(/preview\?level=2/)).toBeInTheDocument();
    expect(within(dialog).getByText('Câu 2/3 · 2 điểm')).toBeInTheDocument();
    expect(calls.some((c) => c.path === '/teacher/questions/102/preview?level=2')).toBe(true);
    await user.click(within(dialog).getAllByRole('button', { name: 'Đóng' }).at(-1)!);
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Xem trước như học sinh' })).not.toBeInTheDocument());
  });
});

describe('Phát hành và đóng', () => {
  it('phát hành: hỏi xác nhận có lời nhắc khóa danh sách, phát hành xong nhắc đưa mã bài học cho lớp', async () => {
    signInAs('TEACHER');
    const calls = api(draft(), (call, current, set) => {
      if (call.method === 'POST' && call.path === '/teacher/quizzes/9/publish') {
        const next = publishedQuizOf({ questions: current().questions });
        set(next);
        return envelope(200, { data: { quiz: next, message: 'Đã phát hành bài kiểm tra "Kiểm tra 15 phút: Kinh thành Huế". Học sinh lớp 7A1 làm bài qua mã bài học BH7F3K2Q.' } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Phát hành' }));
    const confirm = await screen.findByRole('dialog', { name: 'Phát hành bài kiểm tra?' });
    expect(within(confirm).getByText(/Sau khi phát hành, danh sách câu hỏi và điểm sẽ bị khóa\. Học sinh lớp 7A1 làm được bài kiểm tra qua mã bài học BH7F3K2Q/)).toBeInTheDocument();
    expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(false);
    await user.click(within(confirm).getByRole('button', { name: 'Phát hành' }));

    expect(await screen.findByText(/Đã phát hành bài kiểm tra "Kiểm tra 15 phút: Kinh thành Huế"/)).toBeInTheDocument();
    const code = await screen.findByRole('dialog', { name: 'Mã bài học' });
    expect(within(code).getByTestId('ma-bai-hoc')).toHaveTextContent('BH7F3K2Q');
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Phát hành' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Đóng bài kiểm tra' })).toBeInTheDocument();
  });

  it('có chỉnh sửa chưa lưu: Phát hành lưu trước rồi mới hỏi xác nhận', async () => {
    signInAs('TEACHER');
    const calls = api(draft());
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.type(await screen.findByLabelText('Mô tả / hướng dẫn'), ' Chúc các em làm bài tốt.');
    await user.click(screen.getByRole('button', { name: 'Phát hành' }));
    await screen.findByRole('dialog', { name: 'Phát hành bài kiểm tra?' });
    const order = calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path}`);
    expect(order).toEqual(['PUT /teacher/quizzes/9']);
    const saved = calls.find((c) => c.method === 'PUT');
    expect((saved!.body as { description: string }).description).toBe('Các em đọc kỹ từng câu. Chúc các em làm bài tốt.');
  });

  it('chưa đủ điều kiện: liệt kê đủ một lượt ngay dưới thanh thao tác, bài học chưa xuất bản có liên kết "Mở bài học", không hỏi xác nhận', async () => {
    signInAs('TEACHER');
    api(
      draft({
        lessonStatus: 'DRAFT',
        lessonAccessCode: null,
        readiness: { isReady: false, missing: ['bài học của bài kiểm tra chưa xuất bản'], warnings: [] },
        access: { canEditSettings: true, canEditCloseTime: true, canEditQuestions: true, canPublish: false, canClose: false, canDelete: true, canDuplicate: true },
      }),
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Phát hành' }));
    expect(await screen.findByText('Chưa đủ điều kiện phát hành. Còn thiếu: bài học của bài kiểm tra chưa xuất bản.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mở bài học' })).toHaveAttribute('href', '/giao-vien/bai-hoc/5');
    expect(screen.queryByRole('dialog', { name: 'Phát hành bài kiểm tra?' })).not.toBeInTheDocument();
  });

  it('máy chủ từ chối phát hành (422): hiện lý do máy chủ trên trang', async () => {
    signInAs('TEACHER');
    api(draft(), (call) =>
      call.path === '/teacher/quizzes/9/publish'
        ? envelope(422, { errorCode: ERROR_CODES.notReady, message: 'Chưa đủ điều kiện phát hành bài kiểm tra. Còn thiếu: giờ đóng phải sau thời điểm hiện tại.' })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Phát hành' }));
    const confirm = await screen.findByRole('dialog', { name: 'Phát hành bài kiểm tra?' });
    await user.click(within(confirm).getByRole('button', { name: 'Phát hành' }));
    expect(await screen.findByText(/Còn thiếu: giờ đóng phải sau thời điểm hiện tại\./)).toBeInTheDocument();
  });

  it('bài đã phát hành: khóa danh sách câu, bài học, thời gian, giờ mở, hai công tắc; còn sửa tên, mô tả, giờ đóng', async () => {
    signInAs('TEACHER');
    const calls = api(publishedQuizOf({ questions: THREE }));
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    expect(await screen.findByText(/Bài kiểm tra đã phát hành: danh sách câu, điểm, thứ tự/)).toBeInTheDocument();
    expect(screen.getByTestId('thanh-trang-thai')).toHaveTextContent('18/32 em đã nộp');
    expect(screen.queryByRole('button', { name: 'Phát hành' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Thêm câu từ ngân hàng' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Điểm câu 1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Bỏ câu 1/ })).not.toBeInTheDocument();
    expect(screen.getByLabelText('Độ khó')).toBeDisabled();
    expect(screen.getByLabelText('Thời gian làm (phút)')).toBeDisabled();
    expect(screen.getByLabelText('Mở lúc *')).toBeDisabled();
    expect(screen.getByRole('switch', { name: /Xáo câu/ })).toBeDisabled();
    expect(screen.getByLabelText('Tên bài kiểm tra *')).toBeEnabled();
    expect(screen.getByLabelText('Mô tả / hướng dẫn')).toBeEnabled();
    expect(screen.getByLabelText('Đóng lúc *')).toBeEnabled();

    await user.clear(screen.getByLabelText('Đóng lúc *'));
    await user.type(screen.getByLabelText('Đóng lúc *'), '21:00 08/10/2026');
    await user.click(screen.getByRole('button', { name: 'Lưu' }));
    await screen.findByText('Lưu bài kiểm tra thành công.');
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({
      timeLimitMinutes: 15,
      openAt: '2026-10-06T00:00:00Z',
      closeAt: '2026-10-08T21:00:00+07:00',
      shuffleQuestions: true,
      showAnswersAfterSubmit: false,
      difficultyLevel: 'MEDIUM',
    });
  });

  it('đóng bài đang phát hành: hỏi xác nhận không mở lại được, rồi thanh trạng thái chuyển sang Đã đóng', async () => {
    signInAs('TEACHER');
    const calls = api(publishedQuizOf({ questions: THREE }), (call, current, set) => {
      if (call.method === 'POST' && call.path === '/teacher/quizzes/9/close') {
        const next = publishedQuizOf({
          questions: current().questions,
          status: 'CLOSED',
          statusLabel: 'Đã đóng',
          openState: 'ENDED',
          access: { canEditSettings: false, canEditCloseTime: false, canEditQuestions: false, canPublish: false, canClose: false, canDelete: false, canDuplicate: true },
        });
        set(next);
        return envelope(200, { data: { quiz: next, expiredAttempts: 1, message: 'Đã đóng bài kiểm tra. 1 lượt làm dở đã được tự nộp.' } });
      }
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Đóng bài kiểm tra' }));
    const dialog = await screen.findByRole('dialog', { name: /Đóng bài kiểm tra "Kiểm tra 15 phút/ });
    expect(within(dialog).getByText(/không mở lại được/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Đóng bài kiểm tra' }));

    expect(await screen.findByText('Đã đóng bài kiểm tra. 1 lượt làm dở đã được tự nộp.')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/quizzes/9/close')).toBe(true);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Đóng bài kiểm tra' })).not.toBeInTheDocument());
    expect(screen.getByLabelText('Tên bài kiểm tra *')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument();
    expect(screen.getByText(/Bài kiểm tra đã đóng và không mở lại được/)).toBeInTheDocument();
  });

  it('nhân bản từ bài đã phát hành: sang trang soạn của bản nháp mới', async () => {
    signInAs('TEACHER');
    api(publishedQuizOf({ questions: THREE }), (call) => {
      if (call.method === 'POST' && call.path === '/teacher/quizzes/9/duplicate')
        return envelope(201, { data: { quiz: quizOf({ id: 60, questions: THREE }), skippedQuestions: 0, message: 'Đã nhân bản bài kiểm tra.' } });
      if (call.path === '/teacher/quizzes/60') return envelope(200, { data: quizOf({ id: 60, name: 'Bản sao', questions: THREE }) });
      return undefined;
    });
    const user = userEvent.setup();
    const { router } = renderApp('/giao-vien/kiem-tra/9');

    await user.click(await screen.findByRole('button', { name: 'Nhân bản' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/giao-vien/kiem-tra/60'));
  });

  it('bài của giáo viên khác hoặc không tồn tại: hiện lý do của máy chủ, không dựng biểu mẫu', async () => {
    signInAs('TEACHER');
    mockApi((call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      return envelope(404, { errorCode: ERROR_CODES.blocked, message: 'Không thể thực hiện. Không tìm thấy bài kiểm tra.' });
    });
    renderApp('/giao-vien/kiem-tra/123');
    expect(await screen.findByText(/Không tìm thấy bài kiểm tra/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Tên bài kiểm tra *')).not.toBeInTheDocument();
  });
});
