import {createContext, useContext} from "react";

import {readItem} from "../../domain/storage/browserStorage";
import {
    readPreference,
    writePreference,
} from "../../services/preferences/userPreferences";

const SHOW_ADVANCED_STORAGE_KEY = "hydra.config.showAdvanced";

/**
 * Whether advanced settings are shown is a user preference (ADR-0057: the
 * `config` section; the localStorage key is read once, to migrate this
 * browser's value) and nothing else. There is no `showAdvanced` property anywhere in the Java config
 * (`BaseConfig` and its sections have none), so it must never end up in a
 * saved config: legacy wrote it into the form models
 * (`config-controller.js:44-53`) with a comment claiming the main tab's copy
 * "will be stored to file", which the backend has no field for. Keeping it out
 * of the form also keeps toggling it from marking the form dirty.
 */
export function readShowAdvanced(): boolean {
    return (
        readPreference("config", "showAdvanced", legacyShowAdvanced) === true
    );
}

export function writeShowAdvanced(value: boolean): void {
    writePreference("config", "showAdvanced", value);
}

function legacyShowAdvanced(): boolean | undefined {
    const raw = readItem(SHOW_ADVANCED_STORAGE_KEY);
    return raw === "true" ? true : raw === "false" ? false : undefined;
}

export const ShowAdvancedContext = createContext(false);

/** Read by the tab bodies FM-059 onwards add, to gate advanced settings. */
export function useShowAdvanced(): boolean {
    return useContext(ShowAdvancedContext);
}
