import type { LoginResult } from '../api/types';

// Phiên đăng nhập dùng chung cho tầng gọi API (ngoài React) và giao diện (useSyncExternalStore).
//
// Chỉ có access token hạn 8 giờ, không có refresh token: hết hạn thì đăng nhập lại, đăng xuất là xóa token trên
// trình duyệt. Mỗi ứng dụng tự chọn nơi lưu: web quản trị dùng localStorage (giữ đăng nhập khi tải lại trang, đồng bộ
// nhiều tab qua sự kiện "storage"); web học tập dùng sessionStorage vì học sinh hay dùng chung máy của trường.
// Chống XSS dựa vào việc không chèn HTML thô và CSP.

export interface Session<U> {
  accessToken: string;
  /** Thời điểm hết hạn của access token, mili giây kể từ epoch. */
  expiresAt: number;
  user: U;
}

export interface AuthSnapshot<U> {
  session: Session<U> | null;
  /**
   * Nơi chuyển tới ngay sau một lần đổi trạng thái đăng nhập: vừa đăng nhập (trang mặc định hoặc trang bị chặn trước
   * đó) hoặc vừa đăng xuất. Route guard dùng một lần; layout gốc xóa khi đã chuyển trang.
   */
  landing: string | null;
  /** Câu hiện trên màn hình đăng nhập khi phiên bị kết thúc, ví dụ tài khoản bị khóa giữa phiên hoặc phiên hết hạn. */
  notice: string | null;
}

export interface SessionStoreOptions<U> {
  storage: Storage | null;
  /** Khóa lưu phiên trong storage. */
  key: string;
  /** Kiểm hồ sơ đọc lại từ storage đúng khuôn (bỏ dữ liệu hỏng hoặc khuôn cũ). */
  isUser: (value: unknown) => value is U;
  now?: () => number;
  /** Câu hiện ở màn hình đăng nhập khi phiên đang mở tự hết hạn; null thì không hiện gì. */
  expiredNotice?: string | null;
}

type Listener = () => void;

export function sessionFromLogin<U>(result: LoginResult<U>): Session<U> {
  return { accessToken: result.accessToken, expiresAt: Date.parse(result.expiresAt), user: result.user };
}

/** localStorage / sessionStorage nếu trình duyệt cho dùng, không thì null (chế độ riêng tư, cấu hình bảo mật). */
export function browserStorage(kind: 'local' | 'session'): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export class SessionStore<U> {
  private snapshot: AuthSnapshot<U>;
  private readonly listeners = new Set<Listener>();
  private readonly storage: Storage | null;
  private readonly now: () => number;
  private readonly isUser: (value: unknown) => value is U;
  private readonly expiredNotice: string | null;
  readonly key: string;

  constructor({ storage, key, isUser, now = Date.now, expiredNotice = null }: SessionStoreOptions<U>) {
    this.storage = storage;
    this.key = key;
    this.isUser = isUser;
    this.now = now;
    this.expiredNotice = expiredNotice;
    this.snapshot = { session: this.read(), landing: null, notice: null };
  }

  getSnapshot = (): AuthSnapshot<U> => this.snapshot;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** Phiên còn hạn, hoặc null. Phiên đã quá hạn bị xóa ngay để giao diện về trạng thái Khách. */
  getSession(): Session<U> | null {
    const session = this.snapshot.session;
    if (session && session.expiresAt <= this.now()) {
      this.clear(this.expiredNotice);
      return null;
    }
    return session;
  }

  /** Lưu phiên mới (đăng nhập, đổi mật khẩu). `landing` chỉ đặt khi vừa đăng nhập. */
  setSession(session: Session<U>, landing: string | null = this.snapshot.landing): void {
    this.write(session);
    this.emit({ session, landing, notice: null });
  }

  /** Đổi mật khẩu: máy chủ cấp access token mới, hồ sơ giữ nguyên. */
  replaceToken(accessToken: string, expiresAt: number): void {
    const current = this.snapshot.session;
    if (current) this.setSession({ ...current, accessToken, expiresAt });
  }

  updateUser(user: U): void {
    const current = this.snapshot.session;
    if (current) this.setSession({ ...current, user });
  }

  /** Kết thúc phiên trên máy này. `notice` hiện ở màn hình đăng nhập; `landing` là trang chuyển tới ngay sau đó. */
  clear(notice: string | null = null, landing: string | null = null): void {
    this.write(null);
    this.emit({ session: null, landing, notice });
  }

  clearLanding(): void {
    if (this.snapshot.landing !== null) this.emit({ ...this.snapshot, landing: null });
  }

  clearNotice(): void {
    if (this.snapshot.notice !== null) this.emit({ ...this.snapshot, notice: null });
  }

  /** Đọc lại từ storage — khi tab khác vừa đăng nhập, đăng xuất hoặc đổi mật khẩu. */
  reload(): Session<U> | null {
    const session = this.read();
    if (session?.accessToken !== this.snapshot.session?.accessToken) this.emit({ session, landing: null, notice: null });
    return session;
  }

  private isSession(value: unknown): value is Session<U> {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    return typeof v.accessToken === 'string' && typeof v.expiresAt === 'number' && this.isUser(v.user);
  }

  private read(): Session<U> | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.key);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      if (!this.isSession(parsed) || parsed.expiresAt <= this.now()) {
        this.storage.removeItem(this.key);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private write(session: Session<U> | null): void {
    if (!this.storage) return;
    try {
      if (session) this.storage.setItem(this.key, JSON.stringify(session));
      else this.storage.removeItem(this.key);
    } catch {
      // Hết chỗ hoặc bị chặn: phiên vẫn dùng được trong tab hiện tại.
    }
  }

  private emit(next: AuthSnapshot<U>): void {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

/** Kiểm khuôn tối thiểu của một hồ sơ đọc lại từ storage: có id, vai trò, cờ buộc đổi mật khẩu. */
export function isProfileLike(value: unknown): value is { id: number; role: string; mustChangePassword: boolean } {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.role === 'string' && typeof v.mustChangePassword === 'boolean';
}
