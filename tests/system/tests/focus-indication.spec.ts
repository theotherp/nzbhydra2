/*
 * FM-053 / FM-184 / ADR-0013 / ADR-0056 -- the application-wide keyboard focus
 * indicator.
 *
 * WHAT THIS FILE GATES. ADR-0013 (accepted 2026-08-19, **Option A**) decides
 * that this application indicates keyboard focus with one explicit focus-ring
 * token and measures its geometry: 3px wide at a 3px offset, drawn inset where
 * an ancestor clips an outset ring. ADR-0015 (accepted 2026-08-19) amends the
 * scope: the text-input/select family is NOT ringed — since ADR-0014 restored
 * stock outlined inputs, that family's indicator is MUI's own focused
 * `notchedOutline` (2px `primary.main`), and this spec asserts both that it
 * paints and that no ring doubles it.
 *
 * ADR-0056 (accepted 2026-09-04) keeps both decisions and replaces their
 * *mechanism*: since FM-184 the ring is `@mui/material` 9.4.0's own
 * `theme.focusVisible`, opted into once in `core/ui-react/src/app/theme.ts`
 * with ADR-0013's geometry (`outlineWidth: 3`, `outlineOffset: 3`) rather than
 * MUI's 2px/2px defaults. `theme.ts` authors no per-family rule any more, so
 * what this file gates is no longer "the eleven authored rules render" but
 * "every family this application actually renders still paints the measured
 * ring, wherever MUI decided to put it". That distinction is the whole point
 * of the file: MUI chooses the node (the `Checkbox` ring lands on the icon
 * `svg`, the `Switch` ring on the track) and the offset (`Tab` insets by
 * three ring-offsets, `MenuItem`/`ListItemButton`/`Autocomplete` option by
 * one), and only a real browser can show which.
 *
 * For every family this spec reaches one representative control with real
 * `Tab`/`Shift+Tab` (and, for menu items and options, real
 * `Enter`/`ArrowDown`) keypresses, records `element.matches(":focus-visible")`
 * for each, and asserts both that the focused/unfocused computed-style delta
 * is non-empty and that the *literal* values render --
 * `outline: 3px solid oklch(0.68 0.195 144.6)` at `3px`, `-3px`, or `-9px`.
 * It asserts computed styles and measured geometry, never a screenshot
 * comparison.
 *
 * WHY IT IS A SYSTEM TEST AND NOT A COMPONENT TEST. ADR-0004: jsdom has no
 * `:focus-visible`, no layout, no computed outline and no ripple element, so
 * no component test can establish or refute anything here. Every control is
 * reached by keyboard from a known start; `locator.focus()` is never used to
 * place focus, and `click()` is used only to submit a form or open a surface,
 * never to focus a control under measurement.
 *
 * WHY EVERY NAVIGATION IS A DIRECT CANONICAL ROUTE. Until FM-095 these were
 * `ui/react?redirect=...` visits through the cookie selector, because a bare
 * goto could land on the legacy AngularJS shell, where none of these controls,
 * defects, or fixes exist -- the test would then pass for the wrong reason,
 * which FM-051's first draft did. With the legacy shell and the selector both
 * removed there is only one shell left to serve, so the deep link states the
 * route directly and nothing is left to be inherited or mistaken.
 *
 * VERSION SCOPE AND RE-VERIFICATION DUTY (ADR-0012's precedent; ADR-0013's
 * `What would keep it from regressing`). Every assertion below is scoped to
 * `@mui/material` **9.4.0** and to the Chrome for Testing build Playwright
 * installs for this repository. It depends on these MUI internals, cited by
 * symbol name because `node_modules` line numbers rot between installs (the
 * failure mode FM-047 hit):
 *
 *   - `styles/focusVisible.js` -- `resolveFocusVisible` (the resolved ring)
 *     and `wireFocusVisibleVars`, which rewrites the offset to
 *     `calc(var(--_focusVisible-offset, 1) * 3px)`. That variable *inherits*,
 *     which is why every offset below is read from the ringed node itself
 *     rather than assumed from its family.
 *   - Outset: `ButtonBase/ButtonBase.js`'s root variant
 *     `internalDisabledThemeFocusVisible: false`, which spreads
 *     `outsetFocusRing` (resetting that inherited variable) and the ring onto
 *     every `ButtonBase` root -- `Button`, `IconButton`, `TableSortLabel`,
 *     a clickable `Chip`. `Link/Link.js` rings `MuiLink-focusVisible`.
 *     `Checkbox/Checkbox.js` rings `&.Mui-focusVisible svg:first-of-type`,
 *     because `internal/SwitchBase.js` opts the root out
 *     (`internalDisabledThemeFocusVisible: true`) -- its `SwitchBaseInput` is
 *     an `opacity: 0` overlay, so a ring on the root or on the focused node
 *     itself would paint invisibly. `Switch/Switch.js` rings
 *     `&.Mui-focusVisible ~ .MuiSwitch-track`.
 *   - Inset, `applyInsetFocusVisible(n)` = an offset of `-n x 3px`:
 *     `MenuItem/MenuItem.js`, `ListItemButton/ListItemButton.js` and
 *     `Autocomplete/Autocomplete.js`'s option at `n = 1`, `Tab/Tab.js` at
 *     `n = 3`.
 *   - Unringed input family: `InputBase/InputBase.js`'s `InputBaseInput`
 *     `'&:focus': {outline: 0}`; `OutlinedInput/OutlinedInput.js`'s
 *     `&.Mui-focused .notchedOutline { borderWidth: 2 }`;
 *     `Select/SelectInput.js`'s `MuiInputBase-input` class on the
 *     `role="combobox"` node.
 *
 * **After any `@mui/material` upgrade this must be re-proven by re-running
 * this spec in a real browser against a real backend -- not by re-reading
 * those sources.** The one MUI internal that moved in 9.4.0 and is visible
 * from a keyboard trace is `MenuList`, now a roving-tabindex container whose
 * `Menu` reopens on the row focused when it closed rather than on the first
 * row; that is kept as MUI's default per ADR-0014/ADR-0056, changes nothing
 * about focus *indication*, and is re-traced where ADR-0012 measures it
 * (`search.spec.ts`, the ArrowRight/ArrowLeft/Escape Refill case).
 *
 * THE `MuiChip` FAMILY IS GATED HERE SINCE FM-087. It used to be the one
 * authored family with no keyboard-reachable representative: the only `Chip`
 * this application rendered (`SearchResults.tsx`'s static "Downloaded"
 * indicator) passes neither `onClick` nor `onDelete`, so it takes no DOM
 * focus and FM-052 dispositioned it outside WCAG 2.4.7/2.4.11 scope. The
 * search bar's constraint chips are clickable, so the interactive `Chip` the
 * rule was authored for now exists and is walked to below.
 */
import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {
    captureVisualRegion,
    visualEvidencePath,
    visualViewports,
} from "./visualEvidence";
import type {Locator, Page} from "@playwright/test";

/**
 * The authored token, as `theme.ts` declares it. `palette.primary.main` is the
 * product's brand green since ADR-0052 (FM-158) -- the logo mark
 * `rgb(6, 161, 40)`'s own hue and chroma, lifted in lightness for the grey
 * theme's dark grounds -- replacing the ADR-0009 mock's teal
 * `oklch(0.75 0.1 190)`. Chromium reports an `oklch()` colour back verbatim
 * rather than converting it to `rgb()`, so the computed value is asserted as
 * authored; that round trip was re-verified in Chrome for Testing for this
 * value.
 */
