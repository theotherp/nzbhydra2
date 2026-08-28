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
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {ShowAdvancedContext} from "../advancedFields";
import {UNCHANGED_SECRET_MARKER} from "../components";
import {DownloadingConfigTab} from "./DownloadingConfigTab";
import {DOWNLOADER_PRESETS, type DownloaderValues} from "./downloadingSettings";

const LIST = "downloading-downloaders";

const SABNZBD: DownloaderValues = {
    addPaused: false,
    apiKey: UNCHANGED_SECRET_MARKER,
    defaultCategory: null,
    downloadType: "NZB",
    downloaderType: "SABNZBD",
    enabled: true,
    iconCssClass: null,
    name: "Sab",
    nzbAddingType: "UPLOAD",
    password: null,
    url: "http://localhost:8080",
    username: null,
};

const NZBGET: DownloaderValues = {
    addPaused: false,
    apiKey: null,
    defaultCategory: null,
    downloadType: "NZB",
    downloaderType: "NZBGET",
    enabled: true,
    iconCssClass: null,
    name: "Get",
    nzbAddingType: "SEND_LINK",
    password: UNCHANGED_SECRET_MARKER,
    url: "http://localhost:6789",
    username: UNCHANGED_SECRET_MARKER,
};

/** Torbox has no `url` at all (`visibleDownloaderFields`/its preset seed). */
const TORBOX: DownloaderValues = {
    addPaused: false,
    defaultCategory: "Use no category",
    downloadType: "NZB",
    downloaderType: "TORBOX",
    enabled: true,
    iconCssClass: "",
    name: "Torbox",
    nzbAddingType: "UPLOAD",
};

const baseDownloading: Record<string, unknown> = {
    downloaders: [],
    externalUrl: null,
    fallbackForFailed: "BOTH",
    nzbAccessType: "PROXY",
    primaryDownloader: null,
    saveNzbsTo: null,
    saveTorrentsTo: null,
    sendMagnetLinks: true,
    showDownloaderStatus: false,
    updateStatuses: true,
};

type Harness = {form: UseFormReturn<ConfigValues>};

function configWith(overrides: Record<string, unknown> = {}): ConfigValues {
    return {downloading: {...baseDownloading, ...overrides}};
}

function renderDownloading({
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
                                <DownloadingConfigTab transport={transport} />
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

function downloadingValues(harness: Harness): Record<string, unknown> {
    return harness.form.getValues().downloading as Record<string, unknown>;
}

function downloadersOf(harness: Harness): DownloaderValues[] {
    return downloadingValues(harness).downloaders as DownloaderValues[];
}

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"content-type": "application/json"},
        status: 200,
    });
}

function checkOk(): ReturnType<typeof vi.fn> {
    return vi.fn<typeof fetch>(() =>
        Promise.resolve(jsonResponse({message: null, successful: true})),
    );
}

function checkFails(message = "Failed to connect"): ReturnType<typeof vi.fn> {
    return vi.fn<typeof fetch>(() =>
        Promise.resolve(jsonResponse({message, successful: false})),
    );
}

