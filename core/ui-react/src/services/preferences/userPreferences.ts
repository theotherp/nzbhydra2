import {ApiTransport} from "../../api/transport";
import {putUserPreferenceSection} from "../../api/userPreferences";

/**
 * `C-USER-PREFERENCES` (ADR-0057): display options and other UI state that
 * follow the user to every browser and machine, stored per user on the server
 * (`UserPreferencesWeb`; without authentication one record shared by every
 * browser).
 *
 * The record is a JSON object of *sections*, one per feature
 * (`searchResults`, `statsDashboard`, ...), each written independently so two
 * pages do not overwrite each other's options. It arrives with the page as the
 * bootstrap's `userPreferences`, which is why reads are synchronous: a page
 * renders with the user's options from its first paint, as it did when they
 * came from `localStorage`. Writes update the in-memory record at once and
 * reach the server after a short delay, so a burst of changes (a sort order
 * clicked through) is one request, and on `pagehide` at the latest.
 *
 * Everything read from here is untrusted -- written by another version, by
 * hand, or by nobody -- and validated by the reading feature.
 */
export type UserPreferenceSection =
    | "config"
    | "history"
    | "searchForm"
    | "searchResults"
    | "statsDashboard"
    | "systemLog";

export type UserPreferenceStore = {
    /** Sends every write still waiting for its delay. */
    flush: () => void;
    read: (section: UserPreferenceSection) => unknown;
    /** A value equal to the stored one is not sent again. */
    write: (section: UserPreferenceSection, value: unknown) => void;
};

type SectionWriter = (section: string, value: unknown) => Promise<void>;

export const WRITE_DELAY_MS = 1000;

export function createUserPreferenceStore(
    initial: Record<string, unknown>,
    writer: SectionWriter | undefined,
    delayMs = WRITE_DELAY_MS,
): UserPreferenceStore {
    const record: Record<string, unknown> = {...initial};
    const pending = new Map<string, ReturnType<typeof setTimeout>>();

    const send = (section: string) => {
        pending.delete(section);
        writer?.(section, record[section]).catch(() => {
            // The option still applies for this page; the next change of the
            // section sends it again.
        });
    };

    return {
        flush: () => {
            for (const [section, timer] of pending) {
                clearTimeout(timer);
                send(section);
            }
        },
        read: (section) => record[section],
        write: (section, value) => {
            if (JSON.stringify(record[section]) === JSON.stringify(value)) {
                return;
            }
            record[section] = value;
            clearTimeout(pending.get(section));
            pending.set(
                section,
                setTimeout(() => send(section), delayMs),
            );
        },
    };
}

let store: UserPreferenceStore | undefined;

/**
 * The page's store, created on first use from the bootstrap. Without one (a
 * component test) it starts empty and keeps writes in memory.
 */
export function userPreferences(): UserPreferenceStore {
    store ??= createDefaultStore();
    return store;
}

/** Replaces the page's store; `undefined` starts the next test afresh. */
export function setUserPreferenceStore(
    next: UserPreferenceStore | undefined,
): void {
    store = next;
}

function createDefaultStore(): UserPreferenceStore {
    const bootstrap: unknown = window.__NZBHYDRA_BOOTSTRAP__;
    const initial =
        isRecord(bootstrap) && isRecord(bootstrap.userPreferences)
            ? bootstrap.userPreferences
            : {};
    let writer: SectionWriter | undefined;
    if (isRecord(bootstrap) && typeof bootstrap.baseUrl === "string") {
        try {
            const transport = new ApiTransport(bootstrap.baseUrl);
            writer = (section, value) =>
                putUserPreferenceSection(transport, section, value);
        } catch {
            // A base URL the transport rejects: options apply to this page only.
        }
    }
    const created = createUserPreferenceStore(initial, writer);
    window.addEventListener("pagehide", created.flush);
    return created;
}

/**
 * A whole section, or `undefined` if it was never stored; see
 * `readPreference` for `legacy`.
 */
export function readSection(
    section: UserPreferenceSection,
    legacy?: () => unknown,
): unknown {
    const current = userPreferences().read(section);
    if (current !== undefined) {
        return current;
    }
    const migrated = legacy?.();
    if (migrated !== undefined) {
        userPreferences().write(section, migrated);
    }
    return migrated;
}

/**
 * One option of a section whose value is an object of options, or
 * `undefined` if it was never stored.
 *
 * Before ADR-0057 options lived in this browser's `localStorage`. An option
 * the server does not have yet is taken from there (`legacy` reads it) and
 * uploaded, so nobody loses their options with the upgrade. Once stored on
 * the server, the browser's old value is never read again.
 */
export function readPreference(
    section: UserPreferenceSection,
    option: string,
    legacy?: () => unknown,
): unknown {
    const current = userPreferences().read(section);
    if (isRecord(current) && option in current) {
        return current[option];
    }
    const migrated = legacy?.();
    if (migrated !== undefined) {
        writePreference(section, option, migrated);
    }
    return migrated;
}

/** Stores one option of a section, keeping the section's other options. */
export function writePreference(
    section: UserPreferenceSection,
    option: string,
    value: unknown,
): void {
    const current = userPreferences().read(section);
    userPreferences().write(section, {
        ...(isRecord(current) ? current : {}),
        [option]: value,
    });
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
