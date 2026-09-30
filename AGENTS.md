# Repository agent instructions

For every task that creates or changes UI in `apps/web`, read and follow [docs/UI_DESIGN_CONTRACT.md](docs/UI_DESIGN_CONTRACT.md) before editing. This is a required project contract for all team members and coding agents, not optional style advice.

Keep the shared dashboard shell in `apps/web/src/app/(dashboard)/layout.tsx` and `apps/web/src/components/layout/master-detail-layout.tsx`. Do not introduce a second shell or copy the sidebar into a page. Do not treat existing UI inconsistencies as design references; the contract identifies them as known deviations.

For a frontend pull request, report which contract checks were performed. If a requested design intentionally conflicts with the contract, state the conflict and obtain an explicit team decision before implementing the exception. Backend-only and documentation-only tasks do not need UI verification.
