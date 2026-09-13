import {z} from "zod";

import {
    HISTORY_BOOLEAN_ALL,
    isHistoryFilterActive,
    type HistoryFilterValue,
    type HistoryFilterValues,
} from "../../../api/history/filters";
import type {DownloadHistorySort} from "../../../api/history/downloads";
import type {NotificationHistorySort} from "../../../api/history/notifications";
import type {SearchHistorySort} from "../../../api/searchHistory";
import type {SortState} from "../shared/SortHeader";
import {
    DEFAULT_PAGE_SIZE,
    isHistoryPageSize,
    type HistoryPageSize,
} from "../shared/pageSize";

/**
 * FM-165: the URL contract every history route shares -- which page, sorted
 * how, filtered by what -- as a Zod schema for `validateSearch` and the pure
 * encoder/decoder pair the hook and the pages navigate with.
 *
 * Two rules run through all of it:
 *
 *   - **A default is never written.** A pristine view keeps the clean URL it
 *     had before this task: `page` is absent on page 1, `size` is absent at
 *     the default page size (FM-166), `sort`/`dir` are absent while the route
 *     is on its own default ordering, and a dimension nobody filtered
 *     contributes no parameter at all. So every link that worked before
 *     FM-165 still resolves to exactly what it resolved to.
 *   - **Nothing here throws.** A stale bookmark, a hand-typed URL, a parameter
 *     naming a dimension that no longer exists: every decoder below falls back
 *     to that parameter's default and renders. The schema is the *first* line
 *     of that defence, not the only one -- the decoders are total over
 *     `unknown` on their own, which is also what lets a page render in a test
 *     harness that never went through `validateSearch`.
 *
 * The filter half is deliberately dimension-*agnostic*: the hook that reads it
 * has no dimension list (the pages build theirs from `safeConfig` and, on
 * search history, from a checkbox that adds and removes one), so each
 * parameter names its own filter kind through a two-letter prefix. The
 * `id` in `ft.query` is a `HistoryDimension.id`, never a server column --
 * ADR-0016's rule that a column name must not leak into a selector contract
 * applies to a URL just as much.
 *
 *   ft.<id>              freetext         `ft.query=avengers`
 *   cb.<id>              checkboxes       `cb.category=["Movies","TV"]`
 *   bo.<id>              boolean          `bo.source=API`
 *   nr.<id>.min|.max     number range     `nr.age.min=10&nr.age.max=20`
 *   tm.<id>.after|.before  time range     `tm.time.after=2024-01-01T00:00`
 *
 * Values travel as their natural JavaScript types; TanStack's default search
 * serializer JSON-encodes what it must (a multi-select's array, a free-text
 * value that would otherwise decode back as a number) and hands it back
 * unchanged on the way in.
 */

const PAGE_PARAM = "page";
const SIZE_PARAM = "size";
const SORT_PARAM = "sort";
const DIRECTION_PARAM = "dir";

/** The filter-parameter prefixes, one per `HistoryFilterValue` kind. */
const FILTER_PREFIXES = ["ft", "cb", "bo", "nr", "tm"] as const;

const FILTER_KEY_PATTERN = new RegExp(`^(?:${FILTER_PREFIXES.join("|")})\\.`);

/** A history route's search parameters, before any of them are interpreted. */
export type HistorySearchParams = Readonly<Record<string, unknown>>;

/**
 * A sort-column union as the runtime list the schema validates against. The
 * signature fails to compile if the list names a column the union does not
 * have (`Listed extends readonly Column[]`) or misses one it does
 * (`Column extends Listed[number]`), so a column added to a page's sort type
 * cannot silently become unrepresentable in its URL.
 */
function sortColumnsOf<Column extends string>() {
    return <const Listed extends readonly Column[]>(
        columns: Column extends Listed[number] ? Listed : never,
    ): readonly Column[] => columns;
}

export const SEARCH_HISTORY_SORT_COLUMNS = sortColumnsOf<
    SearchHistorySort["column"]
