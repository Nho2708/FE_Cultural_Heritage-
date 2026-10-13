import { privacyOptionsStateOf } from './consent';

describe('privacy options of the ad consent form', () => {
  it('offers the button only when Google says the region requires the choice', () => {
    expect(privacyOptionsStateOf('REQUIRED')).toBe('required');
  });

  it('explains that nothing needs reopening where consent is not required', () => {
    expect(privacyOptionsStateOf('NOT_REQUIRED')).toBe('not-required');
  });

  it('never shows the button for an unknown or missing status', () => {
    for (const status of ['UNKNOWN', undefined, null, 'required', 1]) expect(privacyOptionsStateOf(status)).toBe('failed');
  });
});
