import type { ContentStatus, HeritageType } from './heritage';
import type { QuestionDifficulty } from './questions';
import type { SchoolLevel } from './types';

// Kiểu dữ liệu của luồng Bài học cho lớp theo cấp: giáo viên soạn (khu giáo viên của web quản trị) và học sinh mở bằng mã
// bài học (web học tập, app mobile). JSON camelCase, enum là chuỗi viết HOA như máy chủ.

/** Loại phần nội dung: mỗi cấp chỉ dùng một số loại (xem `LessonFrame.allowedTypes`). */
export type LessonSectionType = 'STORY' | 'IMAGE' | 'READING' | 'MILESTONE' | 'SOURCE_EXCERPT' | 'REFLECTION';

/** Độ dài AI nhắm tới: ngắn, vừa, chi tiết; số từ cụ thể nằm trong khoảng của cấp. */
export type LessonLength = 'SHORT' | 'MEDIUM' | 'DETAILED';

/** Bố cục học của cấp: cấp 1 từng bước, cấp 2 tự do chuyển bước, cấp 3 tài liệu. */
export type LessonLayout = 'STEP_BY_STEP' | 'FREE_STEPS' | 'DOCUMENT';

export interface FlowStep {
  key: string;
  label: string;
}

/** Lượt AI đã dùng, tối đa và còn lại của trường trong kỳ gói hiện tại. */
export interface AiQuota {
  hasEffectivePlan: boolean;
  planName: string | null;
  used: number;
  max: number | null;
  remaining: number | null;
  /** `yyyy-MM-dd`. */
  periodStart: string | null;
  periodEnd: string | null;
}

export interface LessonHeritageRef {
  id: number;
  slug: string | null;
  name: string | null;
  thumbnailUrl: string | null;
  status: ContentStatus | null;
}

/** Trạng thái của bài trong thư viện bài mẫu: chờ duyệt, đã duyệt (trong thư viện), bị từ chối hoặc bị gỡ. */
export type LessonSampleStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** Thông tin thư viện bài mẫu của một bài; bài không ở thư viện thì `sample` là null. */
export interface LessonSampleInfo {
  status: LessonSampleStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  /** Lý do bị từ chối hoặc bị gỡ. */
  note: string | null;
  /** Số bài đã được tạo từ bài mẫu này. */
  useCount: number;
}

