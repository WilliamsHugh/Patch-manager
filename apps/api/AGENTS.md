# API contributor instructions

Read root `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md` and the exact assigned task in `docs/TEAM_TASK_PLAN.md` before editing. All paths in this file are repository-relative. Module ownership and the task's allowed paths are binding; inspect callers before changing response shapes.

Preserve JWT/role guards, validate DTOs and enforce resource ownership and workflow transitions on the server. Test allowed and denied paths, direct IDs and the relevant domain behavior. Human role authentication and machine credentials are separate. Agent/scan work additionally requires the full `docs/AGENT_DESIGN_CONTRACT.md`.

Schema/shared type changes need the plan's single-editor reservation and member 1 review. Keep simulation distinct from real Windows observations; do not mutate scanned inventory to make a simulated deployment appear successful. Report tests and pending integration evidence against the actual branch/commit.
