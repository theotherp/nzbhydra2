import {
    dismissUserNews,
    getNewsForCurrentVersion,
    getUserNews,
    saveNewsShown,
    type NewsEntry,
    type UserNewsEntry,
} from "../../api/news";
import {
    acknowledgeWrapperOutdated,
    isWrapperOutdated,
} from "../../api/system/updates";
import {ApiTransport} from "../../api/transport";
import {getWelcomeShown, setWelcomeShown} from "../../api/welcome";
import type {SafeConfig} from "../../bootstrap";
import type {Toast} from "../../components/toasts/toasts";
import type {ServerPreferences} from "../../services/preferences/serverPreferences";
import {vipExpiryWarnings} from "./vipExpiry";

/** The admin warnings, keyed by the storage key each one is raised with. */
export const OUT_OF_MEMORY_KEY = "outOfMemoryDetected";
export const OPEN_TO_INTERNET_KEY = "showOpenToInternetWithoutAuth";
export const BELOW_JAVA_17_KEY = "belowJava17";
export const FAILED_BACKUP_KEY = "FAILED_BACKUP";

export type StartupWarning =
    | "outOfMemory"
    | "openToInternet"
    | "belowJava17"
    | "failedBackup"
    | "outdatedWrapper";

/** What `FAILED_BACKUP` carries (`backup/FailedBackupData.java`). */
export type FailedBackupDetails = {
    message: string | null;
    time: string | null;
};

/**
 * One thing the startup sequence puts in front of the user. The sequence shows
 * exactly one at a time and waits for it to be closed before it continues, so
 * the announcements never stack the way legacy's independent modals could.
 */
export type StartupAnnouncement =
    | {kind: "welcome"}
    | {kind: "news"; entries: NewsEntry[]}
    | {kind: "userNews"; entry: UserNewsEntry}
    | {
          failedBackup?: FailedBackupDetails;
          kind: "warning";
          warning: StartupWarning;
      };

export type StartupCheckContext = {
    /** Legacy's `HydraAuthService.getUserInfos().maySeeAdmin`, verbatim. */
    isAdmin: boolean;
    now?: () => Date;
    preferences: ServerPreferences;
    safeConfig: SafeConfig;
    /** Resolves when the announcement has been closed by the user. */
    show: (announcement: StartupAnnouncement) => Promise<void>;
    toast: (toast: Toast) => void;
    transport: ApiTransport;
};

/**
 * Legacy's `hydra-checks-footer.js` startup sequence (its non-websocket half),
 * run once per application load.
 *
 * Ordering is legacy's: the welcome check first, and only a session that has
 * *already* seen the welcome gets the news announcements — the first start
 * shows the welcome dialog and nothing else. The admin-only checks then run in
 * legacy's own order. Every step is contained: a failing transport call ends
 * that check, never the sequence.
 */
export async function runStartupChecks(
    context: StartupCheckContext,
): Promise<void> {
    await contained(() => runWelcomeChecks(context));

    // Legacy gated its stored-flag checks and the wrapper check on
    // `maySeeAdmin` alone; a non-admin session must not send any of them.
    if (!context.isAdmin) {
        return;
    }
    await contained(() =>
        showStoredWarning(context, OUT_OF_MEMORY_KEY, "outOfMemory"),
    );
    await contained(() => checkOutdatedWrapper(context));
    await contained(() =>
        showStoredWarning(context, OPEN_TO_INTERNET_KEY, "openToInternet"),
    );
    await contained(() =>
        showStoredWarning(context, BELOW_JAVA_17_KEY, "belowJava17"),
    );
    await contained(() => checkFailedBackup(context));
}

async function runWelcomeChecks(context: StartupCheckContext): Promise<void> {
    const {isAdmin, transport} = context;
    const welcomeShown = await getWelcomeShown(transport);
    if (welcomeShown !== true) {
        await setWelcomeShown(transport);
        await context.show({kind: "welcome"});
        return;
    }

    await contained(() => showUserNews(context));
    if (!isAdmin) {
        return;
    }
    await contained(() => showNews(context));
    await contained(async () => warnAboutExpiringVip(context));
}

/**
 * Legacy's `showUserNewsSequentially`: one notice at a time, the next only
 * after the current one is gone.
 */
async function showUserNews(context: StartupCheckContext): Promise<void> {
    const entries = await getUserNews(context.transport);
    for (const entry of entries) {
        await context.show({entry, kind: "userNews"});
        // Dismissed before the next notice opens, so a failing dismissal
        // stops the run instead of silently marking notices read out of order.
        await dismissUserNews(context.transport, entry.id);
    }
}

async function showNews(context: StartupCheckContext): Promise<void> {
    if (context.safeConfig?.showNews !== true) {
        return;
    }
    const entries = await getNewsForCurrentVersion(context.transport);
    if (entries.length === 0) {
        return;
    }
    await context.show({entries, kind: "news"});
    await saveNewsShown(context.transport);
}

function warnAboutExpiringVip(context: StartupCheckContext): void {
    const now = context.now?.() ?? new Date();
    for (const message of vipExpiryWarnings(context.safeConfig, now)) {
        context.toast({message, severity: "warning"});
    }
}

/**
 * The show-once shape of legacy's `checkForOutOfMemoryException`,
 * `checkForOpenToInternet`, and `checkForJavaBelow17`: read the flag, show the
 * warning, and only then clear it, so a warning that could not be displayed is
 * still there on the next load.
 */
async function showStoredWarning(
    context: StartupCheckContext,
    key: string,
    warning: StartupWarning,
): Promise<void> {
    if (!(await context.preferences.readFlag(key))) {
        return;
    }
    await context.show({kind: "warning", warning});
    await context.preferences.clear(key);
}

/**
 * Legacy's `checkForFailedBackup` could never fire: its condition reads
 * `response.data && !response.data`. The evident intent — the record carries
 * the failure's message and time, and `FailedBackupData` even has a `shown`
 * flag — is to show that message once and then clear the record, which is what
 * runs here.
 */
async function checkFailedBackup(context: StartupCheckContext): Promise<void> {
    const details = parseFailedBackup(
        await context.preferences.read(FAILED_BACKUP_KEY),
    );
    if (details === undefined) {
        return;
    }
    await context.show({
        failedBackup: details,
        kind: "warning",
        warning: "failedBackup",
    });
    await context.preferences.clear(FAILED_BACKUP_KEY);
}

export function parseFailedBackup(
    value: unknown,
): FailedBackupDetails | undefined {
    if (typeof value !== "object" || value === null) {
        return undefined;
    }
    const record = value as Record<string, unknown>;
    if (record.shown === true) {
        return undefined;
    }
    return {
        message: typeof record.message === "string" ? record.message : null,
        time: typeof record.time === "string" ? record.time : null,
    };
}

async function checkOutdatedWrapper(
    context: StartupCheckContext,
): Promise<void> {
    if (!(await isWrapperOutdated(context.transport))) {
        return;
    }
    await context.show({kind: "warning", warning: "outdatedWrapper"});
    await acknowledgeWrapperOutdated(context.transport);
}

/**
 * Legacy ran each check independently, so one failing request left the others
 * untouched. The sequence here awaits its steps, so containment has to be
 * explicit: a failed check is over, and the next one still runs.
 */
async function contained(run: () => Promise<void>): Promise<void> {
    try {
        await run();
    } catch {
        // Legacy suppressed these failures too
        // (`RequestsErrorHandler.specificallyHandled`): a startup check that
        // cannot reach the server is not something to interrupt the user with.
    }
}
