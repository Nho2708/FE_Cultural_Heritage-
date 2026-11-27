import { MESSAGES, collectErrors, trimToNull, validateOptionalText, validateRequiredText } from '@dsvhvn/dung-chung';
import type { AdminCurriculumTopic, CurriculumTopicInput } from '@dsvhvn/dung-chung/api';

// Biểu mẫu chủ đề chương trình: giá trị đang gõ (toàn chữ), kiểm tra phía giao diện cùng giới hạn với cột của CSDL, và thân gửi lên.
// Máy chủ vẫn là nơi quyết định (409 khi trùng khối, môn, chủ đề lớn, nội dung).

export type TopicField = 'subject' | 'grade' | 'groupTitle' | 'title' | 'description' | 'sortOrder' | 'sourceUrl';
export const TOPIC_FIELDS: readonly TopicField[] = ['subject', 'grade', 'groupTitle', 'title', 'description', 'sortOrder', 'sourceUrl'];

export const TOPIC_LIMITS = { subject: 100, groupTitle: 255, title: 255, description: 1000, sourceUrl: 500, sortOrder: 100000 } as const;

export interface TopicValues {
  subject: string;
  grade: string;
  groupTitle: string;
  title: string;
  description: string;
  sortOrder: string;
  sourceUrl: string;
  localProvince: boolean;
}

export const EMPTY_TOPIC: TopicValues = {
  subject: '',
  grade: '',
  groupTitle: '',
  title: '',
  description: '',
  sortOrder: '',
  sourceUrl: '',
  localProvince: false,
};

export function topicValuesOf(topic: AdminCurriculumTopic): TopicValues {
  return {
    subject: topic.subject,
    grade: String(topic.grade),
    groupTitle: topic.groupTitle,
    title: topic.title,
    description: topic.description ?? '',
    sortOrder: String(topic.sortOrder),
    sourceUrl: topic.sourceUrl ?? '',
    localProvince: topic.localProvince,
  };
}

function validateGrade(value: string): string | null {
  if (value.trim() === '') return MESSAGES.required('khối');
  const grade = Number(value);
  return Number.isInteger(grade) && grade >= 1 && grade <= 12 ? null : MESSAGES.invalid('Khối', 'từ 1 đến 12');
}

function validateSortOrder(value: string): string | null {
  if (value.trim() === '') return MESSAGES.required('thứ tự');
  const order = Number(value);
  return Number.isInteger(order) && order >= 0 && order <= TOPIC_LIMITS.sortOrder
    ? null
    : MESSAGES.invalid('Thứ tự', `số nguyên từ 0 đến ${TOPIC_LIMITS.sortOrder}`);
}

function validateSourceUrl(value: string): string | null {
  const text = value.trim();
  if (text === '') return null;
  if (text.length > TOPIC_LIMITS.sourceUrl) return MESSAGES.invalid('Đường dẫn nguồn', `tối đa ${TOPIC_LIMITS.sourceUrl} ký tự`);
  return /^https?:\/\/\S+$/i.test(text) ? null : MESSAGES.invalid('Đường dẫn nguồn', 'bắt đầu bằng http:// hoặc https://');
}

export function validateTopic(values: TopicValues): Partial<Record<TopicField, string>> {
  return collectErrors<TopicField>({
    subject: validateRequiredText(values.subject, 'môn học', 'Môn học', TOPIC_LIMITS.subject),
    grade: validateGrade(values.grade),
    groupTitle: validateRequiredText(values.groupTitle, 'chủ đề lớn', 'Chủ đề lớn', TOPIC_LIMITS.groupTitle),
    title: validateRequiredText(values.title, 'nội dung chủ đề', 'Nội dung chủ đề', TOPIC_LIMITS.title),
    description: validateOptionalText(values.description, 'Mô tả', TOPIC_LIMITS.description),
    sortOrder: validateSortOrder(values.sortOrder),
    sourceUrl: validateSourceUrl(values.sourceUrl),
  });
}

export function topicBody(values: TopicValues): CurriculumTopicInput {
  return {
    subject: values.subject.trim(),
    grade: Number(values.grade),
    groupTitle: values.groupTitle.trim(),
    title: values.title.trim(),
    description: trimToNull(values.description),
    localProvince: values.localProvince,
    sortOrder: Number(values.sortOrder),
    sourceUrl: trimToNull(values.sourceUrl),
  };
}
