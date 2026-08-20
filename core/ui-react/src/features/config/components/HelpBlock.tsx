import {Alert, Stack, Typography} from "@mui/material";

import {useShowAdvanced} from "../advancedFields";

/**
 * `C-CONFIG-FIELDS`: a static informational panel with no bound value
 * (legacy's `type: 'help'`, `formly-config.js:40-49` -- a Bootstrap panel of
 * `<h5>` lines). Gated the same way an advanced `SettingRow`/`ConfigFieldset`
 * is. `F-CONFIG-CATEGORIES` is the first consumer; `notificationConfig`
 * (`config-fields-service.js:2377-2386`) is the only other legacy user.
 */
export function HelpBlock({
    advanced,
    lines,
    testId,
}: {
    advanced?: boolean;
    lines: readonly string[];
    testId: string;
}) {
    const showAdvanced = useShowAdvanced();
    if (advanced === true && !showAdvanced) {
        return null;
    }
    return (
        <Alert
            data-testid={testId}
            severity="info"
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
