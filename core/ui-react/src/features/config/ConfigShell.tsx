import {Alert, Box, CircularProgress, Stack, Typography} from "@mui/material";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Outlet, useBlocker, useLocation} from "@tanstack/react-router";
import {useState} from "react";
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
import {
    countDirtyFields,
    dirtyConfigTabs,
    invalidConfigTabs,
} from "./configFormState";
import {ConfigNav} from "./ConfigNav";
import {ConfigSaveBar} from "./ConfigSaveBar";
import {activeConfigTab, isConfigLocation} from "./configTabs";
import {useConfigSave} from "./useConfigSave";

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
    const save = useConfigSave({form, restart: restart.restart, transport});
    const [showAdvanced, setShowAdvanced] = useState(readShowAdvanced);
    const [saving, setSaving] = useState(false);
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

    const submit = async () => {
        // Legacy refuses to submit an invalid form and only says so in a growl
        // (`config-controller.js:158-189`); the field-level messages are
        // already on screen next to the offending controls. `trigger()` also
        // marks every field validated, so a message appears for a control the
        // admin never touched.
        if (!(await form.trigger())) {
            toasts.showToast({
                message: "Config invalid. Please check your settings.",
                severity: "error",
            });
            return "rejected";
        }
        setSaving(true);
        try {
            return await save();
        } finally {
            setSaving(false);
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
                        saving={saving}
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
                {restart.dialog}
            </ShowAdvancedContext.Provider>
        </FormProvider>
    );
}
