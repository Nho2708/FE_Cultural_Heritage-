import { AudioNarrator, type AudioPlayer, type AudioPlayerFactory, type AudioPlayerStatus } from './audioNarrator';

// Phát thuyết minh tạo sẵn bằng trình phát giả: test tự báo thời điểm phát, kết thúc và lỗi của tệp.

interface FakePlayer extends AudioPlayer {
  url: string;
  plays: number;
  pauses: number;
  positionMs: number;
  rate: number;
  released: boolean;
  /** Trình phát báo đã chạy tới thời điểm `ms`. */
  tick(ms: number): void;
  report(status: Partial<AudioPlayerStatus>): void;
}

function fakeFactory(options: { failOnCreate?: boolean } = {}) {
  const players: FakePlayer[] = [];
  const factory: AudioPlayerFactory = (url, onStatus) => {
    if (options.failOnCreate) throw new Error('không tạo được trình phát');
    const player: FakePlayer = {
      url,
      plays: 0,
      pauses: 0,
      positionMs: 0,
      rate: 1,
      released: false,
      play: () => void (player.plays += 1),
      pause: () => void (player.pauses += 1),
      seekTo: (positionMs) => void (player.positionMs = positionMs),
      setRate: (rate) => void (player.rate = rate),
      release: () => void (player.released = true),
      tick: (ms) => {
        player.positionMs = ms;
        onStatus({ positionMs: ms, finished: false, error: false });
      },
      report: (status) => onStatus({ positionMs: player.positionMs, finished: false, error: false, ...status }),
    };
    players.push(player);
    return player;
  };
  return { factory, players };
}

const SENTENCES = [
  { text: 'Câu một.', startMs: 150, endMs: 4200 },
  { text: 'Câu hai.', startMs: 4550, endMs: 9000 },
  { text: 'Câu ba.', startMs: 9350, endMs: 12800 },
];

const URL = 'http://api.test/files/thuyet-minh/a.mp3';

