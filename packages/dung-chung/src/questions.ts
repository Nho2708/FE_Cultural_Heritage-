import type {
  QuestionDetail,
  QuestionDifficulty,
  QuestionReviewStatus,
  QuestionType,
  QuestionTypeInfo,
  SaveQuestionBody,
} from './api/questions';

// Logic thuần của Ngân hàng câu hỏi: nhãn, bảng dạng câu theo cấp, trạng thái biểu mẫu soạn câu và đổi qua lại với nội dung
// gửi lên máy chủ. Quy tắc cấu trúc do máy chủ kiểm (xem `validate`); ở đây chỉ dựng khung và đếm để biểu mẫu gọn gàng.

export const QUESTION_TYPES: readonly QuestionType[] = [
  'SINGLE_CHOICE',
  'TRUE_FALSE',
  'IMAGE_CHOICE',
  'MATCHING',
  'ORDERING',
  'FILL_BLANK',
  'MULTI_TRUE_FALSE',
  'SOURCE_READING',
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Một đáp án đúng',
  TRUE_FALSE: 'Đúng/Sai',
  IMAGE_CHOICE: 'Chọn hình đúng',
  MATCHING: 'Ghép cặp hình - tên',
  ORDERING: 'Sắp xếp',
  FILL_BLANK: 'Điền từ',
  MULTI_TRUE_FALSE: 'Nhiều mệnh đề Đúng/Sai',
  SOURCE_READING: 'Đọc tư liệu rồi trả lời',
};

/** Cấp dùng được của từng dạng (bảng dạng câu theo cấp); máy chủ vẫn là nơi kiểm cuối cùng. */
export const QUESTION_TYPE_LEVELS: Record<QuestionType, { min: number; max: number }> = {
  SINGLE_CHOICE: { min: 2, max: 3 },
  TRUE_FALSE: { min: 1, max: 2 },
  IMAGE_CHOICE: { min: 1, max: 1 },
  MATCHING: { min: 1, max: 1 },
  ORDERING: { min: 1, max: 2 },
  FILL_BLANK: { min: 2, max: 2 },
  MULTI_TRUE_FALSE: { min: 3, max: 3 },
  SOURCE_READING: { min: 3, max: 3 },
};

export const DIFFICULTIES: readonly QuestionDifficulty[] = ['EASY', 'MEDIUM', 'HARD'];
export const DIFFICULTY_LABEL: Record<QuestionDifficulty, string> = { EASY: 'Dễ', MEDIUM: 'Trung bình', HARD: 'Khó' };

export const REVIEW_STATUS_LABEL: Record<QuestionReviewStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị loại',
};

export const LEVEL_LABEL: Record<number, string> = { 1: 'Cấp 1', 2: 'Cấp 2', 3: 'Cấp 3' };

/** Nhãn khoảng cấp của một câu: "Cấp 2", "Cấp 2-3". */
export function levelRangeLabel(min: number, max: number): string {
  return min === max ? `Cấp ${min}` : `Cấp ${min}-${max}`;
}

/** Dấu chỗ trống của câu điền từ: ba dấu gạch dưới liền nhau. */
export const BLANK_MARKER = '___';

/** Số chỗ trống trong lời câu (mỗi cụm gạch dưới liền nhau từ ba dấu trở lên tính một chỗ). */
export function countBlankMarkers(content: string): number {
  return content.match(/_{3,}/g)?.length ?? 0;
}

/** Đoạn tư liệu tối đa 150 từ (đếm bằng `countLessonWords`). */
export const PASSAGE_MAX_WORDS = 150;

/** Các dạng dùng được ở một cấp, theo thứ tự chuẩn. */
export function typesForLevel(level: number): QuestionType[] {
  return QUESTION_TYPES.filter((t) => QUESTION_TYPE_LEVELS[t].min <= level && level <= QUESTION_TYPE_LEVELS[t].max);
}

/** Bảng dạng câu của máy chủ → tập dạng của từng cấp (khi chưa tải được thì dùng bảng cố định ở trên). */
export function typesByLevel(table: { byLevel: Record<string, QuestionType[]> } | undefined, level: number): QuestionType[] {
  return table?.byLevel[String(level)] ?? typesForLevel(level);
}

export function levelsOfType(info: Pick<QuestionTypeInfo, 'minLevel' | 'maxLevel'>): number[] {
  const levels: number[] = [];
  for (let l = info.minLevel; l <= info.maxLevel; l++) levels.push(l);
  return levels;
}

// ---- Trạng thái biểu mẫu ----

