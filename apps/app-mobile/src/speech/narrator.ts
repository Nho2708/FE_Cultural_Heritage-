import { pickVoice } from '@dsvhvn/dung-chung/speech';

// Nghe thuyết minh bằng giọng đọc có sẵn của điện thoại (không tạo, không lưu, không phát tệp âm thanh). Văn bản đã cắt thành từng câu và được đọc lần lượt để
// tô sáng câu đang đọc, không dựa vào sự kiện ranh giới từ vì thiết bị không đồng đều. Tạm dừng làm cùng một cách trên iOS và Android (dừng ở đầu câu
// đang đọc rồi đọc tiếp từ câu đó) vì Android không có tạm dừng gốc. Phần này tách khỏi expo-speech qua `SpeechEngine` để kiểm bằng test đơn vị.

export const SPEEDS = [0.75, 1, 1.25, 1.5] as const;
export type Speed = (typeof SPEEDS)[number];

export interface Voice {
  /** Mã giọng của thiết bị, ví dụ `vi-VN`. */
  lang: string;
  id: string;
}

export interface SpeakOptions {
  language: string;
  voice?: string;
  rate: number;
  onDone: () => void;
  onError: () => void;
}

export interface SpeechEngine {
  speak(text: string, options: SpeakOptions): void;
  stop(): void;
  /** Danh sách giọng của thiết bị; null nếu thiết bị không hỗ trợ đọc thành tiếng. */
  voices(): Promise<Voice[] | null>;
}

/**
 * `unsupported`: thiết bị không đọc được thành tiếng. `missing`: có giọng đọc nhưng không có giọng cho ngôn ngữ này (giao diện báo, gợi ý cài giọng, vẫn hiện chữ).
 * `unknown`: chưa biết (danh sách giọng chưa nạp) nên cứ cho thử đọc. `ready`: có giọng.
 */
export type VoiceState = 'unsupported' | 'missing' | 'unknown' | 'ready';

export type NarrationStatus = 'idle' | 'playing' | 'paused';

export interface NarrationState {
  status: NarrationStatus;
  /** Chỉ số câu đang đọc, -1 khi không đọc. */
  index: number;
  speed: Speed;
  voiceState: VoiceState;
}

type Listener = () => void;

export class Narrator {
  private token = 0;
  private voice: Voice | undefined;
  private listeners = new Set<Listener>();
  private state: NarrationState = { status: 'idle', index: -1, speed: 1, voiceState: 'unknown' };

  constructor(
    private readonly engine: SpeechEngine,
    private readonly sentences: readonly string[],
    private readonly speechTag: string,
  ) {}

  getState = (): NarrationState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Nạp danh sách giọng để biết thiết bị có giọng cho ngôn ngữ này không. */
  async init(): Promise<void> {
    let voices: Voice[] | null;
    try {
      voices = await this.engine.voices();
    } catch {
      voices = null;
    }
    if (voices === null) return this.set({ voiceState: 'unsupported' });
    if (voices.length === 0) return this.set({ voiceState: 'unknown' });
    this.voice = pickVoice(voices, this.speechTag);
    this.set({ voiceState: this.voice ? 'ready' : 'missing' });
  }

  play(): void {
    this.speakFrom(0, this.state.speed);
  }

  pause(): void {
    if (this.state.status !== 'playing') return;
    this.token += 1;
    this.engine.stop();
    this.set({ status: 'paused' });
  }

  resume(): void {
    if (this.state.status !== 'paused') return;
    this.speakFrom(Math.max(0, this.state.index), this.state.speed);
  }

  stop(): void {
    this.token += 1;
    this.engine.stop();
    this.set({ status: 'idle', index: -1 });
  }

  /** Đổi tốc độ: đang đọc thì đọc lại từ đầu câu hiện tại với tốc độ mới. */
  setSpeed(speed: Speed): void {
    const { status, index } = this.state;
    this.set({ speed });
    if (status === 'playing' && index >= 0) this.speakFrom(index, speed);
  }

  dispose(): void {
    this.token += 1;
    this.engine.stop();
    this.listeners.clear();
  }

  private speakFrom(start: number, rate: Speed): void {
    if (this.sentences.length === 0 || this.state.voiceState === 'unsupported') return;
    this.engine.stop();
    const mine = ++this.token;
    this.set({ status: 'playing' });
    const next = (position: number) => {
      if (mine !== this.token) return;
      if (position >= this.sentences.length) {
        this.set({ status: 'idle', index: -1 });
        return;
      }
      this.set({ index: position });
      this.engine.speak(this.sentences[position] ?? '', {
        language: this.speechTag,
        voice: this.voice?.id,
        rate,
        onDone: () => next(position + 1),
        onError: () => {
          if (mine === this.token) this.set({ status: 'idle', index: -1 });
        },
      });
    };
    next(Math.max(0, Math.min(start, this.sentences.length - 1)));
  }

  private set(patch: Partial<NarrationState>): void {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
}
