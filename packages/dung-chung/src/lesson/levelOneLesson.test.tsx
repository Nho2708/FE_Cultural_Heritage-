import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LessonCompletion, StudentLesson, StudentRecall } from '../api';
import { LessonLinksProvider } from './LessonLinksProvider';
import { NO_LESSON_LINKS, type LessonLinks } from './lessonLinks';
import { LessonView } from './LessonView';
import type { LessonPosition } from './LevelOneLesson';

// Bài học cấp 1: bước Nhớ lại (chạm là biết ngay, không thử lại), đọc từng câu và tô sáng câu đang đọc, bước Nhận thẻ (ghi bài đã học xong
// một lần, thẻ vào album, câu mang về nhà), nhận cả khóa bước cũ EARN_STARS; xem trước của giáo viên không gọi máy chủ.

interface FakeUtterance {
  text: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

const utterances: FakeUtterance[] = [];
const spoken = () => utterances.map((u) => u.text);

beforeEach(() => {
  utterances.length = 0;
  window.localStorage.clear();
  window.scrollTo = vi.fn<() => void>();
  vi.stubGlobal('speechSynthesis', { cancel: () => undefined, speak: (u: FakeUtterance) => void utterances.push(u) });
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

const STEPS = [
  { key: 'RECALL', label: 'Nhớ lại' },
  { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
  { key: 'VIEW_IMAGES', label: 'Xem hình' },
  { key: 'PLAY', label: 'Chơi' },
  { key: 'EARN_CARD', label: 'Nhận thẻ' },
];

function lessonOf(overrides: Partial<StudentLesson> = {}): StudentLesson {
  return {
    id: 5,
    accessCode: 'BH7F3K2Q',
    title: 'Chùa Một Cột',
    className: '2A1',
    teacherName: 'Lan',
    schoolLevel: 1,
    schoolLevelName: 'Cấp 1',
    layout: { layout: 'STEP_BY_STEP', sequentialFlow: true, steps: STEPS },
    summary: null,
    keyPoints: ['Chùa đứng trên một cây cột đá.'],
    sections: [
      {
        type: 'STORY',
        title: null,
        body: 'Giữa hồ nước có một ngôi chùa nhỏ. Chùa đứng trên một cây cột đá.',
        imageUrl: null,
        image: null,
        milestoneYear: null,
        milestoneLabel: null,
        eventId: null,
        sourceCitation: null,
        sortOrder: 1,
      },
    ],
    heritages: [{ id: 11, slug: 'chua-mot-cot', name: 'Chùa Một Cột', shortDescription: null, thumbnailUrl: null, provinceName: 'Hà Nội', latitude: null, longitude: null, hasTimeline: false }],
    quizzes: [],
    ...overrides,
  };
}

const recallOf = (questions: StudentRecall['questions']): StudentRecall => ({ questions });

const trueFalse: StudentRecall['questions'][number] = {
  questionId: 70,
  questionType: 'TRUE_FALSE',
  content: 'Bánh chưng có hình vuông.',
  imageUrl: null,
  options: [
    { content: 'Đúng', imageUrl: null },
    { content: 'Sai', imageUrl: null },
  ],
  correctIndex: 0,
  explanation: 'Bánh chưng hình vuông, gói bằng lá dong.',
  heritageName: 'Bánh chưng',
  lessonTitle: 'Bánh chưng ngày Tết',
};

const completion: LessonCompletion = {
  lessonId: 5,
  firstTime: true,
  cards: [
    {
      heritageId: 11,
      slug: 'chua-mot-cot',
      name: 'Chùa Một Cột',
      shortDescription: 'Chùa đứng trên một cây cột đá giữa hồ.',
      thumbnailUrl: null,
      heritageType: 'TANGIBLE',
      groupName: 'Di tích và đồ vật xưa',
      collected: true,
      collectedAt: '2026-10-25T08:00:00Z',
      lessonId: 5,
      lessonTitle: 'Chùa Một Cột',
    },
  ],
  albumCollected: 5,
  albumTotal: 12,
  takeHome: 'Nhà mình đã từng đi thăm Chùa Một Cột hay một di tích nào gần nhà chưa?',
};

function linksOf(overrides: Partial<LessonLinks> = {}): LessonLinks {
  return {
    ...NO_LESSON_LINKS,
    home: '/hoc',
    album: '/hoc/album',
    preview: false,
    recall: () => Promise.resolve(recallOf([])),
    completeLesson: () => Promise.resolve(completion),
    ...overrides,
  };
}

function show(lesson: StudentLesson, links: LessonLinks, initialPosition?: LessonPosition) {
  return render(
    <MemoryRouter>
      <LessonLinksProvider links={links}>
        <LessonView lesson={lesson} initialPosition={initialPosition} />
      </LessonLinksProvider>
    </MemoryRouter>,
  );
}

describe('bước Nhớ lại', () => {
  it('chạm sai: sáng đáp án đúng kèm giải thích, không cho thử lại; xong thì sang Nghe chuyện', async () => {
    const recall = vi.fn<(code: string) => Promise<StudentRecall>>(() => Promise.resolve(recallOf([trueFalse])));
    show(lessonOf(), linksOf({ recall }));
    expect(await screen.findByText('Bánh chưng có hình vuông.')).toBeTruthy();
    expect(recall).toHaveBeenCalledWith('BH7F3K2Q');
    expect(screen.getByText('Bài “Bánh chưng ngày Tết”')).toBeTruthy();
    expect(screen.getByText(/bước 1 trên 5/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sai' }));
    expect(screen.getByText('Đáp án đúng ở đây nè!')).toBeTruthy();
    expect(screen.getByText('Bánh chưng hình vuông, gói bằng lá dong.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Đúng, đáp án đúng' })).toHaveProperty('disabled', true);
    expect(screen.queryByRole('button', { name: 'Thử lại' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Nghe chuyện mới' }));
    expect(screen.getByRole('article', { name: 'Câu chuyện' })).toBeTruthy();
    expect(screen.getByText(/bước 2 trên 5/)).toBeTruthy();
  });

  it('chạm đúng: khen và nói vì sao đúng', async () => {
    show(lessonOf(), linksOf({ recall: () => Promise.resolve(recallOf([trueFalse])) }));
    fireEvent.click(await screen.findByRole('button', { name: 'Đúng' }));
    expect(screen.getByText('Đúng rồi!')).toBeTruthy();
    expect(screen.getByText('Bánh chưng hình vuông, gói bằng lá dong.')).toBeTruthy();
  });

  it('em chưa nộp bài nào: bỏ bước Nhớ lại, bắt đầu ở Nghe chuyện', async () => {
    show(lessonOf(), linksOf());
    await waitFor(() => expect(screen.getByText(/bước 1 trên 4/)).toBeTruthy());
    expect(screen.getByRole('article', { name: 'Câu chuyện' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Nhớ lại/ })).toBeNull();
  });

  it('máy chủ chưa có bước Nhớ lại và còn khóa cũ EARN_STARS: bốn bước, bước cuối là Nhận thẻ', async () => {
    const recall = vi.fn<(code: string) => Promise<StudentRecall>>();
    const steps = [
      { key: 'LISTEN_STORY', label: 'Nghe chuyện' },
      { key: 'VIEW_IMAGES', label: 'Xem hình' },
      { key: 'PLAY', label: 'Chơi' },
      { key: 'EARN_STARS', label: 'Nhận sao' },
    ];
    show(lessonOf({ layout: { layout: 'STEP_BY_STEP', sequentialFlow: true, steps } }), linksOf({ recall }), { step: 3, part: 0 });
    expect(await screen.findByText('Thẻ mới vào album')).toBeTruthy();
    expect(screen.getByText(/Nhận thẻ/)).toBeTruthy();
    expect(recall).not.toHaveBeenCalled();
  });
});

describe('Nghe chuyện: đọc từng câu và tô sáng câu đang đọc', () => {
  it('tô sáng câu đang đọc, đọc xong câu thì sang câu sau, hết đoạn thì thôi tô', async () => {
    show(lessonOf(), linksOf());
    await screen.findByRole('article', { name: 'Câu chuyện' });
    expect(spoken()).toEqual(['Giữa hồ nước có một ngôi chùa nhỏ.']);
    await waitFor(() => expect(screen.getByText('Giữa hồ nước có một ngôi chùa nhỏ.').getAttribute('aria-current')).toBe('true'));
    expect(screen.getByText('Chùa đứng trên một cây cột đá.').getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Dừng đọc' })).toBeTruthy();

    act(() => utterances[0]!.onend?.());
    expect(spoken()).toEqual(['Giữa hồ nước có một ngôi chùa nhỏ.', 'Chùa đứng trên một cây cột đá.']);
    expect(screen.getByText('Chùa đứng trên một cây cột đá.').getAttribute('aria-current')).toBe('true');
    expect(screen.getByText('Giữa hồ nước có một ngôi chùa nhỏ.').getAttribute('aria-current')).toBeNull();

    act(() => utterances[1]!.onend?.());
    expect(screen.getByText('Chùa đứng trên một cây cột đá.').getAttribute('aria-current')).toBeNull();
    expect(screen.getByRole('button', { name: 'Đọc to đoạn này' })).toBeTruthy();
  });
});

describe('bước Nhận thẻ', () => {
  it('ghi bài đã học xong đúng một lần, hiện thẻ mới, số thẻ trong album, câu mang về nhà và hai lối đi', async () => {
    const completeLesson = vi.fn<(code: string) => Promise<LessonCompletion>>(() => Promise.resolve(completion));
    show(lessonOf(), linksOf({ completeLesson }), { step: 4, part: 0 });
    expect(await screen.findByText('Thẻ mới vào album')).toBeTruthy();
    expect(screen.getByText('Album của em có 5 thẻ')).toBeTruthy();
    expect(screen.getByText('Về nhà hỏi bố mẹ nhé')).toBeTruthy();
    expect(screen.getByText(completion.takeHome!)).toBeTruthy();
    expect(screen.getByText('Em nhớ nhé')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Về con đường' }).getAttribute('href')).toBe('/hoc');
    expect(screen.getByRole('link', { name: 'Xem album' }).getAttribute('href')).toBe('/hoc/album');
    expect(completeLesson).toHaveBeenCalledTimes(1);
    expect(completeLesson).toHaveBeenCalledWith('BH7F3K2Q');
  });

  it('đã nhận thẻ từ trước: "Đã có trong album"', async () => {
    show(lessonOf(), linksOf({ completeLesson: () => Promise.resolve({ ...completion, firstTime: false }) }), { step: 4, part: 0 });
    expect(await screen.findByText('Đã có trong album')).toBeTruthy();
  });

  it('lỗi mạng: một câu ngắn và nút Thử lại gửi lại', async () => {
    const completeLesson = vi
      .fn<(code: string) => Promise<LessonCompletion>>()
      .mockRejectedValueOnce(new Error('mất mạng'))
      .mockResolvedValueOnce(completion);
    show(lessonOf(), linksOf({ completeLesson }), { step: 4, part: 0 });
    fireEvent.click(await screen.findByRole('button', { name: 'Thử lại' }));
    expect(await screen.findByText('Thẻ mới vào album')).toBeTruthy();
    expect(completeLesson).toHaveBeenCalledTimes(2);
  });
});

describe('xem trước của giáo viên', () => {
  it('không gọi máy chủ, bỏ bước Nhớ lại, bước Nhận thẻ chỉ hiện thẻ mẫu', () => {
    show(lessonOf(), NO_LESSON_LINKS, { step: 4, part: 0 });
    expect(screen.getByText('Thẻ mới vào album')).toBeTruthy();
    expect(screen.getByText(/bước 4 trên 4/)).toBeTruthy();
    expect(screen.queryByText(/Album của em có/)).toBeNull();
    expect(screen.queryByRole('link', { name: 'Xem album' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xem lại từ đầu' })).toBeTruthy();
    expect(spoken()).toEqual([]);
  });
});
