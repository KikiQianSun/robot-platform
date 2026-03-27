# Robot Platform

一个全栈机器人机队管理平台。

## 技术栈

### 后端
- **FastAPI**（Python）— REST API
- **SQLAlchemy** — ORM
- **SQLite**（开发环境）/ **PostgreSQL** via Supabase（生产环境）
- **Pandas** — 数据分析
- **Railway** — 部署

### 前端
- **React + TypeScript** + **Vite**
- **Tailwind CSS** — 样式
- **Recharts** — 图表
- **Axios** — HTTP 客户端
- **Vercel** — 部署

---

## 本地启动步骤

### 后端

```bash
cd backend
python -m venv venv
# Windows：
.\venv\Scripts\Activate.ps1
# macOS/Linux：
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # 然后按需编辑 .env
uvicorn app.main:app --reload --port 8000
```

API 文档：http://localhost:8000/docs

### 前端

```bash
cd frontend
npm install --legacy-peer-deps --ignore-scripts
node node_modules/esbuild/install.js   # 修复非标准 Node 环境下的 esbuild
copy .env.example .env
npm run dev
```

应用地址：http://localhost:5173

---

## 项目结构

```
robot-platform/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 入口
│   │   ├── config.py        # 配置（环境变量）
│   │   ├── database.py      # SQLAlchemy 初始化
│   │   ├── models/          # SQLAlchemy 模型
│   │   ├── schemas/         # Pydantic 模式
│   │   └── routers/         # API 路由处理器
│   ├── requirements.txt
│   ├── Procfile             # Railway 启动命令
│   └── railway.json
└── frontend/
    ├── src/
    │   ├── lib/
    │   │   ├── api.ts        # Axios 客户端 + 类型定义
    │   │   └── utils.ts      # cn() 工具函数
    │   ├── pages/
    │   │   ├── Logs.tsx
    │   │   └── LogViewer.tsx
    │   ├── App.tsx
    │   └── main.tsx
    ├── vercel.json
    └── tailwind.config.js
```

---

## 部署

### 后端 → Railway
1. 将 `backend/` 推送到 GitHub 仓库
2. 在 Railway 创建新项目并关联该仓库
3. 配置环境变量：`DATABASE_URL`、`APP_ENV=production` 等

### 前端 → Vercel
1. 将 `frontend/` 推送到 GitHub 仓库
2. 在 Vercel 中导入该仓库
3. 将 `VITE_API_BASE_URL` 设置为 Railway 后端地址

---

## 线上 Demo

| 层级 | 地址 |
|------|------|
| **前端** | https://robot-platform.vercel.app |
| **后端 API** | https://robot-platform-production.up.railway.app |
| **API 文档（Swagger）** | https://robot-platform-production.up.railway.app/docs |

> Demo 使用托管于 Supabase 的共享 PostgreSQL 数据库。上传的 CSV 文件存储在服务端，数据在会话之间持久保存。

---

## 架构与技术决策说明

### 技术选型

#### 后端 — FastAPI + SQLAlchemy + SQLite/PostgreSQL
- **FastAPI** 优先于 Django REST Framework 和 Flask，原因在于其原生异步支持、自动生成 OpenAPI/Swagger 文档，以及基于 Pydantic 的零样板请求校验。内置的 `/docs` 交互式接口大幅加速了开发阶段的 API 调试。
- **SQLAlchemy**（ORM）配合 **Alembic** 迁移，实现了数据模型与数据库引擎的解耦，使得从开发环境的 SQLite 切换到生产环境的 PostgreSQL（via Supabase）无需改动任何应用代码。
- **SQLite（本地）/ PostgreSQL（生产）** 的双层数据库策略——本地开发无需 Docker 即可运行，生产环境则使用托管的、可扩展的数据库服务。
- **Pandas** 仅用于 CSV 处理服务中，对上传的日志文件进行向量化校验与解析，避免逐行 Python 循环带来的性能损耗。

