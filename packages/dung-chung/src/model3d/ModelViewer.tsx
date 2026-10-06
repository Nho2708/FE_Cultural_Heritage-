import { useCallback, useEffect, useRef, useState, type CSSProperties, type DetailedHTMLProps, type ReactNode, type Ref } from 'react';
import { cn } from '../cn';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';
import { loadModelViewerElement, prefersReducedMotion, supportsWebGL } from './webgl';

// Trình xem 3D dùng chung của web quản trị (xem trước ngay trong tab Mô hình 3D) và web học tập (nút "Xem 3D" ở chi tiết di sản): bọc thành
// phần `<model-viewer>` chính thức của Google (glTF 2.0 / .glb). Kéo để xoay, cuộn hoặc chụm để phóng to, thu nhỏ, phím mũi tên để xoay, nút
// "Đặt lại góc nhìn", thanh tiến trình khi tải. Chữ giao diện do nơi dùng truyền vào (web quản trị chỉ tiếng Việt, web học tập năm ngôn ngữ).
// Thiết bị không vẽ được 3D hoặc tải lỗi thì không hiện gì mà gọi `fallback`: nơi dùng quay về bộ ảnh của di sản kèm thông báo.

export interface ModelViewerLabels {
  /** Tên của khung xem cho trình đọc màn hình, ví dụ "Mô hình 3D của Hoàng thành Thăng Long". */
  viewerAria: string;
  loading: string;
  progress: (percent: number) => string;
  resetView: string;
  /** Hướng dẫn thao tác, hiện dưới khung xem. */
  hint: string;
}

export type ModelViewerFailure = 'unsupported' | 'load-error';

export interface ModelViewerProps {
  /** Địa chỉ mở được từ trình duyệt của tệp .glb. */
  src: string;
  /** Ảnh hiện trong lúc mô hình đang tải. */
  poster?: string | null;
  labels: ModelViewerLabels;
  /** Hiện thay cho trình xem khi thiết bị không hỗ trợ hoặc tải lỗi (`onFailure` cho biết lý do). */
  fallback: ReactNode;
  onFailure?: (reason: ModelViewerFailure) => void;
  onLoaded?: () => void;
  /** Lớp của khung xem (cần có chiều cao). */
  className?: string;
}

/** Các thành phần của `<model-viewer>` mà trình xem dùng. */
interface ModelViewerElement extends HTMLElement {
  cameraOrbit: string;
  cameraTarget: string;
  fieldOfView: string;
}

const HOME_ORBIT = '0deg 75deg 105%';

const VIEWER_STYLE = { width: '100%', height: '100%', '--progress-bar-height': '0px', '--poster-color': 'transparent' } as CSSProperties;

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<React.HTMLAttributes<ModelViewerElement>, ModelViewerElement> & {
        alt?: string;
        ref?: Ref<ModelViewerElement>;
        src?: string;
        poster?: string;
        'camera-controls'?: boolean;
        'touch-action'?: string;
        'interaction-prompt'?: string;
        'shadow-intensity'?: string;
        'camera-orbit'?: string;
        'auto-rotate'?: boolean;
        'auto-rotate-delay'?: string;
      };
    }
  }
}

/** Trình xem 3D. Đổi `src` thì dựng lại từ đầu (tiến trình, trạng thái tải, góc nhìn). */
export function ModelViewer(props: ModelViewerProps) {
  return <Viewer key={props.src} {...props} />;
}

