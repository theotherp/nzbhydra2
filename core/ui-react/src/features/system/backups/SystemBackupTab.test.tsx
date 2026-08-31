import {ThemeProvider} from "@mui/material";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ApiTransport, type UploadProgress} from "../../../api/transport";
import {createHydraTheme} from "../../../app/theme";
import type {BootstrapData} from "../../../bootstrap";
import {DialogProvider} from "../../../components/dialogs/DialogProvider";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {SystemBackupTab} from "./SystemBackupTab";

type Backend = {
    fetch: ReturnType<typeof vi.fn<typeof fetch>>;
    requests: string[];
};

const backupList = [
    {creationDate: "2026-08-20T08:30:00Z", filename: "nzbhydra-newer.zip"},
    {creationDate: "2026-08-19T08:30:00Z", filename: "nzbhydra-older.zip"},
];

const bootstrap = {
    baseUrl: "/hydra/",
    serverTimeZone: "UTC",
} as unknown as BootstrapData;

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
        status,
    });
}

function createBackend(
    answer: (path: string) => Response | undefined = () => undefined,
): Backend {
    const backend: Backend = {fetch: vi.fn<typeof fetch>(), requests: []};
    backend.fetch.mockImplementation(async (input: RequestInfo | URL) => {
        const url = new URL(String(input));
        backend.requests.push(`${url.pathname}${url.search}`);
        const answered = answer(url.pathname);
        if (answered !== undefined) {
            return answered;
        }
        if (url.pathname.endsWith("/backup/list")) {
            return jsonResponse(backupList);
        }
        return jsonResponse({successful: true});
    });
    return backend;
}

function renderBackupTab(backend: Backend): ApiTransport {
    vi.stubGlobal("fetch", backend.fetch);
    const transport = new ApiTransport("/hydra/", backend.fetch);
    render(
        <ThemeProvider theme={createHydraTheme("grey")}>
            <QueryClientProvider
                client={
                    new QueryClient({defaultOptions: {queries: {retry: false}}})
                }
            >
                <ToastProvider>
                    <DialogProvider>
                        <SystemBackupTab
                            bootstrap={bootstrap}
                            transport={transport}
                        />
                    </DialogProvider>
                </ToastProvider>
            </QueryClientProvider>
        </ThemeProvider>,
    );
    return transport;
}

/** A stand-in for the transport's upload method, driven by the test. */
function mockUpload(transport: ApiTransport) {
    const state: {
        onProgress?: (progress: UploadProgress) => void;
        resolve?: (value: unknown) => void;
        body?: FormData;
    } = {};
    vi.spyOn(transport, "upload").mockImplementation(
        (_path, body, options = {}) => {
            state.body = body;
            state.onProgress = options.onProgress;
            return new Promise((resolve) => {
                state.resolve = resolve;
            });
        },
    );
    return state;
}