#### 前端 — React + TypeScript + Vite + Tailwind CSS
- **Vite** 替代 Create React App，冷启动和热更新（HMR）速度显著提升，改善了开发迭代体验。
- **TypeScript** 贯穿前端全链路（前端数据模型、`api.ts` 中的 API 客户端类型），在编译阶段即可捕获前后端数据结构不匹配的问题。
- **Tailwind CSS** 结合自定义 CSS 变量主题（`--text-primary`、`--danger`、`--success` 等），实现零运行时开销的主题系统，同时无需修改组件代码即可调整设计规范。
- **Recharts** 优先于 Chart.js 或 D3，因为它是 React 原生图表库——图表以声明式 JSX 组件的形式编写，与 React 状态和重渲染机制天然兼容。

#### 部署 — Railway + Vercel
- **Railway** 负责后端部署：读取 `railway.json` 和 `Procfile`，使用 Nixpacks 构建，并自动注入环境变量（包括来自关联 PostgreSQL 插件的 `DATABASE_URL`）。TLS 证书和滚动部署开箱即用。
- **Vercel** 负责前端部署：`vercel.json` 将所有路由重写到 `index.html`，支持客户端 React Router 导航；`VITE_API_BASE_URL` 在构建时注入，确保生产包指向正确的 Railway 后端地址。

---

### 功能设计决策

#### CSV 上传与校验流水线
上传流程拆分为三个独立的服务层：

1. **`file_storage_service`** — 持久化原始文件并返回稳定的访问 URL，与解析逻辑完全解耦。
2. **`csv_processing_service`** — 依据 `csv_field_config.py` 中的规则校验字段存在性、类型和值约束，返回结构化结果，明确区分硬错误（拒绝行）和警告。
3. **`upload_record_service`** / **`upload_record_repository`** — 记录上传元数据（文件名、行数、时间戳），支撑上传历史视图。

这种分层设计使得修改校验规则只需改动 `csv_field_config.py`，无需触及上传或存储逻辑。

#### 字段规范提示横幅（FieldSpecBanner）
`FieldSpecBanner` 组件在上传拖放区上方直接展示预期的 CSV 列结构。在用户尝试上传前即明确接口契约，从而减少上传错误，且无需跳转到单独的文档页面。

#### 拖放 + 点击上传
`UploadDropzone` 组件同时支持拖放和文件浏览器两种上传方式，底层使用 `ref` 驱动的隐藏 `<input type="file">` 元素。两种路径最终汇入 `Logs.tsx` 中统一的 `handleFile` 处理函数，确保校验与上传逻辑集中在一处。

#### 错误上报 — 结构化错误 vs. 简单错误
后端返回两种不同的错误格式：
- **字符串类型的 `detail`** — 用于基础设施或权限错误（文件未找到、数据库错误）。
- **结构化的 `CsvValidationDetail` 对象** — 用于校验失败，逐行逐字段列出所有错误。

前端根据响应结构分别路由至可关闭的内联横幅（`simpleError`）或带可滚动逐行错误表格的 `ValidationErrorModal`，在不干扰日常错误处理的同时，为运维人员提供可操作的详细信息。

#### 上传历史与删除
所有上传记录均保存在 `upload_records` 表中。UI 中的历史记录表允许运维人员查看历史上传并删除记录。删除操作调用 `filesApi.remove(id)`，同时清除数据库记录和存储文件，保持存储整洁。操作完成后显示 3 秒自动消失的成功提示，不阻塞 UI 流程。


## 开发简短说明

在开发过程中使用AI工具辅助开发步骤：
1.先阅读需求，人工进行技术选型，再与AI进行讨论，确认技术栈。
2.使用AI搭建基本项目框架，检查文件分区以及架构设计。
3.人工进行需求分析以及拆分任务，补充任务细节。
4.按步进行方案设计（AI），人工review并纠正部分细节，再直接开始实现。
5.人工检查功能，检查代码，使用AI进行重构以及去除冗余代码，并添加测试。
遇到的问题：AI经常会过度设计或产生幻觉，以及在debug时效率过低，这时候需要明确prompt，将需求补充的更详细，并在需要时自己进行debug。
选择自己来而不是交给AI：在使用AI的全过程中都需要人为主导，这一点很重要；例如先自己梳理需求，进行技术选型，再与AI进行沟通，以及拆分任务，一步一步告诉它并实现、补充，这才能达到效率最大化；并且在进行debug时可以借助AI，但不能完全依赖，不然会导致效率非常低。