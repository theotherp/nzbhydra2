import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import RemoveCircleOutlineOutlinedIcon from "@mui/icons-material/RemoveCircleOutlineOutlined";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Divider,
    LinearProgress,
    Link,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import type {ReactNode, Ref} from "react";

import type {SearchResponse} from "../../../api/search";
import {useCompactRefineSurface} from "../../../components/refine/useCompactRefineSurface";
import {bootstrapBase} from "./bootstrapBase";
import {isRecord} from "./storedChoices";

/**
 * FM-199: legacy's collapsible "Indexer statuses" accordion
 * (`search-results.html:12-123` at `3ce28441e^`), restored as a one-line
 * summary above the results toolbar.
 *
 * What the numbers mean follows from `IndexerSearchMetaData` (see its comment
 * in `api/search.ts`): each entry is that indexer's most recent request, so
 * after "Load more"/"Load all" the counts and times are those of the latest
 * page, never a sum. The table's caption says so, and the columns are named
 * for that request rather than for the search.
 *
 * Rejection reasons are not repeated here: they stay in the toolbar's
 * `results-rejected-trigger` popover, and the backend reports no per-indexer
 * rejection counts.
 */

type SummaryRow =
    | {
          kind: "failed";
          name: string;
          errorMessage?: string;
          responseTime?: number;
      }
    | {
          kind: "succeeded";
          name: string;
          found?: number;
          total?: number;
          totalKnown: boolean;
          responseTime?: number;
      }
    | {kind: "notSearched"; name: string; reason?: string};

const byName = (first: {name: string}, second: {name: string}) =>
    first.name.localeCompare(second.name);

/** Failed first, then the successful ones, then those not searched; each by name. */
function summaryRows(data: SearchResponse): SummaryRow[] {
    const failed: SummaryRow[] = [];
    const succeeded: SummaryRow[] = [];
    const notSearched: SummaryRow[] = [];
    for (const entry of data.indexerSearchMetaDatas) {
        if (entry.didSearch === false) {
            // Legacy's "Did not search." row. The backend currently always
            // sends `didSearch: true` for a metadata entry, but the field is
            // part of the contract.
            notSearched.push({kind: "notSearched", name: entry.indexerName});
        } else if (!entry.wasSuccessful) {
            failed.push({
                kind: "failed",
                name: entry.indexerName,
                errorMessage: entry.errorMessage,
                // A request that failed before it was answered reports 0ms,
                // which is no response time at all rather than a fast one.
                responseTime: entry.responseTime || undefined,
            });
        } else {
            succeeded.push({
                kind: "succeeded",
                name: entry.indexerName,
                found: entry.numberOfFoundResults,
                total: entry.numberOfAvailableResults,
                totalKnown: entry.totalResultsKnown !== false,
                responseTime: entry.responseTime,
            });
        }
    }
    for (const [name, reason] of Object.entries(
        data.notPickedIndexersWithReason,
    )) {
        notSearched.push({kind: "notSearched", name, reason});
    }
    return [
        ...failed.sort(byName),
        ...succeeded.sort(byName),
        ...notSearched.sort(byName),
    ];
}

function formatResponseTime(milliseconds: number): string {
    const seconds = milliseconds / 1000;
    return `${seconds.toLocaleString(undefined, {
        maximumFractionDigits: seconds < 10 ? 2 : 1,
        minimumFractionDigits: seconds < 10 ? 2 : 1,
    })} s`;
}

function formatResults(row: SummaryRow): string {
    if (row.kind !== "succeeded" || row.found === undefined) {
        return "";
    }
    if (row.total === undefined) {
        return row.found.toLocaleString();
    }
    // Legacy's `>`: the indexer reported a total it cannot count exactly, so
    // the number is a lower bound.
    const total = `${row.totalKnown ? "" : ">"}${row.total.toLocaleString()}`;
    return `${row.found.toLocaleString()} of ${total}`;
}

/**
 * Whether this session may open the indexer statuses page -- the same test the
 * stats routes' guard applies (`features/auth/permissions.ts`): stats are not
 * restricted, or the session carries `maySeeStats`. Read from the page's
 * bootstrap object the way `SearchResults` reads `maySeeDetailsDl`, since this
 * component is not handed `BootstrapData`.
 */
function maySeeIndexerStatuses(): boolean {
    const bootstrap: unknown = window.__NZBHYDRA_BOOTSTRAP__;
    if (!isRecord(bootstrap)) {
        return false;
    }
    return (
        bootstrap.maySeeStats === true || bootstrap.statsRestricted === false
    );
}

