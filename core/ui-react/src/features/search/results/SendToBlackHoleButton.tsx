import DriveFolderUploadOutlinedIcon from "@mui/icons-material/DriveFolderUploadOutlined";
import {Box, IconButton, Tooltip} from "@mui/material";
import {useContext, useState} from "react";

import type {SearchResult} from "../../../api/search";
import type {ApiTransport} from "../../../api/transport";
import {ToastContext} from "../../../components/toasts/toasts";
import {
    downloadId,
    saveNzbs,
    saveOrSendTorrents,
    type downloadSettings,
} from "../../../domain/downloads/actions";

/**
 * FM-187 (owner request 2026-09-05, ruled "Show for torrent and NZB"): the row
 * copy of legacy's `save-or-send-file` control
 * (`js/directives/save-or-send-torrent.js` at `1982886e2`), which
 * `search-result.html:122` rendered after the downloader icons on every
 * non-TORBOX row.
 *
 * One directive there switched three things on the result's download type, and
 * this component switches the same three: the label, the enable rule, and the
 * endpoint. A TORRENT is "saved or sent" -- `saveOrSendTorrents` writes a
 * `.torrent` to the black hole *or* hands a magnet to the OS handler, so it is
 * offered when either is configured -- and everything else is an NZB written
 * to the NZB black hole. A TORBOX result is never offered it (legacy's
 * `ng-if`); TORBOX is sent to a TORBOX downloader by
 * `SendToDownloaderButtons` instead.
 *
 * Like legacy's `ng-if="::enableButton"`, an unconfigured target renders
 * *nothing* rather than a disabled button: a black hole nobody has set up is
 * not a temporarily unavailable action, and a permanently disabled icon on
 * every row would be noise. That also keeps the Actions track honest -- the
 * slot is reserved (`blackHoleSlot` in `resultTable.ts`) exactly when some
 * loaded row renders the button.
 *
 * The reporting is FM-186's: the row's `Downloaded` chip (ADR-0006) plus a
 * success toast only when the response's `addedIds` actually names this
 * result, an error toast otherwise. Legacy only checked `successful` here and
 * so marked a skipped file as downloaded; the id test is strictly the better
 * of the two, and is what the row's other send button already does.
 */
export function SendToBlackHoleButton({
    onDownloaded,
    result,
    settings,
    transport,
}: {
    onDownloaded: () => void;
    result: SearchResult;
    /**
     * The black hole configuration, as one stable reference resolved by the
     * parent (like `downloaders`) -- never the safe config itself, which would
     * cost `ResultRow` its `memo` comparison on every unrelated config save.
     */
    settings: ReturnType<typeof downloadSettings>;
    transport: ApiTransport;
}) {
    // Read as context rather than through `useToasts`, which throws without a
    // provider: a row must still render its other actions in a focused test
    // that mounts no provider (FM-186's reason, unchanged).
    const toasts = useContext(ToastContext);
    const [busy, setBusy] = useState(false);
    const isTorrent = result.downloadType === "TORRENT";
    const enabled = isTorrent
        ? settings.saveTorrents || settings.sendMagnets
        : settings.saveNzbs;
    if (result.downloadType === "TORBOX" || !enabled || toasts === null) {
        return null;
    }
    // Legacy's two strings verbatim, and the accessible name is the tooltip,
    // so the visible and the announced label never diverge.
    const label = isTorrent
        ? "Save torrent to black hole or send magnet link"
        : "Save NZB to black hole";
    const send = async () => {
        setBusy(true);
        try {
            const response = isTorrent
                ? await saveOrSendTorrents(transport, [result])
                : await saveNzbs(transport, [result]);
            // The id-matching rounding the bulk bar and FM-186's row button
            // both apply, and legacy's own
            // `addedIds.indexOf(Number(String(id).split('.')[0]))`: the
            // server's ids are 64-bit `Long`s, so both sides compare the
            // rounded `Number` of the id's part before the dot.
            const sentId = Number(downloadId(result).split(".")[0]);
            if (!response.successful || !response.addedIds.includes(sentId)) {
                toasts.showToast({
                    severity: "error",
                    message: response.message ?? "The download action failed.",
                });
                return;
            }
            onDownloaded();
            toasts.showToast({
                severity: "success",
                message: isTorrent
                    ? "Saved or sent torrent."
                    : "Saved NZB to black hole.",
            });
        } catch {
            // `DownloadActions.execute`'s wording for a request that never
            // produced a response, so a failed row send and a failed bulk send
            // read identically.
            toasts.showToast({
                severity: "error",
                message: "Unable to complete the download action.",
            });
        } finally {
            setBusy(false);
        }
    };
    return (
        <Tooltip title={label}>
            {/* The span is MUI's documented wrapper for a tooltip whose child
                can be disabled -- a disabled button fires no pointer events,
                so without it the tooltip would neither open nor be reachable
                while a send is in flight. It carries the `flexShrink: 0`
                because it, not the button, is the flex item of the row's
                non-wrapping icon group (see `ResultRow`). */}
            <Box component="span" sx={{display: "inline-flex", flexShrink: 0}}>
                <IconButton
                    aria-busy={busy ? "true" : undefined}
                    aria-label={label}
                    data-testid="result-send-to-black-hole"
                    disabled={busy}
                    onClick={() => void send()}
                    size="small"
                    sx={{flexShrink: 0}}
                >
                    <DriveFolderUploadOutlinedIcon fontSize="small" />
                </IconButton>
            </Box>
        </Tooltip>
    );
}
