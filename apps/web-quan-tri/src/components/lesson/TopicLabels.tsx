import type { CurriculumTopicRef } from '@dsvhvn/dung-chung/api';
import { Badge } from '@dsvhvn/dung-chung/ui';
import { topicLabelOf } from './topics';

// Nhãn chỉ đọc "Chủ đề chương trình: …" của bài học, bài mẫu và di sản. Mỗi chủ đề là một nhãn "Chủ đề lớn: Nội dung"; `showGrade` thêm "Lớp N"
// khi nhãn không nằm cạnh thông tin khối (chi tiết di sản).

interface TopicLabelsProps {
  topics: readonly CurriculumTopicRef[] | null | undefined;
  showGrade?: boolean;
  /** Chữ khi không có chủ đề nào; để trống thì ẩn cả dòng. */
  emptyText?: string;
  className?: string;
}

export function TopicLabels({ topics, showGrade = false, emptyText, className }: TopicLabelsProps) {
  const list = topics ?? [];
  if (list.length === 0 && !emptyText) return null;
  return (
    <div className={className}>
      <p className="type-label text-on-surface-variant">Chủ đề chương trình</p>
      {list.length === 0 ? (
        <p className="mt-1 type-body-s text-on-surface-variant">{emptyText}</p>
      ) : (
        <ul aria-label="Chủ đề chương trình" className="mt-1 flex flex-wrap gap-2">
          {list.map((topic) => (
            <li key={topic.id}>
              <Badge tone="neutral" className="h-auto min-h-6 py-0.5 whitespace-normal">
                {topicLabelOf(topic, showGrade)}
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
