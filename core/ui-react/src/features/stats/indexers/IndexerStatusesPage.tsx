import {useQuery} from "@tanstack/react-query";
import {
    Alert,
    Chip,
    type ChipProps,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    type Theme,
    Typography,
} from "@mui/material";

import {
    getIndexerStatuses,
    type IndexerStatus,
} from "../../../api/stats/indexerStatuses";
import {ApiTransport} from "../../../api/transport";
import type {BootstrapData} from "../../../bootstrap";
import {stackedCardTableSx} from "../../../components/table/stackedCardTableSx";
import {TableScrollAffordance} from "../../../components/table/TableScrollAffordance";
import {formatServerDateTime} from "../../../domain/date-time/dateTime";
import {Loading} from "../shared/Loading";
import {vipWarning} from "./vipWarning";

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
        queryFn: ({signal}) =>
            loadStatuses
                ? loadStatuses()
                : getIndexerStatuses(transport as ApiTransport, signal),
    });
    if (query.isPending) return <Loading message="Loading indexer statuses…" />;
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

function StatusTable({
    statuses,
    timeZone,
}: {
    statuses: IndexerStatus[];
    timeZone: string | null;
}) {
    return (
        <TableScrollAffordance scrollerTestId="indexer-statuses-scroller">
            <Table
                aria-label="Indexer statuses"
                // Measured at 390x844 with realistic data (a long indexer
                // name, a full-length error message, and a VIP-warning
                // expiry): the eight columns -- Indexer, State, Disabled
                // until, Last error, API hits, Downloads, Next hit allowed,
                // VIP expiry -- need 1571px so no header or value wraps
                // mid-word. 1580 keeps them at that intrinsic width above the
                // 768px breakpoint, where `stackedCardTableSx` turns the
                // table into stacked cards instead (see that helper).
                sx={[
                    (theme) => ({
                        minWidth: 1580,
                        ...stackedCardTableSx(theme),
                    }),
                    compactCardSx,
                ]}
            >
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
                            <TableCell data-label="Indexer">
                                {status.indexer}
                            </TableCell>
                            <TableCell data-label="State">
                                <Chip
                                    size="small"
                                    variant="outlined"
                                    color={stateColor(status.state)}
                                    label={stateLabel(status.state)}
                                />
                            </TableCell>
                            <TableCell data-label="Disabled until">
                                {status.state === "DISABLED_SYSTEM_TEMPORARY"
                                    ? formatServerDateTime(
                                          status.disabledUntil,
                                          timeZone,
                                      )
                                    : ""}
                            </TableCell>
                            <TableCell data-label="Last error">
                                {status.lastError ?? ""}
                            </TableCell>
                            <TableCell data-label="API hits">
                                {limit(status.apiHits, status.apiHitLimit)}
                            </TableCell>
                            <TableCell data-label="Downloads">
                                {limit(
                                    status.downloadHits,
                                    status.downloadHitLimit,
                                )}
                            </TableCell>
                            <TableCell data-label="Next hit allowed">
                                {reset(status, timeZone)}
                            </TableCell>
                            <TableCell data-label="VIP expiry">
                                {vip(status.vipExpirationDate, timeZone)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableScrollAffordance>
    );
}

/**
 * Tightens `stackedCardTableSx`'s generic one-line-per-column card for this
 * page, where most indexers only ever fill two or three of the eight
 * columns: a card that listed every column, empty or not, made a phone
 * scroll roughly a screen per four indexers. Below the same 768px breakpoint
 * each row becomes a wrapping flex line -- the indexer name and its state
 * chip share the heading line without labels, API hits and downloads share
 * a line, longer values span the card, a cell with nothing to show is
 * dropped, and the caption flows at full width. The reduced cell padding is
 * the deviation from the theme's table density: it only applies inside a
 * card, where the card border, not the cell padding, separates one indexer
 * from the next.
 */
function compactCardSx(theme: Theme) {
    return {
        [theme.breakpoints.down(768)]: {
            // Inside the block-level table a `table-caption` box shrinks to
            // its longest word, wrapping the caption one word per line.
            "& caption": {display: "block"},
            "& tbody tr": {
                columnGap: theme.spacing(2),
                display: "flex",
                flexWrap: "wrap",
                paddingBlock: theme.spacing(1),
            },
            // A zero-height, full-width flex item ordered between the heading
            // pair and the rest, so a lone counter never joins the heading
            // line. A pseudo-element rather than a cell keeps the row's cells
            // matching the header's columns.
            "& tbody tr::before": {
                content: '""',
                flexBasis: "100%",
                order: 1,
            },
            "& tbody td": {
                flex: "1 1 100%",
                order: 2,
                minWidth: 0,
                overflowWrap: "break-word",
                paddingBlock: theme.spacing(0.25),
            },
            "& tbody td:empty": {display: "none"},
            // The name gives way to the chip: it wraps between words first,
            // and only when its longest word and the chip no longer fit on
            // one line does the chip drop below it. The chip is never
            // truncated.
            "& tbody td[data-label='Indexer']": {
                flex: "1 1 0",
                order: 0,
                fontWeight: theme.typography.fontWeightBold,
                minWidth: "min-content",
                textAlign: "left",
            },
            "& tbody td[data-label='State']": {
                flex: "0 0 auto",
                order: 0,
                justifyContent: "flex-end",
                marginInlineStart: "auto",
            },
            "& tbody td[data-label='Indexer']::before, & tbody td[data-label='State']::before":
                {display: "none"},
            // Equal bases so the two counters split the line evenly.
            "& tbody td[data-label='API hits'], & tbody td[data-label='Downloads']":
                {flex: "1 1 40%"},
            // Long values read better under their label than wrapped
            // against the right edge.
            "& tbody td[data-label='Last error'], & tbody td[data-label='Next hit allowed']":
                {
                    alignItems: "flex-start",
                    flexDirection: "column",
                    gap: 0,
                    textAlign: "left",
                },
        },
    };
}

function stateLabel(state: IndexerStatus["state"]): string {
    return {
        ENABLED: "Enabled",
        DISABLED_SYSTEM_TEMPORARY: "Temporarily disabled by system",
        DISABLED_SYSTEM: "Disabled by system",
        DISABLED_USER: "Disabled by user",
    }[state];
}

function stateColor(state: IndexerStatus["state"]): ChipProps["color"] {
    return (
        {
            ENABLED: "success",
            DISABLED_SYSTEM_TEMPORARY: "warning",
            DISABLED_SYSTEM: "error",
            DISABLED_USER: "default",
        } as const
    )[state];
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
