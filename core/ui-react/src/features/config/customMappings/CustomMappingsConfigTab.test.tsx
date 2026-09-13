import {ThemeProvider} from "@mui/material";
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
    within,
} from "@testing-library/react";
import {useEffect} from "react";
import {FormProvider, useForm, type UseFormReturn} from "react-hook-form";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {ShowAdvancedContext} from "../advancedFields";
import {CustomMappingsConfigTab} from "./CustomMappingsConfigTab";

const MAPPINGS = "searching-customMappings";

type Harness = {form: UseFormReturn<ConfigValues>};

function configWith(customMappings: unknown[] = []): ConfigValues {
    return {searching: {customMappings}};
}

function renderTab({
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
                        <CustomMappingsConfigTab transport={transport} />
                    </ShowAdvancedContext.Provider>
                </FormProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function mappingsOf(harness: Harness): Record<string, unknown>[] {
    return (harness.form.getValues().searching as Record<string, unknown>)
        .customMappings as Record<string, unknown>[];
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

function storedMapping(
    overrides: Record<string, unknown> = {},
): Record<string, unknown> {
    return {
        affectedValue: "QUERY",
        from: "old",
        matchAll: false,
        searchType: "SEARCH",
        to: "new",
        ...overrides,
    };
}

function resultRow(line: number): HTMLElement {
    return screen.getByTestId(`config-custom-mapping-result-${line}`);
}

function rowTexts(line: number): string[] {
    return within(resultRow(line))
        .getAllByRole("cell")
        .map((cell) => cell.textContent ?? "");
}

afterEach(cleanup);

describe("F-CONFIG-SEARCHING custom mappings tab", () => {
    it("should render the list directly, with no advanced gate", () => {
        // FM-195's one deliberate departure from FM-131: the section is not
        // behind an advanced expander here, because a whole tab hidden while
        // the global toggle is off could not be reached at all.
        renderTab({showAdvanced: false});

        expect(screen.getByTestId("config-custom-mappings")).toBeVisible();
        expect(screen.getByTestId(`config-repeat-${MAPPINGS}`)).toBeVisible();
        expect(
            screen.getByTestId(`config-repeat-add-${MAPPINGS}`),
        ).toBeVisible();
        expect(
            screen.queryByTestId(
                "config-advanced-expander-custom mappings of queries, search titles and result titles",
            ),
        ).toBeNull();
    });

    it("should explain the ordering rule under the list", () => {
        renderTab();

        expect(
            screen.getByText(
                "Mappings run top to bottom. A whole-string mapping that matches stops the list.",
            ),
        ).toBeVisible();
    });
});

describe("F-CONFIG-SEARCHING custom mapping transaction", () => {
    it("should not add an entry when the dialog is cancelled", async () => {
        const harness = renderTab();

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
        const harness = renderTab();

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
            // FM-194's field, true for a new mapping as the Java initializer
            // is.
            enabled: true,
            examples: [],
            from: "{show:.*} s{s:[0-9]+}",
            // Legacy's `defaultModel` starts a new mapping as a whole-string
            // match.
            matchAll: true,
            name: null,
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
        const harness = renderTab();

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
        const stored = storedMapping();
        const harness = renderTab({values: configWith([stored])});

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
        const stored = storedMapping({somethingNewer: 42});
        const harness = renderTab({values: configWith([stored])});

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
            enabled: true,
            examples: [],
            from: "edited",
            matchAll: true,
            name: null,
            searchType: "SEARCH",
            somethingNewer: 42,
            to: "new",
        });
    });

    it("should remove an entry", () => {
        const harness = renderTab({values: configWith([storedMapping()])});

        fireEvent.click(
            screen.getByTestId(`config-repeat-remove-${MAPPINGS}-0`),
        );

        expect(mappingsOf(harness)).toEqual([]);
        expect(harness.form.formState.isDirty).toBe(true);
    });

    it("should drop a commit whose row was removed under the open dialog", async () => {
        // FM-191: the transaction guard `CustomMappingsSection` gained by
        // adopting `useListEditorTransaction`. Removing the first entry
        // shifts every following one, so the index this dialog captured now
        // names a different mapping; the delete invalidates the transaction's
        // token and the submit is dropped. Without the token the same submit
        // writes the second mapping's draft onto the third one.
        //
        // The interleaving is driven here rather than in a browser on
        // purpose: `CustomMappingDialog` is synchronous and MUI's backdrop
        // covers the Remove buttons, so nothing an admin can do today opens
        // this window. The guard exists because "the submit path never grows
        // an await" is not a property this section can enforce on its own.
        const first = storedMapping({from: "first", to: "one"});
        const second = storedMapping({from: "second", to: "two"});
        const third = storedMapping({from: "third", to: "three"});
        const harness = renderTab({
            values: configWith([first, second, third]),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-1`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(
            screen.getByTestId(`config-repeat-remove-${MAPPINGS}-0`),
        );
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        // Both survivors are exactly what they were: the edit went nowhere
        // rather than onto the third mapping, which the captured index names
        // once the first one is gone.
        await waitFor(() =>
            expect(mappingsOf(harness)).toEqual([second, third]),
        );
        // A dropped commit closes nothing: the token is no longer this
        // transaction's to end, exactly as in the five sections FM-064's rule
        // came from. Cancel is what closes this dialog now.
        expect(
            screen.getByTestId("config-custom-mapping-dialog"),
        ).toBeInTheDocument();
    });

    it("should hide the search type for a result-title mapping and keep its value", async () => {
        const harness = renderTab();

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

describe("F-CONFIG-SEARCHING custom mapping list order and state", () => {
    const alpha = storedMapping({from: "alpha", name: "Alpha"});
    const beta = storedMapping({from: "beta", name: "Beta"});
    const gamma = storedMapping({from: "gamma", name: "Gamma"});

    it("should legend an entry by its name, and by its position when it has none", () => {
        renderTab({values: configWith([alpha, storedMapping()])});

        expect(
            screen.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toHaveTextContent("Alpha");
        expect(
            screen.getByTestId(`config-repeat-entry-${MAPPINGS}-1`),
        ).toHaveTextContent("Mapping 2");
    });

    it("should mark a disabled entry, and nothing else", () => {
        renderTab({
            values: configWith([
                storedMapping({enabled: false, name: "Off"}),
                storedMapping({enabled: true, name: "On"}),
                // Absent means enabled: FM-194's field defaults to true, and
                // every configuration written before it exists has no key.
                storedMapping({name: "Legacy"}),
            ]),
        });

        expect(
            screen.getByTestId("config-custom-mapping-disabled-0"),
        ).toHaveTextContent("Disabled");
        expect(
            screen.queryByTestId("config-custom-mapping-disabled-1"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-custom-mapping-disabled-2"),
        ).toBeNull();
    });

    it("should move an entry down, dirtying the form", () => {
        const harness = renderTab({values: configWith([alpha, beta, gamma])});

        fireEvent.click(screen.getByTestId(`config-repeat-down-${MAPPINGS}-0`));

        expect(mappingsOf(harness)).toEqual([beta, alpha, gamma]);
        expect(harness.form.formState.isDirty).toBe(true);
        expect(
            screen.getByTestId(`config-repeat-entry-${MAPPINGS}-0`),
        ).toHaveTextContent("Beta");
    });

    it("should move an entry up", () => {
        const harness = renderTab({values: configWith([alpha, beta, gamma])});

        fireEvent.click(screen.getByTestId(`config-repeat-up-${MAPPINGS}-2`));

        expect(mappingsOf(harness)).toEqual([alpha, gamma, beta]);
    });

    it("should disable the move buttons at the ends of the list", () => {
        renderTab({values: configWith([alpha, beta, gamma])});

        expect(
            screen.getByTestId(`config-repeat-up-${MAPPINGS}-0`),
        ).toBeDisabled();
        expect(
            screen.getByTestId(`config-repeat-down-${MAPPINGS}-0`),
        ).toBeEnabled();
        expect(
            screen.getByTestId(`config-repeat-up-${MAPPINGS}-2`),
        ).toBeEnabled();
        expect(
            screen.getByTestId(`config-repeat-down-${MAPPINGS}-2`),
        ).toBeDisabled();
    });

    it("should drop a commit whose row was moved under the open dialog", async () => {
        // A swap renames two indices at once, so a transaction opened over
        // either of them would write its draft onto the wrong mapping -- the
        // same reason `remove` invalidates, and the same guard.
        const harness = renderTab({values: configWith([alpha, beta, gamma])});

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(screen.getByTestId(`config-repeat-down-${MAPPINGS}-0`));
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        await waitFor(() =>
            expect(mappingsOf(harness)).toEqual([beta, alpha, gamma]),
        );
    });
});

describe("F-CONFIG-SEARCHING custom mapping examples and test table", () => {
    const TESTED = storedMapping({
        examples: ["my show s1", "nothing like it"],
        from: "{show:.*} s{s:[0-9]+}",
        name: "Season",
        to: "{show} S{s}",
    });

    function batchResponse(
        results: {
            chain?: {
                appliedIndices?: number[];
                error?: string | null;
                output?: string | null;
            };
            input: string;
            thisMapping?: {
                error?: string | null;
                match?: boolean;
                output?: string | null;
            } | null;
        }[],
    ): Response {
        return jsonResponse({results});
    }

    it("should load the saved examples, keep them across a submit, and drop blank lines", async () => {
        const harness = renderTab({values: configWith([TESTED])});

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        expect(
            screen.getByTestId("config-custom-mapping-examples"),
        ).toHaveValue("my show s1\nnothing like it");

        setDialogText(
            "config-custom-mapping-examples",
            "first line\n\n  second line  \n",
        );
        fireEvent.click(screen.getByTestId("config-custom-mapping-submit"));

        await waitFor(() =>
            expect(mappingsOf(harness)[0]).toMatchObject({
                examples: ["first line", "second line"],
            }),
        );
    });

    it("should answer every example line with this mapping's and the whole list's output", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            batchResponse([
                {
                    chain: {appliedIndices: [0], output: "my show S1"},
                    input: "my show s1",
                    thisMapping: {match: true, output: "my show S1"},
                },
                {
                    chain: {appliedIndices: [], output: "nothing like it"},
                    input: "nothing like it",
                    thisMapping: {match: false},
                },
            ]),
        );
        renderTab({fetchMock, values: configWith([TESTED])});

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await screen.findByTestId("config-custom-mapping-results");
        expect(rowTexts(0)).toEqual([
            "my show s1",
            "my show S1",
            "my show S1",
            "Season",
        ]);
        expect(rowTexts(1)).toEqual([
            "nothing like it",
            "No match",
            "nothing like it",
            "None",
        ]);

        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("internalapi/customMapping/test");
        expect(init.method).toBe("POST");
        expect(JSON.parse(String(init.body))).toEqual({
            examples: ["my show s1", "nothing like it"],
            mappingIndex: 0,
            mappings: [
                {
                    affectedValue: "QUERY",
                    enabled: true,
                    examples: ["my show s1", "nothing like it"],
                    from: "{show:.*} s{s:[0-9]+}",
                    matchAll: false,
                    name: "Season",
                    searchType: "SEARCH",
                    to: "{show} S{s}",
                },
            ],
        });
    });

    it("should send the whole edited list, so the chain reflects unsaved edits to other entries", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            batchResponse([
                {
                    chain: {appliedIndices: [0, 1], output: "done"},
                    input: "line",
                    thisMapping: {match: true, output: "half"},
                },
            ]),
        );
        renderTab({
            fetchMock,
            values: configWith([
                storedMapping({from: "first", name: "First"}),
                storedMapping({examples: ["line"], name: "Second"}),
            ]),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-1`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await screen.findByTestId("config-custom-mapping-results");
        const body = JSON.parse(
            String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body),
        ) as {mappingIndex: number; mappings: {from: string}[]};
        expect(body.mappingIndex).toBe(1);
        expect(body.mappings.map((mapping) => mapping.from)).toEqual([
            "first",
            "edited",
        ]);
        // Applied mappings are named the way the list legends them.
        expect(rowTexts(0)[3]).toBe("First, Second");
    });

    it("should show a per-line error in the red treatment errors already had", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            batchResponse([
                {
                    chain: {error: "Illegal repetition"},
                    input: "my show s1",
                    thisMapping: {error: "Illegal repetition", match: false},
                },
            ]),
        );
        renderTab({
            fetchMock,
            values: configWith([storedMapping({examples: ["my show s1"]})]),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await screen.findByTestId("config-custom-mapping-results");
        expect(rowTexts(0)[1]).toBe("Illegal repetition");
        expect(rowTexts(0)[2]).toBe("Illegal repetition");
        // The colour itself is visual evidence (the screenshot strip), not
        // something a jsdom assertion can carry; what is asserted here is that
        // the error text reaches both columns rather than being swallowed into
        // a blank cell that reads as "no match".
    });

    it("should report a mapping the server answered nothing for rather than reading it as no match", async () => {
        // FM-194 answers `thisMapping: null` for a `mappingIndex` outside the
        // list it was sent. The dialog never sends such an index, so this is
        // the defensive path, and it must not read as "your mapping does not
        // match".
        const fetchMock = vi.fn<typeof fetch>(async () =>
            batchResponse([
                {
                    chain: {appliedIndices: [], output: "line"},
                    input: "line",
                    thisMapping: null,
                },
            ]),
        );
        renderTab({
            fetchMock,
            values: configWith([storedMapping({examples: ["line"]})]),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await screen.findByTestId("config-custom-mapping-results");
        expect(rowTexts(0)[1]).toBe("Not evaluated");
    });

    it("should report empty example input without a request", async () => {
        const fetchMock = vi.fn<typeof fetch>();
        renderTab({fetchMock});

        await openNewMappingDialog();
        await fillMapping({affectedValue: "Query", from: "a", to: "b"});
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        expect(
            await screen.findByTestId("config-custom-mapping-error"),
        ).toHaveTextContent("Empty example data");
        expect(
            screen.queryByTestId("config-custom-mapping-results"),
        ).toBeNull();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should refuse to send a test without an input pattern", async () => {
        const fetchMock = vi.fn<typeof fetch>();
        renderTab({fetchMock});

        await openNewMappingDialog();
        setDialogText("config-custom-mapping-examples", "my show s1");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        expect(
            await screen.findByTestId("config-custom-mapping-error"),
        ).toHaveTextContent("Empty input pattern");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should refuse more than the endpoint's example limit instead of provoking its 400", async () => {
        const fetchMock = vi.fn<typeof fetch>();
        renderTab({fetchMock});

        await openNewMappingDialog();
        await fillMapping({affectedValue: "Query", from: "a", to: "b"});
        setDialogText(
            "config-custom-mapping-examples",
            Array.from({length: 201}, (_line, index) => `line ${index}`).join(
                "\n",
            ),
        );
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        expect(
            await screen.findByTestId("config-custom-mapping-error"),
        ).toHaveTextContent("At most 200 example lines can be tested at once");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should report a failed request instead of a wrong verdict", async () => {
        const fetchMock = vi.fn<typeof fetch>(
            async () => new Response("", {status: 500}),
        );
        renderTab({
            fetchMock,
            values: configWith([storedMapping({examples: ["my show s1"]})]),
        });

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        expect(
            await screen.findByTestId("config-custom-mapping-error"),
        ).toHaveTextContent("Unable to test the mapping");
    });

    it("should change nothing about the configuration by testing", async () => {
        const fetchMock = vi.fn<typeof fetch>(async () =>
            batchResponse([
                {
                    chain: {appliedIndices: [0], output: "my show S1"},
                    input: "my show s1",
                    thisMapping: {match: true, output: "my show S1"},
                },
            ]),
        );
        const harness = renderTab({fetchMock, values: configWith([TESTED])});

        fireEvent.click(screen.getByTestId(`config-repeat-edit-${MAPPINGS}-0`));
        await screen.findByTestId("config-custom-mapping-dialog");
        setDialogText("config-custom-mapping-from", "edited");
        fireEvent.click(screen.getByTestId("config-custom-mapping-test"));

        await screen.findByTestId("config-custom-mapping-results");
        expect(mappingsOf(harness)).toEqual([TESTED]);
        expect(harness.form.formState.isDirty).toBe(false);
    });
});
