"""Nạp dữ liệu thử cho kiểm thử app trên máy ảo, qua API của backend đang chạy trên CƠ SỞ DỮ LIỆU TẠM.

Tạo: vài di sản đã xuất bản, một trường, một giáo viên, ba lớp (khối 3, 8, 11), học sinh (có mật khẩu tạm chưa đổi và có mật khẩu đã đổi),
mỗi lớp một bài học đã phát hành (có mã bài học) và một bài kiểm tra đang mở. Ghi kết quả vào tệp JSON để các luồng kiểm thử đọc.

Biến môi trường: BASE (mặc định http://localhost:5080), API_LOG (tệp log của backend, để đọc liên kết đặt mật khẩu),
ADMIN_LOGIN (mặc định admin.nho), ADMIN_PASSWORD (mật khẩu quản trị của backend tạm), OUT (tệp JSON kết quả).
"""
import datetime
import json
import os
import re
import struct
import sys
import time
import urllib.request
import urllib.error

BASE = os.environ.get("BASE", "http://localhost:5080").rstrip("/")
API_LOG = os.environ["API_LOG"]
ADMIN_LOGIN = os.environ.get("ADMIN_LOGIN", "admin.nho")
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
OUT = os.environ.get("OUT", "du-lieu-thu.json")
PW = "MatKhau2026"
STUDENT_PW = "MatKhauCuaEm2026"
SUFFIX = datetime.datetime.now().strftime("%H%M%S")


def call(method, path, body=None, token=None, expect=None):
    data = None
    headers = {"Accept": "application/json"}
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        headers["Content-Type"] = "application/json; charset=utf-8"
    if token:
        headers["Authorization"] = "Bearer " + token
    req = urllib.request.Request(BASE + "/api/v1" + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            status, raw = r.status, r.read()
    except urllib.error.HTTPError as e:
        status, raw = e.code, e.read()
    try:
        payload = json.loads(raw.decode("utf-8")) if raw else {}
    except ValueError:
        payload = {}
    if expect is not None and status != expect:
        sys.exit(f"{method} {path}: mong {expect}, nhận {status}: {str(payload)[:300]}")
    return payload.get("data"), status


def mail_token(email):
    email = email.lower()
    for _ in range(50):
        text = open(API_LOG, encoding="utf-8", errors="replace").read()
        pos = text.lower().rfind("tới: " + email)
        if pos < 0:
            pos = text.lower().rfind(": " + email + " |")
        if pos >= 0:
            m = re.search(r"token=([A-Za-z0-9_\-%]+)", text[pos:])
            if m:
                return m.group(1)
        time.sleep(0.3)
    sys.exit("không thấy thư tới " + email)


def when(minutes):
    t = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=minutes)
    return t.strftime("%Y-%m-%dT%H:%M:%SZ")


result = {"suffix": SUFFIX}
admin, _ = call("POST", "/auth/login", {"emailOrUsername": ADMIN_LOGIN, "password": ADMIN_PASSWORD}, expect=200)
A = admin["accessToken"]

# ---- Di sản: xuất bản mọi di sản đủ điều kiện (tối đa 12) ----
items, _ = call("GET", "/admin/heritages?status=DRAFT&pageSize=100", token=A, expect=200)
published = []
for h in sorted(items["items"], key=lambda item: item["id"]):
    if len(published) >= 12:
        break
    _, st = call("POST", f"/admin/heritages/{h['id']}/publish", token=A)
    if st == 200:
        published.append({"id": h["id"], "slug": h["slug"], "name": h["name"]})
pub_list, _ = call("GET", "/admin/heritages?status=PUBLISHED&pageSize=100", token=A, expect=200)
published = [{"id": h["id"], "slug": h["slug"], "name": h["name"]} for h in pub_list["items"]]
result["heritages"] = published
H = next((p["id"] for p in published if p["slug"].startswith("khu-trung-tam-hoang-thanh")), published[0]["id"])
print(f"Có {len(published)} di sản đã xuất bản")

