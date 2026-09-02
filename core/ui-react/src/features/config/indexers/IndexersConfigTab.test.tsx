import {ThemeProvider} from "@mui/material";
import {
    act,
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
import {settingHelpId} from "../components/settings";
import {SettingRow, SettingRowTableCellScope} from "../components/SettingRow";
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
    /** Bodies posted to either import endpoint, in order (FM-067). */
    imports: unknown[];
};

/**
 * The two real endpoints the close sequence uses, plus the message poll and
 * (FM-067) the two config importers. Each handler receives the posted body so a
 * test can assert what was sent.
 */
function backend({
    caps = () => jsonResponse([capsResult()]),
    connection = () => jsonResponse({message: null, successful: true}),
    jackett = () => jsonResponse(jackettImport()),
    prowlarr = () => jsonResponse(prowlarrImport()),
}: {
    caps?: (body: unknown) => Response;
    connection?: (body: unknown) => Response;
    jackett?: (body: unknown) => Response;
    prowlarr?: (body: unknown) => Response;
} = {}): Backend {
    const state: Backend = {
        caps: [],
        connection: [],
        fetchMock: vi.fn(),
        imports: [],
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
        if (url.includes("readJackettConfig")) {
            state.imports.push(body);
            return Promise.resolve(jackett(body));
        }
        if (url.includes("readProwlarrConfig")) {
            state.imports.push(body);
            return Promise.resolve(prowlarr(body));
        }
        throw new Error(`unexpected request to ${url}`);
    }) as unknown as ReturnType<typeof vi.fn>;
    return state;
}

/** `IndexerWeb.JacketConfigReadResponse`. */
function jackettImport(overrides: Record<string, unknown> = {}) {
    return {
        addedTrackers: 2,
        newIndexersConfig: [newznab({name: "Imported tracker"})],
        updatedTrackers: 1,
        ...overrides,
    };
}

