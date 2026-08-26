import type {Locator, Page} from "@playwright/test";

import {dismissWelcomeDialog, expect, test} from "./fixtures";
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

/**
 * FM-107: a row's fields are behind its expand toggle, and they stay mounted
 * while it is collapsed, so `fill()` needs the row opened first. Idempotent --
 * a row already open is left open.
 */
async function expandCategory(page: Page, index: number): Promise<void> {
    const toggle = page.getByTestId(`config-category-expand-${index}`);
    if ((await toggle.getAttribute("aria-expanded")) !== "true") {
        await toggle.click();
    }
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(
        page.getByTestId(
            `config-input-categoriesConfig-categories-${index}-name`,
        ),
    ).toBeVisible();
}

/**
 * The Categories catalog re-sorts by name on every save
 * (`CategoriesConfig.setCategories`), so a newly added category's row index
 * is never stable across a save+reload -- it has to be located by its own
 * `name` input's current value instead. The inputs of collapsed rows are still
 * in the DOM (FM-107 keeps them mounted), which is what lets this read them
 * without opening every row.
 */
async function categoryIndexByName(page: Page, name: string): Promise<number> {
    const inputs = page.locator(
        '[data-testid^="config-input-categoriesConfig-categories-"][data-testid$="-name"]',
    );
    const count = await inputs.count();
    for (let index = 0; index < count; index += 1) {
        const input = inputs.nth(index);
        if ((await input.inputValue()) === name) {
            const testId = await input.getAttribute("data-testid");
            const match = testId?.match(
                /^config-input-categoriesConfig-categories-(\d+)-name$/,
            );
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

        await page.getByTestId("config-categories-add").click();
        const addedIndex = categoriesBefore.length;
        const entry = page.getByTestId(`config-category-entry-${addedIndex}`);
        await expect(entry).toBeVisible();
        // A new row opens itself: its `name` is blank and required.
        await expandCategory(page, addedIndex);

        await page
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-name`,
            )
            .fill(categoryName);

        // A plain newznab category and an `&`-joined tuple requiring two
        // numbers to be present in one result
        // (`config-fields-service.js:1789-1795`).
        const newznabInput = page.getByTestId(
            `config-input-categoriesConfig-categories-${addedIndex}-newznabCategories`,
        );
        await newznabInput.fill("9999");
        await newznabInput.press("Enter");
        await newznabInput.fill("9998&9997");
        await newznabInput.press("Enter");

        // FM-107: a token the backend's `NewznabCategoriesDeserializer` could
        // not parse is refused at entry, naming itself, and never becomes a
        // chip -- so it also never reaches the save below.
        const refusal = page.getByTestId(
            `config-error-categoriesConfig-categories-${addedIndex}-newznabCategories`,
        );
        await newznabInput.fill("9996,9995");
        await newznabInput.press("Enter");
        await expect(refusal).toContainText('"9996,9995"');
        await expect(page.getByText("9996,9995", {exact: true})).toHaveCount(0);

        // The two accepted ones are chips, and the row's summary cell shows
        // them without the row having to be open.
        const summary = page.getByTestId(
            `config-category-newznabCategories-${addedIndex}`,
        );
        await expect(summary).toContainText("9999");
        await expect(summary).toContainText("9998&9997");

        await page
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-minSizePreset`,
            )
            .fill("10");
        await page
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-maxSizePreset`,
            )
            .fill("250");
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

        await expandCategory(page, savedIndex);
        await expect(
            page.getByTestId(
                `config-input-categoriesConfig-categories-${savedIndex}-minSizePreset`,
            ),
        ).toHaveValue("10");
        await expect(
            page.getByTestId(
                `config-input-categoriesConfig-categories-${savedIndex}-maxSizePreset`,
            ),
        ).toHaveValue("250");

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
});

test.describe("Config categories tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Categories tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await hydra.getConfig();

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
            // `scrollIntoView({block: "start"})`, not
            // `scrollIntoViewIfNeeded`: the catalog is far taller than the
            // viewport, and the minimal scroll the latter performs leaves the
            // column headers off the top of the frame. The extra scroll back is
            // the sticky save bar's own measured height -- it overlays the top
            // of the page, so `block: "start"` alone parks the header row
            // underneath it. Measured rather than guessed, since the bar's
            // height depends on whether it is showing a dirty summary.
            await scrollToTopOf(page, table);
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-table-collapsed-${viewport}`,
                ),
            });

            // One row expanded in place, with a refused newznab token visible
            // underneath its own field.
            await expandCategory(page, 0);
            const newznabInput = page.getByTestId(
                "config-input-categoriesConfig-categories-0-newznabCategories",
            );
            await newznabInput.scrollIntoViewIfNeeded();
            await newznabInput.fill("2010,3000");
            await newznabInput.press("Enter");
            const refusal = page.getByTestId(
                "config-error-categoriesConfig-categories-0-newznabCategories",
            );
            await expect(refusal).toBeVisible();
            await refusal.scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-row-expanded-refused-${viewport}`,
                ),
            });

            if (viewport === "mobile") {
                // The expansion is a cell of a table that is wider than its
                // scroll container at this width, so without the pinning in
                // `CategoriesTable` the right-hand edge of every field in it
                // would sit behind that horizontal scroll. Summary text may
                // scroll out of view; an input may not (ADR-0029).
                const fields = await page
                    .getByTestId("config-category-fields-box-0")
                    .boundingBox();
                expect(
                    fields,
                    "the expanded fields must have a box",
                ).not.toBeNull();
                const viewportSize = page.viewportSize();
                expect(
                    (fields?.x ?? 0) + (fields?.width ?? 0),
                    "an expanded row's fields must fit the viewport",
                ).toBeLessThanOrEqual(viewportSize?.width ?? 0);

                // ADR-0029, asserted rather than eyeballed: the table's own
                // container is what scrolls sideways at 390px, the document
                // does not, and both of a row's controls stay reachable without
                // any horizontal scrolling at all.
                await page.getByTestId("config-category-expand-0").click();
                const container = page.getByTestId(
                    "config-categories-scroller",
                );
                await scrollToTopOf(page, container);
                expect(
                    await container.evaluate(
                        (element) => element.scrollWidth > element.clientWidth,
                    ),
                    "the table container is what overflows at 390px",
                ).toBe(true);
                expect(
                    await page
                        .locator("html")
                        .evaluate(
                            (element) =>
                                element.scrollWidth <= element.clientWidth,
                        ),
                    "the page itself must never scroll horizontally",
                ).toBe(true);
                // Scrolled to its right edge, so the capture shows the columns
                // the 390px frame cannot hold *and* that reaching them costs
                // nothing but a swipe inside the table.
                await container.evaluate((element) => {
                    element.scrollLeft = element.scrollWidth;
                });
                await page.screenshot({
                    path: visualEvidencePath(
                        "F-CONFIG-CATEGORIES",
                        `categories-scroll-container-${viewport}`,
                    ),
                });
            }
        });
    }
});
