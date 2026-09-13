import {Alert, Stack, Typography} from "@mui/material";

import {useShowAdvanced} from "../advancedFields";

/**
 * `C-CONFIG-FIELDS`: a static informational panel with no bound value
 * (legacy's `type: 'help'`, `formly-config.js:40-49` -- a Bootstrap panel of
 * `<h5>` lines). An advanced help block is hidden outright while the global
 * toggle is off, and is deliberately outside FM-098's per-fieldset disclosure:
 * that disclosure exists so a *setting* a user could change stays discoverable,
 * and a block of prose holds no value to lose. `F-CONFIG-CATEGORIES`'s is in
 * any case a sibling of the advanced Categories fieldset rather than a child of
 * any fieldset, so it has no expander it could belong to.
 * `F-CONFIG-CATEGORIES` is the first consumer; `notificationConfig`
 * (`config-fields-service.js:2377-2386`) is the only other legacy user.
 *
 * `severity` carries legacy's optional `templateOptions.class`: the indexer box
 * renders the same block as `alert alert-danger` or `alert alert-warning`
 * depending on how incomplete the entry is (`formly-indexers.js:58-77`).
 */
export function HelpBlock({
    advanced,
    lines,
    severity = "info",
    testId,
}: {
    advanced?: boolean;
    lines: readonly string[];
    severity?: "error" | "info" | "warning";
    testId: string;
}) {
    const showAdvanced = useShowAdvanced();
    if (advanced === true && !showAdvanced) {
        return null;
    }
    return (
        <Alert
            data-testid={testId}
            severity={severity}
            sx={{mb: 2.5}}
            variant="outlined"
        >
            <Stack spacing={0.5}>
                {lines.map((line, index) => (
                    <Typography key={index} variant="body2">
                        {line}
                    </Typography>
                ))}
            </Stack>
        </Alert>
    );
}
