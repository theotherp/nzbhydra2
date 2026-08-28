import {firefox, type Locator, type Page} from "@playwright/test";
import {existsSync} from "node:fs";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

/**
 * FM-117 / ADR-0035 / ADR-0036 — the config control treatment, measured in a
 * real browser.
 *
 * Everything here exists because a jsdom component test cannot see it. jsdom
 * performs no layout, so a chips field that is clipped and one that grew both
 * report a height of zero; it resolves no `rgba()` against the surface behind
 * it, so a border that is invisible and one that is legible are the same
 * string; and it has no `::-webkit-inner-spin-button` and no Firefox. The
 * theme unit tests in `core/ui-react/src/app/theme.test.ts` pin what the theme
 * *says*. This file is where what the browser *does* is measured.
 */

/** Ten words, long enough that they cannot share one row at any config width. */
const WRAPPING_WORDS = [
    "german",
    "subbed",
    "dubbed",
    "remastered",
    "extended",
    "unrated",
    "screener",
    "telesync",
    "workprint",
    "multisubs",
];

/**
 * Searching's "Map user agents" -- the wide chips call site the FM-117 packet
 * names, and one whose row is rendered unconditionally rather than behind
 * another setting's value. It sits in an advanced fieldset, so the tests below
 * turn the advanced toggle on rather than picking a narrower field: the defect
 * is about a wide field whose chips wrap.
 */
const CHIPS_SETTING = "searching-userAgents";

/** A single-line text field in the same fieldset, as the clamp's control case. */
const SINGLE_LINE_SETTING = "searching-userAgent";

/** The one control height the theme states for a single-line input. */
const CONTROL_HEIGHT = 32;

type Rgba = {a: number; b: number; g: number; r: number};

/** A browser's computed `rgb()`/`rgba()` string. */
function parseComputedColor(value: string): Rgba {
    const parts = value.match(/[\d.]+/g);
    if (parts === null || parts.length < 3) {
        throw new Error(`Not a computed colour: ${value}`);
    }
    return {
        a: parts.length > 3 ? Number(parts[3]) : 1,
        b: Number(parts[2]),
        g: Number(parts[1]),
        r: Number(parts[0]),
    };
}

function compositeOver(front: Rgba, ground: Rgba): Rgba {
    const blend = (top: number, bottom: number) =>
        front.a * top + (1 - front.a) * bottom;
    return {
        a: 1,
        b: blend(front.b, ground.b),
        g: blend(front.g, ground.g),
        r: blend(front.r, ground.r),
    };
}

