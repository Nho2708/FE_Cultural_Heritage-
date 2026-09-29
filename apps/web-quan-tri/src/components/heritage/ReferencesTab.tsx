import { useRef, useState, type FormEvent } from 'react';
import {
  errorMessage,
  type HeritageDetail,
  type HeritageReference,
  type ReferenceInput,
  type ReferenceSourceType,
} from '@dsvhvn/dung-chung/api';
import {
  composeReferenceTitle,
  focusFirstInvalid,
  MESSAGES,
  parseReferenceTitle,
  parseVietnameseDate,
  REFERENCE_SOURCE_LABEL,
  splitApiError,
  trimToNull,
  validateReference,
  type ReferenceField,
} from '@dsvhvn/dung-chung';
import {
  Badge,
  Blank,
  Button,
  ConfirmDialog,
  EmptyState,
  Icon,
  InlineMessage,
  SelectField,
  Table,
  Td,
  TextField,
  Th,
  Tr,
  useToast,
} from '@dsvhvn/dung-chung/ui';
import { adminReferencesApi } from '../../lib/api/endpoints';

// Tab Nguồn tham chiếu: bảng nguồn của di sản, sửa ngay trong bảng. Tiêu đề ghép theo mẫu của nhóm "Tên tài liệu — Cơ
// quan hoặc tác giả, truy cập dd/mm/yyyy"; bài lấy từ Cục Di sản văn hóa ghi rõ "Cục Di sản văn hóa". Loại nguồn: văn bản nhà
// nước, website (bắt buộc có đường dẫn), sách. Cần ít nhất một nguồn để xuất bản; nguồn cuối của di sản đang xuất bản không xóa được.

interface ReferencesTabProps {
  heritage: HeritageDetail;
  onChanged: () => void;
}

const SOURCE_OPTIONS = (Object.keys(REFERENCE_SOURCE_LABEL) as ReferenceSourceType[]).map((value) => ({
  value,
  label: REFERENCE_SOURCE_LABEL[value],
}));

interface RowValues {
  name: string;
  agency: string;
  accessedOn: string;
  url: string;
  sourceType: string;
}

const EMPTY_ROW: RowValues = { name: '', agency: '', accessedOn: '', url: '', sourceType: 'GOV_DOC' };

const rowOf = (reference: HeritageReference): RowValues => ({
  ...parseReferenceTitle(reference.title),
  url: reference.url ?? '',
  sourceType: reference.sourceType ?? 'GOV_DOC',
});

type RowError = Partial<Record<ReferenceField | 'accessedOn', string>>;

