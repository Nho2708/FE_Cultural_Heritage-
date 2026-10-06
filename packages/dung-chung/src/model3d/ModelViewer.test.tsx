import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ModelViewer, type ModelViewerLabels } from './ModelViewer';
import * as webgl from './webgl';

// Thư viện `<model-viewer>` thật cần WebGL nên test thay bằng phần tử tự đăng ký: kiểm cách trình xem gắn thuộc tính, nghe sự kiện tiến trình,
// tải xong, lỗi, đặt lại góc nhìn và quay về phương án thay thế. Chạy thật trên trình duyệt ở smoke test.

vi.mock('@google/model-viewer', () => ({}));

const labels: ModelViewerLabels = {
  viewerAria: 'Mô hình 3D của Ngọ Môn',
  loading: 'Đang tải mô hình 3D…',
  progress: (percent) => `Đang tải mô hình 3D: ${percent}%`,
  resetView: 'Đặt lại góc nhìn',
  hint: 'Kéo để xoay.',
};

class FakeModelViewer extends HTMLElement {
  cameraOrbit = '0deg 75deg 105%';
  cameraTarget = 'auto auto auto';
  fieldOfView = 'auto';
}

const element = () => document.querySelector('model-viewer') as FakeModelViewer;

afterEach(cleanup);

beforeEach(() => {
  if (!customElements.get('model-viewer')) customElements.define('model-viewer', FakeModelViewer);
  vi.spyOn(webgl, 'supportsWebGL').mockReturnValue(true);
  vi.spyOn(webgl, 'prefersReducedMotion').mockReturnValue(false);
});

function renderViewer(extra: Partial<React.ComponentProps<typeof ModelViewer>> = {}) {
  return render(
    <ModelViewer
      src="http://localhost:5080/files/models/abc.glb"
      poster="http://localhost:5080/files/images/poster.jpg"
      labels={labels}
      fallback={<p role="alert">thay thế</p>}
      {...extra}
    />,
  );
}

describe('trình xem 3D dùng chung', () => {
  it('dựng thành phần với tệp, ảnh xem trước, điều khiển camera và tên cho trình đọc màn hình', async () => {
    renderViewer();
    await waitFor(() => expect(element()).not.toBeNull());
    expect(element().getAttribute('src')).toBe('http://localhost:5080/files/models/abc.glb');
    expect(element().getAttribute('poster')).toBe('http://localhost:5080/files/images/poster.jpg');
    expect(element().getAttribute('alt')).toBe('Mô hình 3D của Ngọ Môn');
    expect(element().hasAttribute('camera-controls')).toBe(true);
    expect(element().hasAttribute('auto-rotate')).toBe(true);
    expect(screen.getByText('Kéo để xoay.')).toBeInTheDocument();
  });

  it('người tắt chuyển động thì mô hình không tự xoay', async () => {
    vi.spyOn(webgl, 'prefersReducedMotion').mockReturnValue(true);
    renderViewer();
    await waitFor(() => expect(element()).not.toBeNull());
    expect(element().hasAttribute('auto-rotate')).toBe(false);
  });

  it('hiện thanh tiến trình theo sự kiện, mất khi tải xong và mở nút đặt lại góc nhìn', async () => {
    const onLoaded = vi.fn<() => void>();
    renderViewer({ onLoaded });
    await waitFor(() => expect(element()).not.toBeNull());
    expect((screen.getByRole('progressbar') as HTMLProgressElement).value).toBe(0);
    expect(screen.getByRole('button', { name: 'Đặt lại góc nhìn' })).toBeDisabled();

    act(() => {
      element().dispatchEvent(new CustomEvent('progress', { detail: { totalProgress: 0.42 } }));
    });
    expect((screen.getByRole('progressbar') as HTMLProgressElement).value).toBe(42);
    expect(screen.getByText('Đang tải mô hình 3D: 42%')).toBeInTheDocument();

    act(() => {
      element().dispatchEvent(new Event('load'));
    });
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Đặt lại góc nhìn' })).toBeEnabled();
  });

  it('đặt lại góc nhìn về góc ban đầu, kể cả bấm liên tiếp', async () => {
    const user = userEvent.setup();
    renderViewer();
    await waitFor(() => expect(element()).not.toBeNull());
    act(() => {
      element().dispatchEvent(new Event('load'));
    });
    element().cameraOrbit = '90deg 40deg 50%';
    element().fieldOfView = '30deg';
    await user.click(screen.getByRole('button', { name: 'Đặt lại góc nhìn' }));
    const first = element().cameraOrbit;
    expect(first).toMatch(/^0(\.001)?deg 75deg 105%$/);
    expect(element().fieldOfView).toBe('auto');
    expect(element().cameraTarget).toBe('auto auto auto');

    await user.click(screen.getByRole('button', { name: 'Đặt lại góc nhìn' }));
    // Giá trị phải đổi giữa hai lần bấm, nếu không thư viện coi là không có gì mới.
    expect(element().cameraOrbit).not.toBe(first);
    expect(element().cameraOrbit).toMatch(/^0(\.001)?deg 75deg 105%$/);
  });

  it('tải lỗi thì quay về phương án thay thế và báo cho nơi dùng', async () => {
    const onFailure = vi.fn<(reason: string) => void>();
    renderViewer({ onFailure });
    await waitFor(() => expect(element()).not.toBeNull());
    act(() => {
      element().dispatchEvent(new CustomEvent('error', { detail: { type: 'loadfailure' } }));
    });
    expect(screen.getByRole('alert')).toHaveTextContent('thay thế');
    expect(document.querySelector('model-viewer')).toBeNull();
    expect(onFailure).toHaveBeenCalledWith('load-error');
  });

  it('thiết bị không hỗ trợ 3D thì quay về phương án thay thế ngay, không nạp thư viện', async () => {
    vi.spyOn(webgl, 'supportsWebGL').mockReturnValue(false);
    const load = vi.spyOn(webgl, 'loadModelViewerElement');
    const onFailure = vi.fn<(reason: string) => void>();
    renderViewer({ onFailure });
    expect(screen.getByRole('alert')).toHaveTextContent('thay thế');
    await waitFor(() => expect(onFailure).toHaveBeenCalledWith('unsupported'));
    expect(load).not.toHaveBeenCalled();
  });

  it('không nạp được thư viện thì cũng quay về phương án thay thế', async () => {
    vi.spyOn(webgl, 'loadModelViewerElement').mockRejectedValue(new Error('mạng lỗi'));
    renderViewer();
    expect(await screen.findByRole('alert')).toHaveTextContent('thay thế');
  });
});