>()([
    "time",
    "query",
    "user_agent",
    "category_name",
    "source",
    "username",
    "ip",
]);

export const DOWNLOAD_HISTORY_SORT_COLUMNS = sortColumnsOf<
    DownloadHistorySort["column"]
>()([
    "time",
    "name",
    "title",
    "status",
    "access_source",
    "age",
    "username",
    "ip",
]);

export const NOTIFICATION_HISTORY_SORT_COLUMNS = sortColumnsOf<
    NotificationHistorySort["column"]
>()(["time", "NOTIFICATION_EVENT_TYPE"]);

/**
 * Every history route's default ordering: newest first by time
 * (`History.java`'s `2` is descending). Shared because all three pages had the
 * same `const defaultSort` before this task, and because the encoder has to
 * agree with the page about what "default" means to keep it out of the URL.
 */
const DEFAULT_HISTORY_SORT_MODE = 2;

export function defaultHistorySort<Column extends string>(
    column: Column,
): SortState<Column> {
    return {column, sortMode: DEFAULT_HISTORY_SORT_MODE};
}

/**
 * The route-level validator: page, sort column and direction checked against
 * this route's own vocabulary, filter parameters canonicalized by decoding and
 * re-encoding them, and anything that survives neither dropped.
 *
 * The result is a *normalized* search object rather than a defaulted one: a
 * parameter sitting at its default is removed, not filled in, so the first
 * navigation off a pristine view cannot materialize `?page=1&sort=time&dir=desc`
 * into a URL that had nothing in it.
 */
export function createHistorySearchSchema<Column extends string>(
    sortColumns: readonly Column[],
) {
    const schema = z
        .looseObject({
            page: z.number().int().min(1).optional().catch(undefined),
            size: z.number().int().optional().catch(undefined),
            sort: z
                .string()
                .refine((value) =>
                    (sortColumns as readonly string[]).includes(value),
                )
                .optional()
                .catch(undefined),
            dir: z.enum(["asc", "desc"]).optional().catch(undefined),
        })
        .transform(normalizeHistorySearch)
        .catch({});
    return (input: Record<string, unknown>): HistorySearchParams =>
        schema.parse(input);
}

function normalizeHistorySearch(
    value: Record<string, unknown>,
): HistorySearchParams {
    const normalized: Record<string, unknown> = {};
    // `page > 1` rather than `>= 1`: page 1 is the default and is never written.
    if (typeof value.page === "number" && value.page > 1) {
        normalized[PAGE_PARAM] = value.page;
    }
    // Same rule for the page size (FM-166): the default is never written, and
    // a size that is not one of the offered options is not a size at all.
    if (isHistoryPageSize(value.size) && value.size !== DEFAULT_PAGE_SIZE) {
        normalized[SIZE_PARAM] = value.size;
    }
    if (typeof value.sort === "string") normalized[SORT_PARAM] = value.sort;
    if (value.dir === "asc" || value.dir === "desc") {
        normalized[DIRECTION_PARAM] = value.dir;
    }
    // Decode-then-encode: a malformed filter parameter does not survive the
    // round trip, and one that does comes back in exactly the shape the
    // encoder would have written.
    Object.assign(
        normalized,
        historyFilterParams(historyFilterValuesFromSearch(value)),
    );
    return normalized;
}

/** Which page the URL asks for; anything unusable is page 1. */
export function historyPageFromSearch(search: unknown): number {
    if (!isRecord(search)) return 1;
    const page = search[PAGE_PARAM];
    return typeof page === "number" && Number.isInteger(page) && page >= 1
        ? page
        : 1;
}

/**
 * How many rows per page the URL asks for; anything that is not one of the
 * offered options -- a stale `size=75`, a hand-typed word, a missing parameter
 * -- is the default. Total over `unknown` like every other decoder here.
 */
