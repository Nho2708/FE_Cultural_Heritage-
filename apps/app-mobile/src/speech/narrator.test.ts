import { Narrator, type SpeakOptions, type SpeechEngine, type Voice } from './narrator';

interface Spoken {
  text: string;
  options: SpeakOptions;
}

function fakeEngine(voices: Voice[] | null) {
  const spoken: Spoken[] = [];
  let stops = 0;
  const engine: SpeechEngine = {
    speak: (text, options) => void spoken.push({ text, options }),
    stop: () => {
      stops += 1;
    },
    voices: async () => voices,
  };
  return { engine, spoken, stops: () => stops };
}

const SENTENCES = ['Câu một.', 'Câu hai.', 'Câu ba.'];

describe('nghe thuyết minh bằng giọng của thiết bị', () => {
  it('đọc lần lượt từng câu, báo câu đang đọc và dừng ở cuối', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'vi-VN', id: 'v1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'vi-VN');
    await narrator.init();
    expect(narrator.getState().voiceState).toBe('ready');

    narrator.play();
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 0 });
    expect(spoken[0]).toMatchObject({ text: 'Câu một.', options: { language: 'vi-VN', voice: 'v1', rate: 1 } });

    spoken[0]!.options.onDone();
    expect(narrator.getState().index).toBe(1);
    spoken[1]!.options.onDone();
    spoken[2]!.options.onDone();
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });
  });

  it('tạm dừng rồi đọc tiếp từ đầu câu đang đọc', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'vi-VN', id: 'v1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'vi-VN');
    await narrator.init();
    narrator.play();
    spoken[0]!.options.onDone();
    narrator.pause();
    expect(narrator.getState()).toMatchObject({ status: 'paused', index: 1 });

    // Sự kiện muộn của câu cũ không làm đọc tiếp khi đang tạm dừng.
    spoken[1]!.options.onDone();
    expect(spoken).toHaveLength(2);

    narrator.resume();
    expect(spoken[2]).toMatchObject({ text: 'Câu hai.' });
    expect(narrator.getState().status).toBe('playing');
  });

  it('đổi tốc độ khi đang đọc thì đọc lại câu hiện tại với tốc độ mới', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'ko-KR', id: 'k1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'ko-KR');
    await narrator.init();
    narrator.play();
    narrator.setSpeed(1.5);
    expect(spoken[1]).toMatchObject({ text: 'Câu một.', options: { rate: 1.5 } });
    expect(narrator.getState().speed).toBe(1.5);
  });

  it('dừng hẳn thì quay về trạng thái nghỉ và bỏ qua sự kiện muộn', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'vi-VN', id: 'v1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'vi-VN');
    await narrator.init();
    narrator.play();
    narrator.stop();
    spoken[0]!.options.onDone();
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });
    expect(spoken).toHaveLength(1);
  });

  it('báo thiếu giọng của ngôn ngữ nhưng vẫn cho thử đọc', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'en-US', id: 'e1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'ja-JP');
    await narrator.init();
    expect(narrator.getState().voiceState).toBe('missing');
    narrator.play();
    expect(spoken[0]?.options.voice).toBeUndefined();
  });

  it('thiết bị không hỗ trợ đọc thì không đọc và báo không hỗ trợ', async () => {
    const { engine, spoken } = fakeEngine(null);
    const narrator = new Narrator(engine, SENTENCES, 'vi-VN');
    await narrator.init();
    narrator.play();
    expect(narrator.getState().voiceState).toBe('unsupported');
    expect(spoken).toHaveLength(0);
  });

  it('lỗi của giọng đọc đưa về trạng thái nghỉ', async () => {
    const { engine, spoken } = fakeEngine([{ lang: 'vi-VN', id: 'v1' }]);
    const narrator = new Narrator(engine, SENTENCES, 'vi-VN');
    await narrator.init();
    narrator.play();
    spoken[0]!.options.onError();
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });
  });
});
