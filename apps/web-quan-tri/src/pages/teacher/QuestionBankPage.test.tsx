import { ERROR_CODES, type QuestionDetail, type QuestionRow } from '@dsvhvn/dung-chung/api';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { envelope, mockApi, userOf, type FetchCall } from '../../test/fixtures';
import { COUNTS, TYPE_TABLE, accessOf, pageOf, previewOf, questionDetailOf, questionRowOf } from '../../test/questionFixtures';
import { renderApp, signInAs } from '../../test/renderApp';

// Ngân hàng câu hỏi: ba tab với số đếm, bộ lọc trên URL, câu chỉ đọc, nhân bản, duyệt nhiều câu, biểu mẫu soạn câu theo dạng.

function api(rows: QuestionRow[], extra?: (call: FetchCall) => Response | undefined) {
  return mockApi(
    (call) => extra?.(call),
    (call) => {
      if (call.path === '/me') return envelope(200, { data: userOf('TEACHER') });
      if (call.path === '/teacher/questions/counts') return envelope(200, { data: COUNTS });
      if (call.path === '/teacher/questions/types') return envelope(200, { data: TYPE_TABLE });
      if (call.path.startsWith('/teacher/questions?')) return envelope(200, { data: pageOf(rows) });
      if (call.path === '/teacher/questions/validate')
        return envelope(200, { data: { isValid: true, errors: {}, partsTotal: 1, preview: previewOf(), trial: null } });
      return undefined;
    },
  );
}

const lastList = (calls: FetchCall[]) => calls.filter((c) => c.path.startsWith('/teacher/questions?')).at(-1)?.path ?? '';