async function addFromPreset(preset: string): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-add-${LIST}`));
    fireEvent.click(
        await screen.findByTestId(`config-repeat-add-option-${LIST}-${preset}`),
    );
    await screen.findByTestId("config-downloader-dialog");
}

async function openEntry(index: number): Promise<void> {
    fireEvent.click(screen.getByTestId(`config-repeat-edit-${LIST}-${index}`));
    await screen.findByTestId("config-downloader-dialog");
}

function submitDialog(): void {
    fireEvent.click(screen.getByTestId("config-downloader-dialog-submit"));
}

/**
 * Below `sm` the downloader table drops its Type/URL/Enabled columns and
 * folds them into the name cell, mirroring `IndexerTable.tsx`'s own
 * `useMediaQuery` branch. jsdom's own `matchMedia` never matches anything, so
 * a phone viewport has to be stated explicitly.
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

describe("Downloading config tab general fieldset", () => {
    it("renders every general field of config-fields-service.js:1837-1979", () => {
        renderDownloading({
            values: configWith({showDownloaderStatus: true}),
        });

        for (const path of [
            "downloading-saveTorrentsTo",
            "downloading-saveNzbsTo",
            "downloading-nzbAccessType",
            "downloading-externalUrl",
            "downloading-fallbackForFailed",
            "downloading-sendMagnetLinks",
            "downloading-updateStatuses",
            "downloading-showDownloaderStatus",
        ]) {
            expect(screen.getByTestId(`config-setting-${path}`)).toBeVisible();
        }
        expect(
            screen.getByRole("textbox", {name: /Torrent black hole/}),
        ).toBeVisible();
        expect(
            screen.getByText(
                "Allow NZBs to be saved in this folder from the search results. Ignored if not set.",
            ),
        ).toBeVisible();
        expect(
            screen.getByText("Show footer with downloader status"),
        ).toBeVisible();
    });

    it("hides advanced rows until the advanced toggle is on", () => {
        renderDownloading({showAdvanced: false});

        expect(
            screen.getByTestId("config-setting-downloading-sendMagnetLinks"),
        ).toBeVisible();
        expect(
            screen.queryByTestId("config-setting-downloading-nzbAccessType"),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-setting-downloading-updateStatuses"),
        ).toBeNull();
    });

    it("shows the external URL when the footer is on or a downloader adds by link, and keeps the value while hidden", () => {
        const harness = renderDownloading({
            values: configWith({externalUrl: "http://hydra.example"}),
        });

        expect(
            screen.queryByTestId("config-setting-downloading-externalUrl"),
        ).toBeNull();
        expect(downloadingValues(harness).externalUrl).toBe(
            "http://hydra.example",
        );

        cleanup();
        renderDownloading({
            values: configWith({showDownloaderStatus: true}),
        });
        expect(
            screen.getByTestId("config-setting-downloading-externalUrl"),
        ).toBeVisible();

        cleanup();
        renderDownloading({
            values: configWith({downloaders: [NZBGET]}),
        });
        expect(
            screen.getByTestId("config-setting-downloading-externalUrl"),
        ).toBeVisible();
    });

    it("hides the fallback select for REDIRECT without clearing it", async () => {
        const harness = renderDownloading();

        expect(
            screen.getByTestId("config-setting-downloading-fallbackForFailed"),
        ).toBeVisible();

        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "NZB access type"}),
        );
        fireEvent.click(
            await screen.findByRole("option", {
                name: "Redirect to the indexer",
            }),
        );

        await waitFor(() =>
            expect(
                screen.queryByTestId(
                    "config-setting-downloading-fallbackForFailed",
                ),
            ).toBeNull(),
        );
        expect(downloadingValues(harness).fallbackForFailed).toBe("BOTH");
    });

    it("offers the configured downloader names as primary downloader only with the footer on and more than one enabled", async () => {
        renderDownloading({
            values: configWith({
                downloaders: [SABNZBD, NZBGET],
                showDownloaderStatus: false,
            }),
        });
        expect(
            screen.queryByTestId(
                "config-setting-downloading-primaryDownloader",
            ),
        ).toBeNull();

        cleanup();
        renderDownloading({
            values: configWith({
                downloaders: [SABNZBD, {...NZBGET, enabled: false}],
                showDownloaderStatus: true,
            }),
        });
        expect(
            screen.queryByTestId(
                "config-setting-downloading-primaryDownloader",
            ),
        ).toBeNull();

        cleanup();
        renderDownloading({
            values: configWith({
                downloaders: [SABNZBD, NZBGET],
                showDownloaderStatus: true,
            }),
        });
        expect(
            screen.getByTestId("config-setting-downloading-primaryDownloader"),
        ).toBeVisible();
        fireEvent.mouseDown(
            screen.getByRole("combobox", {name: "Primary downloader"}),
        );
        expect(
            (await screen.findAllByRole("option")).map(
                (option) => option.textContent,
            ),
        ).toEqual(["Sab", "Get"]);
    });
});

describe("Downloading config tab presets", () => {
    for (const preset of DOWNLOADER_PRESETS) {
        it(`seeds a new ${preset.label} entry with legacy's values`, async () => {
            const fetchMock = checkOk();
            const harness = renderDownloading({fetchMock});

            await addFromPreset(preset.value);
            submitDialog();

            await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
            expect(downloadersOf(harness)[0]).toEqual({
                enabled: true,
                ...preset.seed,
                // The two primitives the backend's `@AllArgsConstructor`
                // requires; legacy's Torbox preset omits `addPaused`.
                addPaused: preset.seed.addPaused === true,
            });
        });
    }

    it("posts the seeded entry to the connection check", async () => {
        const fetchMock = checkOk();
        renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toContain("internalapi/downloader/checkConnection");
        expect(JSON.parse(init.body as string)).toMatchObject({
            addPaused: false,
            downloaderType: "SABNZBD",
            enabled: true,
            url: "http://localhost:8080",
        });
    });
});

