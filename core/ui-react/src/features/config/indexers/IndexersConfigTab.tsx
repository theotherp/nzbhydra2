import AddIcon from "@mui/icons-material/Add";
import {Box, Button, Stack, Typography} from "@mui/material";
import {useCallback, useRef, useState} from "react";
import {useFormContext, useWatch} from "react-hook-form";

import type {
    IndexerCapsCheckResult,
    IndexerImportResult,
    IndexerImportSource,
    IndexerValues,
} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {ConfigFieldset} from "../components";
import {AddIndexerDialog} from "./AddIndexerDialog";
import {CapsCheckDialog, type CapsCheckRequest} from "./CapsCheckDialog";
import {IndexerDialog} from "./IndexerDialog";
import {IndexerImportDialog} from "./IndexerImportDialog";
import {IndexerTable, type IndexerListEntry} from "./IndexerTable";
import {
    importResultLines,
    importResultSummary,
    importResultTitle,
} from "./indexerImport";
import {
    ALREADY_CONFIGURED_MESSAGE,
    isAddingAllowed,
    newIndexerDraft,
    type IndexerPreset,
} from "./indexerPresets";
import {
    applyIndexerStates,
    asIndexer,
    indexerCategoryOptions,
    indexersOf,
    INDEXERS_PATH,
    mergeCapsCheckResults,
} from "./indexerSettings";

/** `CheckCapsModalInstanceCtrl`'s growl for an empty result list. */
const NO_INDEXERS_CHECKED = "No indexers were checked";

/**
 * Legacy's bulk recheck has no rejection handler of its own, so a failed check
 * fell through to `RequestsErrorHandler`'s generic error modal
 * (`generic-error-handler.js:43`). That modal is reproduced here as a plain
 * acknowledgement, because silence after a check the admin started reads as a
 * check that found nothing.
 */
const RECHECK_FAILED_TITLE = "Error checking capabilities";
const RECHECK_FAILED_MESSAGE =
    "An error occurred while checking the capabilities of the indexers. Nothing was changed.";

/**
 * The bulk recheck the progress dialog is showing. `token` is FM-167's
 * abandonment identity (`SearchPage`'s `activeSubmission` precedent): starting
 * and leaving a check both bump the tab's counter, so a `checkCaps` promise
 * that only resolves after the admin stopped waiting carries a stale token and
 * its results are dropped instead of merged into the form.
 */
type ActiveRecheck = {
    /** How many indexers the server is expected to check; see `recheckTargets`. */
    indexerCount: number;
    request: CapsCheckRequest;
    token: number;
};

/**
 * `IndexerChecker.checkCaps(CheckType)`'s own filter, applied to the entries
 * the form holds: enabled newznab/torznab indexers with a complete
 * configuration, and for an `INCOMPLETE` run only those whose capabilities are
 * not fully known yet.
 *
 * It can only ever be an estimate — the server checks the *saved* indexers
 * while this counts the edited ones — which is why it feeds a denominator the
 * dialog clamps rather than any decision.
 */
