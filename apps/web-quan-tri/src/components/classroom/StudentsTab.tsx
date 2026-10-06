import { MESSAGES, focusFirstInvalid, formatDateTime, splitApiError, validateFullName } from '@dsvhvn/dung-chung';
import { errorMessage, type ApiResult, type ClassRoom, type ClassStudent, type LoginSheet, type StudentStatusFilter } from '@dsvhvn/dung-chung/api';
import {
  Badge,
  Blank,
  Button,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Icon,
  InlineMessage,
  LoadingState,
  Pagination,
  SearchForm,
  SelectField,
  Table,
  Td,
  TextField,
  TextLink,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { PATHS } from '../../access/screens';
import { studentsApi, type StudentListQuery } from '../../lib/api/classroomEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, slugMap, useListParams } from '../../lib/listParams';
import { AddStudentsDialog, type AddMode, type StudentsAdded } from './AddStudentsDialog';

// Tab Học sinh của Chi tiết lớp: bảng mã học sinh, họ tên, trạng thái (Hoạt động / Đã vô hiệu), lần đăng nhập gần nhất, đã
// đổi mật khẩu lần đầu chưa. "Thêm học sinh" và "Nhập danh sách" mở hộp thoại Thêm học sinh; sửa họ tên tại chỗ; vô hiệu /
// mở lại và xóa mềm qua hộp xác nhận chung; chọn một hoặc nhiều em đang hoạt động rồi "Đặt lại mật khẩu" (hộp xác nhận chung,
// sau đó hiện Phiếu đăng nhập mới). Mã học sinh và lớp không sửa được; học sinh không chuyển sang lớp khác.

const STATUS_SLUG = slugMap<Exclude<StudentStatusFilter, 'all'>>({ active: 'hoat-dong', inactive: 'da-vo-hieu' });

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'hoat-dong', label: 'Hoạt động' },
  { value: 'da-vo-hieu', label: 'Đã vô hiệu' },
];

type ActionKind = 'deactivate' | 'reactivate' | 'delete' | 'reset';

interface PendingAction {
  kind: ActionKind;
  students: ClassStudent[];
}

const ACTION_TEXT: Record<ActionKind, { title: string; verb: string; confirm: string; note?: string }> = {
  deactivate: {
    title: 'Vô hiệu học sinh',
    verb: 'vô hiệu tài khoản học sinh',
    confirm: 'Vô hiệu',
    note: 'Em không đăng nhập được nữa, dữ liệu học tập được giữ nguyên. Thầy cô có thể mở lại bất cứ lúc nào.',
  },
  reactivate: {
    title: 'Mở lại học sinh',
    verb: 'mở lại tài khoản học sinh',
    confirm: 'Mở lại',
    note: 'Em đăng nhập lại được bằng mật khẩu đang dùng.',
  },
  delete: {
    title: 'Xóa học sinh',
    verb: 'xóa học sinh',
    confirm: 'Xóa',
    note: 'Xóa mềm học sinh cùng tài khoản; không mở lại được và mã học sinh không được cấp lại cho em khác.',
  },
  reset: {
    title: 'Đặt lại mật khẩu',
    verb: 'đặt lại mật khẩu cho',
    confirm: 'Đặt lại mật khẩu',
    note: 'Mật khẩu hiện tại của các em không dùng được nữa; các em đăng nhập bằng mật khẩu tạm mới trên phiếu và phải đổi mật khẩu.',
  },
};

function RenameCell({ student, onSave, onCancel }: { student: ClassStudent; onSave: (name: string) => Promise<void>; onCancel: () => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(student.fullName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Mở ô sửa thì đưa con trỏ vào ô họ tên ngay.
  useEffect(() => formRef.current?.querySelector('input')?.focus(), []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = validateFullName(value);
    setError(problem);
    if (problem) return focusFirstInvalid(formRef.current);
    setSaving(true);
    try {
      await onSave(value.trim());
    } catch (err) {
      setError(splitApiError<'fullName'>(err, ['fullName']).fields.fullName ?? errorMessage(err));
      focusFirstInvalid(formRef.current);
      setSaving(false);
    }
  };

  return (
    <form ref={formRef} noValidate onSubmit={(e) => void submit(e)} className="flex items-start gap-1">
      <TextField
        label={`Họ và tên của ${student.studentCode}`}
        name="fullName"
        autoComplete="off"
        value={value}
        error={error}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel();
        }}
        containerClassName="min-w-48 flex-1"
      />
      <Button type="submit" variant="ghost" size="icon" className="mt-7" loading={saving} aria-label="Lưu họ tên">
        <Icon name="check" size={18} />
      </Button>
      <Button variant="ghost" size="icon" className="mt-7" disabled={saving} aria-label="Hủy sửa họ tên" onClick={onCancel}>
        <Icon name="x" size={18} />
      </Button>
    </form>
  );
}

