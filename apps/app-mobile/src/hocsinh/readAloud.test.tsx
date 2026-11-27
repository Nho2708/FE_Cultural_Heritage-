import type { StudentLesson, StudentSection } from '@dsvhvn/dung-chung/api';
import { readAlongLayout, splitSentences } from '@dsvhvn/dung-chung/speech';
import { themeForLevel } from '@dsvhvn/dung-chung/theme';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { I18nextProvider } from 'react-i18next';
import { act, create, type ReactTestInstance } from 'react-test-renderer';
import { createI18n } from '../i18n';
import { configureCloudVoice, type VoiceSource } from '../speech/cloudVoice';
import { narrationSentences } from '../speech/useCloudNarration';
import { getVoiceNoticeVisible, resetVoiceNotice } from '../speech/voiceNotice';
import { ThemeContext } from '../theme/ThemeProvider';
import { LevelThreeLesson, LevelTwoLesson } from './LevelLessons';

// Nghe bài đọc của bố cục cấp 2 và cấp 3: nút cho nội dung chính và cho từng phần Bài đọc, đọc từng câu bằng giọng của máy chủ và tô sáng câu đang đọc, bấm lại để dừng,
// chỉ một đoạn đọc một lúc, rời màn thì dừng, xin máy chủ tạo trước khoảng 10 câu đầu của nội dung chính, lùi về giọng điện thoại và báo khi thiếu giọng như cấp 1.

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const speak = Speech.speak as unknown as jest.Mock;
const voices = Speech.getAvailableVoicesAsync as unknown as jest.Mock;
const makePlayer = createAudioPlayer as unknown as jest.Mock;

// Bộ câu mẫu chung của bài đọc cấp 2, 3 (cùng chuỗi ở kiểm thử của máy chủ và của web).
const SAMPLE =
  'Hoàng thành Thăng Long được xây dựng vào năm 1010.\n\nTrải qua nhiều triều đại (Lý, Trần, Lê), nơi đây trở thành trung tâm chính trị của đất nước! Vì sao các vua chọn vùng đất này? Hãy cùng tìm hiểu…\n\nNăm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.';

// Đặc tả mong đợi 5 câu, tách thêm ở dấu "…". Bộ tách câu sẵn có không tách sau dấu "…" nên ra 4 câu, câu cuối gồm hai câu dính nhau (giữ nguyên bộ tách câu, ghi kết quả thật).
const REAL_SENTENCES = [
  'Hoàng thành Thăng Long được xây dựng vào năm 1010.',
  'Trải qua nhiều triều đại (Lý, Trần, Lê), nơi đây trở thành trung tâm chính trị của đất nước!',
  'Vì sao các vua chọn vùng đất này?',
  'Hãy cùng tìm hiểu… Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành là Di sản Văn hóa Thế giới.',
];

const MAIN_FIRST = 'Hoàng thành Thăng Long được xây dựng vào năm 1010.';
const MAIN_SECOND = 'Nơi đây là trung tâm chính trị của đất nước.';
const MAIN_THIRD = 'Đoạn hai của nội dung chính.';
const READING_FIRST = 'Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành.';
const READING_SECOND = 'Đó là Di sản Văn hóa Thế giới.';

interface FakeSource extends VoiceSource {
  requested: string[];
  prefetched: string[];
  /** Đoạn chữ nào chưa có tiếng. */
  missing: Set<string>;
}

function fakeSource(): FakeSource {
  const ready = new Set<string>();
  const source: FakeSource = {
    requested: [],
    prefetched: [],
    missing: new Set(),
    audioUrl: async (text) => {
      source.requested.push(text);
      if (source.missing.has(text)) return null;
      ready.add(text);
      return `http://api.test/files/speech/${encodeURIComponent(text)}.mp3`;
    },
    isReady: (text) => ready.has(text),
    prefetch: (texts) => void source.prefetched.push(...texts.filter((text): text is string => typeof text === 'string')),
  };
  return source;
}

type StatusListener = (status: { currentTime: number; didJustFinish: boolean; playbackState: string }) => void;

interface FakePlayer {
  uri: string;
  listener: StatusListener;
  pause: jest.Mock;
  remove: jest.Mock;
}

let source: FakeSource;
let players: FakePlayer[];

beforeEach(() => {
  source = fakeSource();
  players = [];
  configureCloudVoice(source);
  speak.mockClear();
  makePlayer.mockReset();
  makePlayer.mockImplementation(({ uri }: { uri: string }) => {
    const player: FakePlayer = { uri, listener: () => undefined, pause: jest.fn(), remove: jest.fn() };
    players.push(player);
    return {
      shouldCorrectPitch: false,
      addListener: (_event: string, listener: StatusListener) => {
        player.listener = listener;
        return { remove: jest.fn() };
      },
      play: jest.fn(),
      pause: player.pause,
      seekTo: jest.fn(async () => undefined),
      setPlaybackRate: jest.fn(),
      remove: player.remove,
    };
  });
  voices.mockReset();
  voices.mockImplementation(async () => [{ identifier: 'v', language: 'vi-VN' }]);
  resetVoiceNotice();
});

