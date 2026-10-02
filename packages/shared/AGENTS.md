# Shared contract contributor instructions

Read root `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md` and the assigned task in `docs/TEAM_TASK_PLAN.md`. Shared type/enum edits use the same one-task reservation as Prisma changes and require member 1 review. Inspect both API and web/agent consumers before changing an exported shape; do not maintain competing versions in separate branches.

Agent scan types follow `docs/AGENT_DESIGN_CONTRACT.md`. Keep real Windows findings distinct from catalog estimates and simulated task results. Align persisted enums without accidentally exposing dormant review stages as supported actions.
