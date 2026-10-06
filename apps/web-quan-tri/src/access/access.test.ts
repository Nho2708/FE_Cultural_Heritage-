import type { StaffRole } from '@dsvhvn/dung-chung/api';
import { describe, expect, it } from 'vitest';
import { canOpen, postLoginTarget, resolveAccess, roleHome, screenForPath, workArea } from './access';
import { AREA_ROOT, SCREENS, screen, type Actor, type Screen } from './screens';

const ACTORS: Actor[] = ['Guest', 'TEACHER', 'ORG_ADMIN', 'ADMIN'];
const ROLES: StaffRole[] = ['TEACHER', 'ORG_ADMIN', 'ADMIN'];
const roleOf = (actor: Actor): StaffRole | null => (actor === 'Guest' ? null : actor);
const ALL: readonly Screen[] = SCREENS;

describe('bảng màn hình và ma trận phân quyền của web quản trị', () => {
  it('có đủ 37 màn hình, khóa không trùng, 10 hộp thoại không có URL', () => {
    expect(SCREENS).toHaveLength(37);
    expect(new Set(SCREENS.map((s) => s.key)).size).toBe(37);
    expect(SCREENS.filter((s) => s.path === null).map((s) => s.name)).toEqual([
      'Thêm học sinh và tạo tài khoản',
      'Phiếu đăng nhập của học sinh',
      'Tạo bài học: chọn lớp và di sản',
      'Mã bài học',
      'Nhân bản bài học sang lớp khác',
      'Biểu mẫu câu hỏi',
      'Chọn câu từ ngân hàng',
      'Chi tiết bài làm',
      'Biểu mẫu tài khoản',
      'Biểu mẫu giai đoạn và sự kiện',
    ]);
  });

  it('số màn hình theo khu: xác thực và tài khoản 3, giáo viên 18, quản trị trường 6, quản trị hệ thống 10', () => {
    const count = (area: Screen['area']) => ALL.filter((s) => s.area === area).length;
    expect([count('account'), count('teacher'), count('school'), count('admin')]).toEqual([3, 18, 6, 10]);
  });

  it('số màn hình mở được theo vai trò khớp dòng tổng của ma trận: khách 2, giáo viên 19, quản trị trường 7, quản trị hệ thống 13', () => {
    const counts = Object.fromEntries(ACTORS.map((actor) => [actor, ALL.filter((s) => s.actors.includes(actor)).length]));
    expect(counts).toEqual({ Guest: 2, TEACHER: 19, ORG_ADMIN: 7, ADMIN: 13 });
  });

  it('mỗi khu dùng đúng tiền tố route; route chỉ có chữ thường không dấu', () => {
    const pathsOf = (area: string) =>
      ALL.filter((s) => s.area === area).flatMap((s) => [s.path, ...(s.aliases ?? [])].filter((p) => p !== null));
    expect(pathsOf('teacher').every((p) => p.startsWith(`${AREA_ROOT.teacher}/`))).toBe(true);
    expect(pathsOf('school').every((p) => p === AREA_ROOT.school || p.startsWith(`${AREA_ROOT.school}/`))).toBe(true);
    expect(pathsOf('admin').every((p) => p === AREA_ROOT.admin || p.startsWith(`${AREA_ROOT.admin}/`))).toBe(true);
    expect(pathsOf('account')).toEqual(['/dang-nhap', '/quen-mat-khau', '/dat-mat-khau', '/tai-khoan']);
    const all = ALL.flatMap((s) => [s.path, ...(s.aliases ?? [])]).filter((p) => p !== null);
    expect(all.every((p) => /^\/[a-z0-9/:-]*$/i.test(p) && !/[A-Z]/.test(p.replace(/:[A-Za-z]+/g, '')))).toBe(true);
  });

  it('không còn màn hình công khai: khám phá di sản và khu học của học sinh ở web học tập', () => {
    expect(screenForPath('/di-san')).toBeUndefined();
    expect(screenForPath('/ban-do')).toBeUndefined();
    expect(screenForPath('/hoc')).toBeUndefined();
  });

  it('Đăng nhập, Quên / đặt mật khẩu chỉ cho người chưa đăng nhập; người đã đăng nhập được chuyển đi thay vì báo 403', () => {
    for (const key of ['login', 'password'] as const) {
      expect(resolveAccess(screen(key), null)).toBe('allow');
      for (const role of ROLES) expect(resolveAccess(screen(key), role)).toBe('signed-in');
    }
  });

  it('khách mở màn hình cần đăng nhập thì được đưa tới Đăng nhập', () => {
    for (const key of ['profile', 'classes', 'schoolTeachers', 'schools', 'auditLog'] as const) {
      expect(resolveAccess(screen(key), null)).toBe('login');
    }
  });

  it('vai trò sai khu nhận 403', () => {
    expect(resolveAccess(screen('classes'), 'ORG_ADMIN')).toBe('forbidden');
    expect(resolveAccess(screen('schoolTeachers'), 'TEACHER')).toBe('forbidden');
    expect(resolveAccess(screen('schoolTeachers'), 'ADMIN')).toBe('forbidden');
    expect(resolveAccess(screen('schools'), 'ORG_ADMIN')).toBe('forbidden');
    // Quản trị hệ thống không soạn bài học, bài kiểm tra; quản trị trường không soạn nội dung dạy học, không quản lý học sinh.
    expect(resolveAccess(screen('lessonEditor'), 'ADMIN')).toBe('forbidden');
    expect(resolveAccess(screen('quizEditor'), 'ORG_ADMIN')).toBe('forbidden');
    expect(resolveAccess(screen('classDetail'), 'ORG_ADMIN')).toBe('forbidden');
  });

  it('Hồ sơ cá nhân dùng chung ba vai trò; Biểu mẫu câu hỏi, Biểu mẫu tài khoản mở cho hai vai trò theo nơi mở', () => {
    expect(ACTORS.filter((a) => canOpen(screen('profile'), roleOf(a)))).toEqual(['TEACHER', 'ORG_ADMIN', 'ADMIN']);
    expect(ACTORS.filter((a) => canOpen(screen('questionForm'), roleOf(a)))).toEqual(['TEACHER', 'ADMIN']);
    expect(ACTORS.filter((a) => canOpen(screen('accountForm'), roleOf(a)))).toEqual(['ORG_ADMIN', 'ADMIN']);
  });
});

