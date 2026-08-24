import {TextField} from "@mui/material";
import type {RefObject} from "react";
import type {UseFormRegisterReturn} from "react-hook-form";

export const seasonEpisodeFieldWidth = 90;

export function SeasonEpisodeInput({
    fieldRef,
    label,
    registration,
}: {
    fieldRef?: RefObject<HTMLInputElement | null>;
    label: string;
    registration: UseFormRegisterReturn;
}) {
    const {ref, ...rest} = registration;
    return (
        <TextField
            label={label}
            slotProps={{htmlInput: {inputMode: "numeric"}}}
            sx={{width: seasonEpisodeFieldWidth}}
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
