import { MESSAGES, focusFirstInvalid, splitApiError } from '@dsvhvn/dung-chung';
import { errorMessage, type ClassRoom } from '@dsvhvn/dung-chung/api';
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
  TextLink,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { PATHS } from '../../access/screens';
import { ClassFields, LevelBadge } from '../../components/classroom/ClassFields';
import { ClassFormDialog } from '../../components/classroom/ClassFormDialog';
import {
  GRADE_FILTER_OPTIONS,
  LEVEL_RULE_NOTE,
  classBody,
  emptyClassValues,
  validateClass,
  type ClassField,
  type ClassValues,
} from '../../components/classroom/classForm';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { classesApi, type ClassListQuery } from '../../lib/api/classroomEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { PAGE_SIZE, useListParams } from '../../lib/listParams';

// Lớp học — giáo viên. Danh sách lớp của giáo viên (tên lớp, khối kèm cấp học, năm học, sĩ số, số bài học, số em chưa
// đăng nhập lần nào); khối "Tạo lớp" ngay trên trang (tên lớp, khối 1-12, năm học); sửa và xóa mềm ở từng dòng. Bấm tên lớp
// mở Chi tiết lớp. Xóa lớp vô hiệu mọi học sinh đang hoạt động của lớp; lớp còn bài kiểm tra đang mở thì máy chủ không cho xóa.

const GRADE_FILTER = new Map(GRADE_FILTER_OPTIONS.map((o) => [o.value, o.label]));

