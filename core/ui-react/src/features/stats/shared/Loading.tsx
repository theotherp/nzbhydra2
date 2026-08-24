import {CircularProgress, Stack, Typography} from "@mui/material";

/**
 * The stats area's shared first-load placeholder: `SearchHistoryPage`,
 * `DownloadHistoryPage`, `NotificationHistoryPage`, and `StatsDashboardPage`
 * rendered this anatomy identically, differing only in the message. The
 * message stays a caller-supplied argument rather than a per-page default so
 * each route's wording is preserved verbatim.
 */
export function Loading({message}: {message: string}) {
    return (
        <Stack alignItems="center" component="main" role="status" spacing={1}>
            <CircularProgress />
            <Typography>{message}</Typography>
        </Stack>
    );
}
