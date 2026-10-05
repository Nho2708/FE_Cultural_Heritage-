import { studentCodeOf, type StudentClassDetail, type StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { Illustration } from '../theme/Illustration';
import { classFacts } from './classroom';
import { SpeakButton } from './SpeakButton';

// Trang học của em — bản cấp 1 (khối 1-5): một cột, nút to, ít chữ, nhiều hình, nút loa đọc to. Chỉ có khối chào, thẻ lớp
// của em và nút "Nhập mã bài học"; các khối bài chơi, gợi ý, huy hiệu, số sao dựng cùng chức năng học tập. Không có bảng,
// biểu đồ hay điểm số.

export function LevelOne({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const name = user.fullName ?? 'em';
  const greeting = `Chào ${name}! Hôm nay mình cùng khám phá nhé!`;
  const facts = classFacts(classroom).filter((f) => ['Lớp', 'Giáo viên', 'Trường'].includes(f.label));

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-1">
      <title>Trang học của em · Học di sản</title>
      <div className="mx-auto flex max-w-[860px] flex-col gap-(--dsv-block-gap)">
        <div className="flex items-center gap-(--dsv-inline-gap) rounded-lg bg-primary-container p-(--dsv-inline-gap) text-on-primary-container">
          <Illustration state="chao" className="size-24 bg-surface" />
          <div className="min-w-0 flex-1">
            <h1 className="type-h1">{greeting}</h1>
            <p className="mt-2 type-body-m">
              Lớp {classroom.name}
              {classroom.teacherName ? ` · ${classroom.teacherName}` : ''}
            </p>
          </div>
          <SpeakButton text={greeting} label="Nghe lời chào" />
        </div>

        <ButtonLink to={pathOf('enterCode')} size="lg" fullWidth>
          <Icon name="key" size={24} />
          Nhập mã bài học
        </ButtonLink>

        <section aria-labelledby="lop-cua-em" className="rounded-lg border-2 border-border bg-surface p-(--dsv-inline-gap)">
          <div className="flex items-center gap-3">
            <h2 id="lop-cua-em" className="type-h2">
              Lớp của em
            </h2>
            <SpeakButton
              text={`Em học lớp ${classroom.name}. ${classroom.teacherName ? `Thầy cô phụ trách là ${classroom.teacherName}.` : ''}`}
              label="Nghe thông tin lớp của em"
            />
          </div>
          <dl className="mt-4 grid gap-3 type-body-m sm:grid-cols-3">
            {facts.map((fact) => (
              <div key={fact.label} className="rounded-md bg-surface-container-low p-4">
                <dt className="type-label text-on-surface-variant">{fact.label}</dt>
                <dd className="mt-1 type-h3 text-on-surface">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 type-body-m text-on-surface-variant">Mã học sinh của em: {studentCodeOf(user)}</p>
        </section>

        <div className="flex items-center gap-(--dsv-inline-gap) rounded-lg border-2 border-dashed border-border-strong p-(--dsv-inline-gap)">
          <Illustration state="trong" />
          <p className="type-h4">Chưa có bài chơi nào. Em hãy nhờ thầy cô đưa mã bài học nhé!</p>
        </div>
      </div>
    </section>
  );
}
