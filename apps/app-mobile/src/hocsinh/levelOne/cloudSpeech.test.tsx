import { LEVEL_ONE_FIXED_PHRASES } from '@dsvhvn/dung-chung';
import { createAudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { act } from 'react-test-renderer';
import { configureCloudVoice, type VoiceSource } from '../../speech/cloudVoice';
import { getVoiceNoticeVisible, resetVoiceNotice } from '../../speech/voiceNotice';
import { LevelOneHome } from './LevelOneHome';
import { LevelOneLesson } from './LevelOneLesson';
import { PracticeRunner } from './PracticeRunner';
import { attemptQuestion, classLesson, levelOneLesson, practiceAttempt, renderLevelOne, section, studentHome } from './testKit';

// Giọng đọc của máy chủ ở khu học cấp 1: nút nghe xin tiếng của máy chủ trước rồi phát tệp, chỉ lùi về giọng điện thoại khi máy có giọng tiếng Việt, không thì báo;
// vào trang học, bài học và từng câu hỏi thì nhờ máy chủ tạo trước tiếng; lời chào không có tên em.

jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock('../../motion/useReducedMotion', () => ({ useReducedMotion: () => true }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), getAvailableVoicesAsync: jest.fn(async () => [{ identifier: 'v', language: 'vi-VN' }]) }));
jest.mock('../../state/AppProvider', () => ({ useServices: () => ({ studentApi: { checkAnswer: jest.fn(), submit: jest.fn(), result: jest.fn() } }) }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const speak = Speech.speak as unknown as jest.Mock;
const voices = Speech.getAvailableVoicesAsync as unknown as jest.Mock;
const makePlayer = createAudioPlayer as unknown as jest.Mock;

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

let source: FakeSource;

beforeEach(async () => {
  source = fakeSource();
  configureCloudVoice(source);
  speak.mockClear();
  makePlayer.mockReset();
  makePlayer.mockImplementation(() => ({
    shouldCorrectPitch: false,
    addListener: () => ({ remove: jest.fn() }),
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(async () => undefined),
    setPlaybackRate: jest.fn(),
    remove: jest.fn(),
  }));
  voices.mockReset();
  voices.mockImplementation(async () => [{ identifier: 'v', language: 'vi-VN' }]);
  resetVoiceNotice();
  const { prefs, KEYS } = jest.requireActual('../../storage/keyValue') as typeof import('../../storage/keyValue');
  await prefs.set(KEYS.autoRead, '0');
});

afterEach(() => {
  configureCloudVoice(null);
  resetVoiceNotice();
});

const settle = () => act(async () => new Promise<void>((resolve) => setTimeout(resolve, 0)));

describe('trang học', () => {
  const cheer = 'Hôm nay mình học bài “Chùa Một Cột” nhé!';
  const home = () => studentHome({ fullName: 'Nguyễn Văn Minh', cheer, classLessons: [classLesson(1, { title: 'Chùa Một Cột' })] });
  const props = { schoolName: null, refreshing: false, onRefresh: jest.fn(), onOpenLesson: jest.fn(), onPlayOn: jest.fn(), onAlbum: jest.fn(), onEnterCode: jest.fn() };

  it('vào trang thì nhờ máy chủ tạo trước tiếng lời chào không tên, lời cổ vũ và các câu cố định của cấp 1', async () => {
    const view = await renderLevelOne(<LevelOneHome {...props} home={home()} />);
    expect(source.prefetched).toContain(`Chào em! ${cheer}`);
    expect(source.prefetched).toEqual(expect.arrayContaining([...LEVEL_ONE_FIXED_PHRASES]));
    expect(source.prefetched.join(' ')).not.toContain('Minh');
    view.unmount();
  });

  it('nút nghe lời chào xin tiếng của máy chủ với lời chào không có tên em rồi phát tệp, không dùng giọng điện thoại', async () => {
    const view = await renderLevelOne(<LevelOneHome {...props} home={home()} />);
    await view.press('Nghe lời chào');
    await settle();

    expect(source.requested).toEqual([`Chào em! ${cheer}`]);
    expect(makePlayer).toHaveBeenCalledWith({ uri: expect.stringContaining('http://api.test/files/speech/') }, expect.anything());
    expect(speak).not.toHaveBeenCalled();
    view.unmount();
  });

  it('máy chủ chưa có tiếng: đọc bằng giọng điện thoại vì máy có giọng tiếng Việt', async () => {
    source.missing.add(`Chào em! ${cheer}`);
    const view = await renderLevelOne(<LevelOneHome {...props} home={home()} />);
    await view.press('Nghe lời chào');
    await settle();

    expect(speak).toHaveBeenCalledTimes(1);
    expect(speak.mock.calls[0]![0]).toBe(`Chào em! ${cheer}`);
    expect(getVoiceNoticeVisible()).toBe(false);
    view.unmount();
  });

  it('máy chủ chưa có tiếng và máy không có giọng tiếng Việt: không đọc, báo "Máy này chưa đọc được tiếng Việt"', async () => {
    source.missing.add(`Chào em! ${cheer}`);
    voices.mockImplementation(async () => [{ identifier: 'e', language: 'en-US' }]);
    const view = await renderLevelOne(<LevelOneHome {...props} home={home()} />);
    await view.press('Nghe lời chào');
    await settle();

    expect(speak).not.toHaveBeenCalled();
    expect(getVoiceNoticeVisible()).toBe(true);
    view.unmount();
  });
});

describe('bài học', () => {
  const STEPS = [
    { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
    { key: 'VIEW_IMAGES', label: 'Xem hình' },
    { key: 'EARN_CARD', label: 'Nhận thẻ' },
  ];
  const STORY = [
    section({ type: 'STORY', body: 'Giữa hồ có một ngôi chùa nhỏ. Chùa đứng trên một cây cột đá.', imageUrl: 'https://anh.test/chua.jpg', title: 'Chùa Một Cột', sortOrder: 1 }),
    section({ type: 'STORY', body: 'Đoạn hai của câu chuyện.', sortOrder: 2 }),
  ];

  it('vào bài thì nhờ máy chủ tạo trước tiếng từng câu kể chuyện, tên hình và các ý cần nhớ', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(STEPS, STORY, { keyPoints: ['Chùa có một cột', 'Chùa ở Hà Nội'] })} />);
    expect(source.prefetched).toEqual(
      expect.arrayContaining(['Giữa hồ có một ngôi chùa nhỏ.', 'Chùa đứng trên một cây cột đá.', 'Đoạn hai của câu chuyện.', 'Chùa Một Cột', 'Chùa có một cột. Chùa ở Hà Nội']),
    );
    view.unmount();
  });

  it('đọc đoạn truyện: mỗi câu một lời xin, trong lúc đọc câu này thì xin trước câu sau', async () => {
    const view = await renderLevelOne(<LevelOneLesson lesson={levelOneLesson(STEPS, STORY)} />);
    await view.press('Nghe đoạn này');
    await settle();

    expect(source.requested).toEqual(['Giữa hồ có một ngôi chùa nhỏ.', 'Chùa đứng trên một cây cột đá.']);
    expect(speak).not.toHaveBeenCalled();
    view.unmount();
  });
});

describe('bài chơi', () => {
  it('vào mỗi câu thì nhờ máy chủ tạo trước tiếng nội dung câu, lời hướng dẫn của câu này và câu kế tiếp', async () => {
    const questions = [
      attemptQuestion(1, { content: 'Đâu là Chùa Một Cột?' }),
      attemptQuestion(2, { content: 'Đâu là Khuê Văn Các?', questionType: 'TRUE_FALSE' }),
      attemptQuestion(3, { content: 'Câu ba chưa tới lượt.' }),
    ];
    const view = await renderLevelOne(<PracticeRunner attempt={practiceAttempt(questions)} onFinished={jest.fn()} onPause={jest.fn()} />);

    expect(source.prefetched).toEqual(expect.arrayContaining(['Đâu là Chùa Một Cột?', 'Em chạm vào hình đúng.', 'Đâu là Khuê Văn Các?', 'Em chạm Đúng hoặc Sai.']));
    expect(source.prefetched).not.toContain('Câu ba chưa tới lượt.');
    view.unmount();
  });
});
