# Codebase audit — 2026-10-03

This audit separates code already implemented from code merged into the team's baseline and from workflows actually accepted end to end. It is a local repository review, not a fresh inspection of remote PRs or the Google Sheet. Unpushed teammate work is not included.

## Revisions and evidence

| Reference | Revision | Meaning |
|---|---|---|
| Local `main` / locally stored `origin/main` | `bbfff3e` | Current integration baseline; no remote fetch performed |
| `docs/windows-agent-scan-contract` before this audit | `d419491` | One documentation commit above main; application code matches main |
| `fix/dashboard-loading-controls` | `da81ba4` | Nine commits above main; contains UI rules, auth fix, migration, cookies/live data, loading and search improvements |
| `feat/cookie-auth-live-data` / `fix/frontend-ui-contract` | `26ac1b4` / `4e3ac8a` | Ancestors of `da81ba4`; do not merge or reimplement these as separate feature deliveries |

The old planning source is `~/Downloads/PATCH_MANAGEMENT_BRANCH_PLAN_2026-09-30.md`. Old task IDs below retain that plan's associations; Sheet titles/statuses have not been re-fetched. The replacement is `docs/TEAM_TASK_PLAN.md`. Historical checks in `docs/MANUAL_TEST_CHECKLIST.md` remain historical evidence, not a certification of the current revision.

## Findings by domain

| Domain / old tasks | Implemented evidence | Remaining work / new task |
|---|---|---|
| Auth/session, ADM-01 | Login, JWT, active-account check, refresh/logout in main. Full-token hash and replay regression test in `9b36c96`; HttpOnly proxy/session in `26ac1b4`. | Integrate existing work, do not repeat it. Direct-URL authorization and expiry/regression coverage: BASE-01, M1-01, M1-04. Main still uses bcrypt on the long refresh JWT and browser localStorage. |
| Accounts/roles, ADM-02, ADM-07, SEC-04 | Five-role enum, Admin account CRUD/deactivation, safe selects, role guards, unit tests. | Expand HTTP/route matrix beyond guard mocks, test ownership on direct IDs: M1-01/M1-04. No dynamic RBAC schema required. |
| UI baseline | Single shared shell exists; contract-aligned pages, live data, unified loading/search/actions in `da81ba4`. | Merge gate is pending. Do not assign those components for redevelopment. Page actions still need implementation in their domains. |
| Software/patch catalog, INV work | Admin CRUD and read views exist. Patch writes lack the audit decorators used by software writes. | Preserve CRUD; add patch audit coverage under M2-01 with M1 review. Standalone patch approval is not an implemented workflow. |
| Inventory/compliance, INV-03/04/05/07 | Device CRUD/search, owner-scoped list, installed software, compliance endpoint/UI and three compliance unit tests. `FilterDeviceDto` only accepts `q`. | Pagination absent. Compliance compares installed version with software.currentVersion and returns every patch for outdated software; it does not check applicability per patch. Fix correctness and consumer compatibility: M2-01. |
| Agent, INV-06/04 | Separate Node agent, heartbeat, OS metadata, scan timestamp, connection-state calculation. `lastScanResult` exists in schema/migration. | `scan()` ignores request body; `AgentScanDto` is unused; scan result is not saved. No Windows Update query. Shared agent token is not bound to device ID. M1-02 supplies identity/wire contract; M2-02/M2-03 implement Windows collection and ingestion/UI. |
| Risk inventory, SEC-02 | Severity/search filters, risk summary and affected-device list; one unit test. | Uses software.currentVersion before patch.version and permissive digit comparison; can overcount or misclassify unknown versions. No full CVE/CVSS registry or automatic Windows-KB-to-CVE mapping. M2-04. |
| Plans, OPS-01/03 | Draft creation, detail, edit, delete; Manager review API; Helpdesk deploy API. UI create/edit exists. | No submit endpoint/action. Review checks existence but not source state; rejection note optional. Edit/delete lack creator checks. UI offers delete for CHANGES_REQUESTED while API permits DRAFT only. M3-01. |
| Tasks, OPS-04 | Creates device × patch tasks; deploy switches plan to DEPLOYING and tasks to PENDING; tasks can be listed. | No progress execution, completion aggregation, bounded retry or task-run history. No real installer. M3-02 adds explicitly labeled backend simulation. |
| Tickets/notifications, OPS-02/05/06/08 | Ticket create/list/status APIs and owner-filtered list; notification recipient-filtered GET. Existing models support comments and assignment. | No comment/assignment API, validated transition workflow, recipient read action or event delivery. Ticket page is read-only on `da81ba4`, placeholder on main. M3-03/M3-04. |
| Dashboard/reports, OPS-07, SEC-03 | Main dashboard has demo data; `da81ba4` uses live devices/patches/plans. Overview API has five counters; live report view on branch. | Do not redo live-data conversion. Add scan freshness, truthful operational/simulation aggregates after upstream features: M3-05. |
| Policies/audit, ADM-04/05/06 residual | Policy read/update API; audit interceptor/read API. Read-only live pages on `da81ba4`. | Policy editor and audit filtering/search bounds; patch coverage is M2-01. Audit is best-effort, not transactionally guaranteed. M1-03/M1-04. |
| Schema/release, ADM-03/08 | Prisma models, seeds, Supabase URL handling, migrations in repo. | Prisma has extra review states/fields missing from main's migrations; `efc56d7` supplies their migration. Shared PlanStatus still omits those states. Do not infer new security-review authority from unused fields. M1-02 reconciles types without activating stages; M1-04 validates a fresh test DB. |

