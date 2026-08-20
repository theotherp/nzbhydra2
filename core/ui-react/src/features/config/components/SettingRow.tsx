import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {Box, FormHelperText, IconButton, Stack, Tooltip} from "@mui/material";

import {useShowAdvanced} from "../advancedFields";
import {SettingHelp} from "./SettingHelp";
import {
    settingErrorId,
    settingHelpId,
    settingRowTestId,
    type HelpContent,
} from "./settings";

/**
 * `C-CONFIG-FIELDS`: one configuration setting's row — the replacement for
 * legacy's `setting-wrapper.html`.
 *
 * The row owns everything *around* the control: advanced gating, the tooltip
 * affordance, the validation message, and the help text below. It deliberately
 * does not render the label itself, even though it is given one: under
 * ADR-0014 the control is a stock MUI component that already renders its own
 * visible, correctly associated label (`TextField label`,
 * `FormControlLabel`), and a second label in the row would either duplicate it
 * or force the control's own to be clipped. The `label` prop is what names the
 * tooltip affordance for assistive technology.
 *
 * Hiding an advanced row unmounts its control. That is safe — and must stay
 * safe — only because `C-CONFIG-FORM` creates its form with
 * `shouldUnregister: false`: the value behind a hidden row stays in the form
 * and is written back unchanged on the next save.
 */
export function SettingRow({
    advanced,
    children,
    error,
    help,
    label,
    name,
    tooltip,
}: {
    advanced?: boolean;
    children: React.ReactNode;
    error?: string;
    help?: HelpContent;
    label: string;
    name: string;
    tooltip?: string;
}) {
    const showAdvanced = useShowAdvanced();
    if (advanced && !showAdvanced) {
        return null;
    }
    return (
        <Box data-testid={settingRowTestId(name)} sx={{mb: 2.5}}>
            <Stack alignItems="center" direction="row" spacing={1}>
                {/*
                 * Legacy's row was a fraction of a 20-column grid
                 * (`col-sm-6` of `col-sm-20` in `config.html`), not a fixed
                 * pixel width, so there is no literal number to carry
                 * forward. 560 is a deliberate reading-width cap instead: on
                 * a wide desktop viewport a single-line control filling the
                 * whole row would read as an oversized empty box.
                 */}
                <Box sx={{flexGrow: 1, maxWidth: 560}}>{children}</Box>
                {tooltip === undefined ? null : (
                    <Tooltip title={tooltip}>
                        <IconButton
                            aria-label={`About ${label}`}
                            data-testid={`config-tooltip-${name.replaceAll(".", "-")}`}
                            size="small"
                        >
                            <HelpOutlineIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
            {error === undefined ? null : (
                <FormHelperText
                    data-testid={`config-error-${name.replaceAll(".", "-")}`}
                    error
                    id={settingErrorId(name)}
                >
                    {error}
                </FormHelperText>
            )}
            {help === undefined ? null : (
                <FormHelperText component="div" id={settingHelpId(name)}>
                    <SettingHelp content={help} />
                </FormHelperText>
            )}
        </Box>
    );
}
