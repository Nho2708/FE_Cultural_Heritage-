import { LESSON_LIMITS, LESSON_SECTION_LABEL, countLessonWords } from '@dsvhvn/dung-chung';
import { imageCreditLine } from '@dsvhvn/dung-chung/lesson-data';
import type {
  LessonDetail,
  LessonDraft,
  LessonFrame,
  LessonImageCredit,
  LessonSection,
  LessonSectionInput,
  LessonSectionType,
  SchoolLevel,
  UpdateLessonBody,
} from '@dsvhvn/dung-chung/api';

// Biểu mẫu Soạn bài học: trạng thái đang sửa trên màn hình, đổi qua lại với dữ liệu của máy chủ, và bản kiểm tại chỗ của
// điều kiện xuất bản theo khung của cấp (cùng quy tắc với máy chủ để giáo viên thấy ngay còn thiếu gì; máy chủ vẫn kiểm lại
// khi lưu và xuất bản). Mọi phần nội dung là một dòng trong danh sách theo thứ tự hiển thị.

/** Một phần đang sửa. `key` chỉ để React nhận biết dòng, không gửi lên máy chủ. */
export interface SectionState {
  key: string;
  type: LessonSectionType;
  title: string;
  body: string;
  imageUrl: string;
  /** Ghi công hình lúc tải về (hiện dưới hình); đổi hình thì làm mới theo thư viện ảnh. */
  image: LessonImageCredit | null;
  milestoneYear: string;
  eventId: number | null;
  sourceCitation: string;
}

export interface LessonFormState {
  title: string;
  summary: string;
  keyPoints: string[];
  sections: SectionState[];
}

let counter = 0;
export const nextKey = () => `phan-${++counter}`;

export function sectionOf(section: LessonSection): SectionState {
  return {
    key: nextKey(),
    type: section.type,
    title: section.title ?? '',
    body: section.body ?? '',
    imageUrl: section.imageUrl ?? '',
    image: section.image,
    milestoneYear: section.milestoneYear === null ? '' : String(section.milestoneYear),
    eventId: section.eventId,
    sourceCitation: section.sourceCitation ?? '',
  };
}

export function formOf(lesson: LessonDetail): LessonFormState {
  return {
    title: lesson.title ?? '',
    summary: lesson.summary ?? '',
    keyPoints: [...lesson.keyPoints],
    sections: [...lesson.sections].sort((a, b) => a.sortOrder - b.sortOrder).map(sectionOf),
  };
}

/** Bản nháp AI thay toàn bộ tóm tắt, ý chính và các phần; tiêu đề giữ nguyên. Chưa lưu cho tới khi giáo viên bấm Lưu. */
export function applyDraft(state: LessonFormState, draft: LessonDraft): LessonFormState {
  return {
    title: state.title,
    summary: draft.summary,
    keyPoints: [...draft.keyPoints],
    sections: [...draft.sections].sort((a, b) => a.sortOrder - b.sortOrder).map(sectionOf),
  };
}

export function newSection(type: LessonSectionType): SectionState {
  return { key: nextKey(), type, title: '', body: '', imageUrl: '', image: null, milestoneYear: '', eventId: null, sourceCitation: '' };
}

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

export function sectionInput(section: SectionState): LessonSectionInput {
  const year = section.milestoneYear.trim();
  return {
    type: section.type,
    title: orNull(section.title),
    body: orNull(section.body),
    imageUrl: orNull(section.imageUrl),
    milestoneYear: section.type === 'MILESTONE' && year !== '' && Number.isInteger(Number(year)) ? Number(year) : null,
    eventId: section.type === 'MILESTONE' ? section.eventId : null,
    sourceCitation: orNull(section.sourceCitation),
  };
}

