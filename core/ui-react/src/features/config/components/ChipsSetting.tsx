import {Autocomplete, TextField} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    listValue,
    settingDescribedBy,
    settingInputTestId,
    type SettingProps,
} from "./settings";

const NO_SUGGESTIONS: readonly string[] = [];

/**
 * `C-CONFIG-FIELDS`: a free-form list setting (legacy's `horizontalChips`,
 * whose help text tells the admin to "apply values with the enter key").
 * A stock `Autocomplete multiple freeSolo` with no options: it renders the
 * entries as MUI `Chip`s inside a normal `TextField` and commits a typed entry
 * on Enter, which is exactly the legacy affordance without a bespoke control.
 */
export function ChipsSetting({
    advanced,
    help,
    label,
    name,
    placeholder,
    tooltip,
}: Omit<SettingProps, "required" | "validate"> & {placeholder?: string}) {
    const {field} = useController<ConfigValues>({name});
    return (
        <SettingRow
            advanced={advanced}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <Autocomplete
                freeSolo
                multiple
                onBlur={field.onBlur}
                onChange={(_event, value) => field.onChange(value)}
                options={NO_SUGGESTIONS}
                renderInput={(params) => (
                    <TextField
                        {...params}
                        inputRef={field.ref}
                        label={label}
                        name={field.name}
                        placeholder={placeholder}
                        slotProps={{
                            htmlInput: {
                                ...params.inputProps,
                                "data-testid": settingInputTestId(name),
                            },
                            input: {
                                ...params.InputProps,
                                "aria-describedby": settingDescribedBy(name, {
                                    hasError: false,
                                    hasHelp: help !== undefined,
                                }),
                            },
                        }}
                    />
                )}
                value={listValue(field.value)}
            />
        </SettingRow>
    );
}
