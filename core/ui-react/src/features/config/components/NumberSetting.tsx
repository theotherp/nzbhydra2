import {InputAdornment, TextField} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    minimumValidator,
    settingDescribedBy,
    settingInputTestId,
    settingRules,
    textValue,
    type SettingProps,
    type SettingValidator,
} from "./settings";

/**
 * `C-CONFIG-FIELDS`: a numeric setting (legacy's `horizontalInput` with
 * `type: 'number'` and its optional `addonRight` unit). The value is written
 * back as a number so the config keeps the JSON type the backend's `int` and
 * `Integer` fields round-trip with; an emptied field becomes `null`, which is
 * what an unset `Integer` is (`MainConfig.keepHistoryForWeeks`).
 */
export function NumberSetting({
    advanced,
    help,
    label,
    minimum,
    name,
    placeholder,
    required,
    tooltip,
    unit,
    validate,
}: SettingProps & {
    minimum?: number;
    placeholder?: string;
    /** The unit shown after the input (legacy's `addonRight.text`). */
    unit?: string;
}) {
    const {field, fieldState} = useController<ConfigValues>({
        name,
        rules: settingRules({
            required,
            validate: combine(validate, minimum),
        }),
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
                onChange={(event) =>
                    field.onChange(numberValue(event.target.value))
                }
                placeholder={placeholder}
                required={required}
                slotProps={{
                    htmlInput: {
                        "data-testid": settingInputTestId(name),
                        ...(minimum === undefined ? {} : {min: minimum}),
                    },
                    input: {
                        "aria-describedby": settingDescribedBy(name, {
                            hasError: fieldState.error !== undefined,
                            hasHelp: help !== undefined,
                        }),
                        ...(unit === undefined
                            ? {}
                            : {
                                  endAdornment: (
                                      <InputAdornment position="end">
                                          {unit}
                                      </InputAdornment>
                                  ),
                              }),
                    },
                }}
                type="number"
                value={textValue(field.value)}
            />
        </SettingRow>
    );
}

function numberValue(raw: string): number | null {
    if (raw.trim() === "") {
        return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
}

function combine(
    validate: SettingValidator | undefined,
    minimum: number | undefined,
): SettingValidator | undefined {
    if (minimum === undefined) {
        return validate;
    }
    const atLeast = minimumValidator(minimum);
    if (validate === undefined) {
        return atLeast;
    }
    return (value) => {
        const first = atLeast(value);
        return first === true ? validate(value) : first;
    };
}
