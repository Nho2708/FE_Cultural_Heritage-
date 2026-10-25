import type {
  AttemptQuestion,
  ClassMastery,
  ClassProgress,
  ClassRecommendations,
  QuestionStat,
  QuizQuestionStats,
  QuizResultsOverview,
  QuizStudentRow,
  QuizStudents,
  QuizTopicStats,
  StudentProfileStats,
  TeacherAttemptDetail,
  TopicStat,
} from '@dsvhvn/dung-chung/api';

// Dữ liệu mẫu của luồng Thống kê và gợi ý, dựng theo khuôn máy chủ trả.

export function overviewOf(overrides: Partial<QuizResultsOverview> = {}): QuizResultsOverview {
  return {
    quizId: 9,
    name: 'Kiểm tra 15 phút: Kinh thành Thăng Long',
    status: 'PUBLISHED',
    lessonId: 5,
    lessonTitle: 'Hoàng thành Thăng Long',
    classId: 1,
    className: '7A1',
    level: 2,
    levelName: 'Cấp 2 (Trung học cơ sở)',
    totalPoint: 10,
    questionCount: 10,
    enrolled: 32,
    submitted: 27,
    autoSubmitted: 1,
    finished: 28,
    inProgress: 1,
    notStarted: 3,
    averageScore: 7.4,
    highestScore: 10,
    lowestScore: 3,
    averagePercent: 74,
    highestPercent: 100,
    lowestPercent: 30,
    distribution: [0, 0, 0, 1, 1, 2, 3, 6, 7, 8].map((count, i) => ({ fromPercent: i * 10, toPercent: (i + 1) * 10, count })),
    message: null,
    ...overrides,
  };
}

export function questionStatOf(position: number, overrides: Partial<QuestionStat> = {}): QuestionStat {
  return {
    questionId: 100 + position,
    position,
    content: `Câu hỏi số ${position} về Văn Miếu?`,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    point: 1,
    heritageId: 11,
    heritageName: 'Văn Miếu – Quốc Tử Giám',
    answered: 28,
    correct: 24,
    ratePercent: 86,
    parts: [],
    choices: [
      { answerId: 1, content: 'Năm 1070, vua Lý Thánh Tông', imageUrl: null, isCorrect: true, count: 24, percent: 86 },
      { answerId: 2, content: 'Năm 1010', imageUrl: null, isCorrect: false, count: 4, percent: 14 },
    ],
    mostChosen: { answerId: 1, content: 'Năm 1070, vua Lý Thánh Tông', imageUrl: null, isCorrect: true, count: 24, percent: 86 },
    commonErrors: [],
    ...overrides,
  };
}

export function topicOf(name: string, rate: number, overrides: Partial<TopicStat> = {}): TopicStat {
  return {
    heritageId: 11,
    questionType: null,
    name,
    answered: 40,
    correct: Math.round((40 * rate) / 100),
    ratePercent: rate,
    level: rate >= 80 ? 'MASTERED' : rate >= 50 ? 'FAIR' : 'NEEDS_REVIEW',
    levelLabel: rate >= 80 ? 'Thành thạo' : rate >= 50 ? 'Đạt' : 'Cần ôn',
    needsReview: rate < 50,
    ...overrides,
  };
}

export function questionStatsOf(overrides: Partial<QuizQuestionStats> = {}): QuizQuestionStats {
  return {
    quizId: 9,
    name: 'Kiểm tra 15 phút: Kinh thành Thăng Long',
    finished: 28,
    questions: [
      questionStatOf(1),
      questionStatOf(2, {
        questionType: 'ORDERING',
        typeName: 'Sắp xếp sự kiện',
        ratePercent: 71,
        choices: [],
        mostChosen: null,
        parts: [{ label: 'Vị trí 1', answered: 28, correct: 25, ratePercent: 89 }],
        commonErrors: [{ label: 'Mở Quốc Tử Giám', wrong: 9, wrongPercent: 32, mostCommonWrong: 'Đặt trước Xây dựng Văn Miếu' }],
      }),
      questionStatOf(5, {
        ratePercent: 39,
        correct: 11,
        mostChosen: { answerId: 3, content: 'Phía bắc', imageUrl: null, isCorrect: false, count: 13, percent: 46 },
        choices: [
          { answerId: 3, content: 'Phía bắc', imageUrl: null, isCorrect: false, count: 13, percent: 46 },
          { answerId: null, content: null, imageUrl: null, isCorrect: false, count: 2, percent: 7 },
        ],
      }),
    ],
    byQuestionType: [],
    message: null,
    ...overrides,
  };
}

