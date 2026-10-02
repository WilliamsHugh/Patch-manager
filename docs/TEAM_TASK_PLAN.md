# Patch Management System — Team Task and Branch Plan

Updated: **2026-10-03**. This replaces the 2026-09-30 plan. Repository source: `docs/TEAM_TASK_PLAN.md`; the file in Downloads is an export, not a separate task tracker. All paths below are relative to the repository root. The exported filename is retained for convenience even though its contents have been updated.

Read `docs/CODEBASE_AUDIT_2026-10-03.md` for implementation evidence and `docs/TASK_EXECUTION_CONTRACT.md` for mandatory contributor/AI rules. The old Sheet ownership is preserved: **member 1 = platform/admin/security; member 2 = inventory/agent/risk data; member 3 = operations/tickets/reports**. Old task IDs are carried forward from the local plan; this revision does not update or claim to freshly verify the Google Sheet.

## 1. Scope and completion rules

- Target: Windows user workstations, Linux-hosted API, PostgreSQL/Supabase, Next.js web. The endpoint agent really checks for available Windows updates and reports results. Installation, real restart and rollback are excluded. Deployment plans/tasks are explicitly simulated.
- Work is owned by domain; acceptance follows complete cross-role workflows. Do not build a separate application or duplicate modules for each role.
- Status vocabulary: `OPEN`, `IN_PROGRESS`, `BLOCKED`, `IMPLEMENTED_PENDING_MERGE`, `DONE`, `DEFERRED`. `DONE` needs an integrated commit plus acceptance evidence. A working API is not a completed UI workflow.
- `[x]` means that specific item has evidence. An unchecked item remains outstanding even when part of its old task already exists. Proposed feature branch names below have **not** been created by this planning pass.
- Preserve five static roles. Admin manages accounts/catalog/devices/policies; Helpdesk creates/submits and starts simulated plans; Manager reviews plans; Security Analyst reads risk/operational/audit data; User reads own device/ticket/notification data and participates in their own support workflow. API ownership checks remain required even when a menu is hidden.

## 2. Work already present — do not rebuild

| Old work | Evidence / current status | Remaining assignment |
|---|---|---|
| ADM-01 refresh replay fix | Implemented in `9b36c96`, included in `da81ba4`; pending merge | BASE-01 integrates; M1-04 retests |
| Login/logout, five-role guards, account CRUD, software/patch/device CRUD | Present in main `bbfff3e`; see audit for gaps | Extend existing code, not replacement scaffolds |
| Cookie session / live data / loading / shared search and actions | Implemented in `26ac1b4` through `da81ba4`; pending merge | BASE-01; do not assign the conversion again |
| ADM-04/05/06 policy/audit reads | API in main; live read pages on pending branch | M1-03 adds editing/filtering; M2-01 adds patch audit coverage |
| INV-03/04/05/07 device details/compliance | Partial implementation in main | M2-01 correctness; M2-03 real scan presentation |
| INV-06 heartbeat/scan | Heartbeat/time tracking only; not Windows update discovery | M1-02 identity/contract; M2-02 collector; M2-03 persistence |
| SEC-02 risk inventory | Basic list/summary in main | M2-04 correctness and integration evidence |
| OPS-01/03 plans/review | Draft CRUD and review API exist; submission/state checks/review UI incomplete | M3-01 |
| OPS-04 tasks | Tasks created/listed, deploy changes status only | M3-02 |
| OPS-02/05/06/08 support | Basic ticket/notification APIs only | M3-03/M3-04 |
| OPS-07/SEC-03 dashboard/reports | Live data conversion on pending branch; basic overview API | M3-05 completes metrics after upstream work |
| ADM-03/08 schema/release; SEC-04 matrix | Schema/tests exist, release evidence incomplete | M1-02 shared contract, M1-04 final integration |

Audit checks on main-based application code: 30 API tests passed; full build and all-workspace lint passed after refreshing stale Next cache. Supabase and Windows integration were not rerun. See audit for revisions and limits.

