import type { LanguageCode, StudentProfile } from '@dsvhvn/dung-chung/api';
import type { AuthSnapshot } from '@dsvhvn/dung-chung/auth';
import { detectLanguage, parseLanguage } from '@dsvhvn/dung-chung/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { getLocales } from 'expo-localization';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../i18n';
import { KEYS, prefs } from '../storage/keyValue';
import { createServices, readStoredMode, type AppMode, type Services } from './services';

// Trạng thái toàn app: ngôn ngữ đã chọn, chế độ (Khách tham quan / Học sinh), cờ vị trí, các dịch vụ. Nạp từ máy lúc khởi động; trong lúc nạp
// app hiện màn hình chờ. Chế độ Học sinh luôn dùng tiếng Việt dù khách đã chọn ngôn ngữ khác; đổi về chế độ Khách thì ngôn ngữ đã chọn quay lại.

export interface AppState {
  /** Ngôn ngữ khách đã chọn; null ở lần mở đầu (chưa chọn). */
  chosenLanguage: LanguageCode | null;
  /** Ngôn ngữ đang áp cho giao diện và nội dung: tiếng Việt ở chế độ Học sinh. */
  language: LanguageCode;
  mode: AppMode | null;
  locationEnabled: boolean;
  services: Services;
  chooseLanguage: (code: LanguageCode) => void;
  chooseMode: (mode: AppMode) => void;
  setLocationEnabled: (enabled: boolean) => void;
  /** Đăng xuất học sinh (xóa token trên máy này). */
  signOut: () => void;
}

const AppContext = createContext<AppState | null>(null);

export function useApp(): AppState {
  const value = useContext(AppContext);
  if (!value) throw new Error('useApp phải nằm trong AppProvider.');
  return value;
}

export function useServices(): Services {
  return useApp().services;
}

/** Phiên đăng nhập hiện tại của học sinh (session null khi chưa đăng nhập). Tự cập nhật khi đăng nhập, đổi mật khẩu, đăng xuất, hết hạn. */
export function useAuth(): AuthSnapshot<StudentProfile> {
  const { sessionStore } = useServices();
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getSnapshot, sessionStore.getSnapshot);
}

interface Loaded {
  chosenLanguage: LanguageCode | null;
  mode: AppMode | null;
  locationEnabled: boolean;
  services: Services;
}

export function AppProvider({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const modeRef = useRef<AppMode | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [storedLanguage, mode, location] = await Promise.all([prefs.get(KEYS.language), readStoredMode(), prefs.get(KEYS.location)]);
      modeRef.current = mode;
      const services = await createServices(() => modeRef.current);
      const chosenLanguage = parseLanguage(storedLanguage) ?? null;
      // Đặt ngôn ngữ trước khi vẽ màn hình đầu tiên để không nháy bằng tiếng Việt.
      await i18n.changeLanguage(mode === 'student' ? 'vi' : (chosenLanguage ?? deviceLanguage()));
      if (cancelled) return;
      setLoaded({ chosenLanguage, mode, locationEnabled: location === '1', services });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loaded) return <>{fallback}</>;
  return (
    <Ready initial={loaded} modeRef={modeRef}>
      {children}
    </Ready>
  );
}

function deviceLanguage(): LanguageCode {
  try {
    return detectLanguage(getLocales().map((locale) => locale.languageTag));
  } catch {
    return 'en';
  }
}

function Ready({ initial, modeRef, children }: { initial: Loaded; modeRef: { current: AppMode | null }; children: ReactNode }) {
  const [chosenLanguage, setChosenLanguage] = useState(initial.chosenLanguage);
  const [mode, setMode] = useState(initial.mode);
  const [locationEnabled, setLocation] = useState(initial.locationEnabled);
  const { services } = initial;
  const queryClient = useQueryClient();
  const snapshot = useSyncExternalStore(services.sessionStore.subscribe, services.sessionStore.getSnapshot, services.sessionStore.getSnapshot);
  const userId = snapshot.session?.user.id ?? null;
  const previousUserId = useRef(userId);

  // Đăng xuất hoặc đổi học sinh thì bỏ dữ liệu học tập đã tải của người trước.
  useEffect(() => {
    if (previousUserId.current === userId) return;
    previousUserId.current = userId;
    queryClient.removeQueries({ queryKey: ['student'] });
  }, [userId, queryClient]);

  const language: LanguageCode = mode === 'student' ? 'vi' : (chosenLanguage ?? deviceLanguage());

  useEffect(() => {
    if (i18n.language !== language) void i18n.changeLanguage(language);
  }, [language]);

  const chooseLanguage = useCallback((code: LanguageCode) => {
    setChosenLanguage(code);
    void prefs.set(KEYS.language, code);
  }, []);

  const chooseMode = useCallback(
    (next: AppMode) => {
      modeRef.current = next;
      setMode(next);
      void prefs.set(KEYS.mode, next);
      // Rời chế độ Học sinh thì kết thúc phiên: token không ở lại trên máy khi không còn dùng.
      if (next === 'guest') services.sessionStore.clear();
    },
    [modeRef, services],
  );

  const setLocationEnabled = useCallback((enabled: boolean) => {
    setLocation(enabled);
    void prefs.set(KEYS.location, enabled ? '1' : '0');
  }, []);

  const signOut = useCallback(() => services.sessionStore.clear(), [services]);

  const value = useMemo<AppState>(
    () => ({ chosenLanguage, language, mode, locationEnabled, services, chooseLanguage, chooseMode, setLocationEnabled, signOut }),
    [chosenLanguage, language, mode, locationEnabled, services, chooseLanguage, chooseMode, setLocationEnabled, signOut],
  );

  return (
    <AppContext.Provider value={value}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </AppContext.Provider>
  );
}
