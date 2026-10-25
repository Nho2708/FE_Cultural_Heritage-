import { CLASS_RULES, focusFirstInvalid, splitApiError, validateFullName } from '@dsvhvn/dung-chung';
import type { ClassRoom, LoginSheet } from '@dsvhvn/dung-chung/api';
import { Button, Icon, InlineMessage, Modal, TabPanel, Tabs, TextField } from '@dsvhvn/dung-chung/ui';
import { useRef, useState, type FormEvent } from 'react';
import { studentsApi } from '../../lib/api/classroomEndpoints';
import { ImportPanel } from './ImportPanel';

// Thêm học sinh và tạo tài khoản (hộp thoại) — hai chế độ: thêm từng em (một hoặc vài dòng họ tên) hoặc nhập danh sách từ
// tệp Excel / CSV hoặc dán họ tên. Thêm học sinh là tạo tài khoản: máy chủ sinh mã học sinh và mật khẩu cho từng em
// (lớp cấp 1: mật khẩu 6 chữ số dùng luôn; lớp cấp 2, 3: mật khẩu tạm) rồi trả phiếu đăng nhập, màn hình cha mở hộp thoại
// Phiếu đăng nhập ngay sau đó (mật khẩu chỉ hiện một lần).

export type AddMode = 'tung-em' | 'nhap-danh-sach';

const TABS = [
  { id: 'tung-em', label: 'Thêm từng em' },
  { id: 'nhap-danh-sach', label: 'Nhập danh sách' },
] as const;

const PREFIX = 'them-hoc-sinh';

/** Kết quả đưa lên màn hình cha: phiếu đăng nhập, số em đã thêm và câu thông báo của máy chủ. */
export interface StudentsAdded {
  sheet: LoginSheet;
  addedCount: number;
  message: string | null;
}

interface AddStudentsDialogProps {
  classRoom: ClassRoom;
  initialMode: AddMode;
  onAdded: (added: StudentsAdded) => void;
  onClose: () => void;
}

interface NameRow {
  key: number;
  value: string;
  error?: string;
}

function SingleEntry({ classRoom, onAdded, onCancel }: { classRoom: ClassRoom; onAdded: (added: StudentsAdded) => void; onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const nextKey = useRef(1);
  const [rows, setRows] = useState<NameRow[]>([{ key: 0, value: '' }]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const filled = rows.filter((r) => r.value.trim() !== '');
  const remaining = classRoom.maxStudents - classRoom.activeStudentCount;

  const setValue = (key: number, value: string) =>
    setRows((current) => current.map((r) => (r.key === key ? { key, value } : r)));
  const addRow = () => setRows((current) => [...current, { key: nextKey.current++, value: '' }]);
  const removeRow = (key: number) => setRows((current) => (current.length === 1 ? [{ key: nextKey.current++, value: '' }] : current.filter((r) => r.key !== key)));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (filled.length === 0) {
      setRows((current) => current.map((r, i) => (i === 0 ? { ...r, error: validateFullName(r.value) ?? undefined } : r)));
      return focusFirstInvalid(formRef.current);
    }
    const checked = rows.map((r) => ({ ...r, error: r.value.trim() === '' ? undefined : (validateFullName(r.value) ?? undefined) }));
    setRows(checked);
    if (checked.some((r) => r.error)) return focusFirstInvalid(formRef.current);
    if (filled.length > remaining) {
      setFormError(`Lớp chỉ còn ${Math.max(remaining, 0)} chỗ (tối đa ${classRoom.maxStudents} học sinh đang hoạt động).`);
      return;
    }

    setSaving(true);
    try {
      const names = filled.map((r) => r.value.trim());
      if (names.length === 1) {
        const { data, message } = await studentsApi.add(classRoom.id, names[0] ?? '');
        onAdded({ sheet: data.sheet, addedCount: data.students.length, message });
      } else {
        const { data } = await studentsApi.import(
          classRoom.id,
          names.map((fullName, index) => ({ rowNumber: index + 1, fullName })),
        );
        onAdded({ sheet: data.created.sheet, addedCount: data.addedCount, message: data.message });
      }
    } catch (error) {
      const failure = splitApiError<'fullName'>(error, ['fullName']);
      if (failure.fields.fullName && rows.length === 1) {
        setRows((current) => current.map((r, i) => (i === 0 ? { ...r, error: failure.fields.fullName } : r)));
        focusFirstInvalid(formRef.current);
      } else {
        setFormError(failure.fields.fullName ?? failure.form);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
      {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
      {rows.map((row, index) => (
        <div key={row.key} className="flex items-start gap-2">
          <TextField
            label={index === 0 ? 'Họ và tên' : `Họ và tên (em thứ ${index + 1})`}
            name={`hoTen${index}`}
            autoComplete="off"
            placeholder="Nhập họ và tên"
            value={row.value}
            onChange={(e) => setValue(row.key, e.target.value)}
            error={row.error}
            containerClassName="min-w-0 flex-1"
          />
          {rows.length > 1 && (
            <Button variant="ghost" size="icon" className="mt-7" aria-label={`Bỏ dòng ${index + 1}`} onClick={() => removeRow(row.key)}>
              <Icon name="trash" size={18} />
            </Button>
          )}
        </div>
      ))}
      <div>
        <Button variant="link" onClick={addRow} disabled={rows.length >= CLASS_RULES.maxImportRows}>
          <Icon name="plus" size={16} />
          Thêm dòng
        </Button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-s text-on-surface-variant" aria-live="polite">
          {filled.length} học sinh sẽ được tạo tài khoản
        </p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Hủy
          </Button>
          <Button type="submit" loading={saving}>
            Tạo tài khoản
          </Button>
        </div>
      </div>
    </form>
  );
}

export function AddStudentsDialog({ classRoom, initialMode, onAdded, onClose }: AddStudentsDialogProps) {
  const [mode, setMode] = useState<AddMode>(initialMode);

  return (
    <Modal
      open
      size="panel"
      title={`Thêm học sinh vào lớp ${classRoom.name}`}
      description={`Lớp đang có ${classRoom.activeStudentCount} học sinh, sĩ số tối đa ${classRoom.maxStudents}. Hệ thống tạo tài khoản gồm mã học sinh và ${classRoom.schoolLevel === 1 ? 'mật khẩu 6 chữ số' : 'mật khẩu tạm'} cho từng em.`}
      onClose={onClose}
    >
      <Tabs idPrefix={PREFIX} label="Cách thêm học sinh" items={TABS} value={mode} onChange={setMode} />
      <TabPanel idPrefix={PREFIX} id={mode}>
        {mode === 'tung-em' ? (
          <SingleEntry classRoom={classRoom} onAdded={onAdded} onCancel={onClose} />
        ) : (
          <ImportPanel
            classRoom={classRoom}
            onImported={(result) => onAdded({ sheet: result.created.sheet, addedCount: result.addedCount, message: result.message })}
            onCancel={onClose}
          />
        )}
      </TabPanel>
    </Modal>
  );
}