/** `IndexerWeb.ProwlarrConfigReadResponse`. */
function prowlarrImport(overrides: Record<string, unknown> = {}) {
    return {
        addedIndexers: 2,
        newIndexersConfig: [newznab({name: "Imported indexer"})],
        removedIndexers: 0,
        updatedIndexers: 1,
        ...overrides,
    };
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
            <ThemeProvider theme={createHydraTheme("grey")}>
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

/**
 * Below `sm` the table drops its Type and Used-for columns and folds them into
 * the name cell (ADR-0029), decided by `useMediaQuery` rather than by CSS
 * `display` — the Used-for cell holds a real form control, and two copies of it
 * would mean two controls on one configuration path. jsdom's own `matchMedia`
 * never matches anything, so a phone viewport has to be stated explicitly.
 */
function stubMobileViewport(): void {
    vi.stubGlobal("matchMedia", (query: string) => ({
        addEventListener: () => {},
        addListener: () => {},
        dispatchEvent: () => false,
        matches: query.includes("max-width"),
        media: query,
        onchange: null,
        removeEventListener: () => {},
        removeListener: () => {},
    }));
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
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

/**
 * FM-103. The cases here are deliberately the *uncomfortable* ones: an entry
 * that has never been caps-checked, one the backend turned off with a reason,
 * an empty list, a name too long for its column, and every write made from a
 * sorted and filtered view rather than from the list as it loads.
 */
describe("The indexer table", () => {
    function rowNames(): (string | null)[] {
        return screen
            .getAllByTestId(/^config-indexer-edit-/)
            .map((button) => button.textContent);
    }

    function shownIndices(): string[] {
        return screen
            .getAllByTestId(/^config-indexer-entry-/)
            .map(
                (row) =>
                    row
                        .getAttribute("data-testid")
                        ?.replace("config-indexer-entry-", "") ?? "",
            );
    }

    it("shows a type, a search-source select, a state and a priority per entry", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "Mock1"}),
                newznab({
                    enabledForSearchSource: "INTERNAL",
                    name: "Tracker",
                    searchModuleType: "TORZNAB",
                }),
            ]),
        });

        expect(screen.getByTestId("config-indexers-table")).toBeVisible();
        expect(screen.getByTestId("config-indexer-type-0")).toHaveTextContent(
            "Newznab",
        );
        expect(screen.getByTestId("config-indexer-type-1")).toHaveTextContent(
            "Torznab",
        );
        expect(
            screen.getByTestId(
                "config-input-indexers-1-enabledForSearchSource",
            ),
        ).toHaveTextContent("Internal searches only");
        // The fence FM-100's review-panel case depends on: the priority input
        // for configuration entry 0 is on the page with no filter, sort, or
        // expansion applied first.
        expect(
            screen.getByTestId("config-input-indexers-0-score"),
        ).toBeVisible();
    });

    it("withholds the search-source cell for a type whose editor withholds the field", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "Mock1"}),
                newznab({name: "Box", searchModuleType: "TORBOX"}),
            ]),
        });

        // ADR-0040: the list cell is offered exactly where the edit dialog
        // offers the field, and `visibleIndexerFields` withholds it for TORBOX.
        expect(
            screen.getByTestId(
                "config-input-indexers-0-enabledForSearchSource",
            ),
        ).toBeVisible();
        expect(
            screen.queryByTestId(
                "config-input-indexers-1-enabledForSearchSource",
            ),
        ).toBeNull();
        // The column itself stays — the gated row keeps all five cells, so the
        // header and every other row still line up.
        expect(
            within(screen.getByTestId("config-indexer-entry-1")).getAllByRole(
                "cell",
            ),
        ).toHaveLength(5);
    });

    it("edits the search source straight into the configuration", async () => {
        const harness = renderIndexers({
            values: configWith([newznab({name: "Mock1"})]),
        });

        fireEvent.mouseDown(
            within(
                screen.getByTestId(
                    "config-input-indexers-0-enabledForSearchSource",
                ),
            ).getByRole("combobox"),
        );
        fireEvent.click(
            await screen.findByRole("option", {name: "API searches only"}),
        );

        await waitFor(() =>
            expect(indexersOf(harness)[0].enabledForSearchSource).toBe("API"),
        );
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("says what an entry with no capability check and one the backend disabled are", () => {
        renderIndexers({
            values: configWith([
                newznab({allCapsChecked: false, name: "Never checked"}),
                newznab({name: "Given up on", state: "DISABLED_SYSTEM"}),
            ]),
        });

        // Not colour alone: each state dimension is a word.
        expect(
            screen.getByTestId("config-indexer-caps-incomplete-0"),
        ).toHaveTextContent("Caps check incomplete");
        expect(screen.getByText("Disabled by system")).toBeVisible();
        expect(
            screen.getByText(
                /disabled by the program due to error from which it cannot recover/,
            ),
        ).toBeVisible();
    });

    it("keeps a name too long for its column readable in full", () => {
        const name = `Very long indexer name ${"x".repeat(80)}`;
        renderIndexers({values: configWith([newznab({name})])});

        // The cell truncates visually; the whole value stays available without
        // opening the editor.
        expect(screen.getByTestId("config-indexer-edit-0")).toHaveAttribute(
            "title",
            name,
        );
    });

    it("points an empty list at the button that fixes it", () => {
        renderIndexers({values: configWith([])});

        const empty = screen.getByTestId("config-indexers-empty");
        expect(empty).toHaveTextContent("No indexers are configured yet.");
        expect(empty).toHaveTextContent("Add new indexer");
        expect(screen.queryByTestId("config-indexers-table")).toBeNull();
    });

    it("filters by name without touching the form", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Alpha"}),
                newznab({name: "Beta"}),
                newznab({name: "Bravo"}),
            ]),
        });
        const before = structuredClone(indexersOf(harness));

        fireEvent.change(screen.getByTestId("config-indexers-filter"), {
            target: {value: "br"},
        });

        expect(rowNames()).toEqual(["Bravo"]);
        expect(
            screen.getByTestId("config-indexers-shown-count"),
        ).toHaveTextContent("1 of 3 indexers shown");
        expect(indexersOf(harness)).toEqual(before);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");

        fireEvent.change(screen.getByTestId("config-indexers-filter"), {
            target: {value: "nothing"},
        });
        expect(screen.queryAllByTestId(/^config-indexer-edit-/)).toEqual([]);
        expect(
            screen.getByTestId("config-indexers-no-matches"),
        ).toHaveTextContent("No indexer matches");
        expect(
            screen.getByTestId("config-indexers-enable-shown"),
        ).toBeDisabled();
        expect(
            screen.getByTestId("config-indexers-disable-shown"),
        ).toBeDisabled();
    });

    it("sorts by name, priority, and state, and back to legacy's order", () => {
        renderIndexers({
            values: configWith([
                newznab({name: "Beta", score: 5}),
                newznab({name: "alpha", score: 50}),
                newznab({name: "Gamma", score: 5, state: "DISABLED_USER"}),
            ]),
        });

        expect(rowNames()).toEqual(["alpha", "Beta", "Gamma"]);

        fireEvent.click(screen.getByTestId("config-indexers-sort-name"));
        expect(rowNames()).toEqual(["alpha", "Beta", "Gamma"]);
        fireEvent.click(screen.getByTestId("config-indexers-sort-name"));
        expect(rowNames()).toEqual(["Gamma", "Beta", "alpha"]);

        fireEvent.click(screen.getByTestId("config-indexers-sort-priority"));
        expect(rowNames()).toEqual(["Beta", "Gamma", "alpha"]);

        fireEvent.click(screen.getByTestId("config-indexers-sort-state"));
        expect(rowNames()).toEqual(["alpha", "Beta", "Gamma"]);
        fireEvent.click(screen.getByTestId("config-indexers-sort-state"));
        expect(rowNames()).toEqual(["Gamma", "alpha", "Beta"]);
        // The third click on the active column restores the load order.
        fireEvent.click(screen.getByTestId("config-indexers-sort-state"));
        expect(rowNames()).toEqual(["alpha", "Beta", "Gamma"]);
    });

    it("edits the right configuration entry from a sorted and filtered view", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Alpha", score: 1}),
                newznab({name: "Beta", score: 2}),
                newznab({name: "Bravo", score: 3}),
            ]),
        });

        fireEvent.click(screen.getByTestId("config-indexers-sort-name"));
        fireEvent.click(screen.getByTestId("config-indexers-sort-name"));
        fireEvent.change(screen.getByTestId("config-indexers-filter"), {
            target: {value: "b"},
        });

        // Descending by name over the two matches: Bravo (config index 2)
        // first, Beta (config index 1) second. Neither is at its own
        // configuration position.
        expect(rowNames()).toEqual(["Bravo", "Beta"]);
        expect(shownIndices()).toEqual(["2", "1"]);

        fireEvent.change(screen.getByTestId("config-input-indexers-1-score"), {
            target: {value: "42"},
        });

        await waitFor(() =>
            expect(indexersOf(harness).map((entry) => entry.score)).toEqual([
                1, 42, 3,
            ]),
        );
    });

    it("does not re-sort the row being typed in until focus leaves the table", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Alpha", score: 1}),
                newznab({name: "Beta", score: 2}),
                newznab({name: "Gamma", score: 3}),
            ]),
        });

        fireEvent.click(screen.getByTestId("config-indexers-sort-priority"));
        expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);

        const alphaScore = screen.getByTestId("config-input-indexers-0-score");
        fireEvent.focus(alphaScore);
        fireEvent.change(alphaScore, {target: {value: "99"}});

        await waitFor(() => expect(indexersOf(harness)[0].score).toBe(99));
        // FM-123: `indexersOf` reads `form.getValues()` directly, which
        // updates synchronously in the change handler -- it does not
        // guarantee `IndexerTable`'s watch-driven re-render (the thing
        // `rowNames()` actually reads) has committed. Flushing here, rather
        // than wrapping the read below in its own `waitFor`, is deliberate:
        // this is a stability assertion ("has not moved"), and a `waitFor`
        // around a claim that is already true on its first synchronous
        // check would pass vacuously without ever exercising the freeze.
        await act(async () => {});
        // Alpha now sorts last, but the row the cursor is in has not moved.
        expect(rowNames()).toEqual(["Alpha", "Beta", "Gamma"]);

        fireEvent.blur(alphaScore);
        await waitFor(() =>
            expect(rowNames()).toEqual(["Beta", "Gamma", "Alpha"]),
        );
    });

    it("disables exactly the shown rows and leaves every other field byte-equal", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Alpha"}),
                newznab({name: "Beta"}),
                newznab({name: "Bravo"}),
            ]),
        });
        const before = structuredClone(indexersOf(harness));

        fireEvent.change(screen.getByTestId("config-indexers-filter"), {
            target: {value: "br"},
        });
        fireEvent.click(screen.getByTestId("config-indexers-disable-shown"));

        await waitFor(() =>
            expect(indexersOf(harness)[2].state).toBe("DISABLED_USER"),
        );
        expect(indexersOf(harness)[0]).toEqual(before[0]);
        expect(indexersOf(harness)[1]).toEqual(before[1]);
        expect(indexersOf(harness)[2]).toEqual({
            ...before[2],
            state: "DISABLED_USER",
        });
    });

    it("stacks every column of an entry into one cell on a phone, dropping nothing", () => {
        stubMobileViewport();
        renderIndexers({
            values: configWith([
                newznab({name: "Mock1", searchModuleType: "TORZNAB"}),
            ]),
        });

        expect(
            screen.getAllByRole("columnheader").map((cell) => cell.textContent),
        ).toEqual(["Indexer"]);

        // Every piece is still there, still once, and still in this entry's
        // own row — a stacked cell, not a dropped column.
        const row = screen.getByTestId("config-indexer-entry-0");
        expect(
            within(row).getByTestId("config-indexer-type-0"),
        ).toHaveTextContent("Torznab");
        expect(
            within(row).getByTestId("config-input-indexers-0-score"),
        ).toBeVisible();
        expect(within(row).getByRole("switch")).toBeEnabled();
        expect(screen.getByText("Enabled")).toBeVisible();
        // Exactly one control per configuration path: the two layouts are
        // branches, never two rendered variants sharing a binding.
        expect(
            screen.getAllByTestId(
                "config-input-indexers-0-enabledForSearchSource",
            ),
        ).toHaveLength(1);
        expect(screen.getAllByRole("switch")).toHaveLength(1);
    });

    it("offers the same orderings as a named control where there are no headers", async () => {
        stubMobileViewport();
        renderIndexers({
            values: configWith([
                newznab({name: "Beta", score: 5}),
                newznab({name: "alpha", score: 50}),
            ]),
        });

        // The header sort labels do not exist in this layout.
        expect(screen.queryByTestId("config-indexers-sort-name")).toBeNull();
        expect(rowNames()).toEqual(["alpha", "Beta"]);

        fireEvent.mouseDown(
            within(screen.getByTestId("config-indexers-sort")).getByRole(
                "combobox",
            ),
        );
        fireEvent.click(
            await screen.findByRole("option", {name: "Priority (low first)"}),
        );

        await waitFor(() => expect(rowNames()).toEqual(["Beta", "alpha"]));
    });

    it("bulk-enables the shown rows but never one that cannot be searched", async () => {
        const harness = renderIndexers({
            values: configWith([
                newznab({name: "Alpha", state: "DISABLED_USER"}),
                newznab({
                    configComplete: false,
                    name: "Broken",
                    state: "DISABLED_SYSTEM",
                }),
            ]),
        });

        fireEvent.click(screen.getByTestId("config-indexers-enable-shown"));

        await waitFor(() =>
            expect(indexersOf(harness)[0].state).toBe("ENABLED"),
        );
        expect(indexersOf(harness)[1].state).toBe("DISABLED_SYSTEM");
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

    it("puts the caret on the first invalid setting when a draft is refused", async () => {
        renderIndexers({
            fetchMock: backend().fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openEntry(0);
        fireEvent.change(draftField("name"), {target: {value: ""}});
        // The caret is somewhere else entirely, as it is after editing any of
        // the ~30 settings below the name -- which is the state in which the
        // toast alone tells the admin nothing about where the problem is.
        draftField("score").focus();
        submitDialog();

        expect(
            await screen.findByText(
                "Config invalid. Please check your settings.",
            ),
        ).toBeVisible();
        await waitFor(() => expect(draftField("name")).toHaveFocus());
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

    it("picks a colour via the native input, clears it, and commits null", async () => {
        const api = backend();
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({color: "rgb(116,18,18)", name: "Mock1"}),
            ]),
        });

        await openEntry(0);
        const nativeColorInput = document.querySelector(
            'input[type="color"]',
        ) as HTMLInputElement;
        expect(nativeColorInput.value).toBe("#741212");

        fireEvent.change(nativeColorInput, {target: {value: "#0a141e"}});
        expect(draftField("color")).toHaveValue("rgb(10,20,30)");

        fireEvent.click(screen.getByTestId("config-indexer-color-clear"));
        expect(draftField("color")).toHaveValue("");

        submitDialog();
        await waitFor(() =>
            expect(screen.queryByTestId("config-indexer-dialog")).toBeNull(),
        );

        expect(indexersOf(harness)[0].color).toBeNull();
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

    it("returns to the open editor when the admin stops waiting for the check", async () => {
        const api = backend();
        // A check that never answers: the point is the exit, not the result.
        const pending = new Promise<Response>(() => undefined);
        const fetchMock = vi.fn<typeof fetch>((input, init) => {
            const url = String(input);
            return url.includes("checkCaps") &&
                !url.includes("checkCapsMessages")
                ? pending
                : (api.fetchMock as unknown as typeof fetch)(input, init);
        });
        const harness = renderIndexers({fetchMock});

        await addPreset("newznab", "nzbgeek");
        await screen.findByTestId("config-indexer-dialog");
        submitDialog();
        await screen.findByTestId("config-indexer-caps-dialog");

        fireEvent.click(screen.getByTestId("config-indexer-caps-leave"));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );

        // The commit the check was gating is abandoned, not completed: the
        // editor is still open with its fields intact, nothing was written to
        // the configuration, and leaving is not a failure to acknowledge.
        expect(screen.getByTestId("config-indexer-dialog")).toBeVisible();
        expect(draftField("host")).toHaveValue("https://api.nzbgeek.info");
        expect(screen.queryByTestId("config-indexer-caps-failed")).toBeNull();
        expect(indexersOf(harness)).toHaveLength(0);
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

describe("The bulk capability recheck", () => {
    async function recheck(testId: string): Promise<void> {
        fireEvent.click(screen.getByTestId(testId));
        await screen.findByTestId("config-indexer-caps-dialog");
    }

    it("sends legacy's two check types and carries no entry", async () => {
        const api = backend({caps: () => jsonResponse([])});
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await recheck("config-indexers-recheck-incomplete");
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
        await recheck("config-indexers-recheck-all");
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );

        expect(api.caps).toEqual([
            {checkType: "INCOMPLETE", indexerConfig: null},
            {checkType: "ALL", indexerConfig: null},
        ]);
    });

    it("merges by name, keeping unrelated fields and unsaved edits", async () => {
        const api = backend({
            caps: () =>
                jsonResponse([
                    capsResult({
                        indexerConfig: {
                            // The server answers with a complete IndexerConfig
                            // whose credential it resolved from the marker and
                            // whose priority is the *saved* one.
                            apiKey: "resolved-secret",
                            host: "http://somewhere-else",
                            name: "Mock1",
                            score: 0,
                        },
                    }),
                ]),
        });
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({
                    name: "Mock1",
                    allCapsChecked: false,
                    configComplete: false,
                }),
                newznab({name: "Mock2", allCapsChecked: false}),
            ]),
        });

        // An unsaved edit to a field the check does not own, made before the
        // recheck runs. Reverting it is the failure this test exists for.
        fireEvent.change(screen.getByTestId("config-input-indexers-0-score"), {
            target: {value: "42"},
        });
        await waitFor(() => expect(indexersOf(harness)[0].score).toBe(42));

        await recheck("config-indexers-recheck-incomplete");
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );

        const [checked, untouched] = indexersOf(harness);
        expect(checked).toMatchObject({
            allCapsChecked: true,
            backend: "NZEDB",
            configComplete: true,
            downloadLimit: 5,
            hitLimit: 100,
            supportedSearchIds: ["IMDB", "TVDB"],
            supportedSearchTypes: ["MOVIE", "SEARCH"],
        });
        // Everything else is the entry's own, including the unsaved edit and
        // the masked credential.
        expect(checked.score).toBe(42);
        expect(checked.name).toBe("Mock1");
        expect(checked.host).toBe("http://mock");
        expect(checked.apiKey).toBe(UNCHANGED_SECRET_MARKER);
        // No result named Mock2, so nothing about it changed.
        expect(untouched.allCapsChecked).toBe(false);
    });

    it("marks the form dirty when something was merged, and not otherwise", async () => {
        const api = backend({
            caps: () =>
                jsonResponse([
                    capsResult({indexerConfig: {name: "Somebody else"}}),
                ]),
        });
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-all");
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");

        cleanup();
        const second = backend({
            caps: () =>
                jsonResponse([capsResult({indexerConfig: {name: "Mock1"}})]),
        });
        renderIndexers({
            fetchMock: second.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-all");
        await waitFor(() =>
            expect(screen.getByTestId("form-dirty")).toHaveTextContent("true"),
        );
    });

    it("reports an empty result list the way legacy does", async () => {
        const api = backend({caps: () => jsonResponse([])});
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await recheck("config-indexers-recheck-incomplete");

        expect(
            await screen.findByText("No indexers were checked"),
        ).toBeVisible();
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
        expect(indexersOf(harness)).toHaveLength(1);
    });

    it("reports a failed check and changes nothing", async () => {
        const api = backend({caps: () => jsonResponse({error: "boom"}, 500)});
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-all");
        await clickIn("config-indexers-recheck-failed", "OK");

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
        expect(indexersOf(harness)[0].allCapsChecked).toBe(false);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    // ---- FM-167: stopping the wait for a check that cannot be aborted ------

    /**
     * A check the test finishes by hand, because `IndexerWeb` offers no abort:
     * the interesting moment is what the *abandoned* request does when the
     * server finally answers it.
     */
    function hangingBackend(messages: Record<string, string[]> = {}) {
        const checks: {
            reject: (error: Error) => void;
            resolve: (value: Response) => void;
        }[] = [];
        const fetchMock = vi.fn<typeof fetch>((input) => {
            const url = String(input);
            if (url.includes("checkCapsMessages")) {
                return Promise.resolve(jsonResponse(messages));
            }
            if (url.includes("checkCaps")) {
                return new Promise<Response>((resolve, reject) => {
                    checks.push({reject, resolve});
                });
            }
            throw new Error(`unexpected request to ${url}`);
        });
        return {checks, fetchMock};
    }

    async function leaveCheck(): Promise<void> {
        fireEvent.click(screen.getByTestId("config-indexer-caps-leave"));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
    }

    /** Long enough for an abandoned promise's whole chain to run, or not. */
    async function settle(): Promise<void> {
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
        });
    }

    it("counts the indexers the server will check while the check runs", async () => {
        const api = hangingBackend({Mock1: ["Checking caps of Mock1"]});
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
                newznab({name: "Mock2", allCapsChecked: false}),
                // Not `INCOMPLETE`-eligible, exactly as
                // `IndexerChecker.checkCaps(CheckType)` filters them out.
                newznab({
                    name: "Mock3",
                    allCapsChecked: false,
                    state: "DISABLED_USER",
                }),
                newznab({
                    name: "Mock4",
                    allCapsChecked: false,
                    configComplete: false,
                }),
                newznab({name: "Mock5"}),
            ]),
        });

        await recheck("config-indexers-recheck-incomplete");
        await waitFor(
            () =>
                expect(
                    screen.getByTestId("config-indexer-caps-progress"),
                ).toHaveTextContent("1 of 2 indexers have reported"),
            {timeout: 3000},
        );
    });

    it("frees the tab immediately and applies nothing the abandoned check answers", async () => {
        const api = hangingBackend();
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-incomplete");
        await leaveCheck();

        // The point of the packet: the tab is usable again at once.
        expect(
            screen.getByTestId("config-indexers-recheck-incomplete"),
        ).toBeEnabled();
        expect(screen.getByTestId("config-indexer-edit-0")).toBeEnabled();

        // The server finishes the check nobody could tell it to stop.
        api.checks[0].resolve(
            jsonResponse([capsResult({indexerConfig: {name: "Mock1"}})]),
        );
        await settle();

        expect(indexersOf(harness)[0].allCapsChecked).toBe(false);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
        expect(screen.queryByTestId("config-indexer-caps-dialog")).toBeNull();
        expect(screen.queryByText("No indexers were checked")).toBeNull();
    });

    it("raises no failure dialog when the abandoned check fails", async () => {
        const api = hangingBackend();
        renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-all");
        await leaveCheck();

        api.checks[0].resolve(jsonResponse({error: "boom"}, 500));
        await settle();

        expect(
            screen.queryByTestId("config-indexers-recheck-failed"),
        ).toBeNull();
        expect(screen.queryByTestId("config-indexer-caps-dialog")).toBeNull();
    });

    it("keeps a second check's results while dropping the abandoned one's", async () => {
        const api = hangingBackend();
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([
                newznab({name: "Mock1", allCapsChecked: false}),
            ]),
        });

        await recheck("config-indexers-recheck-incomplete");
        await leaveCheck();
        await recheck("config-indexers-recheck-all");

        // The first check answers while the second one is still running.
        api.checks[0].resolve(
            jsonResponse([
                capsResult({
                    indexerConfig: {name: "Mock1", score: 99},
                }),
            ]),
        );
        await settle();
        expect(indexersOf(harness)[0].allCapsChecked).toBe(false);
        expect(indexersOf(harness)[0].score).toBe(0);
        expect(screen.getByTestId("config-indexer-caps-dialog")).toBeVisible();

        api.checks[1].resolve(
            jsonResponse([capsResult({indexerConfig: {name: "Mock1"}})]),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-caps-dialog"),
            ).toBeNull(),
        );
        expect(indexersOf(harness)[0].allCapsChecked).toBe(true);
    });
});

