import type { SchoolLevel } from '@dsvhvn/dung-chung/api';
import { Badge, SelectField, TextField } from '@dsvhvn/dung-chung/ui';
import { GRADE_OPTIONS, type ClassField, type ClassValues } from './classForm';

export function LevelBadge({ level }: { level: SchoolLevel }) {
  return <Badge tone="neutral">{`Cấp ${level}`}</Badge>;
}

/** Ba ô của biểu mẫu lớp. */
export function ClassFields({
  values,
  errors,
  onChange,
}: {
  values: ClassValues;
  errors: Partial<Record<ClassField, string>>;
  onChange: (field: ClassField, value: string) => void;
}) {
  return (
    <>
      <TextField
        label="Tên lớp"
        name="name"
        autoComplete="off"
        value={values.name}
        onChange={(e) => onChange('name', e.target.value)}
        error={errors.name}
        hint="Ví dụ: 7A1"
      />
      <SelectField
        label="Khối"
        name="grade"
        value={values.grade}
        options={GRADE_OPTIONS}
        onChange={(e) => onChange('grade', e.target.value)}
        error={errors.grade}
      />
      <TextField
        label="Năm học"
        name="schoolYear"
        autoComplete="off"
        inputMode="numeric"
        value={values.schoolYear}
        onChange={(e) => onChange('schoolYear', e.target.value)}
        error={errors.schoolYear}
        hint="Dạng 2026-2027"
      />
    </>
  );
}