## 3. Baseline gate — do this before feature branches

### PLAN-01 — this documentation revision

Owner: member 1. Branch: `docs/windows-agent-scan-contract` (existing, based on `main` at `bbfff3e`). Status: `IMPLEMENTED_PENDING_MERGE`; team review/integration remains pending. Allowed files: task/audit/rule documents, root/scoped `AGENTS.md`, README documentation links, PR template, and the requested Downloads export. No application changes.

- [x] Audit local main `bbfff3e` and pending frontend `da81ba4` separately.
- [x] Preserve Windows scan-only scope and the three member ownership boundaries.
- [x] Validate task IDs, unique branch names, acyclic dependencies, local documentation links and preservation of the pending UI contract.
- [x] Prepare the replacement plan/rules and matching Downloads export; verify exact content equality at handoff.
- [ ] Team review and integrate this documentation revision after the BASE-01 hold is released.

### BASE-01 — integrate the agreed baseline

Owner: member 1; reviewers: members 2 and 3. Status: `BLOCKED` pending the team's existing feature decisions. Integration target: `main`; review the existing `fix/dashboard-loading-controls` and `docs/windows-agent-scan-contract` branches. No automatic merge is authorized by this plan.

- [ ] Team explicitly releases the merge hold; compare with current remote main before integration.
- [ ] Integrate `fix/dashboard-loading-controls` including its auth/migration/live-data fixes. Its ancestor branches do not need separate feature merges.
- [ ] Integrate this documentation branch. Both branches add root `AGENTS.md`: preserve the UI rules **and** the new task/agent rules when resolving the expected add/add conflict. Preserve the latest UI contract requirements.
- [ ] Validate migration `20260930235500_add_plan_review_stages` on the test DB; do not create a duplicate migration for those existing fields.
- [ ] Run build/lint/API tests and five-role login/route smoke checks on the integrated commit; record the new base SHA here: `PENDING`.
- [ ] All members create branches from that updated, clean main. Until then: inspect/design/prepare Windows test access, but do not fork competing UI implementations or merge stale branches.

## 4. Branch overview and order

P0 closes access-control gaps; P1 completes the demonstration; P2 hardens remaining accuracy/coverage. Dependencies are per task, not a rule that all members must wait for a whole wave. No task is marked complete merely because its branch is proposed here.

| Task | Member | Priority | Proposed branch | Start after | Status |
|---|---|---|---|---|---|
| M1-01 Route and API permission alignment | 1 | P0 | `fix/m1-route-rbac-guards` | BASE-01 | OPEN |
| M1-02 Agent identity and shared scan contract | 1 | P1 | `feat/m1-agent-device-credentials` | BASE-01 | OPEN |
| M1-03 Policies and audit administration | 1 | P1 | `feat/m1-policy-audit-workflow` | M1-01 | OPEN |
| M1-04 Integrated role/release acceptance | 1 | P1 | `test/m1-release-rbac-acceptance` | All other P1 features; final pass after M2-04 | OPEN |
| M2-01 Inventory/compliance correctness | 2 | P1 | `fix/m2-inventory-compliance` | BASE-01 | OPEN |
| M2-02 Windows update scan adapter | 2 | P1 | `feat/m2-windows-update-scanner` | M1-02 contract merged | OPEN |
| M2-03 Scan ingestion and device results | 2 | P1 | `feat/m2-agent-scan-results` | M1-02, M2-01, M2-02 | OPEN |
| M2-04 Risk accuracy and cross-flow tests | 2 | P2 | `test/m2-risk-inventory-integration` | M2-03, M3-02 | OPEN |
| M3-01 Plan submission/review workflow | 3 | P1 | `feat/m3-plan-submit-review` | BASE-01 | OPEN |
| M3-02 Deployment task simulation | 3 | P1 | `feat/m3-plan-task-simulation` | M3-01, M2-01 selection contract | OPEN |
| M3-03 Ticket lifecycle | 3 | P1 | `feat/m3-ticket-lifecycle` | M3-02 (same owner), M1-01 | OPEN |
| M3-04 Notifications/read state | 3 | P1 | `feat/m3-notification-workflow` | M3-03 | OPEN |
| M3-05 Operational and scan reporting | 3 | P1 | `feat/m3-live-scan-reports` | M2-03, M3-02, M3-04 | OPEN |

