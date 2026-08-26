import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import {
    Box,
    Chip,
    Collapse,
    FormHelperText,
    IconButton,
    Stack,
    Tooltip,
} from "@mui/material";
import {useEffect} from "react";

import {useShowAdvanced} from "../advancedFields";
import {useAdvancedDisclosure} from "./advancedDisclosure";
import {SettingHelp} from "./SettingHelp";
import {
    advancedChipTestId,
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
 *
 * FM-098: the row itself stays mounted while it is hidden, rendering nothing
 * (`Collapse unmountOnExit` renders no element at all when collapsed). That is
 * what lets it report itself to the enclosing fieldset for as long as it exists,
 * so the fieldset can offer "N advanced settings hidden" instead of dropping
 * them silently — and it changes nothing about the value behind the row, which
 * is held by the form either way.
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
    const {registerHiddenAdvancedRow, revealed} = useAdvancedDisclosure();
    const hiddenByToggle = advanced === true && !showAdvanced;
    useEffect(() => {
        if (!hiddenByToggle) {
            return undefined;
        }
        return registerHiddenAdvancedRow(name);
    }, [hiddenByToggle, name, registerHiddenAdvancedRow]);

    const row = (
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
                {advanced === true && hiddenByToggle ? (
                    // ADR-0027: the chip marks a row revealed through its
                    // fieldset's expander only. Toggle-on rows carry no
                    // individual "advanced" flag at the fieldset level, so an
                    // unchipped row there would misleadingly read as
                    // "not advanced" — the chip is unambiguous only in the
                    // revealed state, which is exactly the `hiddenByToggle`
                    // condition (this row is only on screen because the
                    // expander revealed it).
                    <Chip
                        data-testid={advancedChipTestId(name)}
                        label="Advanced"
                        size="small"
                        variant="outlined"
                    />
                ) : null}
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
    if (!hiddenByToggle) {
        return row;
    }
    // Collapsed, this renders no element whatsoever — `unmountOnExit` makes the
    // transition itself render `null` — so a hidden row is as absent from the
    // DOM as the `return null` it replaces, while this component stays mounted
    // and counted.
    return (
        <Collapse in={revealed} unmountOnExit>
            {row}
        </Collapse>
    );
}
