import AutorenewIcon from "@mui/icons-material/Autorenew";
import {IconButton, InputAdornment, TextField} from "@mui/material";
import {useController, useFormContext} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {generateApiKey} from "./apiKey";
import {SettingRow} from "./SettingRow";
import {
    settingDescribedBy,
    settingInputTestId,
    settingRules,
    settingTestId,
    textValue,
    type SettingProps,
} from "./settings";

/**
 * `C-CONFIG-FIELDS`: an editable API key with a generator (legacy's
 * `apiKeyInput`, which produces 24 alphanumeric characters and marks the form
 * dirty so the generated key is actually saved).
 */
export function ApiKeySetting({
    advanced,
    help,
    label,
    name,
    required,
    tooltip,
    validate,
}: SettingProps) {
    const {setValue} = useFormContext<ConfigValues>();
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
                required={required}
                slotProps={{
                    htmlInput: {"data-testid": settingInputTestId(name)},
                    input: {
                        "aria-describedby": settingDescribedBy(name, {
                            hasError: fieldState.error !== undefined,
                            hasHelp: help !== undefined,
                        }),
                        endAdornment: (
                            <InputAdornment position="end">
                                <IconButton
                                    aria-label={`Generate ${label}`}
                                    data-testid={`config-apikey-generate-${settingTestId(name)}`}
                                    onClick={() =>
                                        setValue(name, generateApiKey(), {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        })
                                    }
                                    size="small"
                                >
                                    <AutorenewIcon fontSize="small" />
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                value={textValue(field.value)}
            />
        </SettingRow>
    );
}
