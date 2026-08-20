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

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {ExternalToolsConfigTab} from "./ExternalToolsConfigTab";
import {
    EXTERNAL_TOOL_PRESETS,
    newExternalToolDraft,
    type ExternalToolValues,
} from "./externalToolsSettings";

const LIST = "externalTools-externalTools";
const DRAFT = "config-input-externalTools-externalToolDraft";
const DIALOG = "config-external-tool-dialog";

const RADARR: ExternalToolValues = {
    additionalParameters: "",
    addDisabledIndexers: false,
    animeCategories: "",
    apiKey: "radarr-key",
    categories: "2000",
    configureForTorrents: false,
    configureForUsenet: true,
    discographySeedTime: "",
    earlyDownloadLimit: "",
    enableAutomaticSearch: true,
    enableInteractiveSearch: true,
    enableRss: true,
    enabled: true,
    host: "http://localhost:7878",
    minimumSeeders: "1",
    name: "My Radarr",
    nzbhydraHost: "http://host.docker.internal:5076",
    nzbhydraName: "NZBHydra2",
    priority: 25,
    removeYearFromSearchString: false,
    seasonPackSeedTime: "",
    seedRatio: "",
    seedTime: "",
    syncType: "PER_INDEXER",
    type: "RADARR",
    useHydraPriorities: true,
};

const SONARR: ExternalToolValues = {
    ...RADARR,
    apiKey: "sonarr-key",
    categories: "5030,5040",
    host: "http://localhost:8989",
    name: "A Sonarr",
    type: "SONARR",
};

type Harness = {form: UseFormReturn<ConfigValues>};

function configWith(
    tools: ExternalToolValues[] = [],
    syncOnConfigChange = false,
): ConfigValues {
    return {externalTools: {externalTools: tools, syncOnConfigChange}};
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
        const isDirty = form.formState.isDirty;
        return (
            <ThemeProvider theme={createHydraTheme("dark")}>
                <DialogProvider>
                    <ToastProvider>
                        <FormProvider {...form}>
                            <ShowAdvancedContext.Provider value={showAdvanced}>
                                <span data-testid="form-dirty">
                                    {String(isDirty)}
                                </span>
                                <ExternalToolsConfigTab transport={transport} />
                            </ShowAdvancedContext.Provider>
                        </FormProvider>
                    </ToastProvider>
                </DialogProvider>
            </ThemeProvider>
        );
    }
    render(<Host />);
    return harness;
}

function toolsOf(harness: Harness): ExternalToolValues[] {
    return (harness.form.getValues().externalTools as Record<string, unknown>)
        .externalTools as ExternalToolValues[];
}

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"content-type": "application/json"},
        status: 200,
    });
}

/** A backend that accepts the connection test and the configure request. */
function acceptEverything(): ReturnType<typeof vi.fn> {
    return vi.fn<typeof fetch>((input) =>
        Promise.resolve(
            jsonResponse(
                String(input).includes("testConnection")
                    ? {message: "Connection successful", successful: true}
                    : true,
            ),
        ),
    );
}

function calledPaths(fetchMock: ReturnType<typeof vi.fn>): string[] {
    return fetchMock.mock.calls.map((call) =>
        new URL(String(call[0])).pathname.replace(
            "/internalapi/externalTools/",
            "",
        ),
    );
}

function requestBody(
    fetchMock: ReturnType<typeof vi.fn>,
    index: number,
): Record<string, unknown> {
    const [, init] = fetchMock.mock.calls[index] as [string, RequestInit];
    return JSON.parse(init.body as string) as Record<string, unknown>;
}

async function addFromPreset(preset: string): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-add-${LIST}`));
    fireEvent.click(
        await screen.findByTestId(`config-repeat-add-option-${LIST}-${preset}`),
    );
    await screen.findByTestId(DIALOG);
}

async function openEntry(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-edit-${LIST}-${index}`));
    await screen.findByTestId(DIALOG);
}

function submitDialog(): void {
    fireEvent.click(screen.getByTestId(`${DIALOG}-submit`));
}

