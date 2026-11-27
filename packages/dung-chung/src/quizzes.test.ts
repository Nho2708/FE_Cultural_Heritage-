import { describe, expect, it } from 'vitest';
import { isWellFormedAccessCode, spacedLessonCode } from './lessons';
import type { QuizDetail } from './api/quizzes';
import {
  describeQuizTime,
  draftFromQuiz,
  emptyQuizDraft,
  formatDateTimeInput,
  formatPoint,
  formatPoints,
  isQuizRunning,
  isValidPoint,
  parseDateTimeInput,
  parsePoint,
  quizDraftToBody,
  quizNeedsOpenWindow,
  sameQuizDraft,
  submissionRatio,
  sumPoints,
  timeLimitHint,
  timeLimitLabel,
  timeLimitRuleOf,
  validateQuizDraft,
} from './quizzes';

describe('điểm', () => {
  it('hợp lệ khi lớn hơn 0, không quá 100 và theo bước 0,25', () => {
    for (const ok of [0.25, 0.5, 1, 2.75, 100]) expect(isValidPoint(ok)).toBe(true);
    for (const bad of [0, -1, 0.1, 100.25, 101, Number.NaN]) expect(isValidPoint(bad)).toBe(false);
  });

  it('đọc điểm gõ tay có dấu phẩy hoặc dấu chấm, từ chối chữ', () => {
    expect(parsePoint('2')).toBe(2);
    expect(parsePoint(' 0,25 ')).toBe(0.25);
    expect(parsePoint('1.5')).toBe(1.5);
    expect(parsePoint('')).toBeNull();
    expect(parsePoint('hai')).toBeNull();
    expect(parsePoint('1,2,3')).toBeNull();
  });

  it('hiển thị kiểu Việt và cộng tổng không sai số', () => {
    expect(formatPoint(0.25)).toBe('0,25');
    expect(formatPoints(10)).toBe('10 điểm');
    expect(sumPoints([{ point: 0.25 }, { point: 0.25 }, { point: 0.25 }, { point: 1 }])).toBe(1.75);
    expect(sumPoints([])).toBe(0);
  });
});

describe('thời gian làm theo cấp', () => {
  it('cấp 1 không có, cấp 2 tùy chọn, cấp 3 bắt buộc', () => {
    expect(timeLimitRuleOf(1)).toBe('NOT_ALLOWED');
    expect(timeLimitRuleOf(2)).toBe('OPTIONAL');
    expect(timeLimitRuleOf(3)).toBe('REQUIRED');
    expect(timeLimitHint(1)).toMatch(/bị khóa/);
    expect(timeLimitLabel(null)).toBe('không giới hạn');
    expect(timeLimitLabel(15)).toBe('15 phút');
  });
});

describe('giờ Việt Nam nhập tay', () => {
  it('đọc giờ:phút ngày/tháng/năm thành mốc +07:00', () => {
    expect(parseDateTimeInput('07:00 06/10/2026')).toBe('2026-10-06T07:00:00+07:00');
    expect(parseDateTimeInput(' 7:5   6/10/2026 ')).toBe('2026-10-06T07:05:00+07:00');
  });

  it('từ chối sai dạng, giờ không có và ngày không có', () => {
    for (const bad of ['', '07:00', '2026-10-06 07:00', '24:00 06/10/2026', '07:60 06/10/2026', '07:00 31/02/2026']) {
      expect(parseDateTimeInput(bad)).toBeNull();
    }
  });

  it('đổi qua lại với mốc UTC của máy chủ', () => {
    expect(formatDateTimeInput('2026-10-06T00:00:00Z')).toBe('07:00 06/10/2026');
    expect(parseDateTimeInput(formatDateTimeInput('2026-10-06T10:00:00Z'))).toBe('2026-10-06T17:00:00+07:00');
    expect(formatDateTimeInput(null)).toBe('');
  });
});

