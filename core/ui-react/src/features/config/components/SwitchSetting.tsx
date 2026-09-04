import {FormControlLabel, Switch} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    settingDescribedBy,
    settingInputTestId,
    type SettingProps,
} from "./settings";

/**
 * `C-CONFIG-FIELDS`: a boolean setting (legacy's `horizontalSwitch`). Every
 * boolean in `MainConfig` is a primitive `boolean`, so a missing value is
 * rendered — and left — as off rather than being written back as `false` on
 * mount.
 */
export function SwitchSetting({
    advanced,
    help,
    label,
    name,
    tooltip,
}: Omit<SettingProps, "required" | "validate">) {
    const {field} = useController<ConfigValues>({name});
    return (
        <SettingRow
            advanced={advanced}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <FormControlLabel
                control={
                    <Switch
                        checked={field.value === true}
                        data-testid={settingInputTestId(name)}
                        name={field.name}
                        onBlur={field.onBlur}
                        onChange={(_event, checked) => field.onChange(checked)}
                        slotProps={{
                            // `Switch` itself defaults its input slot to
                            // `{role: "switch"}`; passing our own `input`
                            // object replaces that default entirely, so it
                            // has to be repeated here or the control silently
                            // reverts to an unlabelled `role="checkbox"`.
                            input: {
                                "aria-describedby": settingDescribedBy(name, {
                                    hasError: false,
                                    hasHelp: help !== undefined,
                                }),
                                role: "switch",
                                ref: field.ref,
                            },
                        }}
                    />
                }
                label={label}
            />
        </SettingRow>
    );
}
