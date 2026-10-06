import type {
  AttemptQuestion,
  QuestionSubmission,
  SchoolLevel,
  StudentAttempt,
  StudentAttemptResult,
  StudentAttemptRow,
  StudentHome,
  StudentProgress,
  StudentRecommendations,
  StudentQuizIntro,
  StudentQuestionReview,
} from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của khu làm bài: đúng khuôn máy chủ trả (lượt làm bài, giới thiệu bài, kết quả, lịch sử, tiến độ, trang học).

export function homeOf(level: SchoolLevel = 2, overrides: Partial<StudentHome> = {}): StudentHome {
  return {
    studentId: 7,
    studentCode: 'HS8K2QX7',
    fullName: 'Nguyễn Minh An',
    className: '7A1',
    grade: 7,
    level,
    levelName: `Cấp ${level}`,
    layout: 'BALANCED',
    teacherName: 'Trần Văn Bình',
    totalStars: level === 1 ? 0 : null,
    inProgress: [],
    openQuizzes: [],
    myLessons: [],
    recentBadges: [],
    ...overrides,
  };
}

export function questionOf(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 1,
    position: 1,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: 'Kinh thành Huế được khởi công xây dựng dưới triều vua nào?',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Vua Gia Long', imageUrl: null },
      { content: 'Vua Minh Mạng', imageUrl: null },
      { content: 'Vua Tự Đức', imageUrl: null },
    ],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: false,
    answer: null,
    ...overrides,
  };
}

export const SERVER_NOW = '2026-10-06T08:00:00.000Z';

export function attemptOf(level: SchoolLevel, questions: AttemptQuestion[], overrides: Partial<StudentAttempt> = {}): StudentAttempt {
  const timed = level !== 1;
  return {
    id: 31,
    quizId: 9,
    quizName: 'Kiểm tra 15 phút: Kinh thành Huế',
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    level,
    layout: level === 1 ? 'LARGE' : level === 2 ? 'BALANCED' : 'COMPACT',
    readAloud: level === 1,
    showsClock: timed,
    status: 'IN_PROGRESS',
    startedAt: SERVER_NOW,
    deadline: timed ? '2026-10-06T08:15:00.000Z' : null,
    remainingSeconds: timed ? 900 : null,
    serverTime: SERVER_NOW,
    timeLimitMinutes: timed ? 15 : null,
    questionCount: questions.length,
    answeredCount: questions.filter((q) => q.answered).length,
    totalPoint: level === 1 ? null : questions.length,
    questions,
    ...overrides,
  };
}

export function introOf(level: SchoolLevel, overrides: Partial<StudentQuizIntro> = {}): StudentQuizIntro {
  return {
    id: 9,
    name: 'Kiểm tra 15 phút: Kinh thành Huế',
    description: 'Các em đọc kỹ từng câu.',
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    level,
    levelName: `Cấp ${level}`,
    layout: 'BALANCED',
    questionCount: 10,
    totalPoint: level === 1 ? null : 10,
    timeLimitMinutes: level === 1 ? null : 15,
    showsClock: level !== 1,
    openAt: null,
    closeAt: '2026-10-30T10:00:00Z',
    state: 'OPEN',
    stateLabel: 'Đang mở',
    action: 'START',
    actionLabel: 'Bắt đầu',
    attemptId: null,
    attemptStatus: null,
    notice: null,
    ...overrides,
  };
}

export function reviewOf(question: AttemptQuestion, correctAnswer: QuestionSubmission, overrides: Partial<StudentQuestionReview> = {}): StudentQuestionReview {
  return { question, correctAnswer, explanation: 'Vua Gia Long cho khởi công Kinh thành năm 1805.', isCorrect: true, partsCorrect: 1, partsTotal: 1, pointEarned: 1, ...overrides };
}

export function resultOf(level: SchoolLevel, overrides: Partial<StudentAttemptResult> = {}): StudentAttemptResult {
  const one = level === 1;
  return {
    attemptId: 31,
    quizId: 9,
    quizName: 'Kiểm tra 15 phút: Kinh thành Huế',
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    level,
    levelName: `Cấp ${level}`,
    resultView: one ? 'STARS' : 'SCORE',
    status: 'SUBMITTED',
    statusLabel: 'Đã nộp',
    startedAt: SERVER_NOW,
    submittedAt: '2026-10-06T08:12:30.000Z',
    durationSeconds: 750,
    stars: one ? 3 : null,
    praise: one ? 'Giỏi quá! Em được 3 sao, em thật xuất sắc!' : null,
    score: one ? null : 8,
    totalPoint: one ? null : 10,
    percent: one ? null : 80,
    correctCount: one ? null : 8,
    wrongCount: one ? null : 2,
    blankCount: one ? null : 0,
    totalQuestions: 10,
    badges: [],
    answersShown: false,
    questions: null,
    analysis: null,
    ...overrides,
  };
}

export function rowOf(id: number, overrides: Partial<StudentAttemptRow> = {}): StudentAttemptRow {
  return {
    attemptId: id,
    quizId: id + 100,
    quizName: `Kiểm tra số ${id}`,
    lessonId: 5,
    lessonTitle: 'Ngọ Môn và Kinh thành Huế',
    status: 'SUBMITTED',
    statusLabel: 'Đã nộp',
    submittedAt: `2026-09-${20 + id}T08:12:00Z`,
    stars: null,
    score: 8,
    totalPoint: 10,
    percent: 80,
    badges: [],
    ...overrides,
  };
}

export function progressOf(level: SchoolLevel, overrides: Partial<StudentProgress> = {}): StudentProgress {
  return {
    level,
    levelName: `Cấp ${level}`,
    quizzesSubmitted: 3,
    quizzesPublished: 4,
    progressPercent: 75,
    lessonsCompleted: 2,
    lessonsWithQuiz: 3,
    finishedAttempts: 3,
    totalStars: level === 1 ? 7 : null,
    mastery: [],
    badges: [],
    ...overrides,
  };
}

/** "Gợi ý cho em" như máy chủ trả; mặc định không có gợi ý nào (các test của màn hình khác không cần khai báo riêng). */
export function recommendationsOf(level: SchoolLevel = 2, overrides: Partial<StudentRecommendations> = {}): StudentRecommendations {
  return {
    level,
    levelName: `Cấp ${level}`,
    layout: level === 1 ? 'LARGE_CARDS' : level === 3 ? 'COMPACT' : 'STANDARD',
    attemptId: null,
    targetDifficulty: level === 1 ? 'EASY' : 'MEDIUM',
    targetDifficultyName: level === 1 ? 'Dễ' : 'Trung bình',
    nextQuizzes: [],
    lessonsToReview: [],
    heritagesToReview: [],
    relatedHeritages: [],
    newLessons: [],
    reviewPraise: null,
    message: null,
    relatedFromFallback: false,
    ...overrides,
  };
}