describe("Downloading config tab per-type fields", () => {
    it("shows SABnzbd's API key but no username or password", async () => {
        renderDownloading({values: configWith({downloaders: [SABNZBD]})});
        await openEntry(0);

        expect(
            screen.getByTestId("config-input-downloading-downloaderDraft-name"),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-apiKey",
            ),
        ).toBeVisible();
        expect(
            screen.queryByTestId(
                "config-input-downloading-downloaderDraft-username",
            ),
        ).toBeNull();
        expect(
            screen.queryByTestId(
                "config-input-downloading-downloaderDraft-password",
            ),
        ).toBeNull();
    });

    it("shows NZBGet's username and password but no API key", async () => {
        renderDownloading({values: configWith({downloaders: [NZBGET]})});
        await openEntry(0);

        expect(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-username",
            ),
        ).toBeVisible();
        expect(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-password",
            ),
        ).toBeVisible();
        expect(
            screen.queryByTestId(
                "config-input-downloading-downloaderDraft-apiKey",
            ),
        ).toBeNull();
    });

    it("shows only Torbox's three fields", async () => {
        renderDownloading({fetchMock: checkOk()});
        await addFromPreset("TORBOX");

        expect(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-enabled",
            ),
        ).toBeInTheDocument();
        expect(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-apiKey",
            ),
        ).toBeVisible();
        for (const field of [
            "name",
            "url",
            "defaultCategory",
            "nzbAddingType",
            "addPaused",
        ]) {
            expect(
                screen.queryByTestId(
                    `config-input-downloading-downloaderDraft-${field}`,
                ),
            ).toBeNull();
        }
    });

    it("edits credentials through C-SECRET-INPUT and never invents the marker", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });
        await openEntry(0);

        const apiKey = screen.getByTestId(
            "config-input-downloading-downloaderDraft-apiKey",
        );
        // A masked value is shown as an empty field with a placeholder, not as
        // the marker text.
        expect(apiKey).toHaveValue("");
        expect(apiKey).toHaveAttribute("placeholder", "Value unchanged");
        expect(apiKey).toHaveAttribute("type", "password");

        // Submitting without touching it keeps the server's marker byte for
        // byte, and runs no connection check because nothing relevant changed.
        submitDialog();
        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );
        expect(downloadersOf(harness)[0].apiKey).toBe(UNCHANGED_SECRET_MARKER);
    });
});

