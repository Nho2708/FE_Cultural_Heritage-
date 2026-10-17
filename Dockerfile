# syntax=docker/dockerfile:1
# Ảnh "web" cho máy chủ Google Cloud: build hai web React rồi phục vụ bằng Caddy, cổng 8080 web học tập, 8081 web quản trị.
# Caddy cửa vào của máy chủ (repo backend, deploy/google-cloud) giữ HTTPS và chuyển /api, /files, /health sang API.
# Địa chỉ các web gắn vào bản build (Vite), truyền bằng --build-arg; hai web gọi API cùng gốc qua /api/v1.
#   docker build --build-arg VITE_LEARNING_WEB_URL=https://34.87.10.20 --build-arg VITE_ADMIN_WEB_URL=https://34.87.10.20:8443 -t dsvhvn-web .

FROM node:24-bookworm-slim AS dung
WORKDIR /src

# Cài gói trước khi chép mã nguồn để Docker giữ lớp này giữa các lần build.
COPY package.json package-lock.json ./
COPY packages/dung-chung/package.json packages/dung-chung/
COPY apps/web-quan-tri/package.json apps/web-quan-tri/
COPY apps/web-hoc-tap/package.json apps/web-hoc-tap/
RUN npm ci --no-audit --no-fund

COPY . .
ARG VITE_LEARNING_WEB_URL
ARG VITE_ADMIN_WEB_URL
ARG VITE_ANDROID_APP_URL=
ARG VITE_INTRO_VIDEO_BASE_URL=
ARG VITE_VNPAY_SANDBOX_NOTE=true
ENV VITE_API_BASE_URL=/api/v1
# Thiếu địa chỉ thì bản build chạy lên sẽ báo lỗi cấu hình, nên dừng ngay ở đây.
RUN test -n "$VITE_LEARNING_WEB_URL" && test -n "$VITE_ADMIN_WEB_URL" || \
      { echo "Thiếu --build-arg VITE_LEARNING_WEB_URL hoặc VITE_ADMIN_WEB_URL" >&2; exit 1; } \
 && npm run build -w @dsvhvn/web-quan-tri \
 && npm run build -w @dsvhvn/web-hoc-tap

FROM caddy:2.11.4-alpine
COPY scripts/trien-khai/Caddyfile /etc/caddy/Caddyfile
COPY --from=dung /src/apps/web-hoc-tap/dist /srv/web-hoc-tap
COPY --from=dung /src/apps/web-quan-tri/dist /srv/web-quan-tri
EXPOSE 8080 8081
