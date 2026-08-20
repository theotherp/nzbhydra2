import {useCallback, useRef, useState} from "react";

import {ApiTransport} from "../../api/transport";
import {useToasts} from "../../components/toasts/toasts";
import {RestartProgressDialog} from "./RestartProgressDialog";
import {
    pingRestartTarget,
    restartTarget,
    runRestartCountdown,
    RESTART_UNAVAILABLE_MESSAGE,
} from "./restartCountdown";

type RestartResponse = {message?: string | null; successful?: boolean};

export type RestartCoordinator = {
    /** The progress dialog; render it wherever the consumer lives. */
    dialog: React.ReactNode;
    /**
     * Triggers `API-SYSTEM-RESTART` and takes over the screen until the
     * instance answers again. `prefix` is prepended to the progress message,
     * the way legacy's callers described *why* the restart is happening.
     */
    restart: (prefix?: string) => Promise<void>;
};

/**
 * `C-RESTART-COORDINATOR` at its minimum: the restart command, the
 * non-dismissable progress dialog, readiness polling, and the reload. Shutdown,
 * update, and backup restart flows are separate consumers and stay planned.
 */
export function useRestartCoordinator(
    transport: ApiTransport,
): RestartCoordinator {
    const [message, setMessage] = useState<string | null>(null);
    const toasts = useToasts();
    const running = useRef(false);

    const restart = useCallback(
        async (prefix = "") => {
            if (running.current) {
                return;
            }
            running.current = true;
            let target;
            try {
                const response = await transport.request<RestartResponse>(
                    "internalapi/control/restart",
                );
                target = restartTarget(transport, response?.message);
            } catch {
                running.current = false;
                toasts.showToast({
                    message: RESTART_UNAVAILABLE_MESSAGE,
                    severity: "info",
                });
                return;
            }
            await runRestartCountdown(prefix, {
                ping: () => pingRestartTarget(target.pingUrl),
                reload: () => {
                    if (target.reloadUrl === null) {
                        window.location.reload();
                    } else {
                        window.location.href = target.reloadUrl;
                    }
                },
                setMessage,
                sleep: (milliseconds) =>
                    new Promise((resolve) =>
                        window.setTimeout(resolve, milliseconds),
                    ),
            });
        },
        [toasts, transport],
    );

    return {
        dialog: (
            <RestartProgressDialog
                message={message ?? ""}
                open={message !== null}
            />
        ),
        restart,
    };
}
