import type {Locator, Page, TestInfo} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";

/**
 * FM-090. The outlined-input family renders every field label *twice*: once
 * as the visible `InputLabel` (laid out at the label's own font size, then
 * shrunk by a `scale(0.75)` transform) and once as the hidden `legend` inside
 * MUI's `NotchedOutline`, which is what actually cuts the gap in the border
 * and is laid out at `0.75em` of the `InputBase` root's font size. Those two
 * sizes are independent, and when they disagree the notch is cut for text of
 * a different width than the text painted over it -- a deficit that grows
 * with the label, so short labels hide it inside the legend's 10px of span
 * padding and long ones let the border's top line cross the label.
 *
 * This spec pins the invariant numerically, at both ends of the web-font
 * swap: `**\/*.woff2` is held until after the field has rendered and been
 * measured in the fallback font, then released and the same field measured
 * again in IBM Plex Sans. Deliberately *not* built on
 * `prepareVisualEvidence`, whose `document.fonts.ready` wait would skip the
 * first of those two states entirely -- which is exactly why no existing
 * screenshot strip ever showed this defect.
 */

type NotchGeometry = {
    label: string;
    labelWidth: number;
    legendWidth: number;
    slack: number;
    labelFontSize: string;
    legendFontSize: string;
    fontFamily: string;
};

/**
 * Holds every web font until `release()` is called. Installed before the
 * first navigation so the application's first paint is guaranteed to use the
 * fallback family.
 */
function holdWebFonts(page: Page): {release: () => void} {
    let release = (): void => {};
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });

    void page.route("**/*.woff2", async (route) => {
        await gate;
        await route.continue();
    });

    return {release};
}

async function readNotchGeometry(label: Locator): Promise<NotchGeometry> {
    await expect(label).toBeVisible();
    return label.evaluate((element) => {
        const field = element.closest(".MuiFormControl-root");
        if (field === null) {
            throw new Error("Label is not inside a MUI form control");
        }
        const legend = field.querySelector(
            "fieldset.MuiOutlinedInput-notchedOutline legend",
        );
        if (legend === null) {
            throw new Error("Field renders no notched-outline legend");
        }
        const labelBox = element.getBoundingClientRect();
        const legendBox = legend.getBoundingClientRect();
        return {
            label: element.textContent ?? "",
            labelWidth: labelBox.width,
            legendWidth: legendBox.width,
            slack: legendBox.width - labelBox.width,
            labelFontSize: getComputedStyle(element).fontSize,
            legendFontSize: getComputedStyle(legend).fontSize,
            fontFamily: getComputedStyle(element).fontFamily,
        };
    });
}

function expectNotchClearsLabel(geometry: NotchGeometry, state: string): void {
    expect(
        geometry.legendWidth,
        `notch legend must be at least as wide as the "${geometry.label}" label (${state}): ` +
            `label ${geometry.labelWidth.toFixed(2)}px vs legend ${geometry.legendWidth.toFixed(2)}px ` +
            `(label ${geometry.labelFontSize}, legend ${geometry.legendFontSize})`,
    ).toBeGreaterThanOrEqual(geometry.labelWidth);
}

/**
 * Note on evidence: this spec asserts numbers, never pixels. Playwright's own
 * `screenshot` blocks on `document.fonts.ready` before it captures ("waiting
 * for fonts to load..." in its call log), so a capture of the fonts-pending
 * state cannot be taken from inside the very gate that produces it -- it
 * deadlocks against the held route. The Visual Gate strip for this change is
 * therefore taken in a separate session (fonts failed rather than held, which
 * renders identically) and referenced from the task's handoff.
 */
