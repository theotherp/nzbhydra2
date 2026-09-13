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
 * currently at index *N*, and that is what gets saved to index *N*. This is
 * not, however, a safe *identity* for secret-marker resolution once an entry
 * has been removed. Legacy/the backend resolves a `***UNCHANGED***` marker
 * positionally before any field-level match
 * (`SensitiveDataConfigValidator.findCorrespondingOldItem` falls back to
 * `oldList.get(index)` for an element type with no `name` field, before any
 * name-aware validator such as `UserAuthConfigValidator` runs). `UserAuthConfig`
 * has no `name` field, so removing a user shifts every following row's index
 * and the positional fallback resolves its untouched password marker against
 * a *different* stored user's hash -- a credential swap, not a safety
 * property of index keying. (`IndexerConfig`, a future consumer of this
 * component per FM-066, does have a `name` field and is protected by the
 * name-match branch instead.) This is a pre-existing backend defect, not
 * something this component can fix: it only ever holds the marker, never a
 * plaintext or hash, so there is no correct value it could send instead for
 * a shifted row.
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