# ---- Bản dịch, tóm tắt (tiếng Việt, Anh) và mô hình 3D cho di sản chính, để màn hình chi tiết có đủ nút ----
call("POST", f"/admin/heritages/{H}/translations/generate", {}, token=A, expect=200)
call("POST", f"/admin/heritages/{H}/translations/vi/approve", {"kind": "SUMMARY"}, token=A, expect=200)
call("POST", f"/admin/heritages/{H}/translations/en/approve", {"kind": "BOTH"}, token=A, expect=200)


def minimal_glb():
    """Mô hình glTF nhị phân hợp lệ nhỏ nhất vẽ được: một tam giác."""
    gltf = {"asset": {"version": "2.0"}, "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [{"mesh": 0}],
            "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "material": 0}]}],
            "materials": [{"pbrMetallicRoughness": {"baseColorFactor": [0.65, 0.1, 0.1, 1], "metallicFactor": 0}, "doubleSided": True}],
            "accessors": [{"bufferView": 0, "componentType": 5126, "count": 3, "type": "VEC3", "min": [0, 0, 0], "max": [1, 1, 0]}],
            "bufferViews": [{"buffer": 0, "byteLength": 36, "target": 34962}], "buffers": [{"byteLength": 36}]}
    doc = json.dumps(gltf).encode()
    doc += b" " * ((4 - len(doc) % 4) % 4)
    binary = struct.pack("<9f", 0, 0, 0, 1, 0, 0, 0, 1, 0)
    total = 12 + 8 + len(doc) + 8 + len(binary)
    return (struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(doc), 0x4E4F534A) + doc
            + struct.pack("<II", len(binary), 0x004E4942) + binary)


def upload_model(heritage_id):
    boundary = "----dsvhvntam"
    crlf = bytes([13, 10])
    body = b""
    for name, value in (("title", "Điện Kính Thiên"), ("author", "Nguyễn Văn An"), ("license", "CC BY 4.0"),
                        ("sourceUrl", "https://sketchfab.com/m/dien-kinh-thien"), ("show", "true")):
        body += (f"--{boundary}").encode() + crlf + f'Content-Disposition: form-data; name="{name}"'.encode() + crlf + crlf
        body += value.encode("utf-8") + crlf
    body += (f"--{boundary}").encode() + crlf
    body += b'Content-Disposition: form-data; name="file"; filename="mo-hinh.glb"' + crlf
    body += b"Content-Type: model/gltf-binary" + crlf + crlf + minimal_glb() + crlf
    body += (f"--{boundary}--").encode() + crlf
    req = urllib.request.Request(f"{BASE}/api/v1/admin/heritages/{heritage_id}/models/upload", data=body, method="POST",
                                 headers={"Authorization": "Bearer " + A, "Content-Type": f"multipart/form-data; boundary={boundary}"})
    try:
        urllib.request.urlopen(req, timeout=60).read()
    except urllib.error.HTTPError as e:
        sys.exit(f"tải mô hình 3D: {e.code} {e.read()[:300]}")


upload_model(H)
print("Đã dịch, tóm tắt và gắn mô hình 3D cho di sản chính")

# ---- Trường, giáo viên, lớp ----
org_mail = f"thu.{SUFFIX}@tam.edu.vn"
call("POST", "/admin/organizations", {"name": f"Trường thử nghiệm {SUFFIX}", "orgAdmin": {
    "fullName": "Lê Thị Thu", "username": f"thu.{SUFFIX}", "email": org_mail}}, token=A, expect=201)
call("POST", "/auth/set-password", {"token": mail_token(org_mail), "newPassword": PW}, expect=200)
thu, _ = call("POST", "/auth/login", {"emailOrUsername": f"thu.{SUFFIX}", "password": PW}, expect=200)
tmail = f"linh.{SUFFIX}@tam.edu.vn"
call("POST", "/org/teachers", {"fullName": "Đặng Thị Mỹ Linh", "username": f"linh.{SUFFIX}", "email": tmail},
     token=thu["accessToken"], expect=201)
call("POST", "/auth/set-password", {"token": mail_token(tmail), "newPassword": PW}, expect=200)
linh, _ = call("POST", "/auth/login", {"emailOrUsername": f"linh.{SUFFIX}", "password": PW}, expect=200)
T = linh["accessToken"]
result["teacher"] = {"username": f"linh.{SUFFIX}", "password": PW}

