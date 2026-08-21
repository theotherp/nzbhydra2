import {useCallback, useRef, useState} from "react";

import {ApiTransport} from "../../../api/transport";
import {
    pingRestartTarget,
    restartTarget,
    runRestartCountdown,
} from "../../../services/restart/restartCountdown";
import {RestartProgressDialog} from "../../../services/restart/RestartProgressDialog";

export type BackupRestartCountdown = {
    /** The countdown dialog; render it where the page lives. */
    dialog: React.ReactNode;
    /** Takes over the screen until the restarted instance answers again. */
    start: (message: string) => Promise<void>;
};

function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

/**
 * `C-RESTART-COORDINATOR`'s countdown without the restart command: a restore
 * makes the instance exit so its wrapper can put the restored data in place,
 * exactly like an update does. Legacy calls `RestartService.startCountdown`
 * here (`backup.js:49,68`), which opens the modal and polls but never posts
 * `API-SYSTEM-RESTART` — sending it would ask an instance that is already on
 * its way down to restart again. `C-UPDATE-COORDINATOR` composes the same
 * primitives for the same reason (`useUpdateInstaller.tsx:73-81`).
 */
export function useBackupRestartCountdown(
    transport: ApiTransport,
): BackupRestartCountdown {
    const [message, setMessage] = useState<string | null>(null);
    const running = useRef(false);

    const start = useCallback(
        async (prefix: string) => {
            if (running.current) {
                return;
            }
            running.current = true;
            const target = restartTarget(transport, null);
            await runRestartCountdown(prefix, {
                ping: () => pingRestartTarget(target.pingUrl),
                reload: () => window.location.reload(),
                setMessage,
                sleep,
            });
        },
        [transport],
    );

    return {
        dialog: (
            <RestartProgressDialog
                message={message ?? ""}
                open={message !== null}
            />
        ),
        start,
    };
}
