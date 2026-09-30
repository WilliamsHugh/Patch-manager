# UI Design Contract

Status: **Required** for every contributor and coding agent working in `apps/web`.

This contract protects the project's Azure Update Manager-inspired interface while the team develops modules in parallel. It applies to new pages, changes to existing pages, shared components, and CSS. It does not authorize changing unrelated screens during a focused task.

## 1. One dashboard shell

- `apps/web/src/app/(dashboard)/layout.tsx` mounts `MasterDetailLayout` once for all authenticated dashboard routes. That shared component owns the top bar, sidebar, breadcrumb, page icon, page title, description, account menu, and mobile navigation backdrop.
- A route page renders **module content only**. Do not add another portal shell, sidebar, breadcrumb, top bar, page background, or viewport-height wrapper. Do not nest a `<main>` inside the shell's `<main>` or repeat the shell's page-level `<h1>`.
- Use a fragment or a semantic `<section>` as the page root. Use an `<h2>` for a module panel title. Put actions, filters, tables, forms, empty states, and detail panes inside the content area supplied by the shared layout.
- Navigation selection is driven by the App Router pathname in the shared layout. A page must not maintain its own copy of sidebar selection or force a full reload to navigate between dashboard routes.
- Add a new navigation item and its role visibility in the shared layout only when the route is actually implemented. Frontend visibility does not replace backend authorization.

## 2. Sidebar interaction is a protected invariant

- Keep exactly one collapse/expand control in the shared sidebar. It uses the `sidebarToggle` class and a centered chevron SVG, with accessible `aria-label`, `aria-pressed`, and keyboard focus styling. The collapsed control is **icon-only**: no circular border, background, or misplaced glyph.
- Preserve the existing desktop expanded/collapsed widths and the mobile drawer behavior. The sidebar should remain mounted while navigating between dashboard pages; route content may change without recreating the sidebar.
- Do not replace the SVG with text characters such as `〈` or `〉`, or add broad CSS that styles every `.serviceTitle button` as a circular toggle. A shell change requires a visual check in expanded, collapsed, and mobile states.

## 3. Visual language and component reuse

- Follow the existing Azure-inspired baseline: Segoe UI, neutral page background, white panels, thin borders, restrained shadows, compact tables and command bars, and Azure blue for primary actions. Reuse the tokens in `apps/web/src/app/globals.css` (`--azure`, `--azure-hover`, `--text`, `--muted`, `--line`, `--bg`, `--shadow`, and status colors).
- Prefer existing patterns such as `dataPanel`, `dataHead`, `tableTools`, `tableWrap`, `primary`, loading/empty/error states, and the established detail-pane pattern. Add a shared component when a pattern is genuinely reused; keep one-off styles scoped to a CSS module.
- Do not introduce a second visual system with a separate full-page gray canvas, large rounded cards, prominent shadows, oversized headings, or hard-coded duplicate color palettes. Functional status colors are allowed when they remain consistent with the shared tokens.
- Avoid broad global selectors and `!important` for module-specific styling. A CSS module must not unexpectedly restyle the shared shell or another route. New CSS should be responsive without causing horizontal overflow at common desktop and mobile widths.
- Keep buttons, inputs, tables, badges, focus states, and empty/error states visually consistent with existing dashboard modules. Do not change a working module's behavior merely to restyle it.

## 4. Content and accessibility

- All user-facing UI copy must be in **English**, including labels, navigation descriptions, placeholders, validation and error messages, loading states, button text, and `aria-label` values. Technical identifiers and data values are exempt.
- Use semantic headings in order: the shared layout provides the page `<h1>`; content starts at `<h2>` when a heading is needed. Give icon-only controls an accessible name and visible keyboard focus.
- Provide loading, empty, and error states for data-backed modules. Preserve role-aware action visibility and existing API behavior while changing presentation.

## 5. Required checks before a frontend PR

1. Compare the changed route with an established dashboard route (`/dashboard`, `/software`, or `/patches`) for shell ownership, spacing, panels, typography, controls, and language. Copy their visual structure, not any legacy non-English copy.
2. Check the changed route at desktop and narrow/mobile widths. Verify no duplicate page title, nested shell, overflowing controls, or clipped table without a horizontal scroll container.
3. Navigate between at least two dashboard routes. Confirm that the active sidebar item changes without reloading the sidebar. Test collapse, expand, and the mobile open/close control when the shell or navigation is touched.
4. Run `npm run lint --workspace=@patch-management/web` and `npm run build:web` from the repository root. Inspect `git status` afterward; Next.js may rewrite `apps/web/next-env.d.ts` during a build, and that generated change must not be committed unless intentional.
5. In the PR description, state the routes affected, the visual checks performed, and any deliberate exception. Do not merge unresolved conflict markers or choose one side of a merge without checking the shared shell and CSS together.

## Regression handling

The `/devices` and `/security-inventory` routes previously duplicated the page shell, and the sidebar toggle and some UI copy regressed during a merge. Those regressions motivated this contract and are not design precedents. If a similar inconsistency appears again, preserve the shared shell and repair the affected route without copying the deviation into other pages.
