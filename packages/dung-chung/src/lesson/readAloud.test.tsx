import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentLesson, StudentSection } from '../api';
import { LessonLinksProvider } from './LessonLinksProvider';
import { NO_LESSON_LINKS, type LessonLinks } from './lessonLinks';
import { LessonView } from './LessonView';
import { SpeechNotice } from './SpeechNotice';
import { resetSpeechNotice, setTtsAccessTokenProvider, setTtsBaseUrl, stopAllSpeech } from './speechVoice';

// Nghe bài đọc của bố cục cấp 2 và cấp 3: nút cho nội dung chính và cho từng phần Bài đọc, đọc từng câu và tô sáng câu đang đọc, bấm lại để dừng, chỉ một đoạn đọc
// một lúc, rời trang thì dừng, xin máy chủ tạo trước khoảng 10 câu đầu của nội dung chính, lùi về giọng thiết bị và báo khi thiếu giọng như cấp 1.

const BASE = 'http://api.test/api/v1';

interface FakeUtterance {
  text: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

let utterances: FakeUtterance[];
let cancel: ReturnType<typeof vi.fn<() => void>>;
let voices: Array<{ lang: string; name: string }>;
const spoken = () => utterances.map((u) => u.text);

function stubSpeechSynthesis() {
  vi.stubGlobal('speechSynthesis', { getVoices: () => voices, cancel, speak: (u: FakeUtterance) => void utterances.push(u) });
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
}

beforeEach(() => {
  utterances = [];
  voices = [{ lang: 'vi-VN', name: 'Vi' }];
  cancel = vi.fn<() => void>();
  window.scrollTo = vi.fn<() => void>();
  stubSpeechSynthesis();
  resetSpeechNotice();
});

afterEach(() => {
  cleanup();
  stopAllSpeech();
  setTtsAccessTokenProvider(() => null);
  resetSpeechNotice();
  vi.unstubAllGlobals();
});

function section(overrides: Partial<StudentSection>): StudentSection {
  return { type: 'READING', title: null, body: null, imageUrl: null, image: null, milestoneYear: null, milestoneLabel: null, eventId: null, sourceCitation: null, sortOrder: 0, ...overrides };
}

const MAIN_FIRST = 'Hoàng thành Thăng Long được xây dựng vào năm 1010.';
const MAIN_SECOND = 'Nơi đây là trung tâm chính trị của đất nước.';
const MAIN_THIRD = 'Đoạn hai của nội dung chính.';
const READING_FIRST = 'Năm 2010, UNESCO ghi danh khu trung tâm Hoàng thành.';
const READING_SECOND = 'Đó là Di sản Văn hóa Thế giới.';

function lessonOf(level: 2 | 3, overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 7,
    accessCode: 'BH9K2M4Q',
    title: 'Hoàng thành Thăng Long',
    className: level === 2 ? '8A1' : '11A1',
    teacherName: 'Cô Linh',
    schoolLevel: level,
    schoolLevelName: `Cấp ${level}`,
    layout:
      level === 2
        ? { layout: 'FREE_STEPS', sequentialFlow: false, steps: [{ key: 'READ', label: 'Đọc bài' }, { key: 'TIMELINE', label: 'Dòng thời gian' }, { key: 'QUIZ', label: 'Bài kiểm tra' }] }
        : { layout: 'DOCUMENT', sequentialFlow: false, steps: [{ key: 'READ', label: 'Đọc bài' }] },
    summary: `${MAIN_FIRST} ${MAIN_SECOND}\n\n${MAIN_THIRD}`,
    keyPoints: [],
    sections: [
      section({ type: 'READING', title: 'Di sản thế giới', body: `${READING_FIRST} ${READING_SECOND}`, sortOrder: 1 }),
      section({ type: 'MILESTONE', body: 'Xây thành.', milestoneYear: 1010, sortOrder: 2 }),
    ],
    heritages: [],
    quizzes: [],
    ...overrides,
  };
}

