import { act } from 'react-test-renderer';
import { PracticeRunner } from './PracticeRunner';
import { answerCheck, attemptQuestion, practiceAttempt, renderLevelOne } from './testKit';

// Màn hình bài chơi cấp 1: chấm tròn tiến độ thay cho "Câu x / y", không sao, không dòng lưu nháp, không "Câu trước"; chạm hình là bảng phản
// hồi trượt lên với nút hành động; ghép cặp có nút "Kiểm tra" chỉ bật khi nối đủ.

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));
const mockApi = { checkAnswer: jest.fn(), submit: jest.fn(), result: jest.fn() };
jest.mock('../../state/AppProvider', () => ({ useServices: () => ({ studentApi: mockApi }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const EMOJI = /\p{Extended_Pictographic}/u;

beforeEach(() => {
  mockApi.checkAnswer.mockReset();
});

describe('màn hình bài chơi cấp 1', () => {
  it('đầu trang chỉ có tạm dừng, chấm tiến độ và linh vật; chạm hình thì hiện bảng phản hồi', async () => {
    mockApi.checkAnswer.mockResolvedValue({ data: answerCheck(1, { isCorrect: false, firstTryCorrect: false, tryCount: 1, parts: [false] }), message: null });
    const onPause = jest.fn();
    const view = await renderLevelOne(<PracticeRunner attempt={practiceAttempt([attemptQuestion(1, { content: 'Đâu là Chùa Một Cột?' }), attemptQuestion(2)])} onFinished={jest.fn()} onPause={onPause} />);

    expect(view.has('Đâu là Chùa Một Cột?')).toBe(true);
    expect(view.has('Em chạm vào hình đúng.')).toBe(true);
    expect(view.tree.root.findAll((node) => node.props.accessibilityLabel === 'Câu 1 trên 2').length).toBeGreaterThan(0);
    for (const text of view.texts()) {
      expect(text).not.toMatch(/Câu \d+ ?\/ ?\d+/u);
      expect(text).not.toMatch(/[★☆]/u);
      expect(text).not.toMatch(EMOJI);
    }
    expect(view.has('Câu trước')).toBe(false);
    expect(view.has('Đã lưu')).toBe(false);

    await view.press('Khuê Văn Các');
    expect(view.has('Chưa phải hình này.')).toBe(true);
    expect(view.has('Em nhớ lại câu chuyện rồi chọn hình khác nhé!')).toBe(true);
    expect(view.has('Sai')).toBe(false);
    await view.press('Thử lại');
    expect(view.has('Chưa phải hình này.')).toBe(false);

    await view.press('Tạm dừng');
    expect(onPause).toHaveBeenCalled();
    view.unmount();
  });

  it('ghép cặp có nút Kiểm tra chỉ bật khi đã nối đủ', async () => {
    const matching = attemptQuestion(1, { questionType: 'MATCHING', options: [], leftItems: [{ content: 'Chùa', imageUrl: null }, { content: 'Cầu', imageUrl: null }], rightItems: ['Chùa Một Cột', 'Cầu Thê Húc'], partsTotal: 2 });
    mockApi.checkAnswer.mockResolvedValue({ data: answerCheck(1, { parts: [true, true], correctAnswer: { matches: [0, 1] } }), message: null });
    jest.useFakeTimers();
    const view = await renderLevelOne(<PracticeRunner attempt={practiceAttempt([matching])} onFinished={jest.fn()} onPause={jest.fn()} />);
    expect(view.has('Em chạm một hình, rồi chạm tên của hình đó.')).toBe(true);
    expect(view.canPress('Kiểm tra')).toBe(false);

    await view.press('Hình 1 Chùa, chưa nối tên');
    await view.press('Chùa Một Cột');
    await view.press('Hình 2 Cầu, chưa nối tên');
    await view.press('Cầu Thê Húc');
    expect(view.canPress('Kiểm tra')).toBe(true);
    await view.press('Kiểm tra');
    expect(mockApi.checkAnswer).toHaveBeenCalledWith(7, 1, { matches: [0, 1] });
    expect(view.has('Xong rồi!')).toBe(true);
    await act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    view.unmount();
  });
});
