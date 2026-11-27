import type { CurriculumTopic } from '@dsvhvn/dung-chung/api';
import { InlineMessage, SelectField } from '@dsvhvn/dung-chung/ui';
import { useMemo } from 'react';
import { topicOptionLabel } from './topics';

// Ô chọn "Chủ đề chương trình (lớp N)" của hộp Tạo bài học: chủ đề của môn học theo khối của lớp đã chọn, nhóm theo chủ đề lớn. Khối
// không có chủ đề nào (ví dụ lớp 1-3) hoặc chưa tải được danh sách thì không hiện ô này; giáo viên vẫn chọn di sản theo cách thường.

interface TopicPickerProps {
  grade: number;
  topics: readonly CurriculumTopic[];
  value: number | null;
  onChange: (topic: CurriculumTopic | null) => void;
}

export function TopicPicker({ grade, topics, value, onChange }: TopicPickerProps) {
  const options = useMemo(
    () => [
      { value: '', label: 'Không chọn chủ đề (tìm di sản theo tên, tỉnh, loại)' },
      ...topics.map((t) => ({ value: String(t.id), label: topicOptionLabel(t), group: t.groupTitle })),
    ],
    [topics],
  );
  const chosen = topics.find((t) => t.id === value) ?? null;

  return (
    <div className="flex flex-col gap-3">
      <SelectField
        label={`Chủ đề chương trình (lớp ${grade})`}
        value={value === null ? '' : String(value)}
        options={options}
        hint={`Môn ${chosen?.subject ?? topics[0]?.subject ?? 'học'}, theo Chương trình giáo dục phổ thông 2018. Chọn chủ đề để thấy các di sản của chủ đề đó.`}
        onChange={(e) => onChange(topics.find((t) => String(t.id) === e.target.value) ?? null)}
      />
      {chosen?.localProvince && (
        <InlineMessage tone="info">
          Chủ đề này học về địa phương nên chưa có di sản cố định. Hãy chọn tỉnh, thành phố của trường ở ô Tỉnh bên dưới để thấy di sản của địa phương.
        </InlineMessage>
      )}
    </div>
  );
}
