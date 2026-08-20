import {TextField} from "@mui/material";
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

/**
 * `C-CONFIG-FIELDS`: a single-line text setting (legacy's `horizontalInput`
 * with `type: 'text'`). The control holds no copy of the value — it renders
 * whatever the form holds and reports every keystroke straight back to it.
 */
export function TextSetting({
    advanced,
    help,
    label,
    name,
    placeholder,
    required,
    tooltip,
    validate,
}: SettingProps & {placeholder?: string}) {
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
                error={fieldState.error !== undefined}
                fullWidth
                inputRef={field.ref}
                label={label}
                name={field.name}
                onBlur={field.onBlur}
                onChange={field.onChange}
                placeholder={placeholder}
                required={required}
                slotProps={{
                    htmlInput: {"data-testid": settingInputTestId(name)},
                    input: {
                        "aria-describedby": settingDescribedBy(name, {
                            hasError: fieldState.error !== undefined,
                            hasHelp: help !== undefined,
                        }),
                    },
                }}
                value={textValue(field.value)}
            />
        </SettingRow>
    );
}
