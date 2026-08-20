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

import type {IndexerValues} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {UNCHANGED_SECRET_MARKER} from "../components";
import {IndexersConfigTab} from "./IndexersConfigTab";

const CATEGORIES = {
    categories: [{name: "All"}, {name: "Movies"}, {name: "TV"}],
    defaultCategory: "All",
};

function newznab(overrides: IndexerValues = {}): IndexerValues {
    return {
        allCapsChecked: true,
        apiKey: UNCHANGED_SECRET_MARKER,
        apiPath: "/api",
        attributeWhitelist: [],
        attributeWhitelistCategories: [],
        backend: "NEWZNAB",
        color: null,
        configComplete: true,
        customParameters: [],
        downloadLimit: null,
        enabledCategories: [],
        enabledForSearchSource: "BOTH",
        groupNames: [],
        hitLimit: null,
        hitLimitResetTime: null,
        host: "http://mock",
        loadLimitOnRandom: null,
        name: "Mock1",
        password: null,
        preselect: true,
        schedule: [],
        score: 0,
        searchModuleType: "NEWZNAB",
        showOnSearch: true,
        state: "ENABLED",
        supportedSearchIds: ["IMDB"],
        supportedSearchTypes: ["SEARCH"],
        timeout: null,
        userAgent: null,
        username: null,
        vipExpirationDate: null,
        ...overrides,
    };
}

type Harness = {form: UseFormReturn<ConfigValues>};

function configWith(indexers: IndexerValues[] = []): ConfigValues {
    return {categoriesConfig: CATEGORIES, indexers};
}

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"content-type": "application/json"},
        status,
    });
}

type Backend = {
    caps: unknown[];
    connection: unknown[];
    fetchMock: ReturnType<typeof vi.fn>;
};

/**
 * The two real endpoints the close sequence uses, plus the message poll. Each
 * handler receives the posted body so a test can assert what was sent.
 */
function backend({
    caps = () => jsonResponse([capsResult()]),
    connection = () => jsonResponse({message: null, successful: true}),
}: {
    caps?: (body: unknown) => Response;
    connection?: (body: unknown) => Response;
} = {}): Backend {
    const state: Backend = {
        caps: [],
        connection: [],
        fetchMock: vi.fn(),
    };
    state.fetchMock = vi.fn<typeof fetch>((input, init) => {
        const url = String(input);
        const body =
            typeof init?.body === "string"
                ? (JSON.parse(init.body) as unknown)
                : undefined;
        if (url.includes("checkCapsMessages")) {
            return Promise.resolve(jsonResponse({}));
        }
        if (url.includes("checkCaps")) {
            state.caps.push(body);
            return Promise.resolve(caps(body));
        }
        if (url.includes("checkConnection")) {
            state.connection.push(body);
            return Promise.resolve(connection(body));
        }
        throw new Error(`unexpected request to ${url}`);
    }) as unknown as ReturnType<typeof vi.fn>;
    return state;
}

function capsResult({
    indexerConfig = {},
    ...overrides
}: {
    allCapsChecked?: boolean;
    configComplete?: boolean;
    indexerConfig?: Record<string, unknown>;
} = {}) {
    return {
        allCapsChecked: true,
        configComplete: true,
        ...overrides,
        indexerConfig: {
            allCapsChecked: true,
            // The server resolves `***UNCHANGED***` before checking and answers
            // with the real credential; it must never reach the form.
            apiKey: "resolved-secret",
            backend: "NZEDB",
            categoryMapping: {categories: []},
            configComplete: true,
            downloadLimit: 5,
            hitLimit: 100,
            name: "Renamed by the server",
            state: "ENABLED",
            supportedSearchIds: ["IMDB", "TVDB"],
            supportedSearchTypes: ["MOVIE", "SEARCH"],
            ...indexerConfig,
        },
    };
}