/** Nội dung gửi lên khi lưu: ý chính trống bị bỏ; các phần theo thứ tự đang hiện. Di sản không đổi ở màn hình này. */
export function bodyOf(state: LessonFormState): UpdateLessonBody {
  return {
    title: state.title.trim(),
    summary: state.summary.trim(),
    keyPoints: state.keyPoints.map((p) => p.trim()).filter((p) => p !== ''),
    sections: state.sections.map(sectionInput),
  };
}

export function isDirty(state: LessonFormState, saved: LessonFormState): boolean {
  return JSON.stringify(bodyOf(state)) !== JSON.stringify(bodyOf(saved));
}

export function moveItem<T>(items: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta;
  if (index < 0 || index >= items.length || target < 0 || target >= items.length) return [...items];
  const next = [...items];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item!);
  return next;
}

/** Số từ của nội dung chính = tóm tắt cộng các đoạn bài đọc thuộc khung của cấp (như máy chủ đếm). */
export function mainWordCount(state: LessonFormState, frame: LessonFrame): number {
  return (
    countLessonWords(state.summary) +
    state.sections.filter((s) => s.type === 'READING' && frame.allowedTypes.includes(s.type)).reduce((sum, s) => sum + countLessonWords(s.body), 0)
  );
}

export interface FormCheck {
  /** Chặn xuất bản. */
  missing: string[];
  /** Chỉ nhắc, không chặn. */
  warnings: string[];
}

/** Bản kiểm tại chỗ của điều kiện xuất bản và cảnh báo theo khung của cấp (không gồm điều kiện về di sản đã xuất bản). */
export function checkForm(state: LessonFormState, frame: LessonFrame): FormCheck {
  const level: SchoolLevel = frame.level;
  const missing: string[] = [];
  const warnings: string[] = [];

  if (state.title.trim() === '') missing.push('tiêu đề bài học');
  if (state.summary.trim() === '') missing.push('tóm tắt');
  const points = state.keyPoints.map((p) => p.trim()).filter((p) => p !== '');
  if (
    points.length < LESSON_LIMITS.minKeyPoints ||
    points.length > LESSON_LIMITS.maxKeyPoints ||
    points.some((p) => p.length > LESSON_LIMITS.keyPointMaxLength)
  ) {
    missing.push(`${LESSON_LIMITS.minKeyPoints}-${LESSON_LIMITS.maxKeyPoints} ý chính (mỗi ý tối đa ${LESSON_LIMITS.keyPointMaxLength} ký tự)`);
  }

  const inFrame = state.sections.filter((s) => frame.allowedTypes.includes(s.type));
  const outside = state.sections.length - inFrame.length;
  if (outside > 0) {
    warnings.push(
      `Có ${outside} phần thuộc khung của cấp khác nên học sinh lớp cấp ${level} sẽ không thấy; hãy xóa hoặc đổi bằng phần của cấp ${level}.`,
    );
  }

  const words = mainWordCount(state, frame);
  if (words > 0 && (words < frame.minWords || words > frame.maxWords)) {
    warnings.push(
      `Nội dung hiện có ${words} từ; bài của lớp cấp ${level} thường dài ${frame.minWords}-${frame.maxWords} từ. Bạn vẫn có thể lưu hoặc xuất bản.`,
    );
  }

  if (level === 1) {
    const steps = inFrame.filter((s) => s.type === 'STORY');
    if (steps.length === 0) missing.push('ít nhất một bước câu chuyện');
    else if (steps.some((s) => s.imageUrl.trim() === '')) missing.push('hình cho mỗi bước câu chuyện');
    if (steps.length > 0 && (steps.length < LESSON_LIMITS.level1MinSteps || steps.length > LESSON_LIMITS.level1MaxSteps)) {
      warnings.push(`Câu chuyện có ${steps.length} bước; cấp 1 thường có ${LESSON_LIMITS.level1MinSteps}-${LESSON_LIMITS.level1MaxSteps} bước.`);
    }
    steps.forEach((step, i) => {
      const n = countLessonWords(step.body);
      if (n > LESSON_LIMITS.level1StepMaxWords) {
        warnings.push(`Bước ${i + 1} dài ${n} từ; mỗi bước nên tối đa ${LESSON_LIMITS.level1StepMaxWords} từ.`);
      }
    });
  } else if (level === 2) {
    const milestones = inFrame.filter((s) => s.type === 'MILESTONE').length;
    if (milestones === 0) missing.push('ít nhất một mốc thời gian');
    else if (milestones < LESSON_LIMITS.level2MinMilestones || milestones > LESSON_LIMITS.level2MaxMilestones) {
      warnings.push(
        `Bài có ${milestones} mốc thời gian; cấp 2 thường có ${LESSON_LIMITS.level2MinMilestones}-${LESSON_LIMITS.level2MaxMilestones} mốc.`,
      );
    }
    if (!inFrame.some((s) => s.type === 'IMAGE' && s.body.trim() !== '')) warnings.push('Bài cấp 2 nên có ít nhất một hình kèm chú thích.');
  } else {
    const excerpts = inFrame.filter((s) => s.type === 'SOURCE_EXCERPT');
    if (excerpts.length === 0) missing.push('ít nhất một đoạn trích tư liệu gốc');
    else if (excerpts.some((s) => s.sourceCitation.trim() === '')) missing.push('nguồn của mỗi đoạn trích');
    if (excerpts.length > LESSON_LIMITS.level3MaxExcerpts) {
      warnings.push(`Bài có ${excerpts.length} đoạn trích; cấp 3 thường có 1-${LESSON_LIMITS.level3MaxExcerpts} đoạn.`);
    }
    excerpts.forEach((excerpt, i) => {
      const n = countLessonWords(excerpt.body);
      if (n > LESSON_LIMITS.level3ExcerptMaxWords) {
        warnings.push(`Đoạn trích ${i + 1} dài ${n} từ; mỗi đoạn nên tối đa ${LESSON_LIMITS.level3ExcerptMaxWords} từ.`);
      }
    });
    const reflections = inFrame.filter((s) => s.type === 'REFLECTION').length;
    if (reflections < 1 || reflections > 5) {
      warnings.push(`Bài có ${reflections} câu hỏi gợi suy nghĩ; cấp 3 thường có 1-5 câu.`);
    }
  }
  return { missing, warnings };
}

