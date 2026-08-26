import {
    Alert,
    Box,
    CircularProgress,
    Portal,
    Stack,
    Typography,
    type SxProps,
    type Theme,
} from "@mui/material";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Outlet, useBlocker, useLocation} from "@tanstack/react-router";
import {useCallback, useState} from "react";
import {FormProvider, useForm} from "react-hook-form";

import {
    CONFIG_QUERY_KEY,
    configQueryOptions,
    getApiHelp,
} from "../../api/config/config";
import type {ConfigValues} from "../../api/config/schema";
import {ApiTransport} from "../../api/transport";
import {useDialogs} from "../../components/dialogs/dialogs";
import {useToasts} from "../../components/toasts/toasts";
import {useRestartCoordinator} from "../../services/restart/useRestartCoordinator";
import {
    readShowAdvanced,
    ShowAdvancedContext,
    writeShowAdvanced,
} from "./advancedFields";
import {AdvancedRevealRequestContext} from "./components/advancedDisclosure";
import {ConfigErrorReport, ConfigFeedbackBanner} from "./ConfigFeedbackBanner";
import {
    countDirtyFields,
    dirtyConfigTabs,
    invalidConfigTabs,
} from "./configFormState";
import {ConfigNav} from "./ConfigNav";
import {ConfigSaveBar} from "./ConfigSaveBar";
import {activeConfigTab, isConfigLocation} from "./configTabs";
import {ReviewChangesPanel} from "./reviewChanges/ReviewChangesPanel";
import {computeConfigChanges} from "./reviewChanges/reviewChangesDiff";
import {SettingsSearchField} from "./settingsSearch/SettingsSearchField";
import type {SettingsIndexEntry} from "./settingsSearch/settingsIndex";
import {useSettingsNavigation} from "./settingsSearch/useSettingsNavigation";
import {useConfigSave} from "./useConfigSave";

/** A stable empty list, so "nothing to report" is not a new array every render. */
const NO_MESSAGES: readonly string[] = [];

/**
 * The layer the error report is raised onto while FM-100's review panel is
 * open: pinned to the top of the viewport, one step above MUI's modal layer so
 * it clears the panel and its backdrop, and transparent to pointer input so
 * everything it does not cover stays clickable.
 *
 * `zIndex.modal + 1` rather than a literal, because the number it has to beat
 * is the panel's own and both come from the same theme.
 */
const RAISED_REPORT_SX: SxProps<Theme> = {
    display: "flex",
    justifyContent: "center",
    left: 0,
    p: 2,
    pointerEvents: "none",
    position: "fixed",
    right: 0,
    top: 0,
    zIndex: (theme) => theme.zIndex.modal + 1,
};

/**
 * `F-CONFIG-SHELL`: the configuration area's route component. It owns the
 * whole-`BaseConfig` round trip — one fetch, one React Hook Form shared by
 * every tab, one PUT — because `ConfigWeb.setConfig` replaces the entire file
 * on every save and a partially loaded config would destroy the rest of it.
 */
export function ConfigShell({transport}: {transport: ApiTransport}) {
    const query = useQuery(configQueryOptions(transport));

    if (query.isPending) {
        return (
            <Stack alignItems="center" role="status" spacing={2} sx={{py: 8}}>
                <CircularProgress variant="indeterminate" />
                <Typography>Loading configuration…</Typography>
            </Stack>
        );
    }
    if (query.isError) {
        return (
            <Alert severity="error" sx={{my: 3}}>
                Unable to load the configuration.
            </Alert>
        );
    }
    return <ConfigForm initialConfig={query.data} transport={transport} />;
}

