# ADR-0007: Branded MUI Theme Foundation

Status: accepted

## Decision Question

Should the React migration adopt an explicit branded MUI theme (palette, typography, and app-shell layout matching legacy's default visual identity) as a foundational ADR-governed decision, rather than leaving the app on MUI's stock default theme?

## Context And Evidence

- FM-027 (`docs/frontend-migration/tasks/FM-027-search-workspace-visual-parity.md`) passed independent review on its narrow layout/hierarchy contract per ADR-0006, but the coordinator captured real screenshots of the running React app (`ui/react?redirect=/`) next to legacy (`ui/legacy?redirect=/`) and found the React app is completely unbranded stock MUI: default blue primary palette, white background, no logo, and a broken-looking vertically-stacked top navigation instead of a horizontal bar. Legacy is dark-themed, uses the snake-logo wordmark, and has a compact horizontal nav.
- Root cause 1 (palette): `core/ui-react/src/app/theme.ts`'s `createHydraTheme()` only sets `palette.mode` (following OS light/dark preference via `systemPrefersDark()`) with no brand `primary`/`secondary`/`background`/`text` colors at all for the default (non-`dark-dyschromatopsia`) path — confirmed by reading the file: the base `createTheme({palette: {mode, ...(dyschromatopsia ? {...} : {})}})` call supplies zero palette overrides when `dyschromatopsia` is false, so MUI falls back to its stock blue/light defaults. `core/ui-react/src/App.tsx` wires this via `ThemeProvider`.
- Root cause 2 (nav layout bug, cited as evidence, not as part of this ADR's decision itself): `core/ui-react/src/app/AppShell.tsx` renders navigation as `<Box sx={{display:"flex", gap:1}}>{links()}</Box>` where `links()` returns a single MUI `<List aria-label="Main navigation">` element containing multiple `<ListItemButton>` children (confirmed by reading the file, lines 31-46 and 70-75). Because `List` itself is the sole flex child (not its individual items), the flex-row on the wrapping `Box` has no effect, and `List`'s default vertical stacking dominates — hence the vertical nav. This is a bug fix regardless of theme, but is closely related since it's the other half of why the app looks broken.
- Legacy's actual default theme is the "grey" theme (`core/ui-src/less/themes/vars-grey.less`), imported by `core/ui-src/less/themes/grey.less`; this is confirmed as the default rendered theme by the coordinator's screenshot of `/` via `ui/legacy`. Its key LESS variables (confirmed by reading the file):
  - `@gray-darker: rgb(38, 44, 46)` — `@body-bg: @gray-darker` (page background, ~`#262c2e`)
  - `@gray-dark: rgb(58, 63, 68)` — used for `@navbar-default-bg` (~`#3a3f44`)
  - `@gray-light: rgb(122, 130, 136)` — `@brand-primary: @gray-light` (~`#7a8288`, a muted gray-blue; legacy's "brand primary" is not vivid green — the vivid green is reserved for the logo mark only)
  - `@text-color: rgb(200, 200, 200)`; `@link-color`/`@link-hover-color: rgb(255, 255, 255)`
  - `@input-bg: rgb(31, 35, 40)` (~`#1f2328`)
  - `@brand-success: darken(rgb(98, 196, 98), 10%)` (green), `@brand-info: darken(rgb(79, 169, 194), 10%)` (teal/cyan — matches the "Take a Tour" button's teal color visible in the screenshot), `@brand-warning: darken(rgb(194, 115, 6), 5%)` (orange), `@brand-danger: darken(rgb(194, 78, 76), 10%)` (red)
  - `@dropdown-bg: @gray-dark`; `@panel-bg`/`@table-bg`/`@well-bg`: variants of `lighten/darken(@body-bg, N%)`
  - Two alternate legacy themes also exist (`theme-dark.less`: near-black `@body-bg: rgb(0,0,0)`; `theme-bright.less`: white `@body-bg: rgb(255,255,255)`, `@brand-primary: #00640e` green, `@navbar-default-bg: rgb(6,161,40)` vivid green) — these are user-selectable alternate themes in legacy, not in scope for this ADR's default; noted as an out-of-scope note for a possible future task (React theme switching), since ADR-0006 and CONTEXT.md do not currently define multi-theme support as in scope.
- Brand mark: `core/ui-src/img/logo.png` is a green/mint gradient multi-headed snake logo; sampling it shows a core green ~`#0fab4b` with lighter mint highlights ~`#c8ebc6`; `core/ui-src/img/favicon.svg` is confirmed (by reading the file) to contain literal hex values `#c8ebc6` and `#0fab4b` in its gradient stops and `#231f20` in its line-art fill/stroke, matching the sampled logo colors. There is no SVG logo file for the wordmark itself, only `logo.png` and `logo-more-margin.png` (raster) — noted as an evidence gap/assumption for the implementer (may need to reference the PNG via an `<img>`/`background-image`, or a future task could vectorize it).
- `core/ui-react/src/app/theme.ts` already has an unrelated, separate `dark-dyschromatopsia` accessibility variant with its own overridden palette tokens (background `#000000`/`#0f1113`, adjusted semantic colors) — confirmed by reading the file (lines 30-39). Any new theme work must not remove or break that existing variant; it should compose with whatever new base palette is added.
- ADR-0002 (`docs/frontend-migration/decisions/ADR-0002-frontend-stack.md`) already fixed MUI as the only component system — this ADR does not reopen that, it only specifies what the resulting MUI theme's own colors/typography/branding should be, which no prior ADR or task has addressed. ADR-0006 (visual-parity-policy) explicitly does not require Bootstrap pixel identity, but a total absence of any brand palette goes beyond an "intentional MUI-based difference" — it's an unaddressed gap, not a deliberate variance.
- The user (repository owner) has already reviewed the screenshots and explicitly directed: pause accepting FM-027's visual baseline, and get a branded theme foundation built before resuming feature-level visual-parity work. The user has also explicitly instructed the coordinator to proceed through implementation autonomously without further interactive rounds, treating objectively-evidenced, legacy-parity-driven choices (like reusing legacy's own existing color values) as not requiring a separate live decision, while still recording them as a proper ADR for durable traceability. The coordinator will handle recording acceptance through the proper channel given the user's standing instruction; this proposer does not accept the ADR on the human's behalf.

## Options

### Option A: Adopt legacy's default "grey" theme values as the MUI palette, dark-as-default, plus logo integration and the nav layout fix

- Map `vars-grey.less` values onto MUI `palette` tokens: `background.default`/`background.paper` from `@body-bg`/lightened variants, `text.primary`/`text.secondary` from `@text-color`/muted gray, and `success`/`info`/`warning`/`error` mapped directly from `@brand-success`/`@brand-info`/`@brand-warning`/`@brand-danger` for genuine parity.
- For MUI `primary`, use the logo green `#0fab4b` rather than reproducing legacy's own muted-gray `@brand-primary` literally: MUI's `primary` drives far more interactive affordances (links, focus rings, selected states) than legacy's `@brand-primary` did, so a muted gray-on-gray primary would read as duller and less accessible than legacy's actual overall look, which relies on white link/hover colors and colored buttons rather than a colored `primary` token. This is a deliberate, explicitly-flagged variance from literal legacy color-for-color mapping, to be recorded as such per ADR-0006's variance-disposition process when the feature task implements it.
- Default `palette.mode: "dark"` instead of following OS preference, matching legacy's fixed default (legacy does not auto-switch with the OS; it always renders the grey/dark theme unless a user explicitly picks another).
- Add the existing `logo.png` (or a generated SVG/optimized asset) to `AppShell.tsx`'s `AppBar`.
- Fix the nav flex bug described above as part of the same shell work, since an unbranded palette and a broken nav are both instances of the same "shell was never designed" gap addressed by one shell-level implementation task.
- Benefits: closes the branding gap with objective, legacy-sourced evidence for most tokens; keeps a single explicitly-justified variance (the `primary` token) rather than many ad hoc choices; fixes the nav bug in the same pass since both defects stem from the same never-designed shell; composes cleanly with the existing `dark-dyschromatopsia` variant, which already overrides its own palette tokens on top of the base theme.
- Costs: requires re-evidencing FM-027's already-implemented (but not yet human-accepted) visual baseline, since its screenshots were captured against the unbranded look; touches shared shell files (`theme.ts`, `AppShell.tsx`, `App.tsx`) that other in-flight and future tasks build on, so must land before further visual-parity work resumes to avoid rework.

### Option B: Minimal fix — only fix the nav layout bug and pick one accent color, keep OS-based light/dark and no logo

- Fix only the `AppShell.tsx` flex bug and add a single accent color, leaving `palette.mode` on OS preference and omitting the logo.
- Benefits: cheaper, resolves the most obviously "broken" (not just unbranded) defect quickly.
- Costs: leaves the app looking generic/unbranded, does not meet the user's stated goal that migrated screens look "at least as nice as" legacy, and would likely require redoing the same shell files again shortly after for the branding the user has already asked for — creating avoidable rework rather than avoiding it.

### Option C: Status quo / defer theming indefinitely, resume per-feature visual-parity tasks on the current stock theme

- Take no shell-level theming action now; continue accepting/refining feature visual baselines (e.g. FM-027) against the current unbranded MUI defaults.
- Benefits: none beyond avoiding immediate shell-file churn.
- Costs: already rejected in effect by the user's explicit direction to pause FM-027's visual acceptance and prioritize a branded theme foundation first; every feature visual baseline accepted under stock MUI would need later rework once theming lands. Included here for completeness/record only.

## Recommendation

Recommend Option A. It closes an unaddressed gap (no prior ADR or task specifies MUI theme tokens) using legacy's own existing default-theme values as objective evidence, keeps only one explicitly-flagged variance (`primary`) rather than an unprincipled set of new colors, fixes the concrete nav-layout defect in the same shell-level pass, and matches the user's explicit direction to build a branded foundation before resuming feature-level visual-parity work. It does not reopen ADR-0002 (MUI as the only component system) or ADR-0006 (semantic-parity policy, per-feature human acceptance).

## Human Decision

- **Option A is accepted.** The React migration will adopt legacy's default "grey" theme values as the MUI palette, dark-as-default, plus logo integration and the nav-flex-bug fix, with the logo-green `#0fab4b` used for MUI `primary` as the one explicitly-flagged variance from literal legacy color-for-color mapping.
- Authorization chain: the repository owner (human) reviewed the coordinator's side-by-side screenshots of the unbranded React app versus legacy earlier in this session and explicitly chose, via an interactive `AskUserQuestion` answer, to "Pause FM-027, build the theme first." The human then sent a follow-up standing instruction verbatim: "Continue. Try to proceed with the fixing of the UI design and, when that is done, further implementation of the migration without user interaction. Improve subagent definitions as you go by analyzing their input and output. Stop when you encounter a loop, need a definitive decision by me or think that it would be better for me to do something than you wasting more tokens." This constitutes a standing, explicit delegation to proceed autonomously through exactly this class of work (fixing the UI design) without further interactive rounds, for decisions the coordinator can respond to on evidence already in hand.
- This ADR qualifies as such a decision: every token in Option A other than the single `primary`-color variance is drawn directly from legacy's own existing, already-shipped default theme values (objective legacy-parity evidence, not an open-ended subjective choice).
- The `primary`-color variance from literal legacy values (using logo-green `#0fab4b` instead of legacy's muted-gray `@brand-primary`) is accepted as part of this same decision, since it was disclosed and justified in the proposal's own Option A text (MUI's `primary` token drives materially more interactive affordances than legacy's own muted-gray `@brand-primary` did) and is recorded here as the explicitly-flagged variance per ADR-0006's variance-disposition process.
- Options B and C were not selected.

## Consequences

- Establishes concrete palette/typography/branding tokens in `core/ui-react/src/app/theme.ts` that all current and future screens must build on; supersedes the implicit "whatever MUI defaults to" status quo.
- FM-027's held visual baseline must be re-evidenced (new screenshots) against the new theme before a human accepts it; likely also affects other already-`proposed`/`unassessed` visual records across `FEATURES.yaml` since their evidence was captured against the unbranded look. This ADR does not enumerate every affected feature record exhaustively; assessing the full downstream set is task-designer follow-up.
- Does not reopen ADR-0002 (MUI stays the only component system) or ADR-0006 (semantic-parity policy, per-feature human-acceptance process, unchanged); this ADR only fills the previously-unaddressed "what are the actual brand tokens" gap.
- Multi-theme switching (legacy's bright/dark/dark-dyschromatopsia-equivalent user-selectable themes beyond the existing accessibility variant already in `theme.ts`) is explicitly out of scope for this ADR; noted as a candidate future task if the user wants full theme parity later.
- The existing `dark-dyschromatopsia` accessibility variant in `theme.ts` must continue to work unmodified in its intent; any new base palette must compose with it rather than remove or break it.
- No implementation, task packet, or theme/shell file change is made by this ADR proposal itself. After a human decision, the task designer must refine or create the affected task packet(s) (covering `theme.ts`, `AppShell.tsx`, `App.tsx`, and the FM-027 re-evidencing dependency) before an implementer may act.

## Affected Work

- Shell/theme files: `core/ui-react/src/app/theme.ts`, `core/ui-react/src/app/AppShell.tsx`, `core/ui-react/src/app/App.tsx`.
- Directly blocked: FM-027 (`docs/frontend-migration/tasks/FM-027-search-workspace-visual-parity.md`), currently in `review` with a proposed-but-not-yet-human-accepted visual baseline that must be re-evidenced against the new theme.
- Downstream, task-designer follow-up: every FM task with a `proposed`/`unassessed` visual record in `docs/frontend-migration/FEATURES.yaml` whose evidence predates this theme (not enumerated here; assessment and remediation grouping is task-designer work, per the same pattern ADR-0006 established for its own downstream affected work).
- Policy context: `docs/frontend-migration/decisions/ADR-0002-frontend-stack.md` (MUI-only boundary, unchanged) and `docs/frontend-migration/decisions/ADR-0006-visual-parity-policy.md` (semantic visual parity and human-acceptance process, unchanged; this ADR's `primary`-color variance is recorded through ADR-0006's existing variance-disposition mechanism when the implementing task lands).

## Supersession

- Supersedes: `None`.
- Superseded by: `None` until a later ADR replaces this decision.
