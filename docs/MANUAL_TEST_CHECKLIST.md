# Manual Test Checklist — Patch Management System

Record the tester, date, `main` commit, browser, and result for each item (`PASS`, `FAIL` with a screenshot/log, or `N/A`). Use only the Supabase **test** database. Create dedicated temporary data for create/delete/deactivate operations; never deactivate demo accounts or delete software that has real patches.

Frontend: `http://localhost:3000`. API: `http://localhost:4000/api`. The five demo accounts and password are listed in the README. For items marked “API-only,” use Postman/curl and an access token for the correct role; the corresponding frontend pages are not yet connected to the API.

## 1. Environment and connectivity

- [x] On `main` with a clean worktree; `npm install`, `npm run lint`, and `npm run build` completed.
- [x] `apps/api/.env` points to the Supabase test environment: `DATABASE_URL` uses pooler port `6543`, and `DIRECT_URL` uses port `5432`; screenshots and logs do not expose URLs or passwords.
- [x] `npm run dev` starts the frontend and API; `GET /api/health` succeeds and the login page has no `NetworkError`.
- [x] `npx prisma migrate status` in `apps/api` reports an up-to-date schema; if port `5432` is slow, `DIRECT_URL` includes `sslmode=require&connect_timeout=30`.
- [x] The seed contains 5 users, 3 software entries, 3 patches, 3 devices, 1 plan, and 1 ticket; rerunning `npm run db:seed` creates no duplicates.

## 2. Authentication, sessions, and shared layout

- [x] Sign in as `ADMIN`, `MANAGER`, `IT_HELPDESK`, `SECURITY_ANALYST`, and `USER`; each account reaches the Dashboard and `/profile` shows the correct name, email, and role.
- [x] An invalid email/password shows an error and creates no session; `POST /auth/login` returns an authentication error.
- [x] Without a token, opening `/dashboard` redirects to `/login`; protected API endpoints return `401` without a Bearer token.
- [x] Moving between modules keeps the left sidebar mounted, updates the selected item, and changes content without a full page reload.
- [x] Collapsing/expanding the sidebar, opening the mobile menu, and opening `/profile` from the account menu all work.
- [x] Signing out clears the browser session and returns to `/login`; revisiting a protected page does not sign the user in again.
- [ ] When the access token expires, the API request refreshes once and continues; logged-out or expired refresh tokens cannot be reused. Postman may be used instead of waiting 15 minutes. **API 2026-09-21:** refresh and logout work, and refresh after logout returns `401`, but the old refresh token can still be replayed after rotation (`200`) — FAIL; automatic refresh in the web app after access-token expiry has not been tested.
- [x] `ADMIN` sees the Users menu; other roles do not. `SECURITY_ANALYST` sees only appropriate read-only menus. If another role sees an unauthorized menu, record a UX issue; the API must still return `403`.

## 3. Admin — accounts and software (frontend + API)

- [x] `/users` loads five users and supports searching by name/email/role; password hashes and refresh tokens are never displayed.
- [x] Create a temporary user with a new email, the `USER` role, and a password of at least eight characters; it appears after refresh and can sign in.
- [x] A duplicate email or short password is rejected with a clear message and creates no duplicate account.
- [x] Edit the temporary user’s name/role/password; an old session does not retain the previous role after a role change.
- [x] Deactivate the temporary user through the button or `DELETE /users/:id`; the account remains listed but cannot sign in. Reactivate it through the edit form if needed.
- [x] An Admin cannot deactivate or change their own role; non-Admin roles receive `403` from `GET/POST/PATCH/DELETE /users`.
- [x] `/software` loads the three seeded software entries; search, detail view, and refresh work.
- [x] Admin creates temporary software with a new `name` + `vendor`, edits its version/name, and deletes only that temporary record; the list updates after every operation.
- [x] A duplicate `name` + `vendor` pair is rejected; non-Admin roles have read-only access and receive `403` from software write APIs.

## 4. IT Helpdesk and Manager — deployment plans

- [x] `/deployment-plans` loads the seeded plan; selecting a row shows device, patch, task, and status details.
- [x] `IT_HELPDESK` creates a temporary plan with at least one device and one patch; the plan starts as `DRAFT`, and its task count equals devices × patches.
- [x] Helpdesk edits the name/schedule/devices/patches of a `DRAFT` plan; tasks update correctly without stale duplicates.
- [x] Helpdesk deletes the temporary `DRAFT` plan after confirmation; plans in other states cannot be deleted. Do not delete the seeded plan.
- [x] **API:** `MANAGER` can read plans; `USER` receives `403` from the plan-list API.
- [ ] **UI:** `MANAGER` does not see the plan edit form.
- [x] **API-only:** Helpdesk calls `POST /deployment-plans/:id/submit` to move a `DRAFT` (or `CHANGES_REQUESTED`) plan to `PENDING_APPROVAL`; only the plan creator (or Admin) may submit, and active managers receive a notification.
- [x] **API-only:** Manager calls `PATCH /deployment-plans/:id/review` with `APPROVED`, `REJECTED`, and `CHANGES_REQUESTED`; reviewer, time, and note are saved. Only `PENDING_APPROVAL` plans can be reviewed, a manager cannot review their own plan, and other roles receive `403`.
- [x] **API-only:** Helpdesk calls `POST /deployment-plans/:id/deploy` only for an `APPROVED` plan; the plan becomes `DEPLOYING` and tasks become `PENDING`. An unapproved plan is rejected, and Manager cannot deploy.
- [x] **API-only:** `GET /deployment-tasks` reflects plan tasks; record an issue if task and plan statuses are inconsistent.

