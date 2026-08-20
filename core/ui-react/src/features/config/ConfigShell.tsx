import {
    Alert,
    Box,
    Button,
    CircularProgress,
    FormControlLabel,
    Stack,
    Switch,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {Link, Outlet, useBlocker, useLocation} from "@tanstack/react-router";
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
    activeConfigTab,
    CONFIG_TABS,
    configTabHref,
    configTabTestId,
    isConfigLocation,
} from "./configTabs";
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
    const isDirty = form.formState.isDirty;

    const submit = async () => {
        setSaving(true);
        try {
            return await save();
        } finally {
            setSaving(false);
        }
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
                form.reset(
                    queryClient.getQueryData<ConfigValues>(CONFIG_QUERY_KEY) ??
                        initialConfig,
                );
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
                    sx={{py: 3}}
                >
                    <Stack
                        alignItems={{md: "center"}}
                        direction={{xs: "column", md: "row"}}
                        justifyContent="space-between"
                        spacing={2}
                    >
                        <Tabs
                            aria-label="Configuration"
                            value={activeTab.path}
                            variant="scrollable"
                        >
                            {CONFIG_TABS.map((tab) => (
                                <Tab
                                    component={Link}
                                    data-testid={configTabTestId(tab)}
                                    key={tab.path}
                                    label={tab.label}
                                    to={configTabHref(tab)}
                                    value={tab.path}
                                />
                            ))}
                        </Tabs>
                        <Stack
                            alignItems="center"
                            direction="row"
                            spacing={1}
                            sx={{flexShrink: 0}}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={showAdvanced}
                                        data-testid="config-advanced-toggle"
                                        onChange={(event) =>
                                            toggleAdvanced(event.target.checked)
                                        }
                                    />
                                }
                                label="Advanced settings"
                            />
                            <Button
                                data-testid="config-api-help"
                                onClick={() => void openApiHelp()}
                                type="button"
                            >
                                API?
                            </Button>
                            <Button
                                // Legacy signalled unsaved changes on the Save
                                // button itself (`config.html:21`: success
                                // colour while pristine, an attention colour
                                // while a save is needed). Same signal, stock
                                // palette colours instead of a pulse class.
                                color={isDirty ? "primary" : "success"}
                                data-testid="config-save"
                                disabled={saving}
                                type="submit"
                                variant="contained"
                            >
                                Save
                            </Button>
                        </Stack>
                    </Stack>
                    <Box sx={{pt: 3}}>
                        <Outlet />
                    </Box>
                </Box>
                {restart.dialog}
            </ShowAdvancedContext.Provider>
        </FormProvider>
    );
}
