import ClearIcon from "@mui/icons-material/Clear";
import ColorizeIcon from "@mui/icons-material/Colorize";
import {Box, IconButton, InputAdornment, TextField} from "@mui/material";
import {useRef} from "react";
import {useController, useFormContext} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "../components";
import {
    settingDescribedBy,
    settingInputTestId,
    settingRules,
    textValue,
    type SettingProps,
} from "../components/settings";

/**
 * Legacy's model format (`formly-config.js:290-322`, `colorInput`): the config
 * holds `rgb(r,g,b)` or `null`, never an alpha channel and never the `#rrggbb`
 * a native colour input speaks. `rgbToHex`/`hexToRgb` convert only for the
 * picker's own seed and write, and only on an explicit pick.
 */
const RGB_PATTERN = /^rgb\((\d{1,3}),(\d{1,3}),(\d{1,3})\)$/;

function clampByte(value: number): number {
    return Math.min(255, Math.max(0, Math.round(value)));
}

function toHexByte(value: number): string {
    return clampByte(value).toString(16).padStart(2, "0");
}

/** A stored `rgb(r,g,b)` string as `#rrggbb`, or `null` for anything else. */
export function rgbToHex(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }
    const match = RGB_PATTERN.exec(value.trim());
    if (match === null) {
        return null;
    }
    const [, r, g, b] = match;
    return `#${toHexByte(Number(r))}${toHexByte(Number(g))}${toHexByte(Number(b))}`;
}

/** A native colour input's `#rrggbb` value as legacy's `rgb(r,g,b)` string. */
export function hexToRgb(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r},${g},${b})`;
}

/**
 * `F-CONFIG-INDEXERS`: the indexer colour field, legacy's free-text input
 * (`color-control.html`) plus its picker and clear affordances. The text field
 * stays the source of truth and freely editable; the picker only ever writes
 * on an explicit pick, and the clear button writes `null` -- never `""` and
 * never the native input's own `#000000` default, which cannot represent "no
 * colour" and must never leak into the model on mount or on clear.
 */
export function ColorSetting({
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
    const pickerRef = useRef<HTMLInputElement>(null);
    const hasError = fieldState.error !== undefined;
    const seedHex = rgbToHex(field.value);

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
                error={hasError}
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
                            hasError,
                            hasHelp: help !== undefined,
                        }),
                        endAdornment: (
                            <InputAdornment position="end">
                                {/*
                                 * The closed control's swatch: reflects the
                                 * committed model value, not the native
                                 * picker's own default, so "no colour" reads
                                 * as empty rather than as legacy's field-tint
                                 * (deliberately not reproduced -- see
                                 * F-CONFIG-INDEXERS gaps).
                                 */}
                                <Box
                                    aria-hidden
                                    sx={{
                                        bgcolor: seedHex ?? "background.paper",
                                        border: 1,
                                        borderColor: "divider",
                                        borderRadius: 1,
                                        height: (t) => t.spacing(2.5),
                                        mr: 0.5,
                                        width: (t) => t.spacing(2.5),
                                    }}
                                />
                                <IconButton
                                    aria-label={`Pick a colour for ${label}`}
                                    data-testid="config-indexer-color-picker"
                                    onClick={() => pickerRef.current?.click()}
                                    size="small"
                                >
                                    <ColorizeIcon fontSize="small" />
                                </IconButton>
                                <IconButton
                                    aria-label={`Clear ${label}`}
                                    data-testid="config-indexer-color-clear"
                                    onClick={() =>
                                        setValue(name, null, {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                        })
                                    }
                                    size="small"
                                >
                                    <ClearIcon fontSize="small" />
                                </IconButton>
                                {/*
                                 * The actual native picker (ADR-0002: stock
                                 * browser control, no picker library),
                                 * triggered by the button above rather than
                                 * shown directly, because an
                                 * `<input type="color">` can only ever hold a
                                 * `#rrggbb` value and would otherwise force a
                                 * fabricated colour onto a `null` model. Kept
                                 * uncontrolled and remounted by `key` so a
                                 * valid stored colour seeds it, but nothing
                                 * ever writes back except this input's own
                                 * `onChange` -- i.e. an explicit pick.
                                 */}
                                <Box
                                    component="input"
                                    key={seedHex ?? "unset"}
                                    onChange={(
                                        event: React.ChangeEvent<HTMLInputElement>,
                                    ) =>
                                        setValue(
                                            name,
                                            hexToRgb(event.target.value),
                                            {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                            },
                                        )
                                    }
                                    ref={pickerRef}
                                    sx={{
                                        border: 0,
                                        clip: "rect(0 0 0 0)",
                                        height: "1px",
                                        margin: "-1px",
                                        overflow: "hidden",
                                        padding: 0,
                                        position: "absolute",
                                        whiteSpace: "nowrap",
                                        width: "1px",
                                    }}
                                    tabIndex={-1}
                                    type="color"
                                    {...(seedHex === null
                                        ? {}
                                        : {defaultValue: seedHex})}
                                />
                            </InputAdornment>
                        ),
                    },
                }}
                value={textValue(field.value)}
            />
        </SettingRow>
    );
}
