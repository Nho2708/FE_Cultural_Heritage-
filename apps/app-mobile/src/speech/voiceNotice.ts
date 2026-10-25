// Lời báo "Máy này chưa đọc được tiếng Việt": hiện một lần mỗi lần mở app khi máy chủ chưa có tiếng và điện thoại không có giọng tiếng Việt. Không chặn
// thao tác, tự tắt sau vài giây. Giữ ở một kho nhỏ để nơi nào đọc không được cũng báo được, còn khung hiện lời báo đặt một lần ở gốc app.

const VISIBLE_MS = 6000;

type Listener = () => void;

let shown = false;
let visible = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<Listener>();

function set(next: boolean): void {
  if (visible === next) return;
  visible = next;
  for (const listener of listeners) listener();
}

/** Báo "Máy này chưa đọc được tiếng Việt" nếu lần mở app này chưa báo. */
export function announceNoVietnameseVoice(): void {
  if (shown) return;
  shown = true;
  set(true);
  clearTimeout(timer);
  timer = setTimeout(() => set(false), VISIBLE_MS);
}

export function dismissVoiceNotice(): void {
  clearTimeout(timer);
  set(false);
}

export function subscribeVoiceNotice(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVoiceNoticeVisible(): boolean {
  return visible;
}

/** Chỉ cho test: đưa lời báo về như mới mở app. */
export function resetVoiceNotice(): void {
  clearTimeout(timer);
  shown = false;
  set(false);
}
