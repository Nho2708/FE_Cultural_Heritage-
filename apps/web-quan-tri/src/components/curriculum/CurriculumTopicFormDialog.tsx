import { focusFirstInvalid, splitApiError } from '@dsvhvn/dung-chung';
import type { AdminCurriculumTopic } from '@dsvhvn/dung-chung/api';
import { Button, CheckboxField, InlineMessage, Modal, SelectField, TextAreaField, TextField } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { adminCurriculumApi } from '../../lib/api/curriculumEndpoints';
import {
  EMPTY_TOPIC,
  TOPIC_FIELDS,
  TOPIC_LIMITS,
  topicBody,
  topicValuesOf,
  validateTopic,
  type TopicField,
  type TopicValues,
} from './topicForm';

// Biểu mẫu chủ đề chương trình (hộp thoại): thêm chủ đề mới hoặc sửa chủ đề đã có. Chủ đề trùng (cùng khối, môn, chủ đề lớn, nội dung) máy chủ
// từ chối 409 và câu đó hiện ngay trong hộp thoại. Chủ đề "Địa phương em" bật ô "Theo tỉnh, thành phố của trường": không gắn di sản cố định.

const GRADE_OPTIONS = [{ value: '', label: 'Chọn khối' }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Khối ${i + 1}` }))];

interface CurriculumTopicFormDialogProps {
  /** Chủ đề đang sửa; không có thì là thêm mới. */
  topic?: AdminCurriculumTopic;
  /** Giá trị gợi ý khi thêm mới (khối đang lọc, thứ tự kế tiếp). */
  defaults?: Partial<TopicValues>;
  onSaved: (topic: AdminCurriculumTopic, message: string | null) => void;
  onClose: () => void;
}

export function CurriculumTopicFormDialog({ topic, defaults, onSaved, onClose }: CurriculumTopicFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<TopicValues>(() => (topic ? topicValuesOf(topic) : { ...EMPTY_TOPIC, ...defaults }));
  const [errors, setErrors] = useState<Partial<Record<TopicField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof TopicValues>(field: K, value: TopicValues[K]) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (field in errors) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const text = (field: TopicField) => (event: { target: { value: string } }) => set(field, event.target.value);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateTopic(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const body = topicBody(values);
      const { data, message } = topic ? await adminCurriculumApi.update(topic.id, body) : await adminCurriculumApi.create(body);
      onSaved(data, message);
    } catch (err) {
      const failure = splitApiError<TopicField>(err, TOPIC_FIELDS);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      title={topic ? 'Sửa chủ đề chương trình' : 'Thêm chủ đề chương trình'}
      description="Chủ đề của môn học theo Chương trình giáo dục phổ thông 2018, để giáo viên chọn di sản theo chủ đề khi tạo bài."
      size="panel"
      busy={saving}
      onClose={onClose}
    >
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <div className="grid gap-4 dsvsm:grid-cols-[1fr_160px]">
          <TextField
            label="Môn học"
            name="subject"
            value={values.subject}
            maxLength={TOPIC_LIMITS.subject}
            autoComplete="off"
            hint="Ví dụ: Lịch sử và Địa lí, Lịch sử."
            error={errors.subject}
            onChange={text('subject')}
          />
          <SelectField label="Khối" name="grade" value={values.grade} options={GRADE_OPTIONS} error={errors.grade} onChange={text('grade')} />
        </div>
        <TextField
          label="Chủ đề lớn"
          name="groupTitle"
          value={values.groupTitle}
          maxLength={TOPIC_LIMITS.groupTitle}
          autoComplete="off"
          error={errors.groupTitle}
          onChange={text('groupTitle')}
        />
        <TextField
          label="Nội dung chủ đề"
          name="title"
          value={values.title}
          maxLength={TOPIC_LIMITS.title}
          autoComplete="off"
          error={errors.title}
          onChange={text('title')}
        />
        <TextAreaField
          label="Mô tả (không bắt buộc)"
          name="description"
          value={values.description}
          maxLength={TOPIC_LIMITS.description}
          rows={3}
          error={errors.description}
          onChange={text('description')}
        />
        <div className="grid gap-4 dsvsm:grid-cols-[160px_1fr]">
          <TextField
            label="Thứ tự"
            name="sortOrder"
            inputMode="numeric"
            value={values.sortOrder}
            autoComplete="off"
            error={errors.sortOrder}
            onChange={text('sortOrder')}
          />
          <TextField
            label="Đường dẫn nguồn (không bắt buộc)"
            name="sourceUrl"
            type="url"
            value={values.sourceUrl}
            maxLength={TOPIC_LIMITS.sourceUrl}
            autoComplete="off"
            error={errors.sourceUrl}
            onChange={text('sourceUrl')}
          />
        </div>
        <CheckboxField
          label="Theo tỉnh, thành phố của trường"
          checked={values.localProvince}
          onChange={(e) => set('localProvince', e.target.checked)}
          hint='Dành cho chủ đề "Địa phương em": không gắn di sản cố định, giáo viên được nhắc chọn tỉnh của trường.'
        />
        <div className="mt-2 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            {topic ? 'Lưu chủ đề' : 'Thêm chủ đề'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
