import {createContext, useContext} from "react";

import {readItem, writeItem} from "../../domain/storage/browserStorage";

export const SHOW_ADVANCED_STORAGE_KEY = "hydra.config.showAdvanced";

/**
 * Whether advanced settings are shown is a per-browser preference and nothing
 * else. There is no `showAdvanced` property anywhere in the Java config
 * (`BaseConfig` and its sections have none), so it must never end up in a
 * saved config: legacy wrote it into the form models
 * (`config-controller.js:44-53`) with a comment claiming the main tab's copy
 * "will be stored to file", which the backend has no field for. Keeping it out
 * of the form also keeps toggling it from marking the form dirty.
 */
export function readShowAdvanced(): boolean {
    return readItem(SHOW_ADVANCED_STORAGE_KEY) === "true";
}

export function writeShowAdvanced(value: boolean): void {
    writeItem(SHOW_ADVANCED_STORAGE_KEY, String(value));
}

export const ShowAdvancedContext = createContext(false);

/** Read by the tab bodies FM-059 onwards add, to gate advanced settings. */
export function useShowAdvanced(): boolean {
    return useContext(ShowAdvancedContext);
}
