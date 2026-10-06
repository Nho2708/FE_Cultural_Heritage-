import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { pathOf } from '../access/screens';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';

// Trang học của em — bản cấp 3 (khối 10-12): bố cục gọn, nhiều chữ, giống trang tài liệu. Thanh bên mục lục và một cột nội
// dung rộng; đầu trang một dòng thông tin; danh sách dạng dòng, không thẻ hình, không linh vật. Mục lục chỉ có các mục
// đã dựng; Bài học của em, Gợi ý, Huy hiệu thêm cùng chức năng học tập.

const TOC = [
  { id: 'lop-cua-em', label: 'Lớp của em' },
  { id: 'viec-can-lam', label: 'Việc cần làm' },
];

export function LevelThree({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-3">
      <title>Trang học của em · Học di sản</title>
      <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[240px_1fr]">
        <nav aria-label="Mục lục" className="h-fit rounded-md border border-border bg-surface p-2 lg:sticky lg:top-20">
          <p className="flex items-center gap-2 px-3 py-2 type-label text-on-surface-variant">
            <Icon name="menu" size={16} />
            Mục lục
          </p>
          <ul>
            {TOC.map((item) => (
              <li key={item.id}>
                <a href={'#' + item.id} className="block rounded-sm px-3 py-2 type-body-m text-on-surface hover:bg-surface-container-low">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="min-w-0">
          <h1 className="type-h1 text-on-surface">Trang học của em</h1>
          <p className="mt-2 type-body-m text-on-surface-variant">
            {whoAmI(user)} · Lớp {classroom.name} · Khối {classroom.grade}
            {classroom.teacherName ? ` · ${classroom.teacherName}` : ''}
            {classroom.organization ? ` · ${classroom.organization.name}` : ''}
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-md border border-border bg-surface-container-low p-4">
            <span className="type-label text-on-surface">Mở bài học bằng mã</span>
            <ButtonLink to={pathOf('enterCode')} variant="secondary">
              Nhập mã bài học
            </ButtonLink>
          </div>

          <section id="lop-cua-em" aria-labelledby="lop-cua-em-tieu-de" className="mt-8 scroll-mt-20">
            <h2 id="lop-cua-em-tieu-de" className="type-h2 text-on-surface">
              Lớp của em
            </h2>
            <dl className="mt-3 divide-y divide-border rounded-md border border-border bg-surface type-body-m">
              {classFacts(classroom).map((fact) => (
                <div key={fact.label} className="grid grid-cols-[160px_1fr] gap-4 px-4 py-3">
                  <dt className="text-on-surface-variant">{fact.label}</dt>
                  <dd className="text-on-surface">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section id="viec-can-lam" aria-labelledby="viec-can-lam-tieu-de" className="mt-8 scroll-mt-20">
            <h2 id="viec-can-lam-tieu-de" className="type-h2 text-on-surface">
              Việc cần làm
            </h2>
            <div className="mt-3">
              <LearningSections level={3} />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
