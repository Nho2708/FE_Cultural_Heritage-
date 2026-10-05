import { focusFirstInvalid, splitApiError } from '@dsvhvn/dung-chung';
import { ApiError, ERROR_CODES, type ClassRoom } from '@dsvhvn/dung-chung/api';
import { Button, ConfirmDialog, InlineMessage, Modal } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { ClassFields } from './ClassFields';
import {
  LEVEL_RULE_NOTE,
  classBody,
  classValuesOf,
  levelNameOfGrade,
  validateClass,
  type ClassField,
  type ClassValues,
} from './classForm';

// Sửa lớp (hộp thoại): tên lớp, khối, năm học. Sửa khối sang cấp khác thì cảnh báo ngay trong biểu mẫu; khi lớp đã có bài
// học, máy chủ đòi xác nhận (422) và hộp xác nhận chung nhắc lại điều sẽ đổi — giáo viên đồng ý thì lưu lại kèm xác nhận.
// Tên lớp trùng trong cùng năm học báo dưới ô tên lớp. Màn hình cha chỉ dựng hộp thoại khi đang sửa một lớp, nên ô nhập
// luôn khởi tạo từ lớp đó.

interface ClassFormDialogProps {
  classRoom: ClassRoom;
  onSaved: (classRoom: ClassRoom, message: string | null) => void;
  onClose: () => void;
}

export function ClassFormDialog({ classRoom, onSaved, onClose }: ClassFormDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<ClassValues>(() => classValuesOf(classRoom));
  const [errors, setErrors] = useState<Partial<Record<ClassField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState<string | null>(null);

  const levelChanged = values.grade !== '' && levelNameOfGrade(values.grade) !== levelNameOfGrade(classRoom.grade);

  const save = async (confirmLevelChange: boolean) => {
    setSaving(true);
    try {
      const { data, message } = await classesApi.update(classRoom.id, classBody(values, confirmLevelChange));
      setNeedsConfirm(null);
      onSaved(data, message);
    } catch (err) {
      if (err instanceof ApiError && err.code === ERROR_CODES.classLevelChangeNeedsConfirmation) {
        setNeedsConfirm(err.message);
      } else {
        setNeedsConfirm(null);
        const failure = splitApiError<ClassField>(err, ['name', 'grade', 'schoolYear']);
        setErrors(failure.fields);
        setFormError(failure.form);
        focusFirstInvalid(formRef.current);
      }
    } finally {
      setSaving(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateClass(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);
    void save(false);
  };

  return (
    <>
      <Modal open title="Sửa lớp" description={`Lớp ${classRoom.name} · ${LEVEL_RULE_NOTE}`} size="panel" busy={saving} onClose={onClose}>
        <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
          {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
          <ClassFields values={values} errors={errors} onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))} />
          {levelChanged && (
            <InlineMessage tone="warning">
              Bố cục, luồng học, dạng câu hỏi và cách hiện kết quả của cả lớp sẽ đổi theo cấp mới.
            </InlineMessage>
          )}
          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Hủy
            </Button>
            <Button type="submit" loading={saving && needsConfirm === null}>
              Lưu lớp
            </Button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog
        open={needsConfirm !== null}
        title="Đổi cấp học của lớp"
        confirmLabel="Đổi cấp học"
        confirming={saving}
        onConfirm={() => void save(true)}
        onClose={() => setNeedsConfirm(null)}
      >
        {needsConfirm}
      </ConfirmDialog>
    </>
  );
}
