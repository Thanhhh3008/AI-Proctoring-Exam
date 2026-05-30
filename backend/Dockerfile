# ──────────────────────────────────────────────
# Build NestJS Backend
# ──────────────────────────────────────────────
FROM node:20-alpine

# Cài thêm OpenSSL (Prisma yêu cầu trên Alpine)
RUN apk add --no-cache openssl

WORKDIR /app

# Cài dependencies trước (tận dụng Docker cache)
COPY package*.json ./
RUN npm install

# Copy toàn bộ source (bao gồm prisma/schema.prisma)
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build NestJS
RUN npm run build

EXPOSE 3000

# Sync schema DB (db push), sau đó start server
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/src/main"]
