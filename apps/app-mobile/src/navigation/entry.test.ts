import { entryHref } from './entry';

const base = { chosenLanguage: 'vi', mode: null, introSeen: true, hasSession: false, mustChangePassword: false } as const;

describe('entryHref', () => {
  it('asks for the language first, then the mode', () => {
    expect(entryHref({ ...base, chosenLanguage: null })).toBe('/chon-ngon-ngu');
    expect(entryHref(base)).toBe('/chon-che-do');
  });

  it('shows the app introduction once, between the language and the mode', () => {
    expect(entryHref({ ...base, chosenLanguage: null, introSeen: false })).toBe('/chon-ngon-ngu');
    expect(entryHref({ ...base, introSeen: false })).toBe('/gioi-thieu');
    expect(entryHref({ ...base, introSeen: true })).toBe('/chon-che-do');
  });

  it('never shows the introduction again once a mode has been chosen', () => {
    expect(entryHref({ ...base, mode: 'guest', introSeen: false })).toBe('/(khach)');
    expect(entryHref({ ...base, mode: 'student', introSeen: false })).toBe('/dang-nhap');
  });

  it('opens the visitor area directly, never the bare root that resolves back to the same group', () => {
    expect(entryHref({ ...base, mode: 'guest' })).toBe('/(khach)');
  });

  it('sends a student to sign in, to change the password, or to the learning home', () => {
    expect(entryHref({ ...base, mode: 'student' })).toBe('/dang-nhap');
    expect(entryHref({ ...base, mode: 'student', hasSession: true, mustChangePassword: true })).toBe('/doi-mat-khau');
    expect(entryHref({ ...base, mode: 'student', hasSession: true })).toBe('/(hoc-sinh)/hoc');
  });

  it('lets a student skip the language choice because the student area is Vietnamese only', () => {
    expect(entryHref({ ...base, chosenLanguage: null, mode: 'student' })).toBe('/dang-nhap');
  });
});
