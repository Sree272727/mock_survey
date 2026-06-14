# CMS Survey Frontend

React + Vite frontend for the CMS survey workflow demo.

## Stack
- React
- TypeScript
- Vite
- React Router

## Run Locally
From `demo-app/frontend`:

```bash
npm install
npm run dev
```

Frontend URL:
- `http://localhost:5173`

## Backend API Configuration
The frontend reads backend base URL from `VITE_API_BASE_URL`.

Default in code:
- `http://localhost:8000`

If needed, create `.env`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```
