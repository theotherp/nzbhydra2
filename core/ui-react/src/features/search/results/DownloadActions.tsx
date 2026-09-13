import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import {
    Alert,
    Button,
    ButtonGroup,
    IconButton,
    ListSubheader,
    Menu,
    MenuItem,
    Select,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import type {MenuListProps} from "@mui/material";
import {useEffect, useMemo, useState} from "react";

import type {SearchResult} from "../../../api/search";
import {ApiTransport} from "../../../api/transport";
import {denseControlFontSize} from "../../../app/theme";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {
    categories,
    configuredDefaultCategory,
    configuredDownloaders,
    downloadId,
    downloadSettings,
    downloadZip,
    isCompatibleWithDownloader,
    prepareZip,
    saveNzbs,
    saveOrSendTorrents,
} from "../../../domain/downloads/actions";
import type {Downloader} from "../../../domain/downloads/actions";
import {runSendFlow} from "./sendFlow";

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
    fontSize: denseControlFontSize,
    fontWeight: 600,
    // Horizontal only -- the height is the theme's shared `controlHeight`.
    px: 1.75,
    py: 0,
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
    compact = false,
    results,
    safeConfig,
    onDownloaded,
    onSaveSearch,
    savingSearch = false,
}: {
    /**
     * FM-181: the below-768px rendering of the same state. A phone cannot
     * carry seven controls and two selects on one line, so the row becomes a
     * selection count, one split send button whose menu holds the downloader
     * and category choices the desktop `Select`s bind, and an overflow menu
     * for the three secondary actions -- each keeping its desktop gating,
     * disabled rule and wording. One component, one set of state: which form
     * renders is a JavaScript branch, so no control exists twice.
     */
    compact?: boolean;
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
    // FM-159 (ADR-0017): only the user's *explicit* choice is state, and it is
    // held by name rather than by object identity. The active downloader is
    // then derived from the current list on every render, so a downloader
    // added, removed, or edited in Config -> Downloading is reconciled
    // immediately: an unset choice, or one naming a downloader that is gone,
    // resolves to the first configured downloader (`undefined` when none is
    // left), while a still-valid explicit choice is kept -- including across
    // the referentially new config object every unrelated save hands down.
    // Reconciling in an effect instead would paint one frame with the stale
    // selection and re-run the category fetch spuriously.
    const [selectedName, setSelectedName] = useState<string>();
    const downloader: Downloader | undefined =
        downloaders.find((value) => value.name === selectedName) ??
        downloaders[0];
    const [downloaderCategories, setDownloaderCategories] = useState<string[]>(
        [],
    );
    const [categoryError, setCategoryError] = useState<string>();
    const [category, setCategory] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    // FM-181: the compact row's two menus. Declared unconditionally, like
    // every other hook here, because which row renders is decided below.
    const [sendMenuAnchor, setSendMenuAnchor] = useState<HTMLElement | null>(
        null,
    );
    const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(
        null,
    );
    const selectedNzbs = results.filter(
        (result) => result.downloadType === "NZB",
    );
    const selectedTorrents = results.filter(
        (result) => result.downloadType === "TORRENT",
    );
    // FM-159: the two values the category fetch actually depends on, as
    // primitives. Keying the effect on the `downloader` *object* would refetch
    // on every unrelated config save, because a save rebuilds the whole safe
    // config and with it every downloader object, name-for-name identical.
    const downloaderName = downloader?.name;
    const downloaderDefault = downloader
        ? configuredDefaultCategory(downloader)
        : null;
    useEffect(() => {
        if (downloaderName === undefined) {
            return;
        }
        setCategoryError(undefined);
        // FM-114: the selection starts on the downloader's configured
        // `defaultCategory`, set here rather than inside the `.then` because
        // the fetched list is not what decides it. Legacy's
        // `NzbDownloadService.download` opened with
        // `var category = downloader.defaultCategory;` and consulted no list
        // at all; the membership test that used to live in the `.then` turned
        // every default the downloader does not also *advertise* -- SABnzbd's
        // `get_cats` is a different set from Hydra's configured default -- into
        // a silent `null`, which reaches SABnzbd as no `cat` parameter.
        setCategory(downloaderDefault);
        void categories(transport, {name: downloaderName})
            .then((values) => {
                setDownloaderCategories(values);
            })
            .catch(() => {
                setDownloaderCategories([]);
                setCategoryError(
                    "Unable to load downloader categories. Choose another downloader or try again.",
                );
            });
    }, [downloaderDefault, downloaderName, transport]);
    // The configured default when the fetched list does not offer it; the
    // extra option the select renders for it (see below).
    const outOfListDefault =
        downloaderDefault && !downloaderCategories.includes(downloaderDefault)
            ? downloaderDefault
            : null;
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
        // FM-186: the duplicate probe, its confirmation, the client-side
        // category resolution, the add request and every failure toast are
        // `runSendFlow` (`sendFlow.ts`) now, so this bar and the per-row send
        // buttons run one flow rather than two copies of it. What stays here
        // is what is specific to a *bulk* send: the summary toast and marking
        // every id the server reports back.
        const outcome = await runSendFlow({
            category,
            dialogs,
            downloader,
            onBusyChange: setBusy,
            results: sendableResults,
            toasts,
            transport,
        });
        if (outcome.status !== "sent") {
            return;
        }
        onDownloaded(outcome.response.addedIds);
        toasts.showToast({
            severity: "success",
            message: "Successfully added selected results.",
        });
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
    // Extracted from the desktop button's own `onClick` by FM-181 so the
    // compact overflow menu's entry runs the identical operation rather than a
    // second copy of it.
    const saveToBlackHole = () =>
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
                      () => saveOrSendTorrents(transport, selectedTorrents),
                      "Successfully saved or sent torrents.",
                  )
                : undefined,
        ]);
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
    if (compact) {
        const sendDisabled =
            busy || Boolean(categoryError) || results.length === 0;
        const closeSendMenu = () => setSendMenuAnchor(null);
        const closeMoreMenu = () => setMoreMenuAnchor(null);
        // The category options the desktop `Select` renders, in its order:
        // "use the downloader's default", the fetched list, and -- when the
        // configured default is not in that list -- the default itself
        // (FM-114). `null` is the same "unset" value the `Select`'s empty
        // string maps to, so both forms drive one piece of state.
        const categoryOptions: {label: string; value: string | null}[] = [
            {label: "Use downloader default", value: null},
            ...downloaderCategories.map((value) => ({label: value, value})),
            ...(outOfListDefault
                ? [{label: outOfListDefault, value: outOfListDefault}]
                : []),
        ];
        return (
            <Stack
                aria-label="Selected result actions"
                data-testid="results-bulk-actions"
                direction="row"
                sx={{
                    alignItems: "center",
                    gap: 1,
                }}
            >
                {/* The count the desktop summary carries as a `· N selected`
                    fragment. On a phone the summary is down to `{filtered} /
                    {total}`, and this row exists only while something is
                    selected, so the number belongs here instead. */}
                <Typography
                    component="div"
                    data-testid="results-selection-count"
                    sx={{
                        color: "primary.main",
                        fontSize: denseControlFontSize,
                        whiteSpace: "nowrap",
                    }}
                >
                    {results.length} selected
                </Typography>
                {downloaders.length === 0 && (
                    <Alert severity="info">
                        No downloader is configured for selected-result sends.
                    </Alert>
                )}
                {categoryError && (
                    <Alert severity="error">{categoryError}</Alert>
                )}
                {downloaders.length > 0 && (
                    <ButtonGroup
                        size="small"
                        sx={{ml: "auto"}}
                        variant="contained"
                    >
                        <Button
                            data-testid="send-to-downloader"
                            disabled={sendDisabled}
                            onClick={send}
                            sx={primaryActionSx}
                        >
                            Send to downloader
                        </Button>
                        <Button
                            aria-expanded={sendMenuAnchor ? "true" : undefined}
                            aria-haspopup="menu"
                            aria-label="Send options"
                            data-testid="send-to-downloader-options"
                            disabled={sendDisabled}
                            onClick={(event) =>
                                setSendMenuAnchor(event.currentTarget)
                            }
                            sx={{...primaryActionSx, px: 0.5}}
                        >
                            <ArrowDropDownIcon fontSize="small" />
                        </Button>
                    </ButtonGroup>
                )}
                <IconButton
                    aria-expanded={moreMenuAnchor ? "true" : undefined}
                    aria-haspopup="menu"
                    aria-label="More actions"
                    data-testid="results-more-actions"
                    onClick={(event) => setMoreMenuAnchor(event.currentTarget)}
                    size="small"
                >
                    <MoreVertIcon fontSize="small" />
                </IconButton>
                {/* The two `Select`s' options as one menu. `menuitemradio`
                    rather than `menuitem`: each group is a single-choice
                    setting, which is exactly what the selects it replaces
                    announce, and `aria-checked` is what carries the current
                    value once the closed select's own text is gone. */}
                <Menu
                    anchorEl={sendMenuAnchor}
                    onClose={closeSendMenu}
                    open={Boolean(sendMenuAnchor)}
                    slotProps={{
                        // MUI types the list slot as `MenuListProps`. Unlike a
                        // JSX intrinsic element it carries no index signature
                        // for `data-*`, so the one attribute this menu is
                        // queried by needs the assertion.
                        list: {
                            "data-testid": "send-to-downloader-menu",
                        } as MenuListProps,
                    }}
                >
                    {downloaders.length > 1 && (
                        <ListSubheader>Downloader</ListSubheader>
                    )}
                    {downloaders.length > 1 &&
                        downloaders.map((value) => (
                            <MenuItem
                                aria-checked={value.name === downloader?.name}
                                key={value.name}
                                onClick={() => {
                                    setSelectedName(value.name);
                                    closeSendMenu();
                                }}
                                role="menuitemradio"
                                // `aria-checked` alone is announced but not
                                // drawn; `selected` is MUI's own visible
                                // "this is the current one", which is what
                                // the closed `Select`'s text used to say.
                                selected={value.name === downloader?.name}
                            >
                                {value.name}
                            </MenuItem>
                        ))}
                    <ListSubheader>Category</ListSubheader>
                    {categoryOptions.map((option) => (
                        <MenuItem
                            aria-checked={option.value === category}
                            key={option.label}
                            onClick={() => {
                                setCategory(option.value);
                                closeSendMenu();
                            }}
                            role="menuitemradio"
                            selected={option.value === category}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </Menu>
                <Menu
                    anchorEl={moreMenuAnchor}
                    onClose={closeMoreMenu}
                    open={Boolean(moreMenuAnchor)}
                    slotProps={{
                        list: {
                            "data-testid": "results-more-actions-menu",
                        } as MenuListProps,
                    }}
                >
                    {settings.zip && (
                        <MenuItem
                            disabled={busy || selectedNzbs.length === 0}
                            onClick={() => {
                                closeMoreMenu();
                                void zip();
                            }}
                        >
                            Download selected NZBs as ZIP
                        </MenuItem>
                    )}
                    {(settings.saveNzbs ||
                        settings.saveTorrents ||
                        settings.sendMagnets) && (
                        <MenuItem
                            disabled={busy}
                            onClick={() => {
                                closeMoreMenu();
                                void saveToBlackHole();
                            }}
                        >
                            Send selected to black hole
                        </MenuItem>
                    )}
                    <MenuItem
                        onClick={() => {
                            closeMoreMenu();
                            void copy();
                        }}
                    >
                        Copy selected links
                    </MenuItem>
                </Menu>
            </Stack>
        );
    }
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
            aria-label="Selected result actions"
            data-testid="results-bulk-actions"
            direction="row"
            sx={{
                alignItems: "center",
                flexWrap: "wrap",
                gap: 1,
            }}
        >
            {downloaders.length > 1 && (
                <Select
                    aria-label="Downloader"
                    size="small"
                    sx={{fontSize: denseControlFontSize}}
                    value={downloader?.name ?? ""}
                    onChange={(event) => setSelectedName(event.target.value)}
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
                    sx={{fontSize: denseControlFontSize}}
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
                    {/*
                     * FM-114: the configured default is preselected whether or
                     * not the downloader advertises it, so when the fetched
                     * list does not contain it the select needs an option to
                     * display -- without one MUI renders the box blank and
                     * warns about an out-of-range value, and the send would
                     * read as "Use downloader default" while transmitting
                     * something else. Appended after the fetched entries so
                     * the existing option order is untouched.
                     */}
                    {outOfListDefault && (
                        <MenuItem value={outOfListDefault}>
                            {outOfListDefault}
                        </MenuItem>
                    )}
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
                    onClick={saveToBlackHole}
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

/**
 * The direct "fetch this result's NZB/torrent file" control, shared by the
 * search results table and the download history page.
 *
 * FM-150: the results row asks for the icon form (`iconOnly`) so the download
 * sits on the same single line as `ResultDetailLinks`' icons instead of
 * claiming a row of its own in a cell whose column the Title column is
 * competing with. The history page's row is a free-flowing `Stack` with no such
 * pressure, so the text form stays the default and that page renders exactly
 * what it rendered before. Both forms are the same anchor with the same
 * `data-testid`, `href` and `onClick`.
 *
 * FM-160 (2026-08-31): the anchor carries `target="_blank"` / `rel="noopener"`
 * and no `download` attribute, matching legacy
 * (`search-result.html:112`/`:124`). The backend's `getnzb`/`gettorrent`
 * endpoint answers file content, a 302 redirect to the indexer
 * (`nzbAccessType: REDIRECT`), or an error; a cross-origin redirect drops the
 * `download` attribute, so with it set the browser navigated in-tab to the
 * indexer link and destroyed the results view. `target="_blank"` opens
 * redirects and errors in a disposable tab while content still downloads via
 * the server's `Content-Disposition` header.
 */
export function DirectDownloadActions({
    iconOnly = false,
    result,
    onDownloaded,
}: {
    iconOnly?: boolean;
    result: SearchResult;
    onDownloaded: () => void;
}) {
    const type = result.downloadType === "TORRENT" ? "torrent" : "nzb";
    const label = `Download ${type.toUpperCase()}`;
    const transport = useMemo(() => new ApiTransport(bootstrapBase()), []);
    const shared = {
        "aria-label": label,
        component: "a" as const,
        "data-testid": type === "nzb" ? "download-nzb" : "download-torrent",
        href: transport.browserTransferUrl(
            `get${type}/user/${downloadId(result)}`,
        ),
        onClick: onDownloaded,
        rel: "noopener",
        size: "small" as const,
        target: "_blank",
    };
    if (iconOnly) {
        return (
            <Tooltip
                // Repeats the accessible name verbatim (`Download NZB` /
                // `Download TORRENT`) so the visible and announced labels
                // never diverge.
                title={label}
            >
                {/* `flexShrink: 0` because the results row puts this in a
                    non-wrapping icon group whose other member (the detail
                    links) is allowed to shrink and fold; without it a narrow
                    Actions column would squash the download instead. */}
                <IconButton {...shared} sx={{flexShrink: 0}}>
                    <DownloadOutlinedIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    }
    return (
        <Button
            {...shared}
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
