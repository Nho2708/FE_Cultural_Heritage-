"""Nhạc nền cho video quảng cáo, nhóm tự tạo bằng code (không vướng giấy phép), cùng chất liệu với nhạc video cũ (scripts/tao-nhac.py):
dây gảy kiểu đàn tranh trên thang ngũ cung, hợp âm nền quãng năm, tiếng mõ gỗ. Nhịp 120 phách mỗi phút để điểm cắt hình rơi đúng phách;
thứ tự cảnh lấy từ kich-ban/quang-cao/canh.json (dùng chung với src/quang-cao/nhip.ts).

Bố cục: cảnh mở đầu chỉ có nhịp đệm và một tiếng mõ; giai điệu vào từ cảnh thứ hai; mõ gỗ ở các cảnh trong danh sách "moGo";
vào thẻ kết thì dừng nhịp, rải hợp âm kết, mõ thêm một tiếng ở cảnh sau của thẻ kết, tắt dần trong giây cuối.
Sau cùng chuẩn hóa về -14 LUFS, đỉnh thật -1 dBTP (hai lượt loudnorm của ffmpeg đi kèm Remotion).
Ra: public/nhac/quang-cao-30s.wav. Chạy: python scripts/tao-nhac-quang-cao.py (cần numpy, Node.js).
"""
import importlib.util, json, pathlib, re, shutil, subprocess, sys, tempfile

import numpy as np

GOC = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("tao_nhac", GOC / "scripts" / "tao-nhac.py")
nhac = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(nhac)
SR, gay, nen, mo_go, dat = nhac.SR, nhac.gay, nhac.nen, nhac.mo_go, nhac.dat

BANG = json.load(open(GOC / "kich-ban" / "quang-cao" / "canh.json", encoding="utf-8"))
PHACH = 60 / BANG["nhipMoiPhut"]
DICH = -14.0
DINH_THAT = -1.0


def moc_canh(ds):
    t, moc = 0.0, {}
    for ten, phach in ds:
        moc[ten] = t
        t += phach * PHACH
    return moc, t


def bai(ds, hat_giong):
    rng = np.random.default_rng(hat_giong)
    moc, dai = moc_canh(ds)
    ket = moc["the-ket"]
    ket_sau = ket + 4 * PHACH
    tron = np.zeros((2, int(dai * SR)))
    # Nhịp đệm: dây trầm gảy ngắn mỗi phách, phách đầu mỗi ô (4 phách) mạnh hơn; tiếng gõ nhẹ ở nửa phách.
    t = 0.0
    while t < ket - 1e-6:
        manh = 0.42 if round(t / PHACH) % 4 == 0 else 0.26
        dat(tron, gay(36, 0.45, manh, rng, 0.99), t, 0.0)
        dat(tron, mo_go(0.035), t + PHACH / 2, 0.35)
        t += PHACH
    # Hợp âm nền mỗi 2 ô nhịp (8 phách): Đô, Fa, Sol, Rê theo quãng năm.
    goc = [48, 53, 55, 50]
    t, k = 0.0, 0
    while t < ket:
        g = goc[k % 4]
        dat(tron, nen([g - 12, g, g + 7], min(8 * PHACH + 0.6, ket - t + 0.6), 0.09), t)
        t += 8 * PHACH
        k += 1
    # Giai điệu móc đơn trên ngũ cung từ cảnh thứ hai, câu 2 ô nhịp lặp có biến tấu.
    thang = [60 + d for d in nhac.NGU_CUNG] + [72 + d for d in nhac.NGU_CUNG] + [84]
    cau, vi = [], 6
    for _ in range(16):
        vi = int(np.clip(vi + rng.choice([-2, -1, -1, 0, 1, 1, 2]), 0, len(thang) - 1))
        cau.append(thang[vi] if rng.random() > 0.22 else None)
    t, lan = moc["chi-tiet-bi-an"], 0
    while t < ket - 1e-6:
        for buoc, cao_do in enumerate(cau):
            tt = t + buoc * PHACH / 2
            if tt >= ket - 1e-6:
                break
            if cao_do is None:
                continue
            if lan % 2 == 1 and buoc >= 12:
                cao_do = thang[min(len(thang) - 1, thang.index(cao_do) + 1)]
            dat(tron, gay(cao_do, 1.4, 0.2 if buoc % 4 == 0 else 0.13, rng), tt, 0.25 if buoc % 2 else -0.1)
        t += len(cau) * PHACH / 2
        lan += 1
    # Mõ gỗ ở các cảnh được chọn và ở cảnh sau của thẻ kết; hợp âm kết rải.
    for ten in BANG["moGo"]:
        dat(tron, mo_go(0.24), moc[ten])
    dat(tron, mo_go(0.2), ket_sau)
    for i, m in enumerate([60, 67, 72, 74, 79]):
        dat(tron, gay(m, dai - ket, 0.2, rng, 0.998), ket + 0.06 * i, -0.3 + 0.15 * i)
    # Tắt dần trong giây cuối.
    duoi = int(1.0 * SR)
    tron[:, -duoi:] *= np.linspace(1, 0, duoi) ** 1.5
    # Nén đỉnh mềm để chuẩn hóa độ to không phải ép mạnh, rồi đưa đỉnh về -3 dBFS.
    tron = np.tanh(1.6 * tron / np.max(np.abs(tron))) / np.tanh(1.6) * 0.7
    return tron, dai


def ghi_wav(duong, tron):
    import wave

    du_lieu = (np.clip(tron.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(duong), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(du_lieu.tobytes())


def ffmpeg(*tham_so):
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    if not npx:
        sys.exit("Không thấy npx (cần Node.js).")
    return subprocess.run([npx, "remotion", "ffmpeg", "-hide_banner", "-nostats", *tham_so], cwd=GOC, capture_output=True, text=True, encoding="utf-8", errors="replace")


def chuan_hoa(vao, ra):
    """Hai lượt loudnorm: đo rồi chỉnh tuyến tính về -14 LUFS, đỉnh thật -1 dBTP."""
    loc = f"loudnorm=I={DICH}:TP={DINH_THAT}:LRA=11"
    do = ffmpeg("-i", str(vao), "-af", f"{loc}:print_format=json", "-f", "null", "-")
    so = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", do.stderr).group(0))
    loc2 = f"{loc}:measured_I={so['input_i']}:measured_TP={so['input_tp']}:measured_LRA={so['input_lra']}:measured_thresh={so['input_thresh']}:offset={so['target_offset']}:linear=true"
    kq = ffmpeg("-y", "-i", str(vao), "-af", loc2, "-ar", "48000", "-c:a", "pcm_s16le", str(ra))
    if kq.returncode != 0:
        sys.exit(kq.stderr[-800:])
    kiem = ffmpeg("-i", str(ra), "-af", f"{loc}:print_format=json", "-f", "null", "-")
    sau = json.loads(re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", kiem.stderr).group(0))
    print(f"trước: {so['input_i']} LUFS, đỉnh {so['input_tp']} dBTP → sau: {sau['input_i']} LUFS, đỉnh {sau['input_tp']} dBTP")


def main():
    tron, dai = bai(BANG["doc30"], 17)
    ra = GOC / "public" / "nhac" / "quang-cao-30s.wav"
    ra.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tam:
        tho = pathlib.Path(tam) / "tho.wav"
        ghi_wav(tho, tron)
        chuan_hoa(tho, ra)
    print(ra.name, f"{dai:.1f} s")


if __name__ == "__main__":
    main()
