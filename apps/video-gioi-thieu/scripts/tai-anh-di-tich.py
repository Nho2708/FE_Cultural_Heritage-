"""Tải ảnh di tích cho video quảng cáo từ Wikimedia Commons (danh sách ở kich-ban/quang-cao/anh.json) về public/anh-di-tich/.

Mỗi ảnh được kiểm giấy phép ngay lúc tải: nhận CC0, phạm vi công cộng, CC BY, CC BY-SA; gặp NC, ND hay giấy phép khác thì dừng.
Ảnh CC BY, CC BY-SA ghi công ở mô tả bài đăng (tác giả, giấy phép lấy từ nguon.json).
Ảnh thu về cạnh dài tối đa 3000 px, JPEG chất lượng 92. Ghi kèm public/anh-di-tich/nguon.json (tác giả, giấy phép, trang nguồn)
để đưa vào phần mô tả khi đăng video. Chạy: python scripts/tai-anh-di-tich.py (cần Pillow).
"""
import html, io, json, pathlib, re, sys, time, urllib.error, urllib.parse, urllib.request

from PIL import Image, ImageOps

GOC = pathlib.Path(__file__).resolve().parent.parent
DANH_SACH = GOC / "kich-ban" / "quang-cao" / "anh.json"
RA = GOC / "public" / "anh-di-tich"
API = "https://commons.wikimedia.org/w/api.php"
UA = {"User-Agent": "VietnamHeritageVideo/1.0 (student capstone project)"}
CANH_DAI = 3000


def thong_tin(tep):
    q = {"action": "query", "format": "json", "titles": tep, "prop": "imageinfo", "iiprop": "url|size|extmetadata"}
    with urllib.request.urlopen(urllib.request.Request(API + "?" + urllib.parse.urlencode(q), headers=UA), timeout=60) as r:
        trang = next(iter(json.load(r)["query"]["pages"].values()))
    if "imageinfo" not in trang:
        sys.exit(f"Không thấy {tep} trên Commons.")
    ii = trang["imageinfo"][0]
    md = ii.get("extmetadata", {})
    lay = lambda k: html.unescape(re.sub(r"<[^>]+>", "", md.get(k, {}).get("value", ""))).strip()
    return ii["url"], lay("LicenseShortName"), lay("Artist"), ii["descriptionurl"]


def tai(url):
    """Tải tệp gốc; Commons trả 429 khi tải dồn dập nên chờ theo Retry-After rồi thử lại."""
    for lan in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=300) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or lan == 5:
                raise
            time.sleep(int(e.headers.get("Retry-After") or 0) or 10 * (lan + 1))


def mo(giay_phep):
    g = giay_phep.lower()
    tu = g.replace("-", " ").split()
    if "nc" in tu or "nd" in tu:
        return False
    return g.startswith("cc0") or "public domain" in g or g == "pd" or g.startswith("cc by")


def main():
    RA.mkdir(parents=True, exist_ok=True)
    nguon = []
    for a in json.load(open(DANH_SACH, encoding="utf-8"))["anh"]:
        url, giay_phep, tac_gia, trang = thong_tin(a["tep"])
        if not mo(giay_phep):
            sys.exit(f"{a['tep']}: giấy phép {giay_phep!r}, không thuộc CC0, phạm vi công cộng, CC BY, CC BY-SA.")
        dich = RA / f"{a['id']}.jpg"
        if not dich.exists():
            time.sleep(3)  # Commons trả 429 khi tải dồn dập
            # Ảnh điện thoại thường lưu nằm ngang kèm cờ xoay EXIF: xoay đúng chiều trước khi thu nhỏ.
            anh = ImageOps.exif_transpose(Image.open(io.BytesIO(tai(url)))).convert("RGB")
            anh.thumbnail((CANH_DAI, CANH_DAI), Image.LANCZOS)
            anh.save(dich, "JPEG", quality=92, optimize=True)
        with Image.open(dich) as anh:
            co = anh.size
        nguon.append({"id": a["id"], "tep": a["tep"], "tacGia": tac_gia, "giayPhep": giay_phep, "trang": trang, "co": co})
        print(f"{a['id']}: {giay_phep}, {co[0]}x{co[1]}")
    json.dump(nguon, open(RA / "nguon.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