First parallel assignments after BASE-01: **M1-01, M2-01, M3-01**. Member 1 then supplies M1-02 while member 3 continues the plan workflow. Member 2 may prepare Windows VM access and fixtures while waiting for M1-02, without implementing a competing wire/schema contract. Branch counts are not equal effort: Windows integration and release/security work are substantial; M3-04/M3-05 are smaller follow-ups. Rebalance via an explicit task-owner update before crossing boundaries.

## 5. Member 1 — platform, access, administration, release

### M1-01 — route and API permission alignment

Old tasks: ADM-02/07, SEC-04. Reviewer: member 3. Allowed: `apps/web/src/lib` authorization helpers, route access boundary, shared layout navigation integration, auth/role guards and access tests. This is a **dedicated shared-shell exception for access control**, not a visual redesign. Preserve existing session/live-data code.

- [ ] Define one reviewed route/role map; use it for sidebar visibility and direct-URL access. Signed-out users reach login; signed-in unauthorized users see a consistent forbidden state/redirect without mounting protected module content.
- [ ] Verify API permissions independently; test all five roles, direct URLs, direct API calls and ownership. Document intentional API-only reads (such as Analyst policy reads) rather than silently changing existing role rights.
- [ ] Verify role changes/deactivation invalidate access as designed; preserve HttpOnly sessions and session-expiry handling; never reintroduce token storage in browser JavaScript.
- [ ] Match page title/description to the allowed route after redirect; shared sidebar remains mounted; desktop/mobile, collapse and rapid-navigation checks pass.
- [ ] Record HTTP/browser evidence for allowed and denied cases and expiry behavior; retain backend authorization as the source of data access control.

### M1-02 — per-device credentials and scan contract

Old tasks: ADM-03/08, INV-06 prerequisite. Reviewer: member 2. Allowed: agent credential guard/enrollment endpoints and their tests, minimal Prisma migration/seed changes, `packages/shared`, agent configuration documentation. **Member 1 exclusively edits the agent authentication/controller boundary during this task; member 2 begins ingestion changes after merge.** No Windows command implementation here.

- [ ] Publish a versioned shared scan payload/result and examples: scan ID, bound device identity, agent/OS version, start/completion timestamps, success/no-updates/error, available update IDs/KBs/titles, optional severity, bounded diagnostics. Agree limits and freshness/idempotency semantics with M2/M3.
- [ ] Add Admin-controlled credential issuance/rotation/revocation, stored as a hash and shown once. A credential for device A cannot submit for B; a revoked credential fails. Never expose it through normal device/status reads or logs.
- [ ] Reject missing/invalid credentials; distinguish machine authentication from human JWT roles. Provide Windows setup instructions that actually load the configured environment; `tsx` alone does not load `.env` automatically.
- [ ] Minimize schema changes; use existing `lastScanResult` where appropriate. Reconcile Prisma/shared PlanStatus without activating unused TESTING/security-review stages or granting Analyst write access.
- [ ] Test issuance/revocation/device binding, payload contracts and migration on a test DB. Merge before dependent schema/agent API work starts; reserve the schema edit slot in the PR.

### M1-03 — policy editing and audit administration

Old tasks: ADM-04/05/06 residual. Reviewer: member 2. Allowed: `policies`, `audit-logs`, related pages/tests; audit infrastructure only when needed. Patch controllers are owned by M2-01; plan/ticket event producers are owned by M3.