async function measureAcrossFontSwap(
    page: Page,
    testInfo: TestInfo,
    label: Locator,
    name: string,
    release: () => void,
): Promise<void> {
    // The gate is still closed: whatever is on screen was laid out in the
    // fallback family, which is what a real cold load shows its user.
    expect(
        await page.evaluate(() => document.fonts.status),
        "web fonts must still be in flight while the fallback state is measured",
    ).toBe("loading");

    const fallback = await readNotchGeometry(label);
    expectNotchClearsLabel(fallback, "fallback font, before fonts.ready");

    release();
    await page.evaluate(() => document.fonts.ready);
    // A font swap is a layout change, not a paint change; give the frame that
    // applies it a chance to land before re-reading boxes.
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const loaded = await readNotchGeometry(label);

    expect(
        loaded.fontFamily,
        "the label must actually be laid out in the vendored web font after the swap",
    ).toContain("IBM Plex Sans");
    expectNotchClearsLabel(loaded, "IBM Plex Sans, after fonts.ready");

    // The measured numbers themselves are the evidence this spec exists to
    // produce, so they are attached to the run rather than only asserted on.
    await testInfo.attach(`${name}-geometry.json`, {
        body: JSON.stringify({fallback, loaded}, null, 2),
        contentType: "application/json",
    });
}

/**
 * The regression net behind the two named fields: no *visible* outlined field
 * anywhere on the page may paint a label wider than its own notch.
 */
async function expectEveryVisibleFieldClearsItsNotch(
    page: Page,
): Promise<void> {
    const offenders = await page.evaluate(() => {
        const bad: {label: string; labelWidth: number; legendWidth: number}[] =
            [];
        for (const field of document.querySelectorAll(".MuiFormControl-root")) {
            const label = field.querySelector("label.MuiInputLabel-root");
            const legend = field.querySelector(
                "fieldset.MuiOutlinedInput-notchedOutline legend",
            );
            if (label === null || legend === null) {
                continue;
            }
            const labelBox = label.getBoundingClientRect();
            const legendBox = legend.getBoundingClientRect();
            if (labelBox.width === 0 || legendBox.width === 0) {
                continue;
            }
            if (legendBox.width < labelBox.width) {
                bad.push({
                    label: label.textContent ?? "",
                    labelWidth: labelBox.width,
                    legendWidth: legendBox.width,
                });
            }
        }
        return bad;
    });

    expect(
        offenders,
        "every visible outlined field's notch must clear its own label",
    ).toEqual([]);
}

test.describe("Outlined label notch geometry", () => {
    test("the search form's long media label fits its notch across the web-font swap", async ({
        hydra,
        page,
    }, testInfo) => {
        await hydra.configureMockIndexers(["1", "2"]);
        const {release} = holdWebFonts(page);

        // `MainWeb.isReactSelected` defaults to the legacy shell without the
        // `nzbhydra-ui=react` cookie this entry point sets.
        await page.goto("ui/react?redirect=/", {
            waitUntil: "domcontentloaded",
        });
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("search-query")).toBeVisible();

        const toggle = page.getByTestId("search-advanced-toggle");
        if ((await toggle.getAttribute("aria-expanded")) === "false") {
            await toggle.click();
        }
        await expect(page.getByTestId("search-advanced-panel")).toBeVisible();
        await page.getByTestId("search-category-control").click();
        await page.getByTestId("search-category-option-Movies").click();
        await expect(
            page.getByTestId("workspace-media-refinement"),
        ).toBeVisible();

        const label = page.locator('label[for="additional-query"]');

        await measureAcrossFontSwap(
            page,
            testInfo,
            label,
            "search-additional-filter-terms",
            release,
        );
        await expectEveryVisibleFieldClearsItsNotch(page);
    });

    test("a long config label fits its notch across the web-font swap", async ({
        page,
    }, testInfo) => {
        const {release} = holdWebFonts(page);

        await page.goto("ui/react?redirect=/config/searching", {
            waitUntil: "domcontentloaded",
        });
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-searching")).toBeVisible();
        // The longest labels on this tab are advanced settings, and the
        // disclosure is a per-browser `localStorage` preference the `page`
        // fixture clears on every document load.
        const advanced = page.getByRole("switch", {name: "Advanced settings"});
        await advanced.setChecked(true);
        await expect(advanced).toBeChecked();

        const label = page
            .locator("label.MuiInputLabel-root")
            .filter({hasText: "Timeout when accessing indexers"})
            .first();

        await measureAcrossFontSwap(
            page,
            testInfo,
            label,
            "config-timeout-when-accessing-indexers",
            release,
        );
        await expectEveryVisibleFieldClearsItsNotch(page);
    });
});
