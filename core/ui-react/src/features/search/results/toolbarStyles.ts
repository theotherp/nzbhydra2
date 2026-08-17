/**
 * Surface values for the results toolbar (`results-toolbar`), the tri-state
 * select-all checkbox and its caret menu, the bulk-actions bar's "Send to
 * downloader"/ZIP buttons, and the `results-download-actions` region
 * (FM-046), read from `/tmp/hydra mock/Awaiting responses for direction/
 * NZBHydra Search.dc.html`'s sticky toolbar block (`<div
 * style="position:sticky;top:0...">`, ignoring the sticky positioning itself
 * -- FM-042's scope) and the grid header's first column (`toggleAll`/
 * `toggleSelMenu`/`showSelMenu` block), plus that file's `renderVals()`
 * script's `chip`/`rowStyle`/selection color functions.
 *
 * (Named `toolbarStyles`, not `toolbarTokens`: the repository's root
 * `.gitignore` carries a blanket `*token*` rule that would silently exclude
 * a `*token*`-named file from version control -- see `refineStyles.ts`'s own
 * note, which established this naming workaround first.)
 *
 * They stay feature-local instead of moving into `core/ui-react/src/app/theme.ts`
 * (FM-043's file, out of scope for FM-046): the mock uses them for this
 * region only. Everything the theme already carries -- the brand teal
 * `primary.main`/`primary.contrastText`, IBM Plex Sans/Mono, the 8px control
 * radius, `textTransform: "none"` -- is consumed from the theme rather than
 * restated here.
 */

// The mock's popover surface (`showSelMenu`'s
// `background:#2a3133;border:1px solid rgba(255,255,255,0.12);
// border-radius:9px;box-shadow:0 8px 24px rgba(0,0,0,0.4);`), shared by the
// caret menu popover and reused below for the toolbar's other dark control
// surfaces (downloader/category selects, secondary buttons).
export const controlSurface = "#2a3133";
export const popoverBorderColor = "rgba(255, 255, 255, 0.12)";
export const popoverShadow = "0 8px 24px rgba(0, 0, 0, 0.4)";
export const popoverRadius = "9px";

// `toggleAll`'s unchecked-state border (`allBoxBorder: 'rgba(255,255,255,
// 0.35)'` when nothing is selected). This task's acceptance specifies the
// slightly softer per-row value (`r.boxBorder`'s own unchecked border,
// `rgba(255,255,255,0.25)`) for the select-all control, which is the more
// prominent, denser 17x17 control this task restyles.
export const checkboxUncheckedBorder = "rgba(255, 255, 255, 0.25)";

// `actionPrimaryBg`/`actionPrimaryColor`/`actionSecondaryColor` when
// `!selCount` (the bulk-actions bar's disabled state) and the mock's own
// muted-glyph color, reused for every other disabled/neutral control text in
// this region.
export const disabledActionBackground = controlSurface;
export const disabledActionTextColor = "#6b7472";
export const secondaryBorderColor = "rgba(255, 255, 255, 0.1)";
// `actionSecondaryColor` when `selCount` (the ZIP button's enabled text).
export const enabledSecondaryTextColor = "#c9cfce";
