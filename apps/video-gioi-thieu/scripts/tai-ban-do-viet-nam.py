"""Bản đồ toàn quốc Việt Nam cho cảnh mở app của video quảng cáo (màn hình điện thoại hiện cả nước rồi phóng vào Hội An).

Nguồn: Natural Earth, lớp ranh giới quốc gia tỉ lệ 1:10 triệu theo góc nhìn của Việt Nam (ne_10m_admin_0_countries_vnm),
thuộc phạm vi công cộng. Lớp này vẽ quần đảo Hoàng Sa và Trường Sa thuộc Việt Nam.
Toạ độ đổi sang mét quanh điểm di sản Đô thị cổ Hội An bằng đúng phép chiếu của scripts/tai-ban-do.py (gốc 0,0; trục y hướng xuống),
để lớp cả nước nằm khớp dưới lớp đường phố khi phóng vào.
Ra public/ban-do/viet-nam.json (không đưa vào git): vietNam (đất liền và đảo lớn), dao (các đảo nhỏ, vẽ thành chấm khi ở xa), lanCan (nước láng giềng).
Chạy: python scripts/tai-ban-do-viet-nam.py
"""
import json, math, pathlib, sys, urllib.request

sys.setrecursionlimit(20000)

GOC = pathlib.Path(__file__).resolve().parent.parent
RA = GOC / "public" / "ban-do" / "viet-nam.json"
NGUON = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_vnm.geojson"
UA = {"User-Agent": "VietnamHeritageVideo/1.0 (student capstone project)"}

# Cùng gốc và phép chiếu với scripts/tai-ban-do.py.
LAT0, LON0 = 15.877135, 108.328631
MET_LAT = 110_540
MET_LON = 111_320 * math.cos(math.radians(LAT0))
# Vùng giữ lại (độ): đủ cho khung nhìn cả nước kể cả Trường Sa, cắt bớt nước láng giềng ở xa.
TAY, DONG, NAM, BAC = 94.0, 123.0, -3.0, 35.0
SAI_SO = 120  # mét, cho Douglas-Peucker; nhỏ hơn độ chính xác của lớp 1:10 triệu
DAO_NHO = 25e6  # m²: đảo nhỏ hơn thì vào danh sách chấm


def chieu(lon, lat):
    return (lon - LON0) * MET_LON, -(lat - LAT0) * MET_LAT


def don_gian(diem, sai_so):
    if len(diem) < 3:
        return diem
    (x1, y1), (x2, y2) = diem[0], diem[-1]
    dx, dy = x2 - x1, y2 - y1
    d = math.hypot(dx, dy) or 1e-9
    xa, chi_so = 0.0, 0
    for i in range(1, len(diem) - 1):
        k = abs(dy * diem[i][0] - dx * diem[i][1] + x2 * y1 - y2 * x1) / d
        if k > xa:
            xa, chi_so = k, i
    if xa <= sai_so:
        return [diem[0], diem[-1]]
    return don_gian(diem[: chi_so + 1], sai_so)[:-1] + don_gian(diem[chi_so:], sai_so)


def cat_hop(vong, tay, dong, nam, bac):
    """Cắt đa giác theo hình chữ nhật (Sutherland–Hodgman), toạ độ độ."""
    def cat(ds, trong, giao):
        ra = []
        for i in range(len(ds)):
            a, b = ds[i - 1], ds[i]
            if trong(b):
                if not trong(a):
                    ra.append(giao(a, b))
                ra.append(b)
            elif trong(a):
                ra.append(giao(a, b))
        return ra

    def gx(x):
        return lambda a, b: (x, a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]))

    def gy(y):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]), y)

    for trong, giao in ((lambda p: p[0] >= tay, gx(tay)), (lambda p: p[0] <= dong, gx(dong)), (lambda p: p[1] >= nam, gy(nam)), (lambda p: p[1] <= bac, gy(bac))):
        vong = cat(vong, trong, giao)
        if not vong:
            break
    return vong


def dien_tich(diem):
    return abs(sum(diem[i - 1][0] * diem[i][1] - diem[i][0] * diem[i - 1][1] for i in range(len(diem)))) / 2


def phang(diem):
    return [round(v) for p in diem for v in p]


def main():
    with urllib.request.urlopen(urllib.request.Request(NGUON, headers=UA), timeout=300) as r:
        du_lieu = json.load(r)
    viet_nam, dao, lan_can = [], [], []
    for f in du_lieu["features"]:
        hinh = f["geometry"]
        if not hinh:
            continue
        da_giac = hinh["coordinates"] if hinh["type"] == "MultiPolygon" else [hinh["coordinates"]]
        la_vn = f["properties"].get("ADM0_A3") == "VNM"
        for dg in da_giac:
            vong = cat_hop([tuple(p) for p in dg[0]], TAY, DONG, NAM, BAC)
            if len(vong) < 3:
                continue
            diem = [chieu(*p) for p in vong]
            s = dien_tich(diem)
            if la_vn and s < DAO_NHO:
                cx = sum(p[0] for p in diem) / len(diem)
                cy = sum(p[1] for p in diem) / len(diem)
                dao.append([round(cx), round(cy)])
                continue
            # Vòng kín: đầu trùng cuối nên chia đôi rồi mới rút gọn từng nửa.
            giua = len(diem) // 2
            gon = don_gian(diem[: giua + 1], SAI_SO)[:-1] + don_gian(diem[giua:] + [diem[0]], SAI_SO)[:-1]
            if len(gon) >= 3:
                (viet_nam if la_vn else lan_can).append(phang(gon))
    RA.parent.mkdir(parents=True, exist_ok=True)
    json.dump({"nguon": "Natural Earth (phạm vi công cộng), góc nhìn Việt Nam", "vietNam": viet_nam, "dao": dao, "lanCan": lan_can}, open(RA, "w", encoding="utf-8"), separators=(",", ":"))
    print(f"{RA.name}: {len(viet_nam)} vùng Việt Nam, {len(dao)} đảo nhỏ, {len(lan_can)} vùng láng giềng, {RA.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
