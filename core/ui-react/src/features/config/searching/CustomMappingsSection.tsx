import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import {Box, Button, Divider, Stack, Typography} from "@mui/material";
import {useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {CustomMappingValues} from "../../../api/config/customMappingTest";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {CustomMappingDialog} from "./CustomMappingDialog";
import {
    AFFECTED_VALUE_OPTIONS,
    CUSTOM_MAPPINGS_PATH,
    CUSTOM_MAPPINGS_TEST_ID,
    customMappingValues,
    MAPPING_SEARCH_TYPE_OPTIONS,
    newCustomMapping,
    optionLabel,
} from "./searchingSettings";

/**
 * `config-fields-service.js:1317`. FM-131 hands this to the wrapping
 * `ConfigFieldset` as its `label`, rather than rendering it here itself --
 * see that component's doc comment for why.
 */
export const CUSTOM_MAPPINGS_HEADLINE =
    "Custom mappings of queries, search titles and result titles";

/**
 * `config-fields-service.js:1314`. FM-131 hands this to the wrapping
 * `ConfigFieldset` as its `tooltip`, for the same reason as the headline.
 */
export const CUSTOM_MAPPINGS_TOOLTIP =
    "Here you can define mappings to modify either queries or titles for search requests or to dynamically change the titles of found results. The former allows you, for example,  to change requests made by external tools, the latter to clean up results by indexers in a more advanced way.";

/** `config-fields-service.js:1316`, the legend of an entry with no name. */
const ENTRY_LEGEND = "Mapping";

type Editing = {
    /** `null` while a *new* mapping is being composed. */
    index: number | null;
    value: CustomMappingValues;
};

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
 * Only this component talks to `C-CONFIG-FORM`. Adding, replacing, and
 * removing an entry all go through the shared form's `setValue` with
 * `shouldDirty`, so the array lives in the form (not in component state) and
 * survives switching config tabs; a replaced entry keeps any key this UI has no
 * vocabulary for, because `ConfigWeb.setConfig` writes the whole file back
 * (ADR-0003).
 *
 * FM-131: the whole section is advanced (legacy's
 * `templateOptions.advanced` on the group), so it no longer self-gates on
 * `useShowAdvanced` and no longer renders its own headline. Its caller,
 * `SearchingConfigTab`, wraps it in a `ConfigFieldset advanced` instead,
 * which owns both the toggle-off hidden-affordance/reveal behaviour
 * (`C-CONFIG-FIELDS`) and the headline itself (as that fieldset's `label`
 * and `tooltip`, `CUSTOM_MAPPINGS_HEADLINE`/`CUSTOM_MAPPINGS_TOOLTIP` above)
 * -- rendering it here too would double the heading.
 */
export function CustomMappingsSection({transport}: {transport: ApiTransport}) {
    const {setValue} = useFormContext<ConfigValues>();
    const entries =
        (useWatch<ConfigValues>({name: CUSTOM_MAPPINGS_PATH}) as
            | unknown[]
            | null
            | undefined) ?? [];
    const [editing, setEditing] = useState<Editing | null>(null);

    const write = (next: unknown[]) =>
        setValue(CUSTOM_MAPPINGS_PATH, next as never, {shouldDirty: true});

    const commit = (mapping: CustomMappingValues) => {
        if (editing === null) {
            return;
        }
        const index = editing.index;
        write(
            index === null
                ? [...entries, mapping]
                : entries.map((entry, entryIndex) =>
                      entryIndex === index
                          ? {...asRecord(entry), ...mapping}
                          : entry,
                  ),
        );
        setEditing(null);
    };

    const remove = (index: number) =>
        write(entries.filter((_entry, entryIndex) => entryIndex !== index));

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
                            setEditing({
                                index,
                                value: customMappingValues(entry),
                            })
                        }
                        onRemove={() => remove(index)}
                    />
                ))}
            </Stack>
            <Button
                data-testid={`config-repeat-add-${CUSTOM_MAPPINGS_TEST_ID}`}
                onClick={() =>
                    setEditing({index: null, value: newCustomMapping()})
                }
                type="button"
                variant="outlined"
            >
                Add new custom mapping
            </Button>
            {editing === null ? null : (
                <CustomMappingDialog
                    initialValue={editing.value}
                    onCancel={() => setEditing(null)}
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
    onRemove,
}: {
    entry: unknown;
    index: number;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const values = customMappingValues(entry);
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
            <Typography component="h3" sx={{mb: 1}} variant="subtitle1">
                {ENTRY_LEGEND}
            </Typography>
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
            <Stack direction="row" spacing={1}>
                <Button
                    data-testid={`config-repeat-edit-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    onClick={onEdit}
                    startIcon={<EditIcon />}
                    type="button"
                >
                    Edit {ENTRY_LEGEND}
                </Button>
                <Button
                    color="error"
                    data-testid={`config-repeat-remove-${CUSTOM_MAPPINGS_TEST_ID}-${index}`}
                    onClick={onRemove}
                    startIcon={<DeleteIcon />}
                    type="button"
                >
                    Remove {ENTRY_LEGEND}
                </Button>
            </Stack>
        </Box>
    );
}

function asRecord(entry: unknown): Record<string, unknown> {
    return typeof entry === "object" && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
}
