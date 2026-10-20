import { sentenceIndexAt, sentenceStartMs, type TimedSentence } from '@dsvhvn/dung-chung/speech';
import type { NarrationState, Speed } from './narrator';

// Nghe thuyết minh tạo sẵn: một tệp MP3 đọc cả bản tóm tắt ngắn bằng giọng tự host, kèm mốc bắt đầu của từng câu. Câu đang đọc tính từ thời điểm
// phát mà trình phát báo định kỳ; tốc độ đổi ngay trên tệp đang phát và giữ cao độ; tạm dừng là tạm dừng thật (không đọc lại đầu câu như giọng thiết bị).
// Tệp không tải hay không phát được (mạng, 404, hỏng) thì báo cho nơi gọi lùi về giọng của thiết bị. Trạng thái giữ cùng dạng với `Narrator`
// để giao diện không phải đổi; phần phát tách khỏi expo-audio qua `AudioPlayer` để kiểm bằng test đơn vị.

export interface AudioPlayerStatus {
  /** Thời điểm phát hiện tại trong tệp (mili giây). */
  positionMs: number;
  /** Vừa phát tới cuối tệp. */
  finished: boolean;
  /** Tệp không tải hoặc không phát được. */
  error: boolean;
}

export interface AudioPlayer {
  play(): void;
  pause(): void;
  seekTo(positionMs: number): void;
  /** Tốc độ phát, giữ cao độ. */
  setRate(rate: number): void;
  /** Giải phóng trình phát; sau đó không báo trạng thái nữa. */
  release(): void;
}

/** Tạo trình phát cho một tệp và báo trạng thái định kỳ (khoảng 100 ms khi đang phát, và khi tạm dừng, kết thúc, lỗi). */
export type AudioPlayerFactory = (url: string, onStatus: (status: AudioPlayerStatus) => void) => AudioPlayer;

export interface AudioNarrationState extends NarrationState {
  /** Tệp không dùng được: nơi gọi chuyển sang giọng của thiết bị. */
  failed: boolean;
}

type Listener = () => void;

export class AudioNarrator {
  private player: AudioPlayer | null = null;
  private touched = false;
  private disposed = false;
  private listeners = new Set<Listener>();
  private state: AudioNarrationState = { status: 'idle', index: -1, speed: 1, voiceState: 'ready', failed: false };

  constructor(
    private readonly createPlayer: AudioPlayerFactory,
    private readonly url: string,
    private readonly sentences: readonly TimedSentence[],
    /** Gọi một lần khi tệp hỏng; `wasActive` cho biết người dùng đang nghe (để đọc tiếp bằng giọng thiết bị thay vì im lặng). */
    private readonly onFail?: (wasActive: boolean) => void,
  ) {}

  getState = (): AudioNarrationState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Tạo trình phát (bắt đầu tải tệp) để bấm Phát là nghe ngay; tệp hỏng được biết sớm. Gọi nhiều lần chỉ tạo một lần. */
  init(): void {
    this.disposed = false;
    if (this.player || this.state.failed || this.sentences.length === 0) return;
    try {
      this.player = this.createPlayer(this.url, (status) => this.onStatus(status));
    } catch {
      this.fail();
    }
  }

  play(): void {
    this.touched = true;
    if (!this.player || this.state.failed) return;
    this.player.seekTo(0);
    this.player.setRate(this.state.speed);
    this.player.play();
    this.set({ status: 'playing', index: sentenceIndexAt(this.sentences, 0) });
  }

  /** Tự phát khi vào màn, trừ khi người dùng đã tự bấm phát hay dừng trong lúc chờ, hoặc đã rời màn. Tệp hỏng thì nơi gọi lùi về giọng thiết bị qua `onFail`. */
  async playWhenReady(): Promise<void> {
    this.init();
    if (this.disposed || this.touched || this.state.failed) return;
    this.play();
  }

  pause(): void {
    if (!this.player || this.state.status !== 'playing') return;
    this.player.pause();
    this.set({ status: 'paused' });
  }

  resume(): void {
    if (!this.player || this.state.status !== 'paused') return;
    this.player.play();
    this.set({ status: 'playing' });
  }

  stop(): void {
    this.touched = true;
    if (this.player) {
      this.player.pause();
      this.player.seekTo(0);
    }
    this.set({ status: 'idle', index: -1 });
  }

  /** Đổi tốc độ: áp ngay vào tệp đang phát, không đọc lại câu. */
  setSpeed(speed: Speed): void {
    this.set({ speed });
    this.player?.setRate(speed);
  }

  /** Nhảy tới đầu một câu và phát từ đó (đang nghỉ hay tạm dừng thì phát luôn). */
  seekTo(index: number): void {
    this.touched = true;
    if (!this.player || this.state.failed || this.sentences.length === 0) return;
    const target = Math.max(0, Math.min(index, this.sentences.length - 1));
    this.player.seekTo(sentenceStartMs(this.sentences, target));
    if (this.state.status !== 'playing') {
      this.player.setRate(this.state.speed);
      this.player.play();
    }
    this.set({ status: 'playing', index: target });
  }

  /** Rời màn hình: giải phóng trình phát. `init()` lại thì tạo trình phát mới (React chạy effect hai lần khi phát triển). */
  dispose(): void {
    this.disposed = true;
    this.player?.release();
    this.player = null;
    this.state = { ...this.state, status: 'idle', index: -1 };
  }

  private onStatus(status: AudioPlayerStatus): void {
    if (this.disposed) return;
    if (status.error) return this.fail();
    if (this.state.status === 'idle') return;
    if (status.finished) return this.set({ status: 'idle', index: -1 });
    const index = sentenceIndexAt(this.sentences, status.positionMs);
    if (index !== this.state.index) this.set({ index });
  }

  private fail(): void {
    if (this.state.failed) return;
    const wasActive = this.state.status !== 'idle';
    this.player?.pause();
    this.set({ status: 'idle', index: -1, failed: true });
    this.onFail?.(wasActive);
  }

  private set(patch: Partial<AudioNarrationState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}
