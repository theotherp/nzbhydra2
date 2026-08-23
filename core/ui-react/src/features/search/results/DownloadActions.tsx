import {Alert, Button, MenuItem, Select, Stack} from "@mui/material";
import type {ReactNode} from "react";
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
// `primary.main`/`primary.contrastText` when enabled,
// `13px` weight-600 text; when `disabled` (real control semantics, unchanged
// from FM-040 -- never opacity alone) it renders on the mock's neutral
// control surface with muted text instead of MUI's default greyed-out
// disabled treatment. FM-054 (ADR-0014): the surface/text values are the
// theme's own `surfaces.control`/`surfaces.mutedText` tokens.
//
// The radius is *not* stated here any more. It used to be
// `borderRadius: theme.shape.borderRadius` inside `sx`, which is
// theme-multiplied (see `pillRadius`'s note in `app/theme.ts`) and therefore
// rendered 64px -- a stadium -- rather than the intended 8px. `MuiButton`'s
// own theme default already paints the 8px this wanted.
const primaryActionSx = {
    fontSize: "13px",
    fontWeight: 600,
    // Horizontal only -- the height is the theme's shared `controlHeight`.
    padding: "0 14px",
    "&.Mui-disabled": {
        backgroundColor: "surfaces.control",
        color: "surfaces.mutedText",
    },
} as const;

// The secondary bulk controls (ZIP, black hole/save, copy links, Save search)
// are the shared neutral-secondary action, so they render `MuiButton`'s
// `variant="control"` and state no surface, border, radius, or typography of
// their own -- see that variant in `app/theme.ts`. The local
// `secondaryActionSx`/`downloadActionsButtonSx` pair this replaces was one of
// six near-identical authorings of the same intent across the search feature,
// and carried the same 64px radius bug as the primary block above.
//
// The downloader/category selects stay a bare `Select` with an `aria-label`
// (ADR-0014 names `Select` with `InputLabel` as the standard alternative to
// `TextField select`, and this row genuinely lacks room for a floating label
// -- a real-browser measurement during FM-055's verification confirmed a
// `TextField select` with a visible "Downloader category" label pushes this
// dense action row past the viewport width and fails `results.spec.ts`'s
// no-horizontal-overflow contract, the same trade-off
// `SearchWorkspace.tsx`'s own `AdvancedRangeInput` already documents for its
// 100px min/max fields). Their recessed surface and hairline border come from
// the theme's `MuiOutlinedInput` default: inputs stay recessed, buttons
// raised, which is the contrast that tells the two apart in this one row.

export function DownloadActions({
    leading,
    results,
    safeConfig,
    onDownloaded,
    onSaveSearch,
    savingSearch = false,
}: {
    // FM-055: rendered at the start of the merged action row. The one
    // current caller passes the `sm`-down `SelectionMenu` copy, which the
    // toolbar owns (it drives the parent's selection state) but which the
    // packet's row-2 layout places inside this row.
    leading?: ReactNode;
    results: SearchResult[];
    safeConfig: unknown;
    onDownloaded: (ids: number[]) => void;
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
        // FM-055 (row 2 of the consolidated `results-toolbar`): the single
        // wrapping action row. It keeps FM-040's `results-bulk-actions`
        // identity and absorbs the removed `results-download-actions`
        // region's controls in the packet's order -- primary send,
        // downloader/category selects, ZIP, black hole, copy links, and Save
        // search at the right end. Every control keeps the behavior,
        // accessible name, and `disabled`/busy semantics it had in its
        // former row (the selection-gated actions are still genuinely
        // `disabled`, never merely toast-blocked), so no capability moves
        // behind an overflow menu. The loaded/filtered/selected counts this
        // row used to restate are now rendered once, in
        // `search-results-summary`.
        <Stack
            alignItems="center"
            aria-label="Selected result actions"
            data-testid="results-bulk-actions"
            direction="row"
            flexWrap="wrap"
            gap={1}
        >
            {leading}
            {downloaders.length > 1 && (
                <Select
                    aria-label="Downloader"
                    size="small"
                    sx={{fontSize: "13px"}}
                    value={downloader?.name ?? ""}
                    onChange={(event) =>
                        setDownloader(
                            downloaders.find(
                                (value) => value.name === event.target.value,
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
            )}
            {downloaders.length > 0 && (
                <Select
                    aria-label="Downloader category"
                    displayEmpty
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
            )}
            {downloaders.length > 0 && (
                <Button
                    data-testid="send-to-downloader"
                    disabled={
                        busy || Boolean(categoryError) || results.length === 0
                    }
                    onClick={send}
                    size="small"
                    sx={primaryActionSx}
                    variant="contained"
                >
                    Send selected to downloader
                </Button>
            )}
            {downloaders.length === 0 && (
                <Alert severity="info">
                    No downloader is configured for selected-result sends.
                </Alert>
            )}
            {categoryError && <Alert severity="error">{categoryError}</Alert>}
            {settings.zip && (
                <Button
                    disabled={busy || selectedNzbs.length === 0}
                    onClick={zip}
                    size="small"
                    variant="control"
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
                    size="small"
                    variant="control"
                >
                    Send selected to black hole
                </Button>
            )}
            <Button onClick={copy} size="small" variant="control">
                Copy selected links
            </Button>
            {onSaveSearch && (
                <Button
                    disabled={savingSearch}
                    id="save-search"
                    onClick={() => void onSaveSearch()}
                    size="small"
                    sx={{ml: "auto"}}
                    variant="control"
                >
                    {savingSearch ? "Saving search…" : "Save search"}
                </Button>
            )}
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
            variant="control"
        >
            {type === "nzb" ? "NZB" : "Torrent"}
        </Button>
    );
}

/**
 * The bootstrap's API base, read the same way for every transport this feature
 * builds. Exported since FM-082, which needs one shared transport for the
 * rows' `API-SEARCH-NFO` requests rather than one per row.
 */
export function bootstrapBase(): string {
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
