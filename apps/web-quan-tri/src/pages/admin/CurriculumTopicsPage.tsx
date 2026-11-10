import { MESSAGES } from '@dsvhvn/dung-chung';
import { errorMessage, type AdminCurriculumTopic } from '@dsvhvn/dung-chung/api';
import { Badge, Button, ConfirmDialog, EmptyState, ErrorState, Icon, LoadingState, SelectField, Table, Td, Th, TextLink, Tr, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PATHS } from '../../access/screens';
import { CurriculumTopicFormDialog } from '../../components/curriculum/CurriculumTopicFormDialog';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { adminCurriculumApi } from '../../lib/api/curriculumEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { slugMap, useListParams } from '../../lib/listParams';

// Chủ đề chương trình — quản trị hệ thống. Bảng chủ đề của môn học theo Chương trình giáo dục phổ thông 2018 (khối, chủ đề lớn, nội dung, số di sản,
// trạng thái), lọc theo khối và trạng thái. Thêm, sửa, ngừng dùng, dùng lại chủ đề (không xóa cứng); "Di sản" mở trang con quản lý di sản của chủ
// đề. Chủ đề ngừng dùng không hiện cho giáo viên nhưng vẫn giữ liên kết với di sản. Bộ lọc nằm trên URL.

type StatusFilter = 'active' | 'inactive';
const STATUS_SLUG = slugMap<StatusFilter>({ active: 'dang-dung', inactive: 'ngung-dung' });
const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'dang-dung', label: 'Đang dùng' },
  { value: 'ngung-dung', label: 'Đã ngừng dùng' },
];
const GRADE_OPTIONS = [{ value: '', label: 'Tất cả khối' }, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Khối ${i + 1}` }))];

type DialogState = { kind: 'form'; topic?: AdminCurriculumTopic } | null;

export default function CurriculumTopicsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { params, update } = useListParams();
  const grade = params.get('khoi') ?? '';
  const status = STATUS_SLUG.fromSlug(params.get('trang-thai'));
  // Chỉ xin chủ đề đang dùng khi đang lọc "Đang dùng"; còn lại xin cả chủ đề ngừng dùng để quản trị thấy và dùng lại được.
  const query = { grade: grade ? Number(grade) : ('' as const), includeInactive: status !== 'active' };

  const list = useQuery({
    queryKey: queryKeys.adminTopicList(query),
    queryFn: () => adminCurriculumApi.list(query).then((r) => r.data.items),
  });
  const [dialog, setDialog] = useState<DialogState>(null);
  const [stopping, setStopping] = useState<AdminCurriculumTopic | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const all = list.data ?? [];
  const rows = status === 'inactive' ? all.filter((t) => !t.isActive) : all;
  const filtered = Boolean(grade || status);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.adminTopics });
    void queryClient.invalidateQueries({ queryKey: queryKeys.teacherTopics });
    void queryClient.invalidateQueries({ queryKey: queryKeys.heritages });
  };

  const setActive = async (topic: AdminCurriculumTopic, active: boolean) => {
    setBusyId(topic.id);
    try {
      const { message } = active ? await adminCurriculumApi.activate(topic.id) : await adminCurriculumApi.deactivate(topic.id);
      toast.success(message ?? MESSAGES.success(active ? 'Dùng lại chủ đề' : 'Ngừng dùng chủ đề'));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusyId(null);
      setStopping(null);
      refresh();
    }
  };

  const nextOrder = all.reduce((max, t) => Math.max(max, t.sortOrder), 0) + 1;

  return (
    <AreaPage>
      <PageHeader
        title="Chủ đề chương trình"
        description={
          list.data
            ? `${rows.length} chủ đề của môn học theo Chương trình giáo dục phổ thông 2018. Giáo viên chọn chủ đề để tìm di sản khi tạo bài học.`
            : 'Chủ đề của môn học để giáo viên chọn di sản khi tạo bài học.'
        }
        actions={
          <Button onClick={() => setDialog({ kind: 'form' })}>
            <Icon name="plus" size={16} />
            Thêm chủ đề
          </Button>
        }
      />

      <div className="grid gap-3 dsvsm:grid-cols-2 dsvlg:grid-cols-3">
        <SelectField label="Khối" value={grade} options={GRADE_OPTIONS} onChange={(e) => update({ khoi: e.target.value })} />
        <SelectField
          label="Trạng thái"
          value={status ? STATUS_SLUG.toSlug(status) : ''}
          options={STATUS_OPTIONS}
          onChange={(e) => update({ 'trang-thai': e.target.value })}
        />
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : rows.length === 0 ? (
        filtered ? (
          <EmptyState
            icon="search"
            title={MESSAGES.noResults}
            action={
              <Button variant="secondary" onClick={() => update({ khoi: null, 'trang-thai': null })}>
                Bỏ bộ lọc
              </Button>
            }
          />
        ) : (
          <EmptyState icon="list" title="Chưa có chủ đề chương trình nào.">
            Bấm "Thêm chủ đề" để tạo chủ đề đầu tiên.
          </EmptyState>
        )
      ) : (
        <Table caption="Chủ đề chương trình" busy={list.isFetching}>
          <thead>
            <tr>
              <Th>Khối</Th>
              <Th>Chủ đề lớn</Th>
              <Th>Nội dung</Th>
              <Th className="whitespace-normal!">Số di sản</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Hành động</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((topic) => (
              <Tr key={topic.id}>
                <Td className="whitespace-nowrap">
                  Khối {topic.grade}
                  <span className="block type-body-s text-on-surface-variant">{topic.subject}</span>
                </Td>
                <Td className="max-w-[280px]">{topic.groupTitle}</Td>
                <Td className="max-w-[360px]">
                  <span className="font-medium text-on-surface">{topic.title}</span>
                  {topic.localProvince && (
                    <Badge tone="neutral" className="ml-2">
                      Theo tỉnh của trường
                    </Badge>
                  )}
                </Td>
                <Td className="type-mono-label tabular-nums">{topic.heritageCount}</Td>
                <Td>
                  <Badge tone={topic.isActive ? 'success' : 'warning'}>{topic.isActive ? 'Đang dùng' : 'Đã ngừng dùng'}</Badge>
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <TextLink to={PATHS.curriculumTopicHeritages(topic.id)} aria-label={`Quản lý di sản của "${topic.title}"`} className="mr-2 whitespace-nowrap">
                      Di sản
                    </TextLink>
                    <Button variant="ghost" size="icon" aria-label={`Sửa "${topic.title}"`} onClick={() => setDialog({ kind: 'form', topic })}>
                      <Icon name="pencil" size={18} />
                    </Button>
                    {topic.isActive ? (
                      <Button variant="ghost" size="icon" aria-label={`Ngừng dùng "${topic.title}"`} disabled={busyId === topic.id} onClick={() => setStopping(topic)}>
                        <Icon name="eye-off" size={18} />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" aria-label={`Dùng lại "${topic.title}"`} disabled={busyId === topic.id} onClick={() => void setActive(topic, true)}>
                        <Icon name="refresh" size={18} />
                      </Button>
                    )}
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {dialog?.kind === 'form' && (
        <CurriculumTopicFormDialog
          key={dialog.topic?.id ?? 'moi'}
          topic={dialog.topic}
          defaults={{ grade, sortOrder: String(nextOrder), subject: all.find((t) => String(t.grade) === grade)?.subject ?? '' }}
          onClose={() => setDialog(null)}
          onSaved={(_saved, message) => {
            setDialog(null);
            toast.success(message ?? MESSAGES.success(dialog.topic ? 'Lưu chủ đề' : 'Thêm chủ đề'));
            refresh();
          }}
        />
      )}

      <ConfirmDialog
        open={stopping !== null}
        title="Ngừng dùng chủ đề?"
        confirmLabel="Ngừng dùng"
        tone="danger"
        confirming={busyId !== null}
        onConfirm={() => stopping && void setActive(stopping, false)}
        onClose={() => setStopping(null)}
      >
        {stopping && MESSAGES.confirm('ngừng dùng', `chủ đề ${stopping.title}`)} Giáo viên sẽ không thấy chủ đề này nữa; danh sách di sản của chủ đề vẫn được giữ và
        dùng lại được bất cứ lúc nào.
      </ConfirmDialog>
    </AreaPage>
  );
}
