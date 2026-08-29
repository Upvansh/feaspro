# FeasPro Technical Architecture Document

## 1. Executive Overview

**FeasPro** is a specialized property development feasibility and financial modelling platform engineered to evaluate the financial viability, cash flow mechanics, and capital returns of property development projects.

This document describes the Phase 1 foundational architecture, multi-tenant security, domain model, database migration structure, and modular extension points for future calculation, reporting, and AI engines.

---

## 2. System Architecture Overview

```
+-----------------------------------------------------------------------+
|                              Frontend                                 |
|      (React 18 + TypeScript + Vite + Bespoke Vanilla CSS Design)      |
|                                                                       |
|  +---------------------+   +---------------------+   +-------------+  |
|  |  Dashboard / Lists  |   |  Project Workspace  |   |  Scenarios  |  |
|  +---------------------+   +---------------------+   +-------------+  |
|  +-----------------------------------------------------------------+  |
|  |     Sub-Navigation (Overview, Land, Costs, Sales, Funding...)   |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                   │ HTTP / JSON API (REST)
                                   ▼
+-----------------------------------------------------------------------+
|                               Backend                                 |
|                (FastAPI + Pydantic v2 + SQLAlchemy 2.0)               |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |  Multi-Tenant Auth & Access Layer (JWT + Tenant Organization)  |  |
|  +-----------------------------------------------------------------+  |
|  |  API Routers (/api/v1/auth, /api/v1/projects, /api/v1/scenarios)|  |
|  +-----------------------------------------------------------------+  |
|                                                                       |
|  +-----------------------------------------------------------------+  |
|  |      DETERMINISTIC FINANCIAL ENGINE LAYER (backend/calculations)|  |
|  |  - revenue.py    - costs.py       - funding.py                  |  |
|  |  - cashflow.py   - feasibility.py                               |  |
|  +-----------------------------------------------------------------+  |
+-----------------------------------------------------------------------+
                                   │ SQLAlchemy ORM & Alembic Migrations
                                   ▼
+-----------------------------------------------------------------------+
|                               Database                                |
|        (SQLite for Local Dev/Testing ↔ PostgreSQL in Production)       |
|                                                                       |
|  - organizations        - users               - projects              |
|  - scenarios            - [Future: land_assumptions, cost_items...]   |
+-----------------------------------------------------------------------+
```

---

## 3. Frontend Architecture

- **Stack**: React 18, TypeScript, Vite, custom CSS Design System (`index.css`), Lucide icons.
- **Design System Principles**:
  - High-density financial SaaS aesthetic without third-party CSS bloat.
  - Tabular financial numerals with `JetBrains Mono` and clean UI with `Plus Jakarta Sans`.
  - Accessible modal dialogs with backdrop blur, responsive card grids, and sub-nav tab switching.
- **Component Breakdown**:
  - `Sidebar.tsx`: Organization branding, quick action for new project creation, navigation links.
  - `Header.tsx`: Contextual breadcrumbs and multi-tenant security indicators.
  - `CreateProjectModal.tsx`: Project name, typology, address, dates, and initial scenario creation.
  - `CreateScenarioModal.tsx`: Project scenario branching modal with baseline designation.
  - `ProjectCard.tsx` / `ProjectTable.tsx`: Grid & high-density table views with status & scenario count badges.
  - `UpcomingModuleCard.tsx`: Standardized placeholder view for Phase 2/3/4 roadmap modules.
  - `DashboardView.tsx`: Portfolio metrics (Total projects, active feasibilities, drafts, scenario counts) and filter bars.
  - `ProjectDetailView.tsx`: Project workspace shell with sub-navigation (`Overview`, `Land`, `Costs`, `Sales`, `Funding`, `Schedule`, `Cash Flow`, `Scenarios`, `Reports`).

---

## 4. Backend Architecture

