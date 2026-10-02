# Patch Management System

A monorepo for an enterprise patch management system. The frontend follows the existing Azure Update Manager-inspired interface, while the backend is organized by domain so the team can work in parallel.

## Architecture

```text
patch-management-system/
├── apps/
│   ├── web/                 # Next.js App Router + TypeScript
│   └── api/                 # NestJS + Prisma REST API
├── packages/
│   └── shared/              # Shared enums and interfaces
├── package.json             # npm workspaces and monorepo scripts
└── README.md
```

The backend uses PostgreSQL through Prisma. The frontend calls the API through `NEXT_PUBLIC_API_URL`.

## Requirements

- Node.js 20 or later
- npm 10 or later
- PostgreSQL 15 or later

## Installation

Run from the repository root:

```bash
npm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Set `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET` in `apps/api/.env`. Never commit real environment files. For local PostgreSQL, both database URLs may be identical. With Supabase, use the transaction pooler on port `6543` for `DATABASE_URL` and a direct/session connection on port `5432` for Prisma Migrate through `DIRECT_URL`.

## Database setup

Create a PostgreSQL database named `patch_management`, then run:

```bash
npm run db:generate
npm run db:migrate -- --name init
npm run db:seed
```

For Supabase or an environment that already has repository migrations, run `npm run db:migrate:deploy` instead of `db:migrate -- --name init`, then run `npm run db:seed`. Do not seed before migrations have created the tables. The API Prisma Client and seed script automatically add `sslmode=require`, `connect_timeout=30`, and a five-connection limit for the Supabase transaction pooler when those parameters are absent. Prisma Migrate reads `DIRECT_URL` directly; if the direct connection is slow, add `sslmode=require&connect_timeout=30` to `DIRECT_URL`. Never commit a URL containing a password.

The seed creates five accounts. All use the password `password123`:

| Email | Role |
|---|---|
| `admin@example.com` | `ADMIN` |
| `manager@example.com` | `MANAGER` |
| `helpdesk@example.com` | `IT_HELPDESK` |
| `security@example.com` | `SECURITY_ANALYST` |
| `user@example.com` | `USER` |

The seed also creates sample software, patches, devices, a pending deployment plan, a ticket, and a policy. Use these credentials only in development environments.

## Roles and permissions

The system uses a simple role enum rather than a dynamic RBAC schema, which is appropriate for the current project scope:

| Role | Primary responsibilities |
|---|---|
| `ADMIN` | Manage accounts, the software catalog, policies, and audit logs |
| `MANAGER` | View reports and monitor or review deployment plans |
| `IT_HELPDESK` | Create and deploy plans, monitor devices, and handle tickets |
| `SECURITY_ANALYST` | Read software, patch, device, plan, report, and audit data to assess risk |
| `USER` | Monitor assigned devices, notifications, and tickets |

`SECURITY_ANALYST` currently has read-only access to administrative and deployment data. This role cannot create, edit, or delete software; modify policies; review plans; or deploy plans. Advanced CVE/CVSS functionality is reserved for a later phase and does not require migration to a 24-table dynamic RBAC schema.

## Local development

```bash
# Run both applications
npm run dev

# Or run each application separately
npm run dev:web
npm run dev:api
```

- Frontend: `http://localhost:3000`
- Login: `http://localhost:3000/login`
- Backend API: `http://localhost:4000/api`
- Health check: `GET http://localhost:4000/api/health`

## Code checks

```bash
npm run lint
npm run build
npm run build:web
npm run build:api
```

## UML diagrams

Editable use case, state, sequence, activity, and class diagrams, with SVG and PNG exports for reports, are available in [docs/uml](docs/uml/README.md).

## API scaffold

Every route except `/api/health`, `/api/auth/login`, and `/api/auth/refresh` requires `Authorization: Bearer <accessToken>`.

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/users/me`
- `GET|POST /api/users` (`ADMIN` only; responses exclude password and token hashes)
- `GET|PATCH|DELETE /api/users/:id` (`ADMIN` only; `DELETE` deactivates the account without deleting its data)
- `GET /api/software`
- `GET /api/patches`
- `GET /api/devices`
- `GET /api/devices/me` (devices assigned to the current `USER`)
- `GET|POST /api/deployment-plans`
- `PATCH /api/deployment-plans/:id/review`
- `POST /api/deployment-plans/:id/deploy`
- `GET /api/deployment-tasks`
- `GET|POST /api/tickets`
- `PATCH /api/tickets/:id/status`
- `GET /api/notifications`
- `GET /api/reports/overview`
- `GET /api/audit-logs`
- `GET /api/policies`
- `PATCH /api/policies/:id`
- `GET /api/agent/status`

Audit logs record account, software, deployment plan, ticket, policy, and logout changes. They store only the action, actor, entity ID, and route—never request bodies or tokens. Audit recording is best-effort at the scaffold stage: an audit failure produces a server warning but does not fail the original API operation. An outbox or shared transaction can be added later for stronger guarantees.

Example login request:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"helpdesk@example.com","password":"password123"}'
```

## Team task and branch rules

1. **Platform and administration:** `auth`, `users`, `roles`, `policies`, `audit-logs`, migrations, and security.
2. **Assets, patches, and security data:** `software`, `patches`, `devices`, Windows agent collection/scan results, and `security-inventory`.
3. **Operations and support:** `deployment-plans`, `deployment-tasks` simulation, `tickets`, `notifications`, `reports`, and dashboard.

Review schema changes as a team. Put shared contracts in `packages/shared` and avoid redeclaring business enums in individual applications.

Use the [current task/branch plan](docs/TEAM_TASK_PLAN.md) for task IDs, dependencies, allowed files and acceptance checklists, and the [2026-10-03 codebase audit](docs/CODEBASE_AUDIT_2026-10-03.md) for completed versus pending-branch work. The plan supersedes the older Downloads copy; future feature branch names are proposals until their prerequisites merge.

All contributors and AI agents must follow [AGENTS.md](AGENTS.md), the [Task Execution Contract](docs/TASK_EXECUTION_CONTRACT.md), and applicable [UI](docs/UI_DESIGN_CONTRACT.md) and [Windows Agent](docs/AGENT_DESIGN_CONTRACT.md) contracts. The Windows agent performs real update discovery/reporting to the Linux API; installation and restart are excluded and deployment tasks remain simulated. The baseline merge is on hold until the team releases BASE-01; do not recreate existing pending frontend/auth work.

## Deployment

### Vercel — frontend

- Import the repository and select `apps/web` as the Root Directory.
- Set `NEXT_PUBLIC_API_URL=https://<render-service>/api`.
- Use the default Next.js build command.

### Render — backend

- Build command from the repository root: `npm install && npm run db:generate && npm run build:api`.
- Start command: `npm run start:prod --workspace=@patch-management/api`.
- Set `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `FRONTEND_URL`, and `PORT`.
- Attach Render PostgreSQL and run `npm run db:migrate -- --name init` in a preparation environment before release.

Never use seed accounts or example JWT secrets in production.
