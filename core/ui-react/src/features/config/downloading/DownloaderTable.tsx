import {
    Box,
    Button,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import {SwitchSetting} from "../components";
import {
    downloaderFieldPath,
    downloaderLegend,
    downloaderTypeLabel,
    downloaderUrlDisplay,
    DOWNLOADERS_TEST_ID,
    type DownloaderValues,
} from "./downloadingSettings";

/**
 * `F-CONFIG-DOWNLOADING`'s downloader list (FM-118) as a table, following the
 * shape `IndexerTable.tsx` and `AuthUsersSection.tsx` each hand-roll for their
 * own list — ADR-0033 decided a bespoke table rather than extracting a shared
 * one out of three divergent call sites.
 *
 * **What a row is bound to.** The Enabled switch is the only form control in
 * the table; everything else is derived text, and the name button carries
 * only the entry's *configuration index* back to `DownloadersSection`, which
 * opens `DownloaderDialog`'s transaction. Rows are painted in configuration
 * order and are never sorted or filtered (ADR-0033: legacy's name sort was
 * deliberately dropped, see `DownloadersSection.tsx`'s module doc), so
 * display position and config index are the same number here by
 * construction; `downloaderFieldPath(index, …)` is still passed the index
 * explicitly rather than relying on that.
 *
 * Legacy puts an enable/disable switch next to every downloader in the list,
 * editing the configuration directly rather than through the modal
 * (`downloader-config.html:29`). It stays that way here: it is a one-click
 * toggle, not an edit that needs verifying, so it stays on the row and out of
 * the modal.
 */
export function DownloaderTable({
    entries,
    onEdit,
}: {
    entries: DownloaderValues[];
    onEdit: (index: number) => void;
}) {
    /*
     * Below `sm` the four columns squeeze the Enabled switch and the name
     * button's own label past readable width, the same measurement
     * `IndexerTable.tsx:114` and its neighbouring comment record for its own
     * five columns. The row collapses to one stacked cell instead: the same
     * controls, the same bindings, the same test ids, nothing hidden and
     * nothing truncated.
     */
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down("sm"));

    return (
        <TableContainer sx={{overflowX: "auto"}}>
            <Table
                aria-label="Configured downloaders"
                data-testid="config-downloaders-table"
                sx={{minWidth: compact ? undefined : 640}}
            >
                <TableHead>
                    <TableRow>
                        {compact ? (
                            <TableCell>Downloader</TableCell>
                        ) : (
                            <>
                                <TableCell>Downloader</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>URL</TableCell>
                                <TableCell>Enabled</TableCell>
                            </>
                        )}
                    </TableRow>
                </TableHead>
                <TableBody>
                    {entries.map((entry, index) => (
                        <DownloaderTableRow
                            compact={compact}
                            entry={entry}
                            // The index is the key on purpose, as in
                            // `RepeatSection`: a downloader's name is editable
                            // and not guaranteed unique, and row N always
                            // shows and edits whatever is currently at index
                            // N.
                            key={index}
                            index={index}
                            onEdit={() => onEdit(index)}
                        />
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

function DownloaderTableRow({
    compact,
    entry,
    index,
    onEdit,
}: {
    /** Below `sm`: Type, URL and Enabled are folded into the name cell. */
    compact: boolean;
    entry: DownloaderValues;
    index: number;
    onEdit: () => void;
}) {
    const legend = downloaderLegend(entry);
    const name = (
        <Button
            data-testid={`config-repeat-edit-${DOWNLOADERS_TEST_ID}-${index}`}
            onClick={onEdit}
            sx={{
                maxWidth: compact ? "100%" : 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
            }}
            title={legend}
            type="button"
            variant="outlined"
        >
            {legend}
        </Button>
    );
    const type = (
        <Typography
            data-testid={`config-downloader-value-${index}-downloaderType`}
            variant="body2"
        >
            {downloaderTypeLabel(entry.downloaderType)}
        </Typography>
    );
    const url = (
        <Typography
            data-testid={`config-downloader-value-${index}-url`}
            variant="body2"
        >
            {downloaderUrlDisplay(entry)}
        </Typography>
    );
    const enabled = (
        <SwitchSetting
            label="Enabled"
            name={downloaderFieldPath(index, "enabled")}
        />
    );

    if (compact) {
        // The same four pieces, stacked in one cell instead of spread across
        // four columns. Nothing here is a second copy: each element is built
        // once above and placed once, in exactly one of the two branches.
        return (
            <TableRow
                data-testid={`config-repeat-entry-${DOWNLOADERS_TEST_ID}-${index}`}
            >
                <TableCell>
                    <Stack alignItems="flex-start" spacing={1}>
                        {name}
                        {type}
                        {url}
                        <Box sx={{width: "100%"}}>{enabled}</Box>
                    </Stack>
                </TableCell>
            </TableRow>
        );
    }
    return (
        <TableRow
            data-testid={`config-repeat-entry-${DOWNLOADERS_TEST_ID}-${index}`}
        >
            <TableCell>{name}</TableCell>
            <TableCell>{type}</TableCell>
            <TableCell>{url}</TableCell>
            <TableCell>{enabled}</TableCell>
        </TableRow>
    );
}