/**
 * The indexer statuses page, resolved against the application base so it
 * works under a reverse-proxy path. A plain link opened in a new tab rather
 * than a router navigation: following it must not throw away the search
 * results this summary belongs to.
 */
function indexerStatusesHref(): string {
    const base = new URL(bootstrapBase(), window.location.origin);
    return new URL("stats/indexers", base).pathname;
}

function IndexerName({
    linked,
    name,
}: {
    linked: boolean;
    name: string;
}): ReactNode {
    if (!linked) {
        return name;
    }
    return (
        <Link
            data-testid={`indexer-summary-status-link-${name}`}
            href={indexerStatusesHref()}
            rel="noopener"
            target="_blank"
            title="Open the indexer statuses page"
        >
            {name}
        </Link>
    );
}

function ResponseTime({
    name,
    responseTime,
    slowest,
}: {
    name: string;
    responseTime?: number;
    slowest: number;
}) {
    if (responseTime === undefined) {
        return null;
    }
    return (
        <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
            <Box component="span" sx={{whiteSpace: "nowrap"}}>
                {formatResponseTime(responseTime)}
            </Box>
            <LinearProgress
                aria-label={`Response time of ${name}, relative to the slowest indexer`}
                sx={{flex: 1, minWidth: 48}}
                value={slowest > 0 ? (responseTime / slowest) * 100 : 0}
                variant="determinate"
            />
        </Stack>
    );
}

function Status({row}: {row: SummaryRow}) {
    if (row.kind === "succeeded") {
        return (
            <CheckCircleOutlineOutlinedIcon
                color="success"
                fontSize="small"
                sx={{display: "block"}}
                titleAccess="Succeeded"
            />
        );
    }
    if (row.kind === "failed") {
        return (
            <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                <ErrorOutlineOutlinedIcon
                    color="error"
                    fontSize="small"
                    titleAccess="Failed"
                />
                <span>{row.errorMessage ?? "Failed"}</span>
            </Stack>
        );
    }
    return (
        <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
            <RemoveCircleOutlineOutlinedIcon
                color="disabled"
                fontSize="small"
            />
            <span>
                {row.reason ? `Not searched: ${row.reason}` : "Not searched"}
            </span>
        </Stack>
    );
}

