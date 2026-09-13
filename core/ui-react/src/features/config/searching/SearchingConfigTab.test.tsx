import {ThemeProvider} from "@mui/material";
import {cleanup, fireEvent, render, screen} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {createHydraTheme} from "../../../app/theme";
import {ShowAdvancedContext} from "../advancedFields";
import {LEGACY_LANGUAGE_OPTIONS} from "./languages";
import {SearchingConfigTab} from "./SearchingConfigTab";

const baseSearching: Record<string, unknown> = {
    alwaysConvertIds: "NONE",
    alwaysShowQuickFilterButtons: true,
    applyRestrictions: "BOTH",
    coverSize: 128,
    customMappings: [],
    customQuickFilterButtons: ["Remux=remux"],
    duplicateAgeThreshold: 2,
    duplicateSizeThresholdInPercent: 1,
    forbiddenGroups: ["spamgroup"],
    forbiddenPosters: ["spamposter"],
    forbiddenRegex: "forbidden.*",
    forbiddenWords: ["cam"],
    generateQueries: "INTERNAL",
    globalCacheTimeMinutes: 15,
    historyForSearching: 25,
    idFallbackToQueryGeneration: "NONE",
    ignoreLoadLimitingForConcreteApiSearches: false,
    ignoreLoadLimitingForInternalSearches: false,
    ignorePassworded: false,
    ignoreTemporarilyDisabled: false,
    keepSearchResultsForDays: 3,
    language: "en",
    languagesToKeep: ["english"],
    loadAllCachedOnInternal: false,
    loadLimitInternal: 100,
    maxAge: 1000,
    minSeeders: 1,
    preselectQuickFilterButtons: ["source|web"],
    removeTrailing: ["english"],
    replaceUmlauts: false,
    requiredRegex: "required.*",
    requiredWords: ["proper"],
    sendTorznabCategories: true,
    showMovieQualityIndicator: false,
    showQuickFilterButtons: true,
    timeout: 30,
    transformNewznabCategories: true,
    useOriginalCategories: false,
    userAgent: "NZBHydra2",
    userAgents: ["Mozilla", "Sonarr"],
    wrapApiErrors: false,
};

type Harness = {form: UseFormReturn<ConfigValues>};

function configWith(overrides: Record<string, unknown> = {}): ConfigValues {
    return {searching: {...baseSearching, ...overrides}};
}

