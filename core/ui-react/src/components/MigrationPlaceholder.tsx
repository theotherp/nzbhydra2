import {Stack, Typography} from "@mui/material";

/**
 * FM-095: with the legacy shell removed there is nothing left to switch to, so this is no longer a
 * migration placeholder offering a way out -- it is the notice for a route this application does not
 * have. It survives because the stats and system shells route their unknown `$tab` here rather than
 * rendering nothing.
 *
 * Kept out of `router.tsx` so that file exports the router-building function only -- a file exporting
 * both a component and a plain function trips `react-refresh/only-export-components`.
 */
export function MigrationPlaceholder() {
    return (
        <Stack component="main" spacing={3} sx={{py: 8}}>
            <Typography component="h1" variant="h4">
                Page not found
            </Typography>
            <Typography>
                This address does not match any page of NZBHydra.
            </Typography>
        </Stack>
    );
}