export function IndexerSummary({
    data,
    onOpenChange,
    open,
    ref,
}: {
    data: SearchResponse;
    onOpenChange: (open: boolean) => void;
    open: boolean;
    ref?: Ref<HTMLDivElement>;
}) {
    const compact = useCompactRefineSurface();
    const rows = summaryRows(data);
    if (rows.length === 0) {
        return null;
    }
    const searchedCount = rows.filter(
        (row) => row.kind !== "notSearched",
    ).length;
    const failedCount = rows.filter((row) => row.kind === "failed").length;
    const notSearchedCount = rows.length - searchedCount;
    let slowestRow: {name: string; responseTime: number} | undefined;
    for (const row of rows) {
        if (
            row.kind !== "notSearched" &&
            row.responseTime !== undefined &&
            row.responseTime > (slowestRow?.responseTime ?? 0)
        ) {
            slowestRow = {name: row.name, responseTime: row.responseTime};
        }
    }
    const slowest = slowestRow?.responseTime ?? 0;
    const linkNames = maySeeIndexerStatuses();

    // Below 768px the line keeps only the counts, and the title is dropped
    // ("3 searched" rather than "Indexers · 3 searched"): measured at 390px,
    // the long form cut "1 not searched" off. "searched" rather than
    // "indexers", which read as the total when some were not searched.
    const headerParts: {key: string; node: ReactNode}[] = compact
        ? [
              {
                  key: "searched",
                  node: (
                      <Box component="span" sx={{fontWeight: "fontWeightBold"}}>
                          {searchedCount} searched
                      </Box>
                  ),
              },
          ]
        : [
              {
                  key: "title",
                  node: (
                      <Box component="span" sx={{fontWeight: "fontWeightBold"}}>
                          Indexers
                      </Box>
                  ),
              },
              {key: "searched", node: `${searchedCount} searched`},
          ];
    if (failedCount > 0) {
        headerParts.push({
            key: "failed",
            node: (
                <Box component="span" sx={{color: "warning.main"}}>
                    {failedCount} failed
                </Box>
            ),
        });
    }
    if (notSearchedCount > 0) {
        headerParts.push({
            key: "notSearched",
            node: `${notSearchedCount} not searched`,
        });
    }
    if (!compact && slowestRow) {
        headerParts.push({
            key: "slowest",
            node: `slowest ${slowestRow.name} (${formatResponseTime(slowestRow.responseTime)})`,
        });
    }

    return (
        <Accordion
            data-testid="indexer-summary"
            disableGutters
            expanded={open}
            onChange={(_event, expanded) => onOpenChange(expanded)}
            ref={ref}
            slotProps={{transition: {unmountOnExit: true}}}
        >
            <AccordionSummary
                data-testid="indexer-summary-toggle"
                expandIcon={<ExpandMoreIcon />}
                sx={{
                    // One line at every width (acceptance): below 768px the
                    // header already drops the slowest indexer, and an
                    // indexer name long enough to overflow anyway is cut
                    // with an ellipsis rather than wrapping or pushing the
                    // page sideways (ADR-0029).
                    "& .MuiAccordionSummary-content": {minWidth: 0},
                }}
            >
                <Typography
                    component="span"
                    sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                    variant="body2"
                >
                    {headerParts.map((part, index) => (
                        <Box
                            component="span"
                            data-testid={`indexer-summary-${part.key}`}
                            key={part.key}
                        >
                            {index > 0 && " · "}
                            {part.node}
                        </Box>
                    ))}
                </Typography>
            </AccordionSummary>
            <AccordionDetails data-testid="indexer-summary-details">
                {compact ? (
                    <Stack divider={<Divider flexItem />} spacing={1}>
                        {rows.map((row) => (
                            <SummaryCard
                                key={`${row.kind}-${row.name}`}
                                linked={linkNames && row.kind !== "succeeded"}
                                row={row}
                                slowest={slowest}
                            />
                        ))}
                    </Stack>
                ) : (
                    <Table aria-label="Indexer summary" size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Indexer</TableCell>
                                <TableCell>Results</TableCell>
                                <TableCell sx={{width: "30%"}}>
                                    Response time
                                </TableCell>
                                <TableCell>Status</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {rows.map((row) => (
                                <TableRow
                                    data-testid={`indexer-summary-row-${row.name}`}
                                    key={`${row.kind}-${row.name}`}
                                >
                                    <TableCell>
                                        <IndexerName
                                            linked={
                                                linkNames &&
                                                row.kind !== "succeeded"
                                            }
                                            name={row.name}
                                        />
                                    </TableCell>
                                    <TableCell sx={{whiteSpace: "nowrap"}}>
                                        {formatResults(row)}
                                    </TableCell>
                                    <TableCell>
                                        {row.kind !== "notSearched" && (
                                            <ResponseTime
                                                name={row.name}
                                                responseTime={row.responseTime}
                                                slowest={slowest}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Status row={row} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                <Typography
                    color="text.secondary"
                    component="p"
                    sx={{mt: 1}}
                    variant="caption"
                >
                    Results and response times are from each indexer&apos;s most
                    recent request: the results it returned that passed your
                    filters, of the total it reported.
                </Typography>
            </AccordionDetails>
        </Accordion>
    );
}

/**
 * Below 768px, one indexer as a two-line card: its name and result count on
 * the first line, its response time or what went wrong on the second.
 */
function SummaryCard({
    linked,
    row,
    slowest,
}: {
    linked: boolean;
    row: SummaryRow;
    slowest: number;
}) {
    const results = formatResults(row);
    return (
        <Box data-testid={`indexer-summary-row-${row.name}`}>
            <Stack
                direction="row"
                spacing={1}
                sx={{alignItems: "center", justifyContent: "space-between"}}
            >
                <Typography
                    component="span"
                    sx={{
                        fontWeight: "fontWeightBold",
                        minWidth: 0,
                        overflowWrap: "anywhere",
                    }}
                    variant="body2"
                >
                    <IndexerName linked={linked} name={row.name} />
                </Typography>
                {results && (
                    <Typography
                        component="span"
                        sx={{whiteSpace: "nowrap"}}
                        variant="body2"
                    >
                        {results}
                    </Typography>
                )}
            </Stack>
            <Typography
                component="div"
                sx={{mt: 0.5, overflowWrap: "anywhere"}}
                variant="body2"
            >
                {row.kind === "succeeded" ? (
                    <Stack
                        direction="row"
                        spacing={1}
                        sx={{alignItems: "center"}}
                    >
                        <Status row={row} />
                        <Box sx={{flex: 1}}>
                            <ResponseTime
                                name={row.name}
                                responseTime={row.responseTime}
                                slowest={slowest}
                            />
                        </Box>
                    </Stack>
                ) : (
                    <Status row={row} />
                )}
            </Typography>
        </Box>
    );
}
