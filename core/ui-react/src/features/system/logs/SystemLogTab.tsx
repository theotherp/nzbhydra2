import {Box, Stack, Tab, Tabs} from "@mui/material";
import {useState} from "react";

import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {FormattedLogView} from "./FormattedLogView";
import {LogFilesView} from "./LogFilesView";
import {RawLogView} from "./RawLogView";

const LOG_VIEWS = [
    {label: "Formatted", value: "formatted"},
    {label: "Raw", value: "raw"},
    {label: "Files", value: "files"},
] as const;

type LogView = (typeof LOG_VIEWS)[number]["value"];

/**
 * `F-SYSTEM-LOG`: legacy's `hydralog` directive as the shell's Log tab. The
 * three views are legacy's own `uib-tabset` (`log.html`), kept as local state
 * rather than a route: legacy never gave them a URL, and only the selected
 * view fetches — which is also what stops the raw view's refresh timer from
 * outliving it.
 */
export function SystemLogTab({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const [view, setView] = useState<LogView>("formatted");

    return (
        <Stack data-testid="system-log" spacing={3}>
            <Tabs
                aria-label="Log views"
                onChange={(_, next: LogView) => setView(next)}
                value={view}
                variant="scrollable"
            >
                {LOG_VIEWS.map((logView) => (
                    <Tab
                        key={logView.value}
                        label={logView.label}
                        value={logView.value}
                    />
                ))}
            </Tabs>
            <Box>
                {view === "formatted" && (
                    <FormattedLogView
                        serverTimeZone={bootstrap.serverTimeZone}
                        transport={transport}
                    />
                )}
                {view === "raw" && <RawLogView transport={transport} />}
                {view === "files" && <LogFilesView transport={transport} />}
            </Box>
        </Stack>
    );
}
