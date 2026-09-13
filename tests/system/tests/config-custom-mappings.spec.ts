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
    from: "{show:.*} s{s:[0-9]+}",
    matching: "my show s1",
    matchingOutput: "my show S1",
    name: "Season number",
    other: "nothing like it",
    to: "{show} S{s}",
};

function searching(config: Json): Json {
    return config.searching as Json;
}

function mappingsOf(config: Json): Json[] {
    return (searching(config).customMappings ?? []) as Json[];
}

async function seedMappings(
    hydra: {
        getConfig(): Promise<unknown>;
        saveConfig(config: Json): Promise<unknown>;
    },
    customMappings: Json[],
): Promise<void> {
    const before = (await hydra.getConfig()) as Json;
    await hydra.saveConfig({
        ...before,
        searching: {...searching(before), customMappings},
    });
}

function storedMapping(overrides: Json): Json {
    return {
        affectedValue: "QUERY",
        enabled: true,
        examples: [],
        matchAll: false,
        searchType: "SEARCH",
        ...overrides,
    };
}

async function openCustomMappings(page: Page): Promise<void> {
    await page.goto("/config/customMappings");
    await dismissWelcomeDialog(page);
    await expect(page.getByTestId("config-shell")).toBeVisible();
    await expect(page.getByTestId("config-custom-mappings")).toBeVisible();
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
        warningMessages?: string[];
    };
    expect(result.errorMessages ?? []).toEqual([]);
    expect(result.warningMessages ?? []).toEqual([]);
    expect(result.ok).toBe(true);
    // Anchored to the most recent toast: FM-084 made toasts stack, so a second
    // save leaves two in the DOM and an unanchored locator trips strict mode.
    await expect(page.getByText("Configuration saved.").last()).toBeVisible();
}

function resultCell(page: Page, line: number, column: number) {
    return page
        .getByTestId(`config-custom-mapping-result-${line}`)
        .getByRole("cell")
        .nth(column);
}

