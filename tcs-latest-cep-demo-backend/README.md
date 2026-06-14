# CMS Survey Backend

FastAPI backend for the CMS survey workflow demo.

## Stack
- FastAPI
- SQLAlchemy
- Alembic
- PostgreSQL
- Docker Compose (backend + database only)

## Run With Docker Compose (Backend + DB)
From `demo-app/backend`:

```bash
docker compose down -v
docker compose up --build
```

Backend endpoints:
- API health: `http://localhost:8000/health`
- API docs: `http://localhost:8000/docs`

## Run Locally (Uvicorn + Docker DB)
Start only database in Docker:

```bash
cd /Users/preetharamadas/Documents/Work/TCS/demo-app/backend
docker compose up -d postgres
```

Run backend locally:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## Notes
- `entrypoint.sh` applies migrations and seeds data when backend container starts.
- Use `docker compose down -v` after seed/schema changes for a clean reset.
