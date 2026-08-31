import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {CustomMappingValues} from "../../../api/config/customMappingTest";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ShowAdvancedContext} from "../advancedFields";
import {CUSTOM_MAPPINGS_HEADLINE} from "./CustomMappingsSection";
import {LEGACY_LANGUAGE_OPTIONS} from "./languages";
import {SearchingConfigTab} from "./SearchingConfigTab";

const CUSTOM_MAPPINGS_FIELDSET = `config-fieldset-${CUSTOM_MAPPINGS_HEADLINE.toLowerCase()}`;
const CUSTOM_MAPPINGS_EXPANDER = `config-advanced-expander-${CUSTOM_MAPPINGS_HEADLINE.toLowerCase()}`;

const MAPPINGS = "searching-customMappings";

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
    fetchMock = vi.fn<typeof fetch>(() => {
        throw new Error("no request expected");
    }),
    showAdvanced = true,
    values = configWith(),
}: {
    fetchMock?: ReturnType<typeof vi.fn>;
    showAdvanced?: boolean;
    values?: ConfigValues;
} = {}): Harness {
    const harness = {} as Harness;
    const transport = new ApiTransport(
        "/",
        fetchMock as unknown as typeof fetch,
    );
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
                        <SearchingConfigTab transport={transport} />
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

function mappingsOf(harness: Harness): Record<string, unknown>[] {
    return searchingValues(harness).customMappings as Record<string, unknown>[];
}

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"content-type": "application/json"},
        status: 200,
    });
}

async function selectOption(
    comboboxName: string,
    optionName: string,
): Promise<void> {
    fireEvent.mouseDown(screen.getByRole("combobox", {name: comboboxName}));
    fireEvent.click(await screen.findByRole("option", {name: optionName}));
}

