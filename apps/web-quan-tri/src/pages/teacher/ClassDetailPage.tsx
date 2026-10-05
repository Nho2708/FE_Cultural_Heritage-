import { MESSAGES } from '@dsvhvn/dung-chung';
import { ApiError, type LoginSheet } from '@dsvhvn/dung-chung/api';
import { Button, EmptyState, ErrorState, Icon, LoadingState, TabPanel, Tabs, TextLink, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { pathOf } from '../../access/screens';
import { LevelBadge } from '../../components/classroom/ClassFields';
import { ClassFormDialog } from '../../components/classroom/ClassFormDialog';
import { ClassLessonsTab } from '../../components/lesson/ClassLessonsTab';
import { LoginSlipsDialog } from '../../components/classroom/LoginSlipsDialog';
import { StudentsTab } from '../../components/classroom/StudentsTab';
import { AreaPage, PageHeader } from '../../components/layout/PageHeader';
import { classesApi } from '../../lib/api/classroomEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { useAuth } from '../../lib/auth/context';

// Chi tiết lớp (nhiều tab) — giáo viên. Đầu trang: tên lớp, khối và cấp học, năm học, sĩ số; "Sửa lớp". Tab Học sinh dựng
// ở chức năng này; tab Bài học dựng ở chức năng bài học theo cấp; các tab Tiến độ, Thành thạo, Gợi ý ôn tập dựng cùng chức năng kết quả. Tab đang mở
// nằm trên URL (?tab=). Phiếu đăng nhập hiện ngay sau khi thêm học sinh hoặc đặt lại mật khẩu.

const TABS = [
  { id: 'hoc-sinh', label: 'Học sinh' },
  { id: 'bai-hoc', label: 'Bài học' },
  { id: 'tien-do', label: 'Tiến độ' },
  { id: 'thanh-thao', label: 'Thành thạo' },
  { id: 'goi-y-on-tap', label: 'Gợi ý ôn tập' },
] as const;

type TabId = (typeof TABS)[number]['id'];

const PREFIX = 'chi-tiet-lop';

function readTab(value: string | null): TabId {
  return TABS.find((t) => t.id === value)?.id ?? 'hoc-sinh';
}

interface Slips {
  sheet: LoginSheet;
  summary: string;
}

export default function ClassDetailPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const classId = Number(useParams().lop);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = readTab(searchParams.get('tab'));
  const [editing, setEditing] = useState(false);
  const [slips, setSlips] = useState<Slips | null>(null);

  const detail = useQuery({
    queryKey: queryKeys.classDetail(classId),
    queryFn: () => classesApi.get(classId).then((r) => r.data),
    enabled: Number.isInteger(classId) && classId > 0,
  });

  // Bộ lọc và trang của tab này không áp cho tab khác: đổi tab thì bỏ các tham số khác.
  const setTab = (next: TabId) =>
    setSearchParams(next === 'hoc-sinh' ? new URLSearchParams() : new URLSearchParams({ tab: next }), { replace: true });

  const back = <TextLink to={pathOf('classes')}>← Lớp học</TextLink>;

  if (detail.isPending && detail.fetchStatus !== 'idle') {
    return (
      <AreaPage>
        <PageHeader title="Chi tiết lớp" before={back} />
        <LoadingState />
      </AreaPage>
    );
  }
  if (detail.isError || !detail.data) {
    const notFound = !Number.isInteger(classId) || (detail.error instanceof ApiError && detail.error.status === 404);
    return (
      <AreaPage>
        <PageHeader title="Chi tiết lớp" before={back} />
        {notFound ? (
          <EmptyState icon="info" title="Không tìm thấy lớp." action={<Button variant="secondary" onClick={() => history.back()}>Quay lại</Button>}>
            Lớp không tồn tại, đã bị xóa hoặc không phải lớp do thầy cô phụ trách.
          </EmptyState>
        ) : (
          <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
        )}
      </AreaPage>
    );
  }

  const classRoom = detail.data;
  const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.classes });

  return (
    <AreaPage>
      <PageHeader
        before={back}
        title={`Lớp ${classRoom.name}`}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Khối {classRoom.grade} <LevelBadge level={classRoom.schoolLevel} />
            </span>
            <span>Năm học {classRoom.schoolYear}</span>
            <span>
              Sĩ số <strong className="type-mono-label text-on-surface">{`${classRoom.activeStudentCount} / ${classRoom.maxStudents}`}</strong>
            </span>
          </span>
        }
        actions={
          <Button variant="secondary" onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            Sửa lớp
          </Button>
        }
      />

      <Tabs idPrefix={PREFIX} label="Nội dung của lớp" items={TABS} value={tab} onChange={setTab} />
      <TabPanel idPrefix={PREFIX} id={tab}>
        {tab === 'hoc-sinh' ? (
          <StudentsTab classRoom={classRoom} onSlips={setSlips} />
        ) : tab === 'bai-hoc' ? (
          <ClassLessonsTab classRoom={classRoom} />
        ) : (
          <EmptyState icon="clock" title={`Tab ${TABS.find((t) => t.id === tab)?.label ?? ''} sẽ có ở bản sau.`}>
            Tab này hiện số liệu về bài học và kết quả làm bài của lớp; chưa có dữ liệu vì phần bài học, bài kiểm tra chưa được dựng.
          </EmptyState>
        )}
      </TabPanel>

      {editing && (
        <ClassFormDialog
          key={classRoom.id}
          classRoom={classRoom}
          onSaved={(_, message) => {
            setEditing(false);
            toast.success(message ?? MESSAGES.success('Lưu lớp'));
            void refresh();
          }}
          onClose={() => setEditing(false)}
        />
      )}
      {slips && (
        <LoginSlipsDialog
          sheet={slips.sheet}
          schoolName={user?.organization?.name ?? null}
          summary={slips.summary}
          onClose={() => setSlips(null)}
        />
      )}
    </AreaPage>
  );
}