export function historyPageSizeFromSearch(search: unknown): HistoryPageSize {
    if (!isRecord(search)) return DEFAULT_PAGE_SIZE;
    const size = search[SIZE_PARAM];
    return isHistoryPageSize(size) ? size : DEFAULT_PAGE_SIZE;
}

/**
 * The search object a page-size change navigates to: the new size written (or
 * removed, at the default) and the page dropped, because the page the reader
 * is on does not survive a resize -- page 4 of 25-row pages names different
 * rows once the pages hold 100, and on a short history does not exist at all.
 * Dropping it here rather than relying on the caller is what keeps this one
 * navigation instead of two.
 */
export function withHistoryPageSize(
    previous: HistorySearchParams,
    size: HistoryPageSize,
): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(previous)) {
        if (key === SIZE_PARAM || key === PAGE_PARAM) continue;
        if (value !== undefined) next[key] = value;
    }
    if (size !== DEFAULT_PAGE_SIZE) next[SIZE_PARAM] = size;
    return next;
}

/**
 * The sort the URL asks for, per parameter: an unknown column keeps the
 * default column and an unknown direction keeps the default direction, so half
 * a stale sort still restores the half that is still valid.
 */
export function historySortFromSearch<Column extends string>(
    search: unknown,
    sortColumns: readonly Column[],
    defaultSort: SortState<Column>,
): SortState<Column> {
    if (!isRecord(search)) return defaultSort;
    const column =
        sortColumns.find((candidate) => candidate === search[SORT_PARAM]) ??
        defaultSort.column;
    const direction = search[DIRECTION_PARAM];
    return {
        column,
        sortMode:
            direction === "asc"
                ? 1
                : direction === "desc"
                  ? 2
                  : defaultSort.sortMode,
    };
}

/** The committed filter values the URL carries. */
export function historyFilterValuesFromSearch(
    search: unknown,
): HistoryFilterValues {
    if (!isRecord(search)) return {};
    const values: Record<string, HistoryFilterValue> = {};
    for (const [key, raw] of Object.entries(search)) {
        const separator = key.indexOf(".");
        if (separator < 0) continue;
        const prefix = key.slice(0, separator);
        const rest = key.slice(separator + 1);
        switch (prefix) {
            case "ft": {
                const text = asText(raw);
                if (text.trim()) values[rest] = {kind: "freetext", text};
                break;
            }
            case "cb": {
                const selected = asTextList(raw);
                if (selected.length > 0) {
                    values[rest] = {kind: "checkboxes", selected};
                }
                break;
            }
            case "bo": {
                const value = asText(raw).trim();
                if (value && value !== HISTORY_BOOLEAN_ALL) {
                    values[rest] = {kind: "boolean", value};
                }
                break;
            }
            case "nr": {
                readBound(values, rest, raw, "numberRange", "min", "max");
                break;
            }
            case "tm": {
                readBound(values, rest, raw, "time", "after", "before");
                break;
            }
        }
    }
    return values;
}

/**
 * One end of a two-parameter range, merged into whatever the other end already
 * wrote. Either order works, and a bound whose suffix is neither of the two
 * this kind knows is dropped rather than guessed at.
 */
function readBound(
    values: Record<string, HistoryFilterValue>,
    rest: string,
    raw: unknown,
    kind: "numberRange" | "time",
    lower: "min" | "after",
    upper: "max" | "before",
) {
    const separator = rest.lastIndexOf(".");
    if (separator < 0) return;
    const id = rest.slice(0, separator);
    const bound = rest.slice(separator + 1);
    if (!id || (bound !== lower && bound !== upper)) return;
    const text = asText(raw);
    if (!text.trim()) return;
    const existing = values[id];
    const current =
        existing?.kind === kind
            ? existing
            : kind === "numberRange"
              ? ({kind: "numberRange", min: "", max: ""} as const)
              : ({kind: "time", after: "", before: ""} as const);
    values[id] = {...current, [bound]: text} as HistoryFilterValue;
}

