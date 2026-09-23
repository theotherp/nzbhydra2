import DeleteIcon from "@mui/icons-material/Delete";
import {
    Box,
    Button,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useState, type ReactNode} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {settingTestId, type ConfigFieldPath} from "./settings";

/**
 * `C-CONFIG-FIELDS`: a repeatable list of entries edited in place inside the
 * whole-config form -- legacy's `repeatSection.html`, not a modal. `add`ing
 * and `remove`ing an entry both mark the form dirty because they call the
 * shared form's own `setValue`; the array itself lives at `name` in
 * `C-CONFIG-FORM`'s single form rather than component state, so switching
 * config tabs (which unmounts this component) never loses an entry that was
 * added but not yet saved.
 *
 * Keying each row by its array index (rather than, say, a `username`, which
 * can be edited and is not unique while a row is blank) is correct for
 * rendering and editing: row *N* always shows and edits whatever is
 * currently at index *N*, and that is what gets saved to index *N*. The index
 * is only a rendering concern, never a record identity: every indexer,
 * downloader and user carries a backend-assigned `id`, and the backend
 * resolves a `***UNCHANGED***` marker only against the stored record with the
 * same `id` (a record without one, e.g. from an API client, falls back to
 * matching by name or username, never by position). A marker it cannot
 * resolve fails the save with "Please enter the value again" instead of
 * borrowing another record's secret. So removing or reordering entries is
 * safe as long as each entry's `id` travels with it, which it does here: an
 * entry is written back whole, and a newly appended one has no `id` until the
 * backend assigns one on save.
 *
 * `addChoices` is the optional second add shape legacy also has: its generic
 * `repeatSection` controller takes a `preset` in `addNew(preset)`
 * (`formly-config.js:610-618`), and `notificationRepeatSection.html` renders
 * that as a dropdown of event types instead of a plain button. With no
 * `addChoices` the button appends `defaultEntry()` directly, exactly as before.
 */
export function RepeatSection<TEntry extends Record<string, unknown>>({
    addChoices,
    addLabel,
    defaultEntry,
    entryLegend,
    name,
    renderEntry,
}: {
    /**
     * When given, the add button opens a menu of these choices and the picked
     * `value` is passed to `defaultEntry`, so a new entry is seeded from the
     * choice rather than from one generic default.
     */
    addChoices?: readonly {label: string; value: string}[];
    /** Label of the button that appends a new entry (legacy's `btnText`). */
    addLabel: string;
    /** The value a newly appended entry starts with (legacy's `defaultModel`). */
    defaultEntry: (choice?: string) => TEntry;
    /** The heading shown above an entry (legacy's `element.name || element.username || altLegendText`). */
    entryLegend: (entry: TEntry) => string;
    name: ConfigFieldPath;
    /** The fields rendered for the entry at `index`, bound to `${name}.${index}.*`. */
    renderEntry: (index: number) => ReactNode;
}) {
    const {setValue} = useFormContext<ConfigValues>();
    const entries =
        (useWatch<ConfigValues>({name}) as TEntry[] | null | undefined) ?? [];
    const testId = settingTestId(name);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(
        null,
    );

    const addEntry = (choice?: string) => {
        setValue(name, [...entries, defaultEntry(choice)] as never, {
            shouldDirty: true,
        });
    };
    const removeEntry = (index: number) => {
        setValue(
            name,
            entries.filter(
                (_entry, entryIndex) => entryIndex !== index,
            ) as never,
            {shouldDirty: true},
        );
    };

    return (
        <Box data-testid={`config-repeat-${testId}`}>
            <Stack divider={<Divider />} spacing={2} sx={{mb: 2}}>
                {entries.map((entry, index) => {
                    const legend = entryLegend(entry);
                    return (
                        // The index is the deliberate React key -- see the
                        // identity note in this component's doc comment.
                        <Box
                            data-testid={`config-repeat-entry-${testId}-${index}`}
                            key={index}
                        >
                            <Typography
                                component="h3"
                                sx={{mb: 1}}
                                variant="subtitle1"
                            >
                                {legend}
                            </Typography>
                            {renderEntry(index)}
                            <Button
                                color="error"
                                data-testid={`config-repeat-remove-${testId}-${index}`}
                                onClick={() => removeEntry(index)}
                                startIcon={<DeleteIcon />}
                                type="button"
                            >
                                Remove {legend}
                            </Button>
                        </Box>
                    );
                })}
            </Stack>
            <Button
                aria-haspopup={addChoices === undefined ? undefined : "menu"}
                data-testid={`config-repeat-add-${testId}`}
                onClick={(event) =>
                    addChoices === undefined
                        ? addEntry()
                        : setAddMenuAnchor(event.currentTarget)
                }
                type="button"
                variant="outlined"
            >
                {addLabel}
            </Button>
            {addChoices === undefined ? null : (
                <Menu
                    anchorEl={addMenuAnchor}
                    onClose={() => setAddMenuAnchor(null)}
                    open={addMenuAnchor !== null}
                >
                    {addChoices.map((choice) => (
                        <MenuItem
                            data-testid={`config-repeat-add-option-${testId}-${choice.value}`}
                            key={choice.value}
                            onClick={() => {
                                setAddMenuAnchor(null);
                                addEntry(choice.value);
                            }}
                        >
                            {choice.label}
                        </MenuItem>
                    ))}
                </Menu>
            )}
        </Box>
    );
}
