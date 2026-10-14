"""Tạo giọng đọc tiếng Việt cho video nhà trường từ kịch bản (kich-ban/nha-truong.json, mục loiDoc).

Giọng: Piper (mã nguồn mở, chạy trên máy, không gửi chữ ra ngoài), mẫu giọng vi_VN-vais1000-medium
(dữ liệu VAIS-1000, giấy phép CC BY 4.0). Mỗi cảnh một tệp public/giong/nha-truong/<id cảnh>.wav;
giọng gốc đọc khá nhanh (khoảng 4,6 tiếng mỗi giây) nên kéo dài âm (length_scale 1,4); câu không vừa chỗ trống của cảnh thì giảm dần, nhanh nhất 0,9. Ghi độ dài từng tệp vào src/giong-doc.json để video
đặt tiếng đúng chỗ và hạ nhạc nền khi có lời.

Chạy: python scripts/tao-giong-doc.py            (cần: pip install piper-tts; tự tải mẫu giọng vào .cache/piper)
      python scripts/tao-giong-doc.py --chi-do   (không tạo lại, chỉ đo các tệp .wav đang có, ví dụ sau khi thay bằng giọng thu thật)
"""
import json
import pathlib
import sys
import urllib.request
import wave

GOC = pathlib.Path(__file__).resolve().parent.parent
KICH_BAN = GOC / "kich-ban" / "nha-truong.json"
RA = GOC / "public" / "giong" / "nha-truong"
DO = GOC / "src" / "giong-doc.json"
MAU = GOC / ".cache" / "piper" / "vi_VN-vais1000-medium.onnx"
NGUON_MAU = "https://huggingface.co/rhasspy/piper-voices/resolve/main/vi/vi_VN/vais1000/medium/"
TRE_VAO = 0.4  # giây sau khi cảnh bắt đầu
CHUA_CUOI = 0.5  # giây trống trước khi cảnh kết thúc


def do_dai(tep):
    with wave.open(str(tep)) as w:
        return w.getnframes() / w.getframerate()


def tai_mau():
    MAU.parent.mkdir(parents=True, exist_ok=True)
    for ten in (MAU.name, MAU.name + ".json"):
        dich = MAU.parent / ten
        if not dich.exists():
            print("tải", ten)
            urllib.request.urlretrieve(NGUON_MAU + ten, dich)


kb = json.loads(KICH_BAN.read_text(encoding="utf-8"))
canh = {c["id"]: c for c in kb["canh"]}
RA.mkdir(parents=True, exist_ok=True)
chi_do = "--chi-do" in sys.argv

if not chi_do:
    from piper import PiperVoice, SynthesisConfig

    tai_mau()
    giong = PiperVoice.load(str(MAU))
    for id_canh, cau in kb["loiDoc"].items():
        cho = canh[id_canh]["den"] - canh[id_canh]["tu"] - TRE_VAO - CHUA_CUOI
        tep = RA / f"{id_canh}.wav"
        for toc_do in (1.4, 1.25, 1.1, 1.0, 0.9):
            with wave.open(str(tep), "wb") as w:
                giong.synthesize_wav(cau, w, syn_config=SynthesisConfig(length_scale=toc_do))
            if do_dai(tep) <= cho:
                break
        print(f"{id_canh}: {do_dai(tep):.2f} giây / chỗ {cho:.2f} (tốc độ {toc_do})")

ket_qua = {}
for id_canh in kb["loiDoc"]:
    tep = RA / f"{id_canh}.wav"
    if tep.exists():
        ket_qua[id_canh] = {"batDau": round(canh[id_canh]["tu"] + TRE_VAO, 2), "dai": round(do_dai(tep), 2)}
DO.write_text(json.dumps(ket_qua, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
print("ghi", DO.relative_to(GOC), len(ket_qua), "đoạn")