- **Stack**: Python 3.12, FastAPI, SQLAlchemy 2.0 (PostgreSQL-compatible), Alembic, Pydantic v2, direct `bcrypt` hashing, `python-jose` for JWTs.
- **Directory Layout**:
  ```
  backend/
  ├── alembic/                 # Database migrations
  │   ├── versions/            # Versioned migration scripts
  │   └── env.py               # Alembic configuration
  ├── app/
  │   ├── api/
  │   │   └── v1/
  │   │       ├── auth.py      # Login and user verification
  │   │       ├── projects.py  # Project CRUD, filtering, soft-delete archive/restore
  │   │       ├── scenarios.py # Feasibility scenario management
  │   │       ├── reports.py   # (Phase 3) Executive feasibility reporting & standalone HTML/PDF export
  │   │       └── router.py    # Combined v1 API router
  │   ├── calculations/        # Dedicated deterministic financial calculation engine
  │   │   ├── __init__.py
  │   │   ├── revenue.py       # GRV, net realization, sales phasing
  │   │   ├── costs.py         # Land acquisition, statutory fees, construction, contingency
  │   │   ├── funding.py       # Senior debt, mezzanine, equity waterfall, interest capitalization
  │   │   ├── cashflow.py      # S-curves, monthly cash flow phasing, peak debt
  │   │   └── feasibility.py   # Development margin, RoC, IRR, NPV
  │   ├── core/
  │   │   ├── config.py        # Environment settings (Pydantic SettingsConfigDict)
  │   │   ├── database.py      # DB engine, session factory, startup demo seeder
  │   │   └── security.py      # Multi-tenant authentication, JWT, password verification
  │   ├── models/
  │   │   ├── base.py          # DeclarativeBase with timestamp mixin
  │   │   ├── organization.py  # Multi-tenant organization model
  │   │   ├── user.py          # User authentication and roles
  │   │   ├── project.py       # Project domain model with soft-delete
  │   │   └── scenario.py      # Feasibility scenario model
  │   ├── schemas/
  │   │   ├── auth.py          # Auth requests/response schemas
  │   │   ├── project.py       # Project schemas with date ordering & type validation
  │   │   └── scenario.py      # Scenario schemas with validation
  │   └── main.py              # FastAPI application entrypoint with lifespan startup
  └── tests/
      ├── conftest.py          # In-memory test database & auth fixtures
      ├── test_projects.py     # Project CRUD, validation, archival tests
      ├── test_scenarios.py    # Scenario creation & baseline toggle tests
      └── test_security.py     # Multi-tenant isolation & auth security tests
  ```

---

## 5. Database Architecture & Domain Model

The database schema is strictly designed to be 100% PostgreSQL-compatible using standard SQL types, foreign key cascades, and timestamp columns.

### Current Models (Phase 1):
1. **`organizations`**:
   - `id` (VARCHAR(36), PK, UUID)
   - `name` (VARCHAR(255))
   - `slug` (VARCHAR(255), Unique Index)
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIMEZONE)
2. **`users`**:
   - `id` (VARCHAR(36), PK, UUID)
   - `organization_id` (FK → `organizations.id`, Index)
   - `email` (VARCHAR(255), Unique Index)
   - `hashed_password` (VARCHAR(255))
   - `full_name` (VARCHAR(255))
   - `role` (VARCHAR(50))
   - `is_active` (BOOLEAN)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIMEZONE)
3. **`projects`**:
   - `id` (VARCHAR(36), PK, UUID)
   - `organization_id` (FK → `organizations.id`, Index)
   - `created_by_id` (FK → `users.id`, Nullable)
   - `name` (VARCHAR(255))
   - `description` (TEXT)
   - `location` (VARCHAR(255))
   - `development_type` (VARCHAR(100))
   - `status` (VARCHAR(50))
   - `start_date` (DATE)
   - `target_completion_date` (DATE)
   - `is_archived` (BOOLEAN, Index)
   - `archived_at` (TIMESTAMP WITH TIMEZONE)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIMEZONE)
4. **`scenarios`**:
   - `id` (VARCHAR(36), PK, UUID)
   - `project_id` (FK → `projects.id`, Cascade Delete, Index)
   - `name` (VARCHAR(255))
   - `description` (TEXT)
   - `is_baseline` (BOOLEAN)
   - `status` (VARCHAR(50))
   - `created_at`, `updated_at` (TIMESTAMP WITH TIMEZONE)

### Future Planned Tables (Anchored to `scenarios.id`):
- `land_inputs`: Site area, purchase price, settlement dates, stamp duty, zoning parameters.
- `cost_items`: Categorized cost line items, unit rates, GFA calculations, escalation curves.
- `sales_items`: Product unit mix, pricing schedule, GST margin scheme flags, sales velocity.
- `funding_sources`: Senior debt, mezzanine, equity, interest rates, capitalisation rules.
- `project_schedules`: Gantt phase milestones, durations, dependencies.
- `calculation_results`: Cached deterministic calculation snapshots for fast retrieval.

---

## 6. Multi-Tenant Security & Soft Deletion

- **Multi-Tenant Isolation**: All project and scenario queries strictly filter by `organization_id`. Cross-organization requests return `404 Not Found` to prevent metadata leakage.
- **Soft-Delete / Archival**: Normal project deletion executes an archival update (`is_archived = True`, `archived_at = timestamp`, `status = "archived"`). Active project lists exclude archived items by default unless explicitly queried with `include_archived=true`. A restore endpoint is provided.

---

## 7. Future Engine Locations & Integration Points

1. **Deterministic Calculation Engine**:
   - **Path**: `backend/app/calculations/`
   - **Principle**: Pure Python functions accepting typed input dataclasses and returning deterministic result dictionaries. Zero calculation formulas in React components or API routes.
2. **Reporting & Export Engine**:
   - **Path**: `backend/app/reporting/`
   - **Purpose**: Generates bank-ready PDF summaries and formatted `.xlsx` financial cash flow models from calculation outputs.
3. **AI / RAG Integration**:
   - **Path**: `backend/app/ai/`
   - **Purpose**: RAG retrieval over planning schemes, council DCP/LEP policies, and project notes without polluting core financial calculation determinism.
