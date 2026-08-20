# Config UI Improvements — post-parity design notes

> **Status: owner idea backlog, 2026-08-20. Not a migration contract.** Implementation, review, and
> fixer agents must ignore this file; nothing in it is a requirement. The config migration
> (FM-058–FM-067) deliberately reproduces legacy behavior first so old and new UI can be compared
> directly and almost no backend changes are needed. Once that is stable, the owner feeds selected
> entries from this document into the task designer as new packets; anything touching a shared
> boundary gets a `DECISIONS.md` entry at that point, not before.

## Why most of this becomes cheap after parity

The parity migration funnels every setting through a small typed field vocabulary (`SettingRow`,
`ConfigFieldset`, the `*Setting` controls) and one shell that owns the form, dirty state, and save
pipeline. That concentrates the layout and interaction decisions in a handful of files: redesigning
the setting row is one component edit inherited by all eight tabs, and the whole-config React Hook
Form already knows exactly which fields changed (`dirtyFields`). Most items below are therefore
front-end-only restructurings; the few that need backend support are marked.

## 1. Navigation and structure

### 1.1 Vertical section navigation
Today: eight horizontal tabs plus the advanced toggle, API button, and Save crowded into one row.
Proposal: a left settings sidebar (icon + label per section), reusing the structure language of the
search Refine sidebar; the top row keeps only search (1.3) and save. Route URLs stay unchanged.
Why: scales past eight entries, leaves room for per-section badges (dirty, invalid — see 3.1), and
matches the settings idiom users know from VS Code/browsers.

### 1.2 Sub-navigation inside long tabs
Main alone has ten fieldsets (Hosting … Other); Searching is similar. Add an "on this page" anchor
list with scrollspy, or collapsible fieldsets with a sticky sub-nav. Kills the endless scroll and
makes the tab's scope visible at a glance.

### 1.3 Settings search
The single biggest usability win. One search field filtering across **all** sections by label and
help text, results grouped by section, selecting a result navigates and highlights the setting.
Purely client-side: the React field definitions already carry label/help per tab; it only needs a
small metadata index over them. A match on a hidden advanced field should reveal it.

### 1.4 Advanced-settings rework
Today: one global toggle hides ~55 fields/fieldsets entirely; users cannot know what they are
missing. Options, roughly in order of preference: keep the global toggle but render a per-fieldset
"N advanced settings hidden" expander instead of removing them silently; or per-fieldset
disclosure only. Optional: persist the preference per user via `genericStorage` instead of
per-browser localStorage (small backend-adjacent change, mechanism exists).

## 2. The setting row

Today (legacy grid, reproduced at parity): right-aligned label column, control column, separate
tooltip-icon column, and an always-visible help paragraph in a fourth column. Problems: help sits
far from the control it explains, the four-column grid collapses badly on narrow screens, the
always-on help makes every tab a wall of text, and the tooltip/help split is arbitrary.

Proposal: single-column rows with a comfortable max content width — label above (or compactly
beside) the control, help as MUI `helperText` directly under it, tooltip content merged into the
help (a separate icon only where the text is genuinely long), advanced marker as a small inline
chip. Number inputs keep unit adornments; secrets get a consistent presentation (visibility toggle
where the real value is present, an explicit "unchanged" state for masked ones).
Why: scanability, working mobile layout, and stock-MUI anatomy per ADR-0014 — and it is a
`SettingRow`-only change that every tab inherits.

## 3. Save and feedback loop

### 3.1 Sticky save bar with dirty summary
Replace the pulsing top-right Save button with a bar that appears when the form is dirty: "N
settings changed", Save, Discard. The section nav (1.1) shows a dot per section with dirty or
invalid fields.

### 3.2 Review changes before saving
Because saving always writes the whole config and can trigger a restart, a "review changes" panel
is unusually valuable here: list every changed setting (old → new), computed client-side from
`dirtyFields` against the loaded config. Also catches accidental edits before they are persisted.

### 3.3 Inline validation instead of modal dialogs
Today the server returns flat message strings shown in a blocking dialog after save. Short-term
(front-end only): a persistent error/warning banner at the top of the form plus toasts. Long-term
(**backend change**): structured validation results carrying field paths, so errors attach to the
exact field and badge its section. That would be one of the first items needing a recorded
decision and backend work.

### 3.4 Restart-needed transparency
Fields are annotated `@RestartRequired` server-side, but the user learns about a restart only
after saving. Mark such fields in the UI (small "restart" note in the help line) and let the save
bar predict "saving will require a restart". Needs the annotated-field list on the client —
generated from the annotations at build time or served by a tiny endpoint (**backend-light, not
zero**).

## 4. Section-specific improvements

### 4.1 Indexers (biggest win area)
Today: a vertical stack of boxes plus a modal form. Proposal: a proper list (table or cards) with
name, type, enabled state and disabled reason, caps status, and search-type toggles; sortable and
filterable; bulk enable/disable. Preset selection becomes a searchable gallery grouped by indexer
type instead of a dropdown. Connection/caps status stays visible on the list, not only inside the
modal.

### 4.2 Downloading
Downloader cards with type icon and last connection state; keep the modal transaction for editing.

### 4.3 Auth users
The users repeat section becomes a compact table (username, rights as chips) with modal or inline
edit — much easier to audit than stacked fieldsets.

### 4.4 Categories
A table with per-category expansion; inline validation of newznab number ranges. (Legacy has no
reordering; do not invent one without checking whether order matters anywhere.)

### 4.5 Notifications
Accordion per configured event; template editing with insertable variable chips (the available
variables currently live only in help text) and a preview rendered from a sample event; the
existing per-event test button gets a clear inline result.

### 4.6 Main
Mostly inherits the row/fieldset improvements. Small candidates: copy button next to the API key,
confirm-on-regenerate, clearer Hosting/SSL grouping. (Moving backup/database *actions* toward the
System pages is possible scope creep — flagged as "maybe" only.)

## 5. Cross-cutting polish

- Responsive: the single-column row (2) is what makes config usable on mobile at all.
- One shared test-action pattern (button + status chip + message) for indexer, downloader,
  notification, and custom-mapping tests instead of four ad-hoc variants.
- Empty states for the list sections (no indexers yet → short guidance plus preset shortcuts).
- Keyboard and focus behavior largely comes free with stock MUI; repeat-section add/remove needs
  deliberate focus management.

## 6. Sequencing hints for the future task designer

- **Tier 1 — front-end only, high value, low risk:** setting-row redesign (2), sticky save bar
  (3.1), settings search (1.3), vertical nav (1.1). Mostly `SettingRow`/shell edits; two to three
  packets.
- **Tier 2 — per-section front-end reworks:** indexer list (4.1), users table (4.3),
  notifications editor (4.5), then the rest of section 4.
- **Tier 3 — needs contract work and a decision entry first:** structured validation with field
  paths (3.3), restart-required metadata on the client (3.4), server-stored UI preferences (1.4).
- All visual work stays inside ADR-0014's token/structure rules; none of this changes route URLs
  or the whole-config save contract.
