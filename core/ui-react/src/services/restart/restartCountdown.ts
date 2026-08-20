import {ApiTransport} from "../../api/transport";

const PING_PATH = "internalapi/control/ping";

/**
 * Legacy's timings, kept exactly (`core/ui-src/js/restart-service.js:43-79`).
 * The first poll is deliberately late: pinging immediately would still reach
 * the instance that is on its way down and reload the page into nothing.
 */
export const RESTART_INITIAL_DELAY_MS = 3000;
export const RESTART_POLL_INTERVAL_MS = 1000;
/** Hydra answers the ping slightly before it is fully up again. */
export const RESTART_RELOAD_GRACE_MS = 2000;
export const RESTART_SLOW_ATTEMPT = 45;

export const RESTART_RELOADING_MESSAGE = "Reloading page...";
export const RESTART_UNAVAILABLE_MESSAGE = "Unable to send restart command.";

export function restartMessage(prefix: string, attempt: number): string {
    const text =
        attempt >= RESTART_SLOW_ATTEMPT
            ? "Restarting takes longer than expected. You might want to check the log to see what's going on."
            : "Will reload page when NZBHydra is back.";
    return prefix.length > 0 ? `${prefix} ${text}` : text;
}

export type RestartTarget = {
    /** Absolute URL of the readiness endpoint to poll. */
    pingUrl: string;
    /** Where to send the browser once it answers; `null` reloads in place. */
    reloadUrl: string | null;
};

/**
 * `API-SYSTEM-RESTART` answers with the request-derived base URL as its
 * `message` (`SystemControlWeb.doRestart`) so the UI can follow a restart that
 * changes the address. Legacy appends the ping path to it verbatim and
 * navigates there afterwards; with no message it polls and reloads in place.
 */
export function restartTarget(
    transport: ApiTransport,
    message?: string | null,
): RestartTarget {
    if (typeof message !== "string" || message.length === 0) {
        return {
            pingUrl: transport.browserTransferUrl(PING_PATH),
            reloadUrl: null,
        };
    }
    return {
        pingUrl: `${message.replace(/\/+$/, "")}/${PING_PATH}`,
        reloadUrl: message,
    };
}

/**
 * A restart target may be on a different host or port than the page, which is
 * why this is a plain `fetch` rather than `C-API-TRANSPORT` (which is
 * deliberately locked to the application's own origin). The endpoint carries
 * `@CrossOrigin` for exactly this reason.
 */
export async function pingRestartTarget(
    url: string,
    fetchImplementation: typeof fetch = window.fetch.bind(window),
): Promise<void> {
    const response = await fetchImplementation(url, {
        credentials: "same-origin",
        headers: {Accept: "application/json"},
    });
    if (!response.ok) {
        throw new Error(`Restart ping failed with status ${response.status}`);
    }
}

export type RestartCountdownDependencies = {
    ping: () => Promise<void>;
    reload: () => void;
    setMessage: (message: string) => void;
    sleep: (milliseconds: number) => Promise<void>;
};

/**
 * Polls until the restarted instance answers, then reloads.
 *
 * Deliberate deviation from legacy: `restart-service.js` stops polling
 * altogether once it reaches attempt 45, so an instance that takes longer than
 * ~48s to come back leaves the dialog waiting forever. The wording at attempt
 * 45 is preserved; the polling simply continues behind it.
 */
export async function runRestartCountdown(
    prefix: string,
    dependencies: RestartCountdownDependencies,
): Promise<void> {
    const {ping, reload, setMessage, sleep} = dependencies;
    setMessage(restartMessage(prefix, 0));
    await sleep(RESTART_INITIAL_DELAY_MS);
    for (let attempt = 0; ; attempt++) {
        setMessage(restartMessage(prefix, attempt));
        await sleep(RESTART_POLL_INTERVAL_MS);
        try {
            await ping();
        } catch {
            continue;
        }
        setMessage(RESTART_RELOADING_MESSAGE);
        await sleep(RESTART_RELOAD_GRACE_MS);
        reload();
        return;
    }
}
