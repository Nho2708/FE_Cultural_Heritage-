import type { QuestionSubmission } from '@dsvhvn/dung-chung/api';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { questionOf } from '../test/quizFixtures';
import { QuestionInput, type QuizLevel } from './QuestionInput';

// Ô trả lời của tám dạng câu: mỗi thao tác của em tạo ra đúng câu trả lời máy chủ nhận (vị trí tính theo thứ tự đang hiện).

function Harness({ question, level = 2, initial = null }: { question: ReturnType<typeof questionOf>; level?: QuizLevel; initial?: QuestionSubmission | null }) {
  const [answer, setAnswer] = useState<QuestionSubmission | null>(initial);
  return (
    <>
      <QuestionInput question={question} answer={answer} onChange={setAnswer} level={level} />
      <output aria-label="Câu trả lời">{JSON.stringify(answer)}</output>
    </>
  );
}

const current = () => JSON.parse(screen.getByLabelText('Câu trả lời').textContent || 'null') as QuestionSubmission | null;
const option = (content: string) => ({ content, imageUrl: null });

describe('ô trả lời theo dạng câu', () => {
  it('một đáp án đúng: chọn phương án gửi vị trí đang hiện, chọn lại thì đổi', async () => {
    const user = userEvent.setup();
    render(<Harness question={questionOf()} />);
    expect(screen.getAllByRole('radio')).toHaveLength(3);
    await user.click(screen.getByRole('radio', { name: 'Vua Minh Mạng' }));
    expect(current()).toEqual({ selectedIndex: 1 });
    expect(screen.getByRole('radio', { name: 'Vua Minh Mạng' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Vua Gia Long' }));
    expect(current()).toEqual({ selectedIndex: 0 });
  });

  it('Đúng/Sai và đọc tư liệu dùng cùng cách chọn một phương án', async () => {
    const user = userEvent.setup();
    render(<Harness question={questionOf({ questionType: 'TRUE_FALSE', options: [option('Đúng'), option('Sai')] })} level={1} />);
    await user.click(screen.getByRole('radio', { name: 'Sai' }));
    expect(current()).toEqual({ selectedIndex: 1 });
  });

  it('chọn hình đúng (cấp 1): thẻ hình lớn, chọn một hình', async () => {
    const user = userEvent.setup();
    const question = questionOf({
      questionType: 'IMAGE_CHOICE',
      options: [
        { content: 'Hình A', imageUrl: 'https://anh.test/a.jpg' },
        { content: 'Hình B', imageUrl: 'https://anh.test/b.jpg' },
      ],
    });
    render(<Harness question={question} level={1} />);
    await user.click(screen.getByRole('radio', { name: 'Hình B' }));
    expect(current()).toEqual({ selectedIndex: 1 });
  });

  describe('ghép cặp', () => {
    const matching = questionOf({
      questionType: 'MATCHING',
      leftItems: [
        { content: null, imageUrl: 'https://anh.test/1.jpg' },
        { content: null, imageUrl: 'https://anh.test/2.jpg' },
      ],
      rightItems: ['Ngọ Môn', 'Văn Miếu'],
    });

    it('chạm hình rồi chạm tên để nối; nối lại tên ở hình khác thì gỡ chỗ cũ; gỡ từng cặp', async () => {
      const user = userEvent.setup();
      render(<Harness question={matching} />);
      await user.click(screen.getByRole('button', { name: /^Hình 1/ }));
      await user.click(screen.getByRole('button', { name: 'Văn Miếu' }));
      expect(current()).toEqual({ matches: [1, null] });

      // Tên đã nối thì khóa; gỡ ở hình 1 rồi nối cho hình 2.
      expect(screen.getByRole('button', { name: 'Văn Miếu' })).toBeDisabled();
      await user.click(screen.getByRole('button', { name: 'Gỡ tên đã nối ở hình 1' }));
      expect(current()).toEqual({ matches: [null, null] });
      await user.click(screen.getByRole('button', { name: 'Ngọ Môn' }));
      await user.click(screen.getByRole('button', { name: /^Hình 2/ }));
      expect(current()).toEqual({ matches: [null, 0] });
    });

    it('kéo tên thả vào hình', () => {
      render(<Harness question={matching} level={1} />);
      const data = new Map<string, string>();
      const dataTransfer = {
        types: ['application/x-dsvhvn-bai-kiem-tra'],
        setData: (type: string, value: string) => data.set(type, value),
        getData: (type: string) => data.get(type) ?? '',
        effectAllowed: '',
        dropEffect: '',
      };
      fireEvent.dragStart(screen.getByRole('button', { name: 'Văn Miếu' }), { dataTransfer });
      const card = screen.getByRole('button', { name: /^Hình 2/ }).parentElement!;
      fireEvent.dragOver(card, { dataTransfer });
      fireEvent.drop(card, { dataTransfer });
      expect(current()).toEqual({ matches: [null, 1] });
    });
  });

  it('sắp xếp: chạm lần lượt để đặt thứ tự, đổi chỗ, nhấc ra và xếp lại từ đầu', async () => {
    const user = userEvent.setup();
    const ordering = questionOf({ questionType: 'ORDERING', items: ['Khởi công', 'Hoàn thành', 'UNESCO ghi danh'] });
    render(<Harness question={ordering} />);
    await user.click(screen.getByRole('button', { name: 'UNESCO ghi danh, chưa xếp' }));
    await user.click(screen.getByRole('button', { name: 'Khởi công, chưa xếp' }));
    await user.click(screen.getByRole('button', { name: 'Hoàn thành, chưa xếp' }));
    expect(current()).toEqual({ order: [2, 0, 1] });
    expect(screen.getByText('Em đã xếp đủ các mục.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Đưa lên: Hoàn thành' }));
    expect(current()).toEqual({ order: [2, 1, 0] });
    await user.click(screen.getByRole('button', { name: 'Hoàn thành, thứ 2' }));
    expect(current()).toEqual({ order: [2, 0] });
    expect(screen.getByText('Em đã xếp 2 / 3 mục.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xếp lại từ đầu' }));
    expect(current()).toEqual({ order: [] });
  });

  it('điền từ gõ tay: mỗi chỗ trống một ô, bỏ trống thì là null', async () => {
    const user = userEvent.setup();
    const fill = questionOf({ questionType: 'FILL_BLANK', content: 'Vua ___ dời đô về ___ năm 1010.', blankCount: 2 });
    render(<Harness question={fill} />);
    await user.type(screen.getByRole('textbox', { name: 'Chỗ trống số 1' }), 'Lý Thái Tổ');
    expect(current()).toEqual({ blanks: ['Lý Thái Tổ', null] });
    await user.type(screen.getByRole('textbox', { name: 'Chỗ trống số 2' }), 'Thăng Long');
    await user.clear(screen.getByRole('textbox', { name: 'Chỗ trống số 1' }));
    expect(current()).toEqual({ blanks: [null, 'Thăng Long'] });
  });

  it('điền từ có kho từ: chạm từ để điền chỗ trống kế tiếp, chạm chỗ trống để bỏ từ ra', async () => {
    const user = userEvent.setup();
    const fill = questionOf({ questionType: 'FILL_BLANK', content: 'Vua ___ dời đô về ___.', blankCount: 2, wordBank: ['Thăng Long', 'Lý Thái Tổ', 'Hoa Lư'] });
    render(<Harness question={fill} />);
    await user.click(screen.getByRole('button', { name: 'Lý Thái Tổ' }));
    await user.click(screen.getByRole('button', { name: 'Thăng Long' }));
    expect(current()).toEqual({ blanks: ['Lý Thái Tổ', 'Thăng Long'] });
    expect(screen.getByRole('button', { name: 'Thăng Long' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Chỗ trống số 1: Lý Thái Tổ, chạm để bỏ' }));
    expect(current()).toEqual({ blanks: [null, 'Thăng Long'] });
    expect(screen.getByRole('button', { name: 'Lý Thái Tổ' })).toBeEnabled();
  });

  it('nhiều mệnh đề Đúng/Sai: chọn từng mệnh đề, đổi ý được', async () => {
    const user = userEvent.setup();
    const multi = questionOf({ questionType: 'MULTI_TRUE_FALSE', statements: ['Ngọ Môn ở phía nam.', 'Huế có hai vòng thành.'] });
    render(<Harness question={multi} level={3} />);
    const groupB = screen.getByRole('radiogroup', { name: 'Mệnh đề b)' });
    await user.click(within(groupB).getByRole('radio', { name: 'Sai' }));
    expect(current()).toEqual({ statements: [null, false] });
    await user.click(within(screen.getByRole('radiogroup', { name: 'Mệnh đề a)' })).getByRole('radio', { name: 'Đúng' }));
    await user.click(within(groupB).getByRole('radio', { name: 'Đúng' }));
    expect(current()).toEqual({ statements: [true, true] });
  });
});
