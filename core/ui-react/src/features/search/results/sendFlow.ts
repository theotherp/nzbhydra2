import type {DialogContextValue} from "../../../components/dialogs/dialogs";
import type {ToastContextValue} from "../../../components/toasts/toasts";
import type {ApiTransport} from "../../../api/transport";
import type {SearchResult} from "../../../api/search";
import {
    addFilesRequest,
    configuredDefaultCategory,
    requiresDuplicateReason,
    sendToDownloader,
    type ActionResponse,
    type Downloader,
} from "../../../domain/downloads/actions";

/**
 * What one send attempt ended as. `failed` means the user has already been
 * told why (every failure path below raises its own toast); `cancelled` means
 * the duplicate-movie confirmation was dismissed, which sends nothing and says
 * nothing.
 */
export type SendOutcome =
    | {status: "sent"; response: ActionResponse}
    | {status: "cancelled"}
    | {status: "failed"};

/**
 * The one "send these results to this downloader" flow, shared by the bulk
 * action bar (`DownloadActions`) and the per-row send buttons FM-186 restored
 * from legacy's `addable-nzb` (`SendToDownloaderButtons`).
 *
 * It is deliberately *not* a hook: `DownloadActions` already holds a dialog and
 * a toast context of its own, and the row control resolves both from context
 * itself, so passing them in keeps this a plain function both can call and both
 * can be tested through.
 *
 * The steps are legacy's `NzbDownloadService.download` order, which the bulk
 * bar has implemented since FM-114 and which is preserved here verbatim:
 *
 * 1. probe `checkDuplicateMovieDownload` with `category: null` -- the probe
 *    asks only whether this movie was downloaded before, so the resolved
 *    category is attached afterwards, for the add request alone;
 * 2. on `reasonRequired`, confirm; a cancelled confirmation sends nothing;
 * 3. resolve the category: the caller's explicit choice, else the downloader's
 *    configured default, else `null`. Never resolved on the server, which
 *    special-cases only the three sentinel strings and forwards anything else,
 *    `null` included, unchanged;
 * 4. `addNzbs`, and report a failure the same way for both callers.
 *
 * What each caller keeps for itself is what genuinely differs: the bulk bar
 * toasts one summary and marks every `addedIds` row, while a row's button
 * marks only its own result -- and only when that id actually came back.
 */
export async function runSendFlow({
    category,
    dialogs,
    downloader,
    onBusyChange,
    results,
    toasts,
    transport,
}: {
    /** The user's explicit category choice, or `null` for "unset". */
    category: string | null;
    dialogs: DialogContextValue;
    downloader: Downloader;
    /**
     * Raised around the add request only -- not around the duplicate probe and
     * its confirmation -- because that is exactly the window the bulk bar's
     * `busy` flag covered before this function existed.
     */
    onBusyChange?: (busy: boolean) => void;
    results: SearchResult[];
    toasts: ToastContextValue;
    transport: ApiTransport;
}): Promise<SendOutcome> {
    const request = addFilesRequest(downloader, results, null, null);
    try {
        if (await requiresDuplicateReason(transport, request)) {
            const decision = await dialogs.confirm({
                title: "Duplicate movie download",
                message:
                    "This movie was downloaded before. Do you want to send it to the downloader?",
                confirmLabel: "Send",
            });
            if (decision === "cancelled") {
                return {status: "cancelled"};
            }
        }
    } catch {
        toasts.showToast({
            severity: "error",
            message: "Unable to check duplicate downloads.",
        });
        return {status: "failed"};
    }
    request.category = category ?? configuredDefaultCategory(downloader);
    onBusyChange?.(true);
    try {
        const response = await sendToDownloader(transport, request);
        if (!response.successful) {
            toasts.showToast({
                severity: "error",
                message: response.message ?? "The download action failed.",
            });
            return {status: "failed"};
        }
        return {status: "sent", response};
    } catch {
        toasts.showToast({
            severity: "error",
            message: "Unable to complete the download action.",
        });
        return {status: "failed"};
    } finally {
        onBusyChange?.(false);
    }
}
