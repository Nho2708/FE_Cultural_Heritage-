import type { StudentClassDetail, StudentProfile } from '@dsvhvn/dung-chung/api';
import { SCHOOL_LEVEL_LABEL } from '@dsvhvn/dung-chung/theme';
import { ButtonLink, Icon } from '@dsvhvn/dung-chung/ui';
import { Illustration } from '@dsvhvn/dung-chung/lesson';
import { Link } from 'react-router';
import { pathOf } from '../access/screens';
import { classFacts, whoAmI } from './classroom';
import { LearningSections } from './LearningSections';
import { useStudentHome } from './useStudentHome';

// Trang học của em — bản cấp 2 (khối 6-9): Phong cách Thám hiểm Thiếu niên (Teen Explorer).
// Bố cục cân bằng chữ và hình, hai cột. Cột chính: Lời chào năng động, Dải chỉ số thám hiểm, Các khối bài học/thử thách, Khối Lớp của em.
// Cột phụ: Nhiệm vụ nhập mã bài học, thẻ lối tắt tiến độ và cấp học.

export function LevelTwo({ user, classroom }: { user: StudentProfile; classroom: StudentClassDetail }) {
  const { data: home } = useStudentHome();
  const myLessons = home?.myLessons ?? [];

  // Số ngày chăm chỉ: lấy từ máy chủ, hoặc tính từ các ngày thực tế em đã hoàn thành bài học
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
    <section className="dsv-content dsv-section" data-bo-cuc="cap-2">
      <title>Trang học của em · DiViet</title>
      
      {/* Tiêu đề chính trang học */}
      <h1 className="type-h1 text-on-surface">Trang học của em</h1>
      <p className="mt-2 type-body-s text-on-surface-variant">{whoAmI(user)}</p>

      {/* Banner Chào mừng phong cách Thám hiểm Thiếu niên */}
      <div className="mt-4 rounded-3xl bg-gradient-to-r from-teal-700 via-cyan-800 to-indigo-900 p-5 sm:p-6 text-white shadow-md border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="size-20 shrink-0 rounded-2xl bg-white/10 p-2 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-inner">
            <Illustration state="chao" className="size-full text-white drop-shadow-md" />
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <span className="rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 px-3 py-0.5 text-xs font-black uppercase tracking-wider">
                🧭 CẤP 2 · KHỐI {classroom.grade} · LỚP {classroom.name}
              </span>
              {classroom.teacherName && (
                <span className="text-xs font-semibold text-cyan-100/90">
                  👩‍🏫 GV: {classroom.teacherName}
                </span>
              )}
            </div>
            <p className="type-h2 font-black text-white tracking-tight mt-1.5">
              Chào {user.fullName ?? 'em'}! Hôm nay em học gì nào?
            </p>
            <p className="text-cyan-100/80 text-xs sm:text-sm font-medium mt-1">
              {home?.cheer ?? 'Khám phá di sản, tích lũy kiến thức văn hóa và chinh phục những thử thách mới!'}
            </p>
          </div>
        </div>
      </div>

      {/* Dải chỉ số thám hiểm Teen Explorer */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link
          to={pathOf('progress')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-border hover:border-orange-400/60 shadow-2xs hover:shadow-xs transition-all no-underline group"
          title="Xem chuỗi ngày chăm chỉ"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl text-orange-600 border border-orange-200 group-hover:scale-105 transition-transform" aria-hidden="true">
            🔥
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant truncate">Chăm chỉ</p>
            <p className="text-base font-black text-on-surface mt-0.5">{activeDays} ngày</p>
          </div>
        </Link>

        <Link
          to={`${pathOf('progress')}?tab=huy-hieu`}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-border hover:border-purple-400/60 shadow-2xs hover:shadow-xs transition-all no-underline group"
          title="Xem bộ sưu tập huy hiệu"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-xl text-purple-600 border border-purple-200 group-hover:scale-105 transition-transform" aria-hidden="true">
            🏆
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant truncate">Huy hiệu</p>
            <p className="text-base font-black text-on-surface mt-0.5">{home?.recentBadges?.length ?? 0}</p>
          </div>
        </Link>

        <Link
          to={pathOf('progress')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-border hover:border-emerald-400/60 shadow-2xs hover:shadow-xs transition-all no-underline group"
          title="Xem các bài học đã mở"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-600 border border-emerald-200 group-hover:scale-105 transition-transform" aria-hidden="true">
            📚
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant truncate">Bài học đã mở</p>
            <p className="text-base font-black text-on-surface mt-0.5">{myLessons.length}</p>
          </div>
        </Link>

        <Link
          to={pathOf('progress')}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-surface border border-border hover:border-cyan-400/60 shadow-2xs hover:shadow-xs transition-all no-underline group"
          title="Xem bài kiểm tra cần làm"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-xl text-cyan-600 border border-cyan-200 group-hover:scale-105 transition-transform" aria-hidden="true">
            ⚡
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface-variant truncate">Cần hoàn thành</p>
            <p className="text-base font-black text-on-surface mt-0.5">{pendingCount} bài</p>
          </div>
        </Link>
      </div>

      {/* Bố cục 2 cột */}
      <div className="mt-8 grid gap-(--dsv-block-gap) lg:grid-cols-[1fr_320px] items-start">
        {/* CỘT CHÍNH: Các khối học tập + Lớp của em */}
        <div className="flex min-w-0 flex-col gap-(--dsv-block-gap)">
          <LearningSections level={2} />

          <section aria-labelledby="lop-cua-em" className="rounded-2xl border border-border bg-surface p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <span className="text-xl" aria-hidden="true">🏫</span>
                <h2 id="lop-cua-em" className="type-h2 text-on-surface font-black">
                  Lớp của em
                </h2>
              </div>
              <Link
                to={pathOf('profile')}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <Icon name="user" size={14} />
                Xem thẻ học sinh →
              </Link>
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {classFacts(classroom).map((fact) => (
                <div key={fact.label} className="p-3.5 rounded-xl bg-surface-container-low border border-border/60">
                  <dt className="type-label text-on-surface-variant text-xs">{fact.label}</dt>
                  <dd className="mt-1 font-bold text-on-surface text-sm">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        {/* CỘT PHỤ (Aside): Nhập mã bài học + Lối tắt */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
          <div className="rounded-2xl border border-teal-500/30 bg-gradient-to-br from-teal-800 via-cyan-900 to-slate-900 p-5 text-white shadow-md">
            <div className="flex items-center gap-2.5 mb-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/20 text-lg shadow-inner">
                🔑
              </span>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300">
                  NHIỆM VỤ MỚI
                </span>
                <h2 className="type-h3 text-white font-black leading-tight">
                  Mã bài học
                </h2>
              </div>
            </div>
            <p className="mt-2 type-body-s text-cyan-100/90">
              Nhập mã thầy cô đưa cho lớp em để mở bài học.
            </p>
            <ButtonLink
              to={pathOf('enterCode')}
              className="mt-4 w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black py-2.5 text-center rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 no-underline"
            >
              <Icon name="key" size={16} />
              Nhập mã bài học
            </ButtonLink>
            <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-cyan-200">
              <span>Cấp đào tạo:</span>
              <span className="font-bold text-white">{SCHOOL_LEVEL_LABEL[classroom.schoolLevel]}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs flex flex-col gap-3">
            <h3 className="type-label text-on-surface font-bold flex items-center gap-2">
              <span>📊</span>
              Lối tắt học tập
            </h3>
            <Link
              to={pathOf('progress')}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border/60 text-xs font-semibold text-on-surface no-underline transition-colors"
            >
              <span>Xem tiến độ học tập</span>
              <span>→</span>
            </Link>
            <Link
              to={`${pathOf('progress')}?tab=huy-hieu`}
              className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-border/60 text-xs font-semibold text-on-surface no-underline transition-colors"
            >
              <span>Bộ sưu tập huy hiệu</span>
              <span>→</span>
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