async function openNewMappingDialog(): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-add-${MAPPINGS}`));
    await screen.findByTestId("config-custom-mapping-dialog");
}

function setDialogText(testId: string, value: string): void {
    fireEvent.change(screen.getByTestId(testId), {target: {value}});
}

async function fillMapping(mapping: {
    affectedValue: string;
    from: string;
    to: string;
}): Promise<void> {
    await selectOption("Affected value", mapping.affectedValue);
    setDialogText("config-custom-mapping-from", mapping.from);
    setDialogText("config-custom-mapping-to", mapping.to);
}

afterEach(cleanup);

describe("F-CONFIG-SEARCHING fieldsets", () => {
    it("should render legacy's nine fieldsets and the custom-mapping section", () => {
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
        expect(screen.getByTestId(`config-repeat-${MAPPINGS}`)).toBeVisible();
        // FM-131: the section is wrapped in an advanced `ConfigFieldset`, so
        // with the toggle on it renders that fieldset's own test id too, in
        // addition to (not instead of) its pre-existing selectors.
        expect(screen.getByTestId(CUSTOM_MAPPINGS_FIELDSET)).toBeVisible();
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

    it("should hide the advanced fieldsets, rows, and mapping section while advanced is off", () => {
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
        expect(screen.queryByTestId(`config-repeat-${MAPPINGS}`)).toBeNull();
        // FM-131: the section does not simply vanish -- it offers the same
        // named, operable affordance any other wholly-advanced fieldset does.
        expect(screen.getByTestId(CUSTOM_MAPPINGS_EXPANDER)).toHaveTextContent(
            `${CUSTOM_MAPPINGS_HEADLINE} — advanced, hidden`,
        );
        expect(screen.queryByTestId(CUSTOM_MAPPINGS_FIELDSET)).toBeNull();
        // A plain row is still there.
        expect(
            screen.getByTestId("config-setting-searching-generateQueries"),
        ).toBeVisible();
    });

    it("should reveal the custom-mapping section in place when its advanced expander is clicked", async () => {
        renderSearching({showAdvanced: false});

        expect(screen.queryByTestId(`config-repeat-${MAPPINGS}`)).toBeNull();

        fireEvent.click(screen.getByTestId(CUSTOM_MAPPINGS_EXPANDER));

        expect(screen.getByTestId(`config-repeat-${MAPPINGS}`)).toBeVisible();
        expect(screen.getByTestId(CUSTOM_MAPPINGS_FIELDSET)).toBeVisible();
        expect(
            screen.getByTestId(`config-repeat-add-${MAPPINGS}`),
        ).toBeVisible();
        expect(screen.getByTestId(CUSTOM_MAPPINGS_EXPANDER)).toHaveTextContent(
            `Hide ${CUSTOM_MAPPINGS_HEADLINE}`,
        );

        // Escape/collapse semantics match `AdvancedExpander`: clicking again
        // collapses it back in place. The `Collapse` exit transition removes
        // the section from the DOM when it finishes rather than in the
        // click's own tick (`configFields.test.tsx` establishes the same
        // idiom for a whole-advanced fieldset).
        fireEvent.click(screen.getByTestId(CUSTOM_MAPPINGS_EXPANDER));

        await waitFor(() =>
            expect(
                screen.queryByTestId(`config-repeat-${MAPPINGS}`),
            ).toBeNull(),
        );
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

describe("F-CONFIG-SEARCHING custom mapping transaction", () => {
    it("should not add an entry when the dialog is cancelled", async () => {
        const harness = renderSearching();

        await openNewMappingDialog();
        await fillMapping({
            affectedValue: "Query",
            from: "some show",
            to: "other show",
        });
        fireEvent.click(screen.getByTestId("config-custom-mapping-cancel"));

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-custom-mapping-dialog"),
            ).toBeNull(),
        );
        expect(mappingsOf(harness)).toEqual([]);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should add the entry only on submit, with legacy's defaults", async () => {
        const harness = renderSearching();

        await openNewMappingDialog();
        await fillMapping({
            affectedValue: "Search title",
            from: "{show:.*} s{s:[0-9]+}",
            to: "{show} S{s}",
        });
        await selectOption("Search type", "TV");
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        await waitFor(() => expect(mappingsOf(harness)).toHaveLength(1));
        expect(mappingsOf(harness)[0]).toEqual({
            affectedValue: "TITLE",
            from: "{show:.*} s{s:[0-9]+}",
            // Legacy's `defaultModel` starts a new mapping as a whole-string
            // match.
            matchAll: true,
            searchType: "TVSEARCH",
            to: "{show} S{s}",
        });
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-custom-mapping-value-0-from"),
        ).toHaveTextContent("{show:.*} s{s:[0-9]+}");
        expect(
            screen.getByTestId("config-custom-mapping-value-0-affectedValue"),
        ).toHaveTextContent("Search title");
    });

    it("should refuse to submit a mapping missing a required field", async () => {
        const harness = renderSearching();

        await openNewMappingDialog();
        setDialogText("config-custom-mapping-from", "only the input");
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        expect(
            screen.getByTestId("config-custom-mapping-dialog"),
        ).toBeVisible();
        expect(screen.getAllByText("This field is required")).toHaveLength(2);
        expect(mappingsOf(harness)).toEqual([]);
    });

    it("should discard edits to an existing entry on cancel", async () => {
        const stored = {
            affectedValue: "QUERY",
            from: "old",
            matchAll: false,
            searchType: "SEARCH",
            to: "new",
        };
        const harness = renderSearching({
            values: configWith({customMappings: [stored]}),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(screen.getByTestId("config-custom-mapping-matchAll"));
        fireEvent.click(screen.getByTestId("config-custom-mapping-cancel"));

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-custom-mapping-dialog"),
            ).toBeNull(),
        );
        expect(mappingsOf(harness)).toEqual([stored]);
        expect(
            screen.getByTestId("config-custom-mapping-value-0-from"),
        ).toHaveTextContent("old");
    });

    it("should write edits back on submit and keep keys it has no vocabulary for", async () => {
        const stored = {
            affectedValue: "QUERY",
            from: "old",
            matchAll: false,
            searchType: "SEARCH",
            somethingNewer: 42,
            to: "new",
        };
        const harness = renderSearching({
            values: configWith({customMappings: [stored]}),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(screen.getByTestId("config-custom-mapping-matchAll"));
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        await waitFor(() =>
            expect(mappingsOf(harness)[0]).toMatchObject({from: "edited"}),
        );
        expect(mappingsOf(harness)[0]).toEqual({
            affectedValue: "QUERY",
            from: "edited",
            matchAll: true,
            searchType: "SEARCH",
            somethingNewer: 42,
            to: "new",
        });
    });

    it("should remove an entry", () => {
        const harness = renderSearching({
            values: configWith({
                customMappings: [
                    {
                        affectedValue: "QUERY",
                        from: "a",
                        matchAll: true,
                        searchType: "SEARCH",
                        to: "b",
                    },
                ],
            }),
        });

        fireEvent.click(
            screen.getByTestId(`config-repeat-remove-${MAPPINGS}-0`),
        );

        expect(mappingsOf(harness)).toEqual([]);
        expect(harness.form.formState.isDirty).toBe(true);
    });

    it("should hide the search type for a result-title mapping and keep its value", async () => {
        const harness = renderSearching();

        await openNewMappingDialog();
        await selectOption("Search type", "Movie");
        await selectOption("Affected value", "Result title");

        expect(
            screen.queryByTestId("config-custom-mapping-searchType"),
        ).toBeNull();
        setDialogText("config-custom-mapping-from", "a");
        setDialogText("config-custom-mapping-to", "b");
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        await waitFor(() => expect(mappingsOf(harness)).toHaveLength(1));
        expect(mappingsOf(harness)[0]).toMatchObject({
            affectedValue: "RESULT_TITLE",
            searchType: "MOVIE",
        });
        // The summary omits it, as legacy's hidden row does.
        expect(
            screen.queryByTestId("config-custom-mapping-value-0-searchType"),
        ).toBeNull();
    });
});

describe("F-CONFIG-SEARCHING custom mapping test round trip", () => {
    async function openWithPattern(
        fetchMock: ReturnType<typeof vi.fn>,
    ): Promise<Harness> {
        const harness = renderSearching({fetchMock});
        await openNewMappingDialog();
        await fillMapping({
            affectedValue: "Query",
            from: "{show:.*} s{s:[0-9]+}",
            to: "{show} S{s}",
        });
        return harness;
    }

    it("should report empty example input without a request", async () => {
        const fetchMock = vi.fn<typeof fetch>();
        await openWithPattern(fetchMock);

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("Empty example data"),
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should show the produced output on a match", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            jsonResponse({error: null, match: true, output: "my show S1"}),
        );
        const harness = await openWithPattern(fetchMock);
        setDialogText("config-custom-mapping-exampleInput", "my show s1");

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("my show S1"),
        );
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("internalapi/customMapping/test");
        expect(init.method).toBe("POST");
        expect(JSON.parse(String(init.body))).toEqual({
            exampleInput: "my show s1",
            mapping: {
                affectedValue: "QUERY",
                from: "{show:.*} s{s:[0-9]+}",
                matchAll: true,
                searchType: null,
                to: "{show} S{s}",
            } satisfies CustomMappingValues,
        });
        // Testing changes nothing about the configuration.
        expect(mappingsOf(harness)).toEqual([]);
        expect(harness.form.formState.isDirty).toBe(false);
    });

    it("should report that the input does not match", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            jsonResponse({error: null, match: false, output: null}),
        );
        await openWithPattern(fetchMock);
        setDialogText("config-custom-mapping-exampleInput", "nothing like it");

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("Input does not match example"),
        );
    });

    it("should show the server's error text for an invalid mapping", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            jsonResponse({
                error: "Illegal repetition",
                match: false,
                output: null,
            }),
        );
        await openWithPattern(fetchMock);
        setDialogText("config-custom-mapping-exampleInput", "my show s1");

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("Illegal repetition"),
        );
    });

    it("should report a failed request instead of a wrong verdict", async () => {
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response("", {status: 500}),
        );
        await openWithPattern(fetchMock);
        setDialogText("config-custom-mapping-exampleInput", "my show s1");

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("Unable to test the mapping"),
        );
    });

    it("should refuse to send a test without an input pattern", async () => {
        const fetchMock = vi.fn<typeof fetch>();
        renderSearching({fetchMock});
        await openNewMappingDialog();
        setDialogText("config-custom-mapping-exampleInput", "my show s1");

        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await waitFor(() =>
            expect(
                screen.getByTestId("config-custom-mapping-result"),
            ).toHaveValue("Empty input pattern"),
        );
        expect(fetchMock).not.toHaveBeenCalled();
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
