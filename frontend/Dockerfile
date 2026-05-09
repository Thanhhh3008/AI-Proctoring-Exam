# Giai đoạn 1: Build
FROM node:20-alpine as build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Giai đoạn 2: Serve bằng Nginx
FROM nginx:stable-alpine as production-stage

# Copy file build từ giai đoạn 1 vào thư mục của Nginx
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Mở cổng 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
