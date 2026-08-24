import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {Box, Button, Chip, Stack} from "@mui/material";

import type {IndexerValues} from "../../../api/config/indexers";
import {NumberSetting} from "../components";
import {IndexerStateSwitch} from "./IndexerStateSwitch";
import {
    indexerFieldPath,
    indexerLegend,
    indexerStateHelp,
    vipExpiryWarning,
} from "./indexerSettings";

const CONFIG_INCOMPLETE_MARKER = "Config incomplete";
const CAPS_INCOMPLETE_MARKER = "Caps check incomplete";

/**
 * One row of the indexer list — legacy's `indexer-input` directive.
 *
 * Everything in it edits the *configuration* directly rather than through the
 * edit dialog, exactly as legacy does: the name is the button that opens the
 * editor, and the state switch and the priority field are one-click edits that
 * mark the shell's form dirty and are persisted by its Save.
 *
 * Legacy signals an incomplete configuration and an incomplete capability check
 * by adding CSS classes to the name button (`config-incomplete`,
 * `not-all-checked`), which is colour alone. They are named markers here, so an
 * indexer that will silently be skipped by every search says so in words.
 */
export function IndexerRow({
    entry,
    index,
    onEdit,
}: {
    entry: IndexerValues;
    /** The entry's index in the configuration, not its position in the list. */
    index: number;
    onEdit: () => void;
}) {
    const legend = indexerLegend(entry);
    const configComplete = entry.configComplete === true;
    const expiry = vipExpiryWarning(entry);
    return (
        <Stack
            alignItems={{sm: "center"}}
            data-testid={`config-indexer-entry-${index}`}
            direction={{xs: "column", sm: "row"}}
            spacing={{xs: 1, sm: 2}}
            sx={{flexWrap: "wrap"}}
        >
            <Button
                data-testid={`config-indexer-edit-${index}`}
                onClick={onEdit}
                type="button"
                variant="outlined"
            >
                {legend}
            </Button>
            {configComplete ? null : (
                <Chip
                    color="error"
                    data-testid={`config-indexer-incomplete-${index}`}
                    label={CONFIG_INCOMPLETE_MARKER}
                    size="small"
                    variant="outlined"
                />
            )}
            {configComplete && entry.allCapsChecked !== true ? (
                <Chip
                    color="warning"
                    data-testid={`config-indexer-caps-incomplete-${index}`}
                    label={CAPS_INCOMPLETE_MARKER}
                    size="small"
                    variant="outlined"
                />
            ) : null}
            {expiry === undefined ? null : (
                <Chip
                    color="warning"
                    data-testid={`config-indexer-vip-warning-${index}`}
                    icon={<WarningAmberIcon />}
                    label={expiry}
                    size="small"
                    variant="outlined"
                />
            )}
            <Box sx={{minWidth: 220}}>
                <IndexerStateSwitch
                    configComplete={configComplete}
                    help={indexerStateHelp(entry.state)}
                    label={`State of ${legend}`}
                    name={indexerFieldPath(index, "state")}
                />
            </Box>
            <Box sx={{width: 160}}>
                <NumberSetting
                    label="Priority"
                    name={indexerFieldPath(index, "score")}
                    required
                />
            </Box>
        </Stack>
    );
}
