# Sử dụng Node.js bản stable
FROM node:20-alpine

# Tạo thư mục làm việc
WORKDIR /app

# Copy package.json và package-lock.json
COPY package*.json ./

# Cài đặt dependencies
RUN npm install

# Copy toàn bộ mã nguồn
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build dự án
RUN npm run build

# Mở cổng 3000
EXPOSE 3000

# Chạy ứng dụng
CMD ["npm", "run", "start:prod"]
