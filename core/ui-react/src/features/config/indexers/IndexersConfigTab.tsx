import AddIcon from "@mui/icons-material/Add";
import {Box, Button, Divider, Stack, Typography} from "@mui/material";
import {useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {IndexerValues} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useToasts} from "../../../components/toasts/toasts";
import {ConfigFieldset} from "../components";
import {AddIndexerDialog} from "./AddIndexerDialog";
import {IndexerDialog} from "./IndexerDialog";
import {IndexerRow} from "./IndexerRow";
import {
    ALREADY_CONFIGURED_MESSAGE,
    isAddingAllowed,
    newIndexerDraft,
    type IndexerPreset,
} from "./indexerPresets";
import {
    asIndexer,
    indexerCategoryOptions,
    indexersOf,
    INDEXERS_PATH,
    orderedIndexers,
} from "./indexerSettings";

type Editing = {
    /** The picked preset's prose, shown while composing a new entry. */
    info?: readonly string[];
    /** `null` while a *new* indexer is being composed. */
    index: number | null;
    /**
     * The transaction's identity, compared against `transactionRef` before a
     * commit is applied. See `openTransaction`.
     */
    token: number;
    value: IndexerValues;
};

/**
 * `F-CONFIG-INDEXERS`: the Indexers configuration tab — legacy's `indexers`
 * field type (`indexer-config.html`) and everything it opens.
 *
 * Only this component talks to `C-CONFIG-FORM`: adding, replacing, and removing
 * an entry go through the shared form's `setValue` with `shouldDirty`, so the
 * array lives in the form (not in component state) and survives switching
 * config tabs. Nothing is persisted until the configuration itself is saved.
 *
 * The rows are shown in legacy's order — state descending, then priority
 * descending, then name — while every control in a row binds to the entry's
 * *configuration* index, so the display order can never write to the wrong
 * entry.
 */
export function IndexersConfigTab({transport}: {transport: ApiTransport}) {
    const {getValues, setValue} = useFormContext<ConfigValues>();
    const toasts = useToasts();
    const entries = indexersOf(useWatch<ConfigValues>({name: INDEXERS_PATH}));
    const categoryOptions = indexerCategoryOptions(
        useWatch<ConfigValues>({name: "categoriesConfig.categories"}),
    );
    const [editing, setEditing] = useState<Editing | null>(null);
    const [adding, setAdding] = useState(false);
    /**
     * The identity of the transaction that is currently allowed to commit.
     * Every open and every close bumps it, so a check that only resolves after
     * its dialog was cancelled, deleted, or replaced carries a stale token and
     * its commit is dropped instead of applied. The dialog itself is blocked
     * while a check runs; this is the second line of defence, because
     * `onSubmit` is captured by an async closure that outlives the render — and
     * the state it closes over — that started the check.
     */
    const transactionRef = useRef(0);

    const openTransaction = (
        index: number | null,
        value: IndexerValues,
        info?: readonly string[],
    ) => {
        transactionRef.current += 1;
        setEditing({index, info, token: transactionRef.current, value});
    };

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    const write = (next: IndexerValues[]) =>
        setValue(INDEXERS_PATH, next as never, {shouldDirty: true});

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = () => indexersOf(getValues(INDEXERS_PATH));

    const commit = (
        token: number,
        index: number | null,
        entry: IndexerValues,
    ) => {
        if (token !== transactionRef.current) {
            return;
        }
        const current = currentEntries();
        write(
            index === null
                ? [...current, entry]
                : // Replaced, not merged: the entry is a complete clone of the
                  // one being edited, and a failed capability check *removes*
                  // `supportedSearchIds`/`supportedSearchTypes` so the next
                  // Submit checks again. Merging would resurrect them.
                  current.map((existing, entryIndex) =>
                      entryIndex === index ? entry : existing,
                  ),
        );
        closeTransaction();
    };

    /**
     * `null` is the new entry legacy has nothing to delete yet (its
     * `ng-if="!isInitial"`), which is why the dialog is given no Delete at all
     * in that case.
     */
    const remove = (index: number | null) => {
        if (index === null) {
            return;
        }
        write(
            currentEntries().filter(
                (_entry, entryIndex) => entryIndex !== index,
            ),
        );
        closeTransaction();
    };

    /**
     * `addEntry` (`formly-indexers.js:838-856`): the chooser always closes, and
     * a preset that may only exist once is refused with legacy's message rather
     * than opening an editor that could never be committed.
     */
    const selectPreset = (preset: IndexerPreset) => {
        setAdding(false);
        if (!isAddingAllowed(currentEntries(), preset)) {
            toasts.showToast({
                message: ALREADY_CONFIGURED_MESSAGE,
                severity: "error",
            });
            return;
        }
        openTransaction(null, newIndexerDraft(preset), preset.info);
    };

    const ordered = orderedIndexers(entries);

    return (
        <Box data-testid="config-indexers">
            <ConfigFieldset label="Indexers">
                <Button
                    data-testid="config-indexer-add"
                    onClick={() => setAdding(true)}
                    startIcon={<AddIcon />}
                    sx={{mb: 2}}
                    type="button"
                    variant="contained"
                >
                    Add new indexer
                </Button>
                {ordered.length === 0 ? (
                    <Typography
                        data-testid="config-indexers-empty"
                        variant="body2"
                    >
                        No indexers are configured yet.
                    </Typography>
                ) : (
                    <Stack divider={<Divider />} spacing={2}>
                        {ordered.map(({entry, index}) => (
                            <IndexerRow
                                entry={entry}
                                index={index}
                                key={index}
                                onEdit={() =>
                                    openTransaction(index, asIndexer(entry))
                                }
                            />
                        ))}
                    </Stack>
                )}
            </ConfigFieldset>
            {adding ? (
                <AddIndexerDialog
                    onCancel={() => setAdding(false)}
                    onSelect={selectPreset}
                />
            ) : null}
            {editing === null ? null : (
                <IndexerDialog
                    categoryOptions={categoryOptions}
                    editedIndex={editing.index}
                    entries={entries}
                    info={editing.info}
                    initialValue={editing.value}
                    isNew={editing.index === null}
                    onCancel={closeTransaction}
                    onDelete={
                        editing.index === null
                            ? undefined
                            : () => remove(editing.index)
                    }
                    onSubmit={(entry) =>
                        commit(editing.token, editing.index, entry)
                    }
                    transport={transport}
                />
            )}
        </Box>
    );
}