export function quizTopicsOf(overrides: Partial<QuizTopicStats> = {}): QuizTopicStats {
  return {
    quizId: 9,
    name: 'Kiểm tra 15 phút: Kinh thành Thăng Long',
    finished: 28,
    byHeritage: [topicOf('Văn Miếu – Quốc Tử Giám', 45), topicOf('Hoàng thành Thăng Long', 82)],
    byQuestionType: [topicOf('Một đáp án đúng', 78, { heritageId: null, questionType: 'SINGLE_CHOICE' })],
    message: null,
    ...overrides,
  };
}

export function studentRowOf(studentId: number, overrides: Partial<QuizStudentRow> = {}): QuizStudentRow {
  return {
    studentId,
    studentCode: `HS${studentId}K2QX7`,
    fullName: `Học sinh số ${studentId}`,
    status: 'SUBMITTED',
    statusLabel: 'Đã nộp',
    attemptId: 300 + studentId,
    startedAt: '2026-10-06T00:40:00Z',
    submittedAt: '2026-10-06T00:52:40Z',
    durationSeconds: 760,
    score: 7.5,
    totalPoint: 10,
    percent: 75,
    stars: null,
    correctCount: 7,
    totalQuestions: 10,
    badges: [],
    ...overrides,
  };
}

export function quizStudentsOf(students: QuizStudentRow[], level: 1 | 2 | 3 = 2): QuizStudents {
  return { quizId: 9, name: 'Kiểm tra 15 phút: Kinh thành Thăng Long', level, students };
}

export function attemptQuestionOf(overrides: Partial<AttemptQuestion> = {}): AttemptQuestion {
  return {
    questionId: 101,
    position: 1,
    point: 1,
    questionType: 'SINGLE_CHOICE',
    typeName: 'Một đáp án đúng',
    content: 'Văn Miếu được xây dựng vào năm nào, dưới thời vua nào?',
    imageUrl: null,
    passage: null,
    passageSource: null,
    options: [
      { content: 'Năm 1010, vua Lý Thái Tổ', imageUrl: null },
      { content: 'Năm 1070, vua Lý Thánh Tông', imageUrl: null },
    ],
    leftItems: [],
    rightItems: [],
    items: [],
    blankCount: 0,
    wordBank: [],
    statements: [],
    partsTotal: 1,
    answered: true,
    answer: { selectedIndex: 1 },
    checked: false,
    ...overrides,
  };
}

export function attemptDetailOf(overrides: Partial<TeacherAttemptDetail> = {}): TeacherAttemptDetail {
  return {
    attemptId: 301,
    studentId: 1,
    studentCode: 'HS8K2QX7',
    fullName: 'Nguyễn Minh Anh',
    quizId: 9,
    quizName: 'Kiểm tra 15 phút: Kinh thành Thăng Long',
    lessonId: 5,
    lessonTitle: 'Hoàng thành Thăng Long',
    className: '7A1',
    level: 2,
    status: 'SUBMITTED',
    statusLabel: 'Đã nộp',
    startedAt: '2026-10-06T00:40:00Z',
    submittedAt: '2026-10-06T00:52:40Z',
    durationSeconds: 760,
    score: 7.5,
    totalPoint: 10,
    percent: 75,
    stars: null,
    correctCount: 7,
    totalQuestions: 10,
    badges: [{ code: 'ON_TIME', name: 'Nộp đúng hạn', description: 'Em tự nộp bài trước khi hết giờ.' }],
    questions: [
      {
        question: attemptQuestionOf(),
        correctAnswer: { selectedIndex: 1 },
        explanation: 'Văn Miếu được xây năm 1070 dưới thời vua Lý Thánh Tông.',
        isCorrect: true,
        partsCorrect: 1,
        partsTotal: 1,
        pointEarned: 1,
      },
      {
        question: attemptQuestionOf({
          questionId: 102,
          position: 2,
          questionType: 'ORDERING',
          typeName: 'Sắp xếp sự kiện',
          content: 'Sắp xếp các sự kiện theo thứ tự thời gian.',
          options: [],
          items: ['Lý Công Uẩn ban Chiếu dời đô', 'Mở Quốc Tử Giám', 'Xây dựng Văn Miếu'],
          partsTotal: 3,
          answer: { order: [0, 1, 2] },
        }),
        correctAnswer: { order: [0, 2, 1] },
        explanation: null,
        isCorrect: false,
        partsCorrect: 1,
        partsTotal: 3,
        pointEarned: 0.5,
      },
      {
        question: attemptQuestionOf({ questionId: 105, position: 5, content: 'Đoan Môn là cổng ở phía nào?', answered: false, answer: null }),
        correctAnswer: { selectedIndex: 0 },
        explanation: null,
        isCorrect: false,
        partsCorrect: 0,
        partsTotal: 1,
        pointEarned: 0,
      },
    ],
    ...overrides,
  };
}