classes = {}
for grade, name in ((3, "3A"), (8, "8A1"), (11, "11A2")):
    c, _ = call("POST", "/teacher/classes", {"name": name, "grade": grade, "schoolYear": "2026-2027"}, token=T, expect=201)
    classes[grade] = c["id"]

# ---- Bài học đã phát hành ----
lessons = {}
for grade in (3, 8, 11):
    les, _ = call("POST", "/teacher/lessons", {"classId": classes[grade], "title": f"Di sản qua bài làm khối {grade}",
                                                 "heritageIds": [H]}, token=T, expect=201)
    draft, _ = call("POST", f"/teacher/lessons/{les['id']}/ai/compose", {"length": "DETAILED"}, token=T, expect=200)
    body = {"summary": draft["summary"], "keyPoints": draft["keyPoints"], "sections": [
        {k: s[k] for k in ("type", "title", "body", "imageUrl", "milestoneYear", "eventId", "sourceCitation")}
        for s in draft["sections"]]}
    call("PUT", f"/teacher/lessons/{les['id']}", body, token=T, expect=200)
    pub, _ = call("POST", f"/teacher/lessons/{les['id']}/publish", token=T, expect=200)
    lessons[grade] = {"id": les["id"], "code": pub["accessCode"], "title": f"Di sản qua bài làm khối {grade}"}
result["lessons"] = lessons

# ---- Câu hỏi và bài kiểm tra ----
mat, _ = call("GET", f"/teacher/lessons/{lessons[8]['id']}/materials", token=T, expect=200)
U = [mat["images"][i]["url"] for i in range(3)]


def q(body):
    d, _ = call("POST", "/teacher/questions", dict(body, heritageId=H), token=T, expect=201)
    return d["id"]


Q = {}
Q["single"] = q({"questionType": "SINGLE_CHOICE", "content": "Hoàng thành Thăng Long được UNESCO ghi danh vào năm nào?",
                 "explanation": "UNESCO ghi danh năm 2010.", "difficultyLevel": "EASY", "options": [
                     {"content": "Năm 1999", "isCorrect": False}, {"content": "Năm 2010", "isCorrect": True},
                     {"content": "Năm 2003", "isCorrect": False}, {"content": "Năm 2015", "isCorrect": False}]})
Q["truefalse"] = q({"questionType": "TRUE_FALSE", "content": "Em hãy xem hình: khu di tích nằm giữa lòng Hà Nội.",
                    "explanation": "Khu di tích ở trung tâm Hà Nội.", "difficultyLevel": "MEDIUM", "imageUrl": U[0], "answerIsTrue": True})
Q["ordering"] = q({"questionType": "ORDERING", "content": "Hãy sắp xếp các sự kiện theo thứ tự thời gian.",
                   "explanation": "Xếp theo năm.", "difficultyLevel": "HARD",
                   "steps": ["Năm 1010: dời đô", "Năm 1070: lập Văn Miếu", "Năm 1428: Lê Lợi lên ngôi", "Năm 2010: UNESCO ghi danh"]})
Q["fill"] = q({"questionType": "FILL_BLANK", "content": "Vua ___ dời đô từ Hoa Lư về Thăng Long vào năm 1010.",
               "explanation": "Lý Thái Tổ dời đô.", "difficultyLevel": "HARD",
               "blanks": [{"accepted": ["Lý Thái Tổ", "Lý Công Uẩn"]}], "distractors": ["Lê Lợi", "Trần Hưng Đạo"]})
Q["imagechoice"] = q({"questionType": "IMAGE_CHOICE", "content": "Em hãy chọn hình có tên: Cổng Đoan Môn.",
                      "explanation": "Hình thứ hai là cổng.", "difficultyLevel": "EASY", "options": [
                          {"content": "Điện Kính Thiên", "imageUrl": U[0], "isCorrect": False},
                          {"content": "Cổng Đoan Môn", "imageUrl": U[1], "isCorrect": True},
                          {"content": "Khu khảo cổ", "imageUrl": U[2], "isCorrect": False}]})
