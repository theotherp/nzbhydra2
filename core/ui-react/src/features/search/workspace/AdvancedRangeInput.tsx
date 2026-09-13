import {InputAdornment, TextField} from "@mui/material";
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
    unit,
}: {
    fieldRef?: RefObject<HTMLInputElement | null>;
    invalid: boolean;
    label: string;
    registration: UseFormRegisterReturn;
    unit: string;
}) {
    const {ref, ...rest} = registration;
    return (
        <TextField
            error={invalid}
            label={label}
            slotProps={{
                input: {
                    endAdornment: (
                        <InputAdornment position="end">{unit}</InputAdornment>
                    ),
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