/** Dòng của màn hình Bài học của tôi. */
export interface LessonRow {
  id: number;
  title: string | null;
  classId: number;
  className: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  status: ContentStatus | null;
  /** Chỉ có sau lần xuất bản đầu. */
  accessCode: string | null;
  heritages: LessonHeritageRef[];
  quizCount: number;
  /** Độ khó của bài tính từ câu trong các bài kiểm tra chưa xóa (mức nhiều câu nhất, hòa thì mức cao hơn); null khi bài chưa có bài kiểm tra có câu. */
  difficulty: QuestionDifficulty | null;
  /** "Dễ", "Trung bình", "Khó" hoặc "Chưa có bài kiểm tra". */
  difficultyLabel: string;
  /** Trạng thái trong thư viện bài mẫu; null (hoặc vắng) khi bài không ở thư viện. */
  sample?: LessonSampleInfo | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LessonImageCredit {
  caption: string | null;
  credit: string | null;
  author: string | null;
  license: string | null;
  source: string | null;
}

/** Một phần nội dung của bài khi soạn. `milestoneLabel` là chữ hiển thị sẵn của mốc ("1010", "179 TCN"). */
export interface LessonSection {
  id: number | null;
  type: LessonSectionType;
  typeLabel: string;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  image: LessonImageCredit | null;
  milestoneYear: number | null;
  milestoneLabel: string | null;
  eventId: number | null;
  sourceCitation: string | null;
  sortOrder: number;
}

/** Khung nội dung của cấp: khoảng số từ, ba mức độ dài, loại phần dùng được. */
export interface LessonFrame {
  level: SchoolLevel;
  name: string;
  minWords: number;
  maxWords: number;
  shortWords: number;
  mediumWords: number;
  detailedWords: number;
  allowedTypes: LessonSectionType[];
  layout: LessonLayout;
  sequentialFlow: boolean;
  flow: FlowStep[];
}

export interface LessonReadiness {
  isReady: boolean;
  /** Chặn xuất bản. */
  missing: string[];
  /** Chỉ nhắc. */
  warnings: string[];
}

export interface LessonDetail {
  id: number;
  title: string | null;
  classId: number;
  className: string | null;
  grade: number;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  status: ContentStatus | null;
  accessCode: string | null;
  accessPath: string | null;
  summary: string | null;
  keyPoints: string[];
  sections: LessonSection[];
  heritages: LessonHeritageRef[];
  frame: LessonFrame;
  wordCount: number;
  readiness: LessonReadiness;
  quizCount: number;
  aiQuota: AiQuota;
  /** Trạng thái trong thư viện bài mẫu; null (hoặc vắng) khi bài không ở thư viện. */
  sample?: LessonSampleInfo | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface LessonListFilter {
  classId?: number | '';
  status?: ContentStatus | '';
  heritageType?: HeritageType | '';
  /** Chỉ bài có độ khó này; bài chưa có bài kiểm tra không khớp mức nào. */
  difficulty?: QuestionDifficulty | '';
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateLessonBody {
  classId: number;
  title: string;
  heritageIds: number[];
}

/** Một phần gửi lên khi lưu: toàn bộ các phần theo thứ tự hiển thị. */
export interface LessonSectionInput {
  type: LessonSectionType;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  milestoneYear: number | null;
  eventId: number | null;
  sourceCitation: string | null;
}

/** Lưu bài: trường null thì máy chủ giữ nguyên, có giá trị thì thay toàn bộ. */
export interface UpdateLessonBody {
  title?: string | null;
  summary?: string | null;
  keyPoints?: string[] | null;
  sections?: LessonSectionInput[] | null;
  heritageIds?: number[] | null;
}

/** "Xem như học sinh": bài đúng như học sinh của lớp thấy, chỉ đọc (không tạo lượt làm, không ghi tiến độ). */
export interface LessonPreview {
  lesson: StudentLesson;
  status: ContentStatus | null;
  /** Luôn true: bài kiểm tra chỉ để xem, không nộp bài. */
  quizzesViewOnly: boolean;
}

export interface PublishLessonResult {
  lesson: LessonDetail;
  codeCreated: boolean;
  accessCode: string;
  message: string;
}

export interface DuplicateLessonResult {
  lesson: LessonDetail;
  skippedHeritages: number;
  levelNotice: string | null;
  /** Số bài kiểm tra đã chép thành bản nháp (khi chọn chép kèm bài kiểm tra). */
  copiedQuizzes: number;
  /** Số câu hỏi bị bỏ khi chép bài kiểm tra: câu đã ẩn hoặc không dùng được ở cấp của lớp đích. */
  skippedQuestions: number;
  message: string;
}

/** Kết quả đề xuất hoặc rút khỏi thư viện bài mẫu: chi tiết bài đã cập nhật kèm câu báo. */
export interface LessonSampleResult {
  lesson: LessonDetail;
  message: string;
}

/** Yêu cầu viết lại riêng một phần bằng AI; đoạn trích tư liệu không viết lại được. */
export interface RewriteSectionBody {
  sectionType: Exclude<LessonSectionType, 'SOURCE_EXCERPT'>;
  text: string;
  title?: string;
  year?: number;
  instructions?: string;
}

/** Bản viết lại của một phần, chưa đưa vào bài. `title` null thì giữ tiêu đề cũ. */
export interface RewriteSectionResult {
  generationId: number;
  sectionType: LessonSectionType;
  text: string;
  title: string | null;
  warnings: string[];
  model: string;
  aiQuota: AiQuota;
  message: string;
}

// ---- Thư viện bài mẫu ----

export interface LessonLibraryHeritage {
  id: number;
  slug: string | null;
  name: string | null;
  thumbnailUrl: string | null;
}

export type LessonLibrarySort = 'newest' | 'popular';

export interface LessonLibraryFilter {
  level?: number | '';
  grade?: number | '';
  heritageId?: number | '';
  keyword?: string;
  sort?: LessonLibrarySort;
  page?: number;
  pageSize?: number;
}

/** Thẻ bài mẫu trong thư viện của giáo viên. */
export interface LessonLibraryItem {
  id: number;
  title: string | null;
  schoolLevel: SchoolLevel;
  grade: number;
  heritages: LessonLibraryHeritage[];
  /** Tối đa 200 ký tự. */
  summaryExcerpt: string | null;
  sectionCount: number;
  quizCount: number;
  authorName: string | null;
  schoolName: string | null;
  useCount: number;
  approvedAt: string | null;
  isMine: boolean;
}

export interface LessonLibraryQuiz {
  title: string | null;
  questionCount: number;
}

/** Xem trước một bài mẫu: bài đúng như học sinh thấy (chỉ đọc) và các bài kiểm tra đi kèm. */
export interface LessonLibraryDetail {
  item: LessonLibraryItem;
  lesson: StudentLesson;
  quizzes: LessonLibraryQuiz[];
}

export interface UseLibraryLessonBody {
  targetClassId: number;
  includeQuizzes?: boolean;
}

/** Dòng của trang Thư viện bài mẫu của quản trị hệ thống. */
export interface AdminLessonLibraryRow {
  id: number;
  title: string | null;
  schoolLevel: SchoolLevel;
  grade: number;
  heritages: LessonLibraryHeritage[];
  authorName: string | null;
  schoolName: string | null;
  status: LessonSampleStatus;
  requestedAt: string | null;
  reviewedAt: string | null;
  note: string | null;
  useCount: number;
}

export interface AdminLessonLibraryQuery {
  status?: LessonSampleStatus;
  level?: number | '';
  keyword?: string;
  page?: number;
  pageSize?: number;
}

export interface AdminLessonLibraryDetail {
  item: AdminLessonLibraryRow;
  lesson: StudentLesson;
  quizzes: LessonLibraryQuiz[];
}

export interface AdminLessonLibraryResult {
  item: AdminLessonLibraryRow;
  message: string;
}

/** Bản nháp AI soạn, chưa lưu vào bài. */
export interface LessonDraft {
  generationId: number;
  level: SchoolLevel;
  length: LessonLength;
  lengthLabel: string;
  summary: string;
  keyPoints: string[];
  sections: LessonSection[];
  wordCount: number;
  warnings: string[];
  model: string;
  aiQuota: AiQuota;
  message: string;
}

export interface LessonImageOption {
  mediaId: number;
  url: string | null;
  caption: string | null;
  credit: string | null;
  author: string | null;
  license: string | null;
  source: string | null;
  heritageId: number;
  heritageName: string | null;
  eventId: number | null;
}

export interface LessonEventOption {
  eventId: number;
  heritageId: number;
  heritageName: string | null;
  phaseName: string | null;
  name: string | null;
  startYear: number;
  dateLabel: string;
}

export interface LessonMaterials {
  images: LessonImageOption[];
  events: LessonEventOption[];
}

// ---- Học sinh ----

export interface StudentHeritageCard {
  id: number;
  slug: string;
  name: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  provinceName: string | null;
  latitude: number | null;
  longitude: number | null;
  hasTimeline: boolean;
}

export interface StudentSection {
  type: LessonSectionType;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  image: LessonImageCredit | null;
  milestoneYear: number | null;
  milestoneLabel: string | null;
  eventId: number | null;
  sourceCitation: string | null;
  sortOrder: number;
}

export type StudentQuizState = 'NOT_OPEN' | 'OPEN' | 'IN_PROGRESS' | 'SUBMITTED' | 'CLOSED';

export interface StudentQuiz {
  id: number;
  name: string | null;
  description: string | null;
  openAt: string | null;
  closeAt: string | null;
  timeLimitMinutes: number | null;
  questionCount: number;
  state: StudentQuizState;
  stateLabel: string;
}

/** Bài học như học sinh nhận: nội dung đã lọc theo khung của cấp lớp em. */
export interface StudentLesson {
  id: number;
  accessCode: string;
  title: string | null;
  className: string | null;
  teacherName: string | null;
  schoolLevel: SchoolLevel;
  schoolLevelName: string;
  layout: { layout: LessonLayout; sequentialFlow: boolean; steps: FlowStep[] };
  summary: string | null;
  keyPoints: string[];
  sections: StudentSection[];
  heritages: StudentHeritageCard[];
  quizzes: StudentQuiz[];
  /** Có giá trị khi em gõ mã bài kiểm tra: giao diện vào thẳng bài đó. */
  focusQuizId?: number | null;
}