function show(lesson: StudentLesson, links: LessonLinks = { ...NO_LESSON_LINKS, preview: false }) {
  return render(
    <MemoryRouter>
      <LessonLinksProvider links={links}>
        <LessonView lesson={lesson} />
      </LessonLinksProvider>
      <SpeechNotice />
    </MemoryRouter>,
  );
}

const current = () => [...document.querySelectorAll('[aria-current="true"]')].map((node) => node.textContent);

describe.each([2, 3] as const)('bài học cấp %i', (level) => {
  it('có nút "Nghe bài đọc" cho nội dung chính và nút "Nghe phần này" cho từng phần Bài đọc', () => {
    show(lessonOf(level));
    expect(screen.getAllByRole('button', { name: 'Nghe bài đọc' })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: 'Nghe phần này' })).toHaveLength(1);
    // Chữ vẫn hiện đủ, đoạn nào ra đoạn nấy.
    const paragraphs = [...document.querySelectorAll('p')].map((node) => node.textContent);
    expect(paragraphs).toContain(`${MAIN_FIRST} ${MAIN_SECOND}`);
    expect(paragraphs).toContain(MAIN_THIRD);
  });

  it('bấm nghe: đọc từng câu, tô sáng câu đang đọc, đọc xong câu thì sang câu sau, hết thì thôi tô', async () => {
    show(lessonOf(level));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(spoken()).toEqual([MAIN_FIRST]));
    expect(current()).toEqual([MAIN_FIRST]);
    expect(screen.getByRole('button', { name: 'Dừng nghe' })).toBeTruthy();

    act(() => utterances[0]!.onend?.());
    await waitFor(() => expect(spoken()).toEqual([MAIN_FIRST, MAIN_SECOND]));
    expect(current()).toEqual([MAIN_SECOND]);

    act(() => utterances[1]!.onend?.());
    await waitFor(() => expect(spoken()).toEqual([MAIN_FIRST, MAIN_SECOND, MAIN_THIRD]));
    expect(current()).toEqual([MAIN_THIRD]);
    act(() => utterances[2]!.onend?.());
    expect(current()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Nghe bài đọc' })).toBeTruthy();
  });

  it('bấm lại để dừng: bỏ tô sáng, ngắt tiếng, không đọc tiếp', async () => {
    show(lessonOf(level));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(current()).toEqual([MAIN_FIRST]));
    cancel.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Dừng nghe' }));
    expect(current()).toEqual([]);
    expect(cancel).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Nghe bài đọc' })).toBeTruthy();

    act(() => utterances[0]!.onend?.());
    expect(spoken()).toEqual([MAIN_FIRST]);
  });

  it('chỉ một đoạn đọc một lúc: bấm nghe phần Bài đọc thì nội dung chính dừng và hết tô sáng', async () => {
    show(lessonOf(level));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(current()).toEqual([MAIN_FIRST]));

    fireEvent.click(screen.getByRole('button', { name: 'Nghe phần này' }));
    await waitFor(() => expect(spoken()).toEqual([MAIN_FIRST, READING_FIRST]));
    expect(current()).toEqual([READING_FIRST]);
    expect(screen.getByRole('button', { name: 'Nghe bài đọc' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dừng nghe' })).toBeTruthy();

    // Câu của lượt cũ đọc xong muộn cũng không đẩy tô sáng đi tiếp.
    act(() => utterances[0]!.onend?.());
    expect(current()).toEqual([READING_FIRST]);
    expect(spoken()).toHaveLength(2);
  });

  it('rời trang thì dừng đọc', async () => {
    const view = show(lessonOf(level));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(current()).toEqual([MAIN_FIRST]));
    cancel.mockClear();

    view.unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('máy không có giọng tiếng Việt và máy chủ chưa có tiếng: không đọc, báo "Máy này chưa đọc được tiếng Việt"', async () => {
    voices = [{ lang: 'en-US', name: 'English' }];
    show(lessonOf(level));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    expect(await screen.findByText('Máy này chưa đọc được tiếng Việt')).toBeTruthy();
    expect(spoken()).toEqual([]);
    expect(current()).toEqual([]);
  });

  it('nội dung chính trống thì không có nút nghe cho nó, các phần khác vẫn có', () => {
    show(lessonOf(level, { summary: null }));
    expect(screen.queryByRole('button', { name: 'Nghe bài đọc' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Nghe phần này' })).toHaveLength(1);
  });

  it('máy không đọc được gì (không Audio, không giọng trình duyệt) thì không hiện nút nhưng vẫn hiện chữ', () => {
    vi.unstubAllGlobals();
    vi.stubGlobal('Audio', undefined);
    Reflect.deleteProperty(window, 'speechSynthesis');
    show(lessonOf(level));
    expect(screen.queryByRole('button', { name: 'Nghe bài đọc' })).toBeNull();
    expect(screen.getByText(MAIN_THIRD)).toBeTruthy();
  });
});

describe('bài cấp 2: chuyển bước', () => {
  it('sang bước khác thì dừng đọc', async () => {
    show(lessonOf(2));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(current()).toEqual([MAIN_FIRST]));
    cancel.mockClear();

    fireEvent.click(screen.getByRole('tab', { name: 'Dòng thời gian của bài' }));
    expect(cancel).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('tab', { name: 'Đọc bài' }));
    expect(current()).toEqual([]);
  });
});

describe('giọng của máy chủ', () => {
  function stubServer() {
    const prefetched: string[][] = [];
    const synthesized: string[] = [];
    vi.stubGlobal(
      'Audio',
      class {
        src = '';
        currentTime = 0;
        onended: (() => void) | null = null;
        onerror: (() => void) | null = null;
        play = vi.fn<() => Promise<void>>(async () => undefined);
        pause = vi.fn<() => void>();
        load = vi.fn<() => void>();
      },
    );
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const body = JSON.parse(String(init?.body ?? '{}')) as { text?: string; texts?: string[] };
        if (url === `${BASE}/tts/prefetch`) {
          prefetched.push(body.texts ?? []);
          return new Response(JSON.stringify({ success: true, data: { queued: 0 } }), { status: 202, headers: { 'Content-Type': 'application/json' } });
        }
        synthesized.push(body.text ?? '');
        return new Response(JSON.stringify({ success: true, data: { audioUrl: `/files/speech/${synthesized.length}.mp3` } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
    setTtsBaseUrl(BASE);
    setTtsAccessTokenProvider(() => 'token-hoc-sinh');
    return { prefetched, synthesized };
  }

  const longSummary = (tag: string) => Array.from({ length: 14 }, (_, i) => `Câu ${tag} số ${i + 1} của nội dung chính.`).join(' ');

  it.each([2, 3] as const)('cấp %i: vào bài thì chỉ xin 10 câu đầu của nội dung chính, không xin các phần Bài đọc', async (level) => {
    const server = stubServer();
    show(lessonOf(level, { summary: longSummary(`cấp ${level}`) }));
    await waitFor(() => expect(server.prefetched).toHaveLength(1));
    expect(server.prefetched[0]).toEqual(Array.from({ length: 10 }, (_, i) => `Câu cấp ${level} số ${i + 1} của nội dung chính.`));
    expect(server.prefetched.flat()).not.toContain(READING_FIRST);
  });

  it('xem trước của giáo viên không xin máy chủ tạo trước', async () => {
    const server = stubServer();
    show(lessonOf(2, { summary: longSummary('xem trước') }), NO_LESSON_LINKS);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(server.prefetched).toEqual([]);
  });

  it('bấm nghe xin tiếng của máy chủ cho từng câu, không dùng giọng trình duyệt', async () => {
    const server = stubServer();
    show(lessonOf(3, { summary: 'Câu giọng máy chủ một. Câu giọng máy chủ hai.' }));
    fireEvent.click(screen.getByRole('button', { name: 'Nghe bài đọc' }));
    await waitFor(() => expect(server.synthesized).toContain('Câu giọng máy chủ một.'));
    expect(screen.getByRole('button', { name: 'Dừng nghe' })).toBeTruthy();
    expect(utterances).toEqual([]);
  });
});
