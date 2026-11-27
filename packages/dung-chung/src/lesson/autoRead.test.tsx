import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StudentLesson } from '../api';
import { useAutoRead } from './autoRead';
import { LessonLinksProvider } from './LessonLinksProvider';
import { NO_LESSON_LINKS, type LessonLinks } from './lessonLinks';
import { LessonView } from './LessonView';

// Cấp 1: câu chuyện tự đọc to khi em vào mỗi đoạn, em tắt được (nhớ trên máy), nút loa vẫn để nghe lại; xem trước của giáo viên không tự đọc.

const spoken: string[] = [];
let cancels = 0;

beforeEach(() => {
  spoken.length = 0;
  cancels = 0;
  window.localStorage.clear();
  window.scrollTo = vi.fn<() => void>();
  vi.stubGlobal('speechSynthesis', { getVoices: () => [{ lang: 'vi-VN', name: 'Vi' }], cancel: () => void (cancels += 1), speak: (utterance: { text: string }) => void spoken.push(utterance.text) });
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
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const section = (body: string, sortOrder: number) => ({
  type: 'STORY' as const,
  title: null,
  body,
  imageUrl: null,
  image: null,
  milestoneYear: null,
  milestoneLabel: null,
  eventId: null,
  sourceCitation: null,
  sortOrder,
});

const lesson: StudentLesson = {
  id: 5,
  accessCode: 'BH7F3K2Q',
  title: 'Ngọ Môn',
  className: '3A1',
  teacherName: null,
  schoolLevel: 1,
  schoolLevelName: 'Cấp 1',
  layout: {
    layout: 'STEP_BY_STEP',
    sequentialFlow: true,
    steps: [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'VIEW_IMAGES', label: 'Xem hình' },
      { key: 'PLAY', label: 'Chơi' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ],
  },
  summary: null,
  keyPoints: [],
  sections: [section('Đoạn một của câu chuyện.', 1), section('Đoạn hai của câu chuyện.', 2)],
  heritages: [],
  quizzes: [],
};

const REAL_LINKS: LessonLinks = { ...NO_LESSON_LINKS, home: '/hoc', preview: false };

function show(links: LessonLinks) {
  return render(
    <MemoryRouter>
      <LessonLinksProvider links={links}>
        <LessonView lesson={lesson} />
      </LessonLinksProvider>
    </MemoryRouter>,
  );
}

describe('cấp 1 tự đọc to câu chuyện', () => {
  it('đọc đoạn đầu khi vào bài và đọc đoạn kế khi sang đoạn', () => {
    show(REAL_LINKS);
    expect(spoken).toEqual(['Đoạn một của câu chuyện.']);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(spoken).toEqual(['Đoạn một của câu chuyện.', 'Đoạn hai của câu chuyện.']);
  });

  it('nút loa dừng đoạn đang tự đọc và bấm lần nữa thì đọc lại đoạn đang xem', () => {
    show(REAL_LINKS);
    const before = cancels;
    fireEvent.click(screen.getByRole('button', { name: 'Dừng đọc' }));
    expect(cancels).toBeGreaterThan(before);
    fireEvent.click(screen.getByRole('button', { name: 'Đọc to đoạn này' }));
    expect(spoken).toEqual(['Đoạn một của câu chuyện.', 'Đoạn một của câu chuyện.']);
  });

  it('em tắt tự đọc thì dừng ngay, đoạn sau không tự đọc và lựa chọn được nhớ trên máy', () => {
    show(REAL_LINKS);
    const before = cancels;
    fireEvent.click(screen.getByRole('switch', { name: 'Tự đọc to' }));
    expect(cancels).toBeGreaterThan(before);
    expect(window.localStorage.getItem('dsvhvn.hoc-tap.tu-doc')).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(spoken).toEqual(['Đoạn một của câu chuyện.']);
  });

  it('đã tắt từ lần trước thì vào bài không tự đọc, bật lại thì đọc đoạn đang xem', () => {
    window.localStorage.setItem('dsvhvn.hoc-tap.tu-doc', '0');
    show(REAL_LINKS);
    expect(spoken).toEqual([]);
    expect(screen.getByRole('switch', { name: 'Tự đọc to' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: 'Tự đọc to' }));
    expect(spoken).toEqual(['Đoạn một của câu chuyện.']);
  });

  it('xem trước của giáo viên không tự đọc và không có công tắc', () => {
    show(NO_LESSON_LINKS);
    expect(spoken).toEqual([]);
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('rời bước Nghe chuyện thì không đọc tiếp các bước sau', () => {
    show(REAL_LINKS);
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp nhé' }));
    expect(spoken).toHaveLength(2);
  });
});

describe('useAutoRead', () => {
  it('mặc định bật và nhớ lựa chọn', () => {
    const { result } = renderHook(() => useAutoRead());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(window.localStorage.getItem('dsvhvn.hoc-tap.tu-doc')).toBe('0');
    expect(renderHook(() => useAutoRead()).result.current[0]).toBe(false);
  });

  it('nơi lưu bị chặn thì vẫn dùng được và coi như bật', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bị chặn');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bị chặn');
    });
    const { result } = renderHook(() => useAutoRead());
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    vi.restoreAllMocks();
  });
});