const FOCUS_RING_COLOR = "oklch(0.68 0.195 144.6)";
/**
 * The same colour, canvas-resolved to sRGB, for the contrast computation.
 * Measured in Chrome for Testing rather than converted by hand.
 */
const FOCUS_RING_RGB: [number, number, number] = [48, 181, 63];
const FOCUS_RING_WIDTH = "3px";
const OUTSET_OFFSET = "3px";
const INSET_OFFSET = "-3px";
/**
 * `Tab/Tab.js` spreads `applyInsetFocusVisible(3)`, so a tab's ring insets by
 * three ring-offsets rather than one: `calc(-3 * 3px)`. FM-053 drew it at
 * `-3px` for the same measured reason (the `.MuiTabs-scroller` is exactly the
 * tab's own height, so an outset ring is clipped top and bottom); MUI's own
 * rule is simply deeper, and 9 + 3 px still lands well inside a 48px tab. The
 * `2 x perimeter` check in `expectAuthoredFocusRing` re-measures the
 * consequence rather than trusting it.
 */
const TAB_INSET_OFFSET = "-9px";
/** WCAG 2.2 SC 2.4.11: the changed area must reach `2 x perimeter` = `4(w+h)`. */
const MINIMUM_CONTRAST = 3;

type FocusProbe = {
    focusVisible: boolean;
    outline: {style: string; width: string; color: string; offset: string};
    unfocusedOutline: {
        style: string;
        width: string;
        color: string;
        offset: string;
    };
    changedProperties: string[];
    box: {width: number; height: number};
    changedArea: number;
    areaThreshold: number;
    backdrop: [number, number, number];
    contrast: number;
    clippedByAncestor: boolean;
    rootOpacity: string;
    pageOverflow: boolean;
};

const OUTLINE_PROPERTIES = [
    "outline-style",
    "outline-width",
    "outline-color",
    "outline-offset",
    "box-shadow",
    "background-color",
    "border-top-width",
    "border-top-color",
] as const;

function relativeLuminance([r, g, b]: [number, number, number]): number {
    const channel = (value: number) => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(
    a: [number, number, number],
    b: [number, number, number],
): number {
    const la = relativeLuminance(a);
    const lb = relativeLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Reads the element's own computed styles plus those of every descendant. */
async function readSubtree(locator: Locator): Promise<Record<string, string>> {
    return locator.evaluate(
        (element, properties) => {
            const snapshot: Record<string, string> = {};
            const record = (node: Element, path: string) => {
                const computed = getComputedStyle(node);
                for (const property of properties) {
                    snapshot[`${path}|${property}`] =
                        computed.getPropertyValue(property);
                }
            };
            record(element, "self");
            const descendants = element.querySelectorAll("*");
            for (let index = 0; index < descendants.length; index++) {
                record(descendants[index], `descendant-${index}`);
            }
            return snapshot;
        },
        OUTLINE_PROPERTIES as unknown as string[],
    );
}

/**
 * Presses real `Tab` from `document.body` until the target holds focus, then
 * proves the walk is a genuine keyboard walk by stepping one `Tab` forward and
 * one `Shift+Tab` back and confirming focus returns to the same element.
 */
async function tabTo(page: Page, locator: Locator): Promise<number> {
    await page.evaluate(() => {
        (document.activeElement as HTMLElement | null)?.blur();
    });
    const handle = await locator.elementHandle();
    expect(
        handle,
        "target must be attached before the keyboard walk",
    ).toBeTruthy();
    const holdsFocus = () =>
        page.evaluate(
            (element) =>
                document.activeElement === element ||
                (element as HTMLElement).contains(
                    document.activeElement as HTMLElement,
                ),
            handle,
        );
    for (let presses = 1; presses <= 160; presses++) {
        await page.keyboard.press("Tab");
        if (await holdsFocus()) {
            // Prove the walk is a real bidirectional keyboard walk rather than
            // a one-way `Tab` count: step forward and come back with a real
            // `Shift+Tab`, and require focus to return to the same control.
            await page.keyboard.press("Tab");
            await page.keyboard.press("Shift+Tab");
            expect(
                await holdsFocus(),
                "Shift+Tab must return focus to the control the forward walk reached",
            ).toBe(true);
            return presses;
        }
    }
    throw new Error("the control was not reachable by Tab within 160 presses");
}

/**
 * Measures a control's unfocused state, reaches it by keyboard, and measures
 * the focused state from the same page and the same element.
 */
async function probeFocus(
    page: Page,
    locator: Locator,
    options: {reach?: () => Promise<void>} = {},
): Promise<FocusProbe> {
    const before = await readSubtree(locator);
    const unfocusedOutline = await locator.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
            style: computed.outlineStyle,
            width: computed.outlineWidth,
            color: computed.outlineColor,
            offset: computed.outlineOffset,
        };
    });
    const backdrop = await locator.evaluate((element) => {
        // The composited ground the ring paints over: walk up from the
        // element's parent, alpha-compositing each translucent
        // `background-color` until an opaque one is reached.
        const layers: number[][] = [];
        let node = element.parentElement;
        while (node) {
            const match =
                getComputedStyle(node).backgroundColor.match(
                    /rgba?\(([^)]+)\)/,
                );
            if (match) {
                const parts = match[1]
                    .split(",")
                    .map((part) => Number.parseFloat(part));
                const alpha = parts.length > 3 ? parts[3] : 1;
                if (alpha > 0) {
                    layers.push([parts[0], parts[1], parts[2], alpha]);
                    if (alpha >= 1) {
                        break;
                    }
                }
            }
            node = node.parentElement;
        }
        let composite = [255, 255, 255];
        for (let index = layers.length - 1; index >= 0; index--) {
            const [r, g, b, a] = layers[index];
            composite = [
                r * a + composite[0] * (1 - a),
                g * a + composite[1] * (1 - a),
                b * a + composite[2] * (1 - a),
            ];
        }
        return composite as [number, number, number];
    });

    if (options.reach) {
        await options.reach();
    } else {
        await tabTo(page, locator);
    }

    const after = await readSubtree(locator);
    const measured = await locator.evaluate((element) => {
        const computed = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const width = Number.parseFloat(computed.outlineWidth) || 0;
        const offset = Number.parseFloat(computed.outlineOffset) || 0;
        const ring = {
            left: rect.left - offset - width,
            top: rect.top - offset - width,
            right: rect.right + offset + width,
            bottom: rect.bottom + offset + width,
        };
        let clipped = false;
        let node = element.parentElement;
        while (node && node !== document.documentElement) {
            const ancestor = getComputedStyle(node);
            if (
                ancestor.overflowX !== "visible" ||
                ancestor.overflowY !== "visible"
            ) {
                const bounds = node.getBoundingClientRect();
                clipped =
                    ring.left < bounds.left - 0.01 ||
                    ring.top < bounds.top - 0.01 ||
                    ring.right > bounds.right + 0.01 ||
                    ring.bottom > bounds.bottom + 0.01;
                break;
            }
            node = node.parentElement;
        }
        return {
            focusVisible: (document.activeElement as HTMLElement).matches(
                ":focus-visible",
            ),
            outline: {
                style: computed.outlineStyle,
                width: computed.outlineWidth,
                color: computed.outlineColor,
                offset: computed.outlineOffset,
            },
            box: {width: rect.width, height: rect.height},
            rootOpacity: computed.opacity,
            clipped,
            pageOverflow:
                document.documentElement.scrollWidth >
                document.documentElement.clientWidth,
        };
    });

    const changedProperties = Object.keys(after).filter(
        (key) => before[key] !== after[key],
    );
    const thickness = Number.parseFloat(measured.outline.width) || 0;
    const offset = Number.parseFloat(measured.outline.offset) || 0;
    const {width, height} = measured.box;
    // A ring of thickness `t` drawn at offset `o` around a `w x h` box changes
    // `2t(w+h) + 8to + 4t^2` px2.
    const changedArea =
        2 * thickness * (width + height) +
        8 * thickness * offset +
        4 * thickness * thickness;

    return {
        focusVisible: measured.focusVisible,
        outline: measured.outline,
        unfocusedOutline,
        changedProperties,
        box: measured.box,
        changedArea,
        areaThreshold: 4 * (width + height),
        backdrop,
        contrast: contrastRatio(FOCUS_RING_RGB, backdrop),
        clippedByAncestor: measured.clipped,
        rootOpacity: measured.rootOpacity,
        pageOverflow: measured.pageOverflow,
    };
}

