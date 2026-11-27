import { createVoiceSource } from './cloudVoice';
import { announceNoVietnameseVoice, getVoiceNoticeVisible, dismissVoiceNotice, resetVoiceNotice } from './voiceNotice';

// Nguồn giọng của máy chủ: xin địa chỉ tệp tiếng (nhớ kết quả, gộp lời xin trùng, ghép đường dẫn tệp với máy chủ), nhờ tạo trước tiếng theo lô.

const BASE = 'http://api.test/api/v1';

function fakeApi(answers: Record<string, string | null> = {}) {
  const synth: string[] = [];
  const prefetched: string[][] = [];
  return {
    synth,
    prefetched,
    api: {
      synthesize: jest.fn(async (text: string) => {
        synth.push(text);
        return text in answers ? answers[text]! : `/files/speech/${synth.length}.mp3`;
      }),
      prefetch: jest.fn(async (texts: readonly string[]) => {
        prefetched.push([...texts]);
        return texts.length;
      }),
    },
  };
}

describe('xin tiếng của máy chủ', () => {
  it('ghép đường dẫn /files/... với máy chủ, nhớ kết quả và chuẩn hóa khoảng trắng', async () => {
    const { api, synth } = fakeApi();
    const source = createVoiceSource(api, BASE);
    expect(source.isReady('Chùa Một Cột.')).toBe(false);
    expect(await source.audioUrl('  Chùa   Một Cột. ')).toBe('http://api.test/files/speech/1.mp3');
    expect(await source.audioUrl('Chùa Một Cột.')).toBe('http://api.test/files/speech/1.mp3');
    expect(synth).toEqual(['Chùa Một Cột.']);
    expect(source.isReady('Chùa Một Cột.')).toBe(true);
  });

  it('hai lời xin cùng lúc cho một đoạn chỉ gọi máy chủ một lần', async () => {
    const { api, synth } = fakeApi();
    const source = createVoiceSource(api, BASE);
    const [a, b] = await Promise.all([source.audioUrl('Câu một.'), source.audioUrl('Câu một.')]);
    expect(a).toBe(b);
    expect(synth).toHaveLength(1);
  });

  it('địa chỉ đủ đường dẫn giữ nguyên; máy chủ không có tiếng thì null và lần sau thử lại', async () => {
    const { api, synth } = fakeApi({ 'Có rồi.': 'https://cdn.test/a.mp3', 'Chưa có.': null });
    const source = createVoiceSource(api, BASE);
    expect(await source.audioUrl('Có rồi.')).toBe('https://cdn.test/a.mp3');
    expect(await source.audioUrl('Chưa có.')).toBeNull();
    expect(await source.audioUrl('Chưa có.')).toBeNull();
    expect(synth.filter((text) => text === 'Chưa có.')).toHaveLength(2);
    expect(source.isReady('Chưa có.')).toBe(false);
  });

  it('chữ rỗng hoặc dài quá 1000 ký tự thì không gọi máy chủ', async () => {
    const { api, synth } = fakeApi();
    const source = createVoiceSource(api, BASE);
    expect(await source.audioUrl('   ')).toBeNull();
    expect(await source.audioUrl('a'.repeat(1001))).toBeNull();
    expect(synth).toHaveLength(0);
  });

  it('lỗi mạng thì null, không ném lỗi', async () => {
    const source = createVoiceSource({ synthesize: jest.fn(async () => Promise.reject(new Error('mất mạng'))), prefetch: jest.fn(async () => 0) }, BASE);
    expect(await source.audioUrl('Câu một.')).toBeNull();
  });
});

describe('nhờ máy chủ tạo trước tiếng', () => {
  it('gửi theo lô tối đa 40 chữ, không gửi lại chữ đã gửi hay đã có tiếng', async () => {
    const { api, prefetched } = fakeApi();
    const source = createVoiceSource(api, BASE);
    await source.audioUrl('Đã có.');
    source.prefetch([...Array.from({ length: 45 }, (_, i) => `Câu số ${i}.`), 'Đã có.', '', null]);
    source.prefetch(['Câu số 1.', 'Câu mới.']);
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(prefetched.map((batch) => batch.length)).toEqual([40, 5, 1]);
    expect(prefetched[2]).toEqual(['Câu mới.']);
    expect(prefetched.flat()).not.toContain('Đã có.');
  });
});

describe('lời báo máy chưa đọc được tiếng Việt', () => {
  afterEach(() => resetVoiceNotice());

  it('báo một lần mỗi lần mở app, tắt được', () => {
    expect(getVoiceNoticeVisible()).toBe(false);
    announceNoVietnameseVoice();
    expect(getVoiceNoticeVisible()).toBe(true);
    dismissVoiceNotice();
    expect(getVoiceNoticeVisible()).toBe(false);
    announceNoVietnameseVoice();
    expect(getVoiceNoticeVisible()).toBe(false);
  });
});
