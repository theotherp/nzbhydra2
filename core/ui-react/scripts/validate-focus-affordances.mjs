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

// FM-053 / FM-184 / ADR-0013 / ADR-0014 / ADR-0015 / ADR-0056: the repository
// guard against reintroducing the local `sx` patterns that deleted this
// application's keyboard focus affordances, and against re-growing the
// feature-local design literals ADR-0014 moved into the theme.
//
// Since FM-184 the ring itself is MUI 9.4's own `theme.focusVisible`
// (ADR-0056) rather than eleven authored `&.Mui-focusVisible` rules, so the
// shapes below are the ones that can still delete an indicator under that
// mechanism.
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
//   2. `disableRipple` on a component that is NOT one of 9.4.0's own
//      `focusVisible` consumers (the literal list below). On a consumer the
//      ring is painted by MUI and does not depend on the ripple at all; on
//      anything else `ButtonBase.js`'s contract still holds: "Without a
//      ripple there is no styling for :focus-visible by default."
//
//   3. An `InputBase` import in feature code (ADR-0014: standard components
//      only; a hand-assembled `InputBase` composite is how the focus and
//      label affordances were lost the first time).
//
//   4a. A `Checkbox`/`Radio` `icon`/`checkedIcon`/`indeterminateIcon` whose
//      element is a `Box`, `span` or `div`. `Checkbox.js`/`Radio.js` author
//      the ring on `&.Mui-focusVisible svg:first-of-type`, so a non-`svg`
//      icon leaves that control with no keyboard focus indicator at all
//      (FM-184 -- the shape `SelectionMenu.tsx`'s select-all square had).
//
//   4. A color literal (`#hex`, `rgba(...)`, `oklch(...)`) written in a
//      *design-literal position* in feature code, outside the files already
//      scheduled for the FM-054 cleanup. Design values live in `theme.ts`
//      (ADR-0014); consume `palette.*` / `surfaces.*` tokens instead.
//
//      "Design-literal position" is the narrowing this check needs to be
//      useful: the same three characters `rgb(` are a design decision inside
//      an `sx` block and plain application *data* everywhere else. Legacy
//      persists an indexer's colour as an `rgb(r,g,b)` string, so feature
//      code legitimately parses, builds, documents and fixtures that shape
//      (`ColorSetting.hexToRgb`, `indexerColorsFromSafeConfig`). Matching the
//      literal anywhere in a file flagged five such spots and zero real
//      design literals -- a red gate that could only be answered by proving
//      the noise byte-identical, which is worse than no gate. So check 4
//      fires only inside `designLiteralRegions()` (see there), and never in
//      `*.test.*`, whose fixtures and titles are data by construction.
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

/** A run of spaces as long as `text`, with its newlines kept. */
function blankOut(text) {
    return text.replace(/[^\n]/g, " ");
}

/**
 * Strips line and block comments so a comment can never satisfy a check.
 * Each comment is replaced by an equally long run of spaces that keeps its
 * newlines, so every index and line number in the stripped source still
 * refers to the same place in the file the reader will open. (Collapsing a
 * block comment to a single space instead is what made this script report
 * `ColorSetting.tsx:46` for a literal that lives on line 51.)
 */
function stripComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, blankOut)
        .replace(
            /(^|[^:])(\/\/[^\n]*)/g,
            (_, before, comment) => before + blankOut(comment),
        );
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

const NON_SVG_ICON_ELEMENTS = new Set(["Box", "span", "div"]);

/**
 * The non-`svg` element an icon passed to a `Checkbox`/`Radio` renders, or
 * `null` when it renders something MUI's `svg:first-of-type` ring can reach.
 * A tag written inline (`icon={<Box .../>}`) answers directly; a local
 * component (`icon={<SelectAllUncheckedIcon />}`) is resolved one level, by
 * reading the first element its own declaration returns. One level is
 * deliberate: it covers the shape this repository actually had, and a deeper
 * indirection is a review question rather than a grep question.
 */
