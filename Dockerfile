# Docker dùng để BUILD & chạy bản web, không dùng để chạy app desktop.
# 1) Chạy bản web (giao diện giống hệt, dữ liệu lưu trong trình duyệt):
#      docker build --target web -t hcmut-gpa-web . && docker run --rm -p 8080:80 hcmut-gpa-web
#      → mở http://localhost:8080
# 2) Build file cài Windows (zip) từ bất kỳ máy nào có Docker, kết quả nằm ở ./release:
#      docker build --target winbuild -t hcmut-gpa-build . && \
#      docker run --rm -v "$PWD/release:/out" hcmut-gpa-build

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS test
COPY . .
RUN npm test && npm run build

FROM nginx:1.27-alpine AS web
COPY --from=test /app/dist /usr/share/nginx/html
EXPOSE 80

FROM test AS winbuild
RUN apt-get update && apt-get install -y --no-install-recommends unzip zip ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npx electron-builder --win zip portable --x64 --publish never
CMD ["sh", "-c", "cp -r release/*.zip release/*.exe /out/ 2>/dev/null; ls /out"]
