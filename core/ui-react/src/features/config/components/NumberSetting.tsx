import {InputAdornment, TextField} from "@mui/material";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    maximumValidator,
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
    maximum,
    minimum,
    name,
    placeholder,
    required,
    step,
    tooltip,
    unit,
    validate,
}: SettingProps & {
    /** Legacy's `max` template option. */
    maximum?: number;
    minimum?: number;
    placeholder?: string;
    /**
     * The input's `step`, for a setting legacy declares as a decimal
     * (`formly-config.js` `percentInput`: `step="0.01"`). Left unset the
     * control keeps the HTML default of whole numbers.
     */
    step?: number;
    /** The unit shown after the input (legacy's `addonRight.text`). */
    unit?: string;
}) {
    const {field, fieldState} = useController<ConfigValues>({
        name,
        rules: settingRules({
            required,
            validate: combine(validate, minimum, maximum),
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
                        ...(maximum === undefined ? {} : {max: maximum}),
                        ...(minimum === undefined ? {} : {min: minimum}),
                        ...(step === undefined ? {} : {step}),
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
    maximum: number | undefined,
): SettingValidator | undefined {
    const validators = [
        minimum === undefined ? undefined : minimumValidator(minimum),
        maximum === undefined ? undefined : maximumValidator(maximum),
        validate,
    ].filter(
        (candidate): candidate is SettingValidator => candidate !== undefined,
    );
    if (validators.length === 0) {
        return undefined;
    }
    return (value) => {
        for (const candidate of validators) {
            const result = candidate(value);
            if (result !== true) {
                return result;
            }
        }
        return true;
    };
}