/** Dòng ghi công của một hình (tác giả · giấy phép · nguồn), cùng cách ghép với bài học của học sinh: không lặp ghi công hai lần. */
export function creditLine(image: { credit: string | null; author: string | null; license: string | null; source: string | null }): string {
  return imageCreditLine(image);
}

/** Các loại phần giáo viên thêm được ở cấp này, theo thứ tự của khung. */
export function addableTypes(frame: LessonFrame): LessonSectionType[] {
  return frame.allowedTypes;
}

export function addLabel(type: LessonSectionType, level: SchoolLevel): string {
  if (type === 'STORY') return 'Thêm bước';
  if (type === 'IMAGE') return level === 1 ? 'Thêm hình' : 'Thêm hình và chú thích';
  if (type === 'MILESTONE') return 'Thêm mốc';
  if (type === 'SOURCE_EXCERPT') return 'Thêm đoạn trích';
  if (type === 'REFLECTION') return 'Thêm câu hỏi';
  return `Thêm ${LESSON_SECTION_LABEL[type].toLocaleLowerCase('vi-VN')}`;
}

/**
 * Lỗi theo phần: máy chủ gắn lỗi vào khóa dạng `sections[2].body`; trả về số thứ tự phần (từ 0) và câu lỗi đầu tiên của phần đó.
 */
export function sectionErrors(fieldErrors: Record<string, string>): Map<number, string> {
  const result = new Map<number, string>();
  for (const [key, message] of Object.entries(fieldErrors)) {
    const match = /^sections\[(\d+)\]/i.exec(key);
    if (match && !result.has(Number(match[1]))) result.set(Number(match[1]), message);
  }
  return result;
}