function nonSvgIconElement(source, tag) {
    if (NON_SVG_ICON_ELEMENTS.has(tag)) {
        return tag;
    }
    const declaration = new RegExp(
        `\\b(?:function\\s+${tag}\\s*\\(|const\\s+${tag}\\s*=)`,
    ).exec(source);
    if (!declaration) {
        return null;
    }
    const body = source.slice(declaration.index);
    const returned = /return\s*\(?\s*<([A-Za-z][A-Za-z0-9]*)/.exec(body);
    return returned && NON_SVG_ICON_ELEMENTS.has(returned[1])
        ? returned[1]
        : null;
}

const CLOSING_DELIMITER = {"{": "}", "(": ")", "[": "]"};

/**
 * The index just past the delimiter that closes the one opened at
 * `openIndex`. Nesting-aware, and deliberately naive about a delimiter inside
 * a string: over-running widens a region, which can only make check 4 flag
 * more, never less.
 */
function delimitedEnd(source, openIndex) {
    const open = source[openIndex];
    const close = CLOSING_DELIMITER[open];
    let depth = 0;
    for (let cursor = openIndex; cursor < source.length; cursor++) {
        if (source[cursor] === open) {
            depth++;
        } else if (source[cursor] === close) {
            depth--;
            if (depth === 0) {
                return cursor + 1;
            }
        }
    }
    return source.length;
}

/** The index just past the backtick closing the template opened at `tick`. */
function templateEnd(source, tick) {
    for (let cursor = tick + 1; cursor < source.length; cursor++) {
        if (source[cursor] === "\\") {
            cursor++;
        } else if (source[cursor] === "`") {
            return cursor + 1;
        }
    }
    return source.length;
}

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|rgba?\(|oklch\(/g;

/**
 * The `[start, end)` ranges of `source` in which a colour literal is a
 * *design* value rather than data -- the only places check 4 fires:
 *
 *   a. a style object or prop: `sx={...}`, `sx: {...}`, `style={...}`;
 *   b. an Emotion authoring site: `styled(X)(...)`, `styled.div` + template,
 *      `` css`...` ``, `` keyframes`...` ``;
 *   c. a presentational JSX attribute: `fill=`, `stroke=`, `color=`,
 *      `htmlColor=`, `bgcolor=`, `borderColor=`, `backgroundColor=`;
 *   d. a binding whose whole value is a colour string (`const RING = "#fff"`)
 *      -- so hoisting a literal out of an `sx` block does not evade the gate.
 *
 * A colour appearing anywhere else -- parsed out of persisted config, built
 * for the legacy `rgb(r,g,b)` wire shape, compared in an assertion -- is data
 * and is not a design literal.
 */
function designLiteralRegions(source) {
    const regions = [];
    const add = (start, end) => {
        if (end > start) {
            regions.push([start, end]);
        }
    };

    for (const match of source.matchAll(/\b(?:sx|style)\s*[=:]\s*\{/g)) {
        const open = match.index + match[0].length - 1;
        add(open, delimitedEnd(source, open));
    }

    const emotion =
        /\b(?:styled\s*(?:\([^()]*\)|\.[A-Za-z][A-Za-z0-9]*)|css|keyframes)\s*(?:<[^<>()`]*>\s*)?[(`]/g;
    for (const match of source.matchAll(emotion)) {
        const open = match.index + match[0].length - 1;
        add(
            open,
            source[open] === "`"
                ? templateEnd(source, open)
                : delimitedEnd(source, open),
        );
    }

    const attribute =
        /\b(?:fill|stroke|color|htmlColor|bgcolor|borderColor|backgroundColor)\s*=\s*(?:"[^"]*"|'[^']*'|\{[^{}]*\})/g;
    for (const match of source.matchAll(attribute)) {
        add(match.index, match.index + match[0].length);
    }

    const colorConstant =
        /=\s*(["'])(?:#[0-9a-fA-F]{3,8}|(?:rgba?|oklch)\([^"'\n]*\))\1/g;
    for (const match of source.matchAll(colorConstant)) {
        add(match.index, match.index + match[0].length);
    }

    return regions;
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
 * `@mui/material` 9.4.0's own `theme.focusVisible` consumers, by the
 * component name a JSX tag uses. Read off the 9.4.0 sources rather than
 * inferred: every `styled(ButtonBase)` component takes `ButtonBase.js`'s root
 * variant (`internalDisabledThemeFocusVisible: false`), `Chip` renders a
 * `ButtonBase` once it is clickable or deletable, `Checkbox.js`/`Radio.js`
 * ring `svg:first-of-type`, `Switch.js` rings `~ .MuiSwitch-track`, and
 * `Link.js` and `Autocomplete.js` ring their own `focusVisible` class, and
 * `Rating.js`/`Slider.js` spread `outsetFocusRing` themselves. On any
 * of these the focus indicator is MUI's and survives `disableRipple`; on
 * anything else the ripple is still the only thing MUI ships.
 *
 * This list is version-scoped to 9.4.0 and is re-derived on an upgrade, the
 * same duty `tests/system/tests/focus-indication.spec.ts` carries.
 */
const focusVisibleConsumers = new Set([
    "AccordionSummary",
    "Autocomplete",
    "BottomNavigationAction",
    "Button",
    "ButtonBase",
    "CardActionArea",
    "Checkbox",
    "Chip",
    "Fab",
    "IconButton",
    "Link",
    "ListItemButton",
    "MenuItem",
    "PaginationItem",
    "Radio",
    "Rating",
    "Slider",
    "StepButton",
    "Switch",
    "Tab",
    "TabScrollButton",
    "TableSortLabel",
    "ToggleButton",
]);

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
        const isTestFile = /\.test\.tsx?$/.test(displayPath);
        if (!cleanupPending && !isTestFile) {
            const regions = designLiteralRegions(source);
            const reported = new Set();
            for (const literal of source.matchAll(COLOR_LITERAL)) {
                const inDesignPosition = regions.some(
                    ([start, end]) =>
                        literal.index >= start && literal.index < end,
                );
                const line = lineOf(source, literal.index);
                if (!inDesignPosition || reported.has(line)) {
                    continue;
                }
                reported.add(line);
                findings.push(
                    `${displayPath}:${line} ` +
                        `contains a color literal ("${literal[0]}…") in a ` +
                        `design position (style object, styled/css template, ` +
                        `presentational attribute, or colour constant). ` +
                        `ADR-0014: design values live in app/theme.ts; ` +
                        `consume palette/surfaces tokens instead.`,
                );
            }
        }
    }

    // ---- Check 2: disableRipple outside MUI's focusVisible consumers ------
    for (const match of source.matchAll(/\bdisableRipple\b/g)) {
        const component = enclosingComponent(source, match.index);
        const ringedByMui = component
            ? focusVisibleConsumers.has(component)
            : false;
        const authoredLocally = /Mui-focusVisible|focusVisibleClassName/.test(
            source,
        );
        if (!ringedByMui && !authoredLocally) {
            findings.push(
                `${displayPath}:${lineOf(source, match.index)} ` +
                    `\`disableRipple\` on <${component ?? "unknown"}> removes ` +
                    `the only focus affordance MUI ships for that control: it ` +
                    `is not one of 9.4.0's \`theme.focusVisible\` consumers, so ` +
                    `nothing paints a ring for it ` +
                    `(FM-053 / FM-184 / ADR-0013 / ADR-0056; ButtonBase.js: ` +
                    `"Without a ripple there is no styling for :focus-visible ` +
                    `by default").`,
            );
        }
    }

    // ---- Check 4a: a SwitchBase icon MUI's svg-keyed ring cannot reach -----
    const iconProp =
        /\b(?:icon|checkedIcon|indeterminateIcon)\s*=\s*\{\s*<([A-Za-z][A-Za-z0-9]*)/g;
    for (const match of source.matchAll(iconProp)) {
        const owner = enclosingComponent(source, match.index);
        if (owner !== "Checkbox" && owner !== "Radio") {
            continue;
        }
        const element = nonSvgIconElement(source, match[1]);
        if (element) {
            findings.push(
                `${displayPath}:${lineOf(source, match.index)} ` +
                    `gives <${owner}> an icon that renders <${element}>, not an ` +
                    `\`svg\`. \`Checkbox.js\`/\`Radio.js\` author the focus ring ` +
                    `on \`&.Mui-focusVisible svg:first-of-type\` — the root ` +
                    `cannot carry it, because \`SwitchBase.js\` makes the ` +
                    `focusable node an \`opacity: 0\` input overlay — so this ` +
                    `control paints no keyboard focus indicator at all ` +
                    `(FM-184 / ADR-0056). Draw the icon with \`SvgIcon\`.`,
            );
        }
    }
}

// ---- Check 5: the focus-ring opt-in itself ---------------------------------
// Not one of the reintroduction patterns above, but the thing they would be
// reintroduced *against*: if `theme.ts` stopped opting into MUI's ring, or
// started authoring a second one beside it, every check above would go on
// passing while the application lost or doubled its indicator.
//
// ADR-0015: `MuiInputBase` is deliberately not ringed — the input/select
// family indicates focus through MUI's own focused notchedOutline, and an
// authored `&:has(:focus-visible)` ring there double-borders every focused
// select. That is enforced from the other direction below, and now falls out
// of the "only `MuiCssBaseline` declares focus styling" rule as well; it is
// kept as its own finding because its message is the one a reader needs.
const focusVisibleOptIn =
    /focusVisible:\s*\{\s*outlineWidth:\s*3\s*,\s*outlineOffset:\s*3\s*,?\s*\}/;
if (!focusVisibleOptIn.test(themeSource)) {
    findings.push(
        `src/app/theme.ts no longer passes ` +
            `\`focusVisible: {outlineWidth: 3, outlineOffset: 3}\` to ` +
            `\`createTheme\`. ADR-0056 adopts MUI 9.4's ring but keeps ` +
            `ADR-0013's measured 3px/3px geometry rather than MUI's 2px/2px ` +
            `defaults; dropping the two keys is an owner experiment that has ` +
            `to be re-measured, not a silent edit.`,
    );
}

const inputBaseBlock = themeBlocks.get("InputBase");
if (
    inputBaseBlock !== undefined &&
    /Mui-focusVisible|:focus-visible|outline/i.test(inputBaseBlock)
) {
    findings.push(
        `src/app/theme.ts authors focus styling on MuiInputBase. ADR-0015 ` +
            `forbids it: an authored ring on the input root double-borders ` +
            `every focused select; the family's indicator is MUI's own ` +
            `focused notchedOutline. Non-focus declarations (size, height) ` +
            `are fine.`,
    );
}

// `MuiCssBaseline` is the one exception, and it is not a second focus system:
// it spreads the very token MUI resolved. Every other family's ring is MUI's
// own, so a `Mui-focusVisible`, `:focus-visible` or `outline` declaration in
// any other theme block is a second, hand-authored indicator (ADR-0056).
const focusDeclaration =
    /Mui-focusVisible|:focus-visible|(?:^|[^A-Za-z])outline(?:Color|Offset|Style|Width)?\s*:/;
for (const [family, block] of themeBlocks) {
    if (family === "CssBaseline" || !focusDeclaration.test(block)) {
        continue;
    }
    findings.push(
        `src/app/theme.ts authors focus styling on Mui${family}. Since ` +
            `ADR-0056 the ring is \`theme.focusVisible\`, painted by MUI ` +
            `itself on every family it reaches; a second declaration here ` +
            `either doubles it or silently diverges from it. The only ` +
            `focus declaration this file may make is \`MuiCssBaseline\`'s ` +
            `":focus-visible" spread, for the unclassed \`<a href>\` no MUI ` +
            `component styles.`,
    );
}

const cssBaselineBlock = (themeBlocks.get("CssBaseline") ?? "").replace(
    /\s+/g,
    " ",
);
if (
    !/":focus-visible"\s*:\s*\{\s*\.\.\.theme\.focusVisible\s*\}/.test(
        cssBaselineBlock,
    )
) {
    findings.push(
        `src/app/theme.ts's MuiCssBaseline ":focus-visible" rule no longer ` +
            `spreads \`theme.focusVisible\`, so the one control class MUI ` +
            `styles nothing for — \`NewsPage\`'s sanitized unclassed ` +
            `\`<a href>\`, measured at 1.29:1 on the browser default — either ` +
            `loses its ring or renders a second, divergent one ` +
            `(ADR-0013 family H, ADR-0056).`,
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
        `${focusVisibleConsumers.size} MUI 9.4.0 focusVisible consumers known, ` +
        `and src/app/theme.ts opts into the ring exactly once.`,
);
