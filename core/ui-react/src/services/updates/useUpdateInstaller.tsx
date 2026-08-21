import {useCallback, useRef, useState} from "react";

import {getUpdateMessages, installUpdate} from "../../api/system/updates";
import {ApiTransport} from "../../api/transport";
import {useToasts} from "../../components/toasts/toasts";
import {
    pingRestartTarget,
    restartTarget,
    runRestartCountdown,
} from "../restart/restartCountdown";
import {RestartProgressDialog} from "../restart/RestartProgressDialog";
import {
    runUpdateInstall,
    UPDATE_FAILURE_MESSAGE,
    UPDATE_MESSAGE_POLL_INTERVAL_MS,
} from "./updateInstall";
import {UpdateProgressDialog} from "./UpdateProgressDialog";

export type UpdateInstaller = {
    /** The progress and countdown dialogs; render them where the page lives. */
    dialogs: React.ReactNode;
    /** Installs `version` and hands off to the restart countdown. */
    install: (version: string) => Promise<void>;
};

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * `C-UPDATE-COORDINATOR`'s install action wired to the browser: the message
 * poll, the progress dialog, and the handoff to `C-RESTART-COORDINATOR`.
 *
 * The handoff uses the countdown directly rather than
 * `useRestartCoordinator().restart()`, because the update restarts the server
 * on its own — legacy calls `RestartService.startCountdown("")`, which sends
 * no restart command either (`restart-service.js:20-36`).
 */
export function useUpdateInstaller(transport: ApiTransport): UpdateInstaller {
    const [messages, setMessages] = useState<string[] | null>(null);
    const [restartMessage, setRestartMessage] = useState<string | null>(null);
    const toasts = useToasts();
    const running = useRef(false);

    const install = useCallback(
        async (version: string) => {
            if (running.current) {
                return;
            }
            running.current = true;
            try {
                await runUpdateInstall({
                    install: () => installUpdate(transport, version),
                    pollMessages: (onMessages) => {
                        const id = window.setInterval(() => {
                            // A failing or malformed poll says nothing about
                            // the install itself; legacy handled it
                            // specifically and simply kept the last lines.
                            void getUpdateMessages(transport).then(
                                onMessages,
                                () => {},
                            );
                        }, UPDATE_MESSAGE_POLL_INTERVAL_MS);
                        return () => window.clearInterval(id);
                    },
                    setMessages,
                    showFailure: () =>
                        toasts.showToast({
                            message: UPDATE_FAILURE_MESSAGE,
                            severity: "error",
                        }),
                    sleep,
                    startCountdown: () => {
                        const target = restartTarget(transport, null);
                        return runRestartCountdown("", {
                            ping: () => pingRestartTarget(target.pingUrl),
                            reload: () => window.location.reload(),
                            setMessage: setRestartMessage,
                            sleep,
                        });
                    },
                });
            } finally {
                running.current = false;
            }
        },
        [toasts, transport],
    );

    return {
        dialogs: (
            <>
                <UpdateProgressDialog messages={messages} />
                <RestartProgressDialog
                    message={restartMessage ?? ""}
                    open={restartMessage !== null}
                />
            </>
        ),
        install,
    };
}
