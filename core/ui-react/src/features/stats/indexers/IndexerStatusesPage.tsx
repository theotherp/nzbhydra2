import {useQuery} from "@tanstack/react-query";
import {
    Alert,
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

import {
    getIndexerStatuses,
    type IndexerStatus,
} from "../../../api/stats/indexerStatuses";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {
    formatServerDateTime,
    parseServerDateTime,
} from "../../../domain/date-time/dateTime";

type Props = {
    bootstrap: BootstrapData;
    transport?: ApiTransport;
    loadStatuses?: () => Promise<{
        statuses: IndexerStatus[];
        malformedCount: number;
    }>;
};

export function IndexerStatusesPage({
    bootstrap,
    transport,
    loadStatuses,
}: Props) {
    if (!transport && !loadStatuses)
        throw new Error(
            "IndexerStatusesPage requires a loader or API transport",
        );
    const query = useQuery({
        queryKey: ["indexer-statuses"],
        queryFn:
            loadStatuses ??
            (() => getIndexerStatuses(transport as ApiTransport)),
    });
    if (query.isPending) return <Loading />;
    if (query.isError)
        return <Alert severity="error">Unable to load indexer statuses.</Alert>;
    const {statuses, malformedCount} = query.data;
    return (
        <Stack component="main" spacing={2}>
            <Typography component="h1" variant="h4">
                Indexer statuses
            </Typography>
            {malformedCount > 0 && (
                <Alert severity="warning">
                    {malformedCount} malformed indexer status entries were not
                    displayed.
                </Alert>
            )}
            {statuses.length === 0 ? (
                <Alert severity="info">
                    No indexer statuses are available.
                </Alert>
            ) : (
                <StatusTable
                    statuses={statuses}
                    timeZone={bootstrap.serverTimeZone}
                />
            )}
        </Stack>
    );
}

function Loading() {
    return (
        <Stack alignItems="center" component="main" role="status" spacing={1}>
            <CircularProgress />
            <Typography>Loading indexer statuses…</Typography>
        </Stack>
    );
}

function StatusTable({
    statuses,
    timeZone,
}: {
    statuses: IndexerStatus[];
    timeZone: string | null;
}) {
    return (
        <TableContainer>
            <Table aria-label="Indexer statuses">
                <caption>
                    Indexer statuses sorted by state, then name. Configure an
                    indexer to reenable it.
                </caption>
                <TableHead>
                    <TableRow>
                        <TableCell>Indexer</TableCell>
                        <TableCell>State</TableCell>
                        <TableCell>Disabled until</TableCell>
                        <TableCell>Last error</TableCell>
                        <TableCell>API hits</TableCell>
                        <TableCell>Downloads</TableCell>
                        <TableCell>Next hit allowed</TableCell>
                        <TableCell>VIP expiry</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {statuses.map((status) => (
                        <TableRow key={`${status.state}-${status.indexer}`}>
                            <TableCell>{status.indexer}</TableCell>
                            <TableCell>{stateLabel(status.state)}</TableCell>
                            <TableCell>
                                {status.state === "DISABLED_SYSTEM_TEMPORARY"
                                    ? formatServerDateTime(
                                          status.disabledUntil,
                                          timeZone,
                                      )
                                    : ""}
                            </TableCell>
                            <TableCell>{status.lastError ?? ""}</TableCell>
                            <TableCell>
                                {limit(status.apiHits, status.apiHitLimit)}
                            </TableCell>
                            <TableCell>
                                {limit(
                                    status.downloadHits,
                                    status.downloadHitLimit,
                                )}
                            </TableCell>
                            <TableCell>{reset(status, timeZone)}</TableCell>
                            <TableCell>
                                {vip(status.vipExpirationDate, timeZone)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function stateLabel(state: IndexerStatus["state"]): string {
    return {
        ENABLED: "Enabled",
        DISABLED_SYSTEM_TEMPORARY: "Temporarily disabled by system",
        DISABLED_SYSTEM: "Disabled by system",
        DISABLED_USER: "Disabled by user",
    }[state];
}

// The backend leaves an unknown hit count or an unconfigured limit null, which
// reaches us as null rather than undefined; both mean "nothing to show" here.
// A configured limit of 0 is meaningful and must still render as "n/0".
function limit(
    hits: number | null | undefined,
    maximum: number | null | undefined,
): string {
    if (hits === null || hits === undefined) return "";
    if (maximum === null || maximum === undefined) return String(hits);
    return `${hits}/${maximum}`;
}

function reset(status: IndexerStatus, timeZone: string | null): string {
    return [
        formatServerDateTime(status.apiResetTime, timeZone),
        formatServerDateTime(status.downloadResetTime, timeZone),
    ]
        .filter(Boolean)
        .join("/");
}

function vip(
    expiry: string | null | undefined,
    timeZone: string | null,
): React.ReactNode {
    if (!expiry) return "";
    const warning = vipWarning(expiry, timeZone);
    return warning ? (
        <>
            {expiry} <span aria-label={warning}>⚠</span>
        </>
    ) : (
        expiry
    );
}

export function vipWarning(
    expiry: string,
    timeZone: string | null,
    now = new Date(),
): string | undefined {
    if (expiry === "Lifetime") return undefined;
    const date = parseServerDateTime(`${expiry}T00:00:00`, timeZone);
    if (!date) return undefined;
    if (date.getTime() < now.getTime()) return "VIP access expired";
    if (date.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000)
        return "VIP access will expire in the next 7 days";
    return undefined;
}
