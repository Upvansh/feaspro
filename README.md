# FeasPro - Property Development Feasibility Platform

FeasPro is a specialized property development feasibility and financial modelling platform engineered to evaluate financial returns, cash flow, and development assumptions across multi-tenant organizations.

---

## 🗄️ Database Architecture: Supabase PostgreSQL

FeasPro uses **Supabase-hosted PostgreSQL** as its primary cloud database provider, accessed through **SQLAlchemy 2.0** and the **`psycopg` (v3)** driver.

```text
React 18 + TypeScript + Vite
          ↓ HTTP REST API
FastAPI (Python 3.12+)
          ↓ SQLAlchemy 2.0 (psycopg)
Supabase PostgreSQL
```

---

## 🚀 Supabase PostgreSQL Setup Guide

### 1. Create a Supabase Project
1. Log in to [Supabase](https://supabase.com) and click **New Project**.
2. Set your **Database Password** and select your preferred region.
3. In **Project Settings** > **Database**, copy your **URI Connection String**.

### 2. Configure Environment Variables
Copy `.env.example` to `.env` and set your `DATABASE_URL`:

```env
# Supabase Direct Connection (port 5432)
DATABASE_URL=postgresql+psycopg://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres

# Or Supabase Transaction Connection Pooler (port 6543)
DATABASE_URL=postgresql+psycopg://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres
```

---

## 💻 Quick Start Guide (Windows)

### 1. Install Backend Dependencies & Run Migrations

```powershell
# Activate Python virtual environment
.\venv\Scripts\activate

# Install Python requirements (including psycopg driver and alembic)
.\venv\Scripts\python.exe -m pip install -r requirements.txt

# Run Alembic schema migrations against Supabase PostgreSQL
.\venv\Scripts\python.exe -m alembic upgrade head
```

### 2. (Optional) Migrate Existing Local SQLite Data to PostgreSQL

If you have existing feasibilities in `feaspro.db`, migrate them safely using the migration script:

```powershell
.\venv\Scripts\python.exe backend/scripts/migrate_sqlite_to_pg.py --sqlite ./feaspro.db
```

### 3. Start Development Platform (Full Stack)

In the root directory, run both FastAPI and Vite with a single command:

```powershell
npm run dev
```

* **Frontend Dashboard**: `http://localhost:5173`
* **FastAPI Backend**: `http://127.0.0.1:8000`
* **Interactive API Docs (Swagger UI)**: `http://127.0.0.1:8000/docs`
* **Database Health Diagnostic**: `http://127.0.0.1:8000/health`

---

## 🧪 Running Automated Tests

```powershell
.\venv\Scripts\python.exe -m pytest -v
```

All 50 unit and integration tests run with full in-memory isolation.

---

## 🔑 Pre-Seeded Accounts

* **Developer Account**: `developer@apexdev.com.au` / `FeasPro2026!`
* **Mahi Account**: `mahi@gmail.com` / `password123`
* **Admin Account**: `alex@apexproperty.com.au` / `password123`
* **1-Click Demo**: Click **⚡ 1-Click Demo Sign-In** on the login screen.

---

## 🏗️ Architecture & Documentation

See [ARCHITECTURE.md](file:///c:/feaspro/ARCHITECTURE.md) for detailed domain models, multi-tenant isolation specifications, and calculation engine guides.

