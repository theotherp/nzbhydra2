# Migration Status

## Active

None.

## Review

None.

## Blocked

None.

## Upcoming

- FM-022: Download History Route

**ADR-0009 full-mock-fidelity batch.** FM-043 (shell theme, typography, density foundation) is `done`, so `createHydraTheme()`'s `oklch` palette, self-hosted IBM Plex Sans/Mono typography, and the denser default component sizing are
now the tokens every later packet in this batch restyles against rather than guessing at values. FM-044 (search form restyle) and FM-045 (single refine-sidebar filter surface) are no longer blocked and are independent of each other;
FM-046 remediates FM-039/FM-040 behind FM-045 and in turn unblocks FM-041. All four remain `planned` and are promoted to `ready` by a task designer, not listed here until then. Two things that landed with FM-043 are worth carrying
forward. **ADR-0010 (React Production CSS Delivery)** is accepted and implemented: the
emitted CSS entry is pinned to `assets/index.css`, `core/src/main/resources/templates/react.html` `<link>`s it render-blocking from `<head>`, and `core/ui-react/scripts/validate-production-assets.mjs` now validates that real Thymeleaf
template instead of the Vite output's unused `index.html` — so any future task importing CSS is covered by a gate that was proven to actually fail. Separately, `F-PLATFORM-SHELL`'s visual record stays `proposed`: **human visual
acceptance of the new look is still outstanding**, is independent of technical review per ADR-0006, and was not supplied by any agent.

FM-039 and FM-040 (both done) built the ADR-0008 Option B structural-redesign batch for the search page (Refine sidebar; selection-gated bulk actions bar). Per an explicit 2026-08-17 human decision, ADR-0008 is being superseded: the search
page should follow the source mock closely, including its palette and typography, not just its structure. FM-041 (display options menu) and FM-042 (sticky toolbar/header) were not started and are intentionally not promoted here; they are
being folded into the superseding initiative's task design rather than implemented against the now-superseded Option B spec. The palette and density tokens have now landed with FM-043, and FM-039/FM-040's remediation pass is FM-046
above; FM-041 is wired behind it.

Completed work is recorded in its task packet and Git history, not listed here.