function type(field: string, value: string): void {
    fireEvent.change(screen.getByTestId(`${DRAFT}-${field}`), {
        target: {value},
    });
}

async function chooseOption(combobox: string, option: string): Promise<void> {
    fireEvent.mouseDown(screen.getByRole("combobox", {name: combobox}));
    fireEvent.click(await screen.findByRole("option", {name: option}));
}

afterEach(() => {
    cleanup();
});

describe("External tools tab shell", () => {
    it("renders the sync switch, the empty state, and both actions", () => {
        renderTab();

        expect(
            screen.getByTestId(
                "config-setting-externalTools-syncOnConfigChange",
            ),
        ).toBeVisible();
        expect(
            screen.getByRole("switch", {name: "Sync on config change"}),
        ).not.toBeChecked();
        expect(
            screen.getByText(
                "Automatically sync indexers to external tools when configuration is saved",
            ),
        ).toBeVisible();
        expect(
            screen.getByRole("heading", {
                name: "No external tools configured",
            }),
        ).toBeVisible();
        expect(
            screen.getByText(/Use the "Add external tool" button below/),
        ).toBeVisible();
        expect(screen.getByTestId(`config-repeat-add-${LIST}`)).toBeVisible();
        expect(
            screen.getByTestId("config-external-tools-sync-all"),
        ).toBeVisible();
    });

    it("offers legacy's four presets plus Custom", async () => {
        renderTab();

        fireEvent.click(screen.getByTestId(`config-repeat-add-${LIST}`));

        for (const preset of EXTERNAL_TOOL_PRESETS) {
            expect(
                await screen.findByTestId(
                    `config-repeat-add-option-${LIST}-${preset.value}`,
                ),
            ).toHaveTextContent(preset.label);
        }
    });

    it("shows the configured tools ordered by name and hides the empty state", () => {
        renderTab({values: configWith([RADARR, SONARR])});

        expect(screen.queryByTestId("config-external-tools-empty")).toBeNull();
        const headings = screen
            .getAllByRole("heading", {level: 3})
            .map((heading) => heading.textContent);
        expect(headings).toEqual(["A Sonarr", "My Radarr"]);
        // The test id keeps the *configuration* index, not the display order.
        expect(
            screen.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toHaveTextContent("My Radarr");
        expect(
            screen.getByTestId("config-external-tool-value-0-host"),
        ).toHaveTextContent("http://localhost:7878");
    });
});

describe("External tools tab presets", () => {
    for (const preset of EXTERNAL_TOOL_PRESETS) {
        it(`seeds a new ${preset.label} entry with legacy's defaults`, async () => {
            const fetchMock = acceptEverything();
            const harness = renderTab({fetchMock});

            await addFromPreset(preset.value);
            if (preset.value === "CUSTOM") {
                // Legacy's Custom entry starts without a name, type, or host,
                // all three of which are required before it can be submitted.
                type("name", "Custom tool");
                await chooseOption("Type", "Sonarr");
                type("host", "http://localhost:8989");
            }
            submitDialog();

            await waitFor(() => expect(toolsOf(harness)).toHaveLength(1));
            expect(toolsOf(harness)[0]).toEqual({
                ...newExternalToolDraft(preset.value),
                ...(preset.value === "CUSTOM"
                    ? {
                          categories: "5030,5040",
                          host: "http://localhost:8989",
                          name: "Custom tool",
                          type: "SONARR",
                      }
                    : {}),
                // `externalToolEntry` completes the boolean primitives legacy's
                // defaults do not seed.
                removeYearFromSearchString: false,
            });
        });
    }

    it("rewrites the categories when the type changes, and only then", async () => {
        renderTab({fetchMock: acceptEverything()});

        await addFromPreset("SONARR");
        expect(screen.getByTestId(`${DRAFT}-categories`)).toHaveValue(
            "5030,5040",
        );

        await chooseOption("Type", "Lidarr");
        await waitFor(() =>
            expect(screen.getByTestId(`${DRAFT}-categories`)).toHaveValue(
                "3000",
            ),
        );

        // Editing the categories by hand is not undone by an unrelated change.
        type("categories", "1234");
        type("name", "Renamed");
        expect(screen.getByTestId(`${DRAFT}-categories`)).toHaveValue("1234");
    });

    it("keeps an existing entry's categories when it is opened", async () => {
        renderTab({values: configWith([{...RADARR, categories: "2010"}])});

        await openEntry(0);

        expect(screen.getByTestId(`${DRAFT}-categories`)).toHaveValue("2010");
    });
});

describe("External tools tab field set", () => {
    it("renders every always-visible field of getExternalToolBoxFields", async () => {
        renderTab({values: configWith([RADARR])});
        await openEntry(0);

        for (const field of [
            "enabled",
            "name",
            "host",
            "apiKey",
            "nzbhydraName",
            "nzbhydraHost",
            "configureForUsenet",
            "configureForTorrents",
            "addDisabledIndexers",
            "useHydraPriorities",
            "enableRss",
            "enableAutomaticSearch",
            "enableInteractiveSearch",
            "categories",
            "additionalParameters",
        ]) {
            expect(screen.getByTestId(`${DRAFT}-${field}`)).toBeInTheDocument();
        }
        expect(screen.getByRole("combobox", {name: "Type"})).toBeVisible();
        expect(screen.getByRole("combobox", {name: /Sync Type/})).toBeVisible();
        expect(
            screen.getByText("Unique name for this external tool instance"),
        ).toBeVisible();
        expect(
            screen.getByText(
                "URL with scheme and port (e.g., http://localhost:8989)",
            ),
        ).toBeVisible();
    });

    it("hides the advanced rows until the advanced toggle is on", async () => {
        renderTab({showAdvanced: false, values: configWith([RADARR])});
        await openEntry(0);

        expect(screen.getByTestId(`${DRAFT}-name`)).toBeVisible();
        for (const field of [
            "addDisabledIndexers",
            "categories",
            "additionalParameters",
            "removeYearFromSearchString",
        ]) {
            expect(screen.queryByTestId(`${DRAFT}-${field}`)).toBeNull();
        }
    });

    it("shows Sonarr's anime categories and Radarr's year switch only for their type", async () => {
        renderTab({values: configWith([SONARR, RADARR])});

        await openEntry(0);
        expect(screen.getByTestId(`${DRAFT}-animeCategories`)).toBeVisible();
        expect(
            screen.queryByTestId(`${DRAFT}-removeYearFromSearchString`),
        ).toBeNull();
        expect(screen.queryByTestId(`${DRAFT}-earlyDownloadLimit`)).toBeNull();
        fireEvent.click(screen.getByTestId(`${DIALOG}-cancel`));
        await waitFor(() => expect(screen.queryByTestId(DIALOG)).toBeNull());

        await openEntry(1);
        expect(
            screen.getByTestId(`${DRAFT}-removeYearFromSearchString`),
        ).toBeInTheDocument();
        expect(screen.queryByTestId(`${DRAFT}-animeCategories`)).toBeNull();
    });

    it("shows the early download limit for Lidarr and Readarr", async () => {
        renderTab({values: configWith([{...RADARR, type: "LIDARR"}])});
        await openEntry(0);

        expect(screen.getByTestId(`${DRAFT}-earlyDownloadLimit`)).toBeVisible();
        expect(screen.queryByTestId(`${DRAFT}-animeCategories`)).toBeNull();
    });

    it("reveals the seeding fields only while torrents are configured", async () => {
        renderTab({values: configWith([SONARR])});
        await openEntry(0);

        for (const field of ["minimumSeeders", "seedRatio", "seedTime"]) {
            expect(screen.queryByTestId(`${DRAFT}-${field}`)).toBeNull();
        }

        fireEvent.click(screen.getByTestId(`${DRAFT}-configureForTorrents`));

        for (const field of [
            "minimumSeeders",
            "seedRatio",
            "seedTime",
            // Sonarr's own torrent field; Lidarr/Readarr get the discography
            // one instead.
            "seasonPackSeedTime",
        ]) {
            expect(
                await screen.findByTestId(`${DRAFT}-${field}`),
            ).toBeInTheDocument();
        }
        expect(screen.queryByTestId(`${DRAFT}-discographySeedTime`)).toBeNull();
    });

    it("shows the discography seed time for a torrent-syncing Readarr", async () => {
        renderTab({
            values: configWith([
                {...RADARR, configureForTorrents: true, type: "READARR"},
            ]),
        });
        await openEntry(0);

        expect(
            screen.getByTestId(`${DRAFT}-discographySeedTime`),
        ).toBeVisible();
        expect(screen.queryByTestId(`${DRAFT}-seasonPackSeedTime`)).toBeNull();
    });

    it("hides the default priority only for a per-indexer sync using Hydra priorities", async () => {
        renderTab({values: configWith([RADARR])});
        await openEntry(0);

        expect(screen.queryByTestId(`${DRAFT}-priority`)).toBeNull();

        fireEvent.click(screen.getByTestId(`${DRAFT}-useHydraPriorities`));
        expect(await screen.findByTestId(`${DRAFT}-priority`)).toHaveValue(25);

        fireEvent.click(screen.getByTestId(`${DRAFT}-useHydraPriorities`));
        await waitFor(() =>
            expect(screen.queryByTestId(`${DRAFT}-priority`)).toBeNull(),
        );

        await chooseOption("Sync Type", "Single entry for all indexers");
        expect(await screen.findByTestId(`${DRAFT}-priority`)).toBeVisible();
    });
});

describe("External tools tab submit sequence", () => {
    it("tests the connection first and only then configures the tool", async () => {
        const fetchMock = acceptEverything();
        const harness = renderTab({fetchMock});

        await addFromPreset("RADARR");
        type("apiKey", "a-key");
        submitDialog();

        await waitFor(() => expect(toolsOf(harness)).toHaveLength(1));
        expect(calledPaths(fetchMock)).toEqual(["testConnection", "configure"]);
        expect(screen.queryByTestId(DIALOG)).toBeNull();
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
        expect(
            screen.getByText("Successfully configured NZBHydra in Radarr"),
        ).toBeVisible();
    });

    it("posts a complete AddRequest to both endpoints", async () => {
        const fetchMock = acceptEverything();
        renderTab({fetchMock});

        await addFromPreset("SONARR");
        type("apiKey", "a-key");
        submitDialog();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        for (const index of [0, 1]) {
            const body = requestBody(fetchMock, index);
            for (const property of [
                "configureForUsenet",
                "configureForTorrents",
                "enableRss",
                "enableAutomaticSearch",
                "enableInteractiveSearch",
                "removeYearFromSearchString",
                "addUsenet",
                "addTorrent",
                "addDisabledIndexers",
                "useHydraPriorities",
            ]) {
                expect(typeof body[property], property).toBe("boolean");
            }
            expect(body.externalTool).toBe("Sonarr");
            expect(body.xdarrHost).toBe("http://localhost:8989");
            expect(body.xdarrApiKey).toBe("a-key");
        }
        // A test never writes; the configure step carries the entry's own sync
        // type.
        expect(requestBody(fetchMock, 0).addType).toBe("DELETE_ONLY");
        expect(requestBody(fetchMock, 1).addType).toBe("PER_INDEXER");
    });

    it("sends addType SINGLE for a single-entry sync", async () => {
        const fetchMock = acceptEverything();
        renderTab({
            fetchMock,
            values: configWith([{...RADARR, syncType: "SINGLE"}]),
        });

        await openEntry(0);
        submitDialog();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        expect(calledPaths(fetchMock)).toEqual(["configure"]);
        expect(requestBody(fetchMock, 0).addType).toBe("SINGLE");
    });

    it("keeps the dialog open and configures nothing when the connection fails", async () => {
        const fetchMock = vi.fn<typeof fetch>(() =>
            Promise.resolve(
                jsonResponse({
                    message: "Connection failed: no route to host",
                    successful: false,
                }),
            ),
        );
        const harness = renderTab({fetchMock});

        await addFromPreset("RADARR");
        type("apiKey", "a-key");
        submitDialog();

        expect(
            await screen.findByText(
                "Connection test failed: Connection failed: no route to host",
            ),
        ).toBeVisible();
        expect(calledPaths(fetchMock)).toEqual(["testConnection"]);
        expect(screen.getByTestId(DIALOG)).toBeVisible();
        expect(toolsOf(harness)).toEqual([]);
    });

    it("keeps the dialog open when the tool refuses to be configured", async () => {
        const fetchMock = vi.fn<typeof fetch>((input) =>
            Promise.resolve(
                jsonResponse(
                    String(input).includes("testConnection")
                        ? {message: "Connection successful", successful: true}
                        : false,
                ),
            ),
        );
        const harness = renderTab({fetchMock});

        await addFromPreset("RADARR");
        type("apiKey", "a-key");
        submitDialog();

        expect(
            await screen.findByText("Failed to configure NZBHydra in Radarr"),
        ).toBeVisible();
        expect(calledPaths(fetchMock)).toEqual(["testConnection", "configure"]);
        expect(screen.getByTestId(DIALOG)).toBeVisible();
        expect(toolsOf(harness)).toEqual([]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("reports the server's message when the configure request fails", async () => {
        const fetchMock = vi.fn<typeof fetch>((input) =>
            String(input).includes("testConnection")
                ? Promise.resolve(
                      jsonResponse({
                          message: "Connection successful",
                          successful: true,
                      }),
                  )
                : Promise.resolve(
                      new Response(JSON.stringify({message: "Boom"}), {
                          headers: {"content-type": "application/json"},
                          status: 500,
                      }),
                  ),
        );
        const harness = renderTab({fetchMock});

        await addFromPreset("RADARR");
        type("apiKey", "a-key");
        submitDialog();

        expect(
            await screen.findByText(
                "Error configuring NZBHydra in Radarr: Boom",
            ),
        ).toBeVisible();
        expect(toolsOf(harness)).toEqual([]);
    });

    it("skips the connection test for an untouched existing entry", async () => {
        const fetchMock = acceptEverything();
        const harness = renderTab({
            fetchMock,
            values: configWith([RADARR]),
        });

        await openEntry(0);
        type("name", "Renamed Radarr");
        submitDialog();

        await waitFor(() =>
            expect(toolsOf(harness)[0].name).toBe("Renamed Radarr"),
        );
        expect(calledPaths(fetchMock)).toEqual(["configure"]);
    });

    it("re-tests the connection when the host or the API key changed", async () => {
        const fetchMock = acceptEverything();
        renderTab({fetchMock, values: configWith([RADARR])});

        await openEntry(0);
        type("host", "http://elsewhere:7878");
        submitDialog();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
        expect(calledPaths(fetchMock)).toEqual(["testConnection", "configure"]);
    });

    it("refuses to send anything for an invalid entry", async () => {
        const fetchMock = acceptEverything();
        const harness = renderTab({
            fetchMock,
            values: configWith([RADARR]),
        });

        await addFromPreset("CUSTOM");
        submitDialog();

        expect(
            (await screen.findAllByText("This field is required")).length,
        ).toBeGreaterThan(0);
        expect(
            screen.getByText("Config invalid. Please check your settings."),
        ).toBeVisible();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(toolsOf(harness)).toHaveLength(1);

        // A name another tool already carries is rejected the same way.
        type("name", "My Radarr");
        type("host", "http://localhost:7878");
        await chooseOption("Type", "Radarr");
        submitDialog();

        expect(
            await screen.findByText('External tool "My Radarr" already exists'),
        ).toBeVisible();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("blocks every way out of the dialog while a request is in flight", async () => {
        let release: (value: Response) => void = () => undefined;
        const fetchMock = vi.fn<typeof fetch>((input) =>
            String(input).includes("testConnection")
                ? new Promise<Response>((resolve) => {
                      release = resolve;
                  })
                : Promise.resolve(jsonResponse(true)),
        );
        const harness = renderTab({fetchMock, values: configWith([RADARR])});

        await openEntry(0);
        type("host", "http://elsewhere:7878");
        submitDialog();

        expect(await screen.findByTestId(`${DIALOG}-busy`)).toBeVisible();
        for (const action of ["cancel", "reset", "delete", "submit", "test"]) {
            expect(screen.getByTestId(`${DIALOG}-${action}`)).toBeDisabled();
        }
        fireEvent.click(screen.getByTestId(`${DIALOG}-cancel`));
        expect(screen.getByTestId(DIALOG)).toBeVisible();

        release(
            jsonResponse({message: "Connection successful", successful: true}),
        );
        await waitFor(() =>
            expect(screen.queryByTestId(`${DIALOG}-busy`)).toBeNull(),
        );
        expect(toolsOf(harness)).toHaveLength(1);
    });
});

describe("External tools tab standalone connection test", () => {
    it("reports success without touching the configuration", async () => {
        const fetchMock = acceptEverything();
        const harness = renderTab({
            fetchMock,
            values: configWith([RADARR]),
        });

        await openEntry(0);
        type("name", "Typed but not submitted");
        fireEvent.click(screen.getByTestId(`${DIALOG}-test`));

        expect(
            await screen.findByText("Connection test successful"),
        ).toBeVisible();
        expect(calledPaths(fetchMock)).toEqual(["testConnection"]);
        expect(requestBody(fetchMock, 0).addType).toBe("DELETE_ONLY");
        expect(toolsOf(harness)[0].name).toBe("My Radarr");
        expect(screen.getByTestId(DIALOG)).toBeVisible();
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("reports the server's failure message", async () => {
        const fetchMock = vi.fn<typeof fetch>(() =>
            Promise.resolve(
                jsonResponse({
                    message: "Invalid response: missing 'current' field",
                    successful: false,
                }),
            ),
        );
        renderTab({fetchMock, values: configWith([RADARR])});

        await openEntry(0);
        fireEvent.click(screen.getByTestId(`${DIALOG}-test`));

        expect(
            await screen.findByText(
                "Connection test failed: Invalid response: missing 'current' field",
            ),
        ).toBeVisible();
    });

    it("is unavailable until the entry has a host and an API key", async () => {
        renderTab();

        await addFromPreset("SONARR");
        expect(screen.getByTestId(`${DIALOG}-test`)).toBeDisabled();

        type("apiKey", "a-key");
        await waitFor(() =>
            expect(screen.getByTestId(`${DIALOG}-test`)).toBeEnabled(),
        );
    });
});

describe("External tools tab transaction", () => {
    it("discards a cancelled new entry", async () => {
        const harness = renderTab();

        await addFromPreset("RADARR");
        type("name", "Typed but cancelled");
        fireEvent.click(screen.getByTestId(`${DIALOG}-cancel`));

        await waitFor(() => expect(screen.queryByTestId(DIALOG)).toBeNull());
        expect(toolsOf(harness)).toEqual([]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("discards a cancelled edit of an existing entry", async () => {
        const harness = renderTab({values: configWith([RADARR])});

        await openEntry(0);
        type("host", "http://elsewhere:7878");
        type("apiKey", "another-key");
        fireEvent.click(screen.getByTestId(`${DIALOG}-cancel`));

        await waitFor(() => expect(screen.queryByTestId(DIALOG)).toBeNull());
        expect(toolsOf(harness)[0]).toEqual(RADARR);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("resets the dialog's own edits without touching the form", async () => {
        const harness = renderTab({values: configWith([RADARR])});

        await openEntry(0);
        type("name", "Renamed");
        expect(screen.getByTestId(`${DRAFT}-name`)).toHaveValue("Renamed");

        fireEvent.click(screen.getByTestId(`${DIALOG}-reset`));
        await waitFor(() =>
            expect(screen.getByTestId(`${DRAFT}-name`)).toHaveValue(
                "My Radarr",
            ),
        );
        expect(toolsOf(harness)[0]).toEqual(RADARR);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("deletes an entry from the dialog and offers no delete for a new one", async () => {
        const harness = renderTab({values: configWith([RADARR, SONARR])});

        await addFromPreset("RADARR");
        expect(screen.queryByTestId(`${DIALOG}-delete`)).toBeNull();
        fireEvent.click(screen.getByTestId(`${DIALOG}-cancel`));
        await waitFor(() => expect(screen.queryByTestId(DIALOG)).toBeNull());

        await openEntry(0);
        fireEvent.click(screen.getByTestId(`${DIALOG}-delete`));

        await waitFor(() => expect(toolsOf(harness)).toHaveLength(1));
        expect(toolsOf(harness)[0]).toEqual(SONARR);
        expect(screen.queryByTestId(DIALOG)).toBeNull();
    });

    it("removes an entry straight from its row", async () => {
        const harness = renderTab({values: configWith([RADARR, SONARR])});

        fireEvent.click(screen.getByTestId(`config-repeat-remove-${LIST}-1`));

        await waitFor(() => expect(toolsOf(harness)).toHaveLength(1));
        expect(toolsOf(harness)[0]).toEqual(RADARR);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("edits the row it was opened from, not the first one shown", async () => {
        const fetchMock = acceptEverything();
        // "A Sonarr" sorts first but is index 1 in the configuration.
        const harness = renderTab({
            fetchMock,
            values: configWith([RADARR, SONARR]),
        });

        await openEntry(1);
        expect(screen.getByTestId(`${DRAFT}-name`)).toHaveValue("A Sonarr");
        type("name", "A Sonarr renamed");
        submitDialog();

        await waitFor(() =>
            expect(toolsOf(harness)[1].name).toBe("A Sonarr renamed"),
        );
        expect(toolsOf(harness)[0]).toEqual(RADARR);
    });
});

describe("External tools tab sync all", () => {
    const syncing = (result: unknown, status = 200) =>
        vi.fn<typeof fetch>(() =>
            Promise.resolve(
                new Response(JSON.stringify(result), {
                    headers: {"content-type": "application/json"},
                    status,
                }),
            ),
        );

    it("reports a complete success", async () => {
        const fetchMock = syncing({
            failureCount: 0,
            messages: [],
            successCount: 2,
        });
        renderTab({fetchMock, values: configWith([RADARR])});

        fireEvent.click(screen.getByTestId("config-external-tools-sync-all"));

        expect(
            await screen.findByText(
                "Successfully synced to 2 external tool(s)",
            ),
        ).toBeVisible();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(new URL(url).pathname).toBe(
            "/internalapi/externalTools/syncAll",
        );
        expect(init.method).toBe("POST");
    });

    it("reports a complete failure", async () => {
        renderTab({
            fetchMock: syncing({
                failureCount: 3,
                messages: [],
                successCount: 0,
            }),
            values: configWith([RADARR]),
        });

        fireEvent.click(screen.getByTestId("config-external-tools-sync-all"));

        expect(
            await screen.findByText("Failed to sync to all 3 external tool(s)"),
        ).toBeVisible();
    });

    it("reports a partial failure with both counts", async () => {
        renderTab({
            fetchMock: syncing({
                failureCount: 1,
                messages: [],
                successCount: 2,
            }),
            values: configWith([RADARR]),
        });

        fireEvent.click(screen.getByTestId("config-external-tools-sync-all"));

        expect(
            await screen.findByText("Synced to 2 tool(s), 1 failed"),
        ).toBeVisible();
    });

    it("reports a transport failure", async () => {
        renderTab({
            fetchMock: syncing({message: "Nope"}, 500),
            values: configWith([RADARR]),
        });

        fireEvent.click(screen.getByTestId("config-external-tools-sync-all"));

        expect(
            await screen.findByText("Error syncing to external tools: Nope"),
        ).toBeVisible();
    });
});
