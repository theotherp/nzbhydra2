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
import {useEffect, useRef, useState} from "react";
import {FormProvider, useForm, useWatch} from "react-hook-form";

import {
    buildExternalToolAddRequest,
    configureExternalTool,
    testExternalToolConnection,
} from "../../../api/config/externalTools";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useToasts} from "../../../components/toasts/toasts";
import {
    AdvancedDisclosureContext,
    NO_ADVANCED_DISCLOSURE,
} from "../components/advancedDisclosure";
import {
    NumberSetting,
    SecretInput,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {focusFirstInvalidField} from "../invalidFieldFocus";
import {
    categoriesValidator,
    connectionSettingsChanged,
    DEFAULT_CATEGORIES,
    draftFieldPath,
    EXTERNAL_TOOL_DRAFT_PATH,
    EXTERNAL_TOOL_TYPE_OPTIONS,
    externalToolEntry,
    externalToolText,
    externalToolTypeLabel,
    minimumSeedersValidator,
    SYNC_TYPE_OPTIONS,
    visibleExternalToolFields,
    type ExternalToolField,
    type ExternalToolValues,
} from "./externalToolsSettings";

const EXTERNAL_TOOL_DIALOG_TEST_ID = "config-external-tool-dialog";

/** Legacy's `external-tool-config-box.html` modal title. */
const EXTERNAL_TOOL_DIALOG_TITLE = "External Tool Configuration";

/** `formly-external-tools.js`' connection-test messages. */
const CONNECTION_SUCCESS = "Connection test successful";
const CONNECTION_FAILURE_PREFIX = "Connection test failed: ";

/**
 * What the dialog is waiting for. The two phases are legacy's two
 * `blockUI.start(...)` captions, and they are distinguished for the same
 * reason: the second one is writing into somebody else's application.
 */
type Busy = "configuring" | "testing";

/**
 * `F-CONFIG-EXTERNAL-TOOLS`' entry editor — legacy's
 * `external-tool-config-box.html` plus
 * `ExternalToolConfigBoxInstanceController`.
 *
 * It is FM-064's modal transaction with one decisive difference: **submitting
 * changes another running application.** `API-CONFIG-EXTERNAL-CONFIGURE` adds,
 * updates, or removes NZBHydra inside the Sonarr/Radarr/Lidarr/Readarr
 * instance the entry points at, so the order of the two steps is part of the
 * contract and not an implementation detail:
 *
 * 1. the draft form must be valid, or nothing is sent at all;
 * 2. the connection is tested first — always for a new entry, and for an
 *    existing one only when `host` or `apiKey` changed (legacy's `isInitial`
 *    and its `needsConnectionTest` watchers). A failure stops here, so a
 *    mistyped host never reaches the configure step;
 * 3. only then is the tool configured, and **only a `true` answer closes the
 *    dialog**. Legacy keeps the box open on `false` (`syncToExternalTool`
 *    rejects and `$uibModalInstance.close` sits inside its resolution
 *    handler), which is what lets the admin correct an entry the tool refused
 *    instead of committing it.
 *
 * As in FM-064 the draft is a throwaway React Hook Form over a copy, bound at
 * `externalTools.externalToolDraft`, so Cancel, a backdrop click, and Reset
 * simply discard and nothing reaches `C-CONFIG-FORM` before a successful
 * Submit. While a request is in flight the whole dialog is blocked — legacy's
 * `blockUI` — so a transaction cannot be abandoned while an answer for it is
 * still on the way.
 */
export function ExternalToolDialog({
    existingNames,
    initialValue,
    isNew,
    onCancel,
    onDelete,
    onSubmit,
    transport,
}: {
    /** The names of the *other* configured tools (legacy's uniqueness check). */
    existingNames: readonly string[];
    initialValue: ExternalToolValues;
    /** Legacy's `isInitial`: a new entry always tests the connection. */
    isNew: boolean;
    onCancel: () => void;
    /** Absent for a new entry, which legacy has nothing to delete yet. */
    onDelete?: () => void;
    onSubmit: (entry: ExternalToolValues) => void;
    transport: ApiTransport;
}) {
    const toasts = useToasts();
    const [busy, setBusy] = useState<Busy | null>(null);
    const draft = useForm<ConfigValues>({
        defaultValues: {
            externalTools: {externalToolDraft: structuredClone(initialValue)},
        },
        // A hidden advanced row, or a field this type does not show, must keep
        // the value it arrived with rather than be dropped from the entry.
        shouldUnregister: false,
    });
    const watched = useWatch<ConfigValues>({
        control: draft.control,
        name: EXTERNAL_TOOL_DRAFT_PATH,
    });
    const values = (watched ?? {}) as ExternalToolValues;
    const fields = visibleExternalToolFields(values);
    const shows = (field: ExternalToolField) => fields.includes(field);

    /**
     * `formly-external-tools.js:165-197`: picking a type rewrites the
     * categories to that type's defaults. Legacy's watcher only fires on a
     * *change*, so the categories an existing entry was opened with survive.
     */
    const type = externalToolText(values.type);
    const previousType = useRef(type);
    useEffect(() => {
        if (previousType.current === type) {
            return;
        }
        previousType.current = type;
        const categories = DEFAULT_CATEGORIES[type];
        if (categories !== undefined) {
            draft.setValue(draftFieldPath("categories"), categories as never);
        }
    }, [draft, type]);

    const draftEntry = (): ExternalToolValues =>
        externalToolEntry(
            (draft.getValues(EXTERNAL_TOOL_DRAFT_PATH) ??
                {}) as ExternalToolValues,
        );

    const uniqueName = (value: unknown) => {
        const name = externalToolText(value);
        return existingNames.includes(name)
            ? `External tool "${name}" already exists`
            : true;
    };

    /** Legacy's `checkConnection`, including the toast on either outcome. */
    const testConnection = async (
        entry: ExternalToolValues,
    ): Promise<boolean> => {
        setBusy("testing");
        let result;
        try {
            result = await testExternalToolConnection(
                transport,
                // A test never writes: `DELETE_ONLY` is the add type legacy
                // sends, and `ExternalToolsWeb.testConnection` only reads the
                // host and the API key out of the request.
                buildExternalToolAddRequest(entry, "DELETE_ONLY"),
            );
        } finally {
            setBusy(null);
        }
        if (result.kind === "successful") {
            toasts.showToast({message: CONNECTION_SUCCESS, severity: "info"});
            return true;
        }
        toasts.showToast({
            message: `${CONNECTION_FAILURE_PREFIX}${result.message}`,
            severity: "error",
        });
        return false;
    };

    /** Legacy's `syncToExternalTool`. */
    const configure = async (entry: ExternalToolValues): Promise<boolean> => {
        const label = externalToolTypeLabel(entry);
        setBusy("configuring");
        let result;
        try {
            result = await configureExternalTool(
                transport,
                buildExternalToolAddRequest(
                    entry,
                    entry.syncType === "SINGLE" ? "SINGLE" : "PER_INDEXER",
                ),
            );
        } finally {
            setBusy(null);
        }
        if (result.kind === "configured") {
            toasts.showToast({
                message: `Successfully configured NZBHydra in ${label}`,
                severity: "success",
            });
            return true;
        }
        toasts.showToast({
            message:
                result.kind === "refused"
                    ? `Failed to configure NZBHydra in ${label}`
                    : `Error configuring NZBHydra in ${label}: ${result.message}`,
            severity: "error",
        });
        return false;
    };

    const submit = async () => {
        if (!(await draft.trigger())) {
            toasts.showToast({
                message: "Config invalid. Please check your settings.",
                severity: "error",
            });
            // The toast names nothing and does not last; on a long dialog the
            // setting it is about is usually scrolled out of view. Putting the
            // caret on it is what actually shows the admin where to look.
            focusFirstInvalidField(draft.control);
            return;
        }
        const entry = draftEntry();
        if (
            (isNew || connectionSettingsChanged(initialValue, entry)) &&
            !(await testConnection(entry))
        ) {
            return;
        }
        if (await configure(entry)) {
            onSubmit(entry);
        }
    };

    const canTest =
        externalToolText(values.host) !== "" &&
        externalToolText(values.apiKey) !== "";
    const blocked = busy !== null;

    return (
        // The dialog is portalled to the document body, but React context is
        // not: without this provider the advanced rows below would still be
        // context-descendants of `<ConfigFieldset label="External tools">` and
        // register with it, making that fieldset offer "N advanced settings
        // hidden" behind the modal backdrop for as long as the dialog is open.
        // A dialog is not a fieldset and has no expander of its own, so the
        // right answer is that nobody is counting these rows —
        // `NO_ADVANCED_DISCLOSURE`, the documented "outside any fieldset"
        // value. Only the *hidden* state is affected: with the global toggle on
        // the rows are shown regardless of what any disclosure says.
        <AdvancedDisclosureContext.Provider value={NO_ADVANCED_DISCLOSURE}>
            <Dialog
                data-testid={EXTERNAL_TOOL_DIALOG_TEST_ID}
                fullWidth
                maxWidth="sm"
                // Legacy's `blockUI`: while a request runs there is no way out
                // of the dialog at all, not by Escape and not by clicking the
                // backdrop. `Modal` routes both gestures through `onClose`, so
                // this one guard refuses both -- which is why v9's removal of
                // `disableEscapeKeyDown` changes nothing here.
                onClose={() => {
                    if (!blocked) {
                        onCancel();
                    }
                }}
                open
            >
                <DialogTitle>{EXTERNAL_TOOL_DIALOG_TITLE}</DialogTitle>
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
                                help="Unique name for this external tool instance"
                                label="Name"
                                name={draftFieldPath("name")}
                                required
                                validate={uniqueName}
                            />
                        ) : null}
                        {shows("type") ? (
                            <SelectSetting
                                label="Type"
                                name={draftFieldPath("type")}
                                options={EXTERNAL_TOOL_TYPE_OPTIONS}
                                required
                            />
                        ) : null}
                        {shows("host") ? (
                            <TextSetting
                                help="URL with scheme and port (e.g., http://localhost:8989)"
                                label="Host URL"
                                name={draftFieldPath("host")}
                                required
                            />
                        ) : null}
                        {/*
                         * `C-SECRET-INPUT` rather than legacy's plain text input.
                         * The backend does not mask this value
                         * (`ExternalToolConfig.apiKey` is `@SensitiveData`, not
                         * `@HiddenInUI`), so the control simply treats it as opaque
                         * and round-trips it — but it is a credential for another
                         * application and does not belong on screen in clear.
                         */}
                        {shows("apiKey") ? (
                            <SecretInput
                                help="API key for the external tool"
                                label="API Key"
                                name={draftFieldPath("apiKey")}
                            />
                        ) : null}
                        {shows("syncType") ? (
                            <SelectSetting
                                help="Whether to create one entry for all indexers or separate entries"
                                label="Sync Type"
                                name={draftFieldPath("syncType")}
                                options={SYNC_TYPE_OPTIONS}
                            />
                        ) : null}
                        {shows("nzbhydraName") ? (
                            <TextSetting
                                help="Name prefix used in the external tool"
                                label="NZBHydra Name"
                                name={draftFieldPath("nzbhydraName")}
                                required
                            />
                        ) : null}
                        {shows("nzbhydraHost") ? (
                            <TextSetting
                                help="NZBHydra URL that the external tool can reach (use host.docker.internal for Docker containers)"
                                label="NZBHydra Host"
                                name={draftFieldPath("nzbhydraHost")}
                                required
                            />
                        ) : null}
                        {shows("configureForUsenet") ? (
                            <SwitchSetting
                                help="Sync Usenet indexers"
                                label="Configure for Usenet"
                                name={draftFieldPath("configureForUsenet")}
                            />
                        ) : null}
                        {shows("configureForTorrents") ? (
                            <SwitchSetting
                                help="Sync torrent indexers"
                                label="Configure for Torrents"
                                name={draftFieldPath("configureForTorrents")}
                            />
                        ) : null}
                        {shows("addDisabledIndexers") ? (
                            <SwitchSetting
                                advanced
                                help="Also sync indexers that are disabled in NZBHydra"
                                label="Add disabled indexers"
                                name={draftFieldPath("addDisabledIndexers")}
                            />
                        ) : null}
                        {shows("useHydraPriorities") ? (
                            <SwitchSetting
                                help="Map NZBHydra indexer priorities to the external tool"
                                label="Use Hydra priorities"
                                name={draftFieldPath("useHydraPriorities")}
                            />
                        ) : null}
                        {shows("priority") ? (
                            <NumberSetting
                                help="Priority to use when not using Hydra priorities (1-50, lower is better)"
                                label="Default Priority"
                                name={draftFieldPath("priority")}
                                placeholder="25"
                            />
                        ) : null}
                        {shows("enableRss") ? (
                            <SwitchSetting
                                help="Enable RSS sync in the external tool"
                                label="Enable RSS"
                                name={draftFieldPath("enableRss")}
                            />
                        ) : null}
                        {shows("enableAutomaticSearch") ? (
                            <SwitchSetting
                                help="Enable automatic search in the external tool"
                                label="Enable automatic search"
                                name={draftFieldPath("enableAutomaticSearch")}
                            />
                        ) : null}
                        {shows("enableInteractiveSearch") ? (
                            <SwitchSetting
                                help="Enable interactive (manual) search in the external tool"
                                label="Enable interactive search"
                                name={draftFieldPath("enableInteractiveSearch")}
                            />
                        ) : null}
                        {shows("categories") ? (
                            <TextSetting
                                advanced
                                help="Comma-separated newznab category IDs"
                                label="Categories"
                                name={draftFieldPath("categories")}
                                validate={categoriesValidator}
                            />
                        ) : null}
                        {shows("animeCategories") ? (
                            <TextSetting
                                advanced
                                help="Comma-separated newznab category IDs for anime"
                                label="Anime categories"
                                name={draftFieldPath("animeCategories")}
                            />
                        ) : null}
                        {shows("removeYearFromSearchString") ? (
                            <SwitchSetting
                                advanced
                                help="Remove year from movie search queries"
                                label="Remove year from search"
                                name={draftFieldPath(
                                    "removeYearFromSearchString",
                                )}
                            />
                        ) : null}
                        {shows("earlyDownloadLimit") ? (
                            <TextSetting
                                advanced
                                label="Early download limit"
                                name={draftFieldPath("earlyDownloadLimit")}
                            />
                        ) : null}
                        {shows("additionalParameters") ? (
                            <TextSetting
                                advanced
                                help="Additional URL parameters to send to the indexer"
                                label="Additional parameters"
                                name={draftFieldPath("additionalParameters")}
                            />
                        ) : null}
                        {shows("minimumSeeders") ? (
                            <TextSetting
                                advanced
                                help="Minimum number of seeders"
                                label="Minimum seeders"
                                name={draftFieldPath("minimumSeeders")}
                                validate={minimumSeedersValidator}
                            />
                        ) : null}
                        {shows("seedRatio") ? (
                            <TextSetting
                                advanced
                                label="Seed ratio"
                                name={draftFieldPath("seedRatio")}
                            />
                        ) : null}
                        {shows("seedTime") ? (
                            <TextSetting
                                advanced
                                label="Seed time"
                                name={draftFieldPath("seedTime")}
                            />
                        ) : null}
                        {shows("seasonPackSeedTime") ? (
                            <TextSetting
                                advanced
                                label="Season pack seed time"
                                name={draftFieldPath("seasonPackSeedTime")}
                            />
                        ) : null}
                        {shows("discographySeedTime") ? (
                            <TextSetting
                                advanced
                                label="Discography seed time"
                                name={draftFieldPath("discographySeedTime")}
                            />
                        ) : null}
                    </FormProvider>
                    {busy === null ? null : (
                        <Stack
                            data-testid="config-external-tool-dialog-busy"
                            direction="row"
                            role="status"
                            spacing={1}
                            sx={{
                                alignItems: "center",
                            }}
                        >
                            <CircularProgress
                                size={18}
                                variant="indeterminate"
                            />
                            <Typography variant="body2">
                                {busy === "testing"
                                    ? "Testing connection…"
                                    : `Configuring NZBHydra in ${externalToolTypeLabel(values)}…`}
                            </Typography>
                        </Stack>
                    )}
                </DialogContent>
                {/*
                 * Five actions do not fit one row at 390px, and `DialogActions`
                 * does not wrap by default, so the leftmost button is clipped off
                 * the dialog. Wrapping is a layout property, not a restyle of the
                 * component (the row gap is theme spacing).
                 */}
                <DialogActions sx={{flexWrap: "wrap", rowGap: 1}}>
                    {onDelete === undefined ? null : (
                        <Button
                            color="error"
                            data-testid="config-external-tool-dialog-delete"
                            disabled={blocked}
                            onClick={onDelete}
                            startIcon={<DeleteIcon />}
                            sx={{mr: "auto"}}
                            type="button"
                        >
                            Delete
                        </Button>
                    )}
                    <Button
                        data-testid="config-external-tool-dialog-cancel"
                        disabled={blocked}
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="config-external-tool-dialog-reset"
                        disabled={blocked}
                        onClick={() => draft.reset()}
                        type="button"
                    >
                        Reset
                    </Button>
                    {/*
                     * Legacy renders this button only while the entry has both a
                     * host and an API key (`ng-if="model.host && model.apiKey"`).
                     * A control that appears and disappears while the admin types
                     * is worse than one that is visibly unavailable, so it stays
                     * put and is disabled instead.
                     */}
                    <Button
                        data-testid="config-external-tool-dialog-test"
                        disabled={blocked || !canTest}
                        onClick={() => void testConnection(draftEntry())}
                        type="button"
                    >
                        Test connection
                    </Button>
                    <Button
                        data-testid="config-external-tool-dialog-submit"
                        disabled={blocked}
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
