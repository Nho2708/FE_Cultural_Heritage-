"""Nhạc nền cho video giới thiệu, nhóm tự tạo bằng code (không dùng nhạc của người khác nên không vướng giấy phép).

Thang ngũ cung (Đô, Rê, Fa, Sol, La) gảy như đàn tranh (thuật toán Karplus-Strong), nền là quãng năm êm,
một tiếng mõ gỗ nhẹ khi logo "đáp" và khi vào thẻ kết. Chạy: python scripts/tao-nhac.py (cần numpy).
"""
import pathlib
import wave

import numpy as np

SR = 44100
RA = pathlib.Path(__file__).resolve().parent.parent / "public" / "nhac"
RA.mkdir(parents=True, exist_ok=True)

NHIP = 84  # nhịp mỗi phút
PHACH = 60 / NHIP
NGU_CUNG = [0, 2, 5, 7, 9]  # Đô Rê Fa Sol La


def tan_so(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def gay(midi, dai, do_lon, rng, tat=0.996):
    """Một cao_do gảy dây: nhiễu đã làm mềm chạy qua vòng trễ có suy giảm."""
    n = max(2, int(SR / tan_so(midi)))
    L = int(dai * SR)
    z = np.zeros(L + 1)
    nhieu = rng.uniform(-1, 1, n)
    nhieu = np.convolve(nhieu, np.ones(4) / 4, mode="same")
    z[1 : n + 1] = nhieu[: min(n, L)]
    for s in range(n + 1, L + 1, n):
        e = min(s + n, L + 1)
        z[s:e] = tat * 0.5 * (z[s - n : e - n] + z[s - n - 1 : e - n - 1])
    y = z[1:]
    y *= np.minimum(1, np.arange(L) / (0.004 * SR))
    return y * do_lon


def nen(midi_list, dai, do_lon):
    t = np.arange(int(dai * SR)) / SR
    y = sum(np.sin(2 * np.pi * tan_so(m) * t) + 0.25 * np.sin(4 * np.pi * tan_so(m) * t) for m in midi_list)
    vao = np.minimum(1, t / 1.2)
    ra = np.minimum(1, (dai - t) / 1.0)
    return y * vao * np.clip(ra, 0, 1) * do_lon / len(midi_list)


def mo_go(do_lon):
    """Tiếng mõ gỗ: hai sóng sin tắt nhanh."""
    t = np.arange(int(0.35 * SR)) / SR
    y = np.sin(2 * np.pi * 820 * t) * np.exp(-t * 38) + 0.5 * np.sin(2 * np.pi * 1260 * t) * np.exp(-t * 55)
    return y * do_lon


def dat(tron, y, giay, pan=0.0):
    i = int(giay * SR)
    if i >= tron.shape[1]:
        return
    j = min(tron.shape[1], i + len(y))
    trai = np.sqrt(0.5 * (1 - pan))
    phai = np.sqrt(0.5 * (1 + pan))
    tron[0, i:j] += y[: j - i] * trai
    tron[1, i:j] += y[: j - i] * phai


def bai(dai, ket_luc, hat_giong):
    rng = np.random.default_rng(hat_giong)
    tron = np.zeros((2, int(dai * SR)))
    # Hợp âm nền mỗi 2 ô nhịp (8 phách): Đô, Fa, Sol, Đô (quãng năm).
    goc = [48, 53, 55, 48]
    o = PHACH * 8
    k = 0
    t = 2.4
    while t < dai:
        g = goc[k % 4]
        dat(tron, nen([g - 12, g, g + 7], min(o + 1.0, dai - t), 0.10), t)
        dat(tron, gay(g - 12, 2.5, 0.35, rng, 0.997), t, -0.2)
        t += o
        k += 1
    # Giai điệu: cao_do móc đơn theo bước ngẫu nhiên trên thang ngũ cung, câu 4 ô nhịp lặp lại có biến tấu.
    thang = [60 + d for d in NGU_CUNG] + [72 + d for d in NGU_CUNG] + [84]
    cau = []
    vi = 5
    for _ in range(32):
        vi = int(np.clip(vi + rng.choice([-2, -1, -1, 0, 1, 1, 2]), 0, len(thang) - 1))
        cau.append(thang[vi] if rng.random() > 0.28 else None)
    t = 2.4
    lan = 0
    while t < ket_luc - 1.0:
        for buoc, cao_do in enumerate(cau):
            tt = t + buoc * PHACH / 2
            if tt >= ket_luc - 1.0:
                break
            if cao_do is None:
                continue
            if lan % 2 == 1 and buoc % 8 == 7:
                cao_do = cao_do + (2 if cao_do + 2 in thang else 0)
            dat(tron, gay(cao_do, 1.8, 0.22 if buoc % 4 == 0 else 0.15, rng), tt, 0.25 if buoc % 2 else -0.05)
        t += len(cau) * PHACH / 2
        lan += 1
    # Mõ gỗ khi logo đáp và khi vào thẻ kết; hợp âm kết.
    dat(tron, mo_go(0.25), 1.25)
    dat(tron, mo_go(0.22), ket_luc)
    for i, m in enumerate([60, 67, 72, 74, 79]):
        dat(tron, gay(m, min(4.0, dai - ket_luc), 0.2, rng, 0.998), ket_luc + 0.06 * i, -0.3 + 0.15 * i)
    # Chuẩn hóa: đỉnh -3 dBFS.
    tron /= np.max(np.abs(tron)) / 0.7
    return tron


def ghi(ten, tron):
    du_lieu = (np.clip(tron.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(RA / ten), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(du_lieu.tobytes())
    print(ten, f"{tron.shape[1] / SR:.1f} s")


ghi("du-khach-60s.wav", bai(60, 56, 7))
ghi("du-khach-45s.wav", bai(45, 40, 7))
ghi("nha-truong-90s.wav", bai(90, 83, 11))
ghi("logo-3s.wav", bai(3, 1.25, 3))
