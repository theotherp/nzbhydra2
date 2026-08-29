import type {Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

const MAPPINGS = "searching-customMappings";

/**
 * A mapping with a named group, so the round trip proves the *server's* regex
 * handling and not just that a request was made:
 * `CustomQueryAndTitleMappingHandler` compiles `{show:.*} s{s:[0-9]+}` into
 * `(?<hydrashow>.*) s(?<hydras>[0-9]+)` and rewrites the output pattern's
 * `{show}`/`{s}` into references to those groups.
 */
const MAPPING = {
    exampleInput: "my show s1",
    expectedOutput: "my show S1",
    from: "{show:.*} s{s:[0-9]+}",
    to: "{show} S{s}",
};

function searching(config: Json): Json {
    return config.searching as Json;
}

function mappingsOf(config: Json): Json[] {
    return (searching(config).customMappings ?? []) as Json[];
}

async function openSearchingConfig(page: Page): Promise<void> {
    await page.goto("/config/searching");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-searching")).toBeVisible();
}

/**
 * The advanced toggle is a per-browser preference in `localStorage`, and the
 * `page` fixture clears storage on every document load — so it has to be
 * switched on again after a reload, not only once per test.
 */
async function showAdvanced(page: Page): Promise<void> {
    // FM-097: below `md` the settings nav is a temporary `Drawer`, so the
    // advanced toggle at its foot is only mounted while that drawer is open
    // (`RefineSidebar.tsx:97-101`: exactly one copy, never a duplicated
    // testid). `config-nav-open` is rendered only below `md`, so this branch
    // is inert at desktop viewports, and the drawer is closed again below so
    // the page is left in exactly the state this helper always left it in.
    const navOpen = page.getByTestId("config-nav-open");
    const inDrawer = await navOpen.isVisible();
    if (inDrawer) {
        await navOpen.click();
        await expect(page.getByTestId("config-nav")).toBeVisible();
    }
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(true);
    await expect(toggle).toBeChecked();
    await expect(
        page.getByTestId("config-fieldset-indexer access"),
    ).toBeVisible();
    if (inDrawer) {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("config-nav")).toBeHidden();
    }
}

