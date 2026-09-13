import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {
    Box,
    Button,
    Chip,
    Divider,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import {useFormContext, useWatch} from "react-hook-form";

import type {CustomMappingValues} from "../../../api/config/customMappingTest";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useListEditorTransaction} from "../useListEditorTransaction";
import {CustomMappingDialog} from "./CustomMappingDialog";
import {
    AFFECTED_VALUE_OPTIONS,
    CUSTOM_MAPPINGS_ORDER_HELP,
    CUSTOM_MAPPINGS_PATH,
    CUSTOM_MAPPINGS_TEST_ID,
    customMappingLegend,
    customMappingValues,
    MAPPING_SEARCH_TYPE_OPTIONS,
    newCustomMapping,
    optionLabel,
} from "./customMappingSettings";

/** The chip a switched-off mapping carries. */
const DISABLED_LABEL = "Disabled";

/**
 * `F-CONFIG-SEARCHING`'s custom-mapping list — legacy's `repeatSection` at
 * `config-fields-service.js:1309-1391`, with one deliberate difference: an
 * entry is edited in `CustomMappingDialog`, not inline.
 *
 * That is why this section does not use `C-CONFIG-FIELDS`' `RepeatSection`,
 * whose registry entry describes a list edited "in place (legacy's
 * `repeatSection.html`, not a modal)". Legacy renders both — inline fields
 * *and* a "Help and test" modal that clones the entry and commits it with
 * `Object.assign` on submit — which puts the same five values on screen twice
 * and makes only half of them transactional. FM-063 keeps the transaction and
 * drops the duplicate: the list shows each mapping's values, and every edit
 * goes through the dialog, so Cancel always discards and only Submit writes.
 *
 * Only this component talks to `C-CONFIG-FORM`. Adding, replacing, reordering
 * and removing an entry all go through the shared form's `setValue` with
 * `shouldDirty`, so the array lives in the form (not in component state) and
 * survives switching config tabs; a replaced entry keeps any key this UI has no
 * vocabulary for, because `ConfigWeb.setConfig` writes the whole file back
 * (ADR-0003).
 *
 * FM-195 moved it out of the foot of Searching onto its own tab
 * (`CustomMappingsConfigTab`), which renders it directly rather than behind
 * FM-131's advanced disclosure: that gate existed because the section sat
 * among Searching's fieldsets, and a whole tab hidden while the advanced
 * toggle is off could not be reached at all. The order of the list became
 * meaningful in the same pair of tasks (FM-194 applies mappings top to bottom
 * and stops after the first applied whole-string one), which is what the move
 * buttons are for.
 */
export function CustomMappingsSection({transport}: {transport: ApiTransport}) {
    const {setValue} = useFormContext<ConfigValues>();
    const entries =
        (useWatch<ConfigValues>({name: CUSTOM_MAPPINGS_PATH}) as
            | unknown[]
            | null
            | undefined) ?? [];
    /**
     * The modal transaction (`useListEditorTransaction`): `null` when no
     * dialog is open, and otherwise the index being edited (`null` while a
     * *new* mapping is composed), the transaction's identity and the draft.
     *
     * FM-191 brought this section into the pattern the five other config list
     * editors already used. Before it, the commit had no token at all and
     * therefore no guard against a superseded transaction; that was safe only
     * because `CustomMappingDialog`'s submit is synchronous (its "Help and
     * test" request is a separate action that never calls `onSubmit`), so the
     * gap a token closes -- a resolved commit from a dialog that was already
     * cancelled, deleted, or replaced -- could not be opened from this
     * section's own API. The guard is here now regardless, because "no test
     * button ever grows into the submit path" is not a property this file can
     * enforce on its own.
     */
    const transaction = useListEditorTransaction<CustomMappingValues>();
    const editing = transaction.editing;

    const write = (next: unknown[]) =>
        setValue(CUSTOM_MAPPINGS_PATH, next as never, {shouldDirty: true});

    const commit = (mapping: CustomMappingValues) => {
        if (editing === null) {
            return;
        }
        const index = editing.index;
        transaction.commit({
            token: editing.token,
            index,
            entryCount: entries.length,
            write: () =>
                write(
                    index === null
                        ? [...entries, mapping]
                        : entries.map((entry, entryIndex) =>
                              entryIndex === index
                                  ? {...asRecord(entry), ...mapping}
                                  : entry,
                          ),
                ),
        });
    };

    const remove = (index: number) => {
        // A removal shifts every following index, so no transaction opened
        // before it may still commit by the index it captured.
        transaction.invalidate();
        write(entries.filter((_entry, entryIndex) => entryIndex !== index));
    };

    /**
     * Moves one entry one position, which is a *save* of a different list
     * order and therefore dirties the form exactly as an edit does. It
     * invalidates for the same reason `remove` does: a swap renames two
     * indices at once, so a dialog opened over either of them would commit its
     * draft onto the wrong mapping.
     */
    const move = (index: number, offset: number) => {
        const target = index + offset;
        if (target < 0 || target >= entries.length) {
            return;
        }
        transaction.invalidate();
        const next = [...entries];
        [next[index], next[target]] = [next[target], next[index]];
        write(next);
    };

    const values = entries.map((entry) => customMappingValues(entry));

    return (
        <Box data-testid={`config-repeat-${CUSTOM_MAPPINGS_TEST_ID}`}>
            <Stack divider={<Divider />} spacing={2} sx={{mb: 2}}>
                {entries.map((entry, index) => (
                    // The index is the key on purpose, as in `RepeatSection`:
                    // a mapping has no stable identity of its own, and row N
                    // always shows and edits whatever is currently at index N.
                    <MappingEntry
                        entry={entry}
                        index={index}
                        key={index}
                        onEdit={() =>
                            transaction.open(index, customMappingValues(entry))
                        }
                        onMoveDown={() => move(index, 1)}
                        onMoveUp={() => move(index, -1)}
                        onRemove={() => remove(index)}
                        total={entries.length}
                    />
                ))}
            </Stack>
            <Typography
                component="p"
                sx={{color: "text.secondary", mb: 2}}
                variant="body2"
            >
                {CUSTOM_MAPPINGS_ORDER_HELP}
            </Typography>
            <Button
                data-testid={`config-repeat-add-${CUSTOM_MAPPINGS_TEST_ID}`}
                onClick={() => transaction.open(null, newCustomMapping())}
                type="button"
                variant="outlined"
            >
                Add new custom mapping
            </Button>
            {editing === null ? null : (
                <CustomMappingDialog
                    entries={values}
                    index={editing.index}
                    initialValue={editing.value}
                    onCancel={transaction.close}
                    onSubmit={commit}
                    submitLabel={editing.index === null ? "Add" : "Submit"}
                    transport={transport}
                />
            )}
        </Box>
    );
}