describe('Ngân hàng câu hỏi', () => {
  it('ba tab có số đếm; tab Dùng chung hiện người tạo và trường', async () => {
    signInAs('TEACHER');
    const calls = api([questionRowOf(1, { isMine: false, creatorName: 'Lê Thị Hoa', organizationName: 'Trường THPT Chu Văn An' })]);
    renderApp('/giao-vien/cau-hoi');

    expect(await screen.findByRole('tab', { name: 'Dùng chung (12)' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Của tôi (5)' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chờ duyệt (3)' })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Câu hỏi trong ngân hàng' });
    expect(within(table).getByText('Lê Thị Hoa')).toBeInTheDocument();
    expect(within(table).getByText('Trường THPT Chu Văn An')).toBeInTheDocument();
    expect(lastList(calls)).toContain('scope=SHARED');
  });

  it('chuyển tab và lọc gửi đúng tham số', async () => {
    signInAs('TEACHER');
    const calls = api([questionRowOf(1)]);
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi');

    await screen.findByRole('table', { name: 'Câu hỏi trong ngân hàng' });
    await user.click(screen.getByRole('tab', { name: /Của tôi/ }));
    await user.selectOptions(await screen.findByLabelText('Dạng câu'), 'ghep-cap');
    await user.selectOptions(screen.getByLabelText('Cấp phù hợp'), '1');
    await user.selectOptions(screen.getByLabelText('Độ khó'), 'kho');
    await user.selectOptions(screen.getByLabelText('Trạng thái'), 'bi-loai');

    await waitFor(() => {
      const path = lastList(calls);
      for (const part of ['scope=MINE', 'questionType=MATCHING', 'level=1', 'difficultyLevel=HARD', 'status=REJECTED']) expect(path).toContain(part);
    });
  });

  it('câu của mình đã nằm trong bài kiểm tra hiện nhãn chỉ đọc; câu người khác chỉ có nút Xem', async () => {
    signInAs('TEACHER');
    api([questionRowOf(1, { quizCount: 2 }), questionRowOf(2, { isMine: false, content: 'Câu của người khác?' })]);
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    const table = await screen.findByRole('table', { name: 'Câu hỏi trong ngân hàng' });
    expect(within(table).getByText('Chỉ đọc · trong 2 bài kiểm tra')).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Xem câu "Câu của người khác?"' })).toBeInTheDocument();
    expect(within(table).getByRole('button', { name: 'Xem câu "Câu hỏi số 1 về Hoàng thành Thăng Long?"' })).toBeInTheDocument();
  });

  it('tab Chờ duyệt: chọn nhiều câu rồi duyệt một lần, báo câu bị bỏ qua', async () => {
    signInAs('TEACHER');
    const calls = api(
      [questionRowOf(1, { reviewStatus: 'PENDING', source: 'AI' }), questionRowOf(2, { reviewStatus: 'PENDING', source: 'AI' })],
      (call) =>
        call.path === '/teacher/questions/approve'
          ? envelope(200, { data: { approved: [1], skipped: [{ questionId: 2, reason: 'Di sản không còn xuất bản.' }], message: 'Đã duyệt 1 câu.' } })
          : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cho-duyet');

    await screen.findByRole('table', { name: 'Câu hỏi trong ngân hàng' });
    expect(screen.getByRole('button', { name: /Duyệt các câu đã chọn/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Chọn cả trang' }));
    await user.click(screen.getByRole('button', { name: 'Duyệt 2 câu đã chọn' }));

    expect(await screen.findByText(/Đã duyệt 1 câu\. 1 câu chưa duyệt được: Di sản không còn xuất bản\./)).toBeInTheDocument();
    expect(calls.find((c) => c.path === '/teacher/questions/approve')?.body).toEqual({ questionIds: [1, 2] });
  });

  it('nhân bản câu đã duyệt gọi máy chủ rồi mở bản mới', async () => {
    signInAs('TEACHER');
    const calls = api([questionRowOf(1, { isMine: false })], (call) => {
      if (call.path === '/teacher/questions/1/duplicate') return envelope(201, { data: questionDetailOf(9), message: 'Nhân bản câu hỏi thành công.' });
      if (call.path === '/teacher/questions/9') return envelope(200, { data: questionDetailOf(9, { content: 'Bản nhân bản của tôi?' }) });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi');

    await user.click(await screen.findByRole('button', { name: /Nhân bản câu/ }));
    expect(await screen.findByDisplayValue('Bản nhân bản của tôi?')).toBeInTheDocument();
    expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/questions/1/duplicate')).toBe(true);
  });

  it('lọc theo di sản trên URL gửi heritageId', async () => {
    signInAs('TEACHER');
    const calls = api([questionRowOf(1)]);
    renderApp('/giao-vien/cau-hoi?di-san=11&ten-di-san=Hoàng thành Thăng Long');
    await screen.findByRole('table', { name: 'Câu hỏi trong ngân hàng' });
    expect(lastList(calls)).toContain('heritageId=11');
    expect(screen.getByTestId('di-san-da-chon')).toHaveTextContent('Hoàng thành Thăng Long');
    expect(screen.getByRole('button', { name: 'Bỏ lọc di sản' })).toBeInTheDocument();
  });

  it('chưa có câu nào: trạng thái rỗng hướng dẫn', async () => {
    signInAs('TEACHER');
    api([]);
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');
    expect(await screen.findByText(/Thầy cô chưa có câu hỏi nào/)).toBeInTheDocument();
  });
});

describe('Biểu mẫu câu hỏi', () => {
  it('câu đã nằm trong bài kiểm tra chỉ đọc: có lời giải thích và nút Nhân bản để sửa, không có Lưu', async () => {
    signInAs('TEACHER');
    const message = 'Câu hỏi này chỉ xem được vì đã được dùng trong bài kiểm tra. Bấm "Nhân bản" để tạo bản của bạn rồi sửa.';
    api([questionRowOf(1, { quizCount: 1 })], (call) =>
      call.path === '/teacher/questions/1'
        ? envelope(200, {
            data: questionDetailOf(1, { quizCount: 1, access: accessOf({ isReadOnly: true, reason: 'USED_IN_QUIZ', message, canEdit: false, canDelete: false }) }),
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    await user.click(await screen.findByRole('button', { name: /^Xem câu/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem câu hỏi' });
    expect(within(dialog).getByText(message)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Nhân bản để sửa' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Lưu' })).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Phương án 1')).toBeDisabled();
  });

  it('câu bị quản trị hệ thống ẩn: chỉ đọc và không có Nhân bản để sửa', async () => {
    signInAs('TEACHER');
    api([questionRowOf(1, { reviewStatus: 'REJECTED', isHidden: true })], (call) =>
      call.path === '/teacher/questions/1'
        ? envelope(200, {
            data: questionDetailOf(1, {
              reviewStatus: 'REJECTED',
              access: accessOf({ isReadOnly: true, reason: 'HIDDEN_BY_ADMIN', message: 'Câu hỏi này chỉ xem được vì đã bị quản trị hệ thống ẩn.', canEdit: false, canDuplicate: false }),
            }),
          })
        : undefined,
    );
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    await user.click(await screen.findByRole('button', { name: /^Xem câu/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Xem câu hỏi' });
    expect(within(dialog).getByText(/đã bị quản trị hệ thống ẩn/)).toBeInTheDocument();
    expect(within(dialog).queryByRole('button', { name: 'Nhân bản để sửa' })).not.toBeInTheDocument();
  });

  it('tạo câu: đổi dạng đổi phần đáp án; kiểm hợp lệ hiện lỗi theo ô và xem trước; lưu gửi đúng cấu trúc', async () => {
    signInAs('TEACHER');
    const calls = api([], (call) => {
      if (call.path === '/teacher/questions/validate') {
        const body = call.body as { question: { questionType: string; steps?: string[] } };
        return envelope(200, {
          data: {
            isValid: false,
            errors: body.question.questionType === 'ORDERING' ? { 'steps[1]': 'Các mục không được trùng nhau.' } : {},
            partsTotal: 3,
            preview: previewOf({ questionType: 'ORDERING', items: ['B', 'A', 'C'], options: [], content: 'Sắp xếp các sự kiện?' }),
            trial: null,
          },
        });
      }
      if (call.method === 'POST' && call.path === '/teacher/questions') return envelope(201, { data: questionDetailOf(20), message: 'Tạo câu hỏi thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    await user.click(await screen.findByRole('button', { name: 'Tạo câu hỏi' }));
    const dialog = await screen.findByRole('dialog', { name: 'Tạo câu hỏi' });
    expect(within(dialog).getByLabelText('Phương án 4')).toBeInTheDocument();

    await user.selectOptions(within(dialog).getByLabelText('Dạng câu'), 'ORDERING');
    expect(within(dialog).queryByLabelText('Phương án 1')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Mục 3')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Từ cấp')).toHaveValue('1');

    await user.type(within(dialog).getByLabelText('Lời câu'), 'Sắp xếp các sự kiện?');
    await user.type(within(dialog).getByLabelText('Mục 1'), 'A');
    await user.type(within(dialog).getByLabelText('Mục 2'), 'A');
    await user.type(within(dialog).getByLabelText('Mục 3'), 'C');

    expect(await within(dialog).findByText('Các mục không được trùng nhau.')).toBeInTheDocument();
    expect(await within(dialog).findByTestId('xem-truoc')).toHaveTextContent('Sắp xếp các sự kiện?');
    expect(within(dialog).getByTestId('trang-thai-hop-le')).toHaveTextContent('Câu chưa hợp lệ');

    await user.click(within(dialog).getByRole('button', { name: 'Tạo câu hỏi' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/questions')).toBe(true));
    const sent = calls.find((c) => c.method === 'POST' && c.path === '/teacher/questions')?.body as Record<string, unknown>;
    expect(sent).toMatchObject({ questionType: 'ORDERING', steps: ['A', 'A', 'C'], levelMin: 1, levelMax: 2, content: 'Sắp xếp các sự kiện?' });
    expect(sent.options).toBeUndefined();
  });

  it('lưu bị máy chủ từ chối theo trường: lỗi hiện dưới đúng ô', async () => {
    signInAs('TEACHER');
    api([questionRowOf(1)], (call) => {
      if (call.path === '/teacher/questions/1' && call.method === 'GET') return envelope(200, { data: questionDetailOf(1) });
      if (call.path === '/teacher/questions/1' && call.method === 'PUT')
        return envelope(400, { errorCode: ERROR_CODES.invalid, message: 'Dữ liệu chưa hợp lệ.', errors: { 'options[1].content': 'Các phương án không được trùng nhau.' } });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    await user.click(await screen.findByRole('button', { name: /^Sửa câu/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa câu hỏi' });
    await user.type(within(dialog).getByLabelText('Giải thích đáp án'), ' thêm');
    await user.click(within(dialog).getByRole('button', { name: 'Lưu' }));
    expect(await within(dialog).findAllByText('Các phương án không được trùng nhau.')).not.toHaveLength(0);
  });

  it('chấm thử: bấm một phương án trong khung xem trước, kết quả chấm của máy chủ hiện ngay', async () => {
    signInAs('TEACHER');
    const calls = api([questionRowOf(1)], (call) => {
      if (call.path === '/teacher/questions/1' && call.method === 'GET') return envelope(200, { data: questionDetailOf(1) });
      if (call.path === '/teacher/questions/validate' && (call.body as { submission?: unknown }).submission)
        return envelope(200, {
          data: {
            isValid: true,
            errors: {},
            partsTotal: 1,
            preview: previewOf(),
            trial: { partsCorrect: 1, partsTotal: 1, parts: [true], isCorrect: true, fraction: 1 },
          },
        });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cua-toi');

    await user.click(await screen.findByRole('button', { name: /^Sửa câu/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Sửa câu hỏi' });
    await user.click(await within(dialog).findByRole('button', { name: 'Chấm thử phương án Phương án A' }));
    expect(await within(dialog).findByTestId('cham-thu')).toHaveTextContent('Chấm thử: đúng (1/1 phần).');
    expect(calls.some((c) => (c.body as { submission?: { selectedIndex?: number } } | undefined)?.submission?.selectedIndex === 0)).toBe(true);
  });

  it('câu AI chờ duyệt: có Duyệt và Loại; Duyệt gọi máy chủ', async () => {
    signInAs('TEACHER');
    const detail: QuestionDetail = questionDetailOf(5, { reviewStatus: 'PENDING', source: 'AI', access: accessOf({ canApprove: true, canReject: true }) });
    const calls = api([questionRowOf(5, { reviewStatus: 'PENDING', source: 'AI' })], (call) => {
      if (call.path === '/teacher/questions/5' && call.method === 'GET') return envelope(200, { data: detail });
      if (call.path === '/teacher/questions/5/approve') return envelope(200, { data: { ...detail, reviewStatus: 'APPROVED' }, message: 'Duyệt câu hỏi thành công.' });
      return undefined;
    });
    const user = userEvent.setup();
    renderApp('/giao-vien/cau-hoi?tab=cho-duyet');

    await user.click(await screen.findByRole('button', { name: /^Sửa câu/ }));
    const dialog = await screen.findByRole('dialog', { name: 'Duyệt câu hỏi' });
    expect(within(dialog).getByRole('button', { name: 'Loại' })).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Dạng câu')).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Duyệt' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/teacher/questions/5/approve')).toBe(true));
  });
});
