import DeleteIcon from "@mui/icons-material/Delete";
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

import {checkDownloaderConnection} from "../../../api/config/downloaderConnection";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {
    AdvancedDisclosureContext,
    NO_ADVANCED_DISCLOSURE,
} from "../components/advancedDisclosure";
import {
    SecretInput,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {
    connectionSettingsChanged,
    downloaderEntry,
    downloaderLegend,
    downloaderText,
    draftFieldPath,
    DOWNLOADER_DRAFT_PATH,
    NZB_ADDING_TYPE_OPTIONS,
    visibleDownloaderFields,
    type DownloaderField,
    type DownloaderValues,
} from "./downloadingSettings";

const DOWNLOADER_DIALOG_TEST_ID = "config-downloader-dialog";

/** `handleConnectionCheckFail` (`config-fields-service.js:2557-2588`). */
const CONNECTION_FAILED_TITLE = "Connection check failed";
const ADD_ANYWAY_QUESTION = "Do you want to add it anyway?";
const UNCHECKED_MESSAGE =
    "The connection to the downloader could not be tested, sorry. Please check the log.";
const CHECKED_YES_LABEL = "I know what I'm doing";
const UNCHECKED_YES_LABEL = "I'll risk it";
const DISABLE_LABEL = "Add it, but disabled";
const RETRY_LABEL = "Aahh, let me try again";
/** Shown when the server reports a failure without saying why. */
const UNEXPLAINED_FAILURE =
    "The downloader rejected the connection but gave no reason.";

/**
 * `F-CONFIG-DOWNLOADING`'s downloader editor — legacy's
 * `downloader-config-box.html` plus `DownloaderConfigBoxInstanceController`.
 *
 * It is a **transaction**, and that is the whole reason a downloader is edited
 * in a modal rather than inline. The dialog creates its own throwaway React
 * Hook Form over a *copy* of the entry and never touches `C-CONFIG-FORM`:
 * typing here cannot reach the configuration, Cancel and Reset simply discard,
 * and only `onSubmit` — called after the connection check has resolved — hands
 * a finished entry to the section that owns the array. That also protects the
 * masked credentials: a half-applied entry could write a `***UNCHANGED***`
 * marker into the wrong place, or clear a stored secret, without the admin ever
 * confirming anything.
 *
 * The draft form is bound at `downloading.downloaderDraft`, not at the entry's
 * real index, so the vocabulary's path-derived `data-testid`s stay distinct
 * from the list row's own controls; nothing ever saves this form.
 *
 * While the connection check is in flight the whole dialog is blocked — every
 * action button is disabled and Escape and a backdrop click are ignored. That
 * is legacy's `blockUI.start("Testing connection...")`
 * (`DownloaderCheckBeforeCloseService`), and it is what keeps the transaction
 * atomic: closing the dialog mid-check would leave an answer arriving for a
 * transaction that no longer exists.
 */
export function DownloaderDialog({
    existingNames,
    initialValue,
    isNew,
    onCancel,
    onDelete,
    onSubmit,
    transport,
}: {
    /** The names of the *other* configured downloaders (legacy's uniqueness check). */
    existingNames: readonly string[];
    initialValue: DownloaderValues;
    /** Legacy's `isInitial`: a new entry always runs the connection check. */
    isNew: boolean;
    onCancel: () => void;
    /** Absent for a new entry, which legacy has nothing to delete yet. */
    onDelete?: () => void;
    onSubmit: (entry: DownloaderValues) => void;
    transport: ApiTransport;
}) {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const [checking, setChecking] = useState(false);
    const draft = useForm<ConfigValues>({
        defaultValues: {
            downloading: {downloaderDraft: structuredClone(initialValue)},
        },
        // An advanced row that is hidden, or a field this type does not show,
        // must keep the value it arrived with rather than be dropped from the
        // entry on submit.
        shouldUnregister: false,
    });

    const fields = visibleDownloaderFields(initialValue.downloaderType);
    const shows = (field: DownloaderField) => fields.includes(field);
    const legend = downloaderLegend(initialValue);

    const draftValues = (): DownloaderValues =>
        downloaderEntry(
            (draft.getValues(DOWNLOADER_DRAFT_PATH) ?? {}) as DownloaderValues,
        );

    const uniqueName = (value: unknown) => {
        const name = downloaderText(value);
        return existingNames.includes(name)
            ? `Downloader "${name}" already exists`
            : true;
    };

    /**
     * `DownloaderCheckBeforeCloseService.checkBeforeClose`: answers with the
     * entry that may be committed, or `null` when the admin chose to go back
     * and correct it. An existing entry whose connection settings were not
     * touched closes without a check at all — legacy only tests when the box
     * was opened for a new entry or when one of the watched fields changed.
     */
    const checkBeforeClose = async (
        entry: DownloaderValues,
    ): Promise<DownloaderValues | null> => {
        if (!isNew && !connectionSettingsChanged(initialValue, entry)) {
            return entry;
        }
        setChecking(true);
        let result;
        try {
            result = await checkDownloaderConnection(transport, entry);
        } finally {
            setChecking(false);
        }
        if (result.kind === "successful") {
            toasts.showToast({
                message: "Connection to the downloader tested successfully",
                severity: "info",
            });
            return entry;
        }
        // `handleConnectionCheckFail`'s two branches: the server ran the check
        // and can say what went wrong, or the check never happened at all.
        const answer = await dialogs.confirm({
            title: CONNECTION_FAILED_TITLE,
            message:
                result.kind === "failed"
                    ? result.message === ""
                        ? UNEXPLAINED_FAILURE
                        : result.message
                    : UNCHECKED_MESSAGE,
            details: [ADD_ANYWAY_QUESTION],
            confirmLabel:
                result.kind === "failed"
                    ? CHECKED_YES_LABEL
                    : UNCHECKED_YES_LABEL,
            denyLabel: DISABLE_LABEL,
            cancelLabel: RETRY_LABEL,
            testId: "config-downloader-connection-failed",
        });
        if (answer === "confirmed") {
            return entry;
        }
        if (answer === "denied") {
            // Legacy sets `model.enabled = false` and resolves, so the entry is
            // still added — just not active (`handleConnectionCheckFail`).
            return {...entry, enabled: false};
        }
        // "Aahh, let me try again": the dialog stays open and nothing is
        // committed.
        return null;
    };

    const submit = async () => {
        if (!(await draft.trigger())) {
            toasts.showToast({
                message: "Config invalid. Please check your settings.",
                severity: "error",
            });
            return;
        }
        const committed = await checkBeforeClose(draftValues());
        if (committed !== null) {
            onSubmit(committed);
        }
    };

    return (
        // The dialog is portalled to the document body, but React context is
        // not: without this provider the advanced rows below would still be
        // context-descendants of `<ConfigFieldset label="Downloaders">` and
        // register with it, making that fieldset offer "N advanced settings
        // hidden" behind the modal backdrop for as long as the dialog is open.
        // A dialog is not a fieldset and has no expander of its own, so the
        // right answer is that nobody is counting these rows —
        // `NO_ADVANCED_DISCLOSURE`, the documented "outside any fieldset"
        // value. Only the *hidden* state is affected: with the global toggle on
        // the rows are shown regardless of what any disclosure says.
        <AdvancedDisclosureContext.Provider value={NO_ADVANCED_DISCLOSURE}>
            <Dialog
                data-testid={DOWNLOADER_DIALOG_TEST_ID}
                // Legacy's `blockUI`: while the check runs there is no way out of
                // the dialog at all, not by Escape and not by clicking the
                // backdrop.
                disableEscapeKeyDown={checking}
                fullWidth
                maxWidth="sm"
                onClose={() => {
                    if (!checking) {
                        onCancel();
                    }
                }}
                open
            >
                <DialogTitle>{legend}</DialogTitle>
                <DialogContent dividers>
                    <FormProvider {...draft}>
                        {shows("enabled") ? (
                            <SwitchSetting
                                label="Enabled"
                                name={draftFieldPath("enabled")}
                            />
                        ) : null}
                        {shows("name") ? (
                            <TextSetting
                                label="Name"
                                name={draftFieldPath("name")}
                                required
                                validate={uniqueName}
                            />
                        ) : null}
                        {shows("url") ? (
                            <TextSetting
                                help="URL with scheme and full path"
                                label="URL"
                                name={draftFieldPath("url")}
                                required
                            />
                        ) : null}
                        {/*
                         * The credential fields are `C-SECRET-INPUT` because the
                         * backend masks them: `DownloaderConfig.apiKey`,
                         * `username`, and `password` are `@HiddenInUI`, so an
                         * existing entry arrives holding `***UNCHANGED***` and must
                         * send it back untouched unless the admin types a new one.
                         */}
                        {shows("apiKey") ? (
                            <SecretInput
                                label="API Key"
                                name={draftFieldPath("apiKey")}
                            />
                        ) : null}
                        {shows("username") ? (
                            <SecretInput
                                label="Username"
                                name={draftFieldPath("username")}
                            />
                        ) : null}
                        {shows("password") ? (
                            <SecretInput
                                label="Password"
                                name={draftFieldPath("password")}
                            />
                        ) : null}
                        {shows("defaultCategory") ? (
                            <TextSetting
                                help='When adding NZBs this category will be used instead of asking for the category. Write "Use original category", "Use no category" or "Use mapped category" to not be asked.'
                                label="Default category"
                                name={draftFieldPath("defaultCategory")}
                                placeholder="Ask when downloading"
                            />
                        ) : null}
                        {shows("nzbAddingType") ? (
                            <SelectSetting
                                advanced
                                help="How NZBs are added to the downloader, either by sending a link to the NZB or by uploading the NZB data."
                                label="NZB adding type"
                                name={draftFieldPath("nzbAddingType")}
                                options={NZB_ADDING_TYPE_OPTIONS}
                                tooltip="You can select if you want to upload the NZB to the downloader or send a Hydra link. The downloader will do the download itself. This is a matter of taste, but adding a link and redirecting the downloader is the fastest way. Usually the links are determined using the URL via which you call it in your browser. If your downloader cannot access NZBHydra using that URL you can set a specific URL to be used in the main downloading config."
                            />
                        ) : null}
                        {shows("addPaused") ? (
                            <SwitchSetting
                                advanced
                                help="Add NZBs paused"
                                label="Add paused"
                                name={draftFieldPath("addPaused")}
                            />
                        ) : null}
                        {shows("iconCssClass") ? (
                            <TextSetting
                                advanced
                                // Legacy's help is a plain sentence containing a
                                // bare URL, not an anchor (`formly-downloaders.js:265`),
                                // so it stays text here too.
                                help='Copy an icon name from https://fontawesome.com/v4.7.0/icons/ (e.g. "film")'
                                label="Icon CSS class"
                                name={draftFieldPath("iconCssClass")}
                                placeholder="Default"
                                tooltip="If you have multiple downloaders of the same type you can select an icon from the Font Awesome library. This icon will be shown in the search results and the NZB download history instead of the default downloader icon."
                            />
                        ) : null}
                    </FormProvider>
                    {checking ? (
                        <Stack
                            alignItems="center"
                            data-testid="config-downloader-dialog-checking"
                            direction="row"
                            role="status"
                            spacing={1}
                        >
                            <CircularProgress
                                size={18}
                                variant="indeterminate"
                            />
                            <Typography variant="body2">
                                Testing connection…
                            </Typography>
                        </Stack>
                    ) : null}
                </DialogContent>
                <DialogActions>
                    {onDelete === undefined ? null : (
                        <Button
                            color="error"
                            data-testid="config-downloader-dialog-delete"
                            disabled={checking}
                            onClick={onDelete}
                            startIcon={<DeleteIcon />}
                            sx={{mr: "auto"}}
                            type="button"
                        >
                            Delete
                        </Button>
                    )}
                    <Button
                        data-testid="config-downloader-dialog-cancel"
                        disabled={checking}
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="config-downloader-dialog-reset"
                        disabled={checking}
                        onClick={() => draft.reset()}
                        type="button"
                    >
                        Reset
                    </Button>
                    <Button
                        data-testid="config-downloader-dialog-submit"
                        disabled={checking}
                        onClick={() => void submit()}
                        type="button"
                        variant="contained"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </AdvancedDisclosureContext.Provider>
    );
}
