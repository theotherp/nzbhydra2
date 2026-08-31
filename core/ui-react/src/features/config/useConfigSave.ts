import {useQueryClient} from "@tanstack/react-query";
import {useCallback, useState} from "react";
import type {Path, UseFormReturn} from "react-hook-form";

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

type ConfigSave = () => Promise<ConfigSaveOutcome>;

/**
 * What the last save attempt has to report, as the banner region renders it.
 * The two kinds are mutually exclusive by contract: `ConfigWeb.setConfig`
 * writes the file only when validation passed, so a result either carries
 * errors and changed nothing, or was saved and may carry warnings.
 */
type ConfigSaveFeedback = {
    kind: "errors" | "warnings";
    messages: readonly string[];
};

export type ConfigSaveController = {
    /** Drop the current report; the next save attempt does this too. */
    clearFeedback: () => void;
    /** What the last save attempt reported, or `null`. */
    feedback: ConfigSaveFeedback | null;
    save: ConfigSave;
};

/**
 * The save half of `C-CONFIG-FORM`, mapping `ConfigValidationResult`
 * (`ConfigWeb.setConfig`) onto the UI:
 *
 * - `errorMessages` -> a persistent error banner (FM-101, replacing an
 *   acknowledge dialog); `ConfigWeb.java:84` only writes the file when
 *   validation passed, so the form deliberately stays dirty;
 * - `ok` plus `warningMessages` -> the config *is* saved and the banner says
 *   so, matching legacy's wording (`config-controller.js:126`);
 * - success -> the form resets from `newConfig`, never from what was
 *   submitted: the server normalizes the config and re-masks secrets before
 *   returning it (`ConfigWeb.java:96`,
 *   `SensitiveDataConfigValidator.prepareForDisplay`) -- but an edit made
 *   *while* the request was in flight is put back over that copy, because the
 *   form stays editable during the save and the server's answer is not about
 *   it;
 * - `restartNeeded` -> hands over to `C-RESTART-COORDINATOR`;
 * - a transport failure -> an error toast, never a silent success.
 *
 * ADR-0017: there is no page reload. The safe-config query is invalidated
 * instead, which is what refreshes the navigation, the stats tabs, and the
 * history routes' metadata.
 *
 * FM-101: the two validation reports are state rather than awaited dialogs.
 * The restart prompt is still awaited and still comes last, but it no longer
 * waits behind an acknowledgement that carried no decision — the warning is on
 * screen while the restart question is answered, which is the order the admin
 * needs them in.
 */
export function useConfigSave({
    form,
    restart,
    transport,
}: {
    form: UseFormReturn<ConfigValues>;
    restart: (prefix?: string) => Promise<void>;
    transport: ApiTransport;
}): ConfigSaveController {
    const dialogs = useDialogs();
    const toasts = useToasts();
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState<ConfigSaveFeedback | null>(null);

    const save = useCallback(async (): Promise<ConfigSaveOutcome> => {
        // Whatever the previous attempt reported is about a config that no
        // longer exists; a report never outlives the next attempt.
        setFeedback(null);
        let result;
        // What is being sent. Kept because the form stays editable while the
        // request is in flight (the sticky bar only disables Save), so
        // anything typed after this point is *not* part of what the server is
        // answering about and must survive the re-baselining below.
        //
        // Deep-cloned, and that is load-bearing: `getValues()` spreads the
        // form's own value object one level deep, so every section below it
        // is the *live* object React Hook Form goes on writing keystrokes
        // into. Without the clone this snapshot follows the form and the
        // comparison below always finds nothing (measured).
        const submitted = structuredClone(form.getValues());
        try {
            result = await saveConfig(transport, submitted);
        } catch (error) {
            toasts.showToast({
                message: saveFailureMessage(error),
                severity: "error",
            });
            return "failed";
        }

        if (!result.ok || result.errorMessages.length > 0) {
            setFeedback({
                kind: "errors",
                messages: [
                    ...(result.errorMessages.length > 0
                        ? result.errorMessages
                        : ["The server rejected the configuration."]),
                    ...result.warningMessages.map(
                        (warning) => `Warning (may be ignored): ${warning}`,
                    ),
                ],
            });
            return "rejected";
        }

        const saved = result.newConfig ?? (await getConfig(transport));
        queryClient.setQueryData(CONFIG_QUERY_KEY, saved);
        // Anything the admin typed while the request was in flight, taken
        // before the reset wipes it. The reset itself is not optional -- the
        // server normalizes the config and re-masks secrets, and
        // `defaultValues` has to become that copy or the review panel and the
        // discard both compare against a config that no longer exists.
        const pending = changedLeaves(submitted, form.getValues());
        form.reset(saved);
        for (const [path, value] of pending) {
            // `shouldDirty` is what puts the edit back into the dirty summary
            // and the unsaved-changes guard; React Hook Form still resolves
            // it against the new `defaultValues`, so an edit that happens to
            // match what the server saved is correctly not dirty.
            form.setValue(path as Path<ConfigValues>, value as never, {
                shouldDirty: true,
            });
        }
        await queryClient.invalidateQueries({queryKey: SAFE_CONFIG_QUERY_KEY});

        if (result.warningMessages.length > 0) {
            setFeedback({
                kind: "warnings",
                messages: result.warningMessages,
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

    const clearFeedback = useCallback(() => setFeedback(null), []);

    return {clearFeedback, feedback, save};
}

/**
 * The leaf paths at which `after` differs from `before`, with their values in
 * `after`.
 *
 * A "leaf" is anything that is not a plain object: a scalar, `null`, or a
 * whole array. Arrays are compared and carried whole because the config's
 * arrays are lists of entries that the list editors replace wholesale
 * (indexers, downloaders, users), so half of a changed list is never a
 * meaningful thing to put back.
 *
 * A key present in `before` and gone from `after` is not reported: that is not
 * something the admin typed, and the form does not drop keys.
 */
function changedLeaves(
    before: unknown,
    after: unknown,
    prefix = "",
): [string, unknown][] {
    if (!isPlainRecord(before) || !isPlainRecord(after)) {
        return JSON.stringify(before) === JSON.stringify(after)
            ? []
            : [[prefix, after]];
    }
    const changed: [string, unknown][] = [];
    for (const [key, value] of Object.entries(after)) {
        changed.push(
            ...changedLeaves(
                before[key],
                value,
                prefix === "" ? key : `${prefix}.${key}`,
            ),
        );
    }
    return changed;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
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
