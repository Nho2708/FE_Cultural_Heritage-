import { describe, expect, it } from 'vitest';
import { changePasswordPath, isLessonPath, postLoginTarget, resolveAccess, safeReturnPath, screenForPath } from './access';
import { SCREENS, screen, type Screen } from './screens';

const ALL: readonly Screen[] = SCREENS;
const student = { mustChangePassword: false };
const mustChange = { mustChangePassword: true };

describe('bảng màn hình của web học tập', () => {
  it('19 màn hình: 9 khám phá công khai, 10 khu học; 1 hộp thoại; route chữ thường không dấu', () => {
    expect(SCREENS).toHaveLength(19);
    expect(ALL.filter((s) => s.area === 'explore')).toHaveLength(9);
    expect(ALL.filter((s) => s.area === 'learning')).toHaveLength(10);
    expect(ALL.filter((s) => s.path === null).map((s) => s.name)).toEqual(['Bắt đầu bài kiểm tra']);
    const paths = ALL.flatMap((s) => [s.path, ...(s.aliases ?? [])]).filter((p) => p !== null);
    expect(paths.every((p) => /^\/[a-z0-9/:-]*$/i.test(p) && !/[A-Z]/.test(p.replace(/:[A-Za-z]+/g, '')))).toBe(true);
  });

  it('khám phá mở cho mọi người; khu học chỉ cho học sinh; Học sinh đăng nhập chỉ cho khách', () => {
    for (const key of ['home', 'search', 'map', 'heritage', 'heritagePreview', 'timeline', 'about', 'forSchools'] as const) {
      expect(resolveAccess(screen(key), null)).toBe('allow');
      expect(resolveAccess(screen(key), student)).toBe('allow');
    }
    for (const key of ['changePassword', 'learnHome', 'enterCode', 'lesson', 'takeQuiz', 'result', 'progress', 'profile'] as const) {
      expect(resolveAccess(screen(key), null)).toBe('login');
      expect(resolveAccess(screen(key), student)).toBe('allow');
    }
    expect(resolveAccess(screen('login'), null)).toBe('allow');
    expect(resolveAccess(screen('login'), student)).toBe('signed-in');
  });

  it('lịch sử của khách chỉ cho khách; học sinh đã đăng nhập được đưa về trang học', () => {
    expect(resolveAccess(screen('guestHistory'), null)).toBe('allow');
    expect(resolveAccess(screen('guestHistory'), student)).toBe('signed-in');
    expect(screenForPath('/lich-su')?.key).toBe('guestHistory');
  });

  it('đang bị buộc đổi mật khẩu: mọi màn hình khác (kể cả trang khám phá) chuyển về Đổi mật khẩu', () => {
    for (const s of ALL.filter((x) => x.key !== 'changePassword')) expect(resolveAccess(s, mustChange)).toBe('change-password');
    expect(resolveAccess(screen('changePassword'), mustChange)).toBe('allow');
  });

  it('tìm màn hình theo đường dẫn', () => {
    expect(screenForPath('/di-san')?.key).toBe('search');
    expect(screenForPath('/di-san/vinh-ha-long')?.key).toBe('heritage');
    expect(screenForPath('/dong-thoi-gian/hoang-thanh')?.key).toBe('timeline');
    expect(screenForPath('/xem-truoc/di-san/MA123')?.key).toBe('heritagePreview');
    expect(screenForPath('/bai-hoc/BH7F3K2Q')?.key).toBe('lesson');
    expect(screenForPath('/bai-hoc/BH7F3K2Q/kiem-tra/3')?.key).toBe('takeQuiz');
    expect(screenForPath('/quan-tri')).toBeUndefined();
  });
});

describe('điều hướng sau đăng nhập', () => {
  it('về trang học của em, hoặc trang bị chặn trước đó (ví dụ đường dẫn bài học)', () => {
    expect(postLoginTarget(student, null)).toBe('/hoc');
    expect(postLoginTarget(student, '/bai-hoc/BH7F3K2Q')).toBe('/bai-hoc/BH7F3K2Q');
    expect(postLoginTarget(student, '//evil.example')).toBe('/hoc');
    expect(postLoginTarget(student, '/khong-co')).toBe('/hoc');
    expect(isLessonPath('/bai-hoc/BH7F3K2Q')).toBe(true);
    expect(isLessonPath('/hoc')).toBe(false);
  });

  it('đang bị buộc đổi mật khẩu: sang Đổi mật khẩu, giữ trang sẽ mở tiếp sau khi đổi xong', () => {
    expect(postLoginTarget(mustChange, null)).toBe('/doi-mat-khau');
    expect(postLoginTarget(mustChange, '/bai-hoc/BH7F3K2Q')).toBe('/doi-mat-khau?sau=%2Fbai-hoc%2FBH7F3K2Q');
    expect(changePasswordPath('/doi-mat-khau')).toBe('/doi-mat-khau');
    expect(safeReturnPath('/dang-nhap')).toBeNull();
    expect(safeReturnPath('/tien-do')).toBe('/tien-do');
  });
});