function quizOf(overrides: Partial<QuizDetail> = {}): QuizDetail {
  return {
    id: 1,
    name: 'Kiểm tra 15 phút',
    description: 'Đọc kỹ từng câu.',
    lessonId: 5,
    lessonTitle: 'Kinh thành Thăng Long',
    lessonStatus: 'PUBLISHED',
    accessCode: null,
    lessonAccessCode: 'BH7F3K2Q',
    classId: 1,
    className: '7A1',
    grade: 7,
    schoolLevel: 2,
    schoolLevelName: 'Cấp 2 (Trung học cơ sở)',
    difficultyLevel: 'MEDIUM',
    timeLimitMinutes: 15,
    timeLimitRule: 'OPTIONAL',
    timeLimitRuleText: '',
    openAt: '2026-10-06T00:00:00Z',
    closeAt: '2026-10-07T10:00:00.123Z',
    shuffleQuestions: true,
    showAnswersAfterSubmit: false,
    totalPoint: 0,
    status: 'DRAFT',
    statusLabel: 'Nháp',
    openState: 'NONE',
    openStateLabel: '',
    publishedAt: null,
    questions: [],
    questionCount: 0,
    readiness: { isReady: false, missing: [], warnings: [] },
    access: { canEditSettings: true, canEditCloseTime: true, canEditQuestions: true, canPublish: false, canClose: false, canDelete: true, canDuplicate: true },
    submittedCount: 0,
    studentCount: 30,
    publishNotice: null,
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

describe('biểu mẫu thiết lập', () => {
  it('dựng từ chi tiết và gửi lên đủ mọi trường', () => {
    const draft = draftFromQuiz(quizOf());
    expect(draft).toMatchObject({ name: 'Kiểm tra 15 phút', timeLimitMinutes: '15', openAt: '07:00 06/10/2026', closeAt: '17:00 07/10/2026', difficultyLevel: 'MEDIUM' });
    expect(quizDraftToBody(draft)).toEqual({
      name: 'Kiểm tra 15 phút',
      description: 'Đọc kỹ từng câu.',
      difficultyLevel: 'MEDIUM',
      timeLimitMinutes: 15,
      openAt: '2026-10-06T07:00:00+07:00',
      closeAt: '2026-10-07T17:00:00+07:00',
      shuffleQuestions: true,
      showAnswersAfterSubmit: false,
    });
  });

  it('giờ chưa sửa thì gửi lại đúng mốc cũ của máy chủ (kể cả phần mili giây)', () => {
    const quiz = quizOf();
    const body = quizDraftToBody(draftFromQuiz(quiz), quiz);
    expect(body.openAt).toBe('2026-10-06T00:00:00Z');
    expect(body.closeAt).toBe('2026-10-07T10:00:00.123Z');
    const edited = quizDraftToBody({ ...draftFromQuiz(quiz), closeAt: '18:00 07/10/2026' }, quiz);
    expect(edited.closeAt).toBe('2026-10-07T18:00:00+07:00');
  });

  it('ô trống gửi null để xóa giá trị', () => {
    const body = quizDraftToBody({ ...emptyQuizDraft('  Bài mới  ') });
    expect(body).toMatchObject({ name: 'Bài mới', description: null, difficultyLevel: null, timeLimitMinutes: null, openAt: null, closeAt: null });
  });

  it('tên bắt buộc và tối đa 255 ký tự; mô tả tối đa 4000', () => {
    expect(validateQuizDraft(emptyQuizDraft(), 2).name).toBe('Vui lòng nhập tên bài kiểm tra.');
    expect(validateQuizDraft(emptyQuizDraft('a'.repeat(256)), 2).name).toMatch(/tối đa 255/);
    expect(validateQuizDraft({ ...emptyQuizDraft('x'), description: 'a'.repeat(4001) }, 2).description).toMatch(/tối đa 4000/);
    expect(validateQuizDraft(emptyQuizDraft('x'), 2)).toEqual({});
  });

  it('cấp 1 không nhập thời gian làm; cấp 2 từ 1 đến 180 phút', () => {
    expect(validateQuizDraft({ ...emptyQuizDraft('x'), timeLimitMinutes: '10' }, 1).timeLimitMinutes).toMatch(/không giới hạn/);
    expect(validateQuizDraft(emptyQuizDraft('x'), 1)).toEqual({});
    for (const bad of ['0', '181', '1,5', 'abc']) {
      expect(validateQuizDraft({ ...emptyQuizDraft('x'), timeLimitMinutes: bad }, 2).timeLimitMinutes).toMatch(/từ 1 đến 180 phút/);
    }
    expect(validateQuizDraft({ ...emptyQuizDraft('x'), timeLimitMinutes: '180' }, 2)).toEqual({});
  });

  it('cấp 3 được để trống khi soạn, bắt buộc khi phát hành', () => {
    expect(validateQuizDraft(emptyQuizDraft('x'), 3).timeLimitMinutes).toBeUndefined();
    expect(validateQuizDraft(emptyQuizDraft('x'), 3, { forPublish: true }).timeLimitMinutes).toBe('Lớp cấp 3 bắt buộc nhập thời gian làm.');
  });

  it('giờ sai dạng, giờ đóng không sau giờ mở, thiếu giờ khi phát hành', () => {
    const base = { ...emptyQuizDraft('x') };
    expect(validateQuizDraft({ ...base, openAt: '6/10/2026' }, 2).openAt).toMatch(/giờ:phút ngày\/tháng\/năm/);
    expect(validateQuizDraft({ ...base, openAt: '17:00 07/10/2026', closeAt: '07:00 07/10/2026' }, 2).closeAt).toBe('Giờ đóng phải sau giờ mở.');
    const publish = validateQuizDraft(base, 2, { forPublish: true });
    expect(publish.openAt).toBe('Vui lòng nhập giờ mở.');
    expect(publish.closeAt).toBe('Vui lòng nhập giờ đóng.');
  });

  it('so hai biểu mẫu để biết đã sửa chưa', () => {
    const a = draftFromQuiz(quizOf());
    expect(sameQuizDraft(a, { ...a })).toBe(true);
    expect(sameQuizDraft(a, { ...a, shuffleQuestions: false })).toBe(false);
  });
});

describe('giai đoạn của bài', () => {
  it('đang chạy khi đã phát hành và chưa hết hạn nhận bài', () => {
    expect(isQuizRunning({ status: 'PUBLISHED', openState: 'OPEN' })).toBe(true);
    expect(isQuizRunning({ status: 'PUBLISHED', openState: 'NOT_OPEN' })).toBe(true);
    expect(isQuizRunning({ status: 'PUBLISHED', openState: 'ENDED' })).toBe(false);
    expect(isQuizRunning({ status: 'DRAFT', openState: 'NONE' })).toBe(false);
  });

  it('tỉ lệ đã nộp trên sĩ số', () => {
    expect(submissionRatio(18, 32)).toBeCloseTo(0.5625);
    expect(submissionRatio(0, 0)).toBe(0);
    expect(submissionRatio(5, 3)).toBe(1);
  });
});

describe('giờ và mã của bài kiểm tra', () => {
  const now = new Date('2026-10-26T17:31:00Z'); // 00:31 ngày 27/10 giờ Việt Nam

  it('đọc lại buổi trong ngày và còn bao lâu', () => {
    expect(describeQuizTime('12:30 27/10/2026', now)).toBe('12:30 trưa 27/10/2026, còn 11 giờ 59 phút nữa');
    expect(describeQuizTime('00:45 27/10/2026', now)).toBe('00:45 đêm 27/10/2026, còn 14 phút nữa');
    expect(describeQuizTime('07:00 30/10/2026', now)).toBe('07:00 sáng 30/10/2026, còn 3 ngày nữa');
    expect(describeQuizTime('00:10 27/10/2026', now)).toBe('00:10 đêm 27/10/2026, đã qua');
    expect(describeQuizTime('sai dạng', now)).toBeNull();
  });

  it('chỉ cấp 1 được phát hành khi chưa đặt giờ', () => {
    const blank = emptyQuizDraft('Bài chơi');
    expect(validateQuizDraft(blank, 1, { forPublish: true }).openAt).toBeUndefined();
    expect(validateQuizDraft({ ...blank, timeLimitMinutes: '30' }, 2, { forPublish: true }).openAt).toBeDefined();
    expect(quizNeedsOpenWindow(1)).toBe(false);
    expect(quizNeedsOpenWindow(3)).toBe(true);
  });

  it('ô nhập mã nhận cả mã bài học và mã bài kiểm tra', () => {
    expect(isWellFormedAccessCode('bh 7f3-k2q')).toBe(true);
    expect(isWellFormedAccessCode('KT4M9P2R')).toBe(true);
    expect(isWellFormedAccessCode('KT4M9P20')).toBe(false);
    expect(spacedLessonCode('KT4M9P2R')).toBe('KT 4M9 P2R');
  });
});
