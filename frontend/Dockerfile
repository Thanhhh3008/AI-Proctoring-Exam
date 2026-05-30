# ──────────────────────────────────────────────
# Giai đoạn 1: Build React/Vite
# ──────────────────────────────────────────────
FROM node:20-alpine AS build-stage

WORKDIR /app

# Cài dependencies trước (tận dụng Docker cache)
COPY package*.json ./
RUN npm install

# Nhận URL backend tại lúc build (build-time arg)
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL

# Copy toàn bộ source
COPY . .

# Build production bundle
RUN npm run build

# ──────────────────────────────────────────────
# Giai đoạn 2: Serve bằng Nginx
# ──────────────────────────────────────────────
FROM nginx:stable-alpine AS production-stage

# Dùng config tùy chỉnh (SPA routing + WebSocket proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy bundle từ giai đoạn 1
COPY --from=build-stage /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
