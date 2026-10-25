import type { AudioPlayer, AudioPlayerFactory, AudioPlayerStatus } from './audioNarrator';
import { CloudNarrator } from './cloudNarrator';
import type { VoiceSource } from './cloudVoice';
import type { SpeakOptions, SpeechEngine, Voice } from './narrator';

// Nghe giọng tiếng Việt của máy chủ bằng nguồn giọng, trình phát và giọng điện thoại giả: máy chủ có tiếng thì phát tệp, đang chờ thì báo chuẩn bị,
// trong lúc phát câu này thì xin trước câu sau; máy chủ không có tiếng thì chỉ dùng giọng điện thoại khi điện thoại có giọng tiếng Việt, không thì báo.

interface FakePlayer extends AudioPlayer {
  url: string;
  plays: number;
  pauses: number;
  released: boolean;
  report(status: Partial<AudioPlayerStatus>): void;
}

function fakePlayers() {
  const players: FakePlayer[] = [];
  const factory: AudioPlayerFactory = (url, onStatus) => {
    const player: FakePlayer = {
      url,
      plays: 0,
      pauses: 0,
      released: false,
      play: () => void (player.plays += 1),
      pause: () => void (player.pauses += 1),
      seekTo: () => undefined,
      setRate: () => undefined,
      release: () => void (player.released = true),
      report: (status) => onStatus({ positionMs: 0, finished: false, error: false, ...status }),
    };
    players.push(player);
    return player;
  };
  return { factory, players };
}

interface FakeSource extends VoiceSource {
  requested: string[];
  /** Đoạn chữ nào chưa có tiếng: trả null. */
  missing: Set<string>;
  /** Giữ lời xin của các đoạn này cho tới khi gọi hàm trả về từ `held`. */
  held: Map<string, () => void>;
  hold(text: string): void;
}

function fakeSource(): FakeSource {
  const ready = new Set<string>();
  const holds = new Set<string>();
  const source: FakeSource = {
    requested: [],
    missing: new Set(),
    held: new Map(),
    hold(text) {
      holds.add(text);
    },
    audioUrl: async (text) => {
      // Nguồn thật nhớ tiếng đã xin nên xin lại cùng một đoạn không tính là lời xin mới.
      if (!source.requested.includes(text)) source.requested.push(text);
      if (holds.has(text)) {
        await new Promise<void>((resolve) => source.held.set(text, resolve));
      }
      if (source.missing.has(text)) return null;
      ready.add(text);
      return `http://api.test/files/speech/${encodeURIComponent(text)}.mp3`;
    },
    isReady: (text) => ready.has(text),
    prefetch: jest.fn(),
  };
  return source;
}

function fakeEngine(voices: Voice[] | null) {
  const spoken: Array<{ text: string; options: SpeakOptions }> = [];
  const engine: SpeechEngine = {
    speak: (text, options) => void spoken.push({ text, options }),
    stop: jest.fn(),
    voices: async () => voices,
  };
  return { engine, spoken };
}

const VI: Voice = { lang: 'vi-VN', id: 'vi-voice' };
const EN: Voice = { lang: 'en-US', id: 'en-voice' };
const flush = async () => {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
};

function setup(sentences: string[], options: { voices?: Voice[] | null; source?: FakeSource | null } = {}) {
  const { factory, players } = fakePlayers();
  const { engine, spoken } = fakeEngine(options.voices === undefined ? [VI] : options.voices);
  const source = options.source === undefined ? fakeSource() : options.source;
  const onNoVoice = jest.fn();
  const narrator = new CloudNarrator({ source, engine, createPlayer: factory, onNoVoice, voicesRetryMs: 0 }, sentences);
  return { narrator, players, spoken, source, onNoVoice, engine };
}

const urlOf = (text: string) => `http://api.test/files/speech/${encodeURIComponent(text)}.mp3`;

