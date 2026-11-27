// Bản không quảng cáo không có mã gốc của thư viện quảng cáo: app không được nạp thư viện, coi như không có quảng cáo và không có lựa chọn quảng cáo nào.

let mockLoads = 0;

jest.mock('react-native-google-mobile-ads', () => {
  mockLoads += 1;
  return {
    __esModule: true,
    default: () => ({ initialize: async () => undefined, setRequestConfiguration: async () => undefined }),
    MaxAdContentRating: { G: 'G' },
    AgeRestrictedTreatment: { CHILD: 'CHILD' },
  };
});

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { executionEnvironment: 'standalone', expoConfig: { version: '0.1.0' } },
  ExecutionEnvironment: { StoreClient: 'storeClient', Standalone: 'standalone', Bare: 'bare' },
}));

function loadRewarded(disabled: boolean): typeof import('./rewarded') {
  if (disabled) process.env.EXPO_PUBLIC_ADS_DISABLED = 'true';
  else delete process.env.EXPO_PUBLIC_ADS_DISABLED;
  let rewarded!: typeof import('./rewarded');
  jest.isolateModules(() => {
    rewarded = require('./rewarded');
  });
  return rewarded;
}

describe('bản không quảng cáo', () => {
  const saved = process.env.EXPO_PUBLIC_ADS_DISABLED;
  beforeEach(() => {
    mockLoads = 0;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.EXPO_PUBLIC_ADS_DISABLED;
    else process.env.EXPO_PUBLIC_ADS_DISABLED = saved;
  });

  it('không nạp thư viện quảng cáo và không có quảng cáo nào', async () => {
    const rewarded = loadRewarded(true);
    expect(rewarded.adsAvailable()).toBe(false);
    await expect(rewarded.prepareAds()).resolves.toBe(false);
    await expect(rewarded.privacyOptionsState()).resolves.toBe('unavailable');
    await expect(rewarded.showRewardedAd('ca-app-pub-1/2', 'thiet-bi', 1)).resolves.toBe('unavailable');
    expect(mockLoads).toBe(0);
  });

  it('bản dựng thường vẫn nạp thư viện quảng cáo', () => {
    const rewarded = loadRewarded(false);
    expect(rewarded.adsAvailable()).toBe(true);
    expect(mockLoads).toBe(1);
  });
});
