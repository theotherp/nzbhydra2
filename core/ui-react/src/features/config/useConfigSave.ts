import {useQueryClient} from "@tanstack/react-query";
import {useCallback} from "react";
import type {UseFormReturn} from "react-hook-form";

import {CONFIG_QUERY_KEY, getConfig, saveConfig} from "../../api/config/config";
import {SAFE_CONFIG_QUERY_KEY} from "../../api/config/safeConfig";
import type {ConfigValues} from "../../api/config/schema";
import {ApiError, ApiTransport} from "../../api/transport";
import {useDialogs} from "../../components/dialogs/dialogs";
import {useToasts} from "../../components/toasts/toasts";

type ConfigSaveOutcome =
    /** Persisted; the form now holds the server's own view of the config. */
    | "saved"
    /** The server refused it; nothing was written and the form stays dirty. */
    | "rejected"
    /** The request never produced a validation result. */
    | "failed";

export type ConfigSave = () => Promise<ConfigSaveOutcome>;

/**
 * The save half of `C-CONFIG-FORM`, mapping `ConfigValidationResult`
 * (`ConfigWeb.setConfig`) onto the UI:
 *
 * - `errorMessages` -> a blocking dialog; `ConfigWeb.java:84` only writes the
 *   file when validation passed, so the form deliberately stays dirty;
 * - `ok` plus `warningMessages` -> the config *is* saved and the dialog says
 *   so, matching legacy's wording (`config-controller.js:126`);
 * - success -> the form resets from `newConfig`, never from what was
 *   submitted: the server normalizes the config and re-masks secrets before
 *   returning it (`ConfigWeb.java:96`,
 *   `SensitiveDataConfigValidator.prepareForDisplay`);
 * - `restartNeeded` -> hands over to `C-RESTART-COORDINATOR`;
 * - a transport failure -> an error toast, never a silent success.
 *
 * ADR-0017: there is no page reload. The safe-config query is invalidated
 * instead, which is what refreshes the navigation, the stats tabs, and the
 * history routes' metadata.
 */
export function useConfigSave({
    form,
    restart,
    transport,
}: {
    form: UseFormReturn<ConfigValues>;
    restart: (prefix?: string) => Promise<void>;
    transport: ApiTransport;
}): ConfigSave {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const queryClient = useQueryClient();

    return useCallback(async (): Promise<ConfigSaveOutcome> => {
        let result;
        try {
            result = await saveConfig(transport, form.getValues());
        } catch (error) {
            toasts.showToast({
                message: saveFailureMessage(error),
                severity: "error",
            });
            return "failed";
        }

        if (!result.ok || result.errorMessages.length > 0) {
            await dialogs.confirm({
                title: "Config validation failed",
                message:
                    "The following errors have been found in your config. They need to be fixed.",
                details: [
                    ...(result.errorMessages.length > 0
                        ? result.errorMessages
                        : ["The server rejected the configuration."]),
                    ...result.warningMessages.map(
                        (warning) => `Warning (may be ignored): ${warning}`,
                    ),
                ],
                confirmLabel: "OK",
                variant: "acknowledge",
                testId: "config-validation-errors",
            });
            return "rejected";
        }

        const saved = result.newConfig ?? (await getConfig(transport));
        queryClient.setQueryData(CONFIG_QUERY_KEY, saved);
        form.reset(saved);
        await queryClient.invalidateQueries({queryKey: SAFE_CONFIG_QUERY_KEY});

        if (result.warningMessages.length > 0) {
            await dialogs.confirm({
                title: "Config validation warnings",
                message:
                    "The following warnings have been found. You can ignore them if you wish. The config was already saved.",
                details: result.warningMessages,
                confirmLabel: "OK",
                variant: "acknowledge",
                testId: "config-validation-warnings",
            });
        } else {
            toasts.showToast({
                message: "Configuration saved.",
                severity: "success",
            });
        }

        if (result.restartNeeded) {
            const answer = await dialogs.confirm({
                title: "Restart required",
                message:
                    "The changes you have made may require a restart to be effective. Do you want to restart now?",
                confirmLabel: "Yes",
                cancelLabel: "No",
                testId: "config-restart-required",
            });
            if (answer === "confirmed") {
                await restart();
            }
        }

        return "saved";
    }, [dialogs, form, queryClient, restart, toasts, transport]);
}

function saveFailureMessage(error: unknown): string {
    const detail =
        error instanceof ApiError && typeof error.data === "string"
            ? error.data
            : error instanceof Error
              ? error.message
              : "";
    return detail
        ? `Unable to save the configuration. ${detail}`
        : "Unable to save the configuration.";
}
