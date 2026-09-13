import {describe, expect, it} from "vitest";

import {createHash} from "node:crypto";

import {createHydraTheme, type ThemeName} from "./theme";

/*
 * ---------------------------------------------------------------------------
 * The composed theme, pinned.
 * ---------------------------------------------------------------------------
 *
 * `theme.test.ts` beside this file measures the *properties* the palettes were
 * authored for (contrast ratios, the ADR-0049 blocks, the focus token). This
 * file pins something blunter and complementary: that `createHydraTheme` still
 * produces the same object it produced before backlog item 30 split `theme.ts`
 * into `themeTokens.ts`, `themePalettes.ts` and `themeComponents.ts`.
 *
 * The split was proven byte-identical at the time by dumping the serialised
 * theme for all four names before and after (and by dumping the stylesheet
 * emitted by a real page render, which is identical too). This test is what
 * keeps that provable afterwards: it is the same serialisation, reduced to one
 * digest per theme, so a later edit anywhere in the three modules -- a token, a
 * palette value, a `styleOverrides` entry, a `variants` block -- moves the
 * digest and shows up in review instead of passing silently.
 *
 * What the digest deliberately does NOT see: whole-line comments, block
 * comments, indentation, and the
 * module-qualified names Vite's SSR transform gives imported bindings inside
 * a function body. `normalise` below strips all three, so re-wording this file's
 * (heavily commented) neighbours or moving a token between modules does not
 * turn a documentation edit into a failing test. What it does see is every
 * value and every line of executable style code.
 */

const names: ThemeName[] = ["grey", "bright", "dark", "dark-dyschromatopsia"];

/** Whole-line `//` comments, block comments, and runs of whitespace. */
function normalise(source: string): string {
    return source
        .replace(/__vite_ssr_import_\d+__\./g, "")
        .replace(/\(0,\s*([A-Za-z_$][\w$]*)\)/g, "$1")
        .replace(/^[ \t]*\/\/.*$/gm, "")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * The theme as text. Functions -- every `styleOverrides` callback and every
 * `variants` style -- are their normalised source; MUI's own helpers on the
 * theme (`spacing`, `alpha`, ...) serialise the same way and are pinned too.
 */
function serialise(theme: unknown): string {
    const seen = new WeakSet<object>();
    return JSON.stringify(theme, (_key, raw: unknown) => {
        if (typeof raw === "function") {
            return `[function]${normalise(raw.toString())}`;
        }
        if (typeof raw === "symbol") {
            return `[symbol]${String(raw)}`;
        }
        if (typeof raw === "object" && raw !== null) {
            if (seen.has(raw)) {
                return "[circular]";
            }
            seen.add(raw);
        }
        return raw;
    });
}

function digest(name: ThemeName): string {
    return createHash("sha256")
        .update(serialise(createHydraTheme(name, false)))
        .digest("hex")
        .slice(0, 16);
}

describe("composed theme", () => {
    it("should keep every theme's serialised shape", () => {
        expect(Object.fromEntries(names.map((name) => [name, digest(name)])))
            .toMatchInlineSnapshot(`
          {
            "bright": "7e7f1b386f5e7dbe",
            "dark": "38ef265dfa04434b",
            "dark-dyschromatopsia": "37d8799652820e1e",
            "grey": "f4fcb6a355562db0",
          }
        `);
    });

    // The composer is the only module the application imports from, so the
    // three modules behind it have to reach the theme through it: a token that
    // stopped being read, or a `components` slot that stopped being composed,
    // would leave the digests above stale-looking rather than obviously wrong.
    // These are the three seams, one assertion each.
    it("should compose tokens, palettes and component overrides", () => {
        const theme = createHydraTheme("grey", false);
        // themePalettes.ts
        expect(theme.palette.background.default).toBe("#1f2426");
        // themeTokens.ts
        expect(theme.typography.fontFamily).toBe(
            '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
        );
        // themeComponents.ts
        expect(theme.components?.MuiButton?.variants).toHaveLength(2);
    });
});