- [ ] Extend the existing live Policy table with Admin-only editing, validation, saving/error states and refresh; operational roles retain read-only access.
- [ ] Provide bounded audit filtering/pagination and an accurate empty/error view; only Admin and Security Analyst read logs.
- [ ] Verify policy/account/catalog and later workflow events capture actor/action/entity/time without tokens or request bodies; list any best-effort audit limitation honestly.
- [ ] Coordinate missing producer events via the owning task, rather than editing another member's active module.
- [ ] API permission/validation tests and UI contract checks pass; no schema rewrite for dynamic permissions.

### M1-04 — integrated role and release acceptance

Old tasks: SEC-04, ADM-03/08 and ADM-01 follow-up. Reviewers: members 2 and 3. Allowed: cross-domain integration tests, release/report documentation, manual checklist and necessary reviewed migration/seed corrections. Feature defects go back to their owner.

- [ ] On one integrated SHA, test five-role login/logout/expiry, refresh replay, direct URL/API access and two-user data isolation. Cover new endpoints, not just decorator metadata.
- [ ] Apply all migrations to a fresh test DB, validate Prisma/shared types, seed twice and check duplicates; confirm existing test data survives additive migrations. Do not use production or reset a shared DB.
- [ ] Coordinate actual Windows scan → Linux API → stored results → authorized web view, plus all simulated plan and support flows listed in section 8.
- [ ] Run root lint/build and relevant test suites; require Windows evidence from M2 and browser evidence from each UI owner. Mark unavailable tests BLOCKED, never PASS.
- [ ] Update `docs/MANUAL_TEST_CHECKLIST.md`, README/demo instructions and report evidence with dates, commit, tester and known limits. Preserve historical results and label superseded failures.

## 6. Member 2 — inventory, Windows scan, risk accuracy

### M2-01 — inventory and catalog compliance

Old tasks: INV-03/04/05/07, patch audit residual. Reviewer: member 1. Allowed: `devices`, catalog applicability helpers, `patches` audit decorators/tests, devices page and related tests. No edits to the plan page or agent credential implementation.

- [ ] Preserve device CRUD/search and installed-software views; define missing/unknown/compliant outcomes per patch. Avoid marking every historical patch missing solely because software.currentVersion is newer.
- [ ] Cover equal/newer/older versions, absent target version, unparseable versions, multiple patches, duplicate IDs and uninstalled software. Unknown versions must not silently become compliant.
- [ ] Add bounded device pagination without breaking existing array consumers (dashboard/plan pickers). Agree an additive/opt-in contract and test existing no-query callers; M3 owns any plan-page adaptation.
- [ ] Add audit events for successful patch create/update/delete using the existing interceptor; denied/failed writes do not emit success events.
- [ ] Document catalog estimates separately from Windows-discovered updates; no inference that a catalog CVE code is a Windows Update identifier. API and responsive UI tests pass.

### M2-02 — real Windows discovery adapter

Old tasks: INV-06/04, revised scope. Reviewer: member 1. Allowed: `apps/agent`, fixed Windows scripts/adapters, fixtures/tests and Windows runbook. Follow `docs/AGENT_DESIGN_CONTRACT.md`; use M1-02 shared types unchanged.

- [ ] Run a fixed Windows Update search through the existing TypeScript agent; emit available-update identifiers/titles/KB references with explicit optional metadata. Installed-hotfix history alone does not satisfy this task.
- [ ] Execute no download/install/uninstall/restart/rollback and accept no server-supplied command. Document the queried update source; never change endpoint update policy to make a scan pass.
- [ ] Add timeout/output limits, cancellation, bounded retry/backoff and non-overlapping scans; keep heartbeat operating independently during a slow scan. Load environment settings explicitly; fail clearly on unsupported OS.
- [ ] Send versioned structured results to the API with the device credential; retry a scan delivery with the same scan ID. Linux fixtures cover parser/transport/errors without invoking Windows commands.
- [ ] Run on a Windows machine/VM and capture redacted output: available updates, an error scenario and successful ingestion when M2-03 is ready. A no-updates fixture is acceptable if the real host has updates; label fixture versus Windows evidence. Task cannot be DONE solely from Linux tests.

