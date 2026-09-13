import {CircularProgress, Stack, Typography} from "@mui/material";
import {useEffect, useState} from "react";

// A query that resolves faster than this never shows the placeholder at all
// (FM-144) — the same 300ms the search form's autocomplete debounce already
// treats as "too fast to need feedback" (SearchWorkspace.tsx).
const DELAY_MS = 300;

/**
 * The stats area's shared first-load placeholder: `SearchHistoryPage`,
 * `DownloadHistoryPage`, `NotificationHistoryPage`, `StatsDashboardPage`,
 * `IndexerStatusesPage`, and `SavedSearchesPage` all render this anatomy
 * identically, differing only in the message. The message stays a
 * caller-supplied argument rather than a per-page default so each route's
 * wording is preserved verbatim. Rendering is delayed by `DELAY_MS` so a
 * fast-resolving query never flashes the placeholder.
 */
export function Loading({message}: {message: string}) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const timeout = window.setTimeout(() => setVisible(true), DELAY_MS);
        return () => window.clearTimeout(timeout);
    }, []);
    if (!visible) return null;
    return (
        <Stack
            component="main"
            role="status"
            spacing={1}
            sx={{
                alignItems: "center",
            }}
        >
            <CircularProgress />
            <Typography>{message}</Typography>
        </Stack>
    );
}
