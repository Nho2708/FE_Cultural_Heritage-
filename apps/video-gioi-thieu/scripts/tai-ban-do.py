"""Tải dữ liệu bản đồ quanh phố cổ Hội An từ OpenStreetMap (Overpass API) cho cảnh bản đồ của video quảng cáo.

Ra public/ban-do/hoi-an.json (không đưa vào git): đường, sông nước, đồng ruộng và cây xanh, khối nhà; toạ độ đổi sang mét quanh
điểm di sản (gốc 0,0; trục y hướng xuống). Kèm vị trí người xem: một điểm trên đường cách điểm di sản khoảng 80 m (đúng chip "80 m").
Dữ liệu © OpenStreetMap contributors (ODbL): cảnh bản đồ trong video có dòng ghi nguồn ở góc, như bản đồ trong app.
Chạy: python scripts/tai-ban-do.py
"""
import json, math, pathlib, time, urllib.error, urllib.parse, urllib.request

GOC = pathlib.Path(__file__).resolve().parent.parent
RA = GOC / "public" / "ban-do" / "hoi-an.json"
# Máy chủ chính hay quá tải (502/504) nên thử lần lượt thêm hai máy chủ Overpass công khai khác.
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
UA = {"User-Agent": "VietnamHeritageVideo/1.0 (student capstone project)"}

# Điểm di sản "Đô thị cổ Hội An" trong dữ liệu của app (seed-data, cùng toạ độ API công khai trả về).
LAT0, LON0 = 15.877135, 108.328631
KHOANG_CACH_NGUOI = 80  # mét
# Vùng tải: đủ cho khung rộng nhất (màn hình điện thoại trước khi phóng, khoảng 3,2 × 6,9 km); khối nhà chỉ lấy vùng trong.
NUA_RONG_KM, NUA_CAO_KM = 1.9, 3.8
NHA_NUA_RONG_KM, NHA_NUA_CAO_KM = 0.45, 0.7

MET_LAT = 110_540
MET_LON = 111_320 * math.cos(math.radians(LAT0))


def bbox(nr, nc):
    return LAT0 - nc * 1000 / MET_LAT, LON0 - nr * 1000 / MET_LON, LAT0 + nc * 1000 / MET_LAT, LON0 + nr * 1000 / MET_LON


def hoi_overpass(q):
    for lan in range(6):
        may = OVERPASS[lan % len(OVERPASS)]
        try:
            req = urllib.request.Request(may, data=urllib.parse.urlencode({"data": q}).encode(), headers=UA)
            with urllib.request.urlopen(req, timeout=300) as r:
                return json.load(r)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            print(f"{may}: {e}", flush=True)
            if lan == 5:
                raise
            time.sleep(10 * (lan + 1))


def chieu(lat, lon):
    return round((lon - LON0) * MET_LON, 1), round(-(lat - LAT0) * MET_LAT, 1)


def don_gian(diem, sai_so):
    """Douglas-Peucker trên danh sách (x, y)."""
    if len(diem) < 3:
        return diem
    (x1, y1), (x2, y2) = diem[0], diem[-1]
    dx, dy = x2 - x1, y2 - y1
    d = math.hypot(dx, dy) or 1e-9
    xa, chi_so = 0, 0
    for i in range(1, len(diem) - 1):
        x, y = diem[i]
        k = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / d
        if k > xa:
            xa, chi_so = k, i
    if xa <= sai_so:
        return [diem[0], diem[-1]]
    return don_gian(diem[: chi_so + 1], sai_so)[:-1] + don_gian(diem[chi_so:], sai_so)


def phang(diem):
    return [v for p in diem for v in p]


