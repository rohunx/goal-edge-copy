# Goal Edge Full-Stack Soccer Analytics App

Goal Edge is a decoupled full-stack soccer analytics app with a React frontend and FastAPI backend:

- React + Vite + TypeScript frontend
- FastAPI backend
- PostgreSQL-ready SQLAlchemy database layer
- JWT auth with hashed passwords
- API-Football sync from the backend
- SQL-level match search/filtering
- Mocked prediction inference with a visible placeholder disclaimer

## No automatic seed data

The backend creates database tables only. Register a new account in the UI, then click Sync Matches to pull API-Football matches into the database.

## Local Windows setup

Open two PowerShell windows from the project root.

### 1. Backend

```powershell
cd backend

# deactivate previous environments
deactivate
conda deactivate

# Remove old venv
Remove-Item -Recurse -Force .venv

python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

By default, the backend uses SQLite so you can run it immediately:

```text
DATABASE_URL=sqlite:///./goal_edge.db
```

For PostgreSQL, update `backend/.env`:

```text
DATABASE_URL=postgresql://postgres:password@localhost:5432/goal_edge
```

### 2. Frontend

```powershell
npm cache clean --force
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force dist -ErrorAction SilentlyContinue
npm install --verbose
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

The Vite dev server proxies `/api` to the FastAPI backend on port `8000`.

## API-Football

The API-Football key is read only by the backend from:

```text
backend/.env
```

The frontend does not call API-Football directly anymore. This is safer and closer to a production deployment.

## Important production notes

- Replace `JWT_SECRET_KEY` before deploying.
- Do not commit real `.env` files to GitHub.
- Use a hosted PostgreSQL database such as Neon, Supabase, Railway, Render Postgres, or AWS RDS.
- Deploy the backend to Render/Railway/Fly.io/AWS.
- Deploy the frontend to Vercel/Netlify.
- Set `VITE_API_BASE_URL` to your deployed backend URL, such as `https://your-api.onrender.com/api`.

## What is real vs mocked

Real:

- Login/register system
- JWT sessions
- SQL database persistence
- API-Football sync endpoint
- Match search/filtering through backend SQL queries
- Saved models and prediction history in the database

Mocked:

- AI inference output. The backend currently returns a random integer from 0 to 100 and displays `Prediction is a placeholder - Model in Maintenance Mode` in the UI.