## 5. User, tickets, and personal data (API-only except Profile)

- [x] **API:** `GET /devices/me` returns only devices assigned to the current user.
- [ ] **UI:** User opens `/profile` and sees the correct assigned devices.
- [x] User receives `403` from the system-wide `GET /devices`; Helpdesk, Manager, Admin, and Security Analyst can read the device list.
- [x] User creates a temporary ticket through `POST /tickets`, then `GET /tickets` shows only that user’s tickets. Another user cannot see it.
- [x] Helpdesk sees the ticket list, assigns it with `PATCH /tickets/:id/assign` (inactive users and closed tickets are rejected), and changes the temporary ticket status through `PATCH /tickets/:id/status`; User and Security Analyst cannot change status.
- [x] Ticket status changes follow the workflow `OPEN -> IN_PROGRESS -> WAITING_USER -> RESOLVED -> CLOSED` (forward moves may skip steps, only `RESOLVED` reopens, `CLOSED` is final); invalid moves return `400`, and the creator/assignee (never the actor) receive notifications. Helpdesk can filter with `GET /tickets?assignedToMe=true`.
- [x] `GET /notifications` returns only notifications for the signed-in account and does not expose another user’s notifications.

## 6. Security Analyst, policies, reports, and audit (API-only)

- [x] `SECURITY_ANALYST` can read software, patches, devices, plans, tasks, agent status, report overview, and audit logs.
- [x] Security Analyst cannot create/edit/delete software, review/deploy plans, edit policies, or create tickets; the API returns `403`.
- [x] `GET /policies` returns the seeded policy for operational/analyst roles; only Admin can call `PATCH /policies/:id`. A negative maximum deferral is rejected.
- [x] `GET /reports/overview` returns valid statistics for authorized roles; User receives `403`.
- [x] After Admin edits users/software/policies, Manager reviews a plan, and Helpdesk deploys a plan or changes a ticket, `GET /audit-logs` contains the matching actions and actors.
- [x] Audit logs contain no passwords, hashes, access/refresh tokens, or request bodies; User, Helpdesk, and Manager receive `403` from the audit-log API.
- [x] `GET /patches`, `GET /agent/status`, and `GET /deployment-tasks` return valid data or an empty array and do not fail with `500` because of missing relations.

## 7. UI currently using demo or placeholder content — not counted as completed CRUD

- [ ] Dashboard displays **hard-coded demo** data, supports machine search/filter, opens the detail drawer, and changes routes; do not compare these metrics with Supabase.
- [ ] `/devices`, `/patches`, `/tickets`, `/reports`, `/policies`, and `/audit-logs` render without crashing, but are currently placeholders and their “Create new” buttons are not connected.
- [ ] Plan review/deployment, ticket CRUD, policies, audit logs, and reports currently require API testing; track missing frontend work separately instead of marking the working API as failed.

## 8. End of test cycle

- [x] Record every issue with role, URL/API, reproduction steps, redacted input data, expected/actual behavior, and a screenshot/log.
- [x] Verify all temporary test data; remove or deactivate only the intended test records and never delete shared seed data.
- [ ] Rerun login, Profile, Users, Software, and Deployment Plans smoke tests after important fixes.

## 9. Automated API test result — 2026-09-21

- Scope: local API on `:4000` connected to the Supabase test database; fixtures used the `api-check-*` prefix and were cleaned in `finally`.
- Result: **16 groups PASS, 1 group FAIL**. Cleanup was verified with `0` test-prefixed users/software/plans/tickets/notifications remaining.
- PASS: health/401; all five role logins and safe `/users/me` data; Users RBAC/CRUD; Software RBAC/CRUD; device scope; plan create/read/review/deploy/tasks; ticket ownership/status; notification isolation; Security Analyst read-only behavior; policy validation/RBAC; report and operational endpoints; audit ACL and secret hygiene.
- FAIL `POST /auth/refresh`: an old token remains usable after rotation. Reproduction: login → refresh with token A (`200`, receive B) → refresh again with A; expected `401`, actual `200`. Logout with access token B returns `204`, and B is rejected after logout (`401`).
- Likely cause confirmed against the code: the long refresh JWT is stored with bcrypt. Bcrypt compares only the first 72 bytes, while JWTs for the same user share a long prefix, so tokens A and B can match the same hash. Store a SHA-256/HMAC hash of the complete token or store and validate its `jti` instead of applying bcrypt directly to the JWT.
