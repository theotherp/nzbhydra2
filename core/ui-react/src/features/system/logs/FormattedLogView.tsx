import {
    Alert,
    Button,
    Chip,
    CircularProgress,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {
    getJsonLogs,
    newerLogOffset,
    olderLogOffset,
    type LogEntry,
} from "../../../api/system/logs";
import {ApiTransport} from "../../../api/transport";
import {formatLogTimestamp} from "../../../domain/date-time/dateTime";
import {LogEntryDialog} from "./LogEntryDialog";

/**
 * Legacy's Formatted view (`log.html:1-58`): a page of structured log records,
 * newest first, with an entry dialog behind every row. Paging is the server's
 * reversed-file offset, so "older" walks the offset forward and "newer" walks
 * it back to the newest page (`hydra-log.js:66-77`).
 */
export function FormattedLogView({
    serverTimeZone,
    transport,
}: {
    serverTimeZone: string | null;
    transport: ApiTransport;
}) {
    const [offset, setOffset] = useState(0);
    const [openEntry, setOpenEntry] = useState<LogEntry | null>(null);
    const page = useQuery({
        queryFn: () => getJsonLogs(transport, offset),
        queryKey: ["system-log-json", offset],
    });
    const entries = page.data?.entries ?? [];

    // Legacy repeats the same two buttons above and below the table
    // (`log.html:15-19`, `:50-56`); one row is kept here, so each paging
    // control is a single addressable element rather than a duplicated pair.
    const paging = (
        <Stack direction="row" spacing={2}>
            <Button
                data-testid="system-log-newer"
                disabled={offset === 0}
                onClick={() => setOffset(newerLogOffset(offset))}
                type="button"
                variant="outlined"
            >
                Get newer entries
            </Button>
            <Button
                data-testid="system-log-older"
                disabled={page.data?.hasMore !== true}
                onClick={() => setOffset(olderLogOffset(offset))}
                type="button"
                variant="outlined"
            >
                Get older entries
            </Button>
        </Stack>
    );

    return (
        <Stack data-testid="system-log-view-formatted" spacing={2}>
            <Stack direction="row" spacing={2}>
                <Button
                    onClick={() => void page.refetch()}
                    type="button"
                    variant="outlined"
                >
                    Update
                </Button>
            </Stack>
            {paging}
            {page.isPending && (
                <Stack alignItems="center" role="status" spacing={2}>
                    <CircularProgress variant="indeterminate" />
                    <Typography>Loading the log file</Typography>
                </Stack>
            )}
            {page.isError && (
                <Alert severity="error">Unable to load the log file.</Alert>
            )}
            {page.isSuccess && entries.length === 0 && (
                <Typography>The log file has no entries to show.</Typography>
            )}
            {entries.length > 0 && (
                <TableContainer>
                    <Table data-testid="system-log-table" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Time (newest first)</TableCell>
                                <TableCell>Level</TableCell>
                                <TableCell>Logger</TableCell>
                                <TableCell>Message</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {entries.map((entry, index) => (
                                <LogRow
                                    entry={entry}
                                    key={`${offset}-${index}`}
                                    onOpen={() => setOpenEntry(entry)}
                                    serverTimeZone={serverTimeZone}
                                />
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            <LogEntryDialog
                entry={openEntry}
                onClose={() => setOpenEntry(null)}
            />
        </Stack>
    );
}

function LogRow({
    entry,
    onOpen,
    serverTimeZone,
}: {
    entry: LogEntry;
    onOpen: () => void;
    serverTimeZone: string | null;
}) {
    return (
        // Legacy opens the entry dialog from a click anywhere on the row
        // (`log.html:32`). Keeping that target means the row itself is the
        // control, so it carries the button role and the keyboard activation a
        // real button would have brought with it.
        <TableRow
            data-testid="system-log-row"
            hover
            onClick={onOpen}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onOpen();
                }
            }}
            role="button"
            sx={{cursor: "pointer"}}
            tabIndex={0}
        >
            <TableCell>
                {formatLogTimestamp(entry.timestamp, serverTimeZone)}
            </TableCell>
            <TableCell>
                {entry.level === null ? null : (
                    <Chip
                        color={levelColor(entry.level)}
                        label={entry.level}
                        size="small"
                        variant="outlined"
                    />
                )}
            </TableCell>
            <TableCell>{shortLoggerName(entry.logger)}</TableCell>
            <TableCell sx={{wordBreak: "break-word"}}>
                {entry.message}
            </TableCell>
        </TableRow>
    );
}

/** Legacy's `formatClassname` filter (`hydra-log.js:206-211`). */
function shortLoggerName(logger: string | null): string {
    if (logger === null) return "";
    return logger.slice(logger.lastIndexOf(".") + 1);
}

function levelColor(level: string): "default" | "error" | "warning" {
    if (level === "ERROR") return "error";
    if (level === "WARN") return "warning";
    return "default";
}
