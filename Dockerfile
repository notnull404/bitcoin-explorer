# 構建階段
FROM rust:1.70 as builder

WORKDIR /usr/src/app
COPY . .

# 構建 Rust 後端
RUN cargo build --release

# Node.js 構建階段
FROM node:18 as node-builder

WORKDIR /usr/src/app
COPY . .

RUN npm ci
RUN npm run build

# 最終階段
FROM debian:bullseye-slim

WORKDIR /usr/src/app

# 從構建階段複製文件
COPY --from=builder /usr/src/app/target/release/bitcoin-explorer ./
COPY --from=node-builder /usr/src/app/dist ./dist
COPY .env ./

# 安裝運行時依賴
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000 5173

CMD ["./bitcoin-explorer"]