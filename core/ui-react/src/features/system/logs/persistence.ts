import {readItem, writeItem} from "../../../domain/storage/browserStorage";

const AUTO_REFRESH_KEY = "hydra.system-log.auto-refresh";
const TAIL_KEY = "hydra.system-log.tail";

/**
 * Legacy persisted the raw view's two toggles under `doUpdateLog`/`doTailLog`
 * (`hydra-log.js:13-14`). The keys are namespaced here rather than reused: the
 * legacy shell reads its own values through `localStorageService`, which
 * prefixes and JSON-encodes them, and neither UI should be able to corrupt the
 * other's state while both shells exist (ADR-0001).
 *
 * Every access goes through `domain/storage/browserStorage`, which absorbs the
 * three ways `localStorage` can fail; the default-off semantics below stay
 * here, at the call site.
 */
export function loadAutoRefresh(): boolean {
    return readFlag(AUTO_REFRESH_KEY);
}

export function saveAutoRefresh(value: boolean): void {
    writeFlag(AUTO_REFRESH_KEY, value);
}

export function loadTail(): boolean {
    return readFlag(TAIL_KEY);
}

export function saveTail(value: boolean): void {
    writeFlag(TAIL_KEY, value);
}

/** Legacy's default for both toggles is off (`hydra-log.js:13-14`). */
function readFlag(key: string): boolean {
    return readItem(key) === "true";
}

function writeFlag(key: string, value: boolean): void {
    writeItem(key, String(value));
}
