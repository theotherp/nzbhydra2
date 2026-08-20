import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {Box, IconButton, Stack, Tooltip, Typography} from "@mui/material";

import {useShowAdvanced} from "../advancedFields";

/**
 * `C-CONFIG-FIELDS`: a titled group of settings — the replacement for legacy's
 * `fieldset-wrapper.html`. An advanced fieldset hides itself and everything in
 * it, exactly as legacy's `ng-show="model.showAdvanced || !to.advanced"` on the
 * `<fieldset>` does.
 */
export function ConfigFieldset({
    advanced,
    children,
    label,
    tooltip,
}: {
    advanced?: boolean;
    children: React.ReactNode;
    label: string;
    tooltip?: string;
}) {
    const showAdvanced = useShowAdvanced();
    if (advanced && !showAdvanced) {
        return null;
    }
    return (
        <Box
            component="fieldset"
            data-testid={`config-fieldset-${label.toLowerCase()}`}
            // A native `<fieldset>`/`<legend>` pair is the semantic grouping
            // for a set of related form controls, and it is what assistive
            // technology announces. Its user-agent border and inset padding are
            // browser chrome rather than a design decision, so they are reset
            // here; everything visible comes from the theme.
            sx={{border: 0, m: 0, p: 0, pt: 1}}
        >
            <Stack
                alignItems="center"
                component="legend"
                direction="row"
                spacing={0.5}
                sx={{pb: 1}}
            >
                <Typography component="span" variant="h6">
                    {label}
                </Typography>
                {tooltip === undefined ? null : (
                    <Tooltip title={tooltip}>
                        <IconButton
                            aria-label={`About ${label}`}
                            data-testid={`config-fieldset-tooltip-${label.toLowerCase()}`}
                            size="small"
                        >
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            {children}
        </Box>
    );
}