describe("Downloading config tab downloader transaction", () => {
    it("discards a cancelled new entry", async () => {
        const harness = renderDownloading();

        await addFromPreset("SABNZBD");
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-name"),
            {target: {value: "Typed but cancelled"}},
        );
        fireEvent.click(screen.getByTestId("config-downloader-dialog-cancel"));

        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );
        expect(downloadersOf(harness)).toEqual([]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("discards a cancelled edit of an existing entry", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });

        await openEntry(0);
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
            {target: {value: "http://elsewhere:1234"}},
        );
        fireEvent.change(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-apiKey",
            ),
            {target: {value: "a-new-secret"}},
        );
        fireEvent.click(screen.getByTestId("config-downloader-dialog-cancel"));

        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );
        expect(downloadersOf(harness)[0]).toEqual(SABNZBD);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("resets the dialog's own edits without touching the form", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });

        await openEntry(0);
        const name = screen.getByTestId(
            "config-input-downloading-downloaderDraft-name",
        );
        fireEvent.change(name, {target: {value: "Renamed"}});
        expect(name).toHaveValue("Renamed");

        fireEvent.click(screen.getByTestId("config-downloader-dialog-reset"));
        await waitFor(() => expect(name).toHaveValue("Sab"));
        expect(downloadersOf(harness)[0]).toEqual(SABNZBD);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("commits an edit on submit and marks the form dirty", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });

        await openEntry(0);
        fireEvent.change(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-defaultCategory",
            ),
            {target: {value: "movies"}},
        );
        submitDialog();

        await waitFor(() =>
            expect(downloadersOf(harness)[0].defaultCategory).toBe("movies"),
        );
        expect(downloadersOf(harness)[0]).toEqual({
            ...SABNZBD,
            defaultCategory: "movies",
        });
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("true");
    });

    it("deletes an entry from the dialog and offers no delete for a new one", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD, NZBGET]}),
        });

        await addFromPreset("SABNZBD");
        expect(
            screen.queryByTestId("config-downloader-dialog-delete"),
        ).toBeNull();
        fireEvent.click(screen.getByTestId("config-downloader-dialog-cancel"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );

        await openEntry(0);
        fireEvent.click(screen.getByTestId("config-downloader-dialog-delete"));

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
        expect(downloadersOf(harness)[0]).toEqual(NZBGET);
        expect(screen.queryByTestId("config-downloader-dialog")).toBeNull();
    });

    it("refuses to submit an entry with a duplicate or missing name", async () => {
        const fetchMock = checkOk();
        const harness = renderDownloading({
            fetchMock,
            values: configWith({downloaders: [SABNZBD]}),
        });

        await addFromPreset("SABNZBD");
        const name = screen.getByTestId(
            "config-input-downloading-downloaderDraft-name",
        );
        fireEvent.change(name, {target: {value: "Sab"}});
        submitDialog();

        expect(
            await screen.findByText('Downloader "Sab" already exists'),
        ).toBeVisible();
        expect(fetchMock).not.toHaveBeenCalled();
        expect(downloadersOf(harness)).toHaveLength(1);

        fireEvent.change(name, {target: {value: ""}});
        submitDialog();
        expect(await screen.findByText("This field is required")).toBeVisible();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("keeps the list order and edits the row it was opened from", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD, NZBGET]}),
        });

        expect(
            screen.getByTestId(`config-repeat-entry-${LIST}-0`),
        ).toHaveTextContent("Sab");
        expect(
            screen.getByTestId(`config-repeat-entry-${LIST}-1`),
        ).toHaveTextContent("Get");

        await openEntry(1);
        fireEvent.change(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-defaultCategory",
            ),
            {target: {value: "tv"}},
        );
        submitDialog();

        await waitFor(() =>
            expect(downloadersOf(harness)[1].defaultCategory).toBe("tv"),
        );
        expect(downloadersOf(harness)[0]).toEqual(SABNZBD);
    });

    it("toggles a downloader from the list without opening the dialog", async () => {
        const harness = renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });

        fireEvent.click(
            screen.getByTestId(
                "config-input-downloading-downloaders-0-enabled",
            ),
        );

        await waitFor(() =>
            expect(downloadersOf(harness)[0].enabled).toBe(false),
        );
        expect(screen.queryByTestId("config-downloader-dialog")).toBeNull();
    });

    it("renders the type through a label map and gives a Torbox row's URL an explicit empty state", () => {
        renderDownloading({
            values: configWith({downloaders: [NZBGET, SABNZBD, TORBOX]}),
        });

        // The raw enum constant never reaches the screen.
        expect(
            screen.getByTestId(`config-downloader-value-0-downloaderType`),
        ).toHaveTextContent("NZBGet");
        expect(screen.queryByText("NZBGET")).toBeNull();
        expect(
            screen.getByTestId(`config-downloader-value-1-downloaderType`),
        ).toHaveTextContent("SABnzbd");
        expect(screen.queryByText("SABNZBD")).toBeNull();
        expect(
            screen.getByTestId(`config-downloader-value-2-downloaderType`),
        ).toHaveTextContent("Torbox");

        // Torbox has no `url` field at all; the cell says so in words rather
        // than rendering blank or the literal string "undefined".
        const torboxUrl = screen.getByTestId("config-downloader-value-2-url");
        expect(torboxUrl).toHaveTextContent("Not applicable");
        expect(torboxUrl).not.toHaveTextContent("undefined");

        // The other two rows still show their real URL.
        expect(
            screen.getByTestId("config-downloader-value-0-url"),
        ).toHaveTextContent(String(NZBGET.url));
        expect(
            screen.getByTestId("config-downloader-value-1-url"),
        ).toHaveTextContent(String(SABNZBD.url));
    });

    it("stacks every column of an entry into one cell on a phone, dropping nothing", () => {
        stubMobileViewport();
        renderDownloading({
            values: configWith({downloaders: [SABNZBD]}),
        });

        expect(
            screen.getAllByRole("columnheader").map((cell) => cell.textContent),
        ).toEqual(["Downloader"]);

        // Every piece is still there, still once, and still in this entry's
        // own row — a stacked cell, not a dropped column.
        const row = screen.getByTestId(`config-repeat-entry-${LIST}-0`);
        expect(
            within(row).getByTestId(
                "config-repeat-edit-downloading-downloaders-0",
            ),
        ).toHaveTextContent("Sab");
        expect(
            within(row).getByTestId("config-downloader-value-0-downloaderType"),
        ).toHaveTextContent("SABnzbd");
        expect(
            within(row).getByTestId("config-downloader-value-0-url"),
        ).toHaveTextContent(String(SABNZBD.url));
        expect(within(row).getByRole("switch")).toBeChecked();
        // Exactly one control per configuration path: the two layouts are
        // branches, never two rendered variants sharing a binding.
        expect(
            screen.getAllByTestId(
                "config-input-downloading-downloaders-0-enabled",
            ),
        ).toHaveLength(1);
    });
});

