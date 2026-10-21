import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';
import { useStudentHome } from './useStudentHome';

// Trang học của em — bản cấp 3 (khối 10-12): Phong cách Học viện Nghiên cứu (Academic Scholar Dashboard).
// Bố cục gọn gàng, mật độ thông tin cao, giao diện chuẩn học thuật, không linh vật.
// Thanh bên Mục lục neo dính (sticky TOC); một cột nội dung rộng gồm Đầu trang học viện, Lớp của em, Việc cần làm và Gợi ý.

const TOC = [
  { id: 'lop-cua-em', label: 'Lớp của em', icon: 'school' as const },
  { id: 'viec-can-lam', label: 'Việc cần làm', icon: 'clipboard-list' as const },
  { id: 'goi-y', label: 'Gợi ý', icon: 'sparkles' as const },
];

export function LevelThree({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const { data: home } = useStudentHome();
  const myLessons = home?.myLessons ?? [];

  // Số ngày học thực tế
  const activeDays = (() => {
    if (home?.streakDays && home.streakDays > 0) return home.streakDays;
    const dates = myLessons
      .map((l) => l.lastAttemptAt)
      .filter((d): d is string => Boolean(d))
      .map((d) => d.slice(0, 10));
    const unique = new Set(dates);
    if (unique.size > 0) return unique.size;
    return (home?.totalStars ?? 0) > 0 ? 1 : 0;
  })();

  const pendingCount = (home?.inProgress?.length ?? 0) + (home?.openQuizzes?.length ?? 0);

  return (
    <section className="dsv-content dsv-section" data-bo-cuc="cap-3">
      <title>Trang học của em · DiViet</title>

      <div className="grid gap-(--dsv-block-gap) lg:grid-cols-[240px_1fr] items-start">
        {/* THANH BÊN MỤC LỤC HỌC THUẬT (Sticky Navigation) */}
        <nav
          aria-label="Mục lục"
          className="h-fit rounded-xl border border-border bg-surface p-3 lg:sticky lg:top-20 shadow-2xs"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/70 mb-1">
            <Icon name="menu" size={16} className="text-on-surface-variant" />
            <span className="type-label text-on-surface font-bold text-xs uppercase tracking-wider">
              Mục lục trang học
            </span>
          </div>

          <ul className="flex flex-col gap-1 mt-1">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={'#' + item.id}
                  className="flex items-center justify-between rounded-lg px-3 py-2 type-body-m text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors no-underline font-medium"
                >
                  <span>{item.label}</span>
                  <span aria-hidden="true" className="text-xs text-on-surface-muted opacity-60">→</span>
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-4 pt-3 border-t border-border/70 px-3">
            <p className="text-[11px] text-on-surface-muted leading-relaxed italic">
              «Học di sản để thấu hiểu cội nguồn và dựng xây tương lai.»
            </p>
          </div>
        </nav>

        {/* CỘT NỘI DUNG CHÍNH (Academic Main Stream) */}
        <div className="min-w-0">
          {/* Header học viện */}
          <div className="pb-4 border-b border-border/80">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-surface-container-high text-on-surface border border-border">
                🎓 CẤP 3 · KHỐI {classroom.grade} · LỚP {classroom.name}
              </span>
              {classroom.organization && (
                <span className="text-xs text-on-surface-variant font-medium">
                  🏫 {classroom.organization.name}
                </span>
              )}
            </div>

            <h1 className="type-h1 text-on-surface font-black tracking-tight">
              Trang học của em
            </h1>

            <p className="mt-2 type-body-m text-on-surface-variant">
              {whoAmI(user)} · Lớp {classroom.name} · Khối {classroom.grade}
              {classroom.teacherName ? ` · ${classroom.teacherName}` : ''}
              {classroom.organization ? ` · ${classroom.organization.name}` : ''}
            </p>
          </div>

          {/* Hộp hành động mở bài học bằng mã + Lối tắt */}
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-border bg-surface-container-low p-4 shadow-2xs">
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface border border-border text-lg shadow-2xs" aria-hidden="true">
                🔑
              </span>
              <div>
                <p className="type-label text-on-surface font-bold">Mở bài học bằng mã</p>
                <p className="text-xs text-on-surface-variant">
                  Nhập mã bài học do thầy cô cấp để kích hoạt chuyên đề nghiên cứu di sản mới.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <ButtonLink to={pathOf('enterCode')} variant="primary" size="md">
                <Icon name="key" size={16} />
                Nhập mã bài học
              </ButtonLink>
              <ButtonLink to={pathOf('profile')} variant="secondary" size="md">
                <Icon name="user" size={16} />
                Hồ sơ học sinh
              </ButtonLink>
            </div>
          </div>

          {/* Dải chỉ số học thuật (Academic Metric Cards) */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-on-surface-variant">Ngày học thực tế</p>
              <p className="text-lg font-black text-on-surface mt-1">{activeDays} ngày</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-on-surface-variant">Bài học đã mở</p>
              <p className="text-lg font-black text-on-surface mt-1">{myLessons.length} chuyên đề</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-on-surface-variant">Huy hiệu đạt được</p>
              <p className="text-lg font-black text-on-surface mt-1">{home?.recentBadges?.length ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-xl border border-border bg-surface shadow-2xs">
              <p className="text-xs font-semibold text-on-surface-variant">Bài kiểm tra mở</p>
              <p className="text-lg font-black text-on-surface mt-1">{pendingCount} bài</p>
            </div>
          </div>

          {/* PHẦN 1: Lớp của em */}
          <section id="lop-cua-em" aria-labelledby="lop-cua-em-tieu-de" className="mt-8 scroll-mt-20">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 id="lop-cua-em-tieu-de" className="type-h2 text-on-surface font-black">
                Lớp của em
              </h2>
              <span className="text-xs text-on-surface-muted font-mono">
                {classroom.schoolYear ? `Năm học ${classroom.schoolYear}` : ''}
              </span>
            </div>
            <dl className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface overflow-hidden shadow-2xs type-body-m">
              {classFacts(classroom).map((fact) => (
                <div key={fact.label} className="grid grid-cols-[160px_1fr] gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors">
                  <dt className="text-on-surface-variant font-medium">{fact.label}</dt>
                  <dd className="text-on-surface font-bold">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* PHẦN 2: Việc cần làm */}
          <section id="viec-can-lam" aria-labelledby="viec-can-lam-tieu-de" className="mt-8 scroll-mt-20">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
              <h2 id="viec-can-lam-tieu-de" className="type-h2 text-on-surface font-black">
                Việc cần làm
              </h2>
              <Link
                to={pathOf('progress')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Xem tiến độ toàn diện →
              </Link>
            </div>
            <div className="mt-3">
              <LearningSections level={3} />
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
