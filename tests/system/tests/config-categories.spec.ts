import type {Page} from "@playwright/test";

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
    await page.goto("ui/react?redirect=/config/categories");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-categories")).toBeVisible();
}

async function setAdvanced(page: Page, shown: boolean): Promise<void> {
    const toggle = page.getByRole("switch", {name: "Advanced settings"});
    await toggle.setChecked(shown);
    await expect(toggle).toBeChecked({checked: shown});
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
 * The Categories repeat section re-sorts by name on every save
 * (`CategoriesConfig.setCategories`), so a newly added category's row index
 * is never stable across a save+reload -- it has to be located by its own
 * `name` input's current value instead.
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

        await page
            .getByTestId("config-repeat-add-categoriesConfig-categories")
            .click();
        const addedIndex = categoriesBefore.length;
        const entry = page.getByTestId(
            `config-repeat-entry-categoriesConfig-categories-${addedIndex}`,
        );
        await expect(entry).toBeVisible();

        await entry
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-name`,
            )
            .fill(categoryName);

        // A plain newznab category and an `&`-joined tuple requiring two
        // numbers to be present in one result
        // (`config-fields-service.js:1789-1795`).
        const newznabInput = entry.getByTestId(
            `config-input-categoriesConfig-categories-${addedIndex}-newznabCategories`,
        );
        await newznabInput.fill("9999");
        await newznabInput.press("Enter");
        await newznabInput.fill("9998&9997");
        await newznabInput.press("Enter");
        await expect(entry.getByText("9999", {exact: true})).toBeVisible();
        await expect(entry.getByText("9998&9997", {exact: true})).toBeVisible();

        await entry
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-minSizePreset`,
            )
            .fill("10");
        await entry
            .getByTestId(
                `config-input-categoriesConfig-categories-${addedIndex}-maxSizePreset`,
            )
            .fill("250");

        await saveAndExpectSuccess(page);

        // The edits survive a full document load, which proves they were
        // persisted rather than only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-categories")).toBeVisible();
        await setAdvanced(page, true);

        const savedIndex = await categoryIndexByName(page, categoryName);
        await expect(
            page.getByTestId(
                `config-input-categoriesConfig-categories-${savedIndex}-newznabCategories`,
            ),
        ).toBeVisible();
        const reloadedEntry = page.getByTestId(
            `config-repeat-entry-categoriesConfig-categories-${savedIndex}`,
        );
        await expect(
            reloadedEntry.getByText("9999", {exact: true}),
        ).toBeVisible();
        await expect(
            reloadedEntry.getByText("9998&9997", {exact: true}),
        ).toBeVisible();
        await expect(
            reloadedEntry.getByTestId(
                `config-input-categoriesConfig-categories-${savedIndex}-minSizePreset`,
            ),
        ).toHaveValue("10");
        await expect(
            reloadedEntry.getByTestId(
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
            // As loaded, unedited -- the list "collapsed to defaults".
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-defaults-${viewport}`,
                ),
                fullPage: true,
            });

            // One category actively being edited. `RepeatSection` has no
            // collapse/expand affordance of its own (`C-CONFIG-FIELDS`,
            // shared with `F-CONFIG-AUTH`'s Users section) -- every entry's
            // fields are always fully rendered -- so "expanded for editing"
            // is captured as a focused, in-progress edit of the first entry
            // rather than a distinct disclosure state.
            const firstNameInput = page
                .getByTestId(
                    /^config-input-categoriesConfig-categories-\d+-name$/,
                )
                .first();
            await firstNameInput.click();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-editing-${viewport}`,
                ),
                fullPage: true,
            });

            // A newly added, still-blank category.
            await page
                .getByTestId("config-repeat-add-categoriesConfig-categories")
                .click();
            await expect(
                page.getByRole("heading", {level: 3, name: "New category"}),
            ).toBeVisible();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-CATEGORIES",
                    `categories-new-category-${viewport}`,
                ),
                fullPage: true,
            });
        });
    }
});
