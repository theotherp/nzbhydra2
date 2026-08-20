import DeleteIcon from "@mui/icons-material/Delete";
import {
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";
import {useRef, useState} from "react";
import {FormProvider, useForm, useWatch} from "react-hook-form";

import {
    checkIndexerConnection,
    type IndexerCapsCheckResult,
    type IndexerValues,
} from "../../../api/config/indexers";
import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {useDialogs} from "../../../components/dialogs/dialogs";
import {useToasts} from "../../../components/toasts/toasts";
import {
    ChipsSetting,
    HelpBlock,
    MultiSelectSetting,
    NumberSetting,
    SecretInput,
    SelectSetting,
    SwitchSetting,
    TextSetting,
    type SettingOption,
    type SettingValidator,
} from "../components";
import {CapsCheckDialog, type CapsCheckRequest} from "./CapsCheckDialog";
import {IndexerStateSwitch} from "./IndexerStateSwitch";
import {
    applyCapsCheckResult,
    asIndexer,
    CAPS_RESULT_FIELDS,
    completenessBanner,
    connectionSettingsChanged,
    draftFieldPath,
    greaterThanOneValidator,
    greaterThanZeroValidator,
    groupNameSuggestions,
    hourOfDayValidator,
    INCOMPLETE_CAPS_MESSAGE,
    INCOMPLETE_CONFIG_MESSAGE,
    indexerLegend,
    indexerList,
    indexerStateHelp,
    indexerText,
    INDEXER_DRAFT_PATH,
    needsCapsCheck,
    noCommaValidator,
    SEARCH_ID_OPTIONS,
    SEARCH_SOURCE_OPTIONS,
    SEARCH_TYPE_OPTIONS,
    showsCapabilityControls,
    TORZNAB_NOTE,
    uniqueIndexerNameValidator,
    vipExpirationValidator,
    visibleIndexerFields,
    withUnknownCapabilities,
    type IndexerField,
} from "./indexerSettings";

export const INDEXER_DIALOG_TEST_ID = "config-indexer-dialog";

/** `handleConnectionCheckFail` (`config-fields-service.js:2557-2588`). */
const CONNECTION_FAILED_TITLE = "Connection check failed";
const ADD_ANYWAY_QUESTION = "Do you want to add it anyway?";
const UNCHECKED_MESSAGE =
    "The connection to the indexer could not be tested, sorry. Please check the log.";
const CHECKED_YES_LABEL = "I know what I'm doing";
const UNCHECKED_YES_LABEL = "I'll risk it";
const DISABLE_LABEL = "Add it, but disabled";
const RETRY_LABEL = "Aahh, let me try again";
/** Shown when the server reports a failure without saying why. */
const UNEXPLAINED_FAILURE =
    "The indexer rejected the connection but gave no reason.";

const CONNECTION_OK_TOAST = "Connection to the indexer tested successfully";
/** Legacy's spelling, kept verbatim (`formly-indexers.js:1406`). */
const CAPS_OK_TOAST = "Successfully tested capabilites of indexer";
const CAPS_INCOMPLETE_TITLE = "Incomplete caps check";
const CAPS_INCOMPLETE_MESSAGE =
    "The capabilities of the indexer could not be checked completely. You may use it but it's recommended to repeat the check at another time.";
const CAPS_INCOMPLETE_DETAIL =
    "Until then some search types or IDs may not be usable.";
const CAPS_ERROR_TITLE = "Error testing capabilities";
const CAPS_ERROR_FROM_BOX =
    "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually from the indexer config box";
const CAPS_ERROR_FROM_BUTTON =
    "An error occurred while contacting the indexer. It will not be usable until the caps check has been executed. You can trigger it manually using the button below.";

const DELETE_WARNING =
    "Deleting an indexer will remove its stats and related downloads and search results from the database";

/**
 * `F-CONFIG-INDEXERS`' indexer editor — legacy's `indexer-config-box.html`,
 * `IndexerConfigBoxInstanceController`, and `IndexerCheckBeforeCloseService`.
 *
 * It is a **transaction over a copy**. The dialog owns a throwaway React Hook
 * Form holding a clone of the entry and never touches `C-CONFIG-FORM`: typing
 * here cannot reach the configuration, Cancel, a backdrop dismissal, and Reset
 * simply discard, and only `onSubmit` hands a finished entry to the section
 * that owns the array.
 *
 * The reason that matters more here than anywhere else in the config area is
 * the close sequence. Submitting a new entry — or one whose connection-relevant
 * fields changed — first asks the backend to contact the indexer, and an entry
 * whose supported search types/IDs are still unknown then runs a capability
 * check that can take tens of seconds. An entry committed *before* that
 * capability check answers is persisted with `configComplete: false`: it looks
 * configured, and every search silently skips it. So nothing is committed until
 * the whole sequence has resolved, and what the check reports is written back
 * onto the entry that is committed.
 */
export function IndexerDialog({
    categoryOptions,
    editedIndex,
    entries,
    info,
    initialValue,
    isNew,
    onCancel,
    onDelete,
    onSubmit,
    transport,
}: {
    /** `CategoriesService.getWithoutAll()`, from the live config form. */
    categoryOptions: readonly SettingOption[];
    /** The edited entry's index in the configuration, or `null` when new. */
    editedIndex: number | null;
    /** Every configured indexer, for name uniqueness and group suggestions. */
    entries: readonly IndexerValues[];
    /**
     * The picked preset's explanatory prose (legacy's `model.info`). It is a
     * property of the *preset*, not of the indexer, so it is passed alongside
     * the entry rather than merged into it — legacy extends the model with it
     * and consequently writes an `info` key the backend has no field for into
     * the saved configuration.
     */
    info?: readonly string[];
    initialValue: IndexerValues;
    /** Legacy's `isInitial`: a new entry is always connection-checked. */
    isNew: boolean;
    onCancel: () => void;
    /** Absent for a new entry, which legacy has nothing to delete yet. */
    onDelete?: () => void;
    onSubmit: (entry: IndexerValues) => void;
    transport: ApiTransport;
}) {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const [checkingConnection, setCheckingConnection] = useState(false);
    const [capsRequest, setCapsRequest] = useState<CapsCheckRequest | null>(
        null,
    );
    const capsResolver = useRef<
        ((result: IndexerCapsCheckResult | null) => void) | null
    >(null);
    /**
     * Legacy's `form.capsChecked`: once the admin has run the capability check
     * from inside the box, closing it does not test the connection again — the
     * caps check already contacted the indexer.
     */
    const capsChecked = useRef(false);
    const draft = useForm<ConfigValues>({
        defaultValues: {indexerDraft: structuredClone(initialValue)},
        // An advanced row that is hidden, or a field this indexer type does not
        // show, must keep the value it arrived with rather than be dropped from
        // the entry on submit.
        shouldUnregister: false,
    });

    const watched = asIndexer(
        useWatch<ConfigValues>({
            control: draft.control,
            name: INDEXER_DRAFT_PATH,
        }),
    );
    const searchModuleType = initialValue.searchModuleType;
    const fields = visibleIndexerFields(searchModuleType);
    const shows = (field: IndexerField) => fields.includes(field);
    const isWtfNzb = indexerText(searchModuleType) === "WTFNZB";
    const capabilityControls = showsCapabilityControls(searchModuleType, isNew);
    const banner = completenessBanner(watched);
    const busy = checkingConnection || capsRequest !== null;

    const draftValues = (): IndexerValues =>
        asIndexer(draft.getValues(INDEXER_DRAFT_PATH));

    const otherNames = entries
        .map((entry, index) =>
            index === editedIndex ? "" : indexerText(entry.name),
        )
        .filter((name) => name !== "");
    const uniqueName = uniqueIndexerNameValidator(otherNames);
    const nameValidator: SettingValidator = (value) => {
        const unique = uniqueName(value);
        return unique === true ? noCommaValidator(value) : unique;
    };

    // ---- the capability check ---------------------------------------------

    /**
     * Opens the progress dialog and answers with the check's single result, or
     * `null` when the check could not be run at all.
     */
    const runCapsCheck = (entry: IndexerValues) =>
        new Promise<IndexerCapsCheckResult | null>((resolve) => {
            capsResolver.current = resolve;
            setCapsRequest({checkType: "SINGLE", indexerConfig: entry});
        });

    const finishCapsCheck = (result: IndexerCapsCheckResult | null) => {
        setCapsRequest(null);
        const resolve = capsResolver.current;
        capsResolver.current = null;
        resolve?.(result);
    };

    /**
     * `checkCapsWhenClosing`'s three outcomes (`formly-indexers.js:1400-1421`),
     * which differ in what the admin is told and in nothing else: the entry is
     * committed in all three, carrying whatever the check found — including
     * `configComplete: false`, which is what the list then marks.
     */
    const reportCapsOutcome = async (
        result: IndexerCapsCheckResult,
    ): Promise<void> => {
        if (result.allCapsChecked && result.configComplete) {
            toasts.showToast({message: CAPS_OK_TOAST, severity: "info"});
            return;
        }
        if (result.configComplete) {
            await dialogs.confirm({
                title: CAPS_INCOMPLETE_TITLE,
                message: CAPS_INCOMPLETE_MESSAGE,
                details: [CAPS_INCOMPLETE_DETAIL],
                confirmLabel: "OK",
                variant: "acknowledge",
                testId: "config-indexer-caps-incomplete",
            });
            return;
        }
        await dialogs.confirm({
            title: CAPS_ERROR_TITLE,
            message: CAPS_ERROR_FROM_BOX,
            confirmLabel: "OK",
            variant: "acknowledge",
            testId: "config-indexer-caps-failed",
        });
    };

    const reportCapsRequestFailed = () =>
        dialogs.confirm({
            title: CAPS_ERROR_TITLE,
            message: CAPS_ERROR_FROM_BUTTON,
            confirmLabel: "OK",
            variant: "acknowledge",
            testId: "config-indexer-caps-failed",
        });

    /** `checkCapsWhenClosing`: only run at all when capabilities are unknown. */
    const checkCapsBeforeClose = async (
        entry: IndexerValues,
    ): Promise<IndexerValues> => {
        if (!needsCapsCheck(entry)) {
            return entry;
        }
        const result = await runCapsCheck(entry);
        if (result === null) {
            await reportCapsRequestFailed();
            // Legacy clears both capability lists so the next Submit checks
            // again, and still commits the entry.
            return withUnknownCapabilities(entry);
        }
        await reportCapsOutcome(result);
        return applyCapsCheckResult(entry, result.indexerConfig);
    };

    /**
     * The `horizontalCheckCaps` button (`formly-indexers.js:607-617`): the same
     * check, run on demand, writing its result into the open form rather than
     * into a commit.
     */
    const checkCapsNow = async () => {
        const result = await runCapsCheck(draftValues());
        if (result === null) {
            await reportCapsRequestFailed();
            return;
        }
        for (const field of CAPS_RESULT_FIELDS) {
            if (Object.hasOwn(result.indexerConfig, field)) {
                draft.setValue(
                    draftFieldPath(field),
                    result.indexerConfig[field] as never,
                    {shouldDirty: true},
                );
            }
        }
        if (result.configComplete) {
            capsChecked.current = true;
        }
        await reportCapsOutcome(result);
    };

    // ---- the close sequence ------------------------------------------------

    /**
     * `IndexerCheckBeforeCloseService.checkBeforeClose`: answers with the entry
     * that may be committed, or `null` when the admin chose to go back and
     * correct it.
     */
    const checkBeforeClose = async (
        entry: IndexerValues,
    ): Promise<IndexerValues | null> => {
        const skipConnectionCheck =
            !isNew &&
            (!connectionSettingsChanged(initialValue, entry) ||
                capsChecked.current);
        if (skipConnectionCheck) {
            return await checkCapsBeforeClose(entry);
        }
        setCheckingConnection(true);
        let result;
        try {
            result = await checkIndexerConnection(transport, entry);
        } finally {
            setCheckingConnection(false);
        }
        if (result.kind === "successful") {
            toasts.showToast({message: CONNECTION_OK_TOAST, severity: "info"});
            return await checkCapsBeforeClose(entry);
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
            testId: "config-indexer-connection-failed",
        });
        if (answer === "confirmed") {
            // Legacy resolves without a value here, so the entry is committed
            // as edited and the capability check is skipped entirely.
            return entry;
        }
        if (answer === "denied") {
            // Legacy sets `model.enabled = false` — a field `IndexerConfig`
            // does not have (it is copied from the downloader dialog), so the
            // indexer is added *enabled* and the button does nothing. The state
            // enum is what actually disables an indexer, so that is what is set
            // here; the button otherwise says something untrue.
            return {...entry, state: "DISABLED_USER"};
        }
        // "Aahh, let me try again": the dialog stays open, nothing is committed.
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

    const suggestions = groupNameSuggestions(
        entries,
        editedIndex,
        indexerList(watched.groupNames),
    );

    return (
        <>
            <Dialog
                data-testid={INDEXER_DIALOG_TEST_ID}
                // While a check runs there is no way out of the dialog at all,
                // which is legacy's `blockUI` and what keeps the transaction
                // atomic: closing mid-check would leave an answer arriving for
                // a transaction that no longer exists.
                disableEscapeKeyDown={busy}
                fullWidth
                maxWidth="md"
                onClose={() => {
                    if (!busy) {
                        onCancel();
                    }
                }}
                open
            >
                <DialogTitle>{indexerLegend(watched)}</DialogTitle>
                <DialogContent dividers>
                    {info === undefined ? null : (
                        <HelpBlock
                            lines={info}
                            testId="config-indexer-dialog-info"
                        />
                    )}
                    {indexerText(searchModuleType) === "TORZNAB" ? (
                        <HelpBlock
                            lines={[TORZNAB_NOTE]}
                            testId="config-indexer-torznab-note"
                        />
                    ) : null}
                    {capabilityControls && banner !== undefined ? (
                        <HelpBlock
                            lines={[
                                banner === "incomplete-config"
                                    ? INCOMPLETE_CONFIG_MESSAGE
                                    : INCOMPLETE_CAPS_MESSAGE,
                            ]}
                            severity={
                                banner === "incomplete-config"
                                    ? "error"
                                    : "warning"
                            }
                            testId={`config-indexer-banner-${banner}`}
                        />
                    ) : null}
                    <FormProvider {...draft}>
                        {shows("name") ? (
                            <TextSetting
                                label="Name"
                                name={draftFieldPath("name")}
                                required
                                validate={nameValidator}
                            />
                        ) : null}
                        {shows("state") ? (
                            <IndexerStateRow
                                help={indexerStateHelp(watched.state)}
                                configComplete={watched.configComplete === true}
                            />
                        ) : null}
                        {shows("host") ? (
                            <TextSetting
                                help={
                                    indexerText(searchModuleType) === "TORZNAB"
                                        ? "If you use Jackett and have an external URL use that one"
                                        : undefined
                                }
                                label="Host"
                                name={draftFieldPath("host")}
                                placeholder="http://www.someindexer.com"
                                required
                            />
                        ) : null}
                        {/*
                         * `IndexerConfig.apiKey`, `username`, and `password`
                         * are `@HiddenInUI`, so an existing entry arrives
                         * holding `***UNCHANGED***` and must send it back
                         * untouched unless the admin types a new one — which
                         * both checks rely on, since
                         * `IndexerChecker.resolveUnchangedSensitiveFields`
                         * looks the stored value up by indexer name.
                         */}
                        {shows("apiKey") ? (
                            <SecretInput
                                label="API Key"
                                name={draftFieldPath("apiKey")}
                            />
                        ) : null}
                        {shows("apiPath") ? (
                            <TextSetting
                                advanced
                                help="Path to the API. If empty /api is used"
                                label="API path"
                                name={draftFieldPath("apiPath")}
                            />
                        ) : null}
                        {shows("username") ? (
                            <SecretInput
                                help={
                                    isWtfNzb
                                        ? "See the API help on the website. Copy the user ID from the example API request where it says i=<yourUserId> (e.g. ABg4Cd==)"
                                        : "Only needed if indexer requires HTTP auth for API access (rare)."
                                }
                                label="Username"
                                name={draftFieldPath("username")}
                                required={isWtfNzb}
                            />
                        ) : null}
                        {shows("password") &&
                        indexerText(watched.username) !== "" ? (
                            <SecretInput
                                help="Only needed if indexer requires HTTP auth for API access (rare)."
                                label="Password"
                                name={draftFieldPath("password")}
                            />
                        ) : null}
                        {shows("score") ? (
                            <NumberSetting
                                help="When duplicate search results are found the result from the indexer with the highest number will be selected."
                                label="Priority"
                                name={draftFieldPath("score")}
                                required
                                tooltip="The priority determines which indexer is used if duplicate results are found (i.e. results that link to the same upload, not just results with the same name). The result from the indexer with the highest number is shown first in the GUI and returned for API searches."
                            />
                        ) : null}
                        {shows("timeout") ? (
                            <NumberSetting
                                advanced
                                help='Supercedes the general timeout in "Searching".'
                                label="Timeout"
                                minimum={1}
                                name={draftFieldPath("timeout")}
                            />
                        ) : null}
                        <ChipsSetting
                            advanced
                            help={[
                                "Determines when an indexer should be selected. See ",
                                {
                                    href: "https://github.com/theotherp/nzbhydra2/wiki/Indexer-schedules",
                                    text: "wiki",
                                },
                                ". You can enter multiple time spans. Apply values with return key.",
                            ]}
                            label="Schedule"
                            name={draftFieldPath("schedule")}
                        />
                        {shows("hitLimit") ? (
                            <NumberSetting
                                help='Maximum number of API hits since "API hit reset time".'
                                label="API hit limit"
                                name={draftFieldPath("hitLimit")}
                                tooltip="When the maximum number of API hits is reached the indexer isn't used anymore. Only API hits done by NZBHydra are taken into account."
                                validate={greaterThanZeroValidator}
                            />
                        ) : null}
                        {shows("downloadLimit") ? (
                            <NumberSetting
                                help='When # of downloads since "Hit reset time" is reached indexer will not be searched.'
                                label="Download limit"
                                name={draftFieldPath("downloadLimit")}
                                validate={greaterThanZeroValidator}
                            />
                        ) : null}
                        {shows("hitLimitResetTime") &&
                        (watched.hitLimit || watched.downloadLimit) ? (
                            <NumberSetting
                                help="UTC hour of day at which the API hit counter is reset (0-23). Leave empty for a rolling reset counter."
                                label="Hit reset time"
                                name={draftFieldPath("hitLimitResetTime")}
                                tooltip="Either define the time of day when the counter is reset by the indexer or leave it empty to use a rolling reset counter, meaning the number of hits for the last 24h at the time of the search is limited."
                                validate={hourOfDayValidator}
                            />
                        ) : null}
                        {shows("loadLimitOnRandom") ? (
                            <NumberSetting
                                advanced
                                help="If set indexer will only be picked for one out of x API searches (on average)."
                                label="Load limiting"
                                name={draftFieldPath("loadLimitOnRandom")}
                                tooltip="For indexers with a low API hit limit you can enable load limiting. Define any number n so that the indexer will only be used for searches in 1/n cases (on average). For example if you define a load limit of 5 the indexer will only be picked every fifth search."
                                validate={greaterThanOneValidator}
                            />
                        ) : null}
                        {shows("minSeeders") ? (
                            <NumberSetting
                                help="Torznab results with fewer seeders will be ignored. Supercedes any setting made in the searching config."
                                label="Minimum # seeders"
                                name={draftFieldPath("minSeeders")}
                            />
                        ) : null}
                        {shows("userAgent") ? (
                            <TextSetting
                                advanced
                                help="Rarely needed. Will supercede the one in the main searching settings."
                                label="User agent"
                                name={draftFieldPath("userAgent")}
                            />
                        ) : null}
                        {shows("customParameters") ? (
                            <ChipsSetting
                                advanced
                                help='Define custom parameters to be sent to the indexer when searching. Use the format "name=value". Apply values with return key.'
                                label="Custom parameters"
                                name={draftFieldPath("customParameters")}
                            />
                        ) : null}
                        {shows("attributeWhitelist") ? (
                            <ChipsSetting
                                advanced
                                help='Only accept results with matching attributes. Use format "name=value" (e.g., "subs=English"). Multiple entries use OR logic. Comma-separated values use AND logic (e.g., "subs=English,French" requires both). Apply values with return key. Results with no attributes will be rejected.'
                                label="Attribute whitelist"
                                name={draftFieldPath("attributeWhitelist")}
                            />
                        ) : null}
                        {shows("attributeWhitelistCategories") &&
                        indexerList(watched.attributeWhitelist).length > 0 ? (
                            <MultiSelectSetting
                                advanced
                                emptyLabel="All"
                                help="Apply attribute whitelist only to results in these categories. Selecting none applies the whitelist to all categories."
                                label="Whitelist categories"
                                name={draftFieldPath(
                                    "attributeWhitelistCategories",
                                )}
                                options={categoryOptions}
                            />
                        ) : null}
                        {watched.enabledForSearchSource ===
                        "EXTERNAL" ? null : (
                            <SwitchSetting
                                help="Preselect this indexer on the search page."
                                label="Preselect"
                                name={draftFieldPath("preselect")}
                            />
                        )}
                        {shows("enabledForSearchSource") ? (
                            <SelectSetting
                                advanced
                                help='Select for which searches this indexer will be used. "Update queries" are searches without query or ID (e.g. done by Sonarr periodically).'
                                label="Enable for..."
                                name={draftFieldPath("enabledForSearchSource")}
                                options={SEARCH_SOURCE_OPTIONS}
                            />
                        ) : null}
                        {/*
                         * Legacy pairs this text field with a colour picker and
                         * a clear button (`color-control.html`); the field
                         * itself, holding the `rgb(...)` string, is the control
                         * that is carried forward. The picker is recorded as a
                         * gap on `F-CONFIG-INDEXERS`.
                         */}
                        <TextSetting
                            advanced
                            help="If set it will be used in the search results to mark the indexer's results."
                            label="Color"
                            name={draftFieldPath("color")}
                            tooltip="To mark expanded results they're shown in a darker shade so it's recommended to use indexer colors which not only differ in lightness"
                        />
                        <ChipsSetting
                            advanced
                            help="Assign this indexer to one or more groups. These can be selected from the search page. Apply values with return key."
                            label="Indexer groups"
                            name={draftFieldPath("groupNames")}
                            suggestions={suggestions}
                        />
                        <TextSetting
                            help='Enter when your VIP access expires and NZBHydra will track it and warn you when close to expiry. Enter as YYYY-MM-DD or "Lifetime".'
                            label="VIP expiry"
                            name={draftFieldPath("vipExpirationDate")}
                            validate={vipExpirationValidator}
                        />
                        {shows("enabledCategories") ? (
                            <MultiSelectSetting
                                advanced
                                emptyLabel="None/All"
                                help="Only use indexer when searching for these and also reject results from others. Selecting none equals selecting all."
                                label="Categories"
                                name={draftFieldPath("enabledCategories")}
                                options={categoryOptions}
                            />
                        ) : null}
                        {capabilityControls ? (
                            <>
                                <MultiSelectSetting
                                    advanced
                                    label="Search IDs"
                                    name={draftFieldPath("supportedSearchIds")}
                                    options={SEARCH_ID_OPTIONS}
                                />
                                <MultiSelectSetting
                                    advanced
                                    label="Search types"
                                    name={draftFieldPath(
                                        "supportedSearchTypes",
                                    )}
                                    options={SEARCH_TYPE_OPTIONS}
                                />
                                {indexerText(watched.host) !== "" &&
                                indexerText(watched.name) !== "" ? (
                                    <Stack spacing={0.5} sx={{mb: 2.5}}>
                                        <Button
                                            data-testid="config-indexer-check-caps"
                                            disabled={busy}
                                            onClick={() => void checkCapsNow()}
                                            sx={{alignSelf: "flex-start"}}
                                            type="button"
                                            variant="outlined"
                                        >
                                            Check capabilities
                                        </Button>
                                        <Typography variant="body2">
                                            Find out what search types and IDs
                                            the indexer supports.
                                        </Typography>
                                    </Stack>
                                ) : null}
                            </>
                        ) : null}
                        {shows("generalMinSize") ? (
                            <NumberSetting
                                help="NZBIndex returns a lot of crap with small file sizes. Set this value and all smaller results will be filtered out no matter the category"
                                label="Min size"
                                name={draftFieldPath("generalMinSize")}
                            />
                        ) : null}
                        {shows("binsearchOtherGroups") ? (
                            <SwitchSetting
                                help="If disabled binsearch will only search in the most popular usenet groups"
                                label="Search in other groups"
                                name={draftFieldPath("binsearchOtherGroups")}
                            />
                        ) : null}
                    </FormProvider>
                    {checkingConnection ? (
                        <Stack
                            alignItems="center"
                            data-testid="config-indexer-dialog-checking"
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
                        <Tooltip title={DELETE_WARNING}>
                            <span style={{marginRight: "auto"}}>
                                <Button
                                    color="error"
                                    data-testid="config-indexer-dialog-delete"
                                    disabled={busy}
                                    onClick={onDelete}
                                    startIcon={<DeleteIcon />}
                                    type="button"
                                >
                                    Delete
                                </Button>
                            </span>
                        </Tooltip>
                    )}
                    <Button
                        data-testid="config-indexer-dialog-cancel"
                        disabled={busy}
                        onClick={onCancel}
                        type="button"
                    >
                        Cancel
                    </Button>
                    <Button
                        data-testid="config-indexer-dialog-reset"
                        disabled={busy}
                        onClick={() => draft.reset()}
                        type="button"
                    >
                        Reset
                    </Button>
                    <Button
                        data-testid="config-indexer-dialog-submit"
                        disabled={busy}
                        onClick={() => void submit()}
                        type="button"
                        variant="contained"
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
            {capsRequest === null ? null : (
                <CapsCheckDialog
                    onFailed={() => finishCapsCheck(null)}
                    onResolved={(results) =>
                        finishCapsCheck(results[0] ?? null)
                    }
                    request={capsRequest}
                    transport={transport}
                />
            )}
        </>
    );
}

/** Bound to the draft form, so the state edit is part of the transaction. */
function IndexerStateRow({
    configComplete,
    help,
}: {
    configComplete: boolean;
    help?: string;
}) {
    return (
        <IndexerStateSwitch
            configComplete={configComplete}
            help={help}
            label="State"
            name={draftFieldPath("state")}
        />
    );
}
