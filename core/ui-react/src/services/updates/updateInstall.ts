/** Legacy's `$interval` period for the progress lines (`update-service.js:145-154`). */
export const UPDATE_MESSAGE_POLL_INTERVAL_MS = 200;

/**
 * Legacy waits this long after a successful install before swapping the
 * progress dialog for the restart countdown, "to give user some time to read
 * the last message" (`update-service.js:125-129`).
 */
export const UPDATE_RESTART_GRACE_MS = 2000;

/** Legacy's growl wording for a failed install (`update-service.js:132`). */
export const UPDATE_FAILURE_MESSAGE =
    "An error occurred while updating. Please check the logs.";

export type UpdateInstallDependencies = {
    /** `API-UPDATES-INSTALL`; resolves once the server applied the update. */
    install: () => Promise<void>;
    /**
     * Starts polling `API-UPDATES-MESSAGES` into `onMessages` and returns the
     * function that stops it again.
     */
    pollMessages: (onMessages: (messages: string[]) => void) => () => void;
    /** Reports the failure the way legacy's growl did. */
    showFailure: () => void;
    /** `null` closes the progress dialog. */
    setMessages: (messages: string[] | null) => void;
    sleep: (milliseconds: number) => Promise<void>;
    /** `C-RESTART-COORDINATOR`'s countdown; the update restarts the server. */
    startCountdown: () => Promise<void>;
};

/**
 * `C-UPDATE-COORDINATOR`'s install flow: a blocking progress dialog fed by the
 * message poll while the install runs, then either the restart countdown or
 * legacy's error toast. The poll is stopped on every exit path — including a
 * failing install and a rejecting grace period — because it would otherwise
 * outlive the dialog it feeds.
 */
export async function runUpdateInstall(
    dependencies: UpdateInstallDependencies,
): Promise<void> {
    const {
        install,
        pollMessages,
        setMessages,
        showFailure,
        sleep,
        startCountdown,
    } = dependencies;
    setMessages([]);
    const stopPolling = pollMessages(setMessages);
    try {
        await install();
    } catch {
        stopPolling();
        setMessages(null);
        showFailure();
        return;
    }
    try {
        await sleep(UPDATE_RESTART_GRACE_MS);
    } finally {
        stopPolling();
        setMessages(null);
    }
    await startCountdown();
}