/**
 * The whole accepted-option contract, asserted per family: keyboard-reached,
 * a non-empty computed-style delta, the literal authored declaration, and the
 * two WCAG 2.4.11 measurements at full opacity.
 */
function expectAuthoredFocusRing(
    label: string,
    probe: FocusProbe,
    expectedOffset: string,
): void {
    expect(probe.focusVisible, `${label}: matches :focus-visible`).toBe(true);
    expect(
        probe.changedProperties.length,
        `${label}: focused/unfocused computed-style delta must not be empty`,
    ).toBeGreaterThan(0);
    expect(probe.outline.style, `${label}: outline-style`).toBe("solid");
    expect(probe.outline.width, `${label}: outline-width`).toBe(
        FOCUS_RING_WIDTH,
    );
    expect(probe.outline.color, `${label}: outline-color`).toBe(
        FOCUS_RING_COLOR,
    );
    expect(probe.outline.offset, `${label}: outline-offset`).toBe(
        expectedOffset,
    );
    // The unfocused state must not already paint the ring, or the delta above
    // would be satisfied by something other than the indicator.
    expect(probe.unfocusedOutline.style, `${label}: unfocused outline`).toBe(
        "none",
    );
    expect(
        probe.changedArea,
        `${label}: changed area ${probe.changedArea.toFixed(2)} px2 against the 4(w+h) threshold`,
    ).toBeGreaterThanOrEqual(probe.areaThreshold);
    expect(
        probe.contrast,
        `${label}: full-opacity contrast ${probe.contrast.toFixed(2)}:1 against its own composited unfocused ground`,
    ).toBeGreaterThanOrEqual(MINIMUM_CONTRAST);
    expect(
        probe.clippedByAncestor,
        `${label}: the indicator must not be clipped by an ancestor`,
    ).toBe(false);
    expect(
        probe.pageOverflow,
        `${label}: the indicator must not cause page-level horizontal overflow`,
    ).toBe(false);
}

/**
 * Captures a focused control with the outset ring guaranteed inside the
 * frame. `locator.screenshot()` and a `captureVisualRegion` clip narrower
 * than the ring's own reach both crop a 3px outline at a 3px offset away
 * entirely, and a cropped indicator photographs identically to an absent
 * one -- exactly the defect a fresh review found in six of this file's
 * seventeen captures. This takes the *control's own* bounding box (never a
 * containing region, which can still be too tight) and expands it by
 * `margin` px on every side -- `10` by default, comfortably past the ring's
 * own reach (`3px` width plus `3px` offset = `6px`), so the ring's outermost
 * pixel lands with real buffer inside the frame rather than exactly on the
 * crop boundary -- clamped to the current viewport so an edge-adjacent
 * control does not silently lose its margin off the page edge, then
 * rasterises that clip with a real `page.screenshot`, never an element-box
 * screenshot.
 */
async function captureFocusedControl(
    page: Page,
    locator: Locator,
    path: string,
    margin = 10,
): Promise<void> {
    const box = await locator.boundingBox();
    expect(box, `${path}: element must have a bounding box`).not.toBeNull();
    if (!box) {
        return;
    }
    const viewport = page.viewportSize();
    expect(viewport, `${path}: page must have a viewport`).not.toBeNull();
    if (!viewport) {
        return;
    }
    const x = Math.max(0, box.x - margin);
    const y = Math.max(0, box.y - margin);
    const right = Math.min(viewport.width, box.x + box.width + margin);
    const bottom = Math.min(viewport.height, box.y + box.height + margin);
    await page.screenshot({
        path,
        clip: {x, y, width: right - x, height: bottom - y},
    });
}

/**
 * `Checkbox`'s ringed node, probed where MUI 9.4.0 actually paints it.
 * `Checkbox/Checkbox.js` authors the ring on
 * `&.Mui-focusVisible svg:first-of-type` and `internal/SwitchBase.js` opts the
 * root out, so the root -- which FM-053's authored rule used -- now carries no
 * outline at all, and the focusable node is still the `opacity: 0` input
 * overlay a ring would paint invisibly on. The keyboard walk therefore still
 * targets the root (the only node that contains the focusable input), while
 * every measurement is taken on the icon `svg` MUI ringed.
 */
async function probeCheckboxRing(
    page: Page,
    root: Locator,
): Promise<FocusProbe> {
    return probeFocus(page, root.locator("svg:first-of-type"), {
        reach: async () => {
            await tabTo(page, root);
        },
    });
}

/** A deterministic three-result search, independent of live indexer timing. */
async function mockSearchResponse(page: Page): Promise<void> {
    await page.route("**/internalapi/search", async (route) => {
        const result = (id: string, indexer: string, category: string) => ({
            searchResultId: id,
            title: `Focus fixture ${id}`,
            indexer,
            category,
            downloadType: "NZB",
        });
        await route.fulfill({
            json: {
                searchResults: [
                    result("alpha", "Mock1", "Movies"),
                    result("beta", "Mock2", "TV"),
                    result("gamma", "Mock1", "Movies"),
                ],
                indexerSearchMetaDatas: [
                    {
                        indexerName: "Mock1",
                        wasSuccessful: true,
                        hasMoreResults: false,
                        totalResultsKnown: true,
                    },
                ],
                indexerLimitWarnings: [],
                rejectedReasonsMap: {},
                notPickedIndexersWithReason: {},
                numberOfAvailableResults: 3,
                numberOfRejectedResults: 0,
                numberOfProcessedResults: 3,
                numberOfAcceptedResults: 3,
                offset: 0,
                limit: 3,
            },
        });
    });
}

async function openSearchRoute(
    page: Page,
    viewport: keyof typeof visualViewports,
): Promise<void> {
    await page.setViewportSize(visualViewports[viewport]);
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("search-query")).toBeVisible();
}

async function runSearch(page: Page): Promise<void> {
    await page.getByTestId("search-query").fill("focus fixture");
    await page.getByTestId("search-submit").click();
    await expect(page.getByTestId("search-results")).toBeVisible();
    await expect(page.getByTestId("search-result-row").first()).toBeVisible();
}

