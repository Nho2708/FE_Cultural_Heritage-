import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import type { ReactTestInstance } from 'react-test-renderer';
import { QuestionInput } from '../QuestionInput';
import { attemptQuestion, renderLevelOne, textOf } from './testKit';

// Ô trả lời của bài chơi luyện tập cấp 1: Đúng/Sai là hai nút to; phương án đã chọn sai bị khóa; câu đã xong sáng viền xanh ở đáp án đúng;
// sắp xếp đã xong hiện các mục theo đúng thứ tự.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CORRECT = themeForLevel(1).color.correct;

function radios(tree: { root: ReactTestInstance }) {
  return tree.root.findAll((node) => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function' && typeof node.type !== 'string');
}

function borderOf(node: ReactTestInstance): string | undefined {
  return [node.props.style].flat(3).reduce<string | undefined>((found, style: { borderColor?: string } | null | undefined) => style?.borderColor ?? found, undefined);
}

describe('ô trả lời luyện tập cấp 1', () => {
  it('Đúng/Sai là hai nút to; phương án vừa chọn sai bị khóa', async () => {
    const q = attemptQuestion(1, { questionType: 'TRUE_FALSE', options: [{ content: 'Đúng', imageUrl: null }, { content: 'Sai', imageUrl: null }] });
    const onChange = jest.fn();
    const view = await renderLevelOne(<QuestionInput question={q} answer={null} onChange={onChange} level={1} practice wrong={new Set([1])} />);
    const [yes, no] = radios(view.tree);
    expect(yes!.props.accessibilityLabel).toBe('Đúng');
    expect(no!.props.disabled).toBe(true);
    await view.press('Đúng');
    expect(onChange).toHaveBeenCalledWith({ selectedIndex: 0 });
  });

  it('câu đã xong: đáp án đúng sáng viền xanh', async () => {
    const view = await renderLevelOne(<QuestionInput question={attemptQuestion(1)} answer={{ selectedIndex: 1 }} onChange={jest.fn()} level={1} practice solved disabled />);
    const cards = radios(view.tree);
    expect(borderOf(cards[1]!)).toBe(CORRECT);
    expect(borderOf(cards[0]!)).not.toBe(CORRECT);
  });

  it('sắp xếp đã xong hiện các mục theo đúng thứ tự', async () => {
    const q = attemptQuestion(1, { questionType: 'ORDERING', options: [], items: ['Gói bánh', 'Luộc bánh', 'Ăn Tết'] });
    const view = await renderLevelOne(<QuestionInput question={q} answer={{ order: [2, 0, 1] }} onChange={jest.fn()} level={1} practice solved disabled />);
    const labels = view.tree.root.findAll((node) => typeof node.props.onPress === 'function' && typeof node.type !== 'string' && /thứ \d/u.test(node.props.accessibilityLabel ?? '')).map((node) => node.props.accessibilityLabel);
    expect(labels).toEqual(['Ăn Tết, thứ 1', 'Gói bánh, thứ 2', 'Luộc bánh, thứ 3']);
    expect(view.texts().some((text) => text.includes('Chạm lần lượt'))).toBe(false);
    expect(view.tree.root.findAll((node) => (node.type as unknown) === 'Text').map(textOf).includes('Xếp lại từ đầu')).toBe(false);
  });
});
