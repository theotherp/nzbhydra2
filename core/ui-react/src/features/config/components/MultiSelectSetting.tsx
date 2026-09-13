import {
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    Select,
} from "@mui/material";
import {useId} from "react";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import type {SettingOption} from "./SelectSetting";
import {SettingRow} from "./SettingRow";
import {
    listValue,
    settingDescribedBy,
    settingInputTestId,
    type SettingProps,
} from "./settings";

/**
 * `C-CONFIG-FIELDS`: a multiple-choice setting (legacy's
 * `horizontalMultiselect`, whose closed state reads "None" while nothing is
 * selected). A stock `Select multiple` paired with its own `InputLabel`, which
 * ADR-0014 names as the alternative to `TextField select` where the control
 * needs a `renderValue` of its own.
 *
 * `emptyLabel` is legacy's `settings.noSelectedText`, which is not always
 * "None": selecting no category means *every* category, so the indexer box
 * reads "None/All" and "All" there (`formly-indexers.js:459-462`, `:556-560`).
 */
export function MultiSelectSetting({
    advanced,
    emptyLabel = "None",
    help,
    label,
    name,
    options,
    tooltip,
}: Omit<SettingProps, "required" | "validate"> & {
    emptyLabel?: string;
    options: readonly SettingOption[];
}) {
    const {field} = useController<ConfigValues>({name});
    const labelId = useId();
    const selected = listValue(field.value);
    return (
        <SettingRow
            advanced={advanced}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <FormControl fullWidth size="small">
                {/*
                 * `shrink` because the control below sets `displayEmpty`: it
                 * has to render legacy's "None" while nothing is selected, and
                 * MUI skips `renderValue` for an empty value unless told
                 * otherwise (`SelectInput.js`, `isFilled`).
                 */}
                <InputLabel id={labelId} shrink>
                    {label}
                </InputLabel>
                <Select<string[]>
                    aria-describedby={settingDescribedBy(name, {
                        hasError: false,
                        hasHelp: help !== undefined,
                    })}
                    data-testid={settingInputTestId(name)}
                    displayEmpty
                    inputRef={field.ref}
                    label={label}
                    labelId={labelId}
                    multiple
                    name={field.name}
                    onBlur={field.onBlur}
                    onChange={(event) => field.onChange(event.target.value)}
                    renderValue={(values) =>
                        values.length === 0
                            ? emptyLabel
                            : values
                                  .map(
                                      (value) =>
                                          options.find(
                                              (option) =>
                                                  option.value === value,
                                          )?.label ?? value,
                                  )
                                  .join(", ")
                    }
                    value={selected}
                >
                    {options.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                            <Checkbox
                                checked={selected.includes(option.value)}
                            />
                            <ListItemText primary={option.label} />
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </SettingRow>
    );
}