describe("Downloading config tab connection check", () => {
    it("closes the dialog and adds the entry when the check succeeds", async () => {
        const fetchMock = checkOk();
        const harness = renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(screen.queryByTestId("config-downloader-dialog")).toBeNull();
        expect(
            screen.getByText(
                "Connection to the downloader tested successfully",
            ),
        ).toBeVisible();
    });

    it("shows the in-flight state while the check runs", async () => {
        let release: (value: Response) => void = () => undefined;
        const fetchMock = vi.fn<typeof fetch>(
            () =>
                new Promise<Response>((resolve) => {
                    release = resolve;
                }),
        );
        renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        expect(
            await screen.findByTestId("config-downloader-dialog-checking"),
        ).toBeVisible();
        expect(
            screen.getByTestId("config-downloader-dialog-submit"),
        ).toBeDisabled();

        release(jsonResponse({message: null, successful: true}));
        await waitFor(() =>
            expect(
                screen.queryByTestId("config-downloader-dialog-checking"),
            ).toBeNull(),
        );
    });

    it("blocks every way out of the dialog while the check is in flight", async () => {
        let release: (value: Response) => void = () => undefined;
        const fetchMock = vi.fn<typeof fetch>(
            () =>
                new Promise<Response>((resolve) => {
                    release = resolve;
                }),
        );
        const harness = renderDownloading({
            fetchMock,
            values: configWith({downloaders: [SABNZBD]}),
        });

        await openEntry(0);
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
            {target: {value: "http://moved:8080"}},
        );
        submitDialog();
        await screen.findByTestId("config-downloader-dialog-checking");

        // Legacy blocks the whole dialog (`blockUI.start`), not just Submit:
        // Cancel, Reset, and Delete would each end a transaction whose answer
        // is still on its way.
        for (const action of ["cancel", "reset", "delete", "submit"]) {
            expect(
                screen.getByTestId(`config-downloader-dialog-${action}`),
            ).toBeDisabled();
        }
        fireEvent.keyDown(screen.getByTestId("config-downloader-dialog"), {
            key: "Escape",
        });
        expect(screen.getByTestId("config-downloader-dialog")).toBeVisible();
        expect(downloadersOf(harness)[0]).toEqual(SABNZBD);

        release(jsonResponse({message: null, successful: true}));
        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );
        expect(downloadersOf(harness)[0].url).toBe("http://moved:8080");
    });

    it("discards the answer to a check whose new entry was cancelled meanwhile", async () => {
        const harness = renderDownloading({fetchMock: checkFails()});

        await addFromPreset("SABNZBD");
        submitDialog();
        // The failure confirmation releases legacy's block, so the dialog
        // behind it is live again while this check is still unanswered.
        await screen.findByRole("button", {name: "I know what I'm doing"});

        fireEvent.click(screen.getByTestId("config-downloader-dialog-cancel"));
        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );

        // The admin now answers the check for a transaction that no longer
        // exists: it must not write the entry the cancel discarded.
        fireEvent.click(
            screen.getByRole("button", {name: "I know what I'm doing"}),
        );

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-downloader-connection-failed"),
            ).toBeNull(),
        );
        expect(downloadersOf(harness)).toEqual([]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");
    });

    it("does not resurrect an entry deleted while its check was unanswered", async () => {
        const harness = renderDownloading({
            fetchMock: checkFails(),
            values: configWith({downloaders: [SABNZBD, NZBGET]}),
        });

        await openEntry(0);
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
            {target: {value: "http://moved:8080"}},
        );
        submitDialog();
        await screen.findByRole("button", {name: "I know what I'm doing"});

        fireEvent.click(screen.getByTestId("config-downloader-dialog-delete"));
        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));

        fireEvent.click(
            screen.getByRole("button", {name: "I know what I'm doing"}),
        );

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-downloader-connection-failed"),
            ).toBeNull(),
        );
        expect(downloadersOf(harness)).toEqual([NZBGET]);
    });

    it("explains a failure and keeps the entry when the admin insists", async () => {
        const fetchMock = checkFails("Failed to connect to /127.0.0.1:5099");
        const harness = renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        expect(
            await screen.findByText("Failed to connect to /127.0.0.1:5099"),
        ).toBeVisible();
        expect(screen.getByText("Do you want to add it anyway?")).toBeVisible();
        fireEvent.click(
            screen.getByRole("button", {name: "I know what I'm doing"}),
        );

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
        expect(downloadersOf(harness)[0].enabled).toBe(true);
        expect(screen.queryByTestId("config-downloader-dialog")).toBeNull();
    });

    it("adds the entry disabled when the admin picks that", async () => {
        const harness = renderDownloading({fetchMock: checkFails()});

        await addFromPreset("SABNZBD");
        submitDialog();

        fireEvent.click(
            await screen.findByRole("button", {name: "Add it, but disabled"}),
        );

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
        expect(downloadersOf(harness)[0].enabled).toBe(false);
    });

    it("keeps the dialog open and commits nothing when the admin goes back", async () => {
        const fetchMock = checkFails();
        const harness = renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        fireEvent.click(
            await screen.findByRole("button", {name: "Aahh, let me try again"}),
        );

        await waitFor(() =>
            expect(
                screen.queryByTestId("config-downloader-connection-failed"),
            ).toBeNull(),
        );
        expect(screen.getByTestId("config-downloader-dialog")).toBeVisible();
        expect(downloadersOf(harness)).toEqual([]);
        expect(screen.getByTestId("form-dirty")).toHaveTextContent("false");

        // Correcting the URL and retrying against a working downloader
        // completes the same transaction.
        fetchMock.mockResolvedValue(
            jsonResponse({message: null, successful: true}),
        );
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
            {target: {value: "http://corrected:8080"}},
        );
        submitDialog();

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
        expect(downloadersOf(harness)[0].url).toBe("http://corrected:8080");
    });

    it("offers the untested wording when the check itself could not run", async () => {
        const fetchMock = vi.fn<typeof fetch>(() =>
            Promise.resolve(
                new Response("Bad Request", {
                    headers: {"content-type": "text/plain"},
                    status: 400,
                }),
            ),
        );
        const harness = renderDownloading({fetchMock});

        await addFromPreset("SABNZBD");
        submitDialog();

        expect(
            await screen.findByText(
                "The connection to the downloader could not be tested, sorry. Please check the log.",
            ),
        ).toBeVisible();
        fireEvent.click(screen.getByRole("button", {name: "I'll risk it"}));

        await waitFor(() => expect(downloadersOf(harness)).toHaveLength(1));
    });

    it("re-checks an existing entry only when a connection setting changed", async () => {
        const fetchMock = checkOk();
        renderDownloading({
            fetchMock,
            values: configWith({downloaders: [SABNZBD]}),
        });

        // Editing something unrelated closes without a check.
        await openEntry(0);
        fireEvent.change(
            screen.getByTestId(
                "config-input-downloading-downloaderDraft-defaultCategory",
            ),
            {target: {value: "movies"}},
        );
        submitDialog();
        await waitFor(() =>
            expect(screen.queryByTestId("config-downloader-dialog")).toBeNull(),
        );
        expect(fetchMock).not.toHaveBeenCalled();

        // Changing the URL does run the check.
        await openEntry(0);
        fireEvent.change(
            screen.getByTestId("config-input-downloading-downloaderDraft-url"),
            {target: {value: "http://moved:8080"}},
        );
        submitDialog();
        await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    });
});

