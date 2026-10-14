"""Chuẩn bị ảnh khách du lịch cho video: cắt khung "Gợi ý cho bạn" từ ảnh Trang chủ dài, rồi thu mọi ảnh về rộng 600 px
(khung điện thoại trong video rộng dưới 600 px; ảnh gốc rộng 1081 px và dài tới 35.000 px làm dựng video rất chậm)."""
import json
import pathlib

from PIL import Image

Image.MAX_IMAGE_PIXELS = None
GOC = pathlib.Path(__file__).resolve().parent.parent / "public" / "man-hinh" / "du-khach"
RONG = 600
ds = json.loads((GOC / "danh-sach.json").read_text(encoding="utf-8"))
cao_khung = round(ds["khung"]["cao"] * ds["khung"]["tyLe"])
for ngon_ngu, thong_tin in ds["ngonNgu"].items():
    thu_muc = GOC / ngon_ngu
    dai = thu_muc / "03-trang-chu-dai.png"
    y = thong_tin["tep"].get("03-trang-chu-dai.png", {}).get("toaDoY", {}).get("goiY")
    if dai.exists() and y is not None:
        im = Image.open(dai)
        if im.width > RONG:
            tren = max(0, y - 60)
            im.crop((0, tren, im.width, tren + cao_khung)).save(thu_muc / "03b-goi-y.png")
    for tep in sorted(thu_muc.glob("*.png")):
        im = Image.open(tep)
        if im.width <= RONG:
            continue
        cao = round(im.height * RONG / im.width)
        im.convert("RGB").resize((RONG, cao), Image.LANCZOS).save(tep, optimize=True)
        print(ngon_ngu, tep.name, im.size, "->", (RONG, cao))