function renderIndexers({
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
                                <IndexersConfigTab transport={transport} />
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

function indexersOf(harness: Harness): IndexerValues[] {
    return (harness.form.getValues().indexers ?? []) as IndexerValues[];
}

function draftField(field: string): HTMLElement {
    return screen.getByTestId(`config-input-indexerDraft-${field}`);
}

async function addPreset(group: string, slug: string): Promise<void> {
    fireEvent.click(screen.getByTestId("config-indexer-add"));
    await screen.findByTestId("config-indexer-add-dialog");
    const option = screen.queryByTestId(
        `config-indexer-preset-${group}-${slug}`,
    );
    if (option === null) {
        fireEvent.click(
            screen.getByTestId(`config-indexer-preset-menu-${group}`),
        );
        fireEvent.click(
            await screen.findByTestId(`config-indexer-preset-${group}-${slug}`),
        );
    } else {
        fireEvent.click(option);
    }
}

async function openEntry(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-indexer-edit-${index}`));
    await screen.findByTestId("config-indexer-dialog");
}

function submitDialog(): void {
    fireEvent.click(screen.getByTestId("config-indexer-dialog-submit"));
}

async function clickIn(testId: string, name: string): Promise<void> {
    const dialog = await screen.findByTestId(testId);
    fireEvent.click(within(dialog).getByRole("button", {name}));
}

afterEach(() => {
    cleanup();
});

describe("Indexer list", () => {
    it("orders the rows by state, then priority, then name", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "zulu", score: 0}),
                newznab({name: "system", state: "DISABLED_SYSTEM", score: 50}),
                newznab({name: "alpha", score: 0}),
                newznab({name: "high", score: 10}),
                newznab({name: "user", state: "DISABLED_USER"}),
            ]),
        });

        expect(
            screen
                .getAllByTestId(/^config-indexer-edit-/)
                .map((button) => button.textContent),
        ).toEqual(["high", "alpha", "zulu", "user", "system"]);
    });

    it("marks an incomplete config, an incomplete caps check, and a VIP expiry", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "broken", configComplete: false}),
                newznab({name: "partly", allCapsChecked: false}),
                newznab({name: "vip", vipExpirationDate: "2000-01-01"}),
            ]),
        });

        expect(
            screen.getByTestId("config-indexer-incomplete-0"),
        ).toHaveTextContent("Config incomplete");
        expect(
            screen.queryByTestId("config-indexer-caps-incomplete-0"),
        ).toBeNull();
        expect(
            screen.getByTestId("config-indexer-caps-incomplete-1"),
        ).toHaveTextContent("Caps check incomplete");
        expect(
            screen.getByTestId("config-indexer-vip-warning-2"),
        ).toHaveTextContent("VIP access expired on 2000-01-01");
    });

    it("edits state and priority in place and marks the form dirty", async () => {
        const harness = renderIndexers({
            values: configWith([newznab({name: "Mock1"})]),
        });

        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");

        fireEvent.click(screen.getByTestId("config-input-indexers-0-state"));
        await waitFor(() =>
            expect(indexersOf(harness)[0].state).toBe("DISABLED_USER"),
        );
        expect(screen.getByText("Disabled by user")).toBeVisible();

        fireEvent.change(screen.getByTestId("config-input-indexers-0-score"), {
            target: {value: "42"},
        });
        await waitFor(() => expect(indexersOf(harness)[0].score).toBe(42));
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("refuses to enable an indexer whose configuration is incomplete", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "broken", configComplete: false}),
            ]),
        });

        expect(screen.getByRole("switch")).toBeDisabled();
    });
});

describe("Adding an indexer", () => {
    it("offers legacy's three groups", async () => {
        renderIndexers();

        fireEvent.click(screen.getByTestId("config-indexer-add"));
        const dialog = await screen.findByTestId("config-indexer-add-dialog");

        expect(within(dialog).getByText("Usenet")).toBeVisible();
        expect(within(dialog).getByText("Torrents")).toBeVisible();
        expect(within(dialog).getByText("Special")).toBeVisible();
        expect(
            screen.getByTestId("config-indexer-preset-newznab-custom-newznab"),
        ).toHaveTextContent("Add custom newznab indexer");
        expect(
            screen.getByTestId("config-indexer-preset-torznab-custom-torznab"),
        ).toHaveTextContent("Add custom torznab indexer");
        expect(
            screen.getByTestId("config-indexer-preset-special-torbox"),
        ).toBeVisible();
    });

    it("seeds a newznab preset's values into the editor without committing it", async () => {
        const harness = renderIndexers();

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");

        expect(draftField("name")).toHaveValue("NZBGeek");
        expect(draftField("host")).toHaveValue("https://api.nzbgeek.info");
        expect(draftField("apiPath")).toHaveValue("");
        expect(indexersOf(harness)).toEqual([]);
        // A brand-new entry has nothing to delete yet.
        expect(screen.queryByTestId("config-indexer-dialog-delete")).toBeNull();
    });

    it("seeds the custom torznab entry and shows the torznab-only note", async () => {
        renderIndexers();

        await addPreset("torznab", "custom-torznab");
        await screen.findByTestId("config-indexer-dialog");

        expect(draftField("name")).toHaveValue("");
        expect(
            screen.getByTestId("config-indexer-torznab-note"),
        ).toHaveTextContent(
            "Torznab indexers can only be used for internal searches",
        );
        expect(
            screen.getByTestId("config-setting-indexerDraft-minSeeders"),
        ).toBeVisible();
    });

    it("shows a preset's own explanation", async () => {
        renderIndexers();

        await addPreset("special", "torbox");
        await screen.findByTestId("config-indexer-dialog");

        expect(
            screen.getByTestId("config-indexer-dialog-info"),
        ).toHaveTextContent("Torbox supports Newznab and Torznab requests");
        // Torbox has no priority, timeout, or search-source select.
        expect(
            screen.queryByTestId("config-setting-indexerDraft-score"),
        ).toBeNull();
    });

    it("refuses a second copy of a single-instance preset", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Binsearch", searchModuleType: "BINSEARCH"}),
            ]),
        });

        await addPreset("newznab", "binsearch");

        expect(
            await screen.findByText(
                "That predefined indexer is already configured.",
            ),
        ).toBeVisible();
        expect(screen.queryByTestId("config-indexer-dialog")).toBeNull();
        expect(indexersOf(harness)).toHaveLength(1);
    });
});

describe("The edit modal transaction", () => {
    it("discards a cancelled edit", async () => {
        const harness = renderIndexers({
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openEntry(0);
        fireEvent.change(draftField("name"), {target: {value: "Renamed"}});
        fireEvent.click(screen.getByTestId("config-indexer-dialog-cancel"));

        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness)[0].name).toBe("Mock1");
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("discards an edit when Reset is used", async () => {
        renderIndexers({values: configWith([newznab({name: "Mock1"})])});

        await openEntry(0);
        fireEvent.change(draftField("name"), {target: {value: "Renamed"}});
        expect(draftField("name")).toHaveValue("Renamed");

        fireEvent.click(screen.getByTestId("config-indexer-dialog-reset"));
        await waitFor(() => expect(draftField("name")).toHaveValue("Mock1"));
    });

    it("deletes an entry with legacy's warning about its history", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Mock1"}),
                newznab({name: "Mock2"}),
            ]),
        });

        await openEntry(0);
        const deleteButton = screen.getByTestId("config-indexer-dialog-delete");
        fireEvent.mouseOver(deleteButton);
        expect(await screen.findByRole("tooltip")).toHaveTextContent(
            "Deleting an indexer will remove its stats and related downloads and search results from the database",
        );

        fireEvent.click(deleteButton);
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness).map((entry) => entry.name)).toEqual([
            "Mock2",
        ]);
    });

    it("applies legacy's name rules", async () => {
        const harness = renderIndexers({
            fetchMock: backend().fetchMock,
            values: configWith([
                newznab({name: "Mock1"}),
                newznab({name: "Mock2"}),
            ]),
        });

        await openEntry(0);
        fireEvent.change(draftField("name"), {target: {value: ""}});
        submitDialog();
        expect(
            await screen.findByTestId("config-error-indexerDraft-name"),
        ).toHaveTextContent("This field is required");

        fireEvent.change(draftField("name"), {target: {value: "Mock2"}});
        submitDialog();
        await waitFor(() =>
            expect(
                screen.getByTestId("config-error-indexerDraft-name"),
            ).toHaveTextContent('Indexer "Mock2" already exists'),
        );

        fireEvent.change(draftField("name"), {target: {value: "a,b"}});
        submitDialog();
        await waitFor(() =>
            expect(
                screen.getByTestId("config-error-indexerDraft-name"),
            ).toHaveTextContent("Name may not contain a comma"),
        );

        expect(indexersOf(harness)[0].name).toBe("Mock1");
        expect(screen.getByTestId("config-indexer-dialog")).toBeVisible();
    });

    it("offers the other indexers' group names as suggestions", async () => {
        renderIndexers({
            values: configWith([
                newznab({name: "Mock1", groupNames: ["Movies"]}),
                newznab({name: "Mock2", groupNames: ["Anime", "Movies"]}),
            ]),
        });

        await openEntry(0);
        fireEvent.focus(draftField("groupNames"));
        fireEvent.keyDown(draftField("groupNames"), {key: "ArrowDown"});

        expect(
            await screen.findByRole("option", {name: "Anime"}),
        ).toBeVisible();
        expect(screen.queryByRole("option", {name: "Movies"})).toBeNull();
    });

    it("closes an untouched existing entry without contacting the indexer", async () => {
        const api = backend();
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openEntry(0);
        fireEvent.change(draftField("score"), {target: {value: "5"}});
        submitDialog();

        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(api.connection).toEqual([]);
        expect(api.caps).toEqual([]);
    });
});

describe("The close sequence", () => {
    it("checks the connection, then the capabilities, and commits what the check reported", async () => {
        const api = backend();
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        fireEvent.change(draftField("apiKey"), {target: {value: "typed-key"}});
        submitDialog();

        expect(
            await screen.findByText(
                "Connection to the indexer tested successfully",
            ),
        ).toBeVisible();
        expect(
            await screen.findByText(
                "Successfully tested capabilites of indexer",
            ),
        ).toBeVisible();
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );

        expect(api.connection).toHaveLength(1);
        expect(api.caps).toEqual([
            {
                checkType: "SINGLE",
                indexerConfig: expect.objectContaining({
                    apiKey: "typed-key",
                    host: "https://api.nzbgeek.info",
                    name: "NZBGeek",
                }),
            },
        ]);

        const committed = indexersOf(harness);
        expect(committed).toHaveLength(1);
        expect(committed[0]).toMatchObject({
            allCapsChecked: true,
            backend: "NZEDB",
            configComplete: true,
            downloadLimit: 5,
            hitLimit: 100,
            supportedSearchIds: ["IMDB", "TVDB"],
            supportedSearchTypes: ["MOVIE", "SEARCH"],
        });
        // Only `updateIndexerModel`'s fields are taken from the response.
        expect(committed[0].name).toBe("NZBGeek");
        expect(committed[0].apiKey).toBe("typed-key");
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("warns about an incomplete capability check but still commits", async () => {
        const api = backend({
            caps: () =>
                jsonResponse([
                    capsResult({
                        allCapsChecked: false,
                        indexerConfig: {allCapsChecked: false},
                    }),
                ]),
        });
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();

        await clickIn("config-indexer-caps-incomplete", "OK");
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness)[0]).toMatchObject({
            allCapsChecked: false,
            configComplete: true,
        });
    });

    it("reports an unusable indexer and commits it as incomplete", async () => {
        const api = backend({
            caps: () =>
                jsonResponse([
                    capsResult({
                        allCapsChecked: false,
                        configComplete: false,
                        indexerConfig: {
                            allCapsChecked: false,
                            configComplete: false,
                            state: "DISABLED_SYSTEM",
                        },
                    }),
                ]),
        });
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();

        const failure = await screen.findByTestId("config-indexer-caps-failed");
        expect(failure).toHaveTextContent(
            "You can trigger it manually from the indexer config box",
        );
        fireEvent.click(within(failure).getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness)[0]).toMatchObject({
            configComplete: false,
            state: "DISABLED_SYSTEM",
        });
        expect(screen.getByTestId("config-indexer-incomplete-0")).toBeVisible();
    });

    it("leaves the capabilities unknown when the check itself fails", async () => {
        const api = backend({
            caps: () => jsonResponse({error: "boom"}, 500),
        });
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();

        const failure = await screen.findByTestId("config-indexer-caps-failed");
        expect(failure).toHaveTextContent(
            "You can trigger it manually using the button below.",
        );
        fireEvent.click(within(failure).getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        const committed = indexersOf(harness)[0];
        expect(committed.supportedSearchIds).toBeUndefined();
        expect(committed.supportedSearchTypes).toBeUndefined();
        expect(committed.configComplete).toBe(false);
    });

    it("offers legacy's three answers to a failed connection check", async () => {
        const api = backend({
            connection: () =>
                jsonResponse({message: "Nope, wrong key", successful: false}),
        });
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();

        const failure = await screen.findByTestId(
            "config-indexer-connection-failed",
        );
        expect(failure).toHaveTextContent("Nope, wrong key");
        expect(failure).toHaveTextContent("Do you want to add it anyway?");

        // "Aahh, let me try again" commits nothing and keeps the editor open.
        fireEvent.click(
            within(failure).getByRole("button", {
                name: "Aahh, let me try again",
            }),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-connection-failed"),
            ).toBeNull(),
        );
        expect(screen.getByTestId("config-indexer-dialog")).toBeVisible();
        expect(indexersOf(harness)).toEqual([]);
        expect(api.caps).toEqual([]);

        // "I know what I'm doing" commits the entry as edited, unchecked.
        submitDialog();
        await clickIn(
            "config-indexer-connection-failed",
            "I know what I'm doing",
        );
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness)).toHaveLength(1);
        // Kept anyway means kept enabled: legacy's `createIndexerModel` seeds
        // `state: "ENABLED"`, and this branch commits the entry as edited.
        expect(indexersOf(harness)[0].state).toBe("ENABLED");
        expect(api.caps).toEqual([]);
    });

    it("adds a rejected indexer disabled when the admin asks for that", async () => {
        const api = backend({
            connection: () =>
                jsonResponse({message: "Nope", successful: false}),
        });
        const harness = renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();
        await clickIn(
            "config-indexer-connection-failed",
            "Add it, but disabled",
        );

        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        expect(indexersOf(harness)[0].state).toBe("DISABLED_USER");
    });

    it("uses legacy's other wording when the check could not be run at all", async () => {
        const api = backend({
            connection: () => jsonResponse("nope", 500),
        });
        renderIndexers({fetchMock: api.fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();

        const failure = await screen.findByTestId(
            "config-indexer-connection-failed",
        );
        expect(failure).toHaveTextContent(
            "The connection to the indexer could not be tested, sorry. Please check the log.",
        );
        expect(
            within(failure).getByRole("button", {name: "I'll risk it"}),
        ).toBeVisible();
    });

    it("re-checks an existing entry whose connection settings changed", async () => {
        const api = backend();
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openEntry(0);
        fireEvent.change(draftField("host"), {
            target: {value: "http://elsewhere"},
        });
        submitDialog();

        await waitFor(() => expect(api.connection).toHaveLength(1));
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        // Its capabilities are already known, so no caps check follows.
        expect(api.caps).toEqual([]);
    });
});

describe("The manual capability check", () => {
    it("writes the result into the open editor and skips the close checks", async () => {
        const api = backend();
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await openEntry(0);
        expect(
            screen.getByTestId("config-indexer-banner-incomplete-caps"),
        ).toHaveTextContent(
            "The capabilities of this indexer were not checked completely",
        );

        fireEvent.change(draftField("host"), {
            target: {value: "http://elsewhere"},
        });
        fireEvent.click(screen.getByTestId("config-indexer-check-caps"));

        expect(
            await screen.findByText(
                "Successfully tested capabilites of indexer",
            ),
        ).toBeVisible();
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
        expect(api.caps).toHaveLength(1);

        submitDialog();
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );
        // The caps check already contacted the indexer, so closing does not.
        expect(api.connection).toEqual([]);
        expect(api.caps).toHaveLength(1);
        expect(indexersOf(harness)[0]).toMatchObject({
            allCapsChecked: true,
            host: "http://elsewhere",
            supportedSearchIds: ["IMDB", "TVDB"],
        });
        expect(indexersOf(harness)[0].apiKey).toBe(UNCHANGED_SECRET_MARKER);
    });

    it("is hidden while the entry has no host or name, and for a new entry", async () => {
        renderIndexers({
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openEntry(0);
        expect(screen.getByTestId("config-indexer-check-caps")).toBeVisible();
        fireEvent.change(draftField("host"), {target: {value: ""}});
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-check-caps"),
            ).toBeNull(),
        );

        fireEvent.click(screen.getByTestId("config-indexer-dialog-cancel"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        expect(screen.queryByTestId("config-indexer-check-caps")).toBeNull();
        expect(
            screen.queryByTestId(
                "config-setting-indexerDraft-supportedSearchIds",
            ),
        ).toBeNull();
    });
});
