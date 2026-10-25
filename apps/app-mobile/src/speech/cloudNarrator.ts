import { pickVoice } from '@dsvhvn/dung-chung/speech';
import type { AudioPlayer, AudioPlayerFactory, AudioPlayerStatus } from './audioNarrator';
import type { SpeechEngine, Voice } from './narrator';
import type { VoiceSource } from './cloudVoice';

// Nghe giọng tiếng Việt của máy chủ (cấp 1): mỗi câu xin một tệp MP3 từ máy chủ rồi phát bằng trình phát âm thanh sẵn có của app. Đang chờ máy chủ tạo tiếng thì
// báo `preparing` (nút loa hiện trạng thái đang chuẩn bị). Trong lúc phát câu hiện tại thì xin trước và tải sẵn tiếng của câu kế tiếp để hai câu nối liền.
// Câu nào máy chủ không trả tiếng thì lùi về giọng của điện thoại, nhưng CHỈ khi điện thoại có giọng tiếng Việt; không có thì không đọc bằng giọng khác
// mà báo "Máy này chưa đọc được tiếng Việt" (một lần). Đọc từng câu để tô sáng câu đang đọc. Phần này tách khỏi expo-audio, expo-speech qua `AudioPlayerFactory`
// và `SpeechEngine` để kiểm bằng test đơn vị.

export type CloudStatus = 'idle' | 'playing';

export interface CloudNarrationState {
  /** `playing` gồm cả lúc đang chờ máy chủ tạo tiếng. */
  status: CloudStatus;
  /** Chỉ số câu đang đọc, -1 khi không đọc. */
  index: number;
  /** Đang chờ máy chủ tạo tiếng của câu hiện tại. */
  preparing: boolean;
}

export interface CloudNarratorDeps {
  /** Nguồn giọng của máy chủ; null thì mọi câu đi thẳng sang giọng của điện thoại. */
  source: VoiceSource | null;
  engine: SpeechEngine;
  createPlayer: AudioPlayerFactory;
  /** Gọi khi không có giọng nào đọc được tiếng Việt. */
  onNoVoice: () => void;
  /** Mã giọng của điện thoại, mặc định `vi-VN`. */
  speechTag?: string;
  /** Chờ trước khi hỏi lại danh sách giọng của điện thoại khi nó còn rỗng (Android nạp chậm ở lần hỏi đầu). */
  voicesRetryMs?: number;
}

/** Một tệp tiếng đã tạo trình phát (có thể đã tải sẵn) chờ được phát. */
interface Clip {
  start(handler: (status: AudioPlayerStatus) => void): void;
  stop(): void;
  release(): void;
}

type Listener = () => void;

const IDLE: CloudNarrationState = { status: 'idle', index: -1, preparing: false };

/** Số tệp tải sẵn giữ tối đa (câu kế tiếp, thêm vài câu dự phòng). */
const PRELOADED_MAX = 3;

export class CloudNarrator {
  private token = 0;
  private touched = false;
  private disposed = false;
  private clip: Clip | null = null;
  private readonly preloaded = new Map<string, Clip>();
  private device: Promise<{ voice: Voice | undefined; usable: boolean }> | null = null;
  private listeners = new Set<Listener>();
  private state: CloudNarrationState = IDLE;

  constructor(
    private readonly deps: CloudNarratorDeps,
    private readonly sentences: readonly string[],
  ) {}

  getState = (): CloudNarrationState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Đọc từ câu đầu. */
  play(): void {
    this.touched = true;
    if (this.sentences.length === 0) return;
    this.halt();
    void this.read(0, this.token);
  }

  /** Tự đọc khi vào màn, trừ khi người dùng đã tự bấm đọc hay dừng trong lúc chờ, hoặc đã rời màn. */
  async playWhenReady(): Promise<void> {
    if (this.disposed || this.touched) return;
    this.play();
  }

  stop(): void {
    this.touched = true;
    this.halt();
    this.set(IDLE);
  }

  /** Dựng lại sau `dispose` (React chạy effect hai lần khi phát triển). */
  init(): void {
    this.disposed = false;
  }

  /** Rời màn hình: dừng hẳn và giải phóng mọi trình phát. */
  dispose(): void {
    this.disposed = true;
    this.halt();
    this.state = IDLE;
  }

  /** Dừng tiếng đang phát và bỏ lượt đọc đang chờ (số lượt tăng nên mọi việc dở của lượt cũ tự bỏ). */
  private halt(): void {
    this.token += 1;
    this.clip?.stop();
    this.clip?.release();
    this.clip = null;
    for (const clip of this.preloaded.values()) clip.release();
    this.preloaded.clear();
    this.deps.engine.stop();
  }

