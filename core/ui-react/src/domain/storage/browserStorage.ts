/**
 * The guarded `window.localStorage` access every persisted browser preference
 * in this UI needs, in one place.
 *
 * Three separate failures have to be survived, which is why the boilerplate
 * kept being copied: reaching `window.localStorage` at all can throw (private
 * mode, blocked site data), the property can simply be absent (this project's
 * jsdom test environment configures no `url`, so its opaque origin has no
 * storage), and an individual `getItem`/`setItem` call can still throw on a
 * store that was constructed successfully (hardened browsers, quota).
 *
 * The contract is deliberately narrow and stays that way: this module moves
 * *only* the guard. Keys, defaults, JSON encoding, and shape validation stay
 * at the call sites, because they differ at every one of them -- the stats
 * dashboard's include-disabled flag is tri-state, the log viewer's toggles
 * default to false, and the results table stores a validated JSON payload.
 * Do not add parsing, default values, or key prefixes here.
 */

/** The raw stored string, or `undefined` if absent or unreadable. */
export function readItem(key: string): string | undefined {
    try {
        return storage()?.getItem(key) ?? undefined;
    } catch {
        return undefined;
    }
}

/** Stores `value`, silently doing nothing when storage refuses the write. */
export function writeItem(key: string, value: string): void {
    try {
        storage()?.setItem(key, value);
    } catch {
        // Persisting a preference is a convenience, never a requirement for
        // the feature that owns it to work.
    }
}

function storage(): Storage | undefined {
    try {
        return window.localStorage ?? undefined;
    } catch {
        return undefined;
    }
}
