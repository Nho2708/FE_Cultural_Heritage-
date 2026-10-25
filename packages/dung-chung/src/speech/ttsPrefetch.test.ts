import { describe, expect, it, vi } from 'vitest';
import { createSpeechPrefetcher, isSpeakableText, normalizeSpeechText, prefetchBatches, TTS_MAX_TEXT_LENGTH } from './ttsPrefetch';

describe('chữ gửi sang giọng đọc của máy chủ', () => {
  it('chuẩn hóa khoảng trắng và xuống dòng', () => {
    expect(normalizeSpeechText('  Chùa \n Một\tCột.  ')).toBe('Chùa Một Cột.');
    expect(normalizeSpeechText(null)).toBe('');
  });

  it('chữ rỗng hoặc dài quá 1000 ký tự thì không đọc được', () => {
    expect(isSpeakableText('')).toBe(false);
    expect(isSpeakableText('a'.repeat(TTS_MAX_TEXT_LENGTH))).toBe(true);
    expect(isSpeakableText('a'.repeat(TTS_MAX_TEXT_LENGTH + 1))).toBe(false);
  });

  it('chia lô tối đa 40 chữ, bỏ chữ rỗng, quá dài và trùng', () => {
    const texts = [...Array.from({ length: 45 }, (_, i) => `Câu ${i}.`), 'Câu 0.', '  ', null, undefined, 'x'.repeat(1001)];
    const batches = prefetchBatches(texts);
    expect(batches.map((batch) => batch.length)).toEqual([40, 5]);
    expect(batches.flat()).not.toContain('');
  });
});

describe('tạo trước tiếng', () => {
  it('chỉ gửi chữ chưa gửi', async () => {
    const send = vi.fn<(texts: string[]) => Promise<number>>(async () => 1);
    const prefetch = createSpeechPrefetcher(send);
    prefetch(['Một.', 'Hai.']);
    prefetch(['Hai.', 'Ba.']);
    await Promise.resolve();
    await Promise.resolve();
    expect(send.mock.calls.map((call) => call[0])).toEqual([['Một.', 'Hai.'], ['Ba.']]);
  });

  it('chữ đã biết có tiếng thì không gửi', async () => {
    const send = vi.fn<(texts: string[]) => Promise<number>>(async () => 1);
    createSpeechPrefetcher(send, (text) => text === 'Hai.')(['Một.', 'Hai.']);
    await Promise.resolve();
    await Promise.resolve();
    expect(send.mock.calls.map((call) => call[0])).toEqual([['Một.']]);
  });

  it('gửi lỗi thì lần sau gửi lại', async () => {
    const send = vi.fn<(texts: string[]) => Promise<number | null>>().mockResolvedValueOnce(null).mockResolvedValueOnce(1);
    const prefetch = createSpeechPrefetcher(send);
    prefetch(['Một.']);
    await new Promise((resolve) => setTimeout(resolve, 5));
    prefetch(['Một.']);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(send).toHaveBeenCalledTimes(2);
    prefetch(['Một.']);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(send).toHaveBeenCalledTimes(2);
  });
});