describe('trang vào theo vai trò và điều hướng sau đăng nhập', () => {
  it('trang mặc định: giáo viên → Hồ sơ cá nhân, quản trị trường → Giáo viên của trường, quản trị hệ thống → Quản lý trường', () => {
    expect(roleHome('TEACHER')).toBe('/tai-khoan');
    expect(roleHome('ORG_ADMIN')).toBe('/truong/giao-vien');
    expect(roleHome('ADMIN')).toBe('/quan-tri/truong');
    expect(postLoginTarget('ADMIN', null)).toBe('/quan-tri/truong');
  });

  it('lối vào khu làm việc của vai trò', () => {
    expect(workArea('TEACHER')).toEqual({ to: '/giao-vien', label: 'Vào khu giáo viên' });
    expect(workArea('ORG_ADMIN')).toEqual({ to: '/truong', label: 'Vào khu quản trị trường' });
    expect(workArea('ADMIN')).toEqual({ to: '/quan-tri', label: 'Vào khu quản trị' });
  });

  it('quay lại trang bị chặn giữa chừng nếu vai trò mở được trang đó', () => {
    expect(postLoginTarget('ORG_ADMIN', '/truong/giao-vien?trang=2')).toBe('/truong/giao-vien?trang=2');
    expect(postLoginTarget('ADMIN', '/quan-tri/nhat-ky')).toBe('/quan-tri/nhat-ky');
    expect(postLoginTarget('TEACHER', '/tai-khoan?tab=doi-mat-khau')).toBe('/tai-khoan?tab=doi-mat-khau');
    expect(postLoginTarget('TEACHER', '/giao-vien')).toBe('/giao-vien');
  });

  it('bỏ qua trang bị chặn khi vai trò không mở được, trang chỉ cho khách, hoặc đường dẫn không an toàn', () => {
    expect(postLoginTarget('TEACHER', '/quan-tri/truong')).toBe('/tai-khoan');
    expect(postLoginTarget('ORG_ADMIN', '/giao-vien/lop')).toBe('/truong/giao-vien');
    expect(postLoginTarget('ADMIN', '/dang-nhap')).toBe('/quan-tri/truong');
    expect(postLoginTarget('ADMIN', '//evil.example/steal')).toBe('/quan-tri/truong');
    expect(postLoginTarget('ADMIN', 'https://evil.example')).toBe('/quan-tri/truong');
    expect(postLoginTarget('ADMIN', '/khong-ton-tai')).toBe('/quan-tri/truong');
  });

  it('tìm màn hình theo đường dẫn: đường dẫn tĩnh thắng đường dẫn có tham số', () => {
    expect(screenForPath('/dat-mat-khau')?.key).toBe('password');
    expect(screenForPath('/quan-tri/truong/moi')?.key).toBe('schoolDetail');
    expect(screenForPath('/quan-tri/truong/12')?.key).toBe('schoolDetail');
    expect(screenForPath('/quan-tri')?.key).toBe('adminOverview');
    expect(screenForPath('/giao-vien/bai-hoc/5/sinh-cau-hoi')?.key).toBe('aiQuestions');
    expect(screenForPath('/giao-vien/lop/3/hoc-sinh/9')?.name).toBe('Hồ sơ học tập của học sinh');
    expect(screenForPath('/khong-co')).toBeUndefined();
  });
});
