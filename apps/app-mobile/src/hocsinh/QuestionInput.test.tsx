import type { AttemptQuestion, QuestionSubmission } from '@dsvhvn/dung-chung/api';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { ThemeContext } from '../theme/ThemeProvider';
import { QuestionInput, type QuizLevel } from './QuestionInput';

// Tám dạng câu trả lời bằng bộ vẽ của React Native (không phải trình duyệt): mỗi thao tác chạm trả về cả câu trả lời mới đúng cấu trúc máy chủ nhận.

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function question(overrides: Partial<AttemptQuestion>): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: '',
    content: 'Câu hỏi',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: false,
    answer: null,
    ...overrides,
  };
}

function setup(q: AttemptQuestion, answer: QuestionSubmission | null = null, level: QuizLevel = 2) {
  const changes: QuestionSubmission[] = [];
  const i18n = createI18n('vi');
  let tree!: ReturnType<typeof create>;
  const render = (current: QuestionSubmission | null) =>
    act(() => {
      tree.update(
        <I18nextProvider i18n={i18n}>
          <ThemeContext.Provider value={themeForLevel(level)}>
            <QuestionInput question={q} answer={current} onChange={(next) => changes.push(next)} level={level} />
          </ThemeContext.Provider>
        </I18nextProvider>,
      );
    });
  act(() => {
    tree = create(<></>);
  });
  render(answer);
  const byLabel = (label: string | RegExp): ReactTestInstance => {
    const found = tree.root.findAll((node) => typeof node.props.onPress === 'function' && typeof node.props.accessibilityLabel === 'string' && (typeof label === 'string' ? node.props.accessibilityLabel === label : label.test(node.props.accessibilityLabel)));
    if (found.length === 0) throw new Error(`Không thấy nút ${String(label)}`);
    return found[0]!;
  };
  const press = (label: string | RegExp) => act(() => byLabel(label).props.onPress());
  /** Chạm nút theo chữ hiển thị bên trong (nút không có nhãn riêng, ví dụ tên cần nối). */
  const pressText = (text: string) => {
    const found = tree.root.findAll((node) => typeof node.props.onPress === 'function' && node.findAll((child) => (child.type as unknown) === 'Text' && [child.props.children].flat().join('') === text).length > 0);
    if (found.length === 0) throw new Error(`Không thấy nút có chữ ${text}`);
    act(() => found[0]!.props.onPress());
  };
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat().join(''));
  return { changes, press, pressText, render, texts, tree };
}

describe('ô trả lời tám dạng câu', () => {
  it('chọn một phương án trả vị trí đã chọn (một đáp án đúng, đúng/sai, đọc tư liệu)', () => {
    const q = question({ options: [{ content: 'Hà Nội', imageUrl: null }, { content: 'Huế', imageUrl: null }] });
    const { changes, press } = setup(q);
    press('B. Huế');
    expect(changes).toEqual([{ selectedIndex: 1 }]);
  });

  it('chọn hình đúng', () => {
    const q = question({ questionType: 'IMAGE_CHOICE', options: [{ content: 'Cổng', imageUrl: null }, { content: null, imageUrl: null }] });
    const { changes, press } = setup(q, null, 1);
    press('Cổng');
    press('Hình B');
    expect(changes).toEqual([{ selectedIndex: 0 }, { selectedIndex: 1 }]);
  });

  it('ghép cặp: chạm hình rồi chạm tên (hoặc ngược lại), gỡ tên đã nối', () => {
    const q = question({ questionType: 'MATCHING', leftItems: [{ content: 'Chùa', imageUrl: null }, { content: 'Đền', imageUrl: null }], rightItems: ['Hà Nội', 'Huế'] });
    const { changes, press, pressText, render } = setup(q);
    press(/^Hình 1 Chùa/);
    pressText('Huế');
    expect(changes.at(-1)).toEqual({ matches: [1, null] });
    render({ matches: [1, null] });
    pressText('Hà Nội');
    press(/^Hình 2 Đền/);
    expect(changes.at(-1)).toEqual({ matches: [1, 0] });
    render({ matches: [1, 0] });
    press('Gỡ tên đã nối ở hình 1');
    expect(changes.at(-1)).toEqual({ matches: [null, 0] });
  });

  it('sắp xếp: chạm lần lượt đặt vào cuối hàng, chạm lại bỏ chọn, xếp lại từ đầu', () => {
    const q = question({ questionType: 'ORDERING', items: ['Một', 'Hai', 'Ba'] });
    const { changes, press, render } = setup(q);
    press('Hai, chưa xếp');
    expect(changes.at(-1)).toEqual({ order: [1] });
    render({ order: [1] });
    press('Ba, chưa xếp');
    expect(changes.at(-1)).toEqual({ order: [1, 2] });
    render({ order: [1, 2] });
    press('Hai, thứ 1');
    expect(changes.at(-1)).toEqual({ order: [2] });
  });

  it('điền từ bằng kho từ: điền vào chỗ trống đầu tiên còn trống, bỏ từ khi chạm lại chỗ trống', () => {
    const q = question({ questionType: 'FILL_BLANK', content: 'Vua ___ dời đô về ___.', blankCount: 2, wordBank: ['Lý Thái Tổ', 'Thăng Long'] });
    const { changes, press, pressText, render } = setup(q);
    pressText('Lý Thái Tổ');
    expect(changes.at(-1)).toEqual({ blanks: ['Lý Thái Tổ', null] });
    render({ blanks: ['Lý Thái Tổ', null] });
    press(/Chỗ trống số 1/);
    expect(changes.at(-1)).toEqual({ blanks: [null, null] });
  });

  it('nhiều mệnh đề: chọn đúng hoặc sai cho từng mệnh đề', () => {
    const q = question({ questionType: 'MULTI_TRUE_FALSE', statements: ['Ý một', 'Ý hai'] });
    const { tree, changes } = setup(q);
    const radios = tree.root.findAll((node) => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function');
    expect(radios).toHaveLength(4);
    act(() => radios[0]!.props.onPress());
    act(() => radios[3]!.props.onPress());
    expect(changes).toEqual([{ statements: [true, null] }, { statements: [null, false] }]);
  });

  it('cấp 1 và cấp 3 vẽ được cùng một câu (không lỗi kiểu dáng)', () => {
    const q = question({ options: [{ content: 'A', imageUrl: null }, { content: 'B', imageUrl: null }] });
    for (const level of [1, 3] as const) expect(() => setup(q, { selectedIndex: 0 }, level)).not.toThrow();
  });
});
