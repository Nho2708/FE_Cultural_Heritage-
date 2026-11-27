import type { CurriculumTopic, CurriculumTopicRef } from '@dsvhvn/dung-chung/api';
import { useQuery } from '@tanstack/react-query';
import { teacherCurriculumApi } from '../../lib/api/curriculumEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';

// Hàm dùng chung của phần chủ đề chương trình ở khu giáo viên (ô chọn, bộ lọc, nhãn).

/** Danh sách chủ đề đang dùng của một khối; chưa biết khối (null) thì không gọi. */
export function useGradeTopics(grade: number | null) {
  return useQuery({
    queryKey: queryKeys.teacherTopicList(grade ?? 0),
    queryFn: () => teacherCurriculumApi.list(grade ?? 0).then((r) => r.data.items),
    enabled: grade !== null,
    staleTime: 10 * 60_000,
  });
}

/** Nhãn của một chủ đề trong ô chọn: nội dung kèm số di sản, hoặc lời nhắc chọn tỉnh với chủ đề địa phương. */
export function topicOptionLabel(topic: CurriculumTopic): string {
  return topic.localProvince ? `${topic.title} (chọn theo tỉnh của trường)` : `${topic.title} · ${topic.heritageCount} di sản`;
}

/** Chữ của một nhãn chủ đề: "Chủ đề lớn: Nội dung"; `showGrade` thêm "Lớp N" khi nhãn không nằm cạnh thông tin khối. */
export function topicLabelOf(topic: CurriculumTopicRef, showGrade = false): string {
  const text = `${topic.groupTitle}: ${topic.title}`;
  return showGrade ? `Lớp ${topic.grade} · ${text}` : text;
}
