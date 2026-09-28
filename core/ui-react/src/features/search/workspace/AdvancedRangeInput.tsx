import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import {IconButton, InputAdornment, TextField, Tooltip} from "@mui/material";
import type {RefObject} from "react";
import type {UseFormRegisterReturn} from "react-hook-form";

export const rangeFieldWidth = 132;

// In the Advanced panel each range field has room for a real floating label
// plus its unit, so the previous 100px aria-label-only compact fields (an
// ADR-0014 exception for genuinely label-free controls) retire.
export function AdvancedRangeInput({
    fieldRef,
    invalid,
    label,
    registration,
    tooltip,
    unit,
}: {
    fieldRef?: RefObject<HTMLInputElement | null>;
    invalid: boolean;
    label: string;
    registration: UseFormRegisterReturn;
    // Same affordance as `SettingRow`'s config tooltip: a focusable "About
    // <label>" icon button, not a bare title attribute, so it is reachable
    // by keyboard and announced to assistive tech.
    tooltip?: string;
    unit: string;
}) {
    const {ref, ...rest} = registration;
    // The unit stays a plain string in its own adornment so MUI styles it
    // like the unit of every other range field.
    const endAdornment = (
        <>
            <InputAdornment position="end">{unit}</InputAdornment>
            {tooltip !== undefined && (
                <InputAdornment position="end">
                    <Tooltip title={tooltip}>
                        <IconButton
                            aria-label={`About ${label}`}
                            edge="end"
                            size="small"
                        >
                            <HelpOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </InputAdornment>
            )}
        </>
    );
    return (
        <TextField
            error={invalid}
            label={label}
            slotProps={{
                input: {
                    endAdornment,
                },
                htmlInput: {inputMode: "numeric"},
            }}
            sx={{width: rangeFieldWidth}}
            inputRef={(element: HTMLInputElement | null) => {
                ref(element);
                if (fieldRef) {
                    fieldRef.current = element;
                }
            }}
            {...rest}
        />
    );
}
