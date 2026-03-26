# Robot Platform

A full-stack robot fleet management platform.

## Tech Stack

### Backend
- **FastAPI** (Python) — REST API
- **SQLAlchemy** — ORM
- **SQLite** (dev) / **PostgreSQL** via Supabase (prod)
- **Pandas** — data analytics
- **Alembic** — migrations
- **Railway** — deployment

### Frontend
- **React + TypeScript** + **Vite**
- **Tailwind CSS** — styling
- **Recharts** — charts
- **Axios** — HTTP client
- **React Router** — routing
- **Vercel** — deployment

---

## Getting Started

### Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
copy .env.example .env   # then edit .env as needed
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install --legacy-peer-deps --ignore-scripts
node node_modules/esbuild/install.js   # fix esbuild on non-standard Node installs
copy .env.example .env
npm run dev
```

App: http://localhost:5173

---

## Project Structure

```
robot-platform/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings (env vars)
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── routers/         # API route handlers
│   ├── requirements.txt
│   ├── Procfile             # Railway startup
│   └── railway.json
└── frontend/
    ├── src/
    │   ├── lib/
    │   │   ├── api.ts        # Axios client + types
    │   │   └── utils.ts      # cn() helper
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── Robots.tsx
    │   │   └── Tasks.tsx
    │   ├── App.tsx
    │   └── main.tsx
    ├── vercel.json
    └── tailwind.config.js
```

---

## Deployment

### Backend → Railway
1. Push `backend/` to a GitHub repo
2. Create a new Railway project, connect the repo
3. Set env vars: `DATABASE_URL`, `APP_ENV=production`, etc.

### Frontend → Vercel
1. Push `frontend/` to a GitHub repo
2. Import into Vercel
3. Set `VITE_API_BASE_URL` to your Railway backend URL
