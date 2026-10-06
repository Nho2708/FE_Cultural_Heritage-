import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { ButtonLink } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { Illustration } from '../theme/Illustration';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';

// Trang học của em — bản cấp 2 (khối 6-9): bố cục cân bằng chữ và hình, hai cột. Cột chính: lời chào, thông tin của em và
// khối Lớp của em; cột phụ: lối vào ô nhập mã bài học. Các khối bài kiểm tra đang chờ, bài học của em, gợi ý và huy hiệu
// dựng cùng chức năng học tập.

export function LevelTwo({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-2">
      <title>Trang học của em · Học di sản</title>
      <h1 className="type-h1 text-on-surface">Trang học của em</h1>
      <div className="mt-6 flex items-center gap-(--dsv-inline-gap) rounded-md bg-primary-container p-(--dsv-inline-gap) text-on-primary-container">
        <Illustration state="chao" className="size-20 bg-surface" />
        <p className="type-h3">Chào {user.fullName ?? 'em'}! Hôm nay em học gì nào?</p>
      </div>
      <p className="mt-3 type-body-s text-on-surface-variant">{whoAmI(user)}</p>

      <div className="mt-8 grid gap-(--dsv-block-gap) lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-(--dsv-block-gap)">
        <LearningSections level={2} />
        <section aria-labelledby="lop-cua-em">
          <h2 id="lop-cua-em" className="type-h2 text-on-surface">
            Lớp của em
          </h2>
          <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-md border border-border bg-surface p-(--dsv-inline-gap) type-body-m sm:grid-cols-2">
            {classFacts(classroom).map((fact) => (
              <div key={fact.label}>
                <dt className="type-label text-on-surface-variant">{fact.label}</dt>
                <dd className="mt-1 text-on-surface">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </section>
        </div>

        <aside className="h-fit rounded-md bg-primary-container p-(--dsv-inline-gap) text-on-primary-container">
          <h2 className="type-h3">Mã bài học</h2>
          <p className="mt-2 type-body-s">Nhập mã thầy cô đưa cho lớp em để mở bài học.</p>
          <ButtonLink to={pathOf('enterCode')} className="mt-4" fullWidth>
            Nhập mã bài học
          </ButtonLink>
          <p className="mt-4 type-label">{SCHOOL_LEVEL_LABEL[classroom.schoolLevel]}</p>
        </aside>
      </div>
    </section>
  );
}