### M2-03 — persist scans and show device results

Old tasks: INV-04/05/06/07. Reviewer: member 1. Allowed: agent DTO/controller/service (after M1-02), `devices` read projections, devices page/tests, scoped scan storage changes in a reserved schema slot. Do not rewrite credentials or plan/report pages.

- [ ] Bind real DTOs to scan endpoint, enforce payload limits, persist scan data/time atomically and test that a supplied `result` is actually stored.
- [ ] Make duplicate delivery harmless and reject/ignore out-of-order results predictably. Preserve the distinction between last attempt, last successful scan, no updates and errors; timestamps/freshness cannot be forged into a healthy state unchecked.
- [ ] Expose available Windows updates, scan age/error and connection state in device detail; ownership limits apply to User reads. Heartbeat alone must not imply patch compliance; reconcile stale agent/device status consistently.
- [ ] Keep Windows scan results separate from simulated tasks and catalog estimates; do not fabricate `InstalledSoftware` versions or mark updates installed after simulation.
- [ ] API tests cover device impersonation, invalid/oversized payload, duplicate/out-of-order delivery and empty/error results; Windows-to-API-to-web evidence and UI contract checks pass.

### M2-04 — risk accuracy and inventory integration

Old tasks: SEC-02, INV-08. Reviewer: member 3. Allowed: `security-inventory`, related page/tests and cross-domain test files; targeted shared applicability helper changes coordinated with M2-01 consumers.

- [ ] Match catalog risk calculations to the per-patch applicability rules from M2-01; test severity/filter/unique affected-device counts and unknown versions.
- [ ] Label source/freshness of real Windows findings separately from seeded/catalog CVE-lite data; do not manufacture CVSS, CVEs or a universal compliance percentage.
- [ ] Test plan device/patch selection and invalid IDs against the agreed API; a simulated SUCCESS does not change real inventory or resolve a Windows finding.
- [ ] Analyst reads remain read-only; no full vulnerability registry or 24-table migration. Record evidence and remaining accuracy limits.

## 7. Member 3 — plans, simulated deployment, support, reports

### M3-01 — submit and review plans

Old tasks: OPS-01/03. Reviewer: member 1. Allowed: `deployment-plans` API/page/DTO/tests; shared types only by reservation. Keep the existing draft CRUD and device/patch pickers.

- [ ] Add explicit Helpdesk submit/resubmit: `DRAFT → PENDING_APPROVAL`; `CHANGES_REQUESTED → PENDING_APPROVAL` after edits. Manager may then APPROVE, REJECT or REQUEST_CHANGES; invalid source states fail.
- [ ] Enforce creator ownership for Helpdesk edit/delete/submit operations and test a second Helpdesk account. Manager review records actor/time/note; rejection and change requests require a nonblank reason.
- [ ] Build role-aware submit/review actions with validation, pending/error states and refresh. Delete appears only for DRAFT, matching the API. User cannot read plans; Analyst/Admin remain read-only.
- [ ] Use conditional/transactional state updates; duplicate or racing review/submit requests cannot corrupt the transition or approved task membership. Test these at service/API boundaries.
- [ ] Do not activate TESTING or security-review stages simply because they exist in Prisma. Record transition and ownership tests plus desktop/mobile acceptance.

### M3-02 — simulated task progress and results

Old tasks: OPS-04. Reviewer: member 2. Allowed: `deployment-tasks`, plan orchestration/page and tests; minimal attempt/result fields only in a reserved migration. No changes to the real Windows agent.

