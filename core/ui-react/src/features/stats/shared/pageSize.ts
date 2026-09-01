/**
 * The page sizes the paged history tables offer, and the one they start on.
 * Shared across `SearchHistoryPage`, `DownloadHistoryPage`, and
 * `NotificationHistoryPage`: `HistoryPager` renders the choice, the chosen
 * size travels in the route's search parameters (`historySearchParams.ts`),
 * and it drives both the request `limit` and the `totalPages` calculation on
 * each page.
 *
 * 25 stays the default although all three legacy controllers asked for
 * `limit = 100` unconditionally (`download-history-controller.js:7` and its two
 * siblings): legacy had no control at all, so a reader who wanted fewer rows
 * had no way to ask for fewer, while a reader who wants 100 now says so once
 * and keeps it in the URL. The three `F-HISTORY-*` records carry that as a
 * deliberate gap line rather than leaving it to look like an oversight.
 */
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

export type HistoryPageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_PAGE_SIZE: HistoryPageSize = PAGE_SIZE_OPTIONS[0];

/** Whether a number is one of the offered sizes -- the URL decoder's guard. */
export function isHistoryPageSize(value: unknown): value is HistoryPageSize {
    return (PAGE_SIZE_OPTIONS as readonly unknown[]).includes(value);
}
