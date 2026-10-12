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

  it('treats a missing mode as a visitor', () => {
    expect(publicHref(null, 'search')).toBe('/(khach)/tim-kiem');
  });
});
