import { cn, focusFirstInvalid, splitApiError } from '@dsvhvn/dung-chung';
import { HERITAGE_TYPE_LABEL } from '@dsvhvn/dung-chung';
import type { ClassRoom, HeritageCard, HeritageType, LessonDetail } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon, InlineMessage, LoadingState, Modal, Pagination, SelectField, TextField } from '@dsvhvn/dung-chung/ui';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { lessonsApi, publishedHeritagesApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { LevelBadge } from '../classroom/ClassFields';

// Tạo bài học (hộp thoại hai bước): chọn lớp, rồi chọn 1-10 di sản đã xuất bản và đặt tiêu đề. Bài học dành riêng cho một
// lớp; cấp của bài là cấp của lớp nên không có ô chọn cấp. Mở từ Chi tiết lớp thì lớp được chọn sẵn và khóa (bỏ bước 1).
// Tạo xong chuyển sang màn hình Soạn bài học. Trường hết gói thì máy chủ từ chối (422) và câu đó hiện ngay trong hộp thoại.

const MAX_HERITAGES = 10;
const PAGE_SIZE = 12;

interface CreateLessonDialogProps {
  /** Lớp chọn sẵn và khóa (mở từ Chi tiết lớp). */
  fixedClass?: ClassRoom;
  /** Di sản chọn sẵn (tạo bài ôn tập từ gợi ý cho lớp); giáo viên vẫn bỏ hoặc thêm được. */
  initialHeritages?: HeritageCard[];
  /** Tiêu đề điền sẵn (ví dụ "Ôn tập: …"). */
  initialTitle?: string;
  onCreated: (lesson: LessonDetail, message: string | null) => void;
  onClose: () => void;
}

type Step = 'class' | 'heritage';

function Steps({ step, fixed }: { step: Step; fixed: boolean }) {
  const items: Array<{ id: Step; label: string }> = [
    { id: 'class', label: 'Chọn lớp' },
    { id: 'heritage', label: 'Chọn di sản' },
  ];
  return (
    <ol className="mb-5 flex items-center gap-3 type-body-s" aria-label="Các bước">
      {items.map((item, index) => {
        const done = item.id === 'class' && (step === 'heritage' || fixed);
        const current = item.id === step;
        return (
          <li key={item.id} className="flex items-center gap-3" aria-current={current ? 'step' : undefined}>
            {index > 0 && <span aria-hidden="true" className="h-px w-10 bg-border-strong" />}
            <span
              className={cn(
                'flex size-7 items-center justify-center rounded-full type-label',
                done ? 'bg-success text-on-success' : current ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant',
              )}
            >
              {done ? <Icon name="check" size={14} /> : index + 1}
            </span>
            <span className={current ? 'type-label text-on-surface' : 'text-on-surface-variant'}>{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function ClassStep({ classes, value, onChange }: { classes: ClassRoom[]; value: number | null; onChange: (id: number) => void }) {
  return (
    <fieldset>
      <legend className="type-h4 text-on-surface">Bước 1 · Chọn lớp</legend>
      <ul className="mt-3 grid gap-3 dsvsm:grid-cols-2 dsvmd:grid-cols-3">
        {classes.map((classRoom) => (
          <li key={classRoom.id}>
            <label
              htmlFor={`lop-${classRoom.id}`}
              className={cn(
                'flex h-full cursor-pointer items-start gap-3 rounded-md border p-4',
                value === classRoom.id ? 'border-primary bg-primary-container/40' : 'border-border bg-surface hover:bg-surface-container-low',
              )}
            >
              <input
                id={`lop-${classRoom.id}`}
                type="radio"
                name="lop"
                className="mt-1"
                checked={value === classRoom.id}
                onChange={() => onChange(classRoom.id)}
                aria-label={`Lớp ${classRoom.name}`}
              />
              <span className="min-w-0">
                <span className="block type-label text-on-surface">Lớp {classRoom.name}</span>
                <span className="mt-1 block type-body-s text-on-surface-variant">
                  Khối {classRoom.grade} · Cấp {classRoom.schoolLevel} · {classRoom.activeStudentCount} học sinh
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-4 type-body-s text-on-surface-variant">Giao diện bài học của học sinh sẽ theo cấp của lớp đã chọn.</p>
    </fieldset>
  );
}

function HeritageGrid({
  selected,
  onToggle,
}: {
  selected: Map<number, HeritageCard>;
  onToggle: (card: HeritageCard) => void;
}) {
  const [keyword, setKeyword] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const trimmed = keyword.trim();
  const filter = {
    keyword: trimmed.length >= 2 ? trimmed : undefined,
    provinceId: provinceId === '' ? undefined : Number(provinceId),
    heritageType: (type || undefined) as HeritageType | undefined,
  };

  const catalog = useQuery({
    queryKey: queryKeys.discoveryFilters,
    queryFn: ({ signal }) => publishedHeritagesApi.filters({ signal }),
    staleTime: 60 * 60_000,
  });
  const list = useQuery({
    queryKey: queryKeys.publishedHeritages({ ...filter, page }),
    queryFn: ({ signal }) => publishedHeritagesApi.search(filter, { page, pageSize: PAGE_SIZE }, { signal }),
    placeholderData: keepPreviousData,
  });

  const reset = (apply: () => void) => {
    apply();
    setPage(1);
  };
  const items = list.data?.items ?? [];

  return (
    <div>
      <h3 className="type-h4 text-on-surface">Chọn di sản cho bài học</h3>
      <div className="mt-3 grid gap-3 dsvmd:grid-cols-[1.4fr_1fr_1fr]">
        <TextField
          label="Tìm di sản theo tên"
          type="search"
          value={keyword}
          onChange={(e) => reset(() => setKeyword(e.target.value))}
          placeholder="Nhập ít nhất 2 ký tự"
        />
        <SelectField
          label="Tỉnh"
          value={provinceId}
          onChange={(e) => reset(() => setProvinceId(e.target.value))}
          options={[
            { value: '', label: 'Tất cả tỉnh' },
            ...(catalog.data?.provinces ?? []).map((p) => ({ value: String(p.id), label: p.name ?? '' })),
          ]}
        />
        <SelectField
          label="Loại"
          value={type}
          onChange={(e) => reset(() => setType(e.target.value))}
          options={[
            { value: '', label: 'Tất cả loại' },
            ...(Object.entries(HERITAGE_TYPE_LABEL) as Array<[HeritageType, string]>).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      <div className="mt-4">
        {list.isPending ? (
          <LoadingState rows={2} />
        ) : list.isError ? (
          <ErrorState error={list.error} onRetry={() => void list.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState icon="search" title="Không tìm thấy di sản đã xuất bản phù hợp." />
        ) : (
          <>
            <p className="mb-3 type-body-s text-on-surface-variant">
              Hiển thị {items.length} trên {list.data.totalItems} di sản đã xuất bản · chọn được nhiều di sản
            </p>
            <ul className="grid gap-3 dsvsm:grid-cols-2 dsvmd:grid-cols-3">
              {items.map((card) => {
                const checked = selected.has(card.id);
                return (
                  <li key={card.id}>
                    <label
                      htmlFor={`di-san-${card.id}`}
                      className={cn(
                        'flex h-full cursor-pointer flex-col overflow-hidden rounded-md border',
                        checked ? 'border-2 border-primary' : 'border-border hover:bg-surface-container-low',
                      )}
                    >
                      {card.thumbnailUrl ? (
                        <img src={card.thumbnailUrl} alt="" loading="lazy" className="h-28 w-full object-cover" />
                      ) : (
                        <span className="flex h-28 w-full items-center justify-center bg-image-placeholder text-on-surface-variant">
                          <Icon name="book-open" size={28} />
                        </span>
                      )}
                      <span className="flex flex-1 flex-col gap-1 p-3">
                        <span className="flex items-start gap-2">
                          <input id={`di-san-${card.id}`} type="checkbox" checked={checked} onChange={() => onToggle(card)} className="mt-1" aria-label={card.name} />
                          <span className="type-label text-on-surface">{card.name}</span>
                        </span>
                        <span className="type-body-s text-on-surface-variant">
                          {[card.provinceName, card.heritageType ? HERITAGE_TYPE_LABEL[card.heritageType] : null].filter(Boolean).join(' · ')}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <Pagination
              label="di sản"
              page={list.data.page}
              pageSize={list.data.pageSize}
              totalItems={list.data.totalItems}
              totalPages={list.data.totalPages}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function CreateLessonDialog({ fixedClass, initialHeritages, initialTitle, onCreated, onClose }: CreateLessonDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [step, setStep] = useState<Step>(fixedClass ? 'heritage' : 'class');
  const [classId, setClassId] = useState<number | null>(fixedClass?.id ?? null);
  const [selected, setSelected] = useState<Map<number, HeritageCard>>(
    () => new Map((initialHeritages ?? []).slice(0, MAX_HERITAGES).map((card) => [card.id, card])),
  );
  const [title, setTitle] = useState(initialTitle ?? '');
  const [titleTouched, setTitleTouched] = useState(initialTitle !== undefined);
  const [errors, setErrors] = useState<{ title?: string; heritageIds?: string; classId?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const classes = useQuery({
    queryKey: queryKeys.classList({ page: 1, pageSize: 100 }),
    queryFn: () => classesApi.list({ page: 1, pageSize: 100 }).then((r) => r.data),
    enabled: !fixedClass,
  });

  const chosenClass = fixedClass ?? classes.data?.items.find((c) => c.id === classId) ?? null;

  const toggle = (card: HeritageCard) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(card.id)) next.delete(card.id);
      else if (next.size < MAX_HERITAGES) next.set(card.id, card);
      // Tiêu đề gợi ý theo di sản đầu tiên cho tới khi giáo viên tự gõ.
      if (!titleTouched) setTitle([...next.values()][0]?.name ?? '');
      return next;
    });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const found: typeof errors = {};
    if (title.trim() === '') found.title = 'Vui lòng nhập tiêu đề bài học.';
    else if (title.trim().length > 255) found.title = 'Tiêu đề bài học không hợp lệ: tối đa 255 ký tự.';
    if (selected.size === 0) found.heritageIds = 'Vui lòng chọn ít nhất một di sản.';
    setErrors(found);
    if (Object.keys(found).length > 0 || classId === null) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const { data, message } = await lessonsApi.create({ classId, title: title.trim(), heritageIds: [...selected.keys()] });
      onCreated(data, message);
    } catch (err) {
      const failure = splitApiError<'title' | 'heritageIds' | 'classId'>(err, ['title', 'heritageIds', 'classId']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  const noClasses = !fixedClass && classes.isSuccess && classes.data.items.length === 0;

  return (
    <Modal
      open
      title="Tạo bài học"
      description="Bài học dành riêng cho một lớp; học sinh lớp đó mở bài bằng mã bài học sau khi xuất bản."
      size="wide"
      busy={saving}
      onClose={onClose}
    >
      <Steps step={step} fixed={Boolean(fixedClass)} />
      <form ref={formRef} noValidate onSubmit={submit} className="flex flex-col gap-5">
        {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}

        {step === 'class' && (
          <>
            {classes.isPending ? (
              <LoadingState rows={2} />
            ) : classes.isError ? (
              <ErrorState error={classes.error} onRetry={() => void classes.refetch()} />
            ) : noClasses ? (
              <EmptyState icon="users" title="Thầy cô chưa có lớp nào.">
                Hãy tạo lớp ở màn hình Lớp học trước, rồi quay lại tạo bài học.
              </EmptyState>
            ) : (
              <ClassStep classes={classes.data.items} value={classId} onChange={setClassId} />
            )}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={onClose}>
                Hủy
              </Button>
              <Button disabled={classId === null} onClick={() => setStep('heritage')}>
                Tiếp tục
              </Button>
            </div>
          </>
        )}

        {step === 'heritage' && (
          <>
            {chosenClass && (
              <div className="flex items-center gap-3 rounded-md bg-surface-container-low px-4 py-3">
                {fixedClass && <Icon name="lock" size={18} className="text-on-surface-variant" />}
                <div className="min-w-0 flex-1">
                  <p className="type-label text-on-surface">
                    Lớp {chosenClass.name} · Khối {chosenClass.grade}
                  </p>
                  {fixedClass && <p className="type-body-s text-on-surface-variant">Mở từ Chi tiết lớp nên lớp được chọn sẵn và khóa.</p>}
                </div>
                <LevelBadge level={chosenClass.schoolLevel} />
              </div>
            )}
            <TextField
              label="Tiêu đề bài học"
              name="title"
              value={title}
              maxLength={255}
              autoComplete="off"
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
              error={errors.title}
              hint="Tối đa 255 ký tự."
            />
            <HeritageGrid selected={selected} onToggle={toggle} />
            {errors.heritageIds && (
              <p role="alert" className="type-body-s text-danger">
                {errors.heritageIds}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
              <p className="min-w-0 flex-1 type-body-s text-on-surface-variant" aria-live="polite">
                <strong className="text-on-surface">{`Đã chọn ${selected.size} di sản`}</strong>
                {selected.size > 0 && ` · ${[...selected.values()].map((c) => c.name).join(', ')}`}
                {selected.size >= MAX_HERITAGES && ' · đã đủ 10 di sản'}
              </p>
              {!fixedClass && (
                <Button variant="secondary" onClick={() => setStep('class')} disabled={saving}>
                  Quay lại
                </Button>
              )}
              {fixedClass && (
                <Button variant="secondary" onClick={onClose} disabled={saving}>
                  Hủy
                </Button>
              )}
              <Button type="submit" loading={saving}>
                Tạo bài học
              </Button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}
