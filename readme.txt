# 安装 Node.js 依赖
npm install
# 安装额外需要的依赖
npm install vite typescript ts-node @vitejs/plugin-react --save-dev

# 编译并运行 Rust 后端，需要安裝rustup-init.exe
cargo run

# 启动 Express API 服务器
npm start

# 启动前端开发服务器
npm run dev



前端界面：http://localhost:5173 

API 端点：
http://localhost:3000/api/blocks
http://localhost:3000/api/price


目錄結構
project/
├── src/
│   ├── main.rs
│   └── frontend/
│       ├── App.tsx
│       ├── server.ts
│       └── api/
│           └── index.ts
├── blockchain_monitor.sql
├── package.json
├── Cargo.toml
├── vite.config.ts
├── Dockerfile
└── docker-compose.yml