afterEach(() => {
  configureCloudVoice(null);
  resetVoiceNotice();
});

const settle = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));

function section(overrides: Partial<StudentSection>): StudentSection {
  return { type: 'READING', title: null, body: null, imageUrl: null, image: null, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 0, ...overrides };
}

function lessonOf(level: 2 | 3, overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 7,
    accessCode: 'BH9K2M4Q',
    title: 'Hoàng thành Thăng Long',
    className: level === 2 ? '8A1' : '11A1',
    teacherName: 'Cô Linh',
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    layout:
      level === 2
        ? { layout: 'FREE_STEPS', sequentialFlow: false, steps: [{ key: 'READ', label: 'Đọc bài' }, { key: 'TIMELINE', label: 'Dòng thời gian' }, { key: 'QUIZ', label: 'Bài kiểm tra' }] }
        : { layout: 'DOCUMENT', sequentialFlow: false, steps: [{ key: 'READ', label: 'Đọc bài' }] },
    summary: `${MAIN_FIRST} ${MAIN_SECOND}\n\n${MAIN_THIRD}`,
    keyPoints: [],
    sections: [
      section({ type: 'READING', title: 'Di sản thế giới', body: `${READING_FIRST} ${READING_SECOND}`, sortOrder: 1 }),
      section({ type: 'MILESTONE', body: 'Xây thành.', milestoneYear: 1010, milestoneLabel: '1010', sortOrder: 2 }),
    ],
    heritages: [],
    quizzes: [],
    ...overrides,
  };
}

async function render(level: 2 | 3, lesson: StudentLesson) {
  const i18n = createI18n('vi');
  const theme = themeForLevel(level);
  const element = level === 2 ? <LevelTwoLesson lesson={lesson} /> : <LevelThreeLesson lesson={lesson} />;
  let tree!: ReturnType<typeof create>;
  await act(async () => {
    tree = create(
      <I18nextProvider i18n={i18n}>
        <ThemeContext.Provider value={theme}>{element}</ThemeContext.Provider>
      </I18nextProvider>,
    );
  });
  const texts = () => tree.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat(3).join(''));
  /** Số nút có nhãn này. */
  const count = (label: string) => tree.root.findAll((node: ReactTestInstance) => typeof node.props.onPress === 'function' && node.props.accessibilityLabel === label).length;
  const press = async (label: string) => {
    const found = tree.root.findAll(
      (node: ReactTestInstance) =>
        typeof node.props.onPress === 'function' &&
        (node.props.accessibilityLabel === label || node.findAll((child) => (child.type as unknown) === 'Text' && [child.props.children].flat().join('') === label).length > 0),
    );
    if (found.length === 0) throw new Error(`Không thấy nút ${label}`);
    await act(async () => found[0]!.props.onPress());
  };
  /** Các câu đang được tô sáng. */
  const highlighted = () =>
    tree.root
      .findAll((node) => (node.type as unknown) === 'Text' && node.props.style?.backgroundColor === theme.color.primaryContainer)
      .map((node) => [node.props.children].flat(3).join('').trim());
  const unmount = () => act(() => tree.unmount());
  return { texts, count, press, highlighted, unmount };
}

/** Phát xong tệp tiếng của trình phát thứ `index`. */
const finish = (index: number) => act(async () => players[index]!.listener({ currentTime: 1, didJustFinish: true, playbackState: 'idle' }));

describe('bộ câu mẫu chung của bài đọc cấp 2, 3', () => {
  it('app tách đúng các câu mà giao diện hiển thị: ba câu đầu khớp đặc tả, câu thứ tư và thứ năm của đặc tả đang dính nhau', () => {
    expect(narrationSentences(SAMPLE, 'sentences')).toEqual(REAL_SENTENCES);
    expect(splitSentences(SAMPLE, 'vi-VN')).toEqual(REAL_SENTENCES);
    expect(readAlongLayout(SAMPLE, 'vi-VN').sentences).toEqual(REAL_SENTENCES);
  });
});

describe.each([2, 3] as const)('bài học cấp %i', (level) => {
  it('có nút "Nghe bài đọc" cho nội dung chính và nút "Nghe phần này" cho từng phần Bài đọc, chữ vẫn hiện đủ', async () => {
    const view = await render(level, lessonOf(level));
    expect(view.count('Nghe bài đọc')).toBe(1);
    expect(view.count('Nghe phần này')).toBe(1);
    expect(view.texts().some((text) => text.includes(MAIN_THIRD))).toBe(true);
    expect(view.texts().some((text) => text.includes(READING_SECOND))).toBe(true);
    await view.unmount();
  });

  it('bấm nghe: xin tiếng của máy chủ từng câu, tô sáng câu đang đọc, đọc xong câu thì sang câu sau, hết thì thôi tô', async () => {
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(source.requested).toEqual([MAIN_FIRST, MAIN_SECOND]);
    expect(makePlayer).toHaveBeenCalledWith({ uri: expect.stringContaining('http://api.test/files/speech/') }, expect.anything());
    expect(speak).not.toHaveBeenCalled();
    expect(view.highlighted()).toEqual([MAIN_FIRST]);
    expect(view.count('Dừng nghe')).toBe(1);

    await finish(0);
    await settle();
    expect(view.highlighted()).toEqual([MAIN_SECOND]);

    await finish(1);
    await settle();
    expect(view.highlighted()).toEqual([MAIN_THIRD]);

    await finish(2);
    await settle();
    expect(view.highlighted()).toEqual([]);
    expect(view.count('Nghe bài đọc')).toBe(1);
    await view.unmount();
  });

  it('bấm lại để dừng: bỏ tô sáng, ngắt tiếng, không đọc tiếp', async () => {
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(view.highlighted()).toEqual([MAIN_FIRST]);

    await view.press('Dừng nghe');
    expect(view.highlighted()).toEqual([]);
    expect(players[0]!.pause).toHaveBeenCalled();
    expect(view.count('Nghe bài đọc')).toBe(1);

    await finish(0);
    await settle();
    expect(source.requested).toEqual([MAIN_FIRST, MAIN_SECOND]);
    expect(view.highlighted()).toEqual([]);
    await view.unmount();
  });

  it('chỉ một đoạn đọc một lúc: bấm nghe phần Bài đọc thì nội dung chính dừng và hết tô sáng', async () => {
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(view.highlighted()).toEqual([MAIN_FIRST]);

    await view.press('Nghe phần này');
    await settle();
    expect(players[0]!.pause).toHaveBeenCalled();
    expect(view.highlighted()).toEqual([READING_FIRST]);
    expect(view.count('Nghe bài đọc')).toBe(1);
    expect(view.count('Dừng nghe')).toBe(1);
    await view.unmount();
  });

  it('rời màn thì dừng đọc', async () => {
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(players[0]!.pause).not.toHaveBeenCalled();

    await view.unmount();
    expect(players[0]!.pause).toHaveBeenCalled();
    expect(players[0]!.remove).toHaveBeenCalled();
  });

  it('vào bài thì chỉ xin 10 câu đầu của nội dung chính, không xin các phần Bài đọc', async () => {
    const summary = Array.from({ length: 14 }, (_, i) => `Câu cấp ${level} số ${i + 1} của nội dung chính.`).join(' ');
    const view = await render(level, lessonOf(level, { summary }));
    expect(source.prefetched).toEqual(Array.from({ length: 10 }, (_, i) => `Câu cấp ${level} số ${i + 1} của nội dung chính.`));
    await view.unmount();
  });

  it('máy chủ chưa có tiếng: đọc bằng giọng điện thoại vì máy có giọng tiếng Việt', async () => {
    source.missing.add(MAIN_FIRST);
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0]![0]).toBe(MAIN_FIRST);
    expect(getVoiceNoticeVisible()).toBe(false);
    expect(view.highlighted()).toEqual([MAIN_FIRST]);
    await view.unmount();
  });

  it('máy chủ chưa có tiếng và máy không có giọng tiếng Việt: không đọc, báo "Máy này chưa đọc được tiếng Việt"', async () => {
    source.missing.add(MAIN_FIRST);
    voices.mockImplementation(async () => [{ identifier: 'e', language: 'en-US' }]);
    const view = await render(level, lessonOf(level));
    await view.press('Nghe bài đọc');
    await settle();
    expect(speak).not.toHaveBeenCalled();
    expect(getVoiceNoticeVisible()).toBe(true);
    expect(view.highlighted()).toEqual([]);
    await view.unmount();
  });

  it('nội dung chính trống thì không có nút nghe cho nó, các phần khác vẫn có', async () => {
    const view = await render(level, lessonOf(level, { summary: null }));
    expect(view.count('Nghe bài đọc')).toBe(0);
    expect(view.count('Nghe phần này')).toBe(1);
    await view.unmount();
  });
});

describe('bài cấp 2: chuyển bước', () => {
  it('sang bước khác thì dừng đọc', async () => {
    const view = await render(2, lessonOf(2));
    await view.press('Nghe bài đọc');
    await settle();
    expect(players[0]!.pause).not.toHaveBeenCalled();

    await view.press('Dòng thời gian của bài');
    expect(players[0]!.pause).toHaveBeenCalled();
    await view.unmount();
  });
});
