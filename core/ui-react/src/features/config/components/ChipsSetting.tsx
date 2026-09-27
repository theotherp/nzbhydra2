import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import {Autocomplete, Chip, TextField} from "@mui/material";
import {useRef, useState} from "react";
import {useController} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {SettingRow} from "./SettingRow";
import {
    listValue,
    settingDescribedBy,
    settingInputTestId,
    type SettingProps,
    type SettingValidator,
} from "./settings";

const NO_SUGGESTIONS: readonly string[] = [];

/**
 * `C-CONFIG-FIELDS`: a free-form list setting (legacy's `horizontalChips`,
 * whose help text tells the admin to "apply values with the enter key").
 * A stock `Autocomplete multiple freeSolo` with no options: it renders the
 * entries as MUI `Chip`s inside a normal `TextField` and commits a typed entry
 * on Enter, which is exactly the legacy affordance without a bespoke control.
 *
 * `suggestions` is legacy's `templateOptions.typeaheadSource`, the only chips
 * field that offers completions (`formly-indexers.js:524`, the indexer group
 * names drawn from the other indexers). Values the field already holds are
 * dropped from the list, as legacy's source does.
 *
 * `validateChip` (FM-107) is the fourth optional property of this vocabulary's
 * additive kind, after FM-066's three: a *per-chip gate at entry time*, not the
 * whole-value `validate` this control still omits. It never reaches
 * `settingRules`, so it does not decide whether the form may be saved -- it
 * decides whether a typed entry becomes a chip at all, and paints a stored
 * entry that would not be accepted today as flagged rather than dropping it.
 * The distinction matters: the five other consumers pass no validator, and
 * wiring this into `settingRules` instead would change when *they* block a
 * save. With the property absent every branch below is inert and the rendered
 * output is what it was before FM-107 -- no refusal text and `hasError: false`
 * exactly as it was hardcoded.
 *
 * A chip is edited in place: clicking it, or pressing Enter while it has
 * focus, loads its text into the input. Enter writes the edited text back at
 * the chip's position (an emptied edit removes the chip), Escape or leaving
 * the field cancels. An edit is gated by `validateChip` like a new entry, and
 * may not duplicate another chip.
 */