Q["matching"] = q({"questionType": "MATCHING", "content": "Em hãy ghép mỗi hình với tên của hình đó.",
                   "explanation": "Mỗi tên là chú thích của hình.", "difficultyLevel": "MEDIUM", "pairs": [
                       {"leftImageUrl": U[0], "right": "Điện Kính Thiên"}, {"leftImageUrl": U[1], "right": "Cổng Đoan Môn"},
                       {"leftImageUrl": U[2], "right": "Khu khảo cổ"}]})
Q["multi"] = q({"questionType": "MULTI_TRUE_FALSE", "content": "Hoàng thành Thăng Long là trung tâm quyền lực của nhiều triều đại phong kiến.",
                "explanation": "Nhận định hai sai.", "difficultyLevel": "HARD", "statements": [
                    {"text": "Khu di tích được UNESCO ghi danh năm 2010.", "isTrue": True},
                    {"text": "Khu di tích nằm ở thành phố Huế.", "isTrue": False},
                    {"text": "Khu di tích có nhiều lớp văn hóa chồng lên nhau.", "isTrue": True}]})
Q["source"] = q({"questionType": "SOURCE_READING", "content": "Theo đoạn tư liệu, vua nào dời đô về Thăng Long?",
                 "explanation": "Đoạn tư liệu nêu rõ Lý Thái Tổ.", "difficultyLevel": "MEDIUM",
                 "passage": "Mùa thu năm Canh Tuất, Lý Thái Tổ dời đô từ Hoa Lư về thành Đại La và đổi tên là Thăng Long.",
                 "passageSource": "Đại Việt sử ký toàn thư, Ngô Sĩ Liên, thế kỷ 15", "options": [
                     {"content": "Lý Thái Tổ", "isCorrect": True}, {"content": "Trần Thái Tông", "isCorrect": False},
                     {"content": "Lê Thái Tổ", "isCorrect": False}, {"content": "Đinh Tiên Hoàng", "isCorrect": False}]})


def quiz(grade, name, limit, qids):
    d, _ = call("POST", "/teacher/quizzes", {"lessonId": lessons[grade]["id"], "name": name, "difficultyLevel": "MEDIUM",
                                              "timeLimitMinutes": limit, "openAt": when(-1), "closeAt": when(60 * 24 * 3),
                                              "showAnswersAfterSubmit": True}, token=T, expect=201)
    call("POST", f"/teacher/quizzes/{d['id']}/questions", {"questionIds": qids, "point": 2}, token=T, expect=200)
    call("POST", f"/teacher/quizzes/{d['id']}/publish", token=T, expect=200)
    return {"id": d["id"], "name": name}


result["quizzes"] = {
    "3": quiz(3, "Trò chơi Hoàng thành", None, [Q["truefalse"], Q["imagechoice"], Q["matching"], Q["ordering"]]),
    "8": quiz(8, "Kiểm tra Hoàng thành", 15, [Q["single"], Q["truefalse"], Q["ordering"], Q["fill"]]),
    "11": quiz(11, "Bài kiểm tra có giờ", 45, [Q["single"], Q["multi"], Q["source"]]),
}

# ---- Học sinh: mỗi khối một em chưa đổi mật khẩu tạm và một em đã đổi ----
students = {}
for grade in (3, 8, 11):
    fresh = []
    for who, name in (("moi", "Nguyễn Văn Mới"), ("quen", "Trần Thị Quen")):
        d, _ = call("POST", f"/teacher/classes/{classes[grade]}/students", {"fullName": name}, token=T, expect=201)
        e = d["sheet"]["entries"][0]
        entry = {"studentCode": e["studentCode"], "password": e["temporaryPassword"], "fullName": name}
        if who == "quen":
            lg, _ = call("POST", "/student/auth/login", {"studentCode": e["studentCode"], "password": e["temporaryPassword"]}, expect=200)
            call("PUT", "/student/me/password", {"newPassword": STUDENT_PW, "confirmNewPassword": STUDENT_PW},
                 token=lg["accessToken"], expect=200)
            entry["password"] = STUDENT_PW
        students[f"{who}{grade}"] = entry
result["students"] = students

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)
print("Đã ghi", OUT)
