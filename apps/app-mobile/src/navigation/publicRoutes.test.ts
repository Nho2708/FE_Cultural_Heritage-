import { publicHref } from './publicRoutes';

describe('publicHref', () => {
  it('opens the tabs of the visitor area for a visitor', () => {
    expect(publicHref('guest', 'search')).toBe('/(khach)/tim-kiem');
    expect(publicHref('guest', 'map', { chon: 'hue' })).toEqual({ pathname: '/(khach)/ban-do', params: { chon: 'hue' } });
  });

  it('opens the stand-alone screens for a student so the visitor tabs are never entered', () => {
    expect(publicHref('student', 'search', { q: 'chùa' })).toEqual({ pathname: '/tim-kiem-di-san', params: { q: 'chùa' } });
    expect(publicHref('student', 'map')).toBe('/ban-do-di-san');
  });

  it('opens the timeline picker as a tab for a visitor and as a stand-alone screen for a student', () => {
    expect(publicHref('guest', 'timeline')).toBe('/(khach)/dong-thoi-gian');
    expect(publicHref('student', 'timeline')).toBe('/dong-thoi-gian-di-san');
  });

  it('treats a missing mode as a visitor', () => {
    expect(publicHref(null, 'search')).toBe('/(khach)/tim-kiem');
  });
});