const inputRoot =
    "xpath=ancestor-or-self::div[contains(@class,'MuiInputBase-root')][1]";

/**
 * ADR-0015 (amending ADR-0013): the text-input/select family indicates focus
 * through MUI's own focused `notchedOutline` — 2px `primary.main`, measured by
 * FM-052 at 3.15-5.56:1, passing the 3:1 axis everywhere — not through the
 * authored ring, which double-bordered every focused select. This helper
 * asserts the whole family contract on a `.MuiInputBase-root`: a real 1px
 * resting border, keyboard reach, the 2px focused border in the brand teal,
 * and the *absence* of the authored outline ring on the focused root.
 */
async function expectFocusedOutlinedInput(
    page: Page,
    root: Locator,
    label: string,
): Promise<void> {
    const notchedOutline = root.locator(".MuiOutlinedInput-notchedOutline");
    expect(
        await notchedOutline.evaluate(
            (element) => getComputedStyle(element).borderTopWidth,
        ),
        `${label}: unfocused notchedOutline width`,
    ).toBe("1px");
    await tabTo(page, root);
    const focused = await notchedOutline.evaluate((element) => {
        const computed = getComputedStyle(element);
        return {
            width: computed.borderTopWidth,
            color: computed.borderTopColor,
        };
    });
    expect(focused.width, `${label}: focused notchedOutline width`).toBe("2px");
    expect(focused.color, `${label}: focused notchedOutline color`).toBe(
        FOCUS_RING_COLOR,
    );
    expect(
        await root.evaluate(
            (element) => getComputedStyle(element).outlineStyle,
        ),
        `${label}: no authored ring may double the focused border (ADR-0015)`,
    ).toBe("none");
}

