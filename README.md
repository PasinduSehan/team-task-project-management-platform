# Project Platform — Team Task & Project Management

This repository is a full-stack TypeScript project implementing a team project and task management platform with a hybrid database layer (PostgreSQL when available, JSON fallback for local development).

## Quick overview
- Backend: Node.js + TypeScript + Express (server entry: `server.ts`).
- Frontend: React + Vite (sources under `src/`).
- Database: Prefer PostgreSQL via `pg` when `DATABASE_URL` is set; otherwise a file-based JSON fallback at `database.json` in the project root.
- Auth: JWT-based with password hashing (bcryptjs). Auth middleware is in `server/auth.ts`.
- Uploads: File uploads are saved to the `uploads/` directory in project root and served from `/uploads`.

## Important files
- `server.ts` — Express server and API route handlers.
- `server/db.ts` — Database abstraction (PostgreSQL via `pg` Pool when `DATABASE_URL` exists; otherwise JSON fallback). Exports `db` instance used across server code.
- `server/auth.ts` — JWT authentication and role guard middlewares.
- `src/types.ts` — Shared TypeScript types and enums.
- `database.json` — (created at runtime) JSON fallback DB used when `DATABASE_URL` is not configured.
- `uploads/` — runtime directory for uploaded attachments.

## Environment variables
- `DATABASE_URL` — PostgreSQL connection string. If provided, the server will use Postgres instead of the JSON fallback. Example: `postgres://user:pass@host:5432/dbname`
- `JWT_SECRET` — Secret used for signing JWTs. A default secret is present for development but you should override this for production.
- `PORT` — Port to run the server (default 3000).
- `NODE_ENV` — `production` or `development` (used for Vite middleware vs. static build serving).

Set env vars in PowerShell like:

```powershell
$Env:DATABASE_URL = 'postgres://user:pass@host:5432/dbname'
$Env:JWT_SECRET = 'your-secret-here'
$Env:NODE_ENV = 'development'
```

Or create a `.env` loader as you prefer.

## Running the project (development)

1. Install dependencies:

```bash
npm install
```

2. Start the dev server (uses `tsx` to run TypeScript directly):

```bash
npm run dev
# or
npx tsx server.ts
```

The server prints a boot message and listens on the configured port (default `http://0.0.0.0:3000`). The Vite middleware is used in development so the frontend will be served from the same process.

## Database behavior

- When `DATABASE_URL` is set, `server/db.ts` uses `pg` Pool and runs parameterized SQL queries against your Postgres instance.
- When `DATABASE_URL` is not set, the server reads/writes `database.json` in the project root. This file is auto-created and seeded with a small development dataset.

Files and runtime locations:
- JSON fallback: `database.json` at project root.
- Uploads: `uploads/` at project root.

If you want to use Postgres, you need to create the required tables. Example simplified SQL schema (adapt as needed):

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE passwords (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT,
  manager_id TEXT REFERENCES users(id),
  progress_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE project_members (
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  assigned_user_id TEXT REFERENCES users(id),
  project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
  start_date DATE,
  due_date DATE,
  estimated_hours INTEGER,
  created_by_id TEXT REFERENCES users(id),
  updated_by_id TEXT REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE task_comments (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  user_full_name TEXT,
  role TEXT,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT REFERENCES tasks(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  type TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  user_full_name TEXT,
  action TEXT,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## API overview (select endpoints)
- `POST /api/auth/register` — register a new user (returns JWT)
- `POST /api/auth/login` — login (returns JWT)
- `GET /api/auth/me` — get current user
- `GET /api/users` — list users
- `POST /api/users` — create user (Admin)
- `PUT /api/users/:id` — update user (Admin)
- `DELETE /api/users/:id` — delete user (Admin)
- `GET /api/projects` `GET /api/projects/:id` `POST /api/projects` `PUT /api/projects/:id` `DELETE /api/projects/:id`
- `GET /api/tasks` `GET /api/tasks/:id` `POST /api/tasks` `PUT /api/tasks/:id` `DELETE /api/tasks/:id`
- `GET /api/tasks/:taskId/comments` `POST /api/tasks/:taskId/comments`
- `GET /api/tasks/:taskId/attachments` `POST /api/tasks/:taskId/attachments`
- `GET /api/notifications` and mark/read endpoints
- `GET /api/reports/dashboard` — aggregated dashboard stats

Refer to `server.ts` for full route implementations and authorization rules.

## Troubleshooting
- If the server fails to start due to DB errors and you don't have a Postgres instance configured, unset `DATABASE_URL` to use the JSON fallback.
- If using Postgres, ensure the tables above exist and the user has appropriate permissions.

## Development notes
- The project uses `tsx` for directly running TypeScript in dev (`npm run dev`).
- Type definitions are in `src/types.ts` — keep them in sync with DB schema.

If you'd like, I can:
- Add SQL migration scripts and a `npm` script to apply them,
- Dump the current `database.json` contents,
- Or create a Postgres docker-compose example for local development.

--