def noi_vong(doan):
    """Nối các đoạn ranh giới của một quan hệ thành các vòng khép kín (theo điểm đầu cuối trùng nhau)."""
    con = [list(d) for d in doan if len(d) >= 2]
    vong = []
    while con:
        v = con.pop(0)
        doi = True
        while v[0] != v[-1] and doi:
            doi = False
            for i, d in enumerate(con):
                if d[0] == v[-1]:
                    v += d[1:]
                elif d[-1] == v[-1]:
                    v += d[::-1][1:]
                elif d[-1] == v[0]:
                    v = d[:-1] + v
                elif d[0] == v[0]:
                    v = d[::-1][:-1] + v
                else:
                    continue
                con.pop(i)
                doi = True
                break
        if len(v) >= 4:
            vong.append(v)
    return vong


def main():
    s, w, n, e = bbox(NUA_RONG_KM, NUA_CAO_KM)
    s2, w2, n2, e2 = bbox(NHA_NUA_RONG_KM, NHA_NUA_CAO_KM)
    q = f"""[out:json][timeout:240];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|pedestrian|service|road)(_link)?$"]({s},{w},{n},{e});
  way["natural"="water"]({s},{w},{n},{e});
  relation["natural"="water"]({s},{w},{n},{e});
  way["waterway"~"^(river|canal|stream)$"]({s},{w},{n},{e});
  way["landuse"~"^(farmland|grass|meadow|forest|recreation_ground|cemetery)$"]({s},{w},{n},{e});
  way["leisure"~"^(park|garden|pitch)$"]({s},{w},{n},{e});
  way["natural"~"^(wood|scrub|wetland|sand)$"]({s},{w},{n},{e});
  way["building"]({s2},{w2},{n2},{e2});
);
out geom;"""
    du_lieu = hoi_overpass(q)["elements"]
    ra = {"nguon": "© OpenStreetMap contributors (ODbL)", "duongLon": [], "duongNho": [], "song": [], "nuoc": [], "xanh": [], "nha": []}
    cac_dinh_duong = []
    for el in du_lieu:
        t = el.get("tags", {})
        if el["type"] == "way" and "geometry" in el:
            diem = [chieu(g["lat"], g["lon"]) for g in el["geometry"]]
            if "highway" in t:
                lon = t["highway"].split("_")[0] in ("motorway", "trunk", "primary", "secondary", "tertiary")
                ra["duongLon" if lon else "duongNho"].append(phang(don_gian(diem, 2.5)))
                cac_dinh_duong += diem
            elif "waterway" in t:
                ra["song"].append({"rong": 60 if t["waterway"] == "river" else 8, "d": phang(don_gian(diem, 4))})
            elif t.get("natural") == "water":
                ra["nuoc"].append(phang(don_gian(diem, 3)))
            elif "building" in t:
                ra["nha"].append(phang(don_gian(diem, 0.8)))
            else:
                ra["xanh"].append(phang(don_gian(diem, 4)))
        elif el["type"] == "relation" and t.get("natural") == "water":
            ngoai = [[chieu(g["lat"], g["lon"]) for g in m["geometry"]] for m in el.get("members", []) if m.get("role") == "outer" and "geometry" in m]
            for v in noi_vong(ngoai):
                ra["nuoc"].append(phang(don_gian(v, 3)))
    # Người xem đứng trên đường, cách điểm di sản gần đúng 80 m (chọn đỉnh đường có khoảng cách gần 80 m nhất, ưu tiên phía nam).
    ung_vien = sorted(cac_dinh_duong, key=lambda p: abs(math.hypot(*p) - KHOANG_CACH_NGUOI) + (0 if p[1] > 0 else 15))
    ra["nguoi"] = list(ung_vien[0]) if ung_vien else [0, KHOANG_CACH_NGUOI]
    ra["ghim"] = [0, 0]
    RA.parent.mkdir(parents=True, exist_ok=True)
    RA.write_text(json.dumps(ra, separators=(",", ":")), encoding="utf-8")
    print({k: len(v) for k, v in ra.items() if isinstance(v, list)}, "người xem:", ra["nguoi"], f"{RA.stat().st_size / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
