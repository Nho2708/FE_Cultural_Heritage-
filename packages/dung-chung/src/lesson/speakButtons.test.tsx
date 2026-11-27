import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LevelOneSpeak } from './LevelOneParts';
import { SpeakButton } from './SpeakButton';
import { SpeechNotice } from './SpeechNotice';
import { resetSpeechNotice, setTtsAccessTokenProvider, setTtsBaseUrl, stopAllSpeech } from './speechVoice';

// Nút loa: đang chờ máy chủ tạo tiếng thì xoay, báo "Đang chuẩn bị giọng đọc" cho trình đọc màn hình; máy không đọc được tiếng Việt thì hiện lời báo ngắn một lần.

const BASE = 'http://api.test/api/v1';

class FakeAudio {
  src: string;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn<() => Promise<void>>(async () => undefined);
  pause = vi.fn<() => void>();
  constructor(src = '') {
    this.src = src;
  }
}

let release: () => void;
let held: boolean;
let answer: string | null;

beforeEach(() => {
  held = true;
  answer = '/files/speech/a.mp3';
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'en-US', name: 'English' }], cancel: () => undefined, speak: () => undefined });
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (held) await gate;
      return new Response(JSON.stringify({ success: true, data: { audioUrl: answer } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }),
  );
  setTtsBaseUrl(BASE);
  setTtsAccessTokenProvider(() => 'token-hoc-sinh');
  resetSpeechNotice();
});

afterEach(() => {
  stopAllSpeech();
  setTtsAccessTokenProvider(() => null);
  resetSpeechNotice();
  cleanup();
});

describe('nút loa của cấp 1', () => {
  it('đang chờ máy chủ thì báo đang chuẩn bị (xoay, aria-busy, vùng báo), có tiếng thì trở lại như thường', async () => {
    render(<LevelOneSpeak text="Chùa Một Cột đứng giữa hồ." label="Nghe câu hỏi" />);
    const button = screen.getByRole('button', { name: 'Nghe câu hỏi' });
    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('.animate-spin, [class*="animate-spin"]')).toBeNull();

    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    expect(button.querySelector('[class*="animate-spin"]')).not.toBeNull();
    expect(button.querySelector('[aria-live="polite"]')?.textContent).toBe('Đang chuẩn bị giọng đọc');

    await act(async () => release());
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBeNull());
    expect(button.querySelector('[aria-live="polite"]')?.textContent).toBe('');
  });

  it('nút loa chung (SpeakButton) cũng báo đang chuẩn bị', async () => {
    render(<SpeakButton text="Em chọn câu trả lời nhé." label="Nghe hướng dẫn" />);
    const button = screen.getByRole('button', { name: 'Nghe hướng dẫn' });
    fireEvent.click(button);
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBe('true'));
    await act(async () => release());
    await waitFor(() => expect(button.getAttribute('aria-busy')).toBeNull());
  });

  it('máy chủ không có tiếng và máy không có giọng tiếng Việt: hiện lời báo một lần, không chặn thao tác', async () => {
    held = false;
    answer = null;
    render(
      <MemoryRouter>
        <LevelOneSpeak text="Khuê Văn Các nằm trong Văn Miếu." label="Nghe câu hỏi" />
        <SpeechNotice />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu hỏi' }));
    expect(await screen.findByText('Máy này chưa đọc được tiếng Việt')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Đóng lời báo' }));
    expect(screen.queryByText('Máy này chưa đọc được tiếng Việt')).toBeNull();

    // Bấm nghe lần nữa: không báo lại.
    fireEvent.click(screen.getByRole('button', { name: 'Nghe câu hỏi' }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText('Máy này chưa đọc được tiếng Việt')).toBeNull();
  });
});