/**
 * The filter half of a search object. Only dimensions the reader actually
 * filtered are written -- `isHistoryFilterActive` is the same predicate the
 * refine bar's active count and `historyFilterModel` use, so a value that
 * contributes no `filterModel` entry contributes no URL parameter either.
 */
export function historyFilterParams(
    values: HistoryFilterValues,
): Record<string, unknown> {
    const params: Record<string, unknown> = {};
    for (const [id, value] of Object.entries(values)) {
        if (!isHistoryFilterActive(value)) continue;
        switch (value.kind) {
            case "freetext":
                params[`ft.${id}`] = value.text;
                break;
            case "checkboxes":
                params[`cb.${id}`] = [...value.selected];
                break;
            case "boolean":
                params[`bo.${id}`] = value.value;
                break;
            case "numberRange":
                if (value.min.trim()) params[`nr.${id}.min`] = value.min;
                if (value.max.trim()) params[`nr.${id}.max`] = value.max;
                break;
            case "time":
                if (value.after.trim()) params[`tm.${id}.after`] = value.after;
                if (value.before.trim())
                    params[`tm.${id}.before`] = value.before;
                break;
        }
    }
    return params;
}

/**
 * The search object a committed filter edit or a page change navigates to:
 * every page and filter parameter rewritten from `criteria`, everything else
 * (the sort half included) carried over untouched. Rewriting rather than
 * merging is what lets a cleared filter leave the URL.
 */
export function withHistoryCriteria(
    previous: HistorySearchParams,
    criteria: {page: number; values: HistoryFilterValues},
): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(previous)) {
        if (key === PAGE_PARAM || FILTER_KEY_PATTERN.test(key)) continue;
        if (value !== undefined) next[key] = value;
    }
    if (criteria.page > 1) next[PAGE_PARAM] = criteria.page;
    Object.assign(next, historyFilterParams(criteria.values));
    return next;
}

/** The same, for the sort half: the default ordering leaves no parameter. */
export function withHistorySort<Column extends string>(
    previous: HistorySearchParams,
    sort: SortState<Column>,
    defaultSort: SortState<Column>,
): Record<string, unknown> {
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(previous)) {
        if (key === SORT_PARAM || key === DIRECTION_PARAM) continue;
        if (value !== undefined) next[key] = value;
    }
    if (sort.column !== defaultSort.column) next[SORT_PARAM] = sort.column;
    if (sort.sortMode !== defaultSort.sortMode) {
        next[DIRECTION_PARAM] = sort.sortMode === 1 ? "asc" : "desc";
    }
    return next;
}

/**
 * Whether two search objects would produce the same URL. Used to skip a
 * navigation that would only push a duplicate history entry, and to tell the
 * hook's own committed write apart from an external one (a Back, a pasted
 * link) that has to resynchronize the draft it is still editing.
 */
export function historySearchEqual(
    left: HistorySearchParams,
    right: HistorySearchParams,
): boolean {
    const leftKeys = Object.keys(left).filter((key) => left[key] !== undefined);
    const rightKeys = Object.keys(right).filter(
        (key) => right[key] !== undefined,
    );
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => sameValue(left[key], right[key]));
}

function sameValue(left: unknown, right: unknown): boolean {
    if (Array.isArray(left) || Array.isArray(right)) {
        return (
            Array.isArray(left) &&
            Array.isArray(right) &&
            left.length === right.length &&
            left.every((entry, index) => entry === right[index])
        );
    }
    return left === right;
}

/**
 * A parameter as text. TanStack's parser turns `10` into a number and `true`
 * into a boolean before anything here sees it, so a free-text filter reading
 * "10" arrives as a number and has to be read back as one.
 */
function asText(value: unknown): string {
    if (typeof value === "string") return value;
    if (typeof value === "number" || typeof value === "boolean") {
        return String(value);
    }
    return "";
}

function asTextList(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value.map(asText).filter((entry) => entry.trim().length > 0);
    }
    const text = asText(value);
    return text.trim() ? [text] : [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