function ConfigForm({
    initialConfig,
    transport,
}: {
    initialConfig: ConfigValues;
    transport: ApiTransport;
}) {
    const form = useForm<ConfigValues>({
        defaultValues: initialConfig,
        // Every tab edits the same config object, but only one tab is mounted
        // at a time; unregistering a field on unmount would drop the edits an
        // admin made before switching tabs.
        shouldUnregister: false,
    });
    const dialogs = useDialogs();
    const toasts = useToasts();
    const queryClient = useQueryClient();
    const restart = useRestartCoordinator(transport);
    const {clearFeedback, feedback, save} = useConfigSave({
        form,
        restart: restart.restart,
        transport,
    });
    const [showAdvanced, setShowAdvanced] = useState(readShowAdvanced);
    const [saving, setSaving] = useState(false);
    const [reviewOpen, setReviewOpen] = useState(false);
    // FM-101: whether a save attempt was refused by the form itself. Only the
    // flag is stored -- *which* settings are invalid is the form's own error
    // tree, handed to the banner on every render, so the report is derived
    // from the live state rather than from a copy taken at submit time.
    const [refusedBySelf, setRefusedBySelf] = useState(false);
    // FM-099: routing to a searched setting, revealing it when an advanced
    // gate hides it, and marking it once it is on screen.
    const settingsNavigation = useSettingsNavigation();
    const {navigateToSetting} = settingsNavigation;
    const pathname = useLocation({select: (location) => location.pathname});
    const activeTab = activeConfigTab(pathname);
    const {dirtyFields, errors, isDirty} = form.formState;
    // Derived from the same RHF state the sticky bar's own dirty branch reads,
    // so a section badge can never disagree with the bar's summary. Recomputed
    // on every render rather than memoized on the two trees' identity: React
    // Hook Form mutates `errors` and `dirtyFields` in place as often as it
    // replaces them, so an identity-keyed `useMemo` here silently serves a
    // stale badge set (observed: the invalid dot never appeared after a
    // rejected save). Both walks are over a config-sized object.
    const dirtyCount = countDirtyFields(dirtyFields);
    const dirtyTabs = dirtyConfigTabs(dirtyFields);
    const invalidTabs = invalidConfigTabs(errors);
    // FM-100's review rows, computed only while the panel is open and read
    // straight off the form: `defaultValues` is the "old" side because
    // `useConfigSave` re-baselines it with `form.reset(saved)` after every
    // successful save, so the initial fetch stops being the truth the moment
    // one save succeeds. Reading is all this does — no `setValue`, no
    // `trigger`, nothing that could mark a field the admin never touched.
    const reviewChanges = reviewOpen
        ? computeConfigChanges({
              current: form.getValues(),
              dirtyFields,
              previous: form.formState.defaultValues,
          })
        : [];

    // The two halves of the save report, as both surfaces take them.
    const errorMessages =
        feedback?.kind === "errors" ? feedback.messages : NO_MESSAGES;
    const warningMessages =
        feedback?.kind === "warnings" ? feedback.messages : NO_MESSAGES;
    const invalidErrors = refusedBySelf ? errors : undefined;
    // `refusedBySelf` is set only where `form.trigger()` returned false, which
    // means the error tree holds at least one entry, so this is the same
    // answer the banner reaches by walking that tree.
    const hasErrorReport = errorMessages.length > 0 || refusedBySelf;

    const dismissErrorReport = useCallback(() => {
        clearFeedback();
        setRefusedBySelf(false);
    }, [clearFeedback]);

    const selectInvalidField = useCallback(
        (entry: SettingsIndexEntry) => {
            // FM-100's panel is what the entry has to get out from under: it
            // covers the setting being navigated to, so "take me to this
            // setting" is the admin leaving the review of their own accord.
            // That is a navigation, not a save outcome, so FM-100's contract
            // that the panel closes only on a real "saved" is untouched — the
            // panel still survives every rejection on its own.
            setReviewOpen(false);
            navigateToSetting(entry);
        },
        [navigateToSetting],
    );

    const submit = async () => {
        // Every save attempt starts from a clean slate: the previous report is
        // about a config that is no longer the one being submitted.
        clearFeedback();
        setRefusedBySelf(false);
        // Legacy refuses to submit an invalid form and only says so in a growl
        // (`config-controller.js:158-189`), which named none of the offending
        // settings and was gone a moment later; FM-101 names them in the
        // banner instead, each one a way to the control. `trigger()` also
        // marks every field validated, so a message appears for a control the
        // admin never touched -- including one on a tab that is not mounted,
        // which is exactly what the banner is for.
        if (!(await form.trigger())) {
            setRefusedBySelf(true);
            return "rejected";
        }
        setSaving(true);
        try {
            return await save();
        } finally {
            setSaving(false);
        }
    };

    // The panel's Save is the form's own Save, not a second path to the
    // server: same `trigger()`, same validation report, same restart handoff.
    // It closes only on a real "saved" (FM-100); a rejected config leaves it
    // open, and the report it was rejected with is raised above it rather than
    // left underneath, where the panel's own backdrop and `aria-hidden` would
    // put it out of reach.
    const saveFromReview = async () => {
        if ((await submit()) === "saved") {
            setReviewOpen(false);
        }
    };

    // The one definition of "throw the edits away": the sticky bar's Discard
    // and the unsaved-changes guard's Discard answer are the same act, so they
    // reset from the same cached server copy rather than from two expressions
    // that could drift.
    const discardChanges = () => {
        form.reset(
            queryClient.getQueryData<ConfigValues>(CONFIG_QUERY_KEY) ??
                initialConfig,
        );
    };

    useBlocker({
        disabled: !isDirty,
        enableBeforeUnload: () => form.formState.isDirty,
        shouldBlockFn: async ({next}) => {
            // Moving between config tabs is not leaving the form.
            if (!form.formState.isDirty || isConfigLocation(next.pathname)) {
                return false;
            }
            const answer = await dialogs.confirm({
                title: "Unsaved changes",
                message: "Do you want to save before leaving?",
                confirmLabel: "Save",
                denyLabel: "Discard",
                cancelLabel: "Cancel",
                testId: "config-unsaved-changes",
            });
            if (answer === "confirmed") {
                return (await submit()) !== "saved";
            }
            if (answer === "denied") {
                discardChanges();
                return false;
            }
            return true;
        },
    });

    const openApiHelp = async () => {
        // The endpoint reports the *saved* API key, so offering it while the
        // form holds a different one would be a lie (`config-controller.js:274`).
        if (isDirty) {
            toasts.showToast({
                message: "Please save first",
                severity: "info",
            });
            return;
        }
        let help;
        try {
            help = await getApiHelp(transport);
        } catch {
            toasts.showToast({
                message: "Unable to load the API information.",
                severity: "error",
            });
            return;
        }
        await dialogs.confirm({
            title: "API infos",
            message: "Use these endpoints to query NZBHydra2 from other tools.",
            details: [
                `Newznab API endpoint: ${help.newznabApi}`,
                `Torznab API endpoint: ${help.torznabApi}`,
                `API key: ${help.apiKey}`,
            ],
            confirmLabel: "OK",
            variant: "acknowledge",
            testId: "config-api-help-dialog",
        });
    };

    const toggleAdvanced = (value: boolean) => {
        setShowAdvanced(value);
        writeShowAdvanced(value);
    };

    return (
        <FormProvider {...form}>
            <ShowAdvancedContext.Provider value={showAdvanced}>
                <AdvancedRevealRequestContext.Provider
                    value={settingsNavigation.revealRequest}
                >
                    <Box
                        component="form"
                        data-testid="config-shell"
                        noValidate
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submit();
                        }}
                        sx={{pb: 3}}
                    >
                        <ConfigSaveBar
                            dirty={isDirty}
                            dirtyCount={dirtyCount}
                            onDiscard={discardChanges}
                            onReviewChanges={() => setReviewOpen(true)}
                            saving={saving}
                            search={
                                <SettingsSearchField
                                    onSelect={
                                        settingsNavigation.navigateToSetting
                                    }
                                />
                            }
                        />
                        {/* Below the sticky bar and above the tab body, so a
                            report about a setting on another tab is on screen
                            wherever the admin is standing, and stays there
                            while they move between tabs looking for it. The
                            error half stands down while the review panel is
                            open — the panel makes this whole subtree
                            `aria-hidden` and unclickable, so the raised layer
                            below is the report for as long as that lasts. */}
                        <ConfigFeedbackBanner
                            errorMessages={
                                reviewOpen ? NO_MESSAGES : errorMessages
                            }
                            invalidErrors={
                                reviewOpen ? undefined : invalidErrors
                            }
                            onDismissErrors={dismissErrorReport}
                            onDismissWarnings={clearFeedback}
                            onSelectField={selectInvalidField}
                            warningMessages={warningMessages}
                        />
                        <Stack
                            direction={{xs: "column", md: "row"}}
                            spacing={3}
                            sx={{pt: 3}}
                        >
                            <ConfigNav
                                activeTabPath={activeTab.path}
                                dirtyTabs={dirtyTabs}
                                invalidTabs={invalidTabs}
                                onOpenApiHelp={() => void openApiHelp()}
                                onToggleAdvanced={toggleAdvanced}
                                showAdvanced={showAdvanced}
                            />
                            <Box sx={{flexGrow: 1, minWidth: 0}}>
                                <Outlet />
                            </Box>
                        </Stack>
                    </Box>
                    <ReviewChangesPanel
                        changes={reviewChanges}
                        onClose={() => setReviewOpen(false)}
                        onSave={() => void saveFromReview()}
                        open={reviewOpen}
                        saving={saving}
                    />
                    {/* FM-101 correction. While FM-100's panel is open the
                        whole config area is a `Modal` sibling that MUI marks
                        `aria-hidden="true"`, so a report left in place is in
                        the DOM and out of the accessibility tree, with its
                        entries — the only means FM-101 gives of *acting* on a
                        refused save — stranded behind the backdrop. Both
                        affordances FM-101 replaced rendered above the panel,
                        so leaving the report underneath was a regression.

                        The report moves rather than duplicating: the banner
                        renders nothing while the panel is open and this layer
                        carries the same markup, the same
                        `config-validation-errors` testid and the same entries.
                        It is a `Portal` and not a toast because `Snackbar`
                        does not portal — the toast surface sits inside the
                        very subtree the panel hides, so a toast here would be
                        just as unreachable (measured, not assumed). Being its
                        own body child mounted after the panel, this layer is
                        outside what `ModalManager` hid; `ConfigShell.test.tsx`
                        asserts that from the ancestor chain, including for a
                        report that predates the panel, rather than from the
                        element merely existing.

                        Warnings need no such layer: a warnings-only save *is*
                        a save, so the panel has already closed. */}
                    {reviewOpen && hasErrorReport && (
                        <Portal>
                            <Box sx={RAISED_REPORT_SX}>
                                <Alert
                                    data-testid="config-validation-errors"
                                    onClose={dismissErrorReport}
                                    severity="error"
                                    sx={{
                                        // Only the report itself takes clicks;
                                        // its container spans the viewport and
                                        // must not swallow the panel's own
                                        // controls, which stay usable — the
                                        // admin can Save again without
                                        // acknowledging anything, exactly as
                                        // they can with the banner.
                                        maxWidth: 720,
                                        overflowWrap: "anywhere",
                                        pointerEvents: "auto",
                                        width: "100%",
                                    }}
                                    variant="filled"
                                >
                                    <ConfigErrorReport
                                        errorMessages={errorMessages}
                                        invalidErrors={invalidErrors}
                                        onSelectField={selectInvalidField}
                                        surface="filled"
                                    />
                                </Alert>
                            </Box>
                        </Portal>
                    )}
                    {settingsNavigation.highlight}
                    {restart.dialog}
                </AdvancedRevealRequestContext.Provider>
            </ShowAdvancedContext.Provider>
        </FormProvider>
    );
}