interface StudentsTabProps {
  classRoom: ClassRoom;
  /** Có phiếu đăng nhập mới (sau khi thêm hoặc đặt lại mật khẩu): màn hình cha mở hộp thoại Phiếu đăng nhập. */
  onSlips: (slips: { sheet: LoginSheet; summary: string }) => void;
}

export function StudentsTab({ classRoom, onSlips }: StudentsTabProps) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const keyword = params.get('tu-khoa') ?? '';
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  const query: StudentListQuery = { keyword, status: status === '' ? 'all' : status, page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.classStudents(classRoom.id, query),
    queryFn: () => studentsApi.list(classRoom.id, query).then((r) => r.data),
    placeholderData: keepPreviousData,
    // Em đăng nhập, đổi mật khẩu trong lúc thầy cô đang mở bảng: quay lại cửa sổ này thì tải lại để thấy trạng thái mới.
    refetchOnWindowFocus: true,
  });

  const [selected, setSelected] = useState<ReadonlyMap<number, ClassStudent>>(new Map());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [adding, setAdding] = useState<AddMode | null>(null);
  const [action, setAction] = useState<PendingAction | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.classes });
  const items = useMemo(() => list.data?.items ?? [], [list.data]);
  const selectable = items.filter((s) => s.isActive);
  const allSelected = selectable.length > 0 && selectable.every((s) => selected.has(s.id));
  const activeCount = list.data?.activeCount ?? classRoom.activeStudentCount;
  const maxStudents = list.data?.maxStudents ?? classRoom.maxStudents;
  const full = activeCount >= maxStudents;

  const toggle = (student: ClassStudent, on: boolean) =>
    setSelected((current) => {
      const next = new Map(current);
      if (on) next.set(student.id, student);
      else next.delete(student.id);
      return next;
    });
  const toggleAll = (on: boolean) =>
    setSelected((current) => {
      const next = new Map(current);
      for (const s of selectable) {
        if (on) next.set(s.id, s);
        else next.delete(s.id);
      }
      return next;
    });

  const rename = async (student: ClassStudent, name: string) => {
    const { message } = await studentsApi.rename(classRoom.id, student.id, name);
    setEditingId(null);
    toast.success(message ?? MESSAGES.success('Lưu học sinh'));
    void refresh();
  };

  const run = async (pending: PendingAction): Promise<ApiResult<unknown>> => {
    const [first] = pending.students;
    if (!first) throw new Error('Chưa chọn học sinh.');
    switch (pending.kind) {
      case 'deactivate':
        return studentsApi.deactivate(classRoom.id, first.id);
      case 'reactivate':
        return studentsApi.reactivate(classRoom.id, first.id);
      case 'delete':
        return studentsApi.remove(classRoom.id, first.id);
      case 'reset':
        return studentsApi.resetPasswords(
          classRoom.id,
          pending.students.map((s) => s.id),
        );
    }
  };

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const result = await run(action);
      if (action.kind === 'reset') {
        const count = action.students.length;
        onSlips({ sheet: result.data as LoginSheet, summary: `${count} học sinh vừa được đặt lại mật khẩu` });
        setSelected(new Map());
      } else if (action.kind === 'delete' || action.kind === 'deactivate') {
        setSelected((current) => {
          const next = new Map(current);
          for (const s of action.students) next.delete(s.id);
          return next;
        });
      }
      if (result.message) toast.success(result.message);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      setAction(null);
      void refresh();
    }
  };

  const added = ({ sheet, addedCount, message }: StudentsAdded) => {
    setAdding(null);
    if (message) toast.success(message);
    onSlips({ sheet, summary: `${addedCount} học sinh vừa được tạo tài khoản` });
    void refresh();
  };

  const text = action ? ACTION_TEXT[action.kind] : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end dsvmd:justify-between">
        <p className="type-body-m text-on-surface-variant">
          <strong className="type-mono-label text-on-surface">{`${activeCount} / ${maxStudents}`}</strong> học sinh đang hoạt động.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setAdding('nhap-danh-sach')} disabled={full}>
            <Icon name="upload" size={16} />
            Nhập danh sách
          </Button>
          <Button onClick={() => setAdding('tung-em')} disabled={full}>
            <Icon name="plus" size={16} />
            Thêm học sinh
          </Button>
        </div>
      </div>
      {full && <InlineMessage tone="warning">Lớp đã đủ {maxStudents} học sinh đang hoạt động. Vô hiệu hoặc xóa em không còn học để thêm học sinh mới.</InlineMessage>}

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SearchForm
          key={keyword}
          label="Tìm học sinh"
          placeholder="Họ tên hoặc mã học sinh"
          value={keyword}
          onSearch={(value) => update({ 'tu-khoa': value })}
        />
        <SelectField
          label="Trạng thái"
          name="trang-thai"
          value={STATUS_SLUG.toSlug(status)}
          options={STATUS_OPTIONS}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
          containerClassName="dsvmd:w-60"
        />
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md bg-primary-container px-4 py-2 text-on-primary-container">
          <span className="type-body-m">{selected.size} học sinh đã chọn</span>
          <Button size="sm" variant="secondary" onClick={() => setAction({ kind: 'reset', students: [...selected.values()] })}>
            <Icon name="key" size={16} />
            Đặt lại mật khẩu
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Map())}>
            Bỏ chọn
          </Button>
        </div>
      )}

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        keyword || status ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={() => update({ 'tu-khoa': null, 'trang-thai': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="users" title="Lớp chưa có học sinh nào.">
            Thêm từng em hoặc nhập danh sách; hệ thống tạo mã học sinh và mật khẩu tạm cho từng em để thầy cô in phiếu đăng nhập.
          </EmptyState>
        )
      ) : (
        <div>
          <Table caption="Học sinh của lớp" busy={list.isFetching}>
            <thead>
              <tr>
                <Th className="w-12">
                  <input
                    type="checkbox"
                    className="size-5 accent-primary"
                    aria-label="Chọn tất cả học sinh đang hoạt động trên trang này"
                    checked={allSelected}
                    disabled={selectable.length === 0}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </Th>
                <Th>Mã học sinh</Th>
                <Th>Họ tên</Th>
                <Th>Trạng thái</Th>
                <Th>Đăng nhập gần nhất</Th>
                <Th>Đã đổi mật khẩu lần đầu</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((student) => (
                <Tr key={student.id} className={selected.has(student.id) ? 'bg-primary-container/40' : undefined}>
                  <Td>
                    <input
                      type="checkbox"
                      className="size-5 accent-primary"
                      aria-label={`Chọn ${student.fullName}`}
                      checked={selected.has(student.id)}
                      disabled={!student.isActive}
                      onChange={(e) => toggle(student, e.target.checked)}
                    />
                  </Td>
                  <Td className="type-mono-label whitespace-nowrap">{student.studentCode}</Td>
                  <Td className="font-medium">
                    {editingId === student.id ? (
                      <RenameCell student={student} onSave={(name) => rename(student, name)} onCancel={() => setEditingId(null)} />
                    ) : (
                      <TextLink to={PATHS.studentRecord(classRoom.id, student.id)}>{student.fullName}</TextLink>
                    )}
                  </Td>
                  <Td>
                    <Badge tone={student.isActive ? 'success' : 'danger'}>{student.isActive ? 'Hoạt động' : 'Đã vô hiệu'}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {student.lastLoginAt ? (
                      <span className="type-mono-label">{formatDateTime(student.lastLoginAt)}</span>
                    ) : (
                      <span className="text-on-surface-muted">Chưa đăng nhập lần nào</span>
                    )}
                  </Td>
                  <Td>
                    {student.passwordChanged ? <Badge tone="success">Đã đổi</Badge> : student.isActive ? <Badge tone="warning">Chưa đổi</Badge> : <Blank />}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Sửa họ tên ${student.fullName}`} onClick={() => setEditingId(student.id)}>
                        <Icon name="pencil" size={18} />
                      </Button>
                      {student.isActive ? (
                        <Button variant="ghost" size="icon" aria-label={`Vô hiệu ${student.fullName}`} onClick={() => setAction({ kind: 'deactivate', students: [student] })}>
                          <Icon name="eye-off" size={18} />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="icon" aria-label={`Mở lại ${student.fullName}`} onClick={() => setAction({ kind: 'reactivate', students: [student] })}>
                          <Icon name="eye" size={18} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" aria-label={`Xóa ${student.fullName}`} onClick={() => setAction({ kind: 'delete', students: [student] })}>
                        <Icon name="trash" size={18} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="học sinh"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
      <p className="type-body-s text-on-surface-variant">
        Thao tác từng dòng: bút — sửa họ tên tại chỗ; mắt gạch — vô hiệu tài khoản, mắt — mở lại; thùng rác — xóa học sinh (hỏi xác nhận,
        xóa mềm). Chọn một hoặc nhiều em rồi bấm "Đặt lại mật khẩu".
      </p>

      {adding && <AddStudentsDialog classRoom={classRoom} initialMode={adding} onAdded={added} onClose={() => setAdding(null)} />}
      <ConfirmDialog
        open={action !== null}
        title={text?.title ?? ''}
        confirmLabel={text?.confirm ?? ''}
        tone={action?.kind === 'reactivate' || action?.kind === 'reset' ? 'primary' : 'danger'}
        confirming={busy}
        onConfirm={() => void confirm()}
        onClose={() => setAction(null)}
      >
        {action && text && (
          <>
            <p>
              {action.kind === 'reset'
                ? `Bạn có chắc muốn đặt lại mật khẩu cho ${action.students.length} học sinh?`
                : MESSAGES.confirm(text.verb, action.students[0]?.fullName ?? '')}
            </p>
            {text.note && <p className="mt-2 type-body-s">{text.note}</p>}
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