describe('nghe thuyết minh tạo sẵn trên app', () => {
  it('tạo trình phát khi vào màn; phát từ đầu, tô sáng câu theo thời điểm phát và nghỉ khi hết tệp', () => {
    const { factory, players } = fakeFactory();
    const narrator = new AudioNarrator(factory, URL, SENTENCES);
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1, voiceState: 'ready', failed: false });
    narrator.init();
    narrator.init();
    expect(players).toHaveLength(1);
    expect(players[0]!.url).toBe(URL);

    narrator.play();
    expect(players[0]).toMatchObject({ plays: 1, positionMs: 0, rate: 1 });
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 0 });

    players[0]!.tick(5000);
    expect(narrator.getState().index).toBe(1);
    players[0]!.tick(9100);
    expect(narrator.getState().index).toBe(1);
    players[0]!.tick(10000);
    expect(narrator.getState().index).toBe(2);

    players[0]!.report({ finished: true });
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });
  });

  it('tạm dừng giữ nguyên câu; tiếp tục phát tiếp không đọc lại; dừng thì về đầu tệp', () => {
    const { factory, players } = fakeFactory();
    const narrator = new AudioNarrator(factory, URL, SENTENCES);
    narrator.init();
    narrator.play();
    players[0]!.tick(5000);

    narrator.pause();
    expect(players[0]!.pauses).toBe(1);
    expect(narrator.getState()).toMatchObject({ status: 'paused', index: 1 });

    narrator.resume();
    expect(players[0]).toMatchObject({ plays: 2, positionMs: 5000 });
    expect(narrator.getState().status).toBe('playing');

    narrator.stop();
    expect(players[0]!.positionMs).toBe(0);
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });
    // Trạng thái muộn của trình phát sau khi dừng không tô câu nào.
    players[0]!.tick(0);
    expect(narrator.getState().index).toBe(-1);
  });

  it('đổi tốc độ áp ngay vào tệp đang phát và dùng cho lần phát sau', () => {
    const { factory, players } = fakeFactory();
    const narrator = new AudioNarrator(factory, URL, SENTENCES);
    narrator.init();
    narrator.play();
    narrator.setSpeed(1.5);
    expect(players[0]!.rate).toBe(1.5);
    expect(players[0]!.plays).toBe(1);
    expect(narrator.getState().speed).toBe(1.5);
    narrator.stop();
    players[0]!.rate = 1;
    narrator.play();
    expect(players[0]!.rate).toBe(1.5);
  });

  it('nhảy tới một câu: đặt thời điểm ở đầu câu đó và phát nếu đang nghỉ', () => {
    const { factory, players } = fakeFactory();
    const narrator = new AudioNarrator(factory, URL, SENTENCES);
    narrator.init();
    narrator.seekTo(2);
    expect(players[0]).toMatchObject({ positionMs: 9350, plays: 1 });
    expect(narrator.getState()).toMatchObject({ status: 'playing', index: 2 });
    narrator.seekTo(9);
    expect(players[0]).toMatchObject({ positionMs: 9350, plays: 1 });
  });

  it('tệp hỏng lúc chưa bấm: báo hỏng một lần (không đang nghe) và không phát nữa', () => {
    const { factory, players } = fakeFactory();
    const onFail = jest.fn<void, [boolean]>();
    const narrator = new AudioNarrator(factory, URL, SENTENCES, onFail);
    narrator.init();
    players[0]!.report({ error: true });
    players[0]!.report({ error: true });
    expect(narrator.getState()).toMatchObject({ status: 'idle', failed: true });
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith(false);
    narrator.play();
    expect(players[0]!.plays).toBe(0);
  });

  it('tệp hỏng giữa chừng: báo hỏng kèm cờ đang nghe để nơi gọi đọc tiếp bằng giọng thiết bị', () => {
    const { factory, players } = fakeFactory();
    const onFail = jest.fn<void, [boolean]>();
    const narrator = new AudioNarrator(factory, URL, SENTENCES, onFail);
    narrator.init();
    narrator.play();
    players[0]!.report({ error: true });
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1, failed: true });
    expect(players[0]!.pauses).toBe(1);
    expect(onFail).toHaveBeenCalledWith(true);
  });

  it('không tạo được trình phát thì cũng xem như tệp hỏng', () => {
    const { factory } = fakeFactory({ failOnCreate: true });
    const onFail = jest.fn<void, [boolean]>();
    const narrator = new AudioNarrator(factory, URL, SENTENCES, onFail);
    narrator.init();
    expect(narrator.getState().failed).toBe(true);
    expect(onFail).toHaveBeenCalledWith(false);
  });

  it('tự phát khi vào màn, một lần; không đè lên việc người dùng đã tự bấm dừng; không chạy sau khi rời màn', async () => {
    const auto = fakeFactory();
    const first = new AudioNarrator(auto.factory, URL, SENTENCES);
    await first.playWhenReady();
    expect(auto.players[0]!.plays).toBe(1);
    expect(first.getState().status).toBe('playing');

    const stopped = fakeFactory();
    const second = new AudioNarrator(stopped.factory, URL, SENTENCES);
    second.init();
    second.stop();
    await second.playWhenReady();
    expect(stopped.players[0]!.plays).toBe(0);
  });

  it('rời màn hình thì giải phóng trình phát và bỏ qua trạng thái muộn; vào lại thì tạo trình phát mới', () => {
    const { factory, players } = fakeFactory();
    const narrator = new AudioNarrator(factory, URL, SENTENCES);
    narrator.init();
    narrator.play();
    narrator.dispose();
    expect(players[0]!.released).toBe(true);
    players[0]!.tick(5000);
    expect(narrator.getState()).toMatchObject({ status: 'idle', index: -1 });

    narrator.init();
    expect(players).toHaveLength(2);
  });
});