function relativeLuminance({b, g, r}: Rgba): number {
    const toLinear = (channel: number) => {
        const scaled = channel / 255;
        return scaled <= 0.04045
            ? scaled / 12.92
            : ((scaled + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(one: Rgba, other: Rgba): number {
    const [high, low] = [relativeLuminance(one), relativeLuminance(other)].sort(
        (a, b) => b - a,
    );
    return (high + 0.05) / (low + 0.05);
}

/**
 * A computed colour resolved to the sRGB pixel the browser actually paints.
 *
 * Needed because this palette is authored in `oklch()` and Chromium's
 * `getComputedStyle` hands `oklch(0.7 0.14 24.3)` straight back: reading the
 * first three numbers out of that string as if they were RGB channels yields a
 * ratio that is arithmetic on nothing. Painting one pixel and reading it back
 * is the browser's own conversion, and it is the colour a user sees.
 */
function paintedColor(locator: Locator, property: string): Promise<Rgba> {
    return locator.evaluate((element, name) => {
        const value = window.getComputedStyle(element).getPropertyValue(name);
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const context = canvas.getContext("2d");
        if (context === null) {
            throw new Error("no 2d canvas context");
        }
        // An unparseable value leaves `fillStyle` untouched, which would
        // silently measure black; compare against a sentinel to catch that.
        context.fillStyle = "#123456";
        context.fillStyle = value;
        if (context.fillStyle === "#123456") {
            throw new Error(`Browser could not parse the colour: ${value}`);
        }
        context.fillRect(0, 0, 1, 1);
        const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data;
        return {a: a / 255, b, g, r};
    }, property);
}

function computedStyle(locator: Locator, property: string): Promise<string> {
    return locator.evaluate(
        (element, name) =>
            window.getComputedStyle(element).getPropertyValue(name),
        property,
    );
}

async function openConfig(page: Page, path: string, ready: string) {
    await page.goto(`/config/${path}`);
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId(ready)).toBeVisible();
}

/**
 * The advanced toggle is a per-browser `localStorage` preference the `page`
 * fixture clears on every document load, so it is switched on per navigation.
 * Below `md` it lives at the foot of the nav `Drawer` and is only mounted while
 * that drawer is open.
 */
async function showAdvanced(page: Page): Promise<void> {
    const navOpen = page.getByTestId("config-nav-open");
    const inDrawer = await navOpen.isVisible();
    if (inDrawer) {
        await navOpen.click();
        await expect(page.getByTestId("config-nav")).toBeVisible();
    }
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(true);
    await expect(toggle).toBeChecked();
    if (inDrawer) {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("config-nav")).toBeHidden();
    }
}

/**
 * The boundary a raised, borderless `Paper` had before FM-117 flattened
 * `MuiPaper`: an elevation-1 surface (MUI's `getOverlayAlpha(1)`, white at
 * ~0.0512 over `background.paper`, i.e. `#313739`) against the
 * `background.default` `#1f2426` a config tab body used to be. Measured
 * 1.294:1. Whatever replaces it has to be at least that, so the floor is the
 * base build's own number rather than one chosen to fit the answer.
 */
const BASE_RAISED_BOUNDARY = 1.294;

const NOTIFICATION_ENTRIES = "notificationConfig-entries";

/** The outlined box a setting's control is painted in. */
function fieldRoot(page: Page, setting: string): Locator {
    return page
        .getByTestId(`config-setting-${setting}`)
        .locator(".MuiOutlinedInput-root")
        .first();
}

/**
 * A floating `Paper` must be distinguishable from the surface it opens over.
 * Both halves are asserted: the fill against the ground, and the composited
 * border edge against the same ground -- and the wash is asserted absent, so a
 * boundary can never come back from the elevation gradient ADR-0036's ground
 * resolution removed.
 */
async function assertListboxSeparated(
    listbox: Locator,
    ground: Rgba,
    where: string,
): Promise<void> {
    const fill = parseComputedColor(
        await computedStyle(listbox, "background-color"),
    );
    const edge = parseComputedColor(
        await computedStyle(listbox, "border-top-color"),
    );

    expect
        .soft(
            await computedStyle(listbox, "background-image"),
            `the listbox over the ${where} must paint no elevation wash`,
        )
        .toBe("none");
    // Measured over a config surface: fill 1.070:1, edge 1.465:1.
    expect
        .soft(
            contrastRatio(fill, ground),
            `the listbox must not be co-planar with the ${where}`,
        )
        .toBeGreaterThan(1);
    expect
        .soft(
            contrastRatio(compositeOver(edge, fill), ground),
            `the listbox border over the ${where} must be at least the boundary the base build had`,
        )
        .toBeGreaterThanOrEqual(BASE_RAISED_BOUNDARY);
}

/** Opens the indexer edit dialog for the indexer with this name. */
async function openIndexerEditor(page: Page, name: string): Promise<void> {
    await page
        .locator('[data-testid^="config-indexer-edit-"]')
        .filter({hasText: name})
        .first()
        .click();
    await expect(page.getByTestId("config-indexer-dialog")).toBeVisible();
}

/**
 * Opens the "Indexer groups" chips suggestion list. A `freeSolo` Autocomplete
 * does not open its popup on focus -- MUI opens it on input -- so a filtering
 * keystroke is what makes the list appear, not the click.
 */
async function openGroupSuggestions(page: Page): Promise<void> {
    const field = page.getByTestId("config-input-indexerDraft-groupNames");
    await field.click();
    await field.fill("A");
    await expect(page.getByRole("option", {name: "Alpha"})).toBeVisible();
}

async function boxOf(locator: Locator) {
    const box = await locator.boundingBox();
    expect(box, "the measured element must have a bounding box").not.toBeNull();
    if (box === null) {
        throw new Error("no bounding box");
    }
    return box;
}

test.describe("Config control treatment (FM-117)", () => {
    test("should grow a chips field to show every wrapped row while single-line inputs keep the 32px box", async ({
        page,
    }) => {
        await openConfig(page, "searching", "config-searching");
        await showAdvanced(page);

        const root = fieldRoot(page, CHIPS_SETTING);
        const chips = page
            .getByTestId(`config-setting-${CHIPS_SETTING}`)
            .locator(".MuiChip-root");
        // "Map user agents" ships populated in the default configuration, so
        // this field is already the reported defect at rest. The words below
        // are added on top so the test does not depend on how many entries a
        // future default happens to carry.
        const before = await chips.count();
        expect(
            before,
            "the shipped default must already put chips in this field",
        ).toBeGreaterThan(0);

        const input = page.getByTestId(`config-input-${CHIPS_SETTING}`);
        for (const word of WRAPPING_WORDS) {
            await input.fill(word);
            await input.press("Enter");
        }
        await expect(chips).toHaveCount(before + WRAPPING_WORDS.length);

        const rootBox = await boxOf(root);
        const chipBoxes = await Promise.all(
            (await chips.all()).map((chip) => boxOf(chip)),
        );

        // The premise: the chips really do wrap. A single-row field would make
        // every assertion below pass without proving anything -- the exact
        // "green either way" shape this file exists to avoid.
        const rows = new Set(chipBoxes.map((box) => Math.round(box.y)));
        expect(
            rows.size,
            "the chips must wrap onto more than one row for this to be a test of wrapping",
        ).toBeGreaterThan(1);

        // The defect: before FM-117, `MuiInputBase`'s `height: 32px` clamp
        // applied to the Autocomplete root too, so every row after the first
        // was painted outside the field's own border.
        expect
            .soft(
                rootBox.height,
                "the field must grow past one control height once its chips wrap",
            )
            .toBeGreaterThan(CONTROL_HEIGHT);
        for (const [index, chipBox] of chipBoxes.entries()) {
            expect
                .soft(
                    chipBox.y + chipBox.height,
                    `chip ${index} must sit inside the field`,
                )
                .toBeLessThanOrEqual(rootBox.y + rootBox.height + 0.5);
            expect.soft(chipBox.y).toBeGreaterThanOrEqual(rootBox.y - 0.5);
        }
        // And the other half of the acceptance: the clamp itself is intact, so
        // an ordinary single-line field on the same page is untouched.
        const singleLine = fieldRoot(page, SINGLE_LINE_SETTING);
        expect((await boxOf(singleLine)).height).toBeCloseTo(CONTROL_HEIGHT, 0);
    });

    test("should suppress the native number spinner in Chromium while keyboard stepping still works", async ({
        page,
    }) => {
        await openConfig(page, "main", "config-main");

        const port = page.getByTestId("config-input-main-port");
        await expect(port).toHaveAttribute("type", "number");
        expect(await computedStyle(port, "appearance")).toBe("textfield");

        // Chromium's arrows are the `::-webkit-*-spin-button` pseudo-elements,
        // and they cannot be asserted through the DOM: `getComputedStyle` on
        // that pseudo-element reports the *host input's* own box and
        // `appearance` (measured -- an input with the theme's rules and one
        // without both report `-webkit-appearance: <the input's own value>`
        // and a width equal to the input's). So the assertion is on the
        // rendered pixels instead: the arrows are painted while the pointer is
        // over the field, and putting the browser default back must therefore
        // change what the field looks like. If the theme's rules were doing
        // nothing, these two captures would be identical -- which is exactly
        // how this reads on a build without them.
        await port.hover();
        const suppressed = await port.screenshot();
        await page.addStyleTag({
            content:
                "input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button {-webkit-appearance: auto !important;}",
        });
        await port.hover();
        const withArrows = await port.screenshot();
        expect(
            Buffer.compare(suppressed, withArrows),
            "restoring the browser's own spin buttons must visibly change the field",
        ).not.toBe(0);

        // Removing the arrows must not remove the control. Up/Down stepping is
        // a property of `type="number"` itself and has to survive.
        await port.fill("5076");
        await port.press("ArrowUp");
        await expect(port).toHaveValue("5077");
        await port.press("ArrowDown");
        await expect(port).toHaveValue("5076");
    });

    test("should suppress the native number spinner in Firefox, which is the reported browser", async () => {
        // Launched here rather than added as a Playwright project: this is the
        // one assertion in the suite whose *browser* is the subject, and the
        // remaining specs have no reason to run twice.
        // Playwright's own bundled build; `misc/run_gui_systemtest.py`
        // installs only Chromium, so this states plainly when the browser it
        // needs is absent rather than passing without having run.
        test.skip(
            !existsSync(firefox.executablePath()),
            `Firefox is not installed for this Playwright version (expected ${firefox.executablePath()}); run "npx playwright install firefox"`,
        );
        const browser = await firefox.launch();
        try {
            const context = await browser.newContext({
                baseURL: testEnvironment.playwrightBaseUrl,
            });
            const page = await context.newPage();
            await openConfig(page, "main", "config-main");

            const port = page.getByTestId("config-input-main-port");
            await expect(port).toHaveAttribute("type", "number");
            // `appearance: textfield` (authored with the `-moz-` prefix beside
            // it) is what Firefox honours; the webkit pseudo-element rules do
            // nothing here.
            expect(await computedStyle(port, "appearance")).toBe("textfield");
            expect(await computedStyle(port, "-moz-appearance")).toBe(
                "textfield",
            );

            await port.fill("5076");
            await port.press("ArrowUp");
            await expect(port).toHaveValue("5077");

            await page.setViewportSize({width: 1280, height: 800});
            await page.getByTestId("config-setting-main-port").screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    "control-treatment-number-field-firefox",
                ),
            });
            await context.close();
        } finally {
            await browser.close();
        }
    });

    test("should render one readable outline on one ground, in a config tab and a dialog in the same pass", async ({
        hydra,
        page,
    }) => {
        // ADR-0036 requires both surfaces proven together: a fix shown on one
        // of them is the failure the ADR was written to correct.
        const config = (await hydra.getConfig()) as Record<string, unknown>;
        await hydra.saveConfig({
            ...config,
            indexers: [
                {
                    name: "Outline Probe",
                    host: testEnvironment.mockserverInternalUrl,
                    apiPath: "/api",
                    apiKey: "1",
                    backend: "NEWZNAB",
                    allCapsChecked: true,
                    enabled: true,
                    searchModuleType: "NEWZNAB",
                    state: "ENABLED",
                    supportedSearchIds: ["IMDB"],
                    supportedSearchTypes: ["SEARCH"],
                },
            ],
        });

        await openConfig(page, "main", "config-main");
        const tabBody = page.getByTestId("config-tab-body");
        const tabGround = parseComputedColor(
            await computedStyle(tabBody, "background-color"),
        );
        const tabWash = await computedStyle(tabBody, "background-image");
        const tabOutline = parseComputedColor(
            await computedStyle(
                fieldRoot(page, "main-host").locator(
                    ".MuiOutlinedInput-notchedOutline",
                ),
                "border-color",
            ),
        );

        await openConfig(page, "indexers", "config-indexers");
        await page.getByTestId("config-indexer-edit-0").click();
        const dialog = page.getByTestId("config-indexer-dialog");
        await expect(dialog).toBeVisible();
        const dialogPaper = dialog.locator(".MuiDialog-paper").first();
        const dialogGround = parseComputedColor(
            await computedStyle(dialogPaper, "background-color"),
        );
        const dialogWash = await computedStyle(dialogPaper, "background-image");
        const dialogOutline = parseComputedColor(
            await computedStyle(
                dialog.locator(".MuiOutlinedInput-notchedOutline").first(),
                "border-color",
            ),
        );

        // One ground, and the `background-image` half is not incidental: MUI
        // paints its dark-mode elevation wash as a `linear-gradient`
        // *background image* over `background.paper`, so the two surfaces'
        // `background-color` was already identical while what they actually
        // rendered was not (the dialog's `elevation={24}` wash is white at
        // 0.165, the tab body's `elevation={1}` wash far weaker). Comparing
        // the colour alone would have been green before this change and after
        // it -- the "green either way" shape. What proves one ground is that
        // neither surface paints a wash at all.
        expect
            .soft(tabWash, "the config tab body must paint no elevation wash")
            .toBe("none");
        expect
            .soft(dialogWash, "the dialog must paint no elevation wash")
            .toBe("none");
        expect.soft(dialogGround).toEqual(tabGround);
        // One border: the same token in both places, and legible on both.
        expect.soft(dialogOutline).toEqual(tabOutline);
        for (const [where, ground] of [
            ["config tab", tabGround],
            ["dialog", dialogGround],
        ] as const) {
            const edge = compositeOver(tabOutline, ground);
            expect
                .soft(
                    contrastRatio(edge, ground),
                    `the field outline must be visible on the ${where} ground`,
                )
                .toBeGreaterThanOrEqual(3);
        }

        // ADR-0035's Delete button, on the surface it was reported on. The
        // token is a foreground here, so the ratio is against the dialog's own
        // ground.
        const deleteButton = page.getByTestId("config-indexer-dialog-delete");
        await expect(deleteButton).toBeVisible();
        const deleteColor = await paintedColor(deleteButton, "color");
        expect
            .soft(
                contrastRatio(deleteColor, dialogGround),
                "the text-variant error Delete label must clear WCAG 1.4.3",
            )
            .toBeGreaterThanOrEqual(4.5);
    });

    test("should capture the control-treatment screenshot strip", async ({
        hydra,
        page,
    }) => {
        const config = (await hydra.getConfig()) as Record<string, unknown>;
        await hydra.saveConfig({
            ...config,
            indexers: [
                {
                    name: "Outline Probe",
                    host: testEnvironment.mockserverInternalUrl,
                    apiPath: "/api",
                    apiKey: "1",
                    backend: "NEWZNAB",
                    allCapsChecked: true,
                    enabled: true,
                    searchModuleType: "NEWZNAB",
                    state: "ENABLED",
                    supportedSearchIds: ["IMDB"],
                    supportedSearchTypes: ["SEARCH"],
                },
            ],
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "searching", "config-searching");
                await showAdvanced(page);
            });
            const input = page.getByTestId(`config-input-${CHIPS_SETTING}`);
            for (const word of WRAPPING_WORDS) {
                await input.fill(word);
                await input.press("Enter");
            }
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-chips-${viewport}`,
                ),
                fullPage: true,
            });

            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "main", "config-main");
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-config-tab-${viewport}`,
                ),
                fullPage: true,
            });

            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "indexers", "config-indexers");
            });
            await page.getByTestId("config-indexer-edit-0").click();
            await expect(
                page.getByTestId("config-indexer-dialog"),
            ).toBeVisible();
            // Not `fullPage`: the dialog is fixed to the viewport.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-dialog-${viewport}`,
                ),
            });
        }
    });
});