export function progressOf(overrides: Partial<ClassProgress> = {}): ClassProgress {
  return {
    classId: 1,
    className: '7A1',
    grade: 7,
    level: 2,
    levelName: 'Cấp 2 (Trung học cơ sở)',
    enrolled: 32,
    neverLoggedIn: 2,
    quizzesPublished: 2,
    submittedTotal: 47,
    progressPercent: 73.4,
    quizzes: [
      { quizId: 9, name: 'Kiểm tra 15 phút: Kinh thành Huế', lessonId: 5, lessonTitle: 'Ngọ Môn và Kinh thành Huế', status: 'PUBLISHED', openAt: null, closeAt: '2026-09-30T10:00:00Z', submitted: 18, enrolled: 32, ratePercent: 56.3 },
      { quizId: 10, name: 'Ôn tập: Văn Miếu – Quốc Tử Giám', lessonId: 6, lessonTitle: 'Văn Miếu', status: 'CLOSED', openAt: null, closeAt: '2026-09-26T10:00:00Z', submitted: 29, enrolled: 32, ratePercent: 90.6 },
    ],
    students: [
      { studentId: 1, studentCode: 'HS8K2QX7', fullName: 'Nguyễn Minh Anh', lastLoginAt: '2026-09-29T00:28:00Z', neverLoggedIn: false, quizzesSubmitted: 2, quizzesPublished: 2, lessonsCompleted: 2, lessonsWithQuizzes: 2, totalStars: null, averagePercent: 82, badges: [{ code: 'EXCELLENT', name: 'Xuất sắc', count: 1 }] },
      { studentId: 2, studentCode: 'HS3F7PLM', fullName: 'Trần Gia Bảo', lastLoginAt: null, neverLoggedIn: true, quizzesSubmitted: 0, quizzesPublished: 2, lessonsCompleted: 0, lessonsWithQuizzes: 2, totalStars: null, averagePercent: null, badges: [] },
    ],
    cells: [
      { studentId: 1, quizId: 9, attemptId: 301, status: 'SUBMITTED', score: 9, totalPoint: 10, percent: 90, stars: null },
      { studentId: 1, quizId: 10, attemptId: 302, status: 'EXPIRED', score: 6, totalPoint: 10, percent: 60, stars: null },
    ],
    message: null,
    ...overrides,
  };
}

export function masteryOf(overrides: Partial<ClassMastery> = {}): ClassMastery {
  const row = (id: number, name: string, rate: number) => ({
    id,
    name,
    answered: 40,
    correct: Math.round((40 * rate) / 100),
    ratePercent: rate,
    level: (rate >= 80 ? 'MASTERED' : rate >= 50 ? 'FAIR' : 'NEEDS_REVIEW') as 'MASTERED' | 'FAIR' | 'NEEDS_REVIEW',
    levelLabel: rate >= 80 ? 'Thành thạo' : rate >= 50 ? 'Đạt' : 'Cần ôn',
    stars: 2,
  });
  return {
    classId: 1,
    className: '7A1',
    provinceId: null,
    heritageType: null,
    byHeritage: [row(11, 'Văn Miếu – Quốc Tử Giám', 52), row(12, 'Quần thể di tích Cố đô Huế', 82)],
    byProvince: [row(1, 'Thành phố Hà Nội', 52)],
    byHeritageType: [row(100, 'Vật thể', 70)],
    byQuestionType: [topicOf('Sắp xếp sự kiện', 52, { heritageId: null, questionType: 'ORDERING' })],
    heatmapStudents: [
      { studentId: 1, studentCode: 'HS8K2QX7', fullName: 'Nguyễn Minh Anh' },
      { studentId: 2, studentCode: 'HS3F7PLM', fullName: 'Trần Gia Bảo' },
    ],
    heatmapCells: [
      { studentId: 1, heritageId: 11, answered: 5, correct: 4, ratePercent: 80, level: 'MASTERED' },
      { studentId: 1, heritageId: 12, answered: 5, correct: 2, ratePercent: 40, level: 'NEEDS_REVIEW' },
    ],
    message: null,
    ...overrides,
  };
}

