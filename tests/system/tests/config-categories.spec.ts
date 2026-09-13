import type {Locator, Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test, testEnvironment} from "./fixtures";
import {prepareVisualEvidence, visualEvidencePath} from "./visualEvidence";

type Json = Record<string, unknown>;

function categoriesConfig(config: Json): Json {
    return config.categoriesConfig as Json;
}

function categoriesOf(config: Json): Json[] {
    return categoriesConfig(config).categories as Json[];
}

async function openCategoriesConfig(page: Page): Promise<void> {
    await page.goto("/config/categories");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-categories")).toBeVisible();
}

async function setAdvanced(page: Page, shown: boolean): Promise<void> {
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
    await toggle.setChecked(shown);
    await expect(toggle).toBeChecked({checked: shown});
    if (inDrawer) {
        await page.keyboard.press("Escape");
        await expect(page.getByTestId("config-nav")).toBeHidden();
    }
}

async function saveAndExpectSuccess(page: Page): Promise<void> {
    const saved = page.waitForResponse(
        (response) =>
            response.request().method() === "PUT" &&
            new URL(response.url()).pathname === "/internalapi/config",
    );
    await page.getByTestId("config-save").click();
    const result = (await (await saved).json()) as {
        errorMessages?: string[];
        ok?: boolean;
    };
    expect(result.errorMessages ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

/** A dialog field's own input, e.g. `draftField(page, "name")`. */
function draftField(page: Page, field: string): Locator {
    return page.getByTestId(
        `config-input-categoriesConfig-categoryDraft-${field}`,
    );
}

/**
 * FM-119 (ADR-0034): a category's fields live behind its own Edit button, in
 * a modal transaction, rather than an expanded row.
 */
async function openCategoryDialog(page: Page, index: number): Promise<void> {
    await page.getByTestId(`config-category-edit-${index}`).click();
    await expect(page.getByTestId("config-category-dialog")).toBeVisible();
}

async function submitCategoryDialog(page: Page): Promise<void> {
    await page.getByTestId("config-category-dialog-submit").click();
    await expect(page.getByTestId("config-category-dialog")).toBeHidden();
}

/**
 * The Categories catalog re-sorts by name on every save
 * (`CategoriesConfig.setCategories`), so a newly added category's row index
 * is never stable across a save+reload -- it has to be located by its own
 * summary cell's text instead. Summary cells are always in the DOM (FM-119
 * unmounts only the dialog's own fields, not the row), which is what lets
 * this read them without opening anything.
 */
async function categoryIndexByName(page: Page, name: string): Promise<number> {
    const names = page.locator('[data-testid^="config-category-name-"]');
    const count = await names.count();
    for (let index = 0; index < count; index += 1) {
        const cell = names.nth(index);
        if ((await cell.textContent())?.trim() === name) {
            const testId = await cell.getAttribute("data-testid");
            const match = testId?.match(/^config-category-name-(\d+)$/);
            if (match) {
                return Number(match[1]);
            }
        }
    }
    throw new Error(`No category named "${name}" found on the page`);
}

/**
 * Scrolls `target`'s top edge to just below the sticky save bar, which overlays
 * the top of the page and would otherwise cover it.
 */
async function scrollToTopOf(page: Page, target: Locator): Promise<void> {
    await target.evaluate((element) =>
        element.scrollIntoView({block: "start"}),
    );
    const bar = await page.getByTestId("config-save-bar").boundingBox();
    if (bar !== null) {
        await page.evaluate(
            (height) => window.scrollBy(0, -height),
            bar.height,
        );
    }
}

/*
 * Both halves of this file put a category named "System Test ..." into the
 * catalog -- one through the UI, one through the API -- and neither can do so
 * twice: `BaseConfig`'s category map is keyed by name, so a second copy makes
 * the save answer 500 with `IllegalStateException: Duplicate key System Test
 * Category`. FM-133 removed the teardown that used to take them out again and
 * this file stripped its own leftovers in a `beforeEach` instead, because
 * `applyBaseline()` would have had to carry a copy of the whole default
 * category list to do it. FM-139's reset means it no longer has to carry one:
 * it reads `config/baseConfig.yml` back off the instance, so `applyBaseline()`
 * establishes the stock catalog for every test and the `beforeEach` here is
 * gone. What the tests below count against is now that fixed list rather than
 * whatever the previous test left.
 */

test.describe("Config categories tab round trip", () => {
    test("should add a category with a newznab tuple and a size preset, save, reload, and leave other categories unchanged", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const categoriesBefore = categoriesOf(before);
        const categoryName = "System Test Category";

        await openCategoriesConfig(page);
        await setAdvanced(page, true);

        // Add pushes a placeholder straight into the catalog and opens its
        // dialog immediately -- the successor to FM-107's expand-on-add.
        await page.getByTestId("config-categories-add").click();
        const addedIndex = categoriesBefore.length;
        await expect(
            page.getByTestId(`config-category-entry-${addedIndex}`),
        ).toBeVisible();
        await expect(page.getByTestId("config-category-dialog")).toBeVisible();

        await draftField(page, "name").fill(categoryName);

        // A plain newznab category and an `&`-joined tuple requiring two
        // numbers to be present in one result
        // (`config-fields-service.js:1789-1795`).
        const newznabInput = draftField(page, "newznabCategories");
        await newznabInput.fill("9999");
        await newznabInput.press("Enter");
        await newznabInput.fill("9998&9997");
        await newznabInput.press("Enter");

        // A token the backend's `NewznabCategoriesDeserializer` could not
        // parse is refused at entry, naming itself, and never becomes a chip
        // -- so it also never reaches the save below.
        const refusal = page.getByTestId(
            "config-error-categoriesConfig-categoryDraft-newznabCategories",
        );
        await newznabInput.fill("9996,9995");
        await newznabInput.press("Enter");
        await expect(refusal).toContainText('"9996,9995"');
        await expect(page.getByText("9996,9995", {exact: true})).toHaveCount(0);

        await draftField(page, "minSizePreset").fill("10");
        await draftField(page, "maxSizePreset").fill("250");

        await submitCategoryDialog(page);

        // The two accepted tokens are chips, and the row's summary cell shows
        // them without the row having to be opened.
        const summary = page.getByTestId(
            `config-category-newznabCategories-${addedIndex}`,
        );
        await expect(summary).toContainText("9999");
        await expect(summary).toContainText("9998&9997");

        // The size column is there only while the catalog-wide switch is on,
        // and this test does not change that switch: it asserts the summary
        // cell exactly when the instance's own configuration renders one.
        if (categoriesConfig(before).enableCategorySizes === true) {
            await expect(
                page.getByTestId(`config-category-size-${addedIndex}`),
            ).toContainText("10–250 MB");
        }

        await saveAndExpectSuccess(page);

        // The edits survive a full document load, which proves they were
        // persisted rather than only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-categories")).toBeVisible();
        await setAdvanced(page, true);

        const savedIndex = await categoryIndexByName(page, categoryName);
        // Auditable while every row is still collapsed: the summary cell alone
        // answers "which category claims 9998&9997".
        const reloadedSummary = page.getByTestId(
            `config-category-newznabCategories-${savedIndex}`,
        );
        await expect(reloadedSummary).toContainText("9999");
        await expect(reloadedSummary).toContainText("9998&9997");

        await openCategoryDialog(page, savedIndex);
        await expect(draftField(page, "minSizePreset")).toHaveValue("10");
        await expect(draftField(page, "maxSizePreset")).toHaveValue("250");
        await page.getByTestId("config-category-dialog-cancel").click();

        const after = (await hydra.getConfig()) as Json;
        const categoriesAfter = categoriesOf(after);
        expect(categoriesAfter).toHaveLength(categoriesBefore.length + 1);

        const savedCategory = categoriesAfter.find(
            (category) => category.name === categoryName,
        );
        expect(savedCategory).toMatchObject({
            maxSizePreset: 250,
            minSizePreset: 10,
            name: categoryName,
            newznabCategories: ["9999", "9998&9997"],
        });

        // Every pre-existing category round-tripped unchanged.
        for (const original of categoriesBefore) {
            const stillThere = categoriesAfter.find(
                (category) => category.name === original.name,
            );
            expect(stillThere).toEqual(original);
        }
    });

    /**
     * FM-119 (ADR-0034): the dialog's own `trigger()` refuses to commit a
     * blank name, the client-side successor to FM-107's always-mounted-fields
     * guarantee. Reached through the dialog rather than the outer save button
     * -- the blank-name save refusal itself is `C-CONFIG-FORM`'s, not this
     * feature's, and stays covered by `config.spec.ts`.
     */
    test("should refuse to commit a category with no name, and undo an abandoned add", async ({
        page,
        hydra,
    }) => {
        const before = (await hydra.getConfig()) as Json;
        const categoriesBefore = categoriesOf(before);

        await openCategoriesConfig(page);
        await setAdvanced(page, true);

        await page.getByTestId("config-categories-add").click();
        await expect(page.getByTestId("config-category-dialog")).toBeVisible();

        await page.getByTestId("config-category-dialog-submit").click();
        const refusal = page.getByTestId(
            "config-error-categoriesConfig-categoryDraft-name",
        );
        await expect(refusal).toContainText("This field is required");
        await expect(page.getByTestId("config-category-dialog")).toBeVisible();

        // Backing out without ever naming it undoes the placeholder Add
        // pushed -- a category that was never named cannot survive to a save.
        await page.getByTestId("config-category-dialog-cancel").click();
        await expect(page.getByTestId("config-category-dialog")).toBeHidden();
        await expect(
            page.getByTestId(
                `config-category-entry-${categoriesBefore.length}`,
            ),
        ).toBeHidden();

        expect(categoriesOf((await hydra.getConfig()) as Json)).toEqual(
            categoriesBefore,
        );
    });
});

/**
 * FM-113. Deliberately at the API boundary rather than through the tab: `name` is `required`
 * (`CategoryEntryFields.tsx`), so `CategoryDialog`'s own `trigger()` refuses to commit a blank one
 * before any PUT is issued. A click-and-save case can therefore never exercise the server, and one
 * asserting "This field is required" would be green before *and* after this fix while appearing to
 * prove it. Every other caller of the endpoint -- scripts, hand-crafted requests, restored or
 * hand-edited `nzbhydra.yml` files -- does reach it, and used to get a 500 out of
 * `CategoriesConfig.setCategories` sorting on the missing name inside Jackson's request-body
 * binding, before any validator could speak.
 */
test.describe("Config categories API refusal", () => {
    test("should refuse a nameless category with a validation message instead of throwing", async ({
        hydra,
        request,
    }) => {
        const config = (await hydra.getConfig()) as Json;
        const categories = categoriesOf(config);
        categories.push({
            // Everything a category needs except a name, so the refusal asserted below is
            // unambiguously about the missing name and not about an empty newznab list.
            applySizeLimitsToApi: false,
            mayBeSelected: true,
            name: null,
            newznabCategories: ["9999"],
            preselect: false,
            searchType: "SEARCH",
            subtype: "NONE",
        });
        // Nameless entries sort last, so the row the message names is the last position, counting
        // from one.
        const expectedPosition = categories.length;

        const response = await request.put("/internalapi/config", {
            data: config,
            params: {internalApiKey: testEnvironment.hydraInternalApiKey},
        });

        // The point of the case: a refusal, not a crash.
        expect(response.status()).toBe(200);
        const result = (await response.json()) as {
            errorMessages?: string[];
            ok?: boolean;
        };
        expect(result.ok).toBe(false);
        expect(result.errorMessages ?? []).toContain(
            `Category number ${String(expectedPosition)} does not have a name`,
        );
    });
});

test.describe("Config categories tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Categories tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            const before = (await hydra.getConfig()) as Json;
            // A stored token the client would refuse today, flagged on its
            // summary row without opening anything (`newznabCategoryValidator`
            // narrows to digits only; `Integer.valueOf` -- and so the stored
            // config -- still accepts a negative one).
            await hydra.saveConfig({
                ...before,
                categoriesConfig: {
                    ...categoriesConfig(before),
                    categories: [
                        ...categoriesOf(before),
                        {
                            applyRestrictionsType: "NONE",
                            applySizeLimitsToApi: false,
                            forbiddenRegex: null,
                            forbiddenWords: [],
                            ignoreResultsFrom: "NONE",
                            mayBeSelected: true,
                            maxSizePreset: null,
                            minSizePreset: null,
                            name: "System Test Flagged Category",
                            newznabCategories: ["-5", "2000"],
                            preselect: true,
                            requiredRegex: null,
                            requiredWords: [],
                            searchType: "SEARCH",
                            subtype: "NONE",
                        },
                    ],
                },
            });

            await prepareVisualEvidence(page, viewport, async () => {
                await openCategoriesConfig(page);
                await setAdvanced(page, true);
            });
            const table = page.getByTestId("config-categories-table");
            await expect(table).toBeVisible();

            // Every capture below is a viewport screenshot with the region
            // scrolled into view first, not `fullPage`: FM-106 found `fullPage`
            // unreliable on these tabs once the content exceeds the viewport
            // with the sticky save bar in play, and each state here has to be
            // legible in the frame to be evidence of anything.
            await scrollToTopOf(page, table);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-table-${viewport}`,
                ),
            });

            // The flagged row, auditable without opening anything.
            const flaggedIndex = await categoryIndexByName(
                page,
                "System Test Flagged Category",
            );
            const flaggedRow = page.getByTestId(
                `config-category-entry-${flaggedIndex}`,
            );
            await flaggedRow.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-flagged-token-${viewport}`,
                ),
            });

            // The dialog, with a submitted blank name refused.
            await openCategoryDialog(page, 0);
            await draftField(page, "name").fill("");
            await page.getByTestId("config-category-dialog-submit").click();
            const refusal = page.getByTestId(
                "config-error-categoriesConfig-categoryDraft-name",
            );
            await expect(refusal).toBeVisible();
            await refusal.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-dialog-blank-name-refused-${viewport}`,
                ),
            });
            // Left exactly as it was found: restore the name and cancel
            // rather than leaving the tab mid-edit for whatever runs next.
            await draftField(page, "name").fill(
                String((categoriesOf(before)[0] as Json).name ?? ""),
            );
            await page.getByTestId("config-category-dialog-cancel").click();
            await expect(
                page.getByTestId("config-category-dialog"),
            ).toBeHidden();
        });
    }

    /**
     * FM-126 (ADR-0038). Before this, the catalog table had `overflowX: auto`
     * but no width floor, so at 390x844 it was squeezed to 350px against the
     * 438px it needs to lay out without breaking a word, and category names
     * and newznab token lists broke mid-word. It now holds its floor and
     * scrolls, marking the edge it clips.
     */
    test("should scroll the catalog inside its container with a scroll-edge affordance at 390px", async ({
        page,
    }) => {
        await prepareVisualEvidence(page, "mobile", async () => {
            await openCategoriesConfig(page);
            await setAdvanced(page, true);
        });
        const table = page.getByTestId("config-categories-table");
        await expect(table).toBeVisible();

        expect(
            await page
                .locator("html")
                .evaluate(
                    (element) => element.scrollWidth <= element.clientWidth,
                ),
        ).toBe(true);

        const scroller = page.getByTestId("config-categories-scroller");
        const geometry = await scroller.evaluate((element) => ({
            client: element.clientWidth,
            scrollable: element.scrollWidth,
            table: (element.firstElementChild as HTMLElement).clientWidth,
        }));
        expect(geometry.table).toBeGreaterThanOrEqual(440);
        expect(geometry.scrollable).toBeGreaterThan(geometry.client);

        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toBeVisible();
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toHaveCount(0);
        await scrollToTopOf(page, table);
        await page.screenshot({
            path: visualEvidencePath(
                "F-CONFIG-CATEGORIES",
                "table-scroll-affordance-mobile",
            ),
        });

        // ADR-0038's other half: at this width no cell may have to break a
        // word. Measured rather than eyeballed -- the longest word each
        // category name cell holds must fit the width its column was given.
        expect(
            await page
                .getByTestId("config-categories-table")
                .evaluate((element) => {
                    const broken: string[] = [];
                    const cells = element.querySelectorAll<HTMLElement>(
                        '[data-testid^="config-category-name-"]',
                    );
                    for (const cell of cells) {
                        for (const word of (cell.textContent ?? "")
                            .trim()
                            .split(/\s+/)) {
                            const probe = document.createElement("span");
                            probe.style.cssText =
                                "position:absolute;visibility:hidden;white-space:pre";
                            probe.textContent = word;
                            cell.append(probe);
                            const needed = probe.getBoundingClientRect().width;
                            probe.remove();
                            if (needed > cell.clientWidth + 0.5) {
                                broken.push(word);
                            }
                        }
                    }
                    return broken;
                }),
        ).toEqual([]);

        await scroller.evaluate((element) => {
            element.scrollLeft = element.scrollWidth;
        });
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await expect(
            page.getByTestId("table-scroll-affordance-start"),
        ).toBeVisible();
        await page.screenshot({
            path: visualEvidencePath(
                "F-CONFIG-CATEGORIES",
                "table-scroll-affordance-scrolled-mobile",
            ),
        });

        await prepareVisualEvidence(page, "desktop", async () => {
            await openCategoriesConfig(page);
            await setAdvanced(page, true);
        });
        await expect(table).toBeVisible();
        await expect(
            page.getByTestId("table-scroll-affordance-end"),
        ).toHaveCount(0);
        await scrollToTopOf(page, table);
        await page.screenshot({
            path: visualEvidencePath(
                "F-CONFIG-CATEGORIES",
                "table-scroll-affordance-desktop",
            ),
        });
    });
});
