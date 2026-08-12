import {Alert, Button, MenuItem, Select, Stack} from "@mui/material";
import {useEffect, useMemo, useState} from "react";

import type {SearchResult} from "../../../api/search";
import {ApiTransport} from "../../../api/transport";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {
    addFilesRequest,
    categories,
    configuredDownloaders,
    downloadId,
    downloadSettings,
    downloadZip,
    prepareZip,
    requiresDuplicateReason,
    saveNzbs,
    saveOrSendTorrents,
    sendToDownloader,
} from "../../../domain/downloads/actions";
import type {Downloader} from "../../../domain/downloads/actions";

export function DownloadActions({
    results,
    safeConfig,
    onDownloaded,
}: {
    results: SearchResult[];
    safeConfig: unknown;
    onDownloaded: (ids: number[]) => void;
}) {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const transport = useMemo(() => new ApiTransport(bootstrapBase()), []);
    const downloaders = configuredDownloaders(safeConfig);
    const settings = downloadSettings(safeConfig);
    const [downloader, setDownloader] = useState<Downloader | undefined>(
        downloaders[0],
    );
    const [downloaderCategories, setDownloaderCategories] = useState<string[]>(
        [],
    );
    const [categoryError, setCategoryError] = useState<string>();
    const [category, setCategory] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const selectedNzbs = results.filter(
        (result) => result.downloadType === "NZB",
    );
    const selectedTorrents = results.filter(
        (result) => result.downloadType === "TORRENT",
    );
    useEffect(() => {
        if (!downloader) {
            return;
        }
        setCategoryError(undefined);
        void categories(transport, downloader)
            .then((values) => {
                setDownloaderCategories(values);
                setCategory(
                    values.includes(downloader.defaultCategory ?? "")
                        ? (downloader.defaultCategory ?? null)
                        : null,
                );
            })
            .catch(() => {
                setDownloaderCategories([]);
                setCategoryError(
                    "Unable to load downloader categories. Choose another downloader or try again.",
                );
            });
    }, [downloader, transport]);
    const execute = async (
        operation: () => Promise<{
            successful?: boolean;
            message?: string;
            addedIds?: number[];
        }>,
        success: string,
    ) => {
        if (results.length === 0) {
            return toasts.showToast({
                severity: "info",
                message: "You should select at least one result.",
            });
        }
        setBusy(true);
        try {
            const response = await operation();
            if (!response.successful) {
                return toasts.showToast({
                    severity: "error",
                    message: response.message ?? "The download action failed.",
                });
            }
            onDownloaded(response.addedIds ?? []);
            toasts.showToast({severity: "success", message: success});
        } catch {
            toasts.showToast({
                severity: "error",
                message: "Unable to complete the download action.",
            });
        } finally {
            setBusy(false);
        }
    };
    const send = async () => {
        if (!downloader) {
            return toasts.showToast({
                severity: "error",
                message: "No downloader is available.",
            });
        }
        if (categoryError) {
            return;
        }
        const sendableResults = results.filter((result) =>
            isCompatibleWithDownloader(result, downloader),
        );
        if (sendableResults.length === 0) {
            return toasts.showToast({
                severity: "info",
                message:
                    "None of the selected results can be sent to this downloader.",
            });
        }
        const request = addFilesRequest(
            downloader,
            sendableResults,
            null,
            null,
        );
        try {
            request.category = category;
            if (await requiresDuplicateReason(transport, request)) {
                const decision = await dialogs.confirm({
                    title: "Duplicate movie download",
                    message:
                        "This movie was downloaded before. Do you want to send it to the downloader?",
                    confirmLabel: "Send",
                });
                if (decision === "cancelled") {
                    return;
                }
            }
            await execute(
                () => sendToDownloader(transport, request),
                "Successfully added selected results.",
            );
        } catch {
            toasts.showToast({
                severity: "error",
                message: "Unable to check duplicate downloads.",
            });
        }
    };
    const copy = async () => {
        if (!results.length) {
            return toasts.showToast({
                severity: "info",
                message: "You should select at least one result.",
            });
        }
        try {
            await navigator.clipboard.writeText(
                results
                    .map((result) =>
                        transport.browserTransferUrl(
                            `getnzb/user/${downloadId(result)}`,
                        ),
                    )
                    .join("\n"),
            );
            toasts.showToast({
                severity: "success",
                message: `Copied ${results.length} links to clipboard.`,
            });
        } catch {
            toasts.showToast({
                severity: "error",
                message: "Failed to copy links to clipboard.",
            });
        }
    };
    const zip = async () =>
        execute(async () => {
            const response = await prepareZip(transport, selectedNzbs);
            if (response.successful && response.zipFilepath) {
                const blob = await downloadZip(transport, response.zipFilepath);
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "NZBHydra NZBs.zip";
                link.click();
                URL.revokeObjectURL(link.href);
            }
            return response;
        }, "Prepared NZB ZIP download.");
    return (
        <Stack
            direction="row"
            flexWrap="wrap"
            gap={1}
            aria-label="Selected result download actions"
        >
            {downloaders.length === 0 && (
                <Alert severity="info">
                    No downloader is configured for selected-result sends.
                </Alert>
            )}
            {categoryError && <Alert severity="error">{categoryError}</Alert>}
            {downloaders.length > 0 && (
                <>
                    <Select
                        aria-label="Downloader"
                        size="small"
                        value={downloader?.name ?? ""}
                        onChange={(event) =>
                            setDownloader(
                                downloaders.find(
                                    (value) =>
                                        value.name === event.target.value,
                                ),
                            )
                        }
                    >
                        {downloaders.map((value) => (
                            <MenuItem key={value.name} value={value.name}>
                                {value.name}
                            </MenuItem>
                        ))}
                    </Select>
                    <Select
                        aria-label="Downloader category"
                        size="small"
                        value={category ?? ""}
                        onChange={(event) =>
                            setCategory(event.target.value || null)
                        }
                    >
                        <MenuItem value="">Use downloader default</MenuItem>
                        {downloaderCategories.map((value) => (
                            <MenuItem key={value} value={value}>
                                {value}
                            </MenuItem>
                        ))}
                    </Select>
                    <Button
                        data-testid="send-to-downloader"
                        disabled={busy || Boolean(categoryError)}
                        onClick={send}
                    >
                        Send selected to downloader
                    </Button>
                </>
            )}
            {settings.zip && (
                <Button
                    disabled={busy || selectedNzbs.length === 0}
                    onClick={zip}
                >
                    Download selected NZBs as ZIP
                </Button>
            )}
            {(settings.saveNzbs ||
                settings.saveTorrents ||
                settings.sendMagnets) && (
                <Button
                    disabled={busy}
                    onClick={() =>
                        Promise.all([
                            selectedNzbs.length && settings.saveNzbs
                                ? execute(
                                      () => saveNzbs(transport, selectedNzbs),
                                      "Successfully saved NZBs.",
                                  )
                                : undefined,
                            selectedTorrents.length &&
                            (settings.saveTorrents || settings.sendMagnets)
                                ? execute(
                                      () =>
                                          saveOrSendTorrents(
                                              transport,
                                              selectedTorrents,
                                          ),
                                      "Successfully saved or sent torrents.",
                                  )
                                : undefined,
                        ])
                    }
                >
                    Send selected to black hole
                </Button>
            )}
            <Button onClick={copy}>Copy selected links</Button>
        </Stack>
    );
}

export function DirectDownloadActions({
    result,
    onDownloaded,
}: {
    result: SearchResult;
    onDownloaded: () => void;
}) {
    const type = result.downloadType === "TORRENT" ? "torrent" : "nzb";
    const transport = useMemo(() => new ApiTransport(bootstrapBase()), []);
    return (
        <Button
            component="a"
            data-testid={type === "nzb" ? "download-nzb" : "download-torrent"}
            download
            href={transport.browserTransferUrl(
                `get${type}/user/${downloadId(result)}`,
            )}
            onClick={onDownloaded}
        >
            Download {type.toUpperCase()}
        </Button>
    );
}

function bootstrapBase(): string {
    const value = window.__NZBHYDRA_BOOTSTRAP__;
    return typeof value === "object" &&
        value !== null &&
        "baseUrl" in value &&
        typeof value.baseUrl === "string"
        ? value.baseUrl
        : "/";
}

function isCompatibleWithDownloader(
    result: SearchResult,
    downloader: Downloader,
): boolean {
    if (result.downloadType === "TORBOX") {
        return downloader.downloaderType === "TORBOX";
    }
    return result.downloadType !== "TORRENT";
}
