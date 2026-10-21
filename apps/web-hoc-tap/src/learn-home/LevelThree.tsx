import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';
import { useStudentHome } from './useStudentHome';

// Trang học của em — bản cấp 3 (khối 10-12): Phong cách Học viện Nghiên cứu Di sản (Academic Scholar Portal).
// Bố cục tinh giản, mang tính học thuật cao, tuyệt đối không dùng hình tượng hoạt hình hoặc phong cách trẻ em.
// Thanh bên Mục lục neo dính (sticky TOC); một cột nội dung rộng gồm Đầu trang học viện, Lớp của em, Việc cần làm và Gợi ý.

const TOC = [
  { id: 'lop-cua-em', label: 'Lớp của em' },
  { id: 'viec-can-lam', label: 'Việc cần làm' },
  { id: 'goi-y', label: 'Gợi ý' },
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
          className="h-fit rounded-lg border border-border bg-surface p-2.5 lg:sticky lg:top-20 shadow-2xs"
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/80 mb-1">
            <Icon name="list" size={16} className="text-on-surface-muted" />
            <span className="type-label text-on-surface-variant font-bold text-xs uppercase tracking-wider">
              Mục lục
            </span>
          </div>

          <ul className="flex flex-col gap-0.5">
            {TOC.map((item) => (
              <li key={item.id}>
                <a
                  href={'#' + item.id}
                  className="block rounded-md px-3 py-2 type-body-m text-on-surface hover:bg-surface-container-low hover:text-primary transition-colors no-underline font-medium text-sm"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* CỘT NỘI DUNG CHÍNH (Academic Main Stream) */}
        <div className="min-w-0">
          {/* Header học viện */}
          <div className="border-b border-border pb-4">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="rounded-xs bg-surface-container-high px-2 py-0.5 text-[11px] font-bold text-on-surface-variant border border-border uppercase tracking-wide">
                THPT · KHỐI {classroom.grade} · LỚP {classroom.name}
              </span>
              {classroom.organization && (
                <span className="text-xs text-on-surface-muted font-medium">
                  {classroom.organization.name}
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

          {/* Hộp hành động mở bài học bằng mã */}
          <div className="mt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border border-border bg-surface-container-low p-4 shadow-2xs">
            <div>
              <span className="type-label text-on-surface font-bold">Mở bài học bằng mã</span>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Nhập mã bài học do thầy cô cấp để kích hoạt bài học nghiên cứu di sản mới.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ButtonLink to={pathOf('enterCode')} variant="secondary" size="md">
                <Icon name="key" size={16} />
                Nhập mã bài học
              </ButtonLink>
              <ButtonLink to={pathOf('profile')} variant="ghost" size="md">
                Hồ sơ học sinh
              </ButtonLink>
            </div>
          </div>

          {/* Dải chỉ số học thuật (Academic Metric Tiles - Không dùng emoji hoạt hình) */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-border bg-surface shadow-2xs">
              <dt className="text-xs font-medium text-on-surface-muted">Ngày học tích lũy</dt>
              <dd className="text-lg font-bold text-on-surface mt-1 tabular-nums">{activeDays} ngày</dd>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface shadow-2xs">
              <dt className="text-xs font-medium text-on-surface-muted">Bài học đã mở</dt>
              <dd className="text-lg font-bold text-on-surface mt-1 tabular-nums">{myLessons.length} bài học</dd>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface shadow-2xs">
              <dt className="text-xs font-medium text-on-surface-muted">Bài kiểm tra mở</dt>
              <dd className="text-lg font-bold text-on-surface mt-1 tabular-nums">{pendingCount} bài chờ</dd>
            </div>
            <div className="p-3.5 rounded-lg border border-border bg-surface shadow-2xs">
              <dt className="text-xs font-medium text-on-surface-muted">Danh hiệu đạt được</dt>
              <dd className="text-lg font-bold text-on-surface mt-1 tabular-nums">{home?.recentBadges?.length ?? 0}</dd>
            </div>
          </div>

          {/* PHẦN 1: Lớp của em */}
          <section id="lop-cua-em" aria-labelledby="lop-cua-em-tieu-de" className="mt-8 scroll-mt-20">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 id="lop-cua-em-tieu-de" className="type-h2 text-on-surface font-bold">
                Lớp của em
              </h2>
              <span className="text-xs text-on-surface-muted font-mono">
                {classroom.schoolYear ? `Năm học ${classroom.schoolYear}` : ''}
              </span>
            </div>
            <dl className="mt-3 divide-y divide-border rounded-lg border border-border bg-surface overflow-hidden shadow-2xs type-body-m">
              {classFacts(classroom).map((fact) => (
                <div key={fact.label} className="grid grid-cols-[180px_1fr] gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors">
                  <dt className="text-on-surface-variant font-medium text-sm">{fact.label}</dt>
                  <dd className="text-on-surface font-semibold text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* PHẦN 2: Việc cần làm */}
          <section id="viec-can-lam" aria-labelledby="viec-can-lam-tieu-de" className="mt-8 scroll-mt-20">
            <div className="flex items-center justify-between pb-2 border-b border-border mb-4">
              <h2 id="viec-can-lam-tieu-de" className="type-h2 text-on-surface font-bold">
                Việc cần làm
              </h2>
              <Link
                to={pathOf('progress')}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Chi tiết tiến độ học tập →
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
