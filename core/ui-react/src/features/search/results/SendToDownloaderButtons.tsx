import {Box, IconButton, Tooltip} from "@mui/material";
import {useContext, useState} from "react";

import type {SearchResult} from "../../../api/search";
import type {ApiTransport} from "../../../api/transport";
import {DialogContext} from "../../../components/dialogs/dialogs";
import {ToastContext} from "../../../components/toasts/toasts";
import {
    downloadId,
    isCompatibleWithDownloader,
    type Downloader,
} from "../../../domain/downloads/actions";
import {runSendFlow} from "./sendFlow";

/**
 * The per-downloader glyph, by `downloaderType`, as Vite asset references (the
 * base-URL-aware `new URL(..., import.meta.url)` form the shell's logo and the
 * downloader footer's wordmarks already use).
 *
 * These are legacy's own 16px row icons (`core/ui-src/img/{sab,nzbget,torbox}
 * .png` at `1982886e2`), vendored into the React bundle beside the component
 * that renders them -- the same reason `DownloaderStatusFooter` vendors its
 * own set: the React build owns its assets, and this packet's allowed files do
 * not reach `src/assets`.
 *
 * They are deliberately *not* the footer's `{sab,nzbget,torbox}logo.png`
 * wordmarks: those are ~35px-wide lettering built to be read at that size, and
 * scaled into a 16px row icon they are an illegible smear. These three are the
 * marks legacy drew in exactly this position, at exactly this size.
 *
 * Any downloader type without an entry falls back to the NZBGet mark, which is
 * what legacy's `getCssClass` did (`addable-nzb.js`: SABNZBD, TORBOX, else
 * nzbget).
 */
const DOWNLOADER_ICONS: Record<string, string> = {
    SABNZBD: new URL("./downloaders/sab.png", import.meta.url).href,
    TORBOX: new URL("./downloaders/torbox.png", import.meta.url).href,
};
const FALLBACK_DOWNLOADER_ICON = new URL(
    "./downloaders/nzbget.png",
    import.meta.url,
).href;

// The size legacy drew these at, and the size the row's other icons render at
// (FM-175's `ROW_ICON_GLYPH_SIZE`). `torbox.png` is a 16x18 source, so it is
// the one mark that is squashed by 2px here rather than letterboxed -- at this
// size that is not distinguishable, and a shorter box would misalign it with
// the SABnzbd and NZBGet marks beside it.
const DOWNLOADER_ICON_SIZE = 16;

/**
 * FM-186: one "send this result to that downloader" button per enabled,
 * compatible downloader, in every result row's Actions cell -- legacy's
 * `addable-nzb`/`addable-nzbs` directives (`1982886e2`), which the React
 * results table never had.
 *
 * The send itself is the bulk bar's own flow (`runSendFlow`), so a row send and
 * a one-result bulk send issue the identical duplicate probe, confirmation,
 * category resolution and add request. Only the reporting differs, and it
 * differs the way legacy's did: legacy's per-row control marked the row
 * `-success` only when the response's `addedIds` actually contained this
 * result's id, and `growl.error`ed the response message otherwise; here that
 * same test raises the row's `Downloaded` chip (ADR-0006's React equivalent of
 * the `-success` icon variant) or an error toast.
 *
 * Deliberately not migrated with it, and recorded as gap lines under
 * `F-SEARCH-DOWNLOADS`: legacy's per-row category picker (`alwaysAsk`, an
 * `addable-nzb-modal.html` prompt) and its per-downloader `iconCssClass`
 * override (a Font Awesome class; React ships no Font Awesome).
 */
export function SendToDownloaderButtons({
    downloaders,
    onDownloaded,
    result,
    transport,
}: {
    /**
     * The enabled downloaders, as one stable reference resolved by the parent
     * (like `indexerColors`) -- never the safe config itself, which would cost
     * `ResultRow` its `memo` comparison on every unrelated config save.
     */
    downloaders: Downloader[];
    onDownloaded: () => void;
    result: SearchResult;
    transport: ApiTransport;
}) {
    // Read as context rather than through `useDialogs`/`useToasts`, which
    // throw without a provider: `SearchResults` already gates its bulk bar on
    // exactly these two being present, and a row must render its other actions
    // in a focused test that mounts neither provider.
    const dialogs = useContext(DialogContext);
    const toasts = useContext(ToastContext);
    const [sendingTo, setSendingTo] = useState<string>();
    const compatible = downloaders.filter((downloader) =>
        isCompatibleWithDownloader(result, downloader),
    );
    if (compatible.length === 0 || dialogs === null || toasts === null) {
        return null;
    }
    const send = async (downloader: Downloader) => {
        setSendingTo(downloader.name);
        try {
            const outcome = await runSendFlow({
                // No per-row category choice (legacy's picker is a gap line),
                // so the flow resolves the downloader's configured default.
                category: null,
                dialogs,
                downloader,
                results: [result],
                toasts,
                transport,
            });
            if (outcome.status !== "sent") {
                return;
            }
            // The id-matching rounding `SearchResults` applies to a bulk
            // send's `addedIds`, and legacy's own
            // `addedIds.indexOf(Number(String(id).split('.')[0]))`: the
            // server's ids are 64-bit `Long`s, so both sides compare the
            // rounded `Number` of the id's part before the dot.
            const sentId = Number(downloadId(result).split(".")[0]);
            if (!outcome.response.addedIds.includes(sentId)) {
                toasts.showToast({
                    severity: "error",
                    message:
                        outcome.response.message ??
                        "The download action failed.",
                });
                return;
            }
            onDownloaded();
            toasts.showToast({
                severity: "success",
                message: `Sent to ${downloader.name}.`,
            });
        } finally {
            setSendingTo(undefined);
        }
    };
    return (
        <>
            {compatible.map((downloader) => {
                const label = `Send to ${downloader.name}`;
                const busy = sendingTo === downloader.name;
                return (
                    <Tooltip
                        // Repeats the accessible name verbatim, like the
                        // direct-download icon beside it, so the visible and
                        // the announced label never diverge.
                        key={downloader.name}
                        title={label}
                    >
                        {/* The span is MUI's documented wrapper for a tooltip
                            whose child can be disabled -- a disabled button
                            fires no pointer events, so without it the tooltip
                            would neither open nor be reachable while a send is
                            in flight. It carries the `flexShrink: 0` because
                            it, not the button, is the flex item of the row's
                            non-wrapping icon group (see `ResultRow`). */}
                        <Box
                            component="span"
                            sx={{display: "inline-flex", flexShrink: 0}}
                        >
                            <IconButton
                                aria-busy={busy ? "true" : undefined}
                                aria-label={label}
                                data-downloader={downloader.name}
                                data-testid="result-send-to-downloader"
                                disabled={busy}
                                onClick={() => void send(downloader)}
                                size="small"
                                sx={{flexShrink: 0}}
                            >
                                <Box
                                    // Decorative: the button's own
                                    // `aria-label` is the name, so the mark
                                    // must not be announced a second time.
                                    alt=""
                                    component="img"
                                    height={DOWNLOADER_ICON_SIZE}
                                    src={
                                        DOWNLOADER_ICONS[
                                            downloader.downloaderType ?? ""
                                        ] ?? FALLBACK_DOWNLOADER_ICON
                                    }
                                    width={DOWNLOADER_ICON_SIZE}
                                />
                            </IconButton>
                        </Box>
                    </Tooltip>
                );
            })}
        </>
    );
}