test.describe("Config custom mappings tab", () => {
    test("should reach the tab by its own route and add a named, tested mapping that persists with its examples", async ({
        page,
        hydra,
    }) => {
        await seedMappings(hydra, []);
        await openCustomMappings(page);

        // The tab is reachable with the advanced toggle off, which is the
        // whole reason FM-195 did not carry FM-131's advanced gate over.
        await expect(
            page.getByRole("switch", {name: "Advanced settings"}),
        ).not.toBeChecked();
        await expect(
            page.getByTestId(`config-repeat-${MAPPINGS}`),
        ).toBeVisible();

        await page.getByTestId(`config-repeat-add-${MAPPINGS}`).click();
        await expect(
            page.getByTestId("config-custom-mapping-dialog"),
        ).toBeVisible();
        await page.getByTestId("config-custom-mapping-name").fill(MAPPING.name);
        await page.getByRole("combobox", {name: "Affected value"}).click();
        await page.getByRole("option", {name: "Query", exact: true}).click();
        await page.getByTestId("config-custom-mapping-from").fill(MAPPING.from);
        await page.getByTestId("config-custom-mapping-to").fill(MAPPING.to);
        await page
            .getByTestId("config-custom-mapping-examples")
            .fill(`${MAPPING.matching}\n${MAPPING.other}`);

        // The real backend answers the batch round trip, one row per line.
        const tested = page.waitForResponse(
            (response) =>
                response.request().method() === "POST" &&
                new URL(response.url()).pathname ===
                    "/internalapi/customMapping/test",
        );
        await page.getByTestId("config-custom-mapping-test").click();
        expect((await tested).status()).toBe(200);

        await expect(
            page.getByTestId("config-custom-mapping-results"),
        ).toBeVisible();
        await expect(resultCell(page, 0, 0)).toHaveText(MAPPING.matching);
        await expect(resultCell(page, 0, 1)).toHaveText(MAPPING.matchingOutput);
        await expect(resultCell(page, 0, 2)).toHaveText(MAPPING.matchingOutput);
        await expect(resultCell(page, 0, 3)).toHaveText(MAPPING.name);
        await expect(resultCell(page, 1, 1)).toHaveText("No match");
        await expect(resultCell(page, 1, 2)).toHaveText(MAPPING.other);
        await expect(resultCell(page, 1, 3)).toHaveText("None");

        // Testing writes nothing.
        expect(mappingsOf((await hydra.getConfig()) as Json)).toEqual([]);

        await page.getByTestId("config-custom-mapping-submit").click();
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toBeVisible();

        await saveAndExpectSuccess(page);

        // A full document load proves the values were persisted rather than
        // only held in the form.
        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-custom-mappings")).toBeVisible();
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toContainText(MAPPING.name);
        await expect(
            page.getByTestId("config-custom-mapping-value-0-from"),
        ).toHaveText(MAPPING.from);

        const stored = mappingsOf((await hydra.getConfig()) as Json);
        expect(stored).toHaveLength(1);
        expect(stored[0]).toMatchObject({
            affectedValue: "QUERY",
            enabled: true,
            // FM-194's field: the examples are saved with the mapping they
            // were written for.
            examples: [MAPPING.matching, MAPPING.other],
            from: MAPPING.from,
            matchAll: true,
            name: MAPPING.name,
            to: MAPPING.to,
        });
    });

    test("should reorder the list, disable an entry, and read both back from the server", async ({
        page,
        hydra,
    }) => {
        await seedMappings(hydra, [
            storedMapping({from: "first", name: "First", to: "one"}),
            storedMapping({from: "second", name: "Second", to: "two"}),
        ]);
        await openCustomMappings(page);

        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toContainText("First");
        await expect(
            page.getByTestId(`config-repeat-up-${MAPPINGS}-0`),
        ).toBeDisabled();

        await page.getByTestId(`config-repeat-down-${MAPPINGS}-0`).click();
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toContainText("Second");

        // A switched-off mapping is kept but carries the chip that says so.
        await page.getByTestId(`config-repeat-edit-${MAPPINGS}-1`).click();
        await expect(
            page.getByTestId("config-custom-mapping-dialog"),
        ).toBeVisible();
        await page.getByTestId("config-custom-mapping-enabled").click();
        await page.getByTestId("config-custom-mapping-submit").click();
        await expect(
            page.getByTestId("config-custom-mapping-disabled-1"),
        ).toHaveText("Disabled");

        await saveAndExpectSuccess(page);

        await page.reload();
        await dismissWelcomeDialog(page);
        await expect(page.getByTestId("config-custom-mappings")).toBeVisible();
        await expect(
            page.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toContainText("Second");
        await expect(
            page.getByTestId("config-custom-mapping-disabled-1"),
        ).toBeVisible();

        const stored = mappingsOf((await hydra.getConfig()) as Json);
        expect(stored.map((mapping) => mapping.name)).toEqual([
            "Second",
            "First",
        ]);
        expect(stored[1].enabled).toBe(false);
    });
});

test.describe("Config custom mappings tab visual evidence", () => {
    for (const viewport of ["desktop", "mobile"] as const) {
        test(`should capture the Custom Mappings tab states at ${viewport}`, async ({
            page,
            hydra,
        }) => {
            await seedMappings(hydra, [
                storedMapping({
                    examples: [MAPPING.matching, MAPPING.other],
                    from: MAPPING.from,
                    matchAll: true,
                    name: MAPPING.name,
                    to: MAPPING.to,
                }),
                storedMapping({
                    enabled: false,
                    from: "dead.*pattern",
                    name: "Retired rule",
                    to: "<remove>",
                }),
            ]);

            await prepareVisualEvidence(page, viewport, async () => {
                await openCustomMappings(page);
            });
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `custom-mappings-tab-${viewport}`,
                ),
                fullPage: true,
            });

            await page.getByTestId(`config-repeat-edit-${MAPPINGS}-0`).click();
            await expect(
                page.getByTestId("config-custom-mapping-dialog"),
            ).toBeVisible();
            // Not `fullPage`: the dialog is fixed to the viewport, so a
            // full-page capture would show it floating in the middle of a
            // several-thousand-pixel page instead of as the modal it is.
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `custom-mappings-dialog-${viewport}`,
                ),
            });

            await page.getByTestId("config-custom-mapping-test").click();
            await expect(
                page.getByTestId("config-custom-mapping-results"),
            ).toBeVisible();
            await expect(resultCell(page, 0, 1)).toHaveText(
                MAPPING.matchingOutput,
            );
            // The table is below the fold of the dialog's own scroll area, so
            // the capture has to be taken where it is.
            await page
                .getByTestId("config-custom-mapping-results")
                .scrollIntoViewIfNeeded();
            await page.screenshot({
                path: visualEvidencePath(
                    "F-CONFIG-SEARCHING",
                    `custom-mappings-dialog-tested-${viewport}`,
                ),
            });
        });
    }
});