export function profileOf(overrides: Partial<StudentProfileStats> = {}): StudentProfileStats {
  return {
    studentId: 1,
    studentCode: 'HS8K2QX7',
    fullName: 'Nguyễn Minh Anh',
    classId: 1,
    className: '7A1',
    level: 2,
    isActive: true,
    lastLoginAt: '2026-09-29T00:28:00Z',
    quizzesSubmitted: 2,
    quizzesPublished: 3,
    finishedAttempts: 2,
    averagePercent: 75,
    totalStars: null,
    history: [
      { attemptId: 301, quizId: 9, quizName: 'Kiểm tra 15 phút: Kinh thành Huế', lessonId: 5, lessonTitle: 'Ngọ Môn và Kinh thành Huế', status: 'SUBMITTED', statusLabel: 'Đã nộp', submittedAt: '2026-09-29T00:42:00Z', score: 9, totalPoint: 10, percent: 90, stars: null, badges: [{ code: 'EXCELLENT', name: 'Xuất sắc', description: '' }] },
      { attemptId: 302, quizId: 10, quizName: 'Ôn tập: Văn Miếu', lessonId: 6, lessonTitle: 'Văn Miếu', status: 'EXPIRED', statusLabel: 'Hết giờ, tự nộp', submittedAt: '2026-09-23T08:10:00Z', score: 6, totalPoint: 10, percent: 60, stars: null, badges: [] },
    ],
    scoreTrend: [
      { attemptId: 302, submittedAt: '2026-09-23T08:10:00Z', quizName: 'Ôn tập: Văn Miếu', percent: 60 },
      { attemptId: 301, submittedAt: '2026-09-29T00:42:00Z', quizName: 'Kiểm tra 15 phút: Kinh thành Huế', percent: 90 },
    ],
    completedLessons: [{ lessonId: 5, title: 'Ngọ Môn và Kinh thành Huế', quizzesDone: 1, quizzesPublished: 1 }],
    masteryByHeritage: [
      { id: 11, name: 'Văn Miếu – Quốc Tử Giám', answered: 10, correct: 5, ratePercent: 50, level: 'FAIR', levelLabel: 'Đạt', stars: 2 },
      { id: 12, name: 'Quần thể di tích Cố đô Huế', answered: 10, correct: 9, ratePercent: 90, level: 'MASTERED', levelLabel: 'Thành thạo', stars: 3 },
    ],
    masteryByProvince: [{ id: 1, name: 'Thành phố Hà Nội', answered: 10, correct: 5, ratePercent: 50, level: 'FAIR', levelLabel: 'Đạt', stars: 2 }],
    masteryByHeritageType: [],
    badges: [{ code: 'EXCELLENT', name: 'Xuất sắc', count: 1 }],
    message: null,
    ...overrides,
  };
}

export function classRecommendationsOf(overrides: Partial<ClassRecommendations> = {}): ClassRecommendations {
  return {
    classId: 1,
    className: '7A1',
    level: 2,
    quizId: null,
    from: null,
    to: null,
    submittedAttempts: 47,
    answeredQuestions: 470,
    heritagesToReview: [
      { heritageId: 11, slug: 'van-mieu', name: 'Văn Miếu – Quốc Tử Giám', thumbnailUrl: null, shortDescription: null, provinceName: 'Thành phố Hà Nội', typeName: 'Vật thể', answered: 216, wrong: 95, wrongPercent: 44, reason: 'Lớp sai 44% ở 216 câu về di sản này' },
    ],
    relatedHeritages: [
      { heritageId: 21, slug: 'nha-nhac', name: 'Nhã nhạc – Âm nhạc cung đình Việt Nam', thumbnailUrl: null, shortDescription: null, provinceName: 'Thành phố Huế', typeName: 'Phi vật thể', reason: 'Cùng Thành phố Huế với Quần thể di tích Cố đô Huế' },
    ],
    suggestedHeritageIds: [11],
    message: null,
    relatedFromFallback: false,
    ...overrides,
  };
}
