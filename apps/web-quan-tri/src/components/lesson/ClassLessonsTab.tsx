import { MESSAGES, formatDate } from '@dsvhvn/dung-chung';
import type { ClassRoom } from '@dsvhvn/dung-chung/api';
import { Blank, Button, EmptyState, ErrorState, Icon, LoadingState, Table, Td, TextLink, Th, Tr, useToast } from '@dsvhvn/dung-chung/ui';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { PATHS } from '../../access/screens';
import { lessonsApi } from '../../lib/api/lessonEndpoints';
import { queryKeys } from '../../lib/api/queryKeys';
import { CreateLessonDialog } from './CreateLessonDialog';
import { CodeDisplay, LessonStatusBadge, PlanNotice } from './LessonBits';

// Tab Bài học của Chi tiết lớp: bài học của riêng lớp này và nút "Tạo bài học" với lớp được chọn sẵn và khóa.

export function ClassLessonsTab({ classRoom }: { classRoom: ClassRoom }) {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const filter = { classId: classRoom.id, page: 1, pageSize: 100 };
  const list = useQuery({ queryKey: queryKeys.lessonList(filter), queryFn: () => lessonsApi.list(filter).then((r) => r.data) });
  const quota = useQuery({ queryKey: queryKeys.aiQuota, queryFn: () => lessonsApi.aiQuota().then((r) => r.data) });
  const planLocked = quota.data?.hasEffectivePlan === false;

  return (
    <div className="flex flex-col gap-4">
      <PlanNotice quota={quota.data} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-m text-on-surface-variant">
          Bài học dành riêng cho lớp {classRoom.name}; học sinh của lớp mở bài bằng mã bài học sau khi xuất bản.
        </p>
        <Button onClick={() => setCreating(true)} disabled={planLocked}>
          <Icon name={planLocked ? 'lock' : 'plus'} size={16} />
          Tạo bài học
        </Button>
      </div>

      {list.isPending ? (
        <LoadingState />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.data.items.length === 0 ? (
        <EmptyState icon="book-open" title={`Lớp ${classRoom.name} chưa có bài học nào.`}>
          Bấm "Tạo bài học", chọn các di sản; AI soạn bản nháp theo cấp {classRoom.schoolLevel} để thầy cô sửa và xuất bản.
        </EmptyState>
      ) : (
        <Table caption={`Bài học của lớp ${classRoom.name}`}>
          <thead>
            <tr>
              <Th>Bài học</Th>
              <Th>Trạng thái</Th>
              <Th>Mã bài học</Th>
              <Th>Bài kiểm tra</Th>
              <Th>Ngày sửa</Th>
            </tr>
          </thead>
          <tbody>
            {list.data.items.map((row) => (
              <Tr key={row.id}>
                <Td className="font-medium">
                  <TextLink to={PATHS.lesson(row.id)}>{row.title}</TextLink>
                </Td>
                <Td>
                  <LessonStatusBadge status={row.status} />
                </Td>
                <Td>{row.accessCode ? <CodeDisplay code={row.accessCode} className="type-mono-label" /> : <Blank />}</Td>
                <Td className="type-mono-label">{row.quizCount}</Td>
                <Td className="type-mono-label whitespace-nowrap">{formatDate(row.updatedAt ?? row.createdAt)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {creating && (
        <CreateLessonDialog
          fixedClass={classRoom}
          onCreated={(lesson, message) => {
            setCreating(false);
            toast.success(message ?? MESSAGES.success('Tạo bài học'));
            void queryClient.invalidateQueries({ queryKey: queryKeys.lessons });
            void queryClient.invalidateQueries({ queryKey: queryKeys.classes });
            void navigate(PATHS.lesson(lesson.id));
          }}
          onClose={() => setCreating(false)}
        />
      )}
    </div>
  );
}
