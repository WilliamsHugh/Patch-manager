# Prisma contributor instructions

Read root `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md` and the assigned task in `docs/TEAM_TASK_PLAN.md` before editing. Reserve schema/migration/seed ownership for one task at a time with member 1 as reviewer. Inspect existing migrations and pending baseline commits first; avoid duplicate migrations for fields already added elsewhere.

Use additive, minimal changes needed by the task; review shared types and consumers together. Agent storage requires `docs/AGENT_DESIGN_CONTRACT.md`. Existing enum values are not proof that their business workflow or permission is implemented. Test migration/seed only on a confirmed test database; do not reset shared data or commit credentials. Record fresh-database and repeat-seed results separately from Prisma generation/build success.