function renderSearching({
    showAdvanced = true,
    values = configWith(),
}: {
    showAdvanced?: boolean;
    values?: ConfigValues;
} = {}): Harness {
    const harness = {} as Harness;
    function Host() {
        const form = useForm<ConfigValues>({
            defaultValues: structuredClone(values),
            shouldUnregister: false,
        });
        useEffect(() => {
            harness.form = form;
        }, [form]);
        // `ConfigShell` reads `isDirty` to colour its Save button; reading it
        // here too is what subscribes React Hook Form's `formState` proxy to
        // the flag, so the assertions below see the same value the real shell
        // would.
        const isDirty = form.formState.isDirty;
        return (
            <ThemeProvider theme={createHydraTheme("grey")}>
                <FormProvider {...form}>
                    <ShowAdvancedContext.Provider value={showAdvanced}>
                        <span data-testid="form-dirty">{String(isDirty)}</span>
                        <SearchingConfigTab />
                    </ShowAdvancedContext.Provider>
                </FormProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function searchingValues(harness: Harness): Record<string, unknown> {
    return harness.form.getValues().searching as Record<string, unknown>;
}

async function selectOption(
    comboboxName: string,
    optionName: string,
): Promise<void> {
    fireEvent.mouseDown(screen.getByRole("combobox", {name: comboboxName}));
    fireEvent.click(await screen.findByRole("option", {name: optionName}));
}

afterEach(cleanup);

describe("F-CONFIG-SEARCHING fieldsets", () => {
    it("should render legacy's nine fieldsets", () => {
        renderSearching();

        for (const label of [
            "indexer access",
            "category handling",
            "media ids / query generation / query processing",
            "result filters",
            "result processing",
            "result display",
            "quick filters",
            "duplicate detection",
            "other",
        ]) {
            expect(
                screen.getByTestId(`config-fieldset-${label}`),
            ).toBeVisible();
        }
        // FM-195: the custom-mapping list is no longer one of this tab's
        // sections -- it is its own tab
        // (`customMappings/CustomMappingsConfigTab.test.tsx`).
        expect(
            screen.queryByTestId("config-repeat-searching-customMappings"),
        ).toBeNull();
    });

    it("should render every setting of the tab", () => {
        renderSearching();

        for (const key of Object.keys(baseSearching)) {
            if (key === "customMappings") {
                continue;
            }
            expect(
                screen.getByTestId(`config-setting-searching-${key}`),
            ).toBeVisible();
        }
    });

    it("should hide the advanced fieldsets and rows while advanced is off", () => {
        renderSearching({showAdvanced: false});

        for (const label of [
            "indexer access",
            "category handling",
            "duplicate detection",
            "other",
        ]) {
            expect(screen.queryByTestId(`config-fieldset-${label}`)).toBeNull();
        }
        // Advanced rows inside a plain fieldset.
        for (const key of [
            "alwaysConvertIds",
            "forbiddenRegex",
            "requiredRegex",
            "forbiddenGroups",
            "forbiddenPosters",
            "wrapApiErrors",
            "useOriginalCategories",
            "loadAllCachedOnInternal",
            "loadLimitInternal",
            "alwaysShowQuickFilterButtons",
            "customQuickFilterButtons",
            "preselectQuickFilterButtons",
        ]) {
            expect(
                screen.queryByTestId(`config-setting-searching-${key}`),
            ).toBeNull();
        }
        // A plain row is still there.
        expect(
            screen.getByTestId("config-setting-searching-generateQueries"),
        ).toBeVisible();
    });
});

describe("F-CONFIG-SEARCHING conditional groups", () => {
    it("should hide the word filters when they never apply and keep their values", async () => {
        const harness = renderSearching();

        await selectOption("Apply word filters", "Never");

        for (const key of [
            "forbiddenWords",
            "forbiddenRegex",
            "requiredWords",
            "requiredRegex",
            "forbiddenGroups",
        ]) {
            expect(
                screen.queryByTestId(`config-setting-searching-${key}`),
            ).toBeNull();
        }
        // Legacy has no `hideExpression` on the posters list.
        expect(
            screen.getByTestId("config-setting-searching-forbiddenPosters"),
        ).toBeVisible();
        expect(searchingValues(harness)).toMatchObject({
            applyRestrictions: "NONE",
            forbiddenGroups: ["spamgroup"],
            forbiddenRegex: "forbidden.*",
            forbiddenWords: ["cam"],
            requiredRegex: "required.*",
            requiredWords: ["proper"],
        });
    });

    it("should hide the quick filter details when quick filters are off and keep their values", () => {
        const harness = renderSearching();

        fireEvent.click(
            screen.getByTestId("config-input-searching-showQuickFilterButtons"),
        );

        for (const key of [
            "alwaysShowQuickFilterButtons",
            "customQuickFilterButtons",
            "preselectQuickFilterButtons",
        ]) {
            expect(
                screen.queryByTestId(`config-setting-searching-${key}`),
            ).toBeNull();
        }
        expect(searchingValues(harness)).toMatchObject({
            alwaysShowQuickFilterButtons: true,
            customQuickFilterButtons: ["Remux=remux"],
            preselectQuickFilterButtons: ["source|web"],
            showQuickFilterButtons: false,
        });
    });

    it("should offer the configured custom quick filters as preselectable", () => {
        renderSearching();

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Preselect quickfilters"}),
        );

        expect(screen.getByRole("option", {name: "Remux"})).toBeVisible();
        expect(screen.getByRole("option", {name: "1080p"})).toBeVisible();
    });
});

describe("F-CONFIG-SEARCHING language list", () => {
    it("should offer legacy's languages and show the configured one", () => {
        renderSearching();

        expect(
            screen.getByRole("combobox", {name: "Language"}),
        ).toHaveTextContent("English");
        expect(LEGACY_LANGUAGE_OPTIONS).toHaveLength(184);
    });

    it("should keep a stored language code the list does not know", () => {
        const harness = renderSearching({values: configWith({language: "xx"})});

        expect(
            screen.getByRole("combobox", {name: "Language"}),
        ).toHaveTextContent("xx");
        expect(searchingValues(harness).language).toBe("xx");
    });
});

describe("F-CONFIG-SEARCHING numeric limits", () => {
    it("should reject a page size above legacy's limit of 500", async () => {
        const harness = renderSearching();

        fireEvent.change(
            screen.getByTestId("config-input-searching-loadLimitInternal"),
            {target: {value: "501"}},
        );
        await harness.form.trigger();

        expect(
            await screen.findByTestId(
                "config-error-searching-loadLimitInternal",
            ),
        ).toHaveTextContent("Must be at most 500");
    });

    it("should reject a duplicate size threshold with more than two decimals", async () => {
        const harness = renderSearching();

        fireEvent.change(
            screen.getByTestId(
                "config-input-searching-duplicateSizeThresholdInPercent",
            ),
            {target: {value: "1.234"}},
        );
        await harness.form.trigger();

        expect(
            await screen.findByTestId(
                "config-error-searching-duplicateSizeThresholdInPercent",
            ),
        ).toHaveTextContent(
            "Enter a percentage with at most two decimal places",
        );
    });
});