async function save(page: Page): Promise<string[]> {
    const saved = page.waitForResponse(
        (response) =>
            response.request().method() === "PUT" &&
            new URL(response.url()).pathname === "/internalapi/config",
    );
    await page.getByTestId("config-save").click();
    const result = (await (await saved).json()) as {
        errorMessages?: string[];
        ok?: boolean;
        warningMessages?: string[];
    };
    expect(result.errorMessages ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    return result.warningMessages ?? [];
}

async function saveAndExpectSuccess(page: Page): Promise<void> {
    expect(await save(page)).toEqual([]);
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

async function fillMappingDialog(page: Page): Promise<void> {
    await page.getByRole("combobox", {name: "Affected value"}).click();
    await page.getByRole("option", {name: "Query", exact: true}).click();
    await page.getByTestId("config-custom-mapping-from").fill(MAPPING.from);
    await page.getByTestId("config-custom-mapping-to").fill(MAPPING.to);
}

test.describe("Config searching tab round trip", () => {
    test("should edit a plain and an advanced field, add a tested custom mapping, save, and persist them", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const mappingsBefore = mappingsOf(before);

        await openSearchingConfig(page);
        await showAdvanced(page);

        // A plain field (Result display) and an advanced one (Indexer access).
        await page.getByTestId("config-input-searching-coverSize").fill("160");
        await page.getByTestId("config-input-searching-timeout").fill("45");

        await page.getByTestId(`config-repeat-add-${MAPPINGS}`).click();
        await expect(
            page.getByTestId("config-custom-mapping-dialog"),
        ).toBeVisible();
        await fillMappingDialog(page);

        // The real backend answers the test round trip: first the empty-input
        // guard, then a genuine match, then a non-matching example.
        await page.getByTestId("config-custom-mapping-test").click();
        await expect(
            page.getByTestId("config-custom-mapping-result"),
        ).toHaveValue("Empty example data");

        const tested = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/customMapping/test",
        );
        await page
            .getByTestId("config-custom-mapping-exampleInput")
            .fill(MAPPING.exampleInput);
        await page.getByTestId("config-custom-mapping-test").click();
        expect((await tested).status()).toBe(200);
        await expect(
            page.getByTestId("config-custom-mapping-result"),
        ).toHaveValue(MAPPING.expectedOutput);

        await page
            .getByTestId("config-custom-mapping-exampleInput")
            .fill("nothing like it");
        await page.getByTestId("config-custom-mapping-test").click();
        await expect(
            page.getByTestId("config-custom-mapping-result"),
        ).toHaveValue("Input does not match example");

        // Testing writes nothing: the list is still what it was.
        expect(mappingsOf((await hydra.getConfig()) as Json)).toEqual(
            mappingsBefore,
        );

        await page.getByTestId("config-custom-mapping-submit").click();
        const addedIndex = mappingsBefore.length;
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-${addedIndex}`),
        ).toBeVisible();

        await saveAndExpectSuccess(page);

        // A full document load proves the values were persisted rather than
        // only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-searching")).toBeVisible();
        await showAdvanced(page);

        await expect(
            page.getByTestId("config-input-searching-coverSize"),
        ).toHaveValue("160");
        await expect(
            page.getByTestId("config-input-searching-timeout"),
        ).toHaveValue("45");
        await expect(
            page.getByTestId(`config-custom-mapping-value-${addedIndex}-from`),
        ).toHaveText(MAPPING.from);
        await expect(
            page.getByTestId(`config-custom-mapping-value-${addedIndex}-to`),
        ).toHaveText(MAPPING.to);
        await expect(
            page.getByTestId(
                `config-custom-mapping-value-${addedIndex}-affectedValue`,
            ),
        ).toHaveText("Query");
        await expect(
            page.getByTestId(
                `config-custom-mapping-value-${addedIndex}-matchAll`,
            ),
        ).toHaveText("Yes");

        const after = (await hydra.getConfig()) as Json;
        expect(searching(after).coverSize).toBe(160);
        expect(searching(after).timeout).toBe(45);
        const mappingsAfter = mappingsOf(after);
        expect(mappingsAfter).toHaveLength(mappingsBefore.length + 1);
        expect(mappingsAfter[addedIndex]).toMatchObject({
            affectedValue: "QUERY",
            from: MAPPING.from,
            matchAll: true,
            to: MAPPING.to,
        });
    });

    test("should discard a cancelled mapping edit and keep hidden fields across a save", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const forbiddenWords = ["systemtest-forbidden"];
        await hydra.saveConfig({
            ...before,
            searching: {
                ...searching(before),
                applyRestrictions: "BOTH",
                forbiddenWords,
            },
        });

        await openSearchingConfig(page);
        await showAdvanced(page);

        // Cancel discards: nothing is added to the list.
        await page.getByTestId(`config-repeat-add-${MAPPINGS}`).click();
        await fillMappingDialog(page);
        await page.getByTestId("config-custom-mapping-cancel").click();
        await expect(
            page.getByTestId("config-custom-mapping-dialog"),
        ).toBeHidden();
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toBeHidden();

        // Turning word filters off hides the forbidden words; saving must not
        // delete the list behind them.
        await page.getByRole("combobox", {name: "Apply word filters"}).click();
        await page.getByRole("option", {name: "Never", exact: true}).click();
        await expect(
            page.getByTestId("config-setting-searching-forbiddenWords"),
        ).toBeHidden();

        // The server's own warning is the proof that the hidden list reached
        // it: `SearchingConfigValidator` only emits this when the saved config
        // has `applyRestrictions: NONE` *and* a non-empty forbidden/required
        // word list.
        const warnings = await save(page);
        expect(warnings).toContain(
            'You selected not to apply any word restrictions in "Searching" but supplied forbidden or required words there',
        );
        // FM-101: the same warning, reported in a dismissible banner instead
        // of an acknowledge dialog.
        const warningBanner = page.getByTestId("config-validation-warnings");
        await expect(warningBanner).toBeVisible();
        await warningBanner.getByRole("button", {name: "Close"}).click();
        await expect(warningBanner).toBeHidden();

        const after = (await hydra.getConfig()) as Json;
        expect(searching(after).applyRestrictions).toBe("NONE");
        expect(searching(after).forbiddenWords).toEqual(forbiddenWords);
        expect(mappingsOf(after)).toEqual(mappingsOf(before));
    });
});

test.describe("Config searching tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Searching tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            // The system-test baseline applies no word filters, which would
            // hide five of the Result filters rows; the strip is meant to show
            // the tab, so the conditional group is switched on first.
            const before = (await hydra.getConfig()) as Json;
            await hydra.saveConfig({
                ...before,
                searching: {
                    ...searching(before),
                    applyRestrictions: "BOTH",
                    // One stored mapping, so the advanced strip shows an
                    // entry summary and not only the empty list.
                    customMappings: [
                        {
                            affectedValue: "QUERY",
                            from: MAPPING.from,
                            matchAll: true,
                            searchType: "TVSEARCH",
                            to: MAPPING.to,
                        },
                    ],
                    forbiddenWords: ["cam", "screener"],
                    requiredWords: ["proper"],
                },
            });

            await prepareVisualEvidence(page, viewport, async () => {
                await openSearchingConfig(page);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `searching-advanced-hidden-${viewport}`,
                ),
                fullPage: true,
            });

            await showAdvanced(page);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `searching-advanced-shown-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId(`config-repeat-add-${MAPPINGS}`).click();
            await expect(
                page.getByTestId("config-custom-mapping-dialog"),
            ).toBeVisible();
            await fillMappingDialog(page);
            await page
                .getByTestId("config-custom-mapping-exampleInput")
                .fill(MAPPING.exampleInput);
            await page.getByTestId("config-custom-mapping-test").click();
            await expect(
                page.getByTestId("config-custom-mapping-result"),
            ).toHaveValue(MAPPING.expectedOutput);
            // Not `fullPage`: the dialog is fixed to the viewport, so a
            // full-page capture would show it floating in the middle of a
            // several-thousand-pixel page instead of as the modal it is.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `searching-mapping-dialog-tested-${viewport}`,
                ),
            });
        });
    }
});