function CreateClassCard({ onCreated }: { onCreated: (message: string | null) => void }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<ClassValues>(emptyClassValues);
  const [errors, setErrors] = useState<Partial<Record<ClassField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found = validateClass(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { message } = await classesApi.create(classBody(values));
      setValues((v) => ({ ...v, name: '' }));
      onCreated(message);
    } catch (err) {
      const failure = splitApiError<ClassField>(err, ['name', 'grade', 'schoolYear']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section aria-labelledby="tao-lop" className="rounded-md border border-border bg-surface p-5 dsvmd:p-6">
      <h2 id="tao-lop" className="type-h3 text-on-surface">
        Tạo lớp
      </h2>
      <form ref={formRef} noValidate onSubmit={submit} className="mt-4 flex flex-col gap-4">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
        <div className="grid gap-4 dsvmd:grid-cols-[1fr_1.4fr_1fr_auto] dsvmd:items-start">
          <ClassFields values={values} errors={errors} onChange={(field, value) => setValues((v) => ({ ...v, [field]: value }))} />
          <div className="dsvmd:pt-7">
            <Button type="submit" loading={saving} className="h-11 w-full dsvmd:w-auto">
              <Icon name="plus" size={16} />
              Tạo lớp
            </Button>
          </div>
        </div>
        <p className="type-body-s text-on-surface-variant">{LEVEL_RULE_NOTE}</p>
      </form>
    </section>
  );
}

export default function ClassesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update, page } = useListParams();
  const keyword = params.get('tu-khoa') ?? '';
  const gradeParam = params.get('khoi') ?? '';
  const grade = GRADE_FILTER.has(gradeParam) ? gradeParam : '';
  const query: ClassListQuery = { keyword, grade: grade === '' ? '' : Number(grade), page, pageSize: PAGE_SIZE };

  const list = useQuery({
    queryKey: queryKeys.classList(query),
    queryFn: () => classesApi.list(query).then((r) => r.data),
    placeholderData: keepPreviousData,
  });
  const [editing, setEditing] = useState<ClassRoom | null>(null);
  const [deleting, setDeleting] = useState<ClassRoom | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.classes });

  const remove = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      const { message } = await classesApi.remove(deleting.id);
      toast.success(message ?? MESSAGES.success('Xóa lớp'));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setDeleteBusy(false);
      setDeleting(null);
      void refresh();
    }
  };

  const items = list.data?.items ?? [];
  const summary =
    list.data &&
    (list.data.totalPages <= 1
      ? `Thầy cô có ${list.data.totalItems} lớp · ${items.reduce((sum, c) => sum + c.activeStudentCount, 0)} học sinh đang hoạt động.`
      : `Thầy cô có ${list.data.totalItems} lớp.`);

  return (
    <AreaPage>
      <PageHeader title="Lớp học" description={summary} />

      <CreateClassCard
        onCreated={(message) => {
          toast.success(message ?? MESSAGES.success('Tạo lớp'));
          void refresh();
        }}
      />

      <div className="flex flex-col gap-3 dsvmd:flex-row dsvmd:items-end">
        <SearchForm
          key={keyword}
          label="Tìm lớp"
          placeholder="Tên lớp"
          value={keyword}
          onSearch={(value) => update({ 'tu-khoa': value })}
        />
        <SelectField
          label="Lọc theo khối"
          name="khoi"
          value={grade}
          options={GRADE_FILTER_OPTIONS}
          onChange={(e) => update({ khoi: e.target.value })}
          containerClassName="dsvmd:w-72"
        />
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        keyword || grade ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={() => update({ 'tu-khoa': null, khoi: null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="users" title="Thầy cô chưa có lớp nào.">
            Tạo lớp ở khối phía trên, rồi thêm học sinh vào lớp để các em có tài khoản đăng nhập.
          </EmptyState>
        )
      ) : (
        <div>
          <Table caption="Lớp học" busy={list.isFetching}>
            <thead>
              <tr>
                <Th>Tên lớp</Th>
                <Th>Khối</Th>
                <Th>Năm học</Th>
                <Th>Sĩ số</Th>
                <Th>Số bài học</Th>
                <Th>Chưa đăng nhập lần nào</Th>
                <Th className="text-right">Hành động</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((classRoom) => (
                <Tr key={classRoom.id}>
                  <Td className="font-medium">
                    <TextLink to={PATHS.classRoom(classRoom.id)}>{classRoom.name}</TextLink>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                      Khối {classRoom.grade}
                      <LevelBadge level={classRoom.schoolLevel} />
                    </span>
                  </Td>
                  <Td className="type-mono-label whitespace-nowrap">{classRoom.schoolYear}</Td>
                  <Td className="type-mono-label">{classRoom.activeStudentCount}</Td>
                  <Td className="type-mono-label">{classRoom.lessonCount}</Td>
                  <Td>
                    {classRoom.neverLoggedInCount > 0 ? (
                      <Badge tone="warning">{`${classRoom.neverLoggedInCount} em`}</Badge>
                    ) : classRoom.activeStudentCount > 0 ? (
                      <Badge tone="neutral">0 em</Badge>
                    ) : (
                      <Blank />
                    )}
                  </Td>
                  <Td>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Sửa lớp ${classRoom.name}`}
                        onClick={() => setEditing(classRoom)}
                      >
                        <Icon name="pencil" size={18} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Xóa lớp ${classRoom.name}`}
                        onClick={() => setDeleting(classRoom)}
                      >
                        <Icon name="trash" size={18} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <Pagination
            label="lớp"
            page={list.data.page}
            pageSize={list.data.pageSize}
            totalItems={list.data.totalItems}
            totalPages={list.data.totalPages}
            onChange={(next) => update({ trang: next })}
          />
        </div>
      )}
      <p className="type-body-s text-on-surface-variant">
        Bấm tên lớp để mở Chi tiết lớp. Xóa lớp là xóa mềm; lớp còn bài kiểm tra đang mở thì không xóa được.
      </p>

      {editing && (
        <ClassFormDialog
          key={editing.id}
          classRoom={editing}
          onSaved={(_, message) => {
            setEditing(null);
            toast.success(message ?? MESSAGES.success('Lưu lớp'));
            void refresh();
          }}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="Xóa lớp"
        confirmLabel="Xóa"
        tone="danger"
        confirming={deleteBusy}
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      >
        {deleting && (
          <>
            <p>{MESSAGES.confirm('xóa lớp', deleting.name)}</p>
            <p className="mt-2 type-body-s">
              {deleting.activeStudentCount > 0
                ? `${deleting.activeStudentCount} học sinh đang hoạt động của lớp bị vô hiệu và không đăng nhập được nữa. `
                : ''}
              Xóa lớp là xóa mềm.
            </p>
          </>
        )}
      </ConfirmDialog>
    </AreaPage>
  );
}