Source paths: `apps/api/src/modules/{auth,users,devices,patches,agent,security-inventory,deployment-plans,deployment-tasks,tickets,notifications,policies,audit-logs,reports}`, `apps/agent/src/index.ts`, `apps/api/prisma/{schema.prisma,seed.ts,migrations}`, `packages/shared/src/index.ts`, and the corresponding pages/layout in `apps/web/src` (inspect `da81ba4` for branch-only UI changes).

## Verification performed in this audit

- [x] Read controllers, service behavior, DTOs, schema/migrations, existing test coverage, current and pending-branch page integration, and the old task plan.
- [x] On `d419491` application code: `npx tsx --test test/*.spec.ts` from `apps/api`: **30 passed, 0 failed**. These are primarily mocks/guard tests; they do not prove live Supabase or Windows behavior. The audit-storage warning is an intentional failure-path test.
- [x] `npm run build`: shared, Prisma generation, API and web passed. Prisma's package.json configuration deprecation warning is non-blocking; Next build skips type checking, so lint is a separate gate.
- [x] `npm run lint`: all four workspaces passed after fresh Next output was generated. Initial failure referenced a proxy route absent on main because `.next` still contained types from `da81ba4`. The old cache was moved to `/tmp/pt-tkht-next-audit.IthWyQ/.next`, and the generated `next-env.d.ts` rewrite was reverted.
- [ ] Current Supabase integration/migrate/seed: not run in this audit.
- [ ] Windows Update scan on Windows: not implemented or run.
- [ ] Five-role browser acceptance and direct-URL regression: not run in this audit.

Prior-session evidence for `da81ba4` includes 31 API tests, lint/build, and frontend desktop/mobile checks; it must not be attributed to main. Its checklist also records Supabase/cookie checks from 2026-10-01. BASE-01/M1-04 require revalidation on the integrated revision.

## Decisions applied to the replacement plan

1. Preserve member ownership: member 1 platform/admin/security and release; member 2 inventory/Windows agent/risk data; member 3 deployment/tickets/notifications/reports. Member 1 temporarily owns the agent credential boundary so member 2 can focus on the Windows adapter; these API edits are serialized.
2. Accept real Windows update discovery/reporting to a Linux-hosted API. Deployment remains a simulation and cannot modify real inventory, install packages, reboot endpoints, or claim actual remediation.
3. Keep SECURITY_ANALYST read-only and Helpdesk/Manager plan duties separate. Existing unused testing/security-review fields are not authorization to expand the workflow.
4. Record incomplete work as partial; no completion percentage is inferred from routes, enum values, build success, or old tick marks.
5. Keep both existing branches unmerged until the team releases BASE-01. This audit/documentation task does not authorize an application merge.
