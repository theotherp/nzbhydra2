/*
 *  (C) Copyright 2026 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

// FM-053 / ADR-0013 / ADR-0014 / ADR-0015: the repository guard against
// reintroducing the local `sx` patterns that deleted this application's
// keyboard focus affordances, and against re-growing the feature-local design
// literals ADR-0014 moved into the theme.
//
// Patterns that fail this check:
//
//   1. A `notchedOutline` rule that removes the fieldset border in ANY state
//      (`border: "none" | 0`, `borderWidth: 0`). Under ADR-0015 the input
//      family's only focus indicator is MUI's own focused notchedOutline, so
//      suppressing the border — focused or resting — deletes it (the exact
//      shape FM-052 measured as a WCAG 2.4.7 failure). Recolouring
//      (`borderColor: ...`) is not flagged.
//
//   2. `disableRipple` on a control whose family has no authored
//      `Mui-focusVisible` rule. `ButtonBase.js`: "Without a ripple there is no
//      styling for :focus-visible by default."
//
//   3. An `InputBase` import in feature code (ADR-0014: standard components
//      only; a hand-assembled `InputBase` composite is how the focus and
//      label affordances were lost the first time).
//
//   4. A color literal (`#hex`, `rgba(...)`, `oklch(...)`) in feature code
//      outside the files already scheduled for the FM-054 cleanup. Design
//      values live in `theme.ts` (ADR-0014); consume `palette.*` /
//      `surfaces.*` tokens instead.
//
// This is a source-shape guard, not a substitute for the real-browser gate:
// `tests/system/tests/focus-indication.spec.ts` is what proves the indicator
// actually paints.

import {readdir, readFile} from "node:fs/promises";
import {join, relative, resolve} from "node:path";

const sourceRoot = resolve("src");
const themeFile = resolve("src/app/theme.ts");

async function collectSources(directory) {
    const entries = await readdir(directory, {withFileTypes: true});
    const files = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...(await collectSources(path)));
        } else if (/\.tsx?$/.test(entry.name)) {
            files.push(path);
        }
    }
    return files;
}

/** Strips line and block comments so a comment can never satisfy a check. */
function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, " ")
        .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

function lineOf(source, index) {
    return source.slice(0, index).split("\n").length;
}

/**
 * The name of the JSX opening tag a prop at `index` belongs to. Walks every
 * candidate `<Component` before that index and keeps the last one whose own
 * opening tag has not been terminated by a top-level `>` yet -- so a nested
 * element passed as a prop value (`checkedIcon={<SomeIcon />}`) is never
 * mistaken for the component carrying the prop.
 */
function enclosingComponent(source, index) {
    let enclosing = null;
    for (const tag of source.matchAll(/<([A-Z][A-Za-z0-9]*)/g)) {
        if (tag.index >= index) {
            break;
        }
        let depth = 0;
        let end = source.length;
        for (let cursor = tag.index; cursor < source.length; cursor++) {
            const character = source[cursor];
            if (character === "{") {
                depth++;
            } else if (character === "}") {
                depth--;
            } else if (character === ">" && depth === 0) {
                end = cursor;
                break;
            }
        }
        if (end > index) {
            enclosing = tag[1];
        }
    }
    return enclosing;
}

// Files that still carry pre-ADR-0014 design literals, exempt from check 4
// until FM-054 ports them onto theme tokens. Shrink this set as files are
// cleaned; never add to it. FM-054 emptied it: every file that was here
// (DownloadActions.tsx, RefineSidebar.tsx, SearchResults.tsx,
// displayStyles.ts, filterControls.tsx, refineStyles.ts, toolbarStyles.ts,
// history/RecentSearches.tsx -- the last three of which no longer exist or
// never carried a literal) now consumes theme tokens or stock components;
// the three `*Styles.ts` files were deleted outright.
const pendingFm054Cleanup = new Set();

const findings = [];

const files = await collectSources(sourceRoot);
const themeSource = stripComments(await readFile(themeFile, "utf8"));

/**
 * Every `Mui<Family>: { ... }` entry in `theme.ts`, sliced by real brace
 * matching rather than by a bounded regex -- a lazy `[\s\S]{0,N}?` window can
 * silently run past one family's closing brace into the next one's rule and
 * report a family as authored when it is not.
 */
