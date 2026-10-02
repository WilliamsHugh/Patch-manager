# Task Execution Contract

Status: **Required for every contributor and coding agent.** This contract coordinates the three-member project. It does not replace the user's instructions or grant permission to publish, merge or change external systems.

## 1. Start with an assigned task

1. Read root and scoped `AGENTS.md`, README, common sections of `docs/TEAM_TASK_PLAN.md` and the complete assigned task. Read the audit for baseline evidence. For UI work, read the full UI design contract; for Windows agent/scan work, read the full agent design contract.
2. Inspect the branch, worktree, status/diff, relevant controllers/services/DTOs/pages, schema/migrations/shared types and existing tests before editing. Check whether the requested capability already exists in a pending branch.
3. State a work brief: `Task ID | member | branch | base SHA | dependency evidence | allowed paths | planned checks`. A contributor starts only the assigned task. If the assignment or a prerequisite is missing, analysis/documentation may proceed; dependent feature implementation waits for that input.
4. Use the task's named branch after its prerequisite PRs merge into the agreed main. BASE-01 remains blocked until the user/team lifts the hold. PLAN-01 may update documentation on `docs/windows-agent-scan-contract` before that gate; it cannot merge application work.

## 2. Respect ownership and shared contracts

- Treat the plan's allowed paths as a boundary, not permission to rewrite every file in a domain. Keep unrelated user changes intact. When a defect is in another member's domain, record evidence and request the owning task's change.
- Member 1 owns platform/auth/admin/access rules; member 2 owns inventory/catalog/risk/Windows collector; member 3 owns plans/tasks/support/reports. Agent identity work belongs to M1-02 first, then agent ingestion passes to M2-03. No simultaneous controller/guard rewrites.
- Shared shell/global CSS/shared UI components are protected. M1-01 may add the access boundary without restyling. Other shell changes need a specifically assigned integration scope. Follow English copy, one shell, existing controls, static page structure and responsive loading behavior.
- Schema, migrations, seed and shared types require one recorded editor/task at a time and member 1 review. Record the reservation in the task PR/work brief with files, proposed change and downstream consumers. Dependent branches use the merged contract; no competing enum or payload copies.
- Extend existing models only where the assigned task needs it. Do not create the report's full vulnerability/RBAC schema or enable unused review stages without a new scope decision.

## 3. Preserve product boundaries

- Human access uses role and resource ownership checks on the API; UI hiding alone does not secure data. Test direct IDs and routes.
- Windows scan means actual discovery on a Windows endpoint, sent to the Linux API. Simulation is a separately labeled workflow and cannot overwrite installed software, real update findings or compliance evidence.
- No agent update installation/download, reboot, rollback or arbitrary command execution. No real machine action may be introduced to satisfy a simulated task test.
- Use the configured test database for authorized integration checks. Do not reset/reseed a shared database or mutate production as incidental verification. Keep credentials out of code, logs, screenshots and task documents.

## 4. Evidence and status

Use these states consistently:

| State | Required meaning |
|---|---|
| OPEN | Assigned scope exists; implementation not started |
| IN_PROGRESS | Assigned branch is being worked on; criteria remain open |
| BLOCKED | A concrete prerequisite/input/environment is unavailable; name it |
| IMPLEMENTED_PENDING_MERGE | Code and available checks completed, reviewer/integration still pending; list remaining unavailable acceptance |
| DONE | Integrated commit and all required acceptance evidence recorded |
| DEFERRED | Explicitly outside current acceptance scope |

Only tick an item after its stated evidence exists. Compile success, fixtures, historical passes, and a controller route do not prove Windows execution, fresh DB compatibility or a complete user workflow. Preserve historical test results; add the new revision/result rather than relabeling old evidence.

Run workspace checks appropriate to the diff, relevant API tests, and `git diff --check`. Frontend changes require the UI contract's lint/build and browser checks. Agent changes require adapter/transport tests and Windows evidence; Linux fixtures cannot certify Windows integration. Schema changes require validate/migration/seed evidence on a test database. Document blockers without ticking the corresponding criterion.

## 5. Handoff and conflict resolution

Use `.github/pull_request_template.md`. Include task/old IDs, branch/base, changed paths, behavior, role matrix, dependencies, schema impact and exact verification. Another member reviews. The user/team controls push/merge and updates to the external Sheet.

When this documentation branch meets `fix/dashboard-loading-controls`, combine the add/add root `AGENTS.md` changes so both UI and task rules survive. The UI contract was copied from that branch; preserve all applicable rules when either evolves. Never resolve a layout/schema/rule conflict with an unreviewed whole-file selection.

After integration, update only the assigned task's status/evidence plus agreed dependencies in `docs/TEAM_TASK_PLAN.md`. Keep the Downloads export synchronized when requested; its file is a copy of the repository plan. Do not mark a teammate's task DONE based solely on seeing a branch or endpoint.
