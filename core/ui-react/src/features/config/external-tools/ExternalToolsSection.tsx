import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import SyncIcon from "@mui/icons-material/Sync";
import {
    Box,
    Button,
    CircularProgress,
    Divider,
    Menu,
    MenuItem,
    Stack,
    Typography,
} from "@mui/material";
import {useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import {
    errorMessage,
    syncAllExternalTools,
} from "../../../api/config/externalTools";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useToasts} from "../../../components/toasts/toasts";
import {ExternalToolDialog} from "./ExternalToolDialog";
import {
    asExternalTool,
    EXTERNAL_TOOLS_PATH,
    EXTERNAL_TOOLS_TEST_ID,
    EXTERNAL_TOOL_PRESETS,
    externalToolLegend,
    externalToolText,
    externalToolsOf,
    newExternalToolDraft,
    sortedExternalTools,
    syncResultMessage,
    type ExternalToolValues,
} from "./externalToolsSettings";

/** `formly-external-tools.js:87-104`' opening growl. */
export const SYNC_STARTED = "Starting sync to all external tools...";

export const EMPTY_STATE_HEADING = "No external tools configured";

const ADD_MENU_ID = "config-external-tools-add-menu";

type Editing = {
    /** `null` while a *new* tool is being composed. */
    index: number | null;
    /**
     * The transaction's identity, compared against `transactionRef` before a
     * commit is applied. See `openTransaction`.
     */
    token: number;
    value: ExternalToolValues;
};

/**
 * `F-CONFIG-EXTERNAL-TOOLS`' tool list — legacy's `external-tool-config.html`
 * and the `externalToolConfig` field type it belongs to: the add menu, the
 * empty state, the configured tools ordered by name, and the manual
 * sync-everything action.
 *
 * Only this component talks to `C-CONFIG-FORM`: adding, replacing, and
 * removing an entry go through the shared form's `setValue` with
 * `shouldDirty`, so the array lives in the form (not in component state) and
 * survives switching config tabs. Nothing is persisted until the configuration
 * itself is saved — but note that `ExternalToolDialog`'s submit has *already*
 * written NZBHydra into the external tool by then, which is exactly legacy's
 * behaviour and the reason the dialog refuses to commit an entry the tool
 * rejected.
 *
 * It is not `C-CONFIG-FIELDS`' `RepeatSection`, whose registry entry describes
 * a list edited *in place*.
 */
export function ExternalToolsSection({transport}: {transport: ApiTransport}) {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const toasts = useToasts();
    const entries = externalToolsOf(
        useWatch<ConfigValues>({name: EXTERNAL_TOOLS_PATH}),
    );
    const [editing, setEditing] = useState<Editing | null>(null);
    const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(
        null,
    );
    const [syncing, setSyncing] = useState(false);
    /**
     * The identity of the transaction that is currently allowed to commit.
     * Every open and every close bumps it, so a configure call that only
     * resolves after its dialog was cancelled, deleted, or replaced carries a
     * stale token and its commit is dropped instead of applied (FM-064's
     * review finding, which applies here for the same reason: `onSubmit` is
     * captured by an async closure that outlives the render that started the
     * request).
     */
    const transactionRef = useRef(0);
    /** Hoisted out of the JSX so the `null` check narrows inside a closure. */
    const editingIndex = editing?.index ?? null;

    const openTransaction = (
        index: number | null,
        value: ExternalToolValues,
    ) => {
        transactionRef.current += 1;
        setEditing({index, token: transactionRef.current, value});
    };

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    const write = (next: ExternalToolValues[]) =>
        setValue(EXTERNAL_TOOLS_PATH, next as never, {shouldDirty: true});

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = () =>
        externalToolsOf(getValues(EXTERNAL_TOOLS_PATH));

    const commit = (
        token: number,
        index: number | null,
        entry: ExternalToolValues,
    ) => {
        if (token !== transactionRef.current) {
            return;
        }
        const current = currentEntries();
        write(
            index === null
                ? [...current, entry]
                : current.map((existing, entryIndex) =>
                      entryIndex === index ? {...existing, ...entry} : existing,
                  ),
        );
        closeTransaction();
    };

    const remove = (index: number) => {
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        closeTransaction();
    };

    /** Legacy's `syncAll`. */
    const syncAll = async () => {
        toasts.showToast({message: SYNC_STARTED, severity: "info"});
        setSyncing(true);
        try {
            toasts.showToast(
                syncResultMessage(await syncAllExternalTools(transport)),
            );
        } catch (error) {
            toasts.showToast({
                message: `Error syncing to external tools: ${errorMessage(error)}`,
                severity: "error",
            });
        } finally {
            setSyncing(false);
        }
    };

    return (
        <Box data-testid={`config-repeat-${EXTERNAL_TOOLS_TEST_ID}`}>
            {entries.length === 0 ? (
                <Box data-testid="config-external-tools-empty" sx={{mb: 2}}>
                    <Typography component="h3" gutterBottom variant="subtitle1">
                        {EMPTY_STATE_HEADING}
                    </Typography>
                    <Typography variant="body2">
                        Use the &quot;Add external tool&quot; button below to
                        configure Sonarr, Radarr, Lidarr, or Readarr instances.
                    </Typography>
                </Box>
            ) : (
                <Stack divider={<Divider />} spacing={2} sx={{mb: 2}}>
                    {sortedExternalTools(entries).map(({entry, index}) => (
                        <ExternalToolRow
                            entry={entry}
                            index={index}
                            key={index}
                            onEdit={() =>
                                openTransaction(index, asExternalTool(entry))
                            }
                            onRemove={() => remove(index)}
                        />
                    ))}
                </Stack>
            )}
            <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap>
                <Button
                    aria-controls={
                        addMenuAnchor === null ? undefined : ADD_MENU_ID
                    }
                    aria-expanded={addMenuAnchor !== null}
                    aria-haspopup="menu"
                    data-testid={`config-repeat-add-${EXTERNAL_TOOLS_TEST_ID}`}
                    onClick={(event) => setAddMenuAnchor(event.currentTarget)}
                    startIcon={<AddIcon />}
                    type="button"
                    variant="outlined"
                >
                    Add external tool
                </Button>
                <Button
                    data-testid="config-external-tools-sync-all"
                    disabled={syncing}
                    onClick={() => void syncAll()}
                    startIcon={
                        syncing ? (
                            <CircularProgress
                                size={18}
                                variant="indeterminate"
                            />
                        ) : (
                            <SyncIcon />
                        )
                    }
                    type="button"
                    variant="outlined"
                >
                    Sync all now
                </Button>
            </Stack>
            <Menu
                anchorEl={addMenuAnchor}
                id={ADD_MENU_ID}
                onClose={() => setAddMenuAnchor(null)}
                open={addMenuAnchor !== null}
            >
                {EXTERNAL_TOOL_PRESETS.flatMap((preset) => [
                    // Legacy separates its four presets from the empty
                    // "Custom" entry with a divider.
                    ...(preset.value === "CUSTOM"
                        ? [<Divider key="custom-divider" />]
                        : []),
                    <MenuItem
                        data-testid={`config-repeat-add-option-${EXTERNAL_TOOLS_TEST_ID}-${preset.value}`}
                        key={preset.value}
                        onClick={() => {
                            setAddMenuAnchor(null);
                            openTransaction(
                                null,
                                newExternalToolDraft(preset.value),
                            );
                        }}
                    >
                        {preset.label}
                    </MenuItem>,
                ])}
            </Menu>
            {editing === null ? null : (
                <ExternalToolDialog
                    existingNames={otherNames(entries, editingIndex)}
                    initialValue={editing.value}
                    isNew={editingIndex === null}
                    onCancel={closeTransaction}
                    onDelete={
                        editingIndex === null
                            ? undefined
                            : () => remove(editingIndex)
                    }
                    onSubmit={(entry) =>
                        commit(editing.token, editingIndex, entry)
                    }
                    transport={transport}
                />
            )}
        </Box>
    );
}

