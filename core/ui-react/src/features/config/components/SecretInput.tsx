import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {IconButton, InputAdornment, TextField} from "@mui/material";
import {useEffect, useRef, useState} from "react";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
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
 * The marker the *server* substitutes for a value it will not disclose
 * (`SensitiveDataConfigValidator.UNCHANGED_MARKER`). Sending it back means "do
 * not change this value"; the backend then restores the stored one
 * (`prepareForSaving`).
 */
export const UNCHANGED_SECRET_MARKER = "***UNCHANGED***";

/**
 * `C-SECRET-INPUT`: masked editing of a secret configuration value.
 *
 * The one invariant: **the marker originates from the server and is never
 * synthesized here.** Which values arrive masked is the backend's decision, not
 * this control's — `@HiddenInUI` covers `MainConfig.proxyUsername`/
 * `proxyPassword`, `IndexerConfig.apiKey`/`username`/`password` and
 * `DownloaderConfig.apiKey`/`username`/`password`, and
 * `UserAuthConfigValidator.updateAfterLoading` masks hashed user passwords.
 * Other password-typed fields (`sslKeyStorePassword`, `oidcClientSecret`)
 * arrive in clear and must round-trip in clear, so this control treats its
 * value as opaque: it keeps whatever it was handed, byte for byte, until the
 * admin types, and then sends exactly what was typed.
 *
 * Two consequences of that rule:
 *
 * - a masked value is *shown* as an empty field with an "unchanged" placeholder
 *   rather than as the literal marker text, so the admin never edits the marker
 *   into a real password by accident (legacy's `passwordSwitch` does the same
 *   with `isUnchangedPassword`);
 * - clearing a field that arrived masked restores the marker rather than
 *   sending an empty string, because an empty string is a real value that would
 *   destroy the stored secret. This is legacy's behaviour
 *   (`formly-config.js#onPasswordChange`/`onPasswordBlur`), and it can only ever
 *   restore a marker this control was actually given.
 */
export function SecretInput({
    advanced,
    help,
    label,
    name,
    required,
    tooltip,
    validate,
}: SettingProps) {
    const {field, fieldState} = useController<ConfigValues>({
        name,
        rules: settingRules({required, validate}),
    });
    const [revealed, setRevealed] = useState(false);
    const masked = field.value === UNCHANGED_SECRET_MARKER;
    // Whether the value this control was handed was the server's marker. A ref
    // rather than state: it is not rendered, and it must survive the admin
    // typing over the field and clearing it again. It is (re)armed whenever the
    // form holds the marker, which includes a `form.reset` from the server's
    // `newConfig` after a save.
    const arrivedMasked = useRef(masked);
    useEffect(() => {
        if (masked) {
            arrivedMasked.current = true;
        }
    }, [masked]);

    const change = (typed: string) => {
        field.onChange(
            typed === "" && arrivedMasked.current
                ? UNCHANGED_SECRET_MARKER
                : typed,
        );
    };

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
                onChange={(event) => change(event.target.value)}
                placeholder={masked ? "Value unchanged" : undefined}
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
                                    aria-label={
                                        revealed
                                            ? `Hide ${label}`
                                            : `Show ${label}`
                                    }
                                    data-testid={`config-secret-reveal-${settingTestId(name)}`}
                                    onClick={() =>
                                        setRevealed((shown) => !shown)
                                    }
                                    size="small"
                                >
                                    {revealed ? (
                                        <VisibilityOffIcon fontSize="small" />
                                    ) : (
                                        <VisibilityIcon fontSize="small" />
                                    )}
                                </IconButton>
                            </InputAdornment>
                        ),
                    },
                }}
                type={revealed ? "text" : "password"}
                value={masked ? "" : textValue(field.value)}
            />
        </SettingRow>
    );
}