describe('nghe giọng của máy chủ', () => {
  it('máy chủ có tiếng thì phát tệp, không dùng giọng điện thoại; hết câu thì sang câu sau và nghỉ khi hết', async () => {
    const { narrator, players, spoken, source } = setup(['Câu một.', 'Câu hai.']);
    narrator.play();
    await flush();

    expect(source!.requested[0]).toBe('Câu một.');
    expect(players[0]!.url).toBe(urlOf('Câu một.'));
    expect(players[0]!.plays).toBe(1);
    expect(narrator.getState()).toEqual({ status: 'playing', index: 0, preparing: false });
    expect(spoken).toHaveLength(0);

    players[0]!.report({ finished: true });
    await flush();
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 1 });
    const second = players.find((p) => p.url === urlOf('Câu hai.'))!;
    expect(second.plays).toBe(1);

    second.report({ finished: true });
    await flush();
    expect(narrator.getState()).toEqual({ status: 'idle', index: -1, preparing: false });
    expect(spoken).toHaveLength(0);
  });

  it('đang chờ máy chủ tạo tiếng thì báo đang chuẩn bị, có tiếng thì thôi báo và phát', async () => {
    const source = fakeSource();
    source.hold('Câu một.');
    const { narrator, players } = setup(['Câu một.'], { source });
    narrator.play();
    await flush();
    expect(narrator.getState()).toEqual({ status: 'playing', index: 0, preparing: true });
    expect(players).toHaveLength(0);

    source.held.get('Câu một.')!();
    await flush();
    expect(narrator.getState()).toEqual({ status: 'playing', index: 0, preparing: false });
    expect(players[0]!.plays).toBe(1);
  });

  it('trong lúc phát câu hiện tại thì xin trước và tải sẵn tiếng câu kế tiếp, rồi dùng lại trình phát đó', async () => {
    const { narrator, players, source } = setup(['Câu một.', 'Câu hai.', 'Câu ba.']);
    narrator.play();
    await flush();

    // Câu một đang phát, câu hai đã được xin và có trình phát tải sẵn (chưa phát), câu ba chưa xin.
    expect(source!.requested).toEqual(['Câu một.', 'Câu hai.']);
    expect(players).toHaveLength(2);
    expect(players[0]!.plays).toBe(1);
    expect(players[1]!.plays).toBe(0);

    players[0]!.report({ finished: true });
    await flush();
    // Câu hai phát bằng chính trình phát đã tải sẵn (không tạo thêm), và câu ba được xin trước.
    expect(players[1]!.plays).toBe(1);
    expect(source!.requested).toEqual(['Câu một.', 'Câu hai.', 'Câu ba.']);
    expect(players.filter((p) => p.url === urlOf('Câu hai.'))).toHaveLength(1);
  });

  it('dừng thì dừng tiếng, bỏ lượt đang chờ và giải phóng trình phát', async () => {
    const source = fakeSource();
    source.hold('Câu hai.');
    const { narrator, players, spoken } = setup(['Câu một.', 'Câu hai.'], { source });
    narrator.play();
    await flush();
    players[0]!.report({ finished: true });
    await flush();
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 1, preparing: true });

    narrator.stop();
    source.held.get('Câu hai.')!();
    await flush();
    expect(narrator.getState()).toEqual({ status: 'idle', index: -1, preparing: false });
    expect(players.every((p) => p.released)).toBe(true);
    expect(spoken).toHaveLength(0);
    // Tệp đến muộn của lượt đã dừng không được phát.
    expect(players.filter((p) => p.plays > 0)).toHaveLength(1);
  });
});

describe('máy chủ chưa có tiếng', () => {
  it('điện thoại có giọng tiếng Việt thì đọc câu đó bằng giọng điện thoại rồi sang câu sau', async () => {
    const source = fakeSource();
    source.missing.add('Câu một.');
    const { narrator, spoken, onNoVoice, players } = setup(['Câu một.', 'Câu hai.'], { source, voices: [EN, VI] });
    narrator.play();
    await flush();

    expect(spoken.map((s) => s.text)).toEqual(['Câu một.']);
    expect(spoken[0]!.options.voice).toBe('vi-voice');
    expect(spoken[0]!.options.language).toBe('vi-VN');
    expect(players.some((p) => p.plays > 0)).toBe(false);
    expect(onNoVoice).not.toHaveBeenCalled();

    spoken[0]!.options.onDone();
    await flush();
    // Câu hai máy chủ có tiếng nên phát tệp; câu một đã đọc xong bằng giọng điện thoại.
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 1 });
    expect(players.find((p) => p.url === urlOf('Câu hai.'))!.plays).toBe(1);
  });

  it('điện thoại không có giọng tiếng Việt thì không đọc bằng giọng khác, báo và nghỉ', async () => {
    const source = fakeSource();
    source.missing.add('Câu một.');
    const { narrator, spoken, onNoVoice } = setup(['Câu một.', 'Câu hai.'], { source, voices: [EN] });
    narrator.play();
    await flush();

    expect(spoken).toHaveLength(0);
    expect(onNoVoice).toHaveBeenCalledTimes(1);
    expect(narrator.getState()).toEqual({ status: 'idle', index: -1, preparing: false });
  });

  it('điện thoại không đọc thành tiếng được (không có danh sách giọng) cũng báo', async () => {
    const { narrator, spoken, onNoVoice } = setup(['Câu một.'], { source: null, voices: null });
    narrator.play();
    await flush();
    expect(spoken).toHaveLength(0);
    expect(onNoVoice).toHaveBeenCalledTimes(1);
  });

  it('danh sách giọng còn rỗng thì hỏi lại một lần rồi mới kết luận', async () => {
    const { factory } = fakePlayers();
    const answers: Voice[][] = [[], [VI]];
    const spoken: string[] = [];
    const engine: SpeechEngine = { speak: (text) => void spoken.push(text), stop: jest.fn(), voices: async () => answers.shift() ?? [] };
    const onNoVoice = jest.fn();
    const narrator = new CloudNarrator({ source: null, engine, createPlayer: factory, onNoVoice, voicesRetryMs: 0 }, ['Câu một.']);
    narrator.play();
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(spoken).toEqual(['Câu một.']);
    expect(onNoVoice).not.toHaveBeenCalled();
  });

  it('tệp tải về bị lỗi thì lùi về giọng điện thoại nếu máy có giọng tiếng Việt', async () => {
    const { narrator, players, spoken } = setup(['Câu một.']);
    narrator.play();
    await flush();
    players[0]!.report({ error: true });
    await flush();
    expect(spoken.map((s) => s.text)).toEqual(['Câu một.']);
    expect(players[0]!.released).toBe(true);
  });

  it('tự đọc khi vào màn không đè lên lựa chọn của người dùng', async () => {
    const first = setup(['Câu một.']);
    await first.narrator.playWhenReady();
    await flush();
    expect(first.players).toHaveLength(1);

    const second = setup(['Câu một.']);
    second.narrator.stop();
    await second.narrator.playWhenReady();
    await flush();
    expect(second.players).toHaveLength(0);
  });
});