  private async read(index: number, mine: number): Promise<void> {
    if (mine !== this.token) return;
    const text = this.sentences[index];
    if (text === undefined) {
      this.set(IDLE);
      return;
    }
    const { source } = this.deps;
    this.set({ status: 'playing', index, preparing: source !== null && !source.isReady(text) });
    const url = source ? await source.audioUrl(text) : null;
    if (mine !== this.token) return;
    if (url) this.playClip(url, index, mine);
    else await this.speakOnDevice(index, mine);
  }

  private playClip(url: string, index: number, mine: number): void {
    let clip: Clip;
    try {
      clip = this.takeClip(url);
    } catch {
      void this.speakOnDevice(index, mine);
      return;
    }
    this.clip = clip;
    this.set({ status: 'playing', index, preparing: false });
    let ended = false;
    clip.start((status) => {
      if (mine !== this.token || ended) return;
      if (status.error) {
        ended = true;
        clip.release();
        if (this.clip === clip) this.clip = null;
        void this.speakOnDevice(index, mine);
      } else if (status.finished) {
        ended = true;
        clip.release();
        if (this.clip === clip) this.clip = null;
        void this.read(index + 1, mine);
      }
    });
    this.preloadNext(index + 1, mine);
  }

  /** Xin trước và tải sẵn tiếng của câu kế tiếp trong lúc câu hiện tại đang phát. */
  private preloadNext(index: number, mine: number): void {
    const next = this.sentences[index];
    const { source } = this.deps;
    if (next === undefined || !source) return;
    void source.audioUrl(next).then((url) => {
      if (!url || mine !== this.token || this.preloaded.has(url)) return;
      try {
        this.preloaded.set(url, this.makeClip(url));
        if (this.preloaded.size > PRELOADED_MAX) {
          const oldest = this.preloaded.keys().next().value!;
          this.preloaded.get(oldest)?.release();
          this.preloaded.delete(oldest);
        }
      } catch {
        // Tải sẵn chỉ là tiện, không được thì lúc phát tạo trình phát sau.
      }
    });
  }

  private takeClip(url: string): Clip {
    const ready = this.preloaded.get(url);
    if (ready) {
      this.preloaded.delete(url);
      return ready;
    }
    return this.makeClip(url);
  }

  private makeClip(url: string): Clip {
    let handler: ((status: AudioPlayerStatus) => void) | null = null;
    // Trình phát có thể báo lỗi tải trước khi tới lượt phát: giữ lại để báo ngay khi bắt đầu.
    let early: AudioPlayerStatus | null = null;
    const player: AudioPlayer = this.deps.createPlayer(url, (status) => {
      if (handler) handler(status);
      else if (status.error) early = status;
    });
    return {
      start: (next) => {
        handler = next;
        if (early) {
          next(early);
          return;
        }
        player.play();
      },
      stop: () => player.pause(),
      release: () => player.release(),
    };
  }

  /** Điện thoại có giọng tiếng Việt không (hỏi một lần; danh sách rỗng thì hỏi lại một lần sau ít lâu). */
  private deviceVoice(): Promise<{ voice: Voice | undefined; usable: boolean }> {
    this.device ??= (async () => {
      const tag = this.deps.speechTag ?? 'vi-VN';
      let voices: Voice[] | null;
      try {
        voices = await this.deps.engine.voices();
        if (voices !== null && voices.length === 0) {
          await new Promise((resolve) => setTimeout(resolve, this.deps.voicesRetryMs ?? 400));
          voices = await this.deps.engine.voices();
        }
      } catch {
        voices = null;
      }
      const voice = voices ? pickVoice(voices, tag) : undefined;
      return { voice, usable: voice !== undefined };
    })();
    return this.device;
  }

  private async speakOnDevice(index: number, mine: number): Promise<void> {
    const { voice, usable } = await this.deviceVoice();
    if (mine !== this.token) return;
    if (!usable) {
      this.deps.onNoVoice();
      this.set(IDLE);
      return;
    }
    const text = this.sentences[index] ?? '';
    this.set({ status: 'playing', index, preparing: false });
    this.deps.engine.speak(text, {
      language: this.deps.speechTag ?? 'vi-VN',
      voice: voice?.id,
      rate: 1,
      onDone: () => void this.read(index + 1, mine),
      onError: () => {
        if (mine === this.token) this.set(IDLE);
      },
    });
  }

  private set(next: CloudNarrationState): void {
    if (this.disposed) return;
    if (next.status === this.state.status && next.index === this.state.index && next.preparing === this.state.preparing) return;
    this.state = next;
    for (const listener of this.listeners) listener();
  }
}
