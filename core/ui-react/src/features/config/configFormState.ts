import type {ConfigTab} from "./configTabs";
import {CONFIG_TABS} from "./configTabs";

/**
 * The top-level `BaseConfig` section key each configuration tab edits
 * (`api/config/schema.ts`). Three of the eight do not share their tab's URL
 * segment — Categories edits `categoriesConfig`, Notifications edits
 * `notificationConfig`, and External Tools edits `externalTools` — so the
 * mapping is stated rather than derived from the segment.
 *
 * Sections no tab models (`emby`, `genericStorage`, and anything a newer
 * backend adds) are deliberately absent: the form carries them losslessly but
 * nothing in the UI can dirty or invalidate them, so they map to no badge.
 */
const CONFIG_SECTION_TABS: Readonly<Record<string, ConfigTab["path"]>> = {
    auth: "auth",
    categoriesConfig: "categories",
    downloading: "downloading",
    externalTools: "externalTools",
    indexers: "indexers",
    main: "main",
    notificationConfig: "notifications",
    searching: "searching",
};

/** The tab a top-level config section belongs to, if any tab edits it. */
export function configTabForSectionKey(
    key: string,
): ConfigTab["path"] | undefined {
    const path = CONFIG_SECTION_TABS[key];
    return CONFIG_TABS.some((tab) => tab.path === path) ? path : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * How many settings the admin has changed, counted from React Hook Form's
 * `formState.dirtyFields`.
 *
 * Written against what RHF actually produces rather than against a tidy tree:
 *
 * - a changed leaf is the boolean `true`; a leaf reverted to its default is
 *   `false` and must not count;
 * - an array (`indexers`, and every repeat-section inside a tab) is **sparse**
 *   — RHF writes only the indices it touched, and the untouched ones come back
 *   either as real holes or — once the array has been rebuilt by a structural
 *   edit — as slots that are *present* and hold `undefined`. Both shapes were
 *   measured against a live `useFieldArray`, so neither `Array.prototype`'s
 *   hole-skipping nor an index scan alone is enough: untouched slots are
 *   skipped explicitly;
 * - a structural change to an array marks whole entries dirty, every field at
 *   once — and removing an entry re-marks *every* surviving entry completely
 *   (each now sits at a different index than its default) plus a trailing slot
 *   for the position that no longer exists. One added indexer is one change to
 *   an admin, not fourteen, so **an array entry counts once** however many of
 *   its own fields are marked; the total then reads as "how many list
 *   positions differ from what was loaded".
 *
 * Accepts `unknown` because the dirty tree's static type
 * (`DeepMap<DeepPartial<ConfigValues>, boolean>`) describes neither the
 * sparseness nor the structural marking above, and this function's whole job
 * is to survive both.
 */
export function countDirtyFields(dirtyFields: unknown): number {
    if (dirtyFields === true) {
        return 1;
    }
    if (Array.isArray(dirtyFields)) {
        let count = 0;
        for (let index = 0; index < dirtyFields.length; index += 1) {
            const entry: unknown = dirtyFields[index];
            if (entry !== undefined && countDirtyFields(entry) > 0) {
                count += 1;
            }
        }
        return count;
    }
    if (isRecord(dirtyFields)) {
        return Object.values(dirtyFields).reduce<number>(
            (sum, value) => sum + countDirtyFields(value),
            0,
        );
    }
    return 0;
}

/**
 * Whether a subtree of React Hook Form's `formState.errors` holds at least one
 * validation error. An error object is recognized by its own `type`/`message`
 * rather than by position, so a field error, an array-level `root` error, and
 * a nested repeat-section error all register. `ref` is skipped: it holds the
 * DOM node the error was raised on, not more errors.
 */
export function hasFieldError(errors: unknown): boolean {
    if (Array.isArray(errors)) {
        // Same sparseness as the dirty tree: the untouched indices of a
        // per-entry error array are present and `undefined`.
        return errors.some(
            (entry: unknown) => entry !== undefined && hasFieldError(entry),
        );
    }
    if (isRecord(errors)) {
        if (
            typeof errors.type === "string" ||
            typeof errors.message === "string"
        ) {
            return true;
        }
        return Object.entries(errors).some(
            ([key, value]) => key !== "ref" && hasFieldError(value),
        );
    }
    return false;
}

function configTabsWhere(
    tree: unknown,
    predicate: (value: unknown) => boolean,
): ReadonlySet<ConfigTab["path"]> {
    const paths = new Set<ConfigTab["path"]>();
    if (!isRecord(tree)) {
        return paths;
    }
    for (const [key, value] of Object.entries(tree)) {
        const path = configTabForSectionKey(key);
        if (path !== undefined && predicate(value)) {
            paths.add(path);
        }
    }
    return paths;
}

/** The tabs whose section holds at least one changed setting. */
export function dirtyConfigTabs(
    dirtyFields: unknown,
): ReadonlySet<ConfigTab["path"]> {
    return configTabsWhere(dirtyFields, (value) => countDirtyFields(value) > 0);
}

/** The tabs whose section holds at least one validation error. */
export function invalidConfigTabs(
    errors: unknown,
): ReadonlySet<ConfigTab["path"]> {
    return configTabsWhere(errors, hasFieldError);
}