- [ ] Only Helpdesk starts an APPROVED plan; duplicate start cannot reset or duplicate work. Reject invalid/missing target associations.
- [ ] Implement deterministic, observable simulation progression to SUCCESS/FAILED (and simulated WAITING_RESTART if demonstrated), with per-task timestamps/error detail and aggregate COMPLETED/FAILED plan state.
- [ ] Bound retries and preserve attempt evidence; define restart/recovery behavior so a process restart does not silently lose active tasks. No unmanaged in-memory timer as the sole record of execution.
- [ ] Display simulation labels on actions/progress/results; neither agent nor backend invokes real installation, and simulated success never updates actual scanned inventory.
- [ ] Test happy/failure/retry/racing-start paths and terminal aggregation with controlled fixtures; expose monitor/retry UI by role with truthful API states.

### M3-03 — ticket lifecycle

Old tasks: OPS-02/05/08. Reviewer: member 1. Allowed: tickets API/DTO/service/page/tests. Existing comments/assignee models are the starting point.

- [ ] User creates and tracks their own tickets, reads/adds comments and confirms resolution only for their own resolved ticket. Enforce ownership for every new detail/comment/confirmation endpoint.
- [ ] Helpdesk assigns/processes tickets; document valid status transitions and retain existing Admin/Manager status permissions. Validate assignee is an eligible active Helpdesk account.
- [ ] Build create/detail/comment/assignment/status controls; no User action gains access to other users' tickets by changing an ID.
- [ ] Record actor/event audit and producer hooks needed by M3-04; handle missing IDs, invalid transitions and failed saves clearly.
- [ ] API lifecycle/isolation tests and role-aware browser checks pass.

### M3-04 — notifications and read state

Old tasks: OPS-06/08. Reviewer: member 1. Allowed: notifications API/tests, ticket/plan notification hooks after preceding M3 merges, a notifications page or local module panel. Navigation addition requires coordination with M1-01 and the UI contract.

- [ ] Deliver bounded, recipient-scoped notifications for ticket changes and relevant simulated plan events; identify simulation content explicitly.
- [ ] Add own-notification read/read-all actions with ownership checks and duplicate-event protection; clients cannot supply arbitrary sender or recipient authority.
- [ ] Show unread/read/empty/error states in an accessible UI; another account's notification ID never grants access.
- [ ] Test delivery/read/isolation and failure behavior; no email/SMS integration is required.

### M3-05 — reporting completion

Old tasks: OPS-07, SEC-03. Reviewer: member 2. Allowed: reports API, dashboard/reports pages and tests. Preserve the pending baseline's live-data integration, static frames and shared search/actions.

- [ ] Extend existing metrics with scan freshness/error/available-update information and simulated task outcomes using agreed upstream read contracts.
- [ ] Define each count/denominator and role scope; User sees own device data, operational roles see authorized aggregates. Unknown/unscanned is not compliant, and online is not proof of compliance.
- [ ] Keep real scan observations and simulation outcomes visibly separate. Counts match test fixtures; no embedded demo totals or invented remediation percentage.
- [ ] Validate independent loading/empty/error states, rapid navigation and shared UI patterns; report API/filter/role tests pass.

## 8. Final demonstration checklist

- [ ] Admin configures accounts, catalogs, devices and policies; permitted viewers inspect audit entries. All five roles get appropriate routes and direct API restrictions.
- [ ] Registered Windows agent authenticates to Linux API, sends heartbeat and a real available-update scan; persisted findings appear on the correct device. Revoked/wrong-device credentials fail.
- [ ] Failed/stale scans remain distinguishable from successful scans with no available updates. Agent never installs, downloads update packages or restarts the host.
- [ ] Helpdesk creates/submits a plan; Manager requests changes and then approves a revised submission; Helpdesk starts simulation and observes success plus failure/retry paths.
- [ ] Simulation labels are visible; actual Windows update findings/inventory remain unchanged by simulation.
- [ ] User creates/comments on a ticket; Helpdesk processes it; User confirms resolution and reads only their own notifications.
- [ ] Dashboard/report counts match the integrated test DB. Security Analyst views risk and audit data without write access.
- [ ] Fresh migrations/seed, automated tests, Windows evidence and browser checks are recorded against the same release SHA. Screenshots/logs contain no secrets.