describe("The Jackett and Prowlarr imports", () => {
    async function openImport(source: string): Promise<void> {
        fireEvent.click(screen.getByTestId("config-indexer-add"));
        await screen.findByTestId("config-indexer-add-dialog");
        fireEvent.click(screen.getByTestId(`config-indexer-import-${source}`));
        await screen.findByTestId("config-indexer-import-dialog");
    }

    function importField(field: string): HTMLElement {
        return screen.getByTestId(`config-input-indexerImport-${field}`);
    }

    function submitImport(): void {
        fireEvent.click(
            screen.getByTestId("config-indexer-import-dialog-submit"),
        );
    }

    it("seeds legacy's defaults and says what a replacement costs", async () => {
        renderIndexers({fetchMock: backend().fetchMock});

        await openImport("jackett");
        expect(importField("host")).toHaveValue("http://127.0.0.1:9117");
        expect(
            screen.getByTestId("config-indexer-import-warning"),
        ).toHaveTextContent(
            "Any indexer Jackett does not return is removed from the list",
        );
        // Only host and API key are asked for.
        expect(
            screen.queryByTestId("config-setting-indexerImport-name"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-setting-indexerImport-score"),
        ).toBeNull();

        fireEvent.click(
            screen.getByTestId("config-indexer-import-dialog-cancel"),
        );
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-import-dialog"),
            ).toBeNull(),
        );

        await openImport("prowlarr");
        expect(importField("host")).toHaveValue("http://127.0.0.1:9696");
    });

    it("replaces the whole list with what Jackett returned and reports its counts", async () => {
        const api = backend();
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        // An unsaved edit that must travel to the server as part of
        // `existingIndexers`, because that is the list the import folds into.
        fireEvent.change(screen.getByTestId("config-input-indexers-0-score"), {
            target: {value: "42"},
        });
        await waitFor(() => expect(indexersOf(harness)[0].score).toBe(42));

        await openImport("jackett");
        fireEvent.change(importField("host"), {
            target: {value: "http://jackett:9117"},
        });
        fireEvent.change(importField("apiKey"), {target: {value: "jkt"}});
        submitImport();

        const reported = await screen.findByTestId(
            "config-indexer-import-result",
        );
        expect(reported).toHaveTextContent("Added 2 new trackers from Jackett");
        expect(reported).toHaveTextContent("Updated 1 trackers from Jackett");
        fireEvent.click(within(reported).getByRole("button", {name: "OK"}));

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-import-dialog"),
            ).toBeNull(),
        );
        expect(indexersOf(harness).map((entry) => entry.name)).toEqual([
            "Imported tracker",
        ]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");

        expect(api.imports).toEqual([
            {
                existingIndexers: [
                    expect.objectContaining({name: "Mock1", score: 42}),
                ],
                jackettConfig: expect.objectContaining({
                    apiKey: "jkt",
                    host: "http://jackett:9117",
                    name: "Jackett config",
                    // The marker type is what makes the request deserialize
                    // and what the imported entries are cloned from.
                    searchModuleType: "IMPORT_CONFIG",
                }),
            },
        ]);
    });

    it("reports Prowlarr's removals only when there were any", async () => {
        const api = backend({
            prowlarr: () => jsonResponse(prowlarrImport({removedIndexers: 3})),
        });
        renderIndexers({fetchMock: api.fetchMock});

        await openImport("prowlarr");
        submitImport();

        let reported = await screen.findByTestId(
            "config-indexer-import-result",
        );
        expect(reported).toHaveTextContent("Added 2 indexers from Prowlarr");
        expect(reported).toHaveTextContent("Updated 1 indexers from Prowlarr");
        expect(reported).toHaveTextContent(
            "Removed 3 indexers no longer in Prowlarr",
        );
        fireEvent.click(within(reported).getByRole("button", {name: "OK"}));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-indexer-import-result"),
            ).toBeNull(),
        );

        cleanup();
        renderIndexers({fetchMock: backend().fetchMock});
        await openImport("prowlarr");
        submitImport();

        reported = await screen.findByTestId("config-indexer-import-result");
        expect(reported).toHaveTextContent("Added 2 indexers from Prowlarr");
        expect(reported).not.toHaveTextContent("no longer in Prowlarr");
    });

    it("stays open on a failure, shows the server's reason, and keeps the list", async () => {
        const api = backend({
            prowlarr: () =>
                jsonResponse(
                    {errorMessage: "Error accessing Prowlarr: refused"},
                    400,
                ),
        });
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openImport("prowlarr");
        fireEvent.change(importField("apiKey"), {target: {value: "wrong"}});
        submitImport();

        expect(
            await screen.findByTestId("config-indexer-import-error"),
        ).toHaveTextContent("Error accessing Prowlarr: refused");
        expect(
            screen.getByTestId("config-indexer-import-dialog"),
        ).toBeVisible();
        // Everything typed is still there, so the admin can correct it.
        expect(importField("host")).toHaveValue("http://127.0.0.1:9696");
        // The configured indexer is exactly as it was.
        expect(indexersOf(harness).map((entry) => entry.name)).toEqual([
            "Mock1",
        ]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("falls back to the status when the server names no reason", async () => {
        const api = backend({
            jackett: () => jsonResponse({status: 500}, 500),
        });
        const harness = renderIndexers({
            fetchMock: api.fetchMock,
            values: configWith([newznab({name: "Mock1"})]),
        });

        await openImport("jackett");
        submitImport();

        expect(
            await screen.findByTestId("config-indexer-import-error"),
        ).toHaveTextContent("Request failed with status 500");
        expect(indexersOf(harness)).toHaveLength(1);
    });
});

/**
 * FM-151. `SettingRow`'s table-cell opt-in (`SettingRowTableCellScope`): a
 * row rendered inside the scope drops its reserved bottom margin and lifts
 * its help/error text out of flow, so a table can center every column's
 * control on one shared line no matter which cells carry help or error text.
 * A row rendered outside the scope — every other `SettingRow` consumer in
 * the app — is unaffected, which is what keeps this an opt-in rather than a
 * behaviour change for `C-CONFIG-FIELDS` at large.
 */
describe("SettingRow's table-cell opt-in", () => {
    function renderRow(children: React.ReactNode) {
        render(
            <ThemeProvider theme={createHydraTheme("grey")}>
                {children}
            </ThemeProvider>,
        );
    }

    it("reserves margin below the control and renders help in flow by default", () => {
        renderRow(
            <SettingRow help="Some help" label="Widget" name="a.b">
                <div>control</div>
            </SettingRow>,
        );

        expect(screen.getByTestId("config-setting-a-b")).toHaveStyle({
            marginBottom: "20px",
        });
        const help = document.getElementById(settingHelpId("a.b"));
        expect(help?.parentElement).not.toHaveStyle({position: "absolute"});
    });

    it("drops the margin and hangs help/error below the control when scoped to a table cell", () => {
        renderRow(
            <SettingRowTableCellScope>
                <SettingRow
                    error="Bad value"
                    help="Some help"
                    label="Widget"
                    name="a.b"
                >
                    <div>control</div>
                </SettingRow>
            </SettingRowTableCellScope>,
        );

        expect(screen.getByTestId("config-setting-a-b")).toHaveStyle({
            marginBottom: "0px",
        });
        const help = document.getElementById(settingHelpId("a.b"));
        expect(help?.parentElement).toHaveStyle({
            position: "absolute",
            top: "100%",
        });
        // Both messages share the one out-of-flow wrapper.
        expect(screen.getByTestId("config-error-a-b").parentElement).toBe(
            help?.parentElement,
        );
    });

    it("scopes the indexer table's search-source, state and priority cells but not the name cell", () => {
        renderIndexers({
            values: configWith([
                newznab({
                    allCapsChecked: false,
                    name: "Mock1",
                    // `indexerStateHelp` only supplies help text for the two
                    // system-disabled states, so this is the fixture that
                    // exercises the out-of-flow help path this table needs
                    // (packet acceptance: "a row that renders help text
                    // under State").
                    state: "DISABLED_SYSTEM_TEMPORARY",
                }),
            ]),
        });

        // The State cell's box is exactly its switch's height: help text is
        // present but does not add to it.
        const stateRow = screen.getByTestId("config-setting-indexers-0-state");
        expect(stateRow).toHaveStyle({marginBottom: "0px"});
        const stateHelp = document.getElementById(
            settingHelpId("indexers.0.state"),
        );
        expect(stateHelp).not.toBeNull();
        expect(stateHelp?.parentElement).toHaveStyle({
            position: "absolute",
            top: "100%",
        });

        // The priority cell has no help/error to show but is scoped all the
        // same, since the opt-in is applied by placement, not by content.
        expect(
            screen.getByTestId("config-setting-indexers-0-score"),
        ).toHaveStyle({marginBottom: "0px"});

        // The caps-incomplete chip lives in the name cell, which is built by
        // `IndexerTable` itself rather than `SettingRow`. FM-173 dropped the
        // out-of-flow chip stack that cell used to carry in the wide branch —
        // the chip now sits in the same normal-flow stack as every other
        // arrangement, so no ancestor between the chip and the cell is
        // absolutely positioned.
        const chip = screen.getByTestId("config-indexer-caps-incomplete-0");
        expect(chip).toBeVisible();
        for (
            let ancestor = chip.parentElement;
            ancestor !== null && ancestor !== document.body;
            ancestor = ancestor.parentElement
        ) {
            expect(ancestor).not.toHaveStyle({position: "absolute"});
        }
    });
});
