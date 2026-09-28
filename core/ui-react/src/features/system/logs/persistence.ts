import {readItem} from "../../../domain/storage/browserStorage";
import {
    readPreference,
    writePreference,
} from "../../../services/preferences/userPreferences";

const AUTO_REFRESH_KEY = "hydra.system-log.auto-refresh";
const TAIL_KEY = "hydra.system-log.tail";

/**
 * Legacy persisted the raw view's two toggles under `doUpdateLog`/`doTailLog`
 * (`hydra-log.js:13-14`). The keys are namespaced here rather than reused: the
 * legacy shell reads its own values through `localStorageService`, which
 * prefixes and JSON-encodes them, and neither UI should be able to corrupt the
 * other's state while both shells exist (ADR-0001).
 *
 * ADR-0057 moved both into the `systemLog` section of the user's preferences;
 * the old keys are read once, to migrate a value this browser already had.
 */
export function loadAutoRefresh(): boolean {
    return readFlag("autoRefresh", AUTO_REFRESH_KEY);
}

export function saveAutoRefresh(value: boolean): void {
    writePreference("systemLog", "autoRefresh", value);
}

export function loadTail(): boolean {
    return readFlag("tail", TAIL_KEY);
}

export function saveTail(value: boolean): void {
    writePreference("systemLog", "tail", value);
}

/** Legacy's default for both toggles is off (`hydra-log.js:13-14`). */
function readFlag(option: string, legacyKey: string): boolean {
    return (
        readPreference("systemLog", option, () => legacyFlag(legacyKey)) ===
        true
    );
}

function legacyFlag(key: string): boolean | undefined {
    const raw = readItem(key);
    return raw === "true" ? true : raw === "false" ? false : undefined;
}
