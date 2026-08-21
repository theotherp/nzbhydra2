import {Button, Stack} from "@mui/material";
import {useState} from "react";

import {
    reloadConfigFromFile,
    shutdownInstance,
    type SystemControlResult,
} from "../../../api/system/control";
import {ApiTransport} from "../../../api/transport";
import {useToasts} from "../../../components/toasts/toasts";
import {useRestartCoordinator} from "../../../services/restart/useRestartCoordinator";

const SHUTDOWN_SUCCESS = "Shutdown initiated. Cya!";
const SHUTDOWN_FAILURE = "Unable to send shutdown command.";
const RELOAD_SUCCESS =
    "Successfully reloaded config. Some setting may need a restart to take effect.";
const RELOAD_FAILURE = "Unable to reload the config.";

/**
 * `F-SYSTEM-CONTROL`: legacy's Control tab (`system.html:10-22`,
 * `system-controller.js:17-42`) minus the "Migrate from NZBHydra 1" button,
 * whose three `/internalapi/migration/*` endpoints have no backend mapping
 * (`APIS.yaml` `unverified_legacy_calls`), so the legacy button cannot
 * succeed and there is no reachable behavior to reproduce.
 */
export function SystemControlTab({transport}: {transport: ApiTransport}) {
    const toasts = useToasts();
    const restart = useRestartCoordinator(transport);
    // Legacy leaves every button live while a request is in flight; a second
    // shutdown or reload while the first is unanswered says nothing new, and
    // the restart coordinator already guards itself.
    const [running, setRunning] = useState(false);

    const run = async (
        action: (transport: ApiTransport) => Promise<SystemControlResult>,
        success: string,
        failure: string,
    ) => {
        setRunning(true);
        let result: SystemControlResult;
        try {
            result = await action(transport);
        } catch {
            // `requestControlAction` never rejects itself, but nothing at
            // this boundary enforces that invariant; without this, a
            // rejecting action would surface as an unhandled rejection with
            // no toast at all.
            result = {kind: "failed", message: null};
        } finally {
            setRunning(false);
        }
        if (result.kind === "successful") {
            toasts.showToast({message: success, severity: "info"});
            return;
        }
        toasts.showToast({
            message: result.message ?? failure,
            severity: "error",
        });
    };

    return (
        <Stack
            alignItems="center"
            data-testid="system-control"
            spacing={2}
            sx={{py: 2}}
        >
            <Stack direction="row" spacing={2}>
                <Button
                    data-testid="system-shutdown"
                    disabled={running}
                    onClick={() =>
                        void run(
                            shutdownInstance,
                            SHUTDOWN_SUCCESS,
                            SHUTDOWN_FAILURE,
                        )
                    }
                    type="button"
                    variant="outlined"
                >
                    Shutdown
                </Button>
                <Button
                    data-testid="system-restart"
                    onClick={() => void restart.restart()}
                    type="button"
                    variant="outlined"
                >
                    Restart
                </Button>
            </Stack>
            <Button
                data-testid="system-reload-config"
                disabled={running}
                onClick={() =>
                    void run(
                        reloadConfigFromFile,
                        RELOAD_SUCCESS,
                        RELOAD_FAILURE,
                    )
                }
                type="button"
                variant="contained"
            >
                Reload config from file
            </Button>
            {restart.dialog}
        </Stack>
    );
}
