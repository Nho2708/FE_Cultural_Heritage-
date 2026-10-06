// Trình duyệt có vẽ được đồ họa 3D (WebGL) không. Trình xem 3D cần WebGL; không có thì quay về bộ ảnh của di sản.

export function supportsWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Người dùng đã tắt hiệu ứng chuyển động: trình xem không tự xoay mô hình. */
export function prefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Thư viện thành phần `<model-viewer>` (Google) chỉ nạp khi trình xem được mở lần đầu: nó kéo theo thư viện đồ họa nặng. */
let loading: Promise<unknown> | null = null;
export function loadModelViewerElement(): Promise<unknown> {
  loading ??= import('@google/model-viewer').catch((error: unknown) => {
    loading = null;
    throw error;
  });
  return loading;
}
