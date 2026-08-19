import {
    Alert,
    Button,
    MenuItem,
    Select,
    Stack,
    Typography,
} from "@mui/material";
import type {Theme} from "@mui/material/styles";
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

// The mock's primary bulk-action button (`sendToDownloader`): filled
// `primary.main`/`primary.contrastText` when enabled, `8px` radius, `8px
// 14px` padding, `13px` weight-600 text; when `disabled` (real control
// semantics, unchanged from FM-040 -- never opacity alone) it renders on the
// mock's neutral control surface with muted text instead of MUI's default
// greyed-out disabled treatment. FM-054 (ADR-0014): the surface/text values
// are the theme's own `surfaces.control`/`surfaces.mutedText` tokens now,
// not restated literals.
const primaryActionSx = (theme: Theme) =>
    ({
        borderRadius: theme.shape.borderRadius,
        fontSize: "13px",
        fontWeight: 600,
        padding: "8px 14px",
        "&.Mui-disabled": {
            backgroundColor: "surfaces.control",
            color: "surfaces.mutedText",
        },
    }) as const;

// The mock's secondary bulk-action button (`downloadZip`): the same neutral
// control surface and border in both states, distinguishing it from the
// primary action by omitting the filled teal background.
const secondaryActionSx = (theme: Theme) =>
    ({
        backgroundColor: "surfaces.control",
        border: "1px solid",
        borderColor: "surfaces.hairline",
        borderRadius: theme.shape.borderRadius,
        color: "text.primary",
        fontSize: "13px",
        padding: "8px 12px",
        "&:hover": {
            backgroundColor: "surfaces.control",
            borderColor: "surfaces.hairline",
        },
        "&.Mui-disabled": {
            backgroundColor: "surfaces.control",
            borderColor: "surfaces.hairline",
            color: "surfaces.mutedText",
        },
    }) as const;

// The `results-download-actions` region's own controls (downloader select,
// downloader-category select, black-hole/save, copy-links, Save search)
// restyle to the same neutral control surface, radius, and typography as the
// bulk-actions bar's secondary button, with no change to which controls are
// present, their order, or their behavior. The downloader/category selects
// stay a bare `Select` with an `aria-label` (ADR-0014 names `Select` with
// `InputLabel` as the standard alternative to `TextField select`, and this
// row genuinely lacks room for a floating label -- a real-browser measurement
// during this task's own verification confirmed a `TextField select` with a
// visible "Downloader category" label pushes this dense action row past the
// viewport width and fails `results.spec.ts`'s no-horizontal-overflow
// contract, the same trade-off `SearchWorkspace.tsx`'s own `AdvancedRangeInput`
// already documents for its 100px min/max fields). The recessed
// surface/hairline border still come from the theme's own `MuiOutlinedInput`
// default -- no local select styling remains.
const downloadActionsButtonSx = secondaryActionSx;

export function DownloadActions({
    results,
    safeConfig,
    onDownloaded,
    filteredCount,
    loadedCount,
    onSaveSearch,
    savingSearch = false,
}: {
    results: SearchResult[];
    safeConfig: unknown;
    onDownloaded: (ids: number[]) => void;
    // Loaded/filtered counts for the bulk-actions bar (FM-040). Selected
    // count is `results.length`; `results` is already the caller's
    // selected-results subset, so no separate prop is needed for it.
    filteredCount: number;
    loadedCount: number;
    onSaveSearch?: () => Promise<void>;
    savingSearch?: boolean;
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
        <>
            {/* The bulk-actions bar (FM-040): loaded/filtered/selected
                counts plus the two primary, selection-gated actions --
                "Send to downloader" and the NZB ZIP download. Both are
                `disabled` (not a toast) until something is selected, per
                F-SEARCH-GROUP-SELECTION/F-SEARCH-DOWNLOADS. Every other
                bulk capability (downloader/category select, black-hole
                save, copy links, Save search) stays in the separate
                `results-download-actions` region below, unchanged in
                behavior. */}
            <Stack
                alignItems="center"
                data-testid="results-bulk-actions"
                direction="row"
                flexWrap="wrap"
                gap={1.5}
            >
                <Typography
                    data-testid="results-bulk-actions-summary"
                    variant="body2"
                >
                    {filteredCount} of {loadedCount} loaded results
                </Typography>
                {results.length > 0 && (
                    <Typography
                        color="primary"
                        data-testid="results-selected-count"
                        variant="body2"
                    >
                        {results.length} selected
                    </Typography>
                )}
                {downloaders.length > 0 && (
                    <Button
                        data-testid="send-to-downloader"
                        disabled={
                            busy ||
                            Boolean(categoryError) ||
                            results.length === 0
                        }
                        onClick={send}
                        size="small"
                        sx={primaryActionSx}
                        variant="contained"
                    >
                        Send selected to downloader
                    </Button>
                )}
                {settings.zip && (
                    <Button
                        disabled={busy || selectedNzbs.length === 0}
                        onClick={zip}
                        size="small"
                        sx={secondaryActionSx}
                        variant="outlined"
                    >
                        Download selected NZBs as ZIP
                    </Button>
                )}
            </Stack>
            <Stack
                alignItems="center"
                direction="row"
                flexWrap="wrap"
                gap={1}
                aria-label="Selected result download actions"
                data-testid="results-download-actions"
            >
                {onSaveSearch && (
                    <Button
                        disabled={savingSearch}
                        id="save-search"
                        onClick={() => void onSaveSearch()}
                        size="small"
                        sx={downloadActionsButtonSx}
                        variant="outlined"
                    >
                        {savingSearch ? "Saving search…" : "Save search"}
                    </Button>
                )}
                {downloaders.length === 0 && (
                    <Alert severity="info">
                        No downloader is configured for selected-result sends.
                    </Alert>
                )}
                {categoryError && (
                    <Alert severity="error">{categoryError}</Alert>
                )}
                {downloaders.length > 0 && (
                    <>
                        <Select
                            aria-label="Downloader"
                            size="small"
                            sx={{fontSize: "13px"}}
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
                            sx={{fontSize: "13px"}}
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
                    </>
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
                                          () =>
                                              saveNzbs(transport, selectedNzbs),
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
                        size="small"
                        sx={downloadActionsButtonSx}
                        variant="outlined"
                    >
                        Send selected to black hole
                    </Button>
                )}
                <Button
                    onClick={copy}
                    size="small"
                    sx={downloadActionsButtonSx}
                    variant="outlined"
                >
                    Copy selected links
                </Button>
            </Stack>
        </>
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
            aria-label={`Download ${type.toUpperCase()}`}
            component="a"
            data-testid={type === "nzb" ? "download-nzb" : "download-torrent"}
            download
            href={transport.browserTransferUrl(
                `get${type}/user/${downloadId(result)}`,
            )}
            onClick={onDownloaded}
            size="small"
            sx={{minWidth: 0, whiteSpace: "nowrap"}}
            variant="outlined"
        >
            {type === "nzb" ? "NZB" : "Torrent"}
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
