# Web contributor instructions

Read the root `AGENTS.md`, `docs/TASK_EXECUTION_CONTRACT.md`, your exact assigned task in `docs/TEAM_TASK_PLAN.md`, and `docs/UI_DESIGN_CONTRACT.md` before changing UI. These paths are relative to the repository root. Respect the task owner and shared-shell boundary.

After BASE-01, reuse `DashboardActionButton` for Refresh/Reset, `ModuleSearchField` for module searches (Software is the visual reference), and the shared loading components where applicable. Static titles/descriptions/cards/filters/table headings render immediately; only database content waits. Route preview and mounted-page loading must not cause two visibly different loading phases. These components exist on the pending frontend branch; do not recreate them from an older main.

Keep one dashboard shell and icon-only sidebar toggle, English UI text, padded states and responsive controls. Do not reintroduce demo data or localStorage tokens after the baseline migration. Route access controls complement API authorization; they never replace it. Scan UI must also follow `docs/AGENT_DESIGN_CONTRACT.md`. Report contract checks in the task handoff.