export interface OptionDraft {
  content: string;
  imageUrl: string;
  isCorrect: boolean;
}
export interface PairDraft {
  left: string;
  leftImageUrl: string;
  right: string;
}
export interface BlankDraft {
  /** Các cách viết đúng, cách nhau bằng dấu chấm phẩy. */
  accepted: string;
}
export interface StatementDraft {
  text: string;
  isTrue: boolean;
}

export interface QuestionDraft {
  questionType: QuestionType;
  heritageId: number | null;
  heritageName: string;
  content: string;
  explanation: string;
  difficultyLevel: QuestionDifficulty;
  levelMin: number;
  levelMax: number;
  imageUrl: string;
  passage: string;
  passageSource: string;
  answerIsTrue: boolean;
  options: OptionDraft[];
  pairs: PairDraft[];
  steps: string[];
  blanks: BlankDraft[];
  /** Từ gây nhiễu, cách nhau bằng dấu chấm phẩy. */
  distractors: string;
  statements: StatementDraft[];
}

export const SEPARATOR = ';';

export function splitList(text: string): string[] {
  return text
    .split(SEPARATOR)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

const emptyOption = (isCorrect = false): OptionDraft => ({ content: '', imageUrl: '', isCorrect });
const emptyPair = (): PairDraft => ({ left: '', leftImageUrl: '', right: '' });

/** Khung đáp án mặc định của một dạng (số phần tử tối thiểu theo quy tắc). */
function structureOf(type: QuestionType): Pick<QuestionDraft, 'options' | 'pairs' | 'steps' | 'blanks' | 'statements'> {
  const base = { options: [] as OptionDraft[], pairs: [] as PairDraft[], steps: [] as string[], blanks: [] as BlankDraft[], statements: [] as StatementDraft[] };
  switch (type) {
    case 'SINGLE_CHOICE':
    case 'SOURCE_READING':
      return { ...base, options: [emptyOption(true), emptyOption(), emptyOption(), emptyOption()] };
    case 'IMAGE_CHOICE':
      return { ...base, options: [emptyOption(true), emptyOption(), emptyOption()] };
    case 'MATCHING':
      return { ...base, pairs: [emptyPair(), emptyPair(), emptyPair()] };
    case 'ORDERING':
      return { ...base, steps: ['', '', ''] };
    case 'FILL_BLANK':
      return { ...base, blanks: [{ accepted: '' }] };
    case 'MULTI_TRUE_FALSE':
      return { ...base, statements: [{ text: '', isTrue: true }, { text: '', isTrue: false }, { text: '', isTrue: true }] };
    default:
      return base;
  }
}

/** Câu trắng của một dạng: cấp phù hợp mặc định là toàn bộ các cấp dạng cho phép. */
export function emptyDraft(type: QuestionType = 'SINGLE_CHOICE'): QuestionDraft {
  const levels = QUESTION_TYPE_LEVELS[type];
  return {
    questionType: type,
    heritageId: null,
    heritageName: '',
    content: '',
    explanation: '',
    difficultyLevel: 'MEDIUM',
    levelMin: levels.min,
    levelMax: levels.max,
    imageUrl: '',
    passage: '',
    passageSource: '',
    answerIsTrue: true,
    distractors: '',
    ...structureOf(type),
  };
}

/** Đổi dạng khi đang soạn: giữ di sản, độ khó, giải thích; đáp án và cấp về mặc định của dạng mới. */
export function changeDraftType(draft: QuestionDraft, type: QuestionType): QuestionDraft {
  if (draft.questionType === type) return draft;
  const fresh = emptyDraft(type);
  return {
    ...fresh,
    heritageId: draft.heritageId,
    heritageName: draft.heritageName,
    explanation: draft.explanation,
    difficultyLevel: draft.difficultyLevel,
    content: type === 'FILL_BLANK' || draft.questionType === 'FILL_BLANK' ? '' : draft.content,
  };
}

/** Thu khoảng cấp của câu vào khoảng dạng cho phép (khi đổi dạng hay mở câu cũ). */
export function clampLevels(type: QuestionType, min: number, max: number): { levelMin: number; levelMax: number } {
  const range = QUESTION_TYPE_LEVELS[type];
  const lo = Math.min(Math.max(min, range.min), range.max);
  const hi = Math.max(Math.min(max, range.max), lo);
  return { levelMin: lo, levelMax: hi };
}

/** Đồng bộ số ô chỗ trống với số dấu `___` trong lời câu (tối đa 3): thêm ô trống, cắt ô thừa. */
export function syncBlanks(blanks: BlankDraft[], content: string): BlankDraft[] {
  const wanted = Math.min(countBlankMarkers(content), 3);
  const next = blanks.slice(0, Math.max(wanted, 0));
  while (next.length < wanted) next.push({ accepted: '' });
  return next;
}

const str = (v: string | null | undefined) => v ?? '';

export function draftFromDetail(detail: QuestionDetail): QuestionDraft {
  const type = detail.questionType;
  const fresh = structureOf(type);
  return {
    questionType: type,
    heritageId: detail.heritageId,
    heritageName: str(detail.heritageName),
    content: str(detail.content),
    explanation: str(detail.explanation),
    difficultyLevel: detail.difficultyLevel ?? 'MEDIUM',
    levelMin: detail.levelMin,
    levelMax: detail.levelMax,
    imageUrl: str(detail.imageUrl),
    passage: str(detail.passage),
    passageSource: str(detail.passageSource),
    answerIsTrue: detail.answerIsTrue ?? true,
    options: detail.options.length ? detail.options.map((o) => ({ content: str(o.content), imageUrl: str(o.imageUrl), isCorrect: o.isCorrect })) : fresh.options,
    pairs: detail.pairs.length ? detail.pairs.map((p) => ({ left: str(p.left), leftImageUrl: str(p.leftImageUrl), right: str(p.right) })) : fresh.pairs,
    steps: detail.steps.length ? [...detail.steps] : fresh.steps,
    blanks: detail.blanks.length ? detail.blanks.map((b) => ({ accepted: b.accepted.join(`${SEPARATOR} `) })) : fresh.blanks,
    distractors: detail.distractors.join(`${SEPARATOR} `),
    statements: detail.statements.length ? detail.statements.map((s) => ({ text: str(s.text), isTrue: s.isTrue })) : fresh.statements,
  };
}

const blankToNull = (v: string) => (v.trim() === '' ? null : v.trim());

/** Nội dung gửi lên: chỉ gửi phần đáp án của đúng dạng đang chọn. */
export function draftToBody(draft: QuestionDraft): SaveQuestionBody {
  const body: SaveQuestionBody = {
    questionType: draft.questionType,
    heritageId: draft.heritageId,
    content: blankToNull(draft.content),
    explanation: blankToNull(draft.explanation),
    difficultyLevel: draft.difficultyLevel,
    levelMin: draft.levelMin,
    levelMax: draft.levelMax,
  };
  switch (draft.questionType) {
    case 'SINGLE_CHOICE':
      body.options = draft.options.map((o) => ({ content: blankToNull(o.content), imageUrl: null, isCorrect: o.isCorrect }));
      break;
    case 'SOURCE_READING':
      body.passage = blankToNull(draft.passage);
      body.passageSource = blankToNull(draft.passageSource);
      body.options = draft.options.map((o) => ({ content: blankToNull(o.content), imageUrl: null, isCorrect: o.isCorrect }));
      break;
    case 'TRUE_FALSE':
      body.answerIsTrue = draft.answerIsTrue;
      body.imageUrl = blankToNull(draft.imageUrl);
      break;
    case 'IMAGE_CHOICE':
      body.options = draft.options.map((o) => ({ content: blankToNull(o.content), imageUrl: blankToNull(o.imageUrl), isCorrect: o.isCorrect }));
      break;
    case 'MATCHING':
      body.pairs = draft.pairs.map((p) => ({ left: blankToNull(p.left), leftImageUrl: blankToNull(p.leftImageUrl), right: blankToNull(p.right) }));
      break;
    case 'ORDERING':
      body.steps = draft.steps.map((s) => s.trim());
      break;
    case 'FILL_BLANK':
      body.blanks = draft.blanks.map((b) => ({ accepted: splitList(b.accepted) }));
      body.distractors = splitList(draft.distractors);
      break;
    case 'MULTI_TRUE_FALSE':
      body.statements = draft.statements.map((s) => ({ text: blankToNull(s.text), isTrue: s.isTrue }));
      break;
  }
  return body;
}

/** Chọn đúng một phương án làm đáp án đúng (các phương án khác thành sai). */
export function markCorrect(options: OptionDraft[], index: number): OptionDraft[] {
  return options.map((o, i) => ({ ...o, isCorrect: i === index }));
}

/** Dòng lỗi của một trường theo khóa của máy chủ (`options[1].content`); trả null khi không có. */
export function fieldError(errors: Record<string, string>, key: string): string | null {
  return errors[key] ?? null;
}

/** Lỗi của máy chủ không gắn được vào ô nào của biểu mẫu (để hiện chung ở đầu biểu mẫu). */
export function unplacedErrors(errors: Record<string, string>, knownKeys: ReadonlyArray<string | RegExp>): string[] {
  return Object.entries(errors)
    .filter(([key]) => !knownKeys.some((k) => (typeof k === 'string' ? k === key : k.test(key))))
    .map(([, message]) => message);
}