Separate patch approval, Analyst write/review stages, Admin post-deployment signoff, bulk rollback approval, real end-user scheduling/restart control, full CVE/CVSS registry, real installation and Linux endpoint scanning are **deferred scope**, not silently completed requirements. Reconcile these with the report before submission; any promotion to required work needs a new bounded task and ownership/dependency review.

## 9. Ownership, branch and AI-agent rules

| Area | Editor | Coordination |
|---|---|---|
| Auth/users/roles/policies/audit, route guard | Member 1 | Shell changes only M1-01 or an explicitly assigned integration task |
| Software/patches/devices/security inventory, Windows agent | Member 2 | Patch audit decorators explicitly allowed in M2-01; M1 reviews |
| Agent auth and shared scan contract | Member 1 during M1-02 | Member 2 takes ingestion ownership only after M1-02 merges |
| Plans/tasks/tickets/notifications/reports/dashboard | Member 3 | Device/API contract changes agreed with M2; navigation with M1 |
| Prisma/schema/migrations/seed/shared types | One reserved task at a time; M1 final review | Order starts M1-02; later owners reserve and record the slot before editing |
| Global CSS/shared components/layout/rules | Protected | No incidental module-wide restyling; use the assigned task's explicit exception |

An AI agent must read root `AGENTS.md`, applicable scoped instructions, this plan, the exact assigned task and relevant design contracts before editing. Its opening work brief states task ID, member, branch, base SHA, dependencies, allowed files and intended checks. An unspecified task requires clarification before feature implementation; a pending prerequisite permits analysis but not pretending the dependency is complete.

One task = one branch/PR based on updated main after dependencies merge. Additional sessions use distinct worktrees and bounded tasks; do not create every future branch from today's old main. Do not push, merge, delete branches, update the external Sheet or expand scope merely because a task is marked OPEN. The user/team controls those actions.

Use `docs/TASK_EXECUTION_CONTRACT.md` and `.github/pull_request_template.md` for evidence. Tick only executed acceptance criteria; include commit/command/result or Windows/browser evidence. Keep task implementation progress distinct from merged DONE status. The old manual checklist's historical checks must not be copied as new passes.

## 10. Verification commands and handoff

Run from the repository root unless stated otherwise. Only run DB commands against a confirmed test database; do not print connection strings.

```bash
npm run lint
npm run build
# API/domain tests, from apps/api:
npx tsx --test test/*.spec.ts
# Frontend changes also require the UI contract's visual checks:
npm run lint --workspace=@patch-management/web
npm run build:web
# Agent changes:
npm run lint --workspace=@patch-management/agent
# Agent adapter tests must be added by M2-02 with a documented test command.
# Schema changes, from apps/api on a confirmed test DB:
npx prisma validate
npx prisma migrate status
# Apply reviewed migrations / seed only as part of the assigned DB test:
# npm run db:migrate:deploy   (repository root)
# npm run db:seed             (repository root)
git diff --check
```

For a clean checkout, generate/build prerequisites before TypeScript checks when generated types are absent. After switching branches, stale `.next` route types can produce false missing-route failures: regenerate branch-appropriate output and report that distinction. Inspect/revert only unintended generated `apps/web/next-env.d.ts` changes before commit. Build success is not a substitute for live database, Windows, browser or authorization acceptance.

AI session starter (replace bracketed values):

> Implement task [M1-01/M2-01/etc.] as member [number] from docs/TEAM_TASK_PLAN.md on its specified branch, after verifying the integrated baseline and dependencies. Read root and scoped AGENTS.md, docs/TASK_EXECUTION_CONTRACT.md, and applicable UI/agent contracts first. State the task work brief before editing. Stay within assigned files and leave unrelated work intact. Run the task acceptance checks, record evidence and unticked limitations, and hand off a reviewable diff. Do not merge, push, or claim Windows/Supabase/browser tests passed unless performed and authorized as required.
