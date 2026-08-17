/**
 * Surface values of the mock's `<aside>` refine panel, read from
 * `/tmp/hydra mock/Awaiting responses for direction/NZBHydra Search.dc.html`
 * (its `<aside style="flex:0 0 248px;...">` block and the `rowStyle(active)` /
 * `chip(active)` helpers in the same file's script section).
 *
 * (The obvious name for this module would be `refineTokens.ts`, but the
 * repository's root `.gitignore` carries a blanket `*token*` rule that would
 * silently exclude such a file from version control.)
 *
 * They stay feature-local instead of moving into `core/ui-react/src/app/theme.ts`
 * (FM-043's file, out of scope for FM-045): the mock uses them for the refine
 * panel only. Everything the theme already carries -- the brand teal
 * `primary.main`, IBM Plex Sans/Mono, the 8px control radius,
 * `textTransform: "none"` -- is consumed from the theme rather than restated
 * here.
 */

// `<aside style="flex:0 0 248px;...;padding:18px 16px 40px;border-right:1px
// solid rgba(255,255,255,0.06);">`.
export const sidebarPadding = "18px 16px 40px";
export const sidebarBorderColor = "rgba(255, 255, 255, 0.06)";
// The gap the mock leaves between two refine sections (`margin-bottom:22px`).
export const sectionGap = "22px";

// The mock's "REFINE" caption and its per-section captions.
export const headingColor = "#8a9291";
export const sectionLabelColor = "#6b7472";
// `<button onClick="{{ clearFilters }}" style="...color:oklch(0.78 0.1 190);...">`.
export const clearAllColor = "oklch(0.78 0.1 190)";

// `rowStyle(active)`: the Category/Indexer toggle rows.
export const rowActiveBackground = "oklch(0.75 0.1 190 / 0.12)";
export const rowActiveColor = "#eef1f0";
export const rowInactiveColor = "#b7bdbc";
// The mock draws no hover state for these rows; this is the smallest
// perceivable one consistent with the panel's own hairlines, so a pointer user
// still gets the affordance MUI's default button hover would have provided.
export const rowHoverBackground = "rgba(255, 255, 255, 0.04)";
// `<span style="font-family:'IBM Plex Mono',monospace;font-size:11.5px;color:#6b7472;">`.
export const countColor = "#6b7472";

// `chip(active)`: the Quality and Type pills.
export const chipActiveBackground = "oklch(0.75 0.1 190 / 0.16)";
export const chipActiveBorderColor = "oklch(0.75 0.1 190 / 0.45)";
// The mock's `ACC_HI` accent.
export const chipActiveColor = "oklch(0.82 0.1 190)";
export const chipInactiveBackground = "#242b2d";
export const chipInactiveBorderColor = "rgba(255, 255, 255, 0.12)";
export const chipInactiveColor = "#aab0af";

// The mock's recessed input surface (`background:#1c2224;border:1px solid
// rgba(255,255,255,0.1);border-radius:8px;padding:7px 9px`).
export const inputBackground = "#1c2224";
export const inputBorderColor = "rgba(255, 255, 255, 0.1)";