/**
 * The FM-117 correction. `MuiPaper`'s `backgroundImage: "none"` is what makes
 * ADR-0036's one ground true, and it is also what removed the only separation
 * a *borderless* raised `Paper` had from the surface under it. Two such
 * surfaces exist in this application and both are inside this feature: the
 * notification list's `Accordion` entries, and MUI's `AutocompletePaper`.
 *
 * Neither could be measured by the block above, and that is the point: the
 * flattening was justified on the field treatment and never checked against
 * the rest. Every assertion here therefore reads the rendered pixel and states
 * both halves -- what the surface achieves, and what the ground it sits on
 * would have been on its own.
 */
test.describe("Raised surfaces after the paper flattening (FM-117)", () => {
    test("should keep a notification entry card separated from the config surface it sits on", async ({
        page,
    }) => {
        await openConfig(page, "notifications", "config-notifications");
        // Indices are appended, so whatever the shipped default carries is
        // the offset the two entries added below land at.
        const first = await page
            .locator(
                `[data-testid^="config-repeat-entry-${NOTIFICATION_ENTRIES}-"]`,
            )
            .count();
        for (const eventType of ["RESULT_DOWNLOAD", "AUTH_FAILURE"]) {
            await page
                .getByTestId(`config-repeat-add-${NOTIFICATION_ENTRIES}`)
                .click();
            await page
                .getByTestId(
                    `config-repeat-add-option-${NOTIFICATION_ENTRIES}-${eventType}`,
                )
                .click();
        }
        // Collapsed, which is how the list is read: the reported loss is that
        // two collapsed entries stopped looking like two cards.
        for (const index of [first, first + 1]) {
            const summary = page.getByTestId(
                `config-repeat-toggle-${NOTIFICATION_ENTRIES}-${index}`,
            );
            await expect(summary).toBeVisible();
            if ((await summary.getAttribute("aria-expanded")) === "true") {
                await summary.click();
            }
            await expect(summary).toHaveAttribute("aria-expanded", "false");
        }

        const ground = parseComputedColor(
            await computedStyle(
                page.getByTestId("config-tab-body"),
                "background-color",
            ),
        );
        const cards = [first, first + 1].map((index) =>
            page.getByTestId(
                `config-repeat-entry-${NOTIFICATION_ENTRIES}-${index}`,
            ),
        );

        for (const [position, card] of cards.entries()) {
            const fill = parseComputedColor(
                await computedStyle(card, "background-color"),
            );
            const edge = parseComputedColor(
                await computedStyle(card, "border-top-color"),
            );

            // The separation must not be an elevation wash: that is exactly
            // what ADR-0036's ground resolution removed, and a card that got
            // its boundary back from a re-enabled wash would have reopened the
            // three-grounds problem instead of fixing anything.
            expect
                .soft(
                    await computedStyle(card, "background-image"),
                    `entry ${position} must paint no elevation wash`,
                )
                .toBe("none");
            // Measured: the raised `surfaces.control` fill is 1.070:1 against
            // the tab body, and the hairline edge composited over it is
            // 1.465:1 -- above the 1.294:1 the base build's card had.
            expect
                .soft(
                    contrastRatio(fill, ground),
                    `entry ${position} must not be co-planar with the tab body`,
                )
                .toBeGreaterThan(1);
            expect
                .soft(
                    contrastRatio(compositeOver(edge, fill), ground),
                    `entry ${position}'s border must be at least the boundary the base build had`,
                )
                .toBeGreaterThanOrEqual(BASE_RAISED_BOUNDARY);
        }

        // The premise, stated so none of the above can be green on a build
        // where the entries render as one flush block: they are discrete cards
        // with a gap, which is what a boundary on every side means.
        const boxes = await Promise.all(cards.map((card) => boxOf(card)));
        expect(
            boxes[1].y,
            "the second entry must be a separate card, not a row flush against the first",
        ).toBeGreaterThan(boxes[0].y + boxes[0].height);
    });

    test("should keep a suggestion listbox separated from the config surface it floats over", async ({
        hydra,
        page,
    }) => {
        // Both listboxes in one pass, on the same discipline ADR-0036 imposes
        // for the field treatment: the settings-search list over a config tab
        // body, and a chips list over a dialog. They are the same `Paper` slot
        // and would be the same defect on either surface.
        await openConfig(page, "main", "config-main");
        const tabGround = parseComputedColor(
            await computedStyle(
                page.getByTestId("config-tab-body"),
                "background-color",
            ),
        );
        await page.getByTestId("config-search").fill("port");
        const searchList = page.locator(".MuiAutocomplete-paper").first();
        await expect(searchList).toBeVisible();
        await assertListboxSeparated(searchList, tabGround, "config tab body");

        // The chips listbox. Exactly one `ChipsSetting` call site is passed
        // suggestions -- the indexer dialog's "Indexer groups", whose options
        // are the *other* indexers' group names -- so a second indexer
        // carrying groups is what makes a chips list openable at all, and the
        // dialog is where a chips listbox can be measured with options in it.
        // (The other call sites pass no suggestions, and giving the paper a
        // fill and a border risks painting an empty box where the stock
        // borderless one showed nothing. That is checked directly below
        // rather than assumed away -- it is the same class of unchecked
        // consequence this whole correction is about.)
        const config = (await hydra.getConfig()) as Record<string, unknown>;
        const indexer = {
            allCapsChecked: true,
            apiKey: "1",
            apiPath: "/api",
            backend: "NEWZNAB",
            enabled: true,
            host: testEnvironment.mockserverInternalUrl,
            searchModuleType: "NEWZNAB",
            state: "ENABLED",
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["SEARCH"],
        };
        await hydra.saveConfig({
            ...config,
            indexers: [
                {...indexer, name: "Outline Probe"},
                {
                    ...indexer,
                    groupNames: ["Alpha", "Beta"],
                    name: "Group Source",
                },
            ],
        });

        await openConfig(page, "searching", "config-searching");
        await showAdvanced(page);
        await page.getByTestId(`config-input-${CHIPS_SETTING}`).click();
        const emptyList = page.locator(".MuiAutocomplete-paper");
        expect(
            await emptyList.count(),
            "the option-less field must still mount the paper this checks",
        ).toBeGreaterThan(0);
        expect(
            await emptyList.first().boundingBox(),
            "a chips field with no suggestions must paint no empty bordered strip",
        ).toBeNull();

        await openConfig(page, "indexers", "config-indexers");
        await showAdvanced(page);
        // By name, not by row index: the row order the list renders is the
        // backend's, and editing the indexer that *owns* Alpha and Beta would
        // leave the suggestion list empty, since the options are the other
        // entries' groups.
        await openIndexerEditor(page, "Outline Probe");
        const dialog = page.getByTestId("config-indexer-dialog");
        await expect(dialog).toBeVisible();
        const dialogGround = parseComputedColor(
            await computedStyle(
                dialog.locator(".MuiDialog-paper").first(),
                "background-color",
            ),
        );
        await openGroupSuggestions(page);
        await assertListboxSeparated(
            page.locator(".MuiAutocomplete-paper").first(),
            dialogGround,
            "indexer dialog",
        );
    });

    test("should capture the raised-surface screenshot strip", async ({
        hydra,
        page,
    }) => {
        const config = (await hydra.getConfig()) as Record<string, unknown>;
        const indexer = {
            allCapsChecked: true,
            apiKey: "1",
            apiPath: "/api",
            backend: "NEWZNAB",
            enabled: true,
            host: testEnvironment.mockserverInternalUrl,
            searchModuleType: "NEWZNAB",
            state: "ENABLED",
            supportedSearchIds: ["IMDB"],
            supportedSearchTypes: ["SEARCH"],
        };
        await hydra.saveConfig({
            ...config,
            indexers: [
                {...indexer, name: "Outline Probe"},
                {
                    ...indexer,
                    groupNames: ["Alpha", "Beta"],
                    name: "Group Source",
                },
            ],
        });

        for (const viewport of ["desktop", "mobile"] as const) {
            // Two collapsed notification entries: the surface the base capture
            // `F-CONFIG-NOTIFICATIONS/notifications-two-entries-*` shows as
            // raised cards, which is what this pair is read against.
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "notifications", "config-notifications");
            });
            for (const eventType of ["RESULT_DOWNLOAD", "AUTH_FAILURE"]) {
                await page
                    .getByTestId(`config-repeat-add-${NOTIFICATION_ENTRIES}`)
                    .click();
                await page
                    .getByTestId(
                        `config-repeat-add-option-${NOTIFICATION_ENTRIES}-${eventType}`,
                    )
                    .click();
            }
            const entries = page.locator(
                `[data-testid^="config-repeat-toggle-${NOTIFICATION_ENTRIES}-"]`,
            );
            for (let index = 0; index < (await entries.count()); index += 1) {
                const summary = entries.nth(index);
                if ((await summary.getAttribute("aria-expanded")) === "true") {
                    await summary.click();
                }
            }
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-notification-cards-${viewport}`,
                ),
                fullPage: true,
            });

            // An open chips suggestion listbox over a config surface. Not
            // `fullPage`: a `Popper` is positioned against the viewport, and a
            // full-page capture re-renders the document without it.
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "indexers", "config-indexers");
                await showAdvanced(page);
            });
            await openIndexerEditor(page, "Outline Probe");
            await openGroupSuggestions(page);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-chips-listbox-${viewport}`,
                ),
            });

            // And the same slot over a config tab body rather than a dialog,
            // which is the surface the settings-search list actually opens on.
            await prepareVisualEvidence(page, viewport, async () => {
                await openConfig(page, "main", "config-main");
            });
            await page.getByTestId("config-search").fill("port");
            await expect(
                page.locator(".MuiAutocomplete-paper").first(),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SHELL",
                    `control-treatment-settings-search-listbox-${viewport}`,
                ),
            });
        }
    });
});