function Viewer({ src, poster, labels, fallback, onFailure, onLoaded, className }: ModelViewerProps) {
  const [defined, setDefined] = useState(false);
  const [unsupported] = useState(() => !supportsWebGL());
  const [loadFailed, setLoadFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [element, setElement] = useState<ModelViewerElement | null>(null);
  const elementRef = useRef<ModelViewerElement | null>(null);
  const resets = useRef(0);
  const callbacks = useRef({ onFailure, onLoaded });
  const failure: ModelViewerFailure | null = unsupported ? 'unsupported' : loadFailed ? 'load-error' : null;

  useEffect(() => {
    callbacks.current = { onFailure, onLoaded };
  });

  const fail = useCallback(() => {
    setLoadFailed(true);
    callbacks.current.onFailure?.('load-error');
  }, []);

  // Nạp thành phần `<model-viewer>`; thiết bị không có WebGL thì không nạp (thư viện nặng, vô ích).
  useEffect(() => {
    if (unsupported) {
      callbacks.current.onFailure?.('unsupported');
      return;
    }
    let cancelled = false;
    loadModelViewerElement().then(
      () => {
        if (!cancelled) setDefined(true);
      },
      () => {
        if (!cancelled) fail();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [unsupported, fail]);

  // Nghe tiến trình, tải xong và lỗi của phần tử. Phần tử có thể đã tải xong trước khi kịp nghe (tệp có sẵn trong bộ nhớ đệm).
  useEffect(() => {
    if (!element) return;
    const done = () => {
      setProgress(1);
      setLoaded(true);
      callbacks.current.onLoaded?.();
    };
    const onProgress = (event: Event) => {
      const total = (event as CustomEvent<{ totalProgress?: number }>).detail?.totalProgress;
      if (typeof total === 'number') setProgress(Math.max(0, Math.min(1, total)));
    };
    element.addEventListener('progress', onProgress);
    element.addEventListener('load', done);
    element.addEventListener('error', fail);
    if ((element as { loaded?: boolean }).loaded === true) done();
    return () => {
      element.removeEventListener('progress', onProgress);
      element.removeEventListener('load', done);
      element.removeEventListener('error', fail);
    };
  }, [element, fail]);

  const attach = useCallback((node: ModelViewerElement | null) => {
    elementRef.current = node;
    setElement(node);
  }, []);

  /** Về góc nhìn ban đầu. Đặt cùng một chuỗi hai lần liên tiếp thì thư viện không đổi gì nên xen kẽ hai giá trị lệch nhau 0,001 độ. */
  const resetView = () => {
    const target = elementRef.current;
    if (!target) return;
    resets.current += 1;
    target.cameraOrbit = `${(resets.current % 2) * 0.001}deg 75deg 105%`;
    target.cameraTarget = 'auto auto auto';
    target.fieldOfView = 'auto';
  };

  if (failure) return <>{fallback}</>;

  const percent = Math.round(progress * 100);
  const autoRotate = !prefersReducedMotion();

  return (
    <div className="flex flex-col gap-3">
      <div className={cn('relative overflow-hidden rounded-md bg-surface-container-high', className)}>
        {defined && (
          <model-viewer
            ref={attach}
            src={src}
            alt={labels.viewerAria}
            poster={poster ?? undefined}
            camera-controls
            touch-action="pan-y"
            interaction-prompt="none"
            shadow-intensity="1"
            camera-orbit={HOME_ORBIT}
            auto-rotate={autoRotate ? true : undefined}
            auto-rotate-delay={autoRotate ? '4000' : undefined}
            style={VIEWER_STYLE}
          />
        )}
        {!loaded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-surface/85 px-4 py-3">
            <p aria-live="polite" className="type-label text-on-surface">
              {defined && progress > 0 ? labels.progress(percent) : labels.loading}
            </p>
            <progress
              aria-label={labels.loading}
              max={100}
              value={percent}
              className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-surface-container-highest [&::-webkit-progress-value]:bg-primary"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-3 dsvsm:flex-row dsvsm:items-center dsvsm:justify-between">
        <p className="min-w-0 flex-1 type-body-s text-on-surface-variant">{labels.hint}</p>
        <Button variant="secondary" size="sm" className="self-start" onClick={resetView} disabled={!loaded}>
          <Icon name="refresh" size={16} />
          {labels.resetView}
        </Button>
      </div>
    </div>
  );
}
