import type { PublicNarration } from '@dsvhvn/dung-chung/api';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type NarrationAudio, useAudioNarration } from './useAudioNarration';

// Phát thuyết minh tạo sẵn bằng phần tử audio giả: test tự phát sự kiện thời gian, kết thúc và lỗi của tệp.

class FakeAudio implements NarrationAudio {
  static instances: FakeAudio[] = [];
  src = '';
  preload = '';
  playbackRate = 1;
  preservesPitch = false;
  currentTime = 0;
  plays = 0;
  pauses = 0;
  rejectPlay = false;
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.instances.push(this);
  }

  play(): Promise<void> {
    this.plays += 1;
    return this.rejectPlay ? Promise.reject(new Error('NotSupportedError')) : Promise.resolve();
  }

  pause(): void {
    this.pauses += 1;
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  /** Tệp chạy tới thời điểm `ms` và trình duyệt báo `timeupdate`. */
  tick(ms: number): void {
    this.currentTime = ms / 1000;
    this.emit('timeupdate');
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

const NARRATION: PublicNarration = {
  audioUrl: '/files/thuyet-minh/a.mp3',
  durationMs: 12800,
  voice: 'vieneu-mai-anh',
  sentences: [
    { text: 'Câu một.', startMs: 150, endMs: 4200 },
    { text: 'Câu hai.', startMs: 4550, endMs: 9000 },
    { text: 'Câu ba.', startMs: 9350, endMs: 12800 },
  ],
};

const URL = 'http://api.test/files/thuyet-minh/a.mp3';

function install() {
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('nghe thuyết minh tạo sẵn trên web', () => {
  it('tạo phần tử audio tải trước tệp, giữ cao độ; phát từ đầu và tô sáng câu theo thời điểm phát; hết tệp thì về trạng thái nghỉ', async () => {
    install();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL));
    expect(FakeAudio.instances).toHaveLength(1);
    const audio = FakeAudio.instances[0]!;
    expect(audio).toMatchObject({ src: URL, preload: 'auto', preservesPitch: true });
    expect(result.current).toMatchObject({ status: 'idle', index: -1, failed: false });

    await act(async () => result.current.play());
    expect(audio.plays).toBe(1);
    expect(result.current).toMatchObject({ status: 'playing', index: 0 });

    act(() => audio.tick(5000));
    expect(result.current.index).toBe(1);
    act(() => audio.tick(9100));
    expect(result.current.index).toBe(1);
    act(() => audio.tick(10000));
    expect(result.current.index).toBe(2);

    act(() => audio.emit('ended'));
    expect(result.current).toMatchObject({ status: 'idle', index: -1 });
  });

  it('tạm dừng giữ nguyên câu; tiếp tục phát tiếp; dừng thì về đầu tệp và không còn câu nào được tô', async () => {
    install();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL));
    const audio = FakeAudio.instances[0]!;
    await act(async () => result.current.play());
    act(() => audio.tick(5000));

    act(() => result.current.pause());
    expect(audio.pauses).toBe(1);
    expect(result.current).toMatchObject({ status: 'paused', index: 1 });

    await act(async () => result.current.resume());
    expect(audio.plays).toBe(2);
    expect(result.current.status).toBe('playing');

    act(() => result.current.stop());
    expect(audio.currentTime).toBe(0);
    expect(result.current).toMatchObject({ status: 'idle', index: -1 });
    // Sự kiện thời gian muộn sau khi dừng không tô câu nào.
    act(() => audio.tick(0));
    expect(result.current.index).toBe(-1);
  });

  it('đổi tốc độ áp ngay vào tệp đang phát và dùng cho lần phát sau', async () => {
    install();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL));
    const audio = FakeAudio.instances[0]!;
    await act(async () => result.current.play());
    act(() => result.current.setSpeed(1.5));
    expect(audio.playbackRate).toBe(1.5);
    expect(result.current.speed).toBe(1.5);
    act(() => result.current.stop());
    audio.playbackRate = 1;
    await act(async () => result.current.play());
    expect(audio.playbackRate).toBe(1.5);
  });

  it('nhảy tới một câu: đặt thời điểm ở đầu câu đó và phát nếu đang nghỉ', async () => {
    install();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL));
    const audio = FakeAudio.instances[0]!;
    await act(async () => result.current.seekTo(2));
    expect(audio.currentTime).toBe(9.35);
    expect(audio.plays).toBe(1);
    expect(result.current).toMatchObject({ status: 'playing', index: 2 });
  });

  it('tệp hỏng lúc chưa bấm: báo hỏng một lần, không đang nghe', () => {
    install();
    const onFail = vi.fn<(wasActive: boolean) => void>();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL, onFail));
    const audio = FakeAudio.instances[0]!;
    act(() => audio.emit('error'));
    act(() => audio.emit('error'));
    expect(result.current.failed).toBe(true);
    expect(onFail).toHaveBeenCalledTimes(1);
    expect(onFail).toHaveBeenCalledWith(false);
    act(() => result.current.play());
    expect(audio.plays).toBe(0);
  });

  it('trình duyệt từ chối phát: báo hỏng kèm cờ đang nghe để nơi gọi đọc tiếp bằng giọng thiết bị', async () => {
    install();
    const onFail = vi.fn<(wasActive: boolean) => void>();
    const { result } = renderHook(() => useAudioNarration(NARRATION, URL, onFail));
    FakeAudio.instances[0]!.rejectPlay = true;
    await act(async () => result.current.play());
    expect(result.current).toMatchObject({ status: 'idle', index: -1, failed: true });
    expect(onFail).toHaveBeenCalledWith(true);
  });

  it('không có thuyết minh thì không tạo phần tử audio; rời đi thì dừng và bỏ phần tử', async () => {
    install();
    const none = renderHook(() => useAudioNarration(null, null));
    expect(FakeAudio.instances).toHaveLength(0);
    none.unmount();

    const { result, unmount } = renderHook(() => useAudioNarration(NARRATION, URL));
    const audio = FakeAudio.instances[0]!;
    await act(async () => result.current.play());
    unmount();
    expect(audio.pauses).toBe(1);
  });
});
