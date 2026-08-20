import {FormControlLabel, Switch} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {
    SettingRow,
    settingInputTestId,
    type ConfigFieldPath,
    type HelpContent,
} from "../components";
import {
    indexerStateLabel,
    isIndexerEnabled,
    toggledIndexerState,
} from "./indexerSettings";

/**
 * `indexer-state-switch.js` / `indexer-state-switch.html`: the indexer's
 * `state`, edited as a switch whose *off* caption names the reason it is off.
 *
 * That caption is the whole point of the control and is why `SwitchSetting`
 * cannot serve here: `IndexerConfig.State` is a four-value enum, and an admin
 * has to be able to tell "I turned this off" (`DISABLED_USER`) from "Hydra
 * turned it off for a while" (`DISABLED_SYSTEM_TEMPORARY`) and from "Hydra gave
 * up on it" (`DISABLED_SYSTEM`) without opening anything. Turning the switch
 * off is always the user disabling it, exactly as legacy's `onChange` does.
 *
 * The switch is inoperable while the indexer's configuration is incomplete
 * (legacy's `switch-active="{{indexer.configComplete}}"`): an indexer whose
 * capability check never completed cannot be searched, so enabling it would
 * promise something the backend will not do.
 */
export function IndexerStateSwitch({
    configComplete,
    help,
    label,
    name,
}: {
    configComplete: boolean;
    help?: HelpContent;
    /** Names the row and its tooltip; the switch's own caption is the state. */
    label: string;
    name: ConfigFieldPath;
}) {
    const {field} = useController<ConfigValues>({name});
    const stateLabel = indexerStateLabel(field.value);
    return (
        <SettingRow help={help} label={label} name={name}>
            <FormControlLabel
                control={
                    <Switch
                        checked={isIndexerEnabled(field.value)}
                        data-testid={settingInputTestId(name)}
                        disabled={!configComplete}
                        inputRef={field.ref}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(_event, checked) =>
                            field.onChange(toggledIndexerState(checked))
                        }
                        slotProps={{
                            // `Switch` defaults its input slot to
                            // `{role: "switch"}`; supplying an `input` object
                            // replaces that default outright.
                            input: {role: "switch"},
                        }}
                    />
                }
                // The caption *is* the state, as in legacy: "Enabled", or the
                // reason the indexer is off.
                label={stateLabel}
            />
        </SettingRow>
    );
}
