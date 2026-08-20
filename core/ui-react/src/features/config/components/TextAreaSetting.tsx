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
 * `C-CONFIG-FIELDS`: a multi-line text setting (legacy's `horizontalTextArea`,
 * `formly-config.js:66-70`). Identical to `TextSetting` except that the value
 * may contain newlines and the control shows several rows -- which matters for
 * the one legacy field that uses it, `F-CONFIG-NOTIFICATIONS`' body template,
 * whose seeded value for `INDEXER_DISABLED` already contains a line break.
 */
export function TextAreaSetting({
    advanced,
    help,
    label,
    minRows = 3,
    name,
    placeholder,
    required,
    tooltip,
    validate,
}: SettingProps & {minRows?: number; placeholder?: string}) {
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
                minRows={minRows}
                multiline
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
