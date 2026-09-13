import {Alert, Stack, Typography} from "@mui/material";

import type {ConfigTab} from "./configTabs";

/**
 * The body of a tab whose settings have not been migrated yet (FM-059
 * onwards). The whole configuration is still loaded into the form and written
 * back on save, so an unmigrated section is carried through untouched rather
 * than being dropped.
 */
export function ConfigTabPlaceholder({tab}: {tab: ConfigTab}) {
    return (
        <Stack data-testid="config-tab-placeholder" spacing={2}>
            <Typography component="h2" variant="h6">
                {tab.label}
            </Typography>
            <Alert severity="info">
                These settings have not been migrated to the new interface yet.
                They are still part of every save: the complete configuration is
                loaded here and written back unchanged.
            </Alert>
        </Stack>
    );
}
