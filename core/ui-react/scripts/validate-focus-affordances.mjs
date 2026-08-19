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

// FM-053 / ADR-0013: the repository guard against reintroducing the local `sx`
// patterns that deleted this application's keyboard focus affordances in the
// first place.
//
// ADR-0013 records how the failures got here: each local override was
// individually reasonable and each removed an affordance without anything in
// the codebase recording that the second consequence was intended. FM-052
// measured five control classes rendering no keyboard focus indicator at all
// (WCAG 2.4.7, Level AA). Two of those five came from the patterns this script
// detects; the other three came from bare `InputBase` renderings, which the
// theme's own `MuiInputBase` rule now covers by construction and which no
// local `sx` can silently delete, because the indicator is an `outline` on the
// root rather than a border the local styling owns.
//
// Two patterns fail this check:
//
//   1. A `notchedOutline` rule that removes the fieldset border
//      (`border: "none" | 0`, `borderWidth: 0`) *unconditionally*. The exact
//      shape of `SearchWorkspace.tsx`'s pre-FM-053 category-`Select` override,
//      which forced `border-width: 0px` in both states so the `borderColor`
//      MUI's own focused rule does change could never paint. A rule scoped to
//      a non-focused state (its selector naming `:focus-visible`, `:focus`, or
//      `Mui-focused`) is allowed and is how that site now preserves the
//      ADR-0009 mock's borderless resting rendering.
//      Recolouring the fieldset (`borderColor: ...`) is NOT flagged: FM-052
//      measured the three recolours at `RefineSidebar.tsx`,
//      `filterControls.tsx` and `DownloadActions.tsx` *raising* that family's
//      focused-versus-unfocused contrast to 4.53-5.56:1 against MUI's stock
//      3.15-3.45:1, so removing them would make the application measurably
//      worse.
//
//   2. `disableRipple` on a control whose family has no authored
//      `Mui-focusVisible` rule. `ButtonBase.js`'s own propType comment states
//      the contract: "Without a ripple there is no styling for :focus-visible
//      by default. Be sure to highlight the element by applying separate
//      styles with the `.Mui-focusVisible` class." The authored rule may live
//      in `app/theme.ts` (for the control's own MUI component family) or
//      beside the prop in the same feature file.
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

    // ---- Check 1: unconditional notchedOutline border removal --------------
    const notchedRule = /"([^"]*notchedOutline[^"]*)"\s*:\s*\{([^{}]*)\}/g;
    for (const match of flattened.matchAll(notchedRule)) {
        const [, selector, body] = match;
        const scopedToANonFocusedState = /focus/i.test(selector);
        const removesTheBorder =
            /\bborder\s*:\s*(?:"none"|'none'|`none`|0\b)/.test(body) ||
            /\bborderWidth\s*:\s*(?:0\b|"0(?:px)?"|'0(?:px)?')/.test(body) ||
            /"border-width"\s*:\s*(?:0\b|"0(?:px)?")/.test(body);
        if (removesTheBorder && !scopedToANonFocusedState) {
            const index = source.indexOf(selector);
            findings.push(
                `${displayPath}:${index >= 0 ? lineOf(source, index) : "?"} ` +
                    `unconditionally removes the OutlinedInput notched outline ` +
                    `("${selector}" sets ${body.trim()}), which deletes the ` +
                    `focused border together with the resting one. Scope the ` +
                    `rule to the unfocused state instead ` +
                    `(FM-053 / ADR-0013; FM-052 measured this exact shape as a ` +
                    `WCAG 2.4.7 failure).`,
            );
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
const requiredFamilies = [
    "MuiButton",
    "MuiIconButton",
    "MuiTab",
    "MuiCheckbox",
    "MuiRadio",
    "MuiSwitch",
    "MuiInputBase",
    "MuiMenuItem",
    "MuiListItemButton",
    "MuiLink",
    "MuiChip",
];
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
