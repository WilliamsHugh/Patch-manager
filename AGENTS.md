# Repository agent instructions

For every task that creates or changes UI in `apps/web`, read and follow [docs/UI_DESIGN_CONTRACT.md](docs/UI_DESIGN_CONTRACT.md) before editing. This is a required project contract for all team members and coding agents, not optional style advice.

Keep the shared dashboard shell in `apps/web/src/app/(dashboard)/layout.tsx` and `apps/web/src/components/layout/master-detail-layout.tsx`. Do not introduce a second shell or copy the sidebar into a page. Do not treat existing UI inconsistencies as design references; the contract identifies them as known deviations.

For a frontend pull request, report which contract checks were performed. If a requested design intentionally conflicts with the contract, state the conflict and obtain an explicit team decision before implementing the exception. Backend-only and documentation-only tasks do not need UI verification.

## Mandatory task assignment

Before implementation, read [docs/TASK_EXECUTION_CONTRACT.md](docs/TASK_EXECUTION_CONTRACT.md), the common sections and exact assigned task in [docs/TEAM_TASK_PLAN.md](docs/TEAM_TASK_PLAN.md), README, and all applicable scoped `AGENTS.md` files. Task IDs, ownership, dependencies, allowed files, branch names and acceptance checklists are binding. The repository plan is the source; a Downloads/Sheet copy is not permission to override it silently.

State the task ID, member, branch, base commit, prerequisite status, allowed files and intended verification before editing. Check `git status` and existing diffs first. Do not start an unrelated OPEN task, cross another member's active files, or expand scope without an explicit assignment update. If no assigned task can be identified, inspect and ask for assignment before feature edits. PLAN-01 covers maintenance of this planning/rule revision on its documentation branch.

BASE-01 is currently on hold. Do not merge the frontend or documentation branches, push, or create downstream feature work from an unapproved baseline as part of planning. Once released, use the branch and dependencies specified by the task. Preserve user edits; never resolve conflicts by blindly taking one complete side.

## Domain and shared-file contracts

- For Windows agent, agent APIs, scan storage/shared types or scan UI, read [docs/AGENT_DESIGN_CONTRACT.md](docs/AGENT_DESIGN_CONTRACT.md) fully. Real Windows discovery/reporting is allowed; installation, real restart/rollback and arbitrary remote commands are excluded. Simulation cannot change observed inventory.
- Prisma/schema/migrations/seed and shared types have one active task owner at a time. Record the reservation and reviewer before editing. Never activate extra roles/workflow stages merely because unused enum values or schema fields exist.
- API authorization and ownership checks remain mandatory. Frontend route/menu rules are additional UX controls. Preserve HttpOnly session/live-data improvements after BASE-01 and the five-role scope.
- Reuse shared UI controls/loading/search from the integrated baseline. If required components are missing because the baseline is pending, report the dependency rather than recreating them.

## Evidence and handoff

Run the checks appropriate to the task and applicable contracts; record the exact revision, commands/results and any unavailable Windows, database or browser checks. Tick only verified criteria. Use `.github/pull_request_template.md` for PR handoff; keep IMPLEMENTED_PENDING_MERGE distinct from DONE. No undocumented scope increase, broad unrelated cleanup, secret exposure, or production data mutation is part of a task.