function recheckTargets(
    entries: readonly IndexerValues[],
    checkType: "ALL" | "INCOMPLETE",
): number {
    return entries.filter(
        (entry) =>
            entry.state === "ENABLED" &&
            (entry.searchModuleType === "NEWZNAB" ||
                entry.searchModuleType === "TORZNAB") &&
            entry.configComplete === true &&
            (checkType === "ALL" || entry.allCapsChecked !== true),
    ).length;
}

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
    const dialogs = useDialogs();
    const toasts = useToasts();
    /**
     * FM-168: the list surface's subscription, narrowed to the three fields it
     * decides anything with (`IndexerListEntry`).
     *
     * `useWatch`'s `compute` is what makes this a narrowing and not just a
     * projection: React Hook Form still wakes this subscription for every
     * change under `indexers`, but re-renders the tab only when the computed
     * value actually differs. So a keystroke in a priority cell — a `score`,
     * one of the three — re-renders the tab, because the *order* may have
     * changed and the table has to be able to resort on blur; a keystroke in
     * any other cell re-renders nothing above the row it was typed in.
     *
     * Everything else this tab does reads the array through `currentEntries()`
     * at the moment it acts, which is a stronger guarantee than a watched
     * render value anyway (see `commit`, `remove`, `startRecheck`).
     */
    const listEntries = useWatch<
        ConfigValues,
        typeof INDEXERS_PATH,
        ConfigValues,
        IndexerListEntry[]
    >({
        compute: (value) =>
            indexersOf(value).map((entry) => ({
                name: entry.name,
                score: entry.score,
                state: entry.state,
            })),
        name: INDEXERS_PATH,
    });
    const categoryOptions = indexerCategoryOptions(
        useWatch<ConfigValues>({name: "categoriesConfig.categories"}),
    );
    const [editing, setEditing] = useState<Editing | null>(null);
    const [adding, setAdding] = useState(false);
    /** The bulk recheck in flight, or `null`; drives the shared progress dialog. */
    const [recheck, setRecheck] = useState<ActiveRecheck | null>(null);
    const [importing, setImporting] = useState<IndexerImportSource | null>(
        null,
    );
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
    /**
     * The same idea for the bulk capability check: the identity of the check
     * whose outcome is currently allowed to be applied. See `ActiveRecheck`.
     */
    const capsCheckRef = useRef(0);

    const openTransaction = useCallback(
        (
            index: number | null,
            value: IndexerValues,
            info?: readonly string[],
        ) => {
            transactionRef.current += 1;
            setEditing({index, info, token: transactionRef.current, value});
        },
        [],
    );

    const closeTransaction = () => {
        transactionRef.current += 1;
        setEditing(null);
    };

    const write = (next: IndexerValues[]) =>
        setValue(INDEXERS_PATH, next as never, {shouldDirty: true});

    /** The array as the form holds it *now*, never a value a render captured. */
    const currentEntries = useCallback(
        () => indexersOf(getValues(INDEXERS_PATH)),
        [getValues],
    );

    /**
     * `IndexerTable`'s edit callback. Stable on purpose: it is handed down to
     * every memoized `IndexerTableRow`, so a fresh closure per render would
     * re-render the whole list on every keystroke and quietly undo FM-168.
     * The entry is read from the form at the click rather than from the render
     * that painted the row, which is what the rest of this tab does too.
     */
    const editEntry = useCallback(
        (index: number) => {
            openTransaction(index, asIndexer(currentEntries()[index]));
        },
        [currentEntries, openTransaction],
    );

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

    // ---- the bulk capability recheck ---------------------------------------

    /**
     * `recheckAllCaps` (`formly-config.js:627-645`). The request carries no
     * entry at all: the backend checks the indexers it has *stored*, which is
     * why an unsaved edit cannot be part of what is checked — only of what the
     * results are merged into.
     */
    const startRecheck = (checkType: "ALL" | "INCOMPLETE") => {
        capsCheckRef.current += 1;
        setRecheck({
            indexerCount: recheckTargets(currentEntries(), checkType),
            request: {checkType, indexerConfig: null},
            token: capsCheckRef.current,
        });
    };

    /**
     * FM-167: the admin stops waiting for a check that keeps running on the
     * server (`IndexerWeb` has no abort). Bumping the token is what makes the
     * abandoned request harmless — its results, and its failure, are dropped —
     * and the tab is usable again immediately, including for a second check.
     */
    const leaveRecheck = () => {
        capsCheckRef.current += 1;
        setRecheck(null);
    };

    /**
     * The merge legacy performs entry by entry, keyed by name. Read from the
     * form at this moment rather than from a captured render: the check runs
     * for tens of seconds and the admin can keep editing other tabs meanwhile.
     */
    const finishRecheck = (
        token: number,
        results: IndexerCapsCheckResult[],
    ) => {
        if (token !== capsCheckRef.current) {
            return;
        }
        capsCheckRef.current += 1;
        setRecheck(null);
        if (results.length === 0) {
            toasts.showToast({
                message: NO_INDEXERS_CHECKED,
                severity: "info",
            });
            return;
        }
        const merged = mergeCapsCheckResults(currentEntries(), results);
        if (merged.matched > 0) {
            // Legacy marks the form dirty inside the match loop, so a result
            // list naming no configured indexer changes nothing at all.
            write(merged.entries);
        }
    };

    const failRecheck = (token: number) => {
        if (token !== capsCheckRef.current) {
            return;
        }
        capsCheckRef.current += 1;
        setRecheck(null);
        void dialogs.confirm({
            title: RECHECK_FAILED_TITLE,
            message: RECHECK_FAILED_MESSAGE,
            confirmLabel: "OK",
            variant: "acknowledge",
            testId: "config-indexers-recheck-failed",
        });
    };

    // ---- the Jackett/Prowlarr imports --------------------------------------

    const startImport = (source: IndexerImportSource) => {
        setAdding(false);
        setImporting(source);
    };

    /**
     * `readJackettConfig`/`readProwlarrConfig`'s success callback
     * (`formly-indexers.js:754-800`): the returned list replaces the whole
     * array — the response already contains the existing entries the request
     * carried — and the counts are reported afterwards. It is a form edit like
     * any other, so the shell's unsaved-changes guard still applies and nothing
     * is persisted until the configuration is saved.
     */
    const finishImport = (
        source: IndexerImportSource,
        result: IndexerImportResult,
    ) => {
        setImporting(null);
        write(result.indexers);
        void dialogs.confirm({
            title: importResultTitle(source),
            message: importResultSummary(source),
            details: importResultLines(source, result),
            confirmLabel: "OK",
            variant: "acknowledge",
            testId: "config-indexer-import-result",
        });
    };

    /**
     * FM-103's bulk enable/disable, over the rows the list is *currently
     * showing*. One `setValue` for the whole array, as every other change to
     * the list is, so it is a single undoable step in the shell's review panel
     * and marks the form dirty once. `applyIndexerStates` returns every
     * untargeted entry by identity, which is what makes "a disable never
     * touches any other field" a property of the write rather than a claim
     * about it.
     */
    const setStates = (indices: readonly number[], enabled: boolean) => {
        write(applyIndexerStates(currentEntries(), indices, enabled));
    };

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
                {listEntries.length === 0 ? (
                    // §5's empty-state note: the message alone left the reader
                    // to work out that the button above is what fixes it.
                    <Box data-testid="config-indexers-empty">
                        <Typography variant="body2">
                            No indexers are configured yet.
                        </Typography>
                        <Typography variant="body2">
                            Use “Add new indexer” above to pick a preset or
                            configure a custom newznab or torznab indexer.
                        </Typography>
                    </Box>
                ) : (
                    <IndexerTable
                        entries={listEntries}
                        onEdit={editEntry}
                        onSetStates={setStates}
                    />
                )}
                {/*
                 * `recheck-all-caps.html`: legacy's split button, whose
                 * primary action is the incomplete check and whose dropdown
                 * holds the "all" one. Two plain buttons say the same thing
                 * without hiding half of it behind a caret.
                 */}
                <Stack
                    direction={{xs: "column", sm: "row"}}
                    spacing={1}
                    sx={{mt: 3}}
                >
                    <Button
                        data-testid="config-indexers-recheck-incomplete"
                        disabled={recheck !== null}
                        onClick={() => startRecheck("INCOMPLETE")}
                        type="button"
                        variant="contained"
                    >
                        Recheck caps for incomplete indexers
                    </Button>
                    <Button
                        data-testid="config-indexers-recheck-all"
                        disabled={recheck !== null}
                        onClick={() => startRecheck("ALL")}
                        type="button"
                        variant="outlined"
                    >
                        Recheck caps for all indexers
                    </Button>
                </Stack>
            </ConfigFieldset>
            {adding ? (
                <AddIndexerDialog
                    onCancel={() => setAdding(false)}
                    onImport={startImport}
                    onSelect={selectPreset}
                />
            ) : null}
            {importing === null ? null : (
                <IndexerImportDialog
                    existingIndexers={currentEntries}
                    onCancel={() => setImporting(null)}
                    onImported={(result) => finishImport(importing, result)}
                    source={importing}
                    transport={transport}
                />
            )}
            {recheck === null ? null : (
                <CapsCheckDialog
                    indexerCount={recheck.indexerCount}
                    onFailed={() => failRecheck(recheck.token)}
                    onLeave={leaveRecheck}
                    onResolved={(results) =>
                        finishRecheck(recheck.token, results)
                    }
                    request={recheck.request}
                    transport={transport}
                />
            )}
            {editing === null ? null : (
                <IndexerDialog
                    categoryOptions={categoryOptions}
                    editedIndex={editing.index}
                    // Read here rather than watched: the dialog is modal, so
                    // nothing can change the array under it, and the names it
                    // checks uniqueness against are the ones the form holds at
                    // the moment it opened.
                    entries={currentEntries()}
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
