/**
 * Surface and density values for the results toolbar's "Display options"
 * popover and for the two row treatments it turns on (FM-041), read from
 * `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html`:
 * its `showDisplayMenu` popover block and its `renderVals()` script's row
 * `padY` / `isNew` / `ageColor` / `stripe` logic.
 *
 * (Named `displayStyles`, not `displayTokens`: the repository's root
 * `.gitignore` carries a blanket `*token*` rule that would silently exclude a
 * `*token*`-named file from version control -- see `refineStyles.ts`'s and
 * `toolbarStyles.ts`'s own notes, which established this naming workaround.)
 *
 * A feature-local sibling of `toolbarStyles.ts` rather than an addition to it:
 * `toolbarStyles.ts` is FM-046's file and is import-only here, and its
 * `popoverRadius` is the mock's *selection* popover radius (`9px`), which the
 * display-options popover deliberately does not share (`11px`, below). The
 * surface color, border color, and the brand teal/IBM Plex/8px-radius
 * defaults are consumed from `toolbarStyles.ts` and `theme.ts` instead of
 * being restated here.
 */

// The mock's display-options popover:
// `background:#2a3133;border:1px solid rgba(255,255,255,0.12);
// border-radius:11px;box-shadow:0 12px 28px rgba(0,0,0,0.4);padding:8px;
// min-width:220px;`. The background and border reuse `toolbarStyles.ts`'s
// `controlSurface`/`popoverBorderColor`; only the values that differ from the
// selection popover live here.
export const displayMenuRadius = "11px";
export const displayMenuShadow = "0 12px 28px rgba(0, 0, 0, 0.4)";
export const displayMenuMinWidth = 220;
export const displayMenuPadding = "8px";

// The popover's "Display options" caption
// (`font-size:10.5px;text-transform:uppercase;letter-spacing:0.6px;
// color:#6b7472;font-weight:600;padding:4px 8px 8px;`).
export const displayMenuCaptionColor = "#6b7472";

// Each `<label>` entry (`font-size:13px;color:#d6dad9;padding:7px 8px;
// border-radius:7px;gap:9px;`).
export const displayMenuItemColor = "#d6dad9";
export const displayMenuItemRadius = "7px";
export const displayMenuItemPaddingY = "7px";
export const displayMenuItemPaddingX = "8px";
export const displayMenuItemFontSize = "13px";
export const displayMenuItemGap = "9px";

// The hairline the mock draws above "Show refine sidebar"
// (`height:1px;background:rgba(255,255,255,0.08);margin:6px 4px;`).
export const displayMenuDividerColor = "rgba(255, 255, 255, 0.08)";

// The mock's own row `padY` (`renderVals()`:
// `const padY = compact ? '7px' : '11px'`), recorded for reference.
//
// React's non-compact rows do **not** sit at the mock's `11px`: FM-045
// already landed this table at `6px` body-cell padding, and this task must
// leave the default rendering (and every accepted default-state geometry
// check) exactly as it found it. Applying the mock's literal `7px` to the
// compact state would therefore *increase* row padding rather than reduce it.
// Compact instead keeps the mock's own 7:11 proportion against React's denser
// non-compact value (6 * 7 / 11 = 3.8 -> 4px), so "compact" is genuinely
// compact here. Recorded as a deliberate deviation in the FM-041 handoff.
export const MOCK_ROW_PADDING_Y = "11px";
export const MOCK_COMPACT_ROW_PADDING_Y = "7px";
export const rowPaddingY = "6px";
export const compactRowPaddingY = "4px";

// The mock's recency flag (`isNew = highlightRecent && r.ageDays <= 3`) draws
// two properties together: an accent-teal age-column text color
// (`ageColor: isNew ? ACC_HI : '#9aa2a1'`, where `ACC_HI` is
// `oklch(0.82 0.1 190)` -- the theme's own `primary.light`, consumed from the
// theme so the `dark-dyschromatopsia` variant composes with it) and a
// left-edge accent stripe (`box-shadow:inset 3px 0 0 {{ r.stripe }}` with
// `stripe: ... (isNew ? 'oklch(0.75 0.1 190 / 0.4)' : 'transparent')`).
//
// An inset box shadow rather than a border so the stripe consumes no layout
// width and cannot introduce horizontal overflow, and on the row's first cell
// rather than the `<tr>` itself because `border-collapse: collapse` (MUI
// `Table`'s default) suppresses row-level box shadows.
export const recentRowStripe = "inset 3px 0 0 oklch(0.75 0.1 190 / 0.4)";