function chooseFile(name = "backup.zip") {
    const file = new File(["backup bytes"], name, {type: "application/zip"});
    fireEvent.change(screen.getByTestId("system-backup-upload"), {
        target: {files: [file]},
    });
    return file;
}

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("SystemBackupTab", () => {
    it("should list the existing backups with a download link and a restore action", async () => {
        const backend = createBackend();
        renderBackupTab(backend);

        expect(await screen.findByTestId("system-backup-table")).toBeVisible();
        expect(screen.getAllByTestId("system-backup-row")).toHaveLength(2);
        expect(screen.getByTestId("system-backup-download-0")).toHaveAttribute(
            "href",
            "http://localhost:3000/hydra/internalapi/backup/download?filename=nzbhydra-newer.zip",
        );
        expect(
            screen.getByTestId("system-backup-download-0"),
        ).toHaveTextContent("nzbhydra-newer.zip");
        // The server's timezone, not the browser's.
        expect(screen.getByText("Aug 20, 2026, 8:30 AM")).toBeVisible();
        expect(screen.getByTestId("system-backup-restore-1")).toBeVisible();
    });

    it("should report a backup list it cannot read", async () => {
        renderBackupTab(createBackend(() => jsonResponse({}, 500)));

        expect(
            await screen.findByText("Unable to load the existing backups."),
        ).toBeVisible();
        expect(screen.queryByTestId("system-backup-table")).toBeNull();
    });

    it("should create a backup without downloading it and refresh the list", async () => {
        const backend = createBackend();
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");
        const listCallsBefore = backend.requests.filter((path) =>
            path.includes("/backup/list"),
        ).length;

        fireEvent.click(screen.getByTestId("system-backup-create-only"));

        await waitFor(() =>
            expect(
                backend.requests.filter((path) => path.includes("/backup/list"))
                    .length,
            ).toBe(listCallsBefore + 1),
        );
        expect(backend.requests).toContain(
            "/hydra/internalapi/backup/backuponly?dontdownload=true",
        );
        expect(backend.requests).not.toContain(
            "/hydra/internalapi/backup/backup",
        );
    });

    it("should report a creation the server refuses inside a 200 response", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/backup/backuponly")
                ? jsonResponse({message: "No backup folder", successful: false})
                : undefined,
        );
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");

        fireEvent.click(screen.getByTestId("system-backup-create-only"));

        expect(await screen.findByText("No backup folder")).toBeVisible();
    });

    it("should stream a created backup to the browser under legacy's file name and refresh the list", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/backup/backup")
                ? new Response("zip bytes")
                : undefined,
        );
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");
        const createObjectURL = vi.fn().mockReturnValue("blob:backup");
        const revokeObjectURL = vi.fn();
        vi.stubGlobal(
            "URL",
            Object.assign(URL, {createObjectURL, revokeObjectURL}),
        );
        const downloaded: string[] = [];
        const click = vi
            .spyOn(HTMLAnchorElement.prototype, "click")
            .mockImplementation(function (this: HTMLAnchorElement) {
                downloaded.push(this.download);
            });
        // The name legacy derived from the moment of the click.
        vi.useFakeTimers({shouldAdvanceTime: true});
        vi.setSystemTime(new Date(2026, 7, 20, 9, 5));

        fireEvent.click(screen.getByTestId("system-backup-create-download"));

        await waitFor(() => expect(click).toHaveBeenCalled());
        expect(createObjectURL).toHaveBeenCalled();
        expect(revokeObjectURL).toHaveBeenCalledWith("blob:backup");
        expect(downloaded).toEqual(["nzbhydra-backup-2026-08-20-09-05.zip"]);
        expect(backend.requests).toContain("/hydra/internalapi/backup/backup");
        await waitFor(() =>
            expect(
                backend.requests.filter((path) => path.includes("/backup/list"))
                    .length,
            ).toBeGreaterThan(1),
        );
    });

    it("should confirm before restoring an existing backup and then hand off to the restart countdown", async () => {
        const backend = createBackend();
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");

        fireEvent.click(screen.getByTestId("system-backup-restore-1"));

        const confirmation = await screen.findByTestId(
            "system-backup-restore-confirm",
        );
        expect(confirmation).toHaveTextContent("nzbhydra-older.zip");
        // Nothing has been restored yet.
        expect(
            backend.requests.some((path) => path.includes("/backup/restore")),
        ).toBe(false);

        vi.useFakeTimers();
        fireEvent.click(
            screen.getByRole("button", {name: "Restore and restart"}),
        );
        await act(async () => {
            await vi.advanceTimersByTimeAsync(3500);
        });

        expect(backend.requests).toContain(
            "/hydra/internalapi/backup/restore?filename=nzbhydra-older.zip",
        );
        expect(
            screen.getByTestId("restart-progress-message"),
        ).toHaveTextContent(
            "Extraction of backup successful. Restarting for wrapper to restore data. Will reload page when NZBHydra is back.",
        );
    });

    it("should leave an existing backup alone when the confirmation is cancelled", async () => {
        const backend = createBackend();
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");

        fireEvent.click(screen.getByTestId("system-backup-restore-0"));
        await screen.findByTestId("system-backup-restore-confirm");
        fireEvent.click(screen.getByRole("button", {name: "Cancel"}));

        await waitFor(() =>
            expect(
                screen.queryByTestId("system-backup-restore-confirm"),
            ).toBeNull(),
        );
        expect(
            backend.requests.some((path) => path.includes("/backup/restore")),
        ).toBe(false);
        expect(screen.queryByTestId("restart-progress-dialog")).toBeNull();
    });

    it("should report a restore the server refuses without restarting", async () => {
        const backend = createBackend((path) =>
            path.endsWith("/backup/restore")
                ? jsonResponse({
                      message: "Backup file is corrupt",
                      successful: false,
                  })
                : undefined,
        );
        renderBackupTab(backend);
        await screen.findByTestId("system-backup-table");

        fireEvent.click(screen.getByTestId("system-backup-restore-0"));
        await screen.findByTestId("system-backup-restore-confirm");
        fireEvent.click(
            screen.getByRole("button", {name: "Restore and restart"}),
        );

        expect(await screen.findByText("Backup file is corrupt")).toBeVisible();
        expect(screen.queryByTestId("restart-progress-dialog")).toBeNull();
    });

    it("should show upload progress and hand off to the restart countdown when the upload succeeds", async () => {
        const backend = createBackend();
        const transport = renderBackupTab(backend);
        const upload = mockUpload(transport);
        await screen.findByTestId("system-backup-table");

        const file = chooseFile();

        const progressBar = await screen.findByTestId(
            "system-backup-upload-progress",
        );
        expect(progressBar).toBeVisible();
        // The controller's multipart field name, carrying the chosen file.
        const part = upload.body?.get("file") as File;
        expect(part.name).toBe(file.name);
        expect(part.size).toBe(file.size);

        act(() =>
            upload.onProgress?.({loaded: 512 * 1024, total: 1024 * 1024}),
        );
        expect(progressBar).toHaveTextContent(
            "Uploading: 512 kB of 1,024 kB (50%)",
        );
        expect(screen.getByRole("progressbar")).toHaveAttribute(
            "aria-valuenow",
            "50",
        );

        vi.useFakeTimers();
        await act(async () => {
            upload.resolve?.({successful: true});
            await vi.advanceTimersByTimeAsync(3500);
        });

        expect(
            screen.getByTestId("restart-progress-message"),
        ).toHaveTextContent(
            "Upload successful. Restarting for wrapper to restore data. Will reload page when NZBHydra is back.",
        );
    });

    it("should treat a refused upload as a refusal, resetting progress and showing the message", async () => {
        const backend = createBackend();
        const transport = renderBackupTab(backend);
        const upload = mockUpload(transport);
        await screen.findByTestId("system-backup-table");

        chooseFile("notes.txt");
        await screen.findByTestId("system-backup-upload-progress");

        // The refusal arrives inside an HTTP 200 body, so the transport
        // resolves rather than throwing.
        await act(async () => {
            upload.resolve?.({
                message: "Not a valid backup file",
                successful: false,
            });
        });

        expect(
            await screen.findByText("Not a valid backup file"),
        ).toBeVisible();
        expect(
            screen.queryByTestId("system-backup-upload-progress"),
        ).toBeNull();
        expect(screen.queryByTestId("restart-progress-dialog")).toBeNull();
    });

    it("should show an indeterminate bar while the upload's total is unknown", async () => {
        const backend = createBackend();
        const transport = renderBackupTab(backend);
        const upload = mockUpload(transport);
        await screen.findByTestId("system-backup-table");

        chooseFile();
        const progressBar = await screen.findByTestId(
            "system-backup-upload-progress",
        );
        act(() => upload.onProgress?.({loaded: 2048, total: null}));

        expect(progressBar).toHaveTextContent("Uploading: 2 kB");
        expect(screen.getByRole("progressbar")).not.toHaveAttribute(
            "aria-valuenow",
        );
    });
});
