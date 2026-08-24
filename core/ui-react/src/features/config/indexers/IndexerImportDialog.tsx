import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Typography,
} from "@mui/material";
import {useState} from "react";
import {FormProvider, useForm} from "react-hook-form";

import {
    importIndexers,
    UNKNOWN_IMPORT_ERROR,
    type IndexerImportResult,
    type IndexerImportSource,
    type IndexerValues,
} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {HelpBlock, SecretInput, TextSetting} from "../components";
import {
    importConfigDraft,
    importFieldPath,
    importReplacementWarning,
    INDEXER_IMPORT_PATH,
    INDEXER_IMPORT_SOURCES,
} from "./indexerImport";
import {asIndexer} from "./indexerSettings";

const INDEXER_IMPORT_DIALOG_TEST_ID = "config-indexer-import-dialog";

/**
 * `F-CONFIG-INDEXERS`' Jackett/Prowlarr import dialog — legacy's indexer box
 * opened with the `IMPORT_CONFIG` marker type
 * (`IndexerConfigBoxInstanceController`'s `obSubmit`,
 * `formly-indexers.js:1163-1200`).
 *
 * It is not the edit dialog: nothing is being composed here, so it asks only
 * for the two things that address the importer, and Submit is the request
 * itself. Two rules from legacy are load-bearing:
 *
 * - only a **successful** response closes the dialog. A failure leaves every
 *   typed value in place and shows what the server said, because the usual
 *   reason for a failure is a wrong host or key that the admin is about to
 *   correct;
 * - what comes back replaces the *whole* indexer list, which is stated here,
 *   before the request runs, rather than discovered afterwards.
 */
export function IndexerImportDialog({
    existingIndexers,
    onCancel,
    onImported,
    source,
    transport,
}: {
    /**
     * The list to fold the import into, read when Submit is pressed rather
     * than when the dialog opened — the request must carry the entries the
     * form holds *now*, including unsaved edits.
     */
    existingIndexers: () => readonly IndexerValues[];
    onCancel: () => void;
    onImported: (result: IndexerImportResult) => void;
    source: IndexerImportSource;
    transport: ApiTransport;
}) {
    const descriptor = INDEXER_IMPORT_SOURCES[source];
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const form = useForm<ConfigValues>({
        defaultValues: {indexerImport: importConfigDraft(source)},
        shouldUnregister: false,
    });

    const submit = async () => {
        if (!(await form.trigger())) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            onImported(
                await importIndexers(
                    transport,
                    source,
                    existingIndexers(),
                    asIndexer(form.getValues(INDEXER_IMPORT_PATH)),
                ),
            );
        } catch (failure) {
            setError(
                failure instanceof Error && failure.message !== ""
                    ? failure.message
                    : UNKNOWN_IMPORT_ERROR,
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog
            data-testid={INDEXER_IMPORT_DIALOG_TEST_ID}
            disableEscapeKeyDown={busy}
            fullWidth
            maxWidth="sm"
            onClose={() => {
                if (!busy) {
                    onCancel();
                }
            }}
            open
        >
            <DialogTitle>{descriptor.name}</DialogTitle>
            <DialogContent dividers>
                <HelpBlock
                    lines={importReplacementWarning(source)}
                    severity="warning"
                    testId="config-indexer-import-warning"
                />
                <FormProvider {...form}>
                    <TextSetting
                        label="Host"
                        name={importFieldPath("host")}
                        placeholder={descriptor.defaultHost}
                        required
                    />
                    <SecretInput
                        label="API Key"
                        name={importFieldPath("apiKey")}
                    />
                </FormProvider>
                {error === null ? null : (
                    <HelpBlock
                        lines={[error]}
                        severity="error"
                        testId="config-indexer-import-error"
                    />
                )}
                {busy ? (
                    <Stack
                        alignItems="center"
                        data-testid="config-indexer-import-running"
                        direction="row"
                        role="status"
                        spacing={1}
                    >
                        <CircularProgress size={18} variant="indeterminate" />
                        <Typography variant="body2">
                            Reading the indexer configuration…
                        </Typography>
                    </Stack>
                ) : null}
            </DialogContent>
            <DialogActions>
                <Button
                    data-testid="config-indexer-import-dialog-cancel"
                    disabled={busy}
                    onClick={onCancel}
                    type="button"
                >
                    Cancel
                </Button>
                <Button
                    data-testid="config-indexer-import-dialog-submit"
                    disabled={busy}
                    onClick={() => void submit()}
                    type="button"
                    variant="contained"
                >
                    Submit
                </Button>
            </DialogActions>
        </Dialog>
    );
}