test.describe("Authored keyboard focus indication (ADR-0013, Option A)", () => {
    test.beforeEach(async ({hydra, page}) => {
        await hydra.configureMockIndexers(["1", "2"]);
        // FM-091 added a one-time "Sorting of TV episodes" help dialog that
        // opens on the first eligible TV search and, being modal, traps focus
        // -- which is fatal to a spec whose whole method is walking focus with
        // Tab. This file's `mockSearchResponse` fixture returns a `category:
        // "TV"` result and grouping defaults on, so every search here is
        // eligible. Pre-raise the per-user flag so the dialog stays closed,
        // exactly as `results.spec.ts` does for the same reason.
        await page.request.put(
            "/internalapi/genericstorage/isGroupEpisodesHelpShown?forUser=true",
            {data: true},
        );
    });

    test("should render the authored ring on the search route's ButtonBase family and the focused border on its input family at both viewports", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await openSearchRoute(page, viewport);

            // Family B -- `ButtonBase` ripple family, `MuiButton`. FM-052
            // measured the pulsating `TouchRipple` that stood in for a focus
            // indicator here at 1.19:1-2.38:1; those figures are a static
            // `opacity: 0.3` composite and do not transfer to this opaque
            // ring, which is why it is measured fresh below rather than
            // inherited.
            const submit = await probeFocus(
                page,
                page.getByTestId("search-submit"),
            );
            expectAuthoredFocusRing(
                `search-submit (${viewport})`,
                submit,
                OUTSET_OFFSET,
            );

            // The input family, ADR-0015: a stock outlined TextField whose
            // focused notchedOutline is the indicator.
            await expectFocusedOutlinedInput(
                page,
                page.getByTestId("search-query").locator(inputRoot),
                `search-query (${viewport})`,
            );

            // The `Select` trigger (a stock `TextField select` since
            // ADR-0014), same family contract.
            await expectFocusedOutlinedInput(
                page,
                page
                    .getByTestId("search-category-control")
                    .locator(".MuiInputBase-root"),
                `search-category-control (${viewport})`,
            );

            // Family F -- `MuiListItemButton`, drawn inset because an outset
            // ring was measured clipped by the mobile navigation `Drawer`'s
            // own `Paper`. The shell renders the nav two ways: inline at
            // `desktop`, and inside a `Drawer` behind the hamburger
            // `IconButton` below the `md` breakpoint -- so the mobile branch
            // opens that Drawer with real keyboard presses first, which also
            // exercises family B's `MuiIconButton` entry, whose only rendering
            // in this application is that hamburger.
            if (viewport === "mobile") {
                const hamburger = page
                    .locator("header button.MuiIconButton-root")
                    .first();
                const iconButton = await probeFocus(page, hamburger);
                expectAuthoredFocusRing(
                    "mobile nav hamburger IconButton",
                    iconButton,
                    OUTSET_OFFSET,
                );
                await page.keyboard.press("Enter");
                await expect(
                    page.locator(".MuiDrawer-paper").first(),
                ).toBeVisible();
            }
            const navScope =
                viewport === "mobile"
                    ? page.locator(".MuiDrawer-paper").first()
                    : page.getByTestId("app-shell-nav");
            const navItem = await probeFocus(
                page,
                navScope.locator("a.MuiListItemButton-root").first(),
            );
            expectAuthoredFocusRing(
                `nav ListItemButton (${viewport})`,
                navItem,
                INSET_OFFSET,
            );

            if (viewport === "desktop") {
                await captureVisualRegion(
                    page.getByTestId("app-shell-nav"),
                    "F-PLATFORM-SHELL",
                    "keyboard-focus-nav-item-desktop",
                );
            } else {
                await navScope.screenshot({
                    path: "visual-evidence/FM-053/keyboard-focus-nav-item-mobile-drawer.png",
                });
            }
        }
    });

    test("should render the focused border on the Advanced panel's range fields and the media pair", async ({
        page,
    }) => {
        await openSearchRoute(page, "desktop");
        await page.getByTestId("search-advanced-toggle").click();
        await expect(page.getByTestId("search-advanced-panel")).toBeVisible();

        // FM-052's `advanced-range-input` (`fails 2.4.7` as a bare InputBase
        // with a static border) is a stock outlined TextField since ADR-0014.
        await expectFocusedOutlinedInput(
            page,
            page.getByLabel("Min age").locator(inputRoot),
            "advanced-range-input",
        );
        await captureFocusedControl(
            page,
            page.getByLabel("Min age").locator(inputRoot),
            visualEvidencePath(
                "F-SEARCH-FORM",
                "keyboard-focus-advanced-range-input-desktop",
            ),
        );

        // FM-052's `season-episode-paired-input` (`fails 2.4.7`: it declared
        // no border and had no wrapper) is a stock labeled TextField since
        // ADR-0014.
        await page.getByTestId("search-category-control").click();
        await page.getByRole("option", {name: "TV", exact: true}).click();
        // FM-087 put the pair inside the Advanced panel, which a category
        // change leaves as the user left it -- here, open from the click
        // above.
        await expect(page.getByTestId("search-advanced-panel")).toBeVisible();
        await expect(page.getByTestId("season-episode-pair")).toBeVisible();
        await expectFocusedOutlinedInput(
            page,
            page.getByLabel("Season").locator(inputRoot),
            "season-episode-paired-input",
        );
        await captureVisualRegion(
            page.getByTestId("workspace-primary"),
            "F-SEARCH-MEDIA",
            "keyboard-focus-season-input-desktop",
        );
    });

    // FM-087: ADR-0013 family G's first keyboard-reachable representative.
    test("should render the authored ring on a search constraint chip", async ({
        page,
    }) => {
        await openSearchRoute(page, "desktop");
        await page.getByTestId("search-advanced-toggle").click();
        await expect(page.getByTestId("search-advanced-panel")).toBeVisible();
        await page.getByLabel("Min age").fill("10");
        const chip = page.getByTestId("search-chip-age");
        await expect(chip).toBeVisible();
        // FM-149 folded the chips row into its own `Collapse`, which keeps
        // `overflow: hidden` while its enter transition runs and only
        // switches to `overflow: visible` once MUI stamps
        // `MuiCollapse-entered`. The chip is visible mid-transition, so
        // probing then measures the outset ring clipped by a bound that no
        // longer exists in the settled UI. Wait for the entered state.
        await expect(
            page
                .locator(".MuiCollapse-entered")
                .filter({has: page.getByTestId("search-chips")}),
        ).toBeVisible();

        const probe = await probeFocus(page, chip);
        expectAuthoredFocusRing("search constraint chip", probe, OUTSET_OFFSET);
        await captureFocusedControl(
            page,
            chip,
            visualEvidencePath(
                "F-SEARCH-FORM",
                "keyboard-focus-constraint-chip-desktop",
            ),
        );
    });

    test("should render the authored ring on the indexer Select and the recent-search trigger and menu", async ({
        hydra,
        page,
    }) => {
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).keepHistory = true;
        await hydra.saveConfig(config);
        await hydra.configureMockIndexers(["1", "2"]);
        // Deliberately NOT `mockSearchResponse`: the recent-search menu is
        // populated from the server's own search history, so the two searches
        // below must reach `/internalapi/search` for real.
        await openSearchRoute(page, "desktop");

        // FM-087 moved the indexer selection into the Advanced panel.
        await page.getByTestId("search-advanced-toggle").click();
        await expect(page.getByTestId("search-advanced-panel")).toBeVisible();
        const indexersLocator = page
            .getByTestId("workspace-indexers")
            .locator(".MuiInputBase-root")
            .first();
        await expectFocusedOutlinedInput(
            page,
            indexersLocator,
            "workspace indexers Select",
        );
        // R2 fix: the containing region (`workspace-indexers`, 1164x77) is
        // exactly as wide as the control itself (1164.00x36.41), so a
        // `captureVisualRegion` clip on it left the ring's left/right/top
        // strokes off-frame by construction -- the identical defect class R1
        // fixed elsewhere in this file, surviving here because this call
        // site was not among the six R1 touched. `captureFocusedControl`
        // frames the *control's own* box plus a real margin instead.
        await captureFocusedControl(
            page,
            indexersLocator,
            visualEvidencePath(
                "F-SEARCH-INDEXERS",
                "keyboard-focus-indexer-select-desktop",
            ),
        );

        // Two distinctly-named searches, so the recent-search menu carries two
        // entries and the second one has a real unfocused baseline below.
        await page.getByTestId("search-query").fill("focus fixture alpha");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-results")).toBeVisible();
        await openSearchRoute(page, "desktop");
        await page.getByTestId("search-query").fill("focus fixture beta");
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-results")).toBeVisible();

        await openSearchRoute(page, "desktop");
        const trigger = page.getByTestId("recent-searches-trigger");
        await expect(trigger).toBeVisible();
        const triggerProbe = await probeFocus(page, trigger);
        expectAuthoredFocusRing(
            "recent-searches-trigger",
            triggerProbe,
            OUTSET_OFFSET,
        );
        await captureFocusedControl(
            page,
            trigger,
            visualEvidencePath(
                "F-SEARCH-RECENT",
                "keyboard-focus-recent-searches-trigger-desktop",
            ),
        );

        // Family F -- `MuiMenuItem`, opened and traversed by keyboard alone
        // (`Enter` on the already keyboard-focused trigger, then `ArrowDown`).
        // Drawn inset because an outset ring was measured clipped by the
        // `Menu`'s own `Paper`.
        await page.keyboard.press("Enter");
        const menu = page.getByRole("menu", {name: "Recent searches"});
        await expect(menu).toBeVisible();
        // MUI's `MenuList` autofocuses the first entry when the menu opens, so
        // the *second* entry is the one with a genuine unfocused baseline
        // inside this same open menu. The fixture above submitted two
        // distinctly-named searches for exactly that reason.
        const secondEntry = page.getByRole("menuitem").nth(1);
        await expect(secondEntry).toBeVisible();
        const menuItem = await probeFocus(page, secondEntry, {
            reach: async () => {
                for (let press = 0; press < 12; press++) {
                    await page.keyboard.press("ArrowDown");
                    if (
                        await secondEntry.evaluate(
                            (element) => document.activeElement === element,
                        )
                    ) {
                        return;
                    }
                }
                throw new Error(
                    "ArrowDown never reached the second recent-search entry",
                );
            },
        });
        expectAuthoredFocusRing(
            "recent-search-entry (MenuItem)",
            menuItem,
            INSET_OFFSET,
        );
    });

    test("should render the authored ring on the results surfaces, including the SwitchBase family on its own visible root", async ({
        hydra,
        page,
    }) => {
        await hydra.configureSabnzbdMock();
        await hydra.configureMockIndexers(["1", "2"]);
        await mockSearchResponse(page);

        for (const viewport of ["desktop", "mobile"] as const) {
            await openSearchRoute(page, viewport);
            await runSearch(page);

            // Family C -- the `SwitchBase` family. `internal/SwitchBase.js`
            // renders `SwitchBaseInput` as a `styled('input')` with
            // `opacity: 0` covering the whole control, and that transparent
            // overlay is the node that takes DOM focus, so a ring on it paints
            // invisibly -- FM-052 measured exactly that outcome for this
            // control (`checkbox-select-all`, `fails 2.4.7`). FM-184: MUI 9.4
            // answers that by ringing the icon `svg` instead of the root, so
            // the measurement moves to the `svg` while the two properties that
            // made the original defect a defect -- a non-transparent painting
            // node, and the input overlay still being transparent -- stay
            // asserted. This control's icons are `SvgIcon`s for exactly that
            // reason (`SelectionMenu.tsx`); as `Box` squares they would match
            // no MUI rule and paint nothing.
            const selectionMenu =
                viewport === "desktop"
                    ? "header-selection-menu"
                    : "toolbar-selection-menu";
            const checkboxRoot = page
                .getByTestId(selectionMenu)
                .locator(".MuiCheckbox-root");
            const selectAll = await probeCheckboxRing(page, checkboxRoot);
            expectAuthoredFocusRing(
                `checkbox-select-all (${viewport})`,
                selectAll,
                OUTSET_OFFSET,
            );
            expect(
                selectAll.rootOpacity,
                `checkbox-select-all (${viewport}): the indicator must paint on a non-transparent node`,
            ).toBe("1");
            expect(
                await checkboxRoot.evaluate(
                    (element) => getComputedStyle(element).outlineStyle,
                ),
                `checkbox-select-all (${viewport}): the root itself paints no second ring (SwitchBase opts it out)`,
            ).toBe("none");
            expect(
                await checkboxRoot
                    .locator("input")
                    .evaluate((element) => getComputedStyle(element).opacity),
                `checkbox-select-all (${viewport}): MUI's native input overlay is still transparent`,
            ).toBe("0");

            if (viewport === "desktop") {
                // R2 fix: the `search-results-table` region left the ring's
                // left stroke only 1 of its 3 pixel columns wide, flush
                // against the frame's left edge -- marginal but the same
                // crop-tightness defect class as the two required R2 fixes
                // above. `captureFocusedControl` frames the checkbox's own
                // box plus a real margin instead.
                await captureFocusedControl(
                    page,
                    checkboxRoot,
                    visualEvidencePath(
                        "F-SEARCH-GROUP-SELECTION",
                        "keyboard-focus-select-all-checkbox-desktop",
                    ),
                );

                const sortButton = await probeFocus(
                    page,
                    page.getByTestId("sort-title"),
                );
                expectAuthoredFocusRing(
                    "sort-header-button",
                    sortButton,
                    OUTSET_OFFSET,
                );
                await captureVisualRegion(
                    page.getByTestId("search-results-table"),
                    "F-SEARCH-RESULTS",
                    "keyboard-focus-sort-header-button-desktop",
                );

                await expectFocusedOutlinedInput(
                    page,
                    page.getByTestId("refine-filter-title").locator(inputRoot),
                    "refine-filter-title-input",
                );
                await captureVisualRegion(
                    page.getByTestId("refine-sidebar"),
                    "F-SEARCH-SORT-FILTER",
                    "keyboard-focus-refine-filter-title-desktop",
                );

                const downloaderLocator = page
                    .getByTestId("results-bulk-actions")
                    .locator(".MuiInputBase-root")
                    .first();
                await expectFocusedOutlinedInput(
                    page,
                    downloaderLocator,
                    "downloader-select",
                );
                // R2 fix: the containing region (`results-bulk-actions`,
                // `results-download-actions` before FM-055 merged the two)
                // is not tall enough for the control's own ~47.7px
                // vertical reach (35.69px control height plus the ring's
                // 6px reach on each side), so the ring's top/bottom strokes
                // fell outside the frame -- the same defect class R1 already
                // fixed for `F-SEARCH-SAVED`'s capture from this identical
                // region, left untouched here because this call site was not
                // among the six R1 touched.
                await captureFocusedControl(
                    page,
                    downloaderLocator,
                    visualEvidencePath(
                        "F-SEARCH-DOWNLOADS",
                        "keyboard-focus-downloader-select-desktop",
                    ),
                );

                const saveSearch = await probeFocus(
                    page,
                    page.locator("#save-search"),
                );
                expectAuthoredFocusRing(
                    "save-search button",
                    saveSearch,
                    OUTSET_OFFSET,
                );
                await captureFocusedControl(
                    page,
                    page.locator("#save-search"),
                    visualEvidencePath(
                        "F-SEARCH-SAVED",
                        "keyboard-focus-save-search-desktop",
                    ),
                );
            }
        }
    });

    // FM-184: `Tab` is the one family whose *offset* MUI states differently
    // from every other inset family (`applyInsetFocusVisible(3)`, not `(1)`),
    // so it is asserted at `-9px` while the measured reason it insets at all
    // -- the scroller clipping an outset ring -- is re-proven unchanged below.
    // FM-184 (ADR-0056): the two families MUI 9.4 rings on a node this
    // application had no gate for at all. Neither existed as a probe under the
    // authored mechanism -- the `Switch` because FM-053's rule sat on the root
    // it shared with `Checkbox`/`Radio`, the `Autocomplete` option because no
    // authored rule ever named it -- and both are now MUI's own decision about
    // *where* the ring lands, which only a real browser can show.
    test("should render the ring on the Switch track and on a keyboard-highlighted Autocomplete option", async ({
        page,
    }) => {
        await page.setViewportSize(visualViewports.desktop);
        await page.goto("/config/main");
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-main")).toBeVisible();

        // `Switch/Switch.js` rings `&.Mui-focusVisible ~ .MuiSwitch-track`,
        // not the root and not the thumb: the root is a `SwitchBase`, whose
        // focusable node is the same `opacity: 0` overlay the `Checkbox`
        // family has. The keyboard walk therefore targets the root (the only
        // node containing that input) and the measurement is taken on the
        // track. `SwitchRoot` is `overflow: hidden` with a 12px pad around a
        // 34x14 track, so the 6px an outset ring reaches is not clipped --
        // asserted, not assumed, by `expectAuthoredFocusRing`.
        // `Switch.js` forwards `...other` -- and so this `data-testid` -- to
        // its `SwitchSwitchBase`, not to `SwitchRoot`, so the track is the
        // testid'd node's *sibling*. That is also why the keyboard walk below
        // targets the testid'd node: it is the one that contains the input.
        const advancedSwitchBase = page.getByTestId("config-advanced-toggle");
        await expect(advancedSwitchBase).toBeVisible();
        const track = advancedSwitchBase.locator(
            "xpath=following-sibling::span[contains(@class,'MuiSwitch-track')]",
        );
        const switchProbe = await probeFocus(page, track, {
            reach: async () => {
                await tabTo(page, advancedSwitchBase);
            },
        });
        expectAuthoredFocusRing(
            'config "Advanced settings" Switch (track)',
            switchProbe,
            OUTSET_OFFSET,
        );
        expect(
            await advancedSwitchBase
                .locator("input")
                .evaluate((element) => getComputedStyle(element).opacity),
            "config advanced Switch: MUI's native input overlay is still transparent",
        ).toBe("0");
        await captureFocusedControl(
            page,
            advancedSwitchBase.locator(
                "xpath=ancestor::span[contains(@class,'MuiSwitch-root')][1]",
            ),
            "visual-evidence/FM-184/keyboard-focus-config-advanced-switch-desktop.png",
        );

        // `Autocomplete/Autocomplete.js` rings its option with
        // `applyInsetFocusVisible(1)`, because the listbox scrolls and would
        // clip an outset ring. The class it is keyed to is added by
        // `useAutocomplete.js` only when the highlight moved for
        // `reason === "keyboard"`, so this is reachable *only* by a real
        // ArrowDown -- `autoHighlight` marks the first option `Mui-focused`
        // without marking it focus-visible, which is why the second option is
        // the one with a genuine unfocused baseline inside the open listbox.
        const settingsSearch = page.getByTestId("config-search");
        await tabTo(page, settingsSearch);
        await page.keyboard.type("port");
        const options = page.locator(".MuiAutocomplete-option");
        await expect(options.nth(1)).toBeVisible();
        const secondOption = options.nth(1);
        const optionProbe = await probeFocus(page, secondOption, {
            reach: async () => {
                for (let press = 0; press < 12; press++) {
                    await page.keyboard.press("ArrowDown");
                    if (
                        await secondOption.evaluate((element) =>
                            element.classList.contains("Mui-focusVisible"),
                        )
                    ) {
                        return;
                    }
                }
                throw new Error(
                    "ArrowDown never keyboard-highlighted the second settings-search option",
                );
            },
        });
        expectAuthoredFocusRing(
            "config settings-search Autocomplete option",
            optionProbe,
            INSET_OFFSET,
        );
        await captureFocusedControl(
            page,
            secondOption,
            "visual-evidence/FM-184/keyboard-focus-settings-search-option-desktop.png",
        );
    });

    test("should render the ring on the Tab family inset by three offsets, because an outset ring is clipped by the Tabs scroller", async ({
        page,
    }) => {
        for (const viewport of ["desktop", "mobile"] as const) {
            await page.setViewportSize(visualViewports[viewport]);
            await page.goto("/stats/indexers");
            await expect(page.getByRole("tab").first()).toBeVisible();
            const tab = await probeFocus(page, page.getByRole("tab").first());
            expectAuthoredFocusRing(
                `stats Tab (${viewport})`,
                tab,
                TAB_INSET_OFFSET,
            );
            // The measured reason the Tab family is shaped differently: the
            // scroller's own box is exactly the tab's height, so a 3px ring at
            // a 3px outset offset falls outside it.
            const scrollerClipsOutset = await page
                .getByRole("tab")
                .first()
                .evaluate((element) => {
                    const scroller = element.closest(".MuiTabs-scroller");
                    if (!scroller) {
                        return null;
                    }
                    const overflow = getComputedStyle(scroller);
                    const bounds = scroller.getBoundingClientRect();
                    const rect = element.getBoundingClientRect();
                    return {
                        overflowVisible:
                            overflow.overflowX === "visible" &&
                            overflow.overflowY === "visible",
                        outsetWouldClip:
                            rect.top - 6 < bounds.top - 0.01 ||
                            rect.bottom + 6 > bounds.bottom + 0.01,
                    };
                });
            expect(
                scrollerClipsOutset,
                `stats Tab (${viewport}): the Tabs scroller must still exist`,
            ).not.toBeNull();
            expect(
                scrollerClipsOutset?.overflowVisible,
                `stats Tab (${viewport}): the Tabs scroller still clips its children`,
            ).toBe(false);
            expect(
                scrollerClipsOutset?.outsetWouldClip,
                `stats Tab (${viewport}): an outset ring would still be clipped, which is why this family is inset`,
            ).toBe(true);
            if (viewport === "desktop") {
                // Task-scoped evidence for `F-STATS-SHELL` (which owns the tab
                // strip) and `F-STATS-INDEXERS` (the route it opens). Both are
                // `visual.status: unassessed` with no contract at all, so this
                // capture is deliberately NOT a registry-cited snapshot --
                // authoring their first visual contract is their own
                // visual-parity assessment, not focus work.
                await page.locator(".MuiTabs-root").first().screenshot({
                    path: "visual-evidence/FM-053/keyboard-focus-stats-tab-desktop.png",
                });
            }
        }
    });

    test("should render the authored ring on the search-history route's un-overridden OutlinedInput and default-padding Checkbox", async ({
        hydra,
        page,
    }) => {
        // `F-HISTORY-SEARCHES` owns the application's only un-overridden
        // `OutlinedInput` rendering (no `sx` at all) and its only
        // default-padding `Checkbox`; FM-052 measured both at
        // `meets 2.4.7, fails 2.4.11`. The record is `visual.status:
        // unassessed`, so this produces evidence rather than a snapshot a
        // contract cites.
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).keepHistory = true;
        await hydra.saveConfig(config);
        await page.setViewportSize(visualViewports.desktop);
        await page.goto("/stats/searches");
        await expect(page.getByTestId("search-history-table")).toBeVisible();

        // Scoped through the refine bar: FM-170's per-row "Copy query"
        // buttons also match `getByLabel("Query")` (substring matching), and
        // `.first()` only ever found the refine input because the bar
        // precedes the table in DOM order.
        await expectFocusedOutlinedInput(
            page,
            page
                .getByTestId("history-refine-bar")
                .getByLabel("Query")
                .locator(inputRoot),
            "stats-history-text-input",
        );

        // The same `svg:first-of-type` node as the select-all probe above, on
        // the application's only default-padding `Checkbox`: its root box is
        // MUI's 42x42 rather than a 17x17 square, so this proves the ring
        // follows the icon and not the padded root.
        const historyCheckbox = page.locator(".MuiCheckbox-root").first();
        const checkbox = await probeCheckboxRing(page, historyCheckbox);
        expectAuthoredFocusRing(
            "stats-history-checkbox (default padding)",
            checkbox,
            OUTSET_OFFSET,
        );
        expect(
            checkbox.rootOpacity,
            "stats-history-checkbox: the indicator must paint on a non-transparent node",
        ).toBe("1");
        expect(
            await historyCheckbox
                .locator("input")
                .evaluate((element) => getComputedStyle(element).opacity),
            "stats-history-checkbox: MUI's native input overlay is still transparent",
        ).toBe("0");

        const refresh = await probeFocus(
            page,
            page.getByTestId("search-history-refresh"),
        );
        expectAuthoredFocusRing(
            "search-history-refresh",
            refresh,
            OUTSET_OFFSET,
        );
        await captureFocusedControl(
            page,
            page.getByTestId("search-history-refresh"),
            "visual-evidence/FM-053/keyboard-focus-search-history-refresh-desktop.png",
        );
    });

    test("should render the authored ring on the anchor family, including the sanitized third-party anchor the app does not classify", async ({
        page,
        hydra,
    }) => {
        // FM-052 measured this bare `<a href>` at 1.29:1, failing only because
        // the global rule's `currentColor` there is the UA default link blue.
        // The reconciled rule paints the authored token's explicit colour, so
        // the family no longer depends on `currentColor` at all.
        await page.route("**/internalapi/news**", async (route) => {
            await route.fulfill({
                contentType: "application/json",
                body: JSON.stringify([
                    {
                        version: "9.9.9",
                        forCurrentVersion: true,
                        forNewerVersion: false,
                        news: '<ul><li>See <a href="https://example.invalid/fm053">the FM-053 anchor</a> for details</li></ul>',
                    },
                ]),
            });
        });
        // The startup sequence only offers news to a session whose safe
        // configuration has `main.showNews` (startupCheckRunner.ts:130-137), and
        // that is a `BaseConfig` setting on a shared instance rather than
        // anything this test controls. Run 33240679544 found it `false` and the
        // dialog never appeared, so the assertion below failed on a
        // precondition instead of on the ring it exists to measure. Established
        // here rather than inherited; the `hydra` fixture restores it in
        // teardown.
        const config = await hydra.getConfig();
        (config.main as Record<string, unknown>).showNews = true;
        await hydra.saveConfig(config);

        await page.setViewportSize(visualViewports.desktop);
        await page.goto("/system/news");
        // FM-079's startup `NewsDialog` renders the same server-authored HTML
        // from the same mocked payload, and it does two things to this test:
        // its copy of the anchor makes an unscoped locator resolve to two
        // elements, and being modal it traps focus so Tab can never reach the
        // page's own anchor. Dismissing it fixes both; scoping alone fixed
        // only the first. The dialog is portalled outside `system-shell`, so
        // the scope below then selects the page's anchor unambiguously.
        // Awaited, not polled once with `isVisible()`: the dialog is raised by
        // the startup checks, which resolve after `goto` returns, so a single
        // synchronous check races them and usually loses.  It is deterministic
        // here -- the route above mocks a `forCurrentVersion` entry and each
        // test gets a fresh session -- so it is asserted rather than guarded.
        const newsDialog = page.getByTestId("news-dialog");
        await expect(newsDialog).toBeVisible();
        await newsDialog
            .getByRole("button", {name: "Close", exact: true})
            .click();
        await expect(newsDialog).toBeHidden();
        const anchor = page
            .getByTestId("system-shell")
            .locator("a[href='https://example.invalid/fm053']");
        await expect(anchor).toBeVisible();
        const probe = await probeFocus(page, anchor);
        expectAuthoredFocusRing("news-page bare anchor", probe, OUTSET_OFFSET);
        // What this pins is that the anchor's own `currentColor` is still the
        // *user-agent default* link colour and nothing this application
        // authored -- which is what makes the ring measured above authored
        // rather than inherited. Chromium resolves that default through
        // `-internal-light-dark(#0000EE, #9E9EFF)`, so the member it picks
        // follows the document's `color-scheme`, which `e541f7a46` (the
        // 2026-09-04 `CssBaseline enableColorScheme` quickfix, made and
        // verified on 7.3.9) ties to the palette mode: dark on grey, light on
        // bright. Read from the document instead of hardcoding the light
        // member, so the claim survives a theme change and stays a statement
        // about the UA default rather than about one palette.
        const documentColorScheme = await page.evaluate(
            () => getComputedStyle(document.documentElement).colorScheme,
        );
        expect(
            probe.unfocusedOutline.color,
            "the anchor's own currentColor is still the UA link blue for the document's colour scheme, so the ring's colour is authored rather than inherited",
        ).toBe(
            documentColorScheme === "dark"
                ? "rgb(158, 158, 255)"
                : "rgb(0, 0, 238)",
        );
        await captureFocusedControl(
            page,
            anchor,
            "visual-evidence/FM-053/keyboard-focus-news-anchor-desktop.png",
        );
    });

    test("should keep the passing MUI Link family rendering the authored ring, and prove the color=error Button family renders it too", async ({
        page,
    }) => {
        // Mechanism 7 in FM-052's inventory -- `stats-identifier-link`, the one
        // class that already met both WCAG criteria (7.34:1, 912.00 px2). The
        // reconciled global rule must not regress it, and the `MuiLink` entry
        // must render the same literal token.
        await mockSearchResponse(page);
        await page.setViewportSize(visualViewports.desktop);
        await page.goto("/");
        await dismissWelcomeDialog(page);
        await page.goto(
            "/?query=fm053+focus+link&category=All&imdbId=tt0111161",
        );
        await expect(page.getByTestId("search-query")).toBeVisible();
        const saved = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/savedsearches",
        );
        await page.getByTestId("search-submit").click();
        await expect(page.getByTestId("search-results")).toBeVisible();
        await page.locator("#save-search").click();
        expect((await saved).status()).toBe(200);

        await page.goto("/stats/saved-searches");
        await expect(
            page.getByRole("heading", {name: "Saved searches"}),
        ).toBeVisible();

        const link = await probeFocus(
            page,
            page.locator("a.MuiLink-root").first(),
        );
        expectAuthoredFocusRing("stats-identifier-link", link, OUTSET_OFFSET);

        // FM-052's floor for the ripple family, and the one figure in that
        // audit attested by direct re-measurement without an independent
        // review pass. Re-measured here rather than inherited, at both of its
        // sites.
        const rowDelete = await probeFocus(
            page,
            page.getByRole("button", {name: "Delete"}).first(),
        );
        expectAuthoredFocusRing(
            "saved-search-delete-button (table row, color=error)",
            rowDelete,
            OUTSET_OFFSET,
        );
        await page.locator("body").screenshot({
            path: "visual-evidence/FM-053/keyboard-focus-saved-search-delete-desktop.png",
        });

        await page.getByRole("button", {name: "Delete"}).first().click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const dialogDelete = await probeFocus(
            page,
            dialog.getByRole("button", {name: "Delete"}),
        );
        expectAuthoredFocusRing(
            "saved-search-delete-button (Dialog, color=error)",
            dialogDelete,
            OUTSET_OFFSET,
        );
    });

    test("should leave the accepted F-SEARCH-PAGING geometry checks literally true while a continuation control is focused", async ({
        page,
    }) => {
        // `F-SEARCH-PAGING` is the file's only `visual.status: accepted`
        // record. Its accepted contract asserts that the load-more/load-all
        // controls render immediately above the results toolbar and introduce
        // no page-level horizontal overflow at either viewport. This test is
        // the evidence that the authored indicator falsifies neither, which is
        // why FM-053 changes nothing on that record's `visual` block.
        await page.route("**/internalapi/search", async (route) => {
            const request = route.request().postDataJSON() as Record<
                string,
                unknown
            >;
            const offset =
                typeof request.offset === "number" ? request.offset : 0;
            const loadAll = request.loadAll === true;
            const result = (id: string) => ({
                searchResultId: id,
                title: `Paged focus fixture ${id}`,
                indexer: "Mock1",
                category: "All",
            });
            await route.fulfill({
                json: {
                    searchResults: loadAll
                        ? [result("one"), result("two"), result("three")]
                        : offset === 0
                          ? [result("one")]
                          : [result("one"), result("two")],
                    indexerSearchMetaDatas: [
                        {
                            indexerName: "Mock1",
                            wasSuccessful: true,
                            hasMoreResults: loadAll ? true : offset < 1,
                            totalResultsKnown: true,
                        },
                    ],
                    indexerLimitWarnings: [],
                    rejectedReasonsMap: {},
                    notPickedIndexersWithReason: {},
                    numberOfAvailableResults: 3,
                    numberOfRejectedResults: 0,
                    numberOfProcessedResults: loadAll ? 3 : offset + 1,
                    numberOfAcceptedResults: loadAll ? 3 : offset + 1,
                    offset: loadAll ? 0 : offset,
                    limit: loadAll ? 0 : 1,
                },
            });
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await openSearchRoute(page, viewport);
            await page.getByTestId("search-query").fill("paged focus fixture");
            await page.getByTestId("search-submit").click();
            const loadMore = page.getByRole("button", {name: "Load more"});
            await expect(loadMore).toBeVisible();

            const probe = await probeFocus(page, loadMore);
            expectAuthoredFocusRing(
                `paging load-more (${viewport})`,
                probe,
                OUTSET_OFFSET,
            );

            // FM-055: the paging controls moved from their own row above the
            // toolbar into the toolbar's first row, so the placement contract
            // is containment rather than "above". FM-181: which region
            // contains them is viewport-dependent -- below 768px they sit in
            // `results-paging-footer` under the last card instead, because a
            // 390px sticky bar cannot afford a permanent line for a control
            // that only matters once the reader reaches the end of the list.
            const placementContainer =
                viewport === "mobile"
                    ? "results-paging-footer"
                    : "results-toolbar";
            const placement = await page.evaluate((containerTestId) => {
                const container = document.querySelector(
                    `[data-testid='${containerTestId}']`,
                );
                const button = document.querySelector(
                    "[data-testid='results-load-more']",
                );
                return {
                    insideContainer:
                        container && button ? container.contains(button) : null,
                    pageOverflow:
                        document.documentElement.scrollWidth >
                        document.documentElement.clientWidth,
                };
            }, placementContainer);
            expect(
                placement.insideContainer,
                `paging controls render inside ${placementContainer} (${viewport})`,
            ).toBe(true);
            expect(
                placement.pageOverflow,
                `no page-level horizontal overflow while a paging control is focused (${viewport})`,
            ).toBe(false);
            // Recorded under the task-scoped directory, never as a snapshot
            // this record's accepted contract cites: FM-053 adds no state to an
            // accepted contract and does not re-date its 2026-08-16 acceptance.
            await captureFocusedControl(
                page,
                loadMore,
                `visual-evidence/FM-053/keyboard-focus-paging-load-more-${viewport}.png`,
            );
        }
    });
});
