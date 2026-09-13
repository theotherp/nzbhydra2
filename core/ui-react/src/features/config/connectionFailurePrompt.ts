import {useCallback} from "react";

import {useDialogs, type DialogResult} from "../../components/dialogs/dialogs";

/**
 * The "connection check failed — add it anyway?" confirmation, shared by the
 * indexer and downloader editors.
 *
 * Legacy asks it from one place (`handleConnectionCheckFail`,
 * `config-fields-service.js:2557-2588`) for both kinds of entry, and the only
 * thing that varies between them is the noun: the message says "indexer" or
 * "downloader", and the dialog carries the matching `data-testid`. Everything
 * else — the title, the "Do you want to add it anyway?" detail line, the three
 * button labels and their order, and which label the two failure branches pick
 * — is one text, so it lives here once rather than in two editors that have to
 * be kept in step by hand.
 */

/**
 * The two ways a connection check can *not* succeed, as both
 * `IndexerConnectionResult` and `DownloaderConnectionResult` model them:
 * `failed` is the server having run the check and being able to say why it
 * went wrong (legacy's `checked: true`), `unchecked` is the check never having
 * happened at all.
 */
type ConnectionCheckFailure =
    | {kind: "failed"; message: string}
    | {kind: "unchecked"};

/** The noun the prompt is about; also what its `data-testid` is derived from. */
type ConnectionSubject = "downloader" | "indexer";

const CONNECTION_FAILED_TITLE = "Connection check failed";
const ADD_ANYWAY_QUESTION = "Do you want to add it anyway?";
const CHECKED_YES_LABEL = "I know what I'm doing";
const UNCHECKED_YES_LABEL = "I'll risk it";
const DISABLE_LABEL = "Add it, but disabled";
const RETRY_LABEL = "Aahh, let me try again";

/**
 * Answers `confirmed` when the admin insists on committing the entry as it is,
 * `denied` when they want it committed but inactive ("Add it, but disabled"),
 * and `cancelled` when they want to go back and correct it.
 *
 * What each answer *means* for the entry is the caller's business — an indexer
 * is disabled through its state enum, a downloader through `enabled` — so this
 * hook only asks the question.
 */
export function useConnectionFailurePrompt(
    subject: ConnectionSubject,
): (failure: ConnectionCheckFailure) => Promise<DialogResult> {
    const dialogs = useDialogs();

    return useCallback(
        (failure: ConnectionCheckFailure) =>
            dialogs.confirm({
                title: CONNECTION_FAILED_TITLE,
                message:
                    failure.kind === "failed"
                        ? failure.message === ""
                            ? // Shown when the server reports a failure
                              // without saying why.
                              `The ${subject} rejected the connection but gave no reason.`
                            : failure.message
                        : `The connection to the ${subject} could not be tested, sorry. Please check the log.`,
                details: [ADD_ANYWAY_QUESTION],
                confirmLabel:
                    failure.kind === "failed"
                        ? CHECKED_YES_LABEL
                        : UNCHECKED_YES_LABEL,
                denyLabel: DISABLE_LABEL,
                cancelLabel: RETRY_LABEL,
                testId: `config-${subject}-connection-failed`,
            }),
        [dialogs, subject],
    );
}