function MappingEntry({
    entry,
    index,
    onEdit,
    onMoveDown,
    onMoveUp,
    onRemove,
    total,
}: {
    entry: unknown;
    index: number;
    onEdit: () => void;
    onMoveDown: () => void;
    onMoveUp: () => void;
    onRemove: () => void;
    total: number;
}) {
    const values = customMappingValues(entry);
    const legend = customMappingLegend(values.name, index);
    const rows: {field: string; label: string; value: string}[] = [
        {
            field: "affectedValue",
            label: "Affected value",
            value: optionLabel(AFFECTED_VALUE_OPTIONS, values.affectedValue),
        },
        // Legacy hides the search type for a result-title mapping; the stored
        // value is kept but has no meaning there, so the summary omits it too.
        ...(values.affectedValue === "RESULT_TITLE"
            ? []
            : [
                  {
                      field: "searchType",
                      label: "Search type",
                      value: optionLabel(
                          MAPPING_SEARCH_TYPE_OPTIONS,
                          values.searchType,
                      ),
                  },
              ]),
        {
            field: "matchAll",
            label: "Match whole string",
            value: values.matchAll ? "Yes" : "No",
        },
        {field: "from", label: "Input pattern", value: values.from ?? ""},
        {field: "to", label: "Output pattern", value: values.to ?? ""},
    ];

    return (
        <Box
            data-testid={`config-repeat-entry-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
        >
            <Stack
                direction="row"
                spacing={1}
                sx={{alignItems: "center", mb: 1}}
            >
                <Typography component="h3" variant="subtitle1">
                    {legend}
                </Typography>
                {values.enabled ? null : (
                    <Chip
                        data-testid={`config-custom-mapping-disabled-${index}`}
                        label={DISABLED_LABEL}
                        size="small"
                    />
                )}
            </Stack>
            <Box component="dl" sx={{m: 0, mb: 1}}>
                {rows.map((row) => (
                    <Stack
                        direction={{xs: "column", sm: "row"}}
                        key={row.field}
                        spacing={{sm: 1}}
                    >
                        <Typography
                            component="dt"
                            sx={{minWidth: 180}}
                            variant="body2"
                        >
                            {row.label}
                        </Typography>
                        <Typography
                            component="dd"
                            data-testid={`config-custom-mapping-value-${index}-${row.field}`}
                            sx={{m: 0}}
                            variant="body2"
                        >
                            {row.value}
                        </Typography>
                    </Stack>
                ))}
            </Box>
            <Stack direction="row" spacing={1} sx={{alignItems: "center"}}>
                {/*
                 * The entry's legend is the admin's own text and can be as
                 * long as they like, so it names the control through
                 * `aria-label` rather than by being typed into it -- the
                 * visible word is still contained in the accessible name
                 * (WCAG 2.5.3), and a phone-width row no longer wraps one
                 * button's label over three lines.
                 */}
                <Button
                    aria-label={`Edit ${legend}`}
                    data-testid={`config-repeat-edit-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    onClick={onEdit}
                    startIcon={<EditIcon />}
                    type="button"
                >
                    Edit
                </Button>
                <Button
                    aria-label={`Remove ${legend}`}
                    color="error"
                    data-testid={`config-repeat-remove-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    onClick={onRemove}
                    startIcon={<DeleteIcon />}
                    type="button"
                >
                    Remove
                </Button>
                <IconButton
                    aria-label={`Move ${legend} up`}
                    data-testid={`config-repeat-up-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    disabled={index === 0}
                    onClick={onMoveUp}
                >
                    <ArrowUpwardIcon />
                </IconButton>
                <IconButton
                    aria-label={`Move ${legend} down`}
                    data-testid={`config-repeat-down-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    disabled={index === total - 1}
                    onClick={onMoveDown}
                >
                    <ArrowDownwardIcon />
                </IconButton>
            </Stack>
        </Box>
    );
}

function asRecord(entry: unknown): Record<string, unknown> {
    return typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
}