export function ReferencesTab({ heritage, onChanged }: ReferencesTabProps) {
  const toast = useToast();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [deleting, setDeleting] = useState<HeritageReference | null>(null);

  const remove = async () => {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      const { message } = await adminReferencesApi.remove(target.id);
      toast.success(message ?? MESSAGES.success('Xóa nguồn tham chiếu'));
    } catch (error) {
      toast.error(errorMessage(error));
    }
    onChanged();
  };

  const saved = (created: boolean, message: string | null) => {
    setEditing(null);
    toast.success(message ?? MESSAGES.success(created ? 'Thêm nguồn tham chiếu' : 'Lưu nguồn tham chiếu'));
    onChanged();
  };

  return (
    <section aria-labelledby="tab-nguon-tieu-de" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tab-nguon-tieu-de" className="type-body-m text-on-surface-variant">
          {heritage.references.length} nguồn tham chiếu. Sửa trực tiếp trên bảng; di sản cần ít nhất một nguồn để xuất bản.
        </h2>
        <Button onClick={() => setEditing('new')} disabled={editing === 'new'}>
          <Icon name="plus" size={16} />
          Thêm nguồn
        </Button>
      </div>

      {heritage.readiness.warnings.map((warning) => (
        <InlineMessage key={warning} tone="info">
          {warning}
        </InlineMessage>
      ))}

      {heritage.references.length === 0 && editing !== 'new' ? (
        <EmptyState icon="file-text" title="Di sản chưa có nguồn tham chiếu nào.">
          Nội dung tóm lược lại từ nguồn Cục Di sản văn hóa cần luôn kèm nguồn. Thêm ít nhất một nguồn để xuất bản.
        </EmptyState>
      ) : (
        <Table caption="Nguồn tham chiếu của di sản">
          <thead>
            <tr>
              <Th>Tiêu đề, cơ quan và ngày truy cập</Th>
              <Th>Đường dẫn</Th>
              <Th>Loại nguồn</Th>
              <Th className="text-right">Hành động</Th>
            </tr>
          </thead>
          <tbody>
            {editing === 'new' && (
              <EditRow
                key="new"
                heritageId={heritage.id}
                reference={null}
                onSaved={(message) => saved(true, message)}
                onCancel={() => setEditing(null)}
              />
            )}
            {heritage.references.map((reference) =>
              editing === reference.id ? (
                <EditRow
                  key={reference.id}
                  heritageId={heritage.id}
                  reference={reference}
                  onSaved={(message) => saved(false, message)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <Tr key={reference.id}>
                  <Td className="max-w-[420px] align-top">
                    <span className="type-body-m">{reference.title}</span>
                  </Td>
                  <Td className="max-w-[260px] align-top break-words">
                    {reference.url ? (
                      <a
                        href={reference.url}
                        target="_blank"
                        rel="noreferrer"
                        className="type-mono-label text-link underline-offset-4 hover:underline"
                      >
                        {reference.url.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <Blank />
                    )}
                  </Td>
                  <Td className="align-top">
                    <Badge>{reference.sourceType ? REFERENCE_SOURCE_LABEL[reference.sourceType] : reference.sourceTypeLabel}</Badge>
                  </Td>
                  <Td className="align-top">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Sửa nguồn ${reference.title ?? ''}`}
                        onClick={() => setEditing(reference.id)}
                      >
                        <Icon name="pencil" size={20} />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Xóa nguồn ${reference.title ?? ''}`}
                        onClick={() => setDeleting(reference)}
                      >
                        <Icon name="trash" size={20} />
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ),
            )}
          </tbody>
        </Table>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Xóa nguồn tham chiếu"
        confirmLabel="Xóa nguồn"
        tone="danger"
        onConfirm={() => void remove()}
        onClose={() => setDeleting(null)}
      >
        {deleting && <p>{MESSAGES.confirm('xóa nguồn', deleting.title ?? '')}</p>}
      </ConfirmDialog>
    </section>
  );
}

function EditRow({
  heritageId,
  reference,
  onSaved,
  onCancel,
}: {
  heritageId: number;
  reference: HeritageReference | null;
  onSaved: (message: string | null) => void;
  onCancel: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<RowValues>(() => (reference ? rowOf(reference) : EMPTY_ROW));
  const [errors, setErrors] = useState<RowError>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const set = (field: keyof RowValues, value: string) => setValues((v) => ({ ...v, [field]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const accessedOn = values.accessedOn.trim();
    const title = composeReferenceTitle(values);
    const found: RowError = validateReference({ title, url: values.url, sourceType: values.sourceType });
    if (values.name.trim() === '') found.title = MESSAGES.required('tên tài liệu');
    if (accessedOn !== '' && !parseVietnameseDate(accessedOn)) {
      found.accessedOn = MESSAGES.invalid('Ngày truy cập', 'nhập theo dạng ngày/tháng/năm, ví dụ 26/09/2026');
    }
    setErrors(found);
    if (Object.keys(found).length > 0) return focusFirstInvalid(formRef.current);

    setSaving(true);
    try {
      const body: ReferenceInput = {
        title,
        url: trimToNull(values.url),
        sourceType: values.sourceType as ReferenceSourceType,
      };
      const { message } = reference
        ? await adminReferencesApi.update(reference.id, body)
        : await adminReferencesApi.create(heritageId, body);
      onSaved(message);
    } catch (err) {
      const failure = splitApiError<ReferenceField>(err, ['title', 'url', 'sourceType']);
      setErrors(failure.fields);
      setFormError(failure.form);
      focusFirstInvalid(formRef.current);
    } finally {
      setSaving(false);
    }
  };

  return (
    <tr className="bg-surface-container-low">
      <td colSpan={4} className="border-b border-(--dsv-table-border) p-4">
        <form
          ref={formRef}
          noValidate
          onSubmit={submit}
          aria-label={reference ? 'Sửa nguồn tham chiếu' : 'Thêm nguồn tham chiếu'}
          className="flex flex-col gap-4"
        >
          {formError && <InlineMessage tone="danger">{formError}</InlineMessage>}
          <div className="grid gap-4 dsvlg:grid-cols-[2fr_1fr_1fr]">
            <TextField
              label="Tên tài liệu"
              name="name"
              autoComplete="off"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
              error={errors.title}
            />
            <TextField
              label="Cơ quan hoặc tác giả"
              name="agency"
              autoComplete="off"
              value={values.agency}
              onChange={(e) => set('agency', e.target.value)}
              hint="Bài của Cục Di sản văn hóa ghi rõ tên cơ quan."
            />
            <TextField
              label="Ngày truy cập"
              name="accessedOn"
              inputMode="numeric"
              placeholder="26/09/2026"
              value={values.accessedOn}
              onChange={(e) => set('accessedOn', e.target.value)}
              error={errors.accessedOn}
            />
          </div>
          <div className="grid gap-4 dsvlg:grid-cols-[2fr_1fr]">
            <TextField
              label="Đường dẫn"
              name="url"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              value={values.url}
              onChange={(e) => set('url', e.target.value)}
              error={errors.url}
              hint="Bắt buộc với nguồn website."
            />
            <SelectField
              label="Loại nguồn"
              name="sourceType"
              value={values.sourceType}
              options={SOURCE_OPTIONS}
              onChange={(e) => set('sourceType', e.target.value)}
              error={errors.sourceType}
            />
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onCancel} disabled={saving}>
              <Icon name="x" size={16} />
              Hủy
            </Button>
            <Button type="submit" loading={saving}>
              <Icon name="check" size={16} />
              Lưu nguồn
            </Button>
          </div>
        </form>
      </td>
    </tr>
  );
}