function themeFamilyBlocks(source) {
    const blocks = new Map();
    for (const entry of source.matchAll(/\bMui([A-Z][A-Za-z0-9]*)\s*:\s*\{/g)) {
        const start = entry.index + entry[0].length - 1;
        let depth = 0;
        let end = source.length;
        for (let cursor = start; cursor < source.length; cursor++) {
            if (source[cursor] === "{") {
                depth++;
            } else if (source[cursor] === "}") {
                depth--;
                if (depth === 0) {
                    end = cursor + 1;
                    break;
                }
            }
        }
        blocks.set(entry[1], source.slice(start, end));
    }
    return blocks;
}

const themeBlocks = themeFamilyBlocks(themeSource);

/**
 * The MUI component families `theme.ts` authors an `&.Mui-focusVisible` ring
 * for, keyed by the component name a JSX tag would use (`Checkbox` ->
 * `MuiCheckbox`).
 */
const authoredFamilies = new Set(
    Array.from(themeBlocks.entries())
        .filter(([, block]) => /Mui-focusVisible/.test(block))
        .map(([family]) => family),
);

for (const file of files) {
    const displayPath = relative(resolve("."), file);
    const raw = await readFile(file, "utf8");
    const source = stripComments(raw);
    // Collapse whitespace so a Prettier-wrapped selector/body still matches,
    // while keeping an index map back to the original for line reporting.
    const flattened = source.replace(/\s+/g, " ");

    // ---- Check 1: notchedOutline border removal ----------------------------
    const notchedRule = /"([^"]*notchedOutline[^"]*)"\s*:\s*\{([^{}]*)\}/g;
    for (const match of flattened.matchAll(notchedRule)) {
        const [, selector, body] = match;
        const removesTheBorder =
            /\bborder\s*:\s*(?:"none"|'none'|`none`|0\b)/.test(body) ||
            /\bborderWidth\s*:\s*(?:0\b|"0(?:px)?"|'0(?:px)?')/.test(body) ||
            /"border-width"\s*:\s*(?:0\b|"0(?:px)?")/.test(body);
        if (removesTheBorder) {
            const index = source.indexOf(selector);
            findings.push(
                `${displayPath}:${index >= 0 ? lineOf(source, index) : "?"} ` +
                    `removes the OutlinedInput notched outline ` +
                    `("${selector}" sets ${body.trim()}). Under ADR-0015 that ` +
                    `border is the input family's focus indicator; do not ` +
                    `suppress it in any state (FM-052 measured this shape as ` +
                    `a WCAG 2.4.7 failure).`,
            );
        }
    }

    // ---- Checks 3 and 4: ADR-0014 conventions in feature code --------------
    const isFeatureFile = /^src[\\/]features[\\/]/.test(
        relative(resolve("."), file),
    );
    if (isFeatureFile) {
        if (
            /from\s+"@mui\/material\/InputBase"|[{,\s]InputBase[,\s}]/.test(
                source,
            )
        ) {
            findings.push(
                `${displayPath} imports InputBase. ADR-0014: use the ` +
                    `standard component (TextField, Select) instead of ` +
                    `hand-assembling controls from InputBase.`,
            );
        }
        const cleanupPending = pendingFm054Cleanup.has(
            displayPath.replace(/\\/g, "/"),
        );
        if (!cleanupPending) {
            const colorLiteral = flattened.match(
                /(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\()/,
            );
            if (colorLiteral) {
                const index = source.search(
                    /(?:#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\()/,
                );
                findings.push(
                    `${displayPath}:${index >= 0 ? lineOf(source, index) : "?"} ` +
                        `contains a color literal ("${colorLiteral[0]}…"). ` +
                        `ADR-0014: design values live in app/theme.ts; ` +
                        `consume palette/surfaces tokens instead.`,
                );
            }
        }
    }

    // ---- Check 2: disableRipple without an authored Mui-focusVisible rule --
    for (const match of source.matchAll(/\bdisableRipple\b/g)) {
        const component = enclosingComponent(source, match.index);
        const authoredInTheme = component
            ? authoredFamilies.has(component)
            : false;
        const authoredLocally = /Mui-focusVisible|focusVisibleClassName/.test(
            source,
        );
        if (!authoredInTheme && !authoredLocally) {
            findings.push(
                `${displayPath}:${lineOf(source, match.index)} ` +
                    `\`disableRipple\` on <${component ?? "unknown"}> removes ` +
                    `the only focus affordance MUI ships for that control, and ` +
                    `neither \`app/theme.ts\` nor this file authors a ` +
                    `\`Mui-focusVisible\` rule for it ` +
                    `(FM-053 / ADR-0013; ButtonBase.js: "Without a ripple there ` +
                    `is no styling for :focus-visible by default").`,
            );
        }
    }
}

// ---- Check 3: the authored token itself is still declared ------------------
// Not one of the two reintroduction patterns, but the thing they would be
// reintroduced *against*: if `theme.ts` stopped authoring the families below,
// check 2 would start passing vacuously.
// ADR-0015: `MuiInputBase` is deliberately NOT in this list — the input/
// select family indicates focus through MUI's own focused notchedOutline,
// and an authored `&:has(:focus-visible)` ring there double-borders every
// focused select.
const requiredFamilies = [
    "MuiButton",
    "MuiIconButton",
    "MuiTab",
    "MuiCheckbox",
    "MuiRadio",
    "MuiSwitch",
    "MuiMenuItem",
    "MuiListItemButton",
    "MuiLink",
    "MuiChip",
];
if (themeBlocks.has("InputBase")) {
    findings.push(
        `src/app/theme.ts authors a MuiInputBase entry again. ADR-0015 ` +
            `removed it: an authored ring on the input root double-borders ` +
            `every focused select; the family's indicator is MUI's own ` +
            `focused notchedOutline.`,
    );
}
for (const family of requiredFamilies) {
    const block = themeBlocks.get(family.replace(/^Mui/, ""));
    const declared =
        block !== undefined && /Mui-focusVisible|:focus-visible/.test(block);
    if (!declared) {
        findings.push(
            `src/app/theme.ts no longer authors a focus ring for ${family} ` +
                `(ADR-0013, Option A requires one authored rule per control ` +
                `family; see tests/system/tests/focus-indication.spec.ts).`,
        );
    }
}
if (!/":focus-visible":\s*focusRing\(/.test(themeSource)) {
    findings.push(
        `src/app/theme.ts's MuiCssBaseline ":focus-visible" rule no longer ` +
            `renders the shared authored token, so the application would carry ` +
            `two focus systems (ADR-0013's recorded cost for Option A, which ` +
            `FM-053 discharged by reconciling the global rule with the token).`,
    );
}

if (findings.length > 0) {
    console.error(
        `Focus-affordance validation failed with ${findings.length} finding(s):`,
    );
    for (const finding of findings) {
        console.error(`  - ${finding}`);
    }
    process.exit(1);
}

console.log(
    `Focus affordances are intact: ${files.length} source files checked, ` +
        `${requiredFamilies.length} authored control families declared in src/app/theme.ts.`,
);
