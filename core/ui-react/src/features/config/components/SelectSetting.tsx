import {MenuItem, TextField} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    settingDescribedBy,
    settingInputTestId,
    settingRules,
    textValue,
    type SettingProps,
} from "./settings";

export type SettingOption = {
    label: string;
    value: string;
};

/**
 * `C-CONFIG-FIELDS`: a single-choice setting (legacy's `horizontalSelect`).
 * A `TextField select` per ADR-0014, so the label, border, and focus state are
 * MUI's own.
 */
export function SelectSetting({
    advanced,
    help,
    label,
    name,
    options,
    required,
    tooltip,
    validate,
}: SettingProps & {options: readonly SettingOption[]}) {
    const {field, fieldState} = useController<ConfigValues>({
        name,
        rules: settingRules({required, validate}),
    });
    return (
        <SettingRow
            advanced={advanced}
            error={fieldState.error?.message}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <TextField
                data-testid={settingInputTestId(name)}
                error={fieldState.error !== undefined}
                fullWidth
                inputRef={field.ref}
                label={label}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                required={required}
                select
                slotProps={{
                    select: {
                        "aria-describedby": settingDescribedBy(name, {
                            hasError: fieldState.error !== undefined,
                            hasHelp: help !== undefined,
                        }),
                    },
                }}
                value={textValue(field.value)}
            >
                {options.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                        {option.label}
                    </MenuItem>
                ))}
            </TextField>
        </SettingRow>
    );
}