/** Legacy's uniqueness check ignores the entry being edited itself. */
function otherNames(
    entries: ExternalToolValues[],
    index: number | null,
): string[] {
    return entries
        .map((entry, entryIndex) =>
            entryIndex === index ? "" : externalToolText(entry.name),
        )
        .filter((name) => name !== "");
}

/**
 * One configured tool. The `data-testid` index is the entry's index in the
 * *configuration array*, not its position in the name-ordered display: it is
 * what the row's Edit and Remove act on, and what the config path
 * `externalTools.externalTools.<index>` addresses.
 */
function ExternalToolRow({
    entry,
    index,
    onEdit,
    onRemove,
}: {
    entry: ExternalToolValues;
    index: number;
    onEdit: () => void;
    onRemove: () => void;
}) {
    const legend = externalToolLegend(entry);
    const rows: {field: string; label: string; value: string}[] = [
        {field: "type", label: "Type", value: externalToolText(entry.type)},
        {field: "host", label: "Host", value: externalToolText(entry.host)},
    ];

    return (
        <Box
            data-testid={`config-repeat-entry-${EXTERNAL_TOOLS_TEST_ID}-${index}`}
        >
            <Typography component="h3" sx={{mb: 1}} variant="subtitle1">
                {legend}
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
                            data-testid={`config-external-tool-value-${index}-${row.field}`}
                            sx={{m: 0, overflowWrap: "anywhere"}}
                            variant="body2"
                        >
                            {row.value}
                        </Typography>
                    </Stack>
                ))}
            </Box>
            <Stack direction="row" spacing={1}>
                <Button
                    data-testid={`config-repeat-edit-${EXTERNAL_TOOLS_TEST_ID}-${index}`}
                    onClick={onEdit}
                    startIcon={<EditIcon />}
                    type="button"
                >
                    Edit {legend}
                </Button>
                {/*
                 * Legacy removes an entry from the list without a confirmation
                 * (`external-tool-config.html:40`); nothing is written to the
                 * external tool and nothing is persisted until the
                 * configuration is saved, so the removal stays undoable by not
                 * saving.
                 */}
                <Button
                    color="error"
                    data-testid={`config-repeat-remove-${EXTERNAL_TOOLS_TEST_ID}-${index}`}
                    onClick={onRemove}
                    startIcon={<DeleteIcon />}
                    type="button"
                >
                    Remove {legend}
                </Button>
            </Stack>
        </Box>
    );
}