export function ChipsSetting({
    advanced,
    help,
    label,
    name,
    placeholder,
    suggestions = NO_SUGGESTIONS,
    tooltip,
    validateChip,
}: Omit<SettingProps, "required" | "validate"> & {
    placeholder?: string;
    suggestions?: readonly string[];
    /**
     * Gate for one entry as it is typed. `true` admits it; a string refuses it
     * and is the message shown below the control. Absent (the default): every
     * entry is admitted, as it always was.
     */
    validateChip?: SettingValidator;
}) {
    const {field} = useController<ConfigValues>({name});
    const selected = listValue(field.value);
    /**
     * The refusal message for the entry the admin just tried to add. Local UI
     * state, not form state: nothing was written, so there is nothing for
     * `C-CONFIG-FORM` to hold. Cleared by the next accepted change.
     */
    const [refused, setRefused] = useState<string | undefined>(undefined);
    const [inputValue, setInputValue] = useState("");
    /** The position of the chip being edited, `undefined` while none is. */
    const [editing, setEditing] = useState<number | undefined>(undefined);
    const inputRef = useRef<HTMLInputElement | null>(null);

    /** Never `true`/`false` -- the message, or `undefined` when the entry is fine. */
    const chipRefusal = (entry: string): string | undefined => {
        if (validateChip === undefined) {
            return undefined;
        }
        const verdict = validateChip(entry);
        return verdict === true ? undefined : verdict;
    };

    const commit = (next: readonly unknown[]) => {
        const entries = next.map((entry) => String(entry));
        // Only *newly added* entries are gated. An entry already in the value
        // is one the server sent (or an earlier session saved): it is flagged
        // in place by `renderValue` below, never quietly filtered out here,
        // because dropping it would turn a display-level narrowing into data
        // loss on the next save.
        const refusals = entries
            .filter((entry) => !selected.includes(entry))
            .map((entry) => chipRefusal(entry))
            .filter((message): message is string => message !== undefined);
        setRefused(refusals[0]);
        field.onChange(
            refusals.length === 0
                ? entries
                : entries.filter(
                      (entry) =>
                          selected.includes(entry) ||
                          chipRefusal(entry) === undefined,
                  ),
        );
    };

    const startEditing = (index: number) => {
        setEditing(index);
        setInputValue(selected[index]);
        setRefused(undefined);
        inputRef.current?.focus();
    };

    const stopEditing = () => {
        setEditing(undefined);
        setInputValue("");
        setRefused(undefined);
    };

    const commitEdit = (index: number) => {
        const entry = inputValue.trim();
        if (entry === "") {
            field.onChange(selected.filter((_, other) => other !== index));
            stopEditing();
            return;
        }
        if (entry !== selected[index]) {
            const refusal = selected.some(
                (other, otherIndex) => otherIndex !== index && other === entry,
            )
                ? `"${entry}" is already in the list`
                : chipRefusal(entry);
            if (refusal !== undefined) {
                setRefused(refusal);
                return;
            }
            field.onChange(
                selected.map((other, otherIndex) =>
                    otherIndex === index ? entry : other,
                ),
            );
        }
        stopEditing();
    };

    return (
        <SettingRow
            advanced={advanced}
            error={refused}
            help={help}
            label={label}
            name={name}
            tooltip={tooltip}
        >
            <Autocomplete
                freeSolo
                inputValue={inputValue}
                multiple
                onBlur={() => {
                    if (editing !== undefined) {
                        stopEditing();
                    }
                    field.onBlur();
                }}
                onChange={(_event, value) => commit(value)}
                onInputChange={(_event, value) => setInputValue(value)}
                onKeyDown={(event) => {
                    if (editing === undefined) {
                        return;
                    }
                    if (event.key === "Enter") {
                        event.preventDefault();
                        (
                            event as typeof event & {
                                defaultMuiPrevented: boolean;
                            }
                        ).defaultMuiPrevented = true;
                        commitEdit(editing);
                    } else if (event.key === "Escape") {
                        (
                            event as typeof event & {
                                defaultMuiPrevented: boolean;
                            }
                        ).defaultMuiPrevented = true;
                        stopEditing();
                    }
                }}
                options={suggestions.filter(
                    (suggestion) => !selected.includes(suggestion),
                )}
                renderValue={(value, getTagProps) =>
                    value.map((option, index) => {
                        const {key, ...tagProps} = getTagProps({index});
                        const message = chipRefusal(option);
                        return (
                            <Chip
                                {...tagProps}
                                // The flag is carried by the icon and by the
                                // accessible name, never by the colour alone
                                // (ADR-0029); `title` gives a pointer user the
                                // same sentence the refusal line shows.
                                aria-label={
                                    message === undefined
                                        ? undefined
                                        : `${option} — ${message}`
                                }
                                color={
                                    message === undefined ? "default" : "error"
                                }
                                data-testid={`${settingInputTestId(name)}-chip-${option}`}
                                icon={
                                    message === undefined ? undefined : (
                                        <ErrorOutlineOutlinedIcon />
                                    )
                                }
                                key={key}
                                label={option}
                                onClick={() => startEditing(index)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        startEditing(index);
                                    }
                                }}
                                title={message ?? "Click to edit"}
                                variant={
                                    index === editing ? "outlined" : "filled"
                                }
                            />
                        );
                    })
                }
                renderInput={(params) => (
                    <TextField
                        {...params}
                        inputRef={(element: HTMLInputElement | null) => {
                            inputRef.current = element;
                            field.ref(element);
                        }}
                        label={label}
                        name={field.name}
                        placeholder={placeholder}
                        slotProps={{
                            ...params.slotProps,
                            htmlInput: {
                                ...params.slotProps.htmlInput,
                                "data-testid": settingInputTestId(name),
                            },
                            input: {
                                ...params.slotProps.input,
                                "aria-describedby": settingDescribedBy(name, {
                                    // Resolves to `false` for every consumer
                                    // that passes no validator unless an edit
                                    // duplicates another chip: only a refusal
                                    // renders the error node this id points at.
                                    hasError: refused !== undefined,
                                    hasHelp: help !== undefined,
                                }),
                            },
                        }}
                    />
                )}
                value={selected}
            />
        </SettingRow>
    );
}
