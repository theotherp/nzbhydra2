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
import {createContext, useContext, useEffect} from "react";

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
 * Legacy's row was a fraction of a 20-column grid (`col-sm-6` of
 * `col-sm-20` in `config.html`), not a fixed pixel width, so there is no
 * literal number to carry forward. 560 is a deliberate reading-width cap
 * instead: on a wide desktop viewport a single-line control filling the
 * whole row would read as an oversized empty box, and unbounded help/error
 * prose below it would run far past the control's own right edge. The
 * control box and both `FormHelperText` blocks below it all read this one
 * constant so the three edges cannot drift apart.
 */
const settingColumnMaxWidth = 560;

/**
 * FM-151's opt-in. `SettingRow`'s default box reserves `mb: 2.5` below its
 * control so the help/error text that may follow has room in the document's
 * normal flow — correct in a form column, where every row's neighbour is the
 * next row down. It is wrong inside a table row, where every column's
 * control has to sit on one shared line no matter which cells carry help or
 * error text and which do not: a cell's box has to be exactly its control's
 * own height, or the table's own vertical centering (each cell centers in
 * its row, unstyled) centers a different box in each column and the controls
 * drift apart.
 *
 * A `SettingRow` rendered inside `<SettingRowTableCellScope>` drops the
 * reserved margin and pulls its error/help text out of flow (`position:
 * absolute`, anchored to the control's own bottom edge) so that text can
 * still render — legible, still owning the same ids `aria-describedby`
 * points at — without changing the box height the table centers on. It hangs
 * below the control rather than growing the cell for it.
 *
 * Every consumer outside the scope is unaffected: the context defaults to
 * `false`, so a `SettingRow` that never mounts inside the scope renders its
 * original margin and its original in-flow help/error placement, byte for
 * byte.
 */
const SettingRowTableCellContext = createContext(false);

export function SettingRowTableCellScope({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <SettingRowTableCellContext.Provider value={true}>
            {children}
        </SettingRowTableCellContext.Provider>
    );
}

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
    const inTableCell = useContext(SettingRowTableCellContext);
    useEffect(() => {
        if (!hiddenByToggle) {
            return undefined;
        }
        return registerHiddenAdvancedRow(name);
    }, [hiddenByToggle, name, registerHiddenAdvancedRow]);

    const errorNode =
        error === undefined ? null : (
            <FormHelperText
                data-testid={`config-error-${name.replaceAll(".", "-")}`}
                error
                id={settingErrorId(name)}
                sx={{maxWidth: settingColumnMaxWidth}}
            >
                {error}
            </FormHelperText>
        );
    const helpNode =
        help === undefined ? null : (
            <FormHelperText
                component="div"
                id={settingHelpId(name)}
                sx={{maxWidth: settingColumnMaxWidth}}
            >
                <SettingHelp content={help} />
            </FormHelperText>
        );
    // Outside the scope this is just the two nodes as direct children of the
    // row `Box`, exactly as before. Inside it, they move into one wrapper
    // that is lifted out of flow so neither can add to the box height the
    // table centers the row's controls on.
    const supportingText =
        errorNode === null && helpNode === null ? null : inTableCell ? (
            <Box sx={{left: 0, position: "absolute", top: "100%"}}>
                {errorNode}
                {helpNode}
            </Box>
        ) : (
            <>
                {errorNode}
                {helpNode}
            </>
        );

    const row = (
        <Box
            data-testid={settingRowTestId(name)}
            sx={{
                mb: inTableCell ? 0 : 2.5,
                position: inTableCell ? "relative" : undefined,
            }}
        >
            <Stack alignItems="center" direction="row" spacing={1}>
                <Box sx={{flexGrow: 1, maxWidth: settingColumnMaxWidth}}>
                    {children}
                </Box>
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
            {supportingText}
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
