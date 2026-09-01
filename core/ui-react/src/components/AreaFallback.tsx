import {CircularProgress, Stack, Typography} from "@mui/material";

/**
 * The `Suspense` fallback the three lazily-loaded areas share — `features/
 * config/routes.tsx`, `features/system/routes.tsx` and `features/stats/
 * routes.tsx` — each at two nested boundaries: one on the parent route for
 * the area's shell, and one per tab body inside it, so a tab switch never
 * takes the shell's tab strip down with it. It sits in the content area — the
 * application shell around it never unmounts — and reserves height so nothing
 * below it moves when the chunk lands.
 *
 * Which of the two boundaries paints depends on whether the incoming chunk is
 * already loaded. A *warm* tab switch suspends nowhere and swaps in one
 * commit, holding the outgoing body — that is the frame
 * `ConfigShell.test.tsx`'s FM-120 test measures. A *cold* one does paint this:
 * React shows a newly mounted `Suspense` boundary's fallback even inside a
 * router transition, and each tab body mounts its own boundary, so the first
 * visit to a tab shows this for as long as its chunk takes to arrive. The
 * reserved height is what that case needs, and the cold sequence is pinned by
 * its own test beside the FM-120 one.
 *
 * The message stays a caller-supplied argument rather than a per-area default
 * so each area's wording is preserved verbatim, the way
 * `features/stats/shared/Loading.tsx` — the same anatomy, for a resolved
 * area's first *query* rather than for its chunk — takes its own.
 *
 * This module lives outside `features/` because all three areas import it and
 * because those `routes.tsx` files are loaded eagerly: `router.tsx` builds the
 * whole route tree synchronously, so everything they import lands in the entry
 * chunk. It must therefore stay as light as it looks — three MUI components
 * the entry already carries, and nothing else (FM-163).
 */
export function AreaFallback({message}: {message: string}) {
    return (
        <Stack
            alignItems="center"
            component="main"
            role="status"
            spacing={1}
            sx={{minHeight: 320, pt: 8}}
        >
            <CircularProgress />
            <Typography>{message}</Typography>
        </Stack>
    );
}
