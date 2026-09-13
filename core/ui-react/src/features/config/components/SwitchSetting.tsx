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
                // A `Switch` is a 38px box around a 20px thumb: 9px of
                // transparent padding above and below the visible control.
                // In a column of text fields, whose box edge *is* their
                // border, that padding read as an extra gap around every
                // switch row (owner report 2026-09-13). Pulling the box
                // back in by that much puts the switch's visible edges where
                // a field's border sits, so `SettingRow`'s one margin spaces
                // both kinds of row alike. The hover halo still paints; it
                // overflows the box as it does everywhere else.
                sx={{my: "-9px"}}
            />
        </SettingRow>
    );
}