/**
 * The dialog is portalled to the document body, but React context crosses a
 * portal, so its advanced rows are context-descendants of
 * `<ConfigFieldset label="Downloaders">` and used to register with it. The
 * fieldset's count is read straight off its state on every render, so the only
 * honest assertion is on the count itself: `hiddenCount === 0` is exactly the
 * absence of the expander *element*, not an invisible one.
 */
function advancedExpanders(): {label: string; text: string}[] {
    return screen
        .queryAllByTestId(/^config-advanced-expander-/)
        .map((node) => ({
            label: (node.getAttribute("data-testid") ?? "").replace(
                "config-advanced-expander-",
                "",
            ),
            text: node.textContent ?? "",
        }));
}

describe("Downloading config tab dialog advanced disclosure", () => {
    it("leaves the Downloaders fieldset's hidden count at zero while the dialog is open", async () => {
        renderDownloading({
            showAdvanced: false,
            values: configWith({downloaders: [SABNZBD]}),
        });

        const closed = advancedExpanders();
        expect(closed).toEqual([
            {label: "general", text: "3 advanced settings hidden"},
        ]);

        await openEntry(0);

        // The dialog's own advanced rows are hidden, as the toggle says, but
        // they belong to nobody: the host fieldset counts none of them.
        expect(
            screen.queryByTestId(
                "config-setting-downloading-downloaderDraft-nzbAddingType",
            ),
        ).toBeNull();
        expect(
            screen.queryByTestId("config-advanced-expander-downloaders"),
        ).toBeNull();
        expect(advancedExpanders()).toEqual(closed);
    });

    it("still shows the dialog's advanced rows with the toggle on, and offers no expander", async () => {
        renderDownloading({
            showAdvanced: true,
            values: configWith({downloaders: [SABNZBD]}),
        });

        expect(advancedExpanders()).toEqual([]);

        await openEntry(0);

        expect(
            screen.getByTestId(
                "config-setting-downloading-downloaderDraft-nzbAddingType",
            ),
        ).toBeVisible();
        expect(advancedExpanders()).toEqual([]);
    });
});
