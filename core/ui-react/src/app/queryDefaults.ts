/**
 * The application-wide react-query defaults, and the one constant a feature
 * query reuses when it has to pin the same value locally.
 *
 * They live in their own module rather than in `App.tsx` because `App` sits at
 * the top of the import graph: `SearchPage` pinning the same `staleTime` had to
 * import it back out of `App`, closing an `App -> router -> SearchPage -> App`
 * cycle that only stayed harmless because the read happened lazily inside a
 * `useState` initializer. A near-leaf module cannot form that cycle from any
 * consumer: its one import, `../api/transport` (FM-171's retry predicate needs
 * `UnauthorizedError`), imports nothing itself, so nothing here can reach back
 * into `App`.
 */

import {UnauthorizedError} from "../api/transport";

/**
 * How long a query's data stays fresh before a remount refetches it (FM-121).
 *
 * With react-query's own default of `0` every query refetched on every mount,
 * so moving between the stats tabs -- or between any two areas -- refetched
 * everything and flashed each page's first-load spinner again. Thirty seconds
 * is chosen against what this application's data actually is: history,
 * indexer statuses and system pages change on human-scale events (a search, a
 * download, a notification, a task run), never continuously, so re-reading a
 * page within half a minute of leaving it cannot show a materially different
 * world. It is at the same time an order of magnitude longer than the tab
 * round trip this default exists to cover.
 *
 * It is deliberately short rather than generous because it is a *default*: the
 * queries whose freshness genuinely matters already pin their own option and
 * are unaffected either way (`config.ts` and `safeConfig.ts` pin
 * `staleTime: Infinity`, `UpdateFooterBanners` the same, `FileBrowserSetting`
 * pins `0`, `RawLogView` drives itself with `refetchInterval`), and every
 * explicit refresh affordance calls `refetch()`, which ignores `staleTime`
 * entirely. See the consumer audit in FM-121's handoff.
 */
export const DEFAULT_QUERY_STALE_TIME_MS = 30_000;

/**
 * Refetching on window focus is react-query's default, and it is the wrong one
 * here. Nothing in this application polls, and every page that can go out of
 * date carries an explicit Refresh control, so a focus refetch is a request the
 * reader never made: alt-tabbing back to a history page more than
 * `DEFAULT_QUERY_STALE_TIME_MS` after leaving it re-issued the page read *and*
 * its COUNT, and the fetch indicator moved the table under the pointer. The
 * AngularJS UI never refetched on focus either, so this restores the behavior
 * the application has always had. A query that genuinely wants it can still
 * pin `refetchOnWindowFocus` itself.
 */
export const REFETCH_ON_WINDOW_FOCUS = false;

/**
 * react-query's own retry count for a query, restated here because
 * `retryUnlessUnauthorized` replaces the number with a predicate and has to
 * keep every non-401 error on exactly the behaviour it had.
 *
 * Measured against the installed `@tanstack/query-core` 5.90.20 rather than
 * assumed: `retryer.js:85` reads `config.retry ?? (isServer ? 0 : 3)` and
 * `:88` retries a numeric `retry` while `failureCount < retry`, so `3` and
 * `failureCount < 3` are the same rule.
 */
const DEFAULT_QUERY_RETRY_COUNT = 3;

/**
 * The query `retry` default both `QueryClient`s adopt (FM-171).
 *
 * An `UnauthorizedError` is never retried. The 401 issue #1080's server half
 * introduced is a *terminal* answer for this document — the session is gone
 * and only a full navigation can get it back — so retrying it three times with
 * exponential backoff would delay the session-expired dialog by seconds while
 * issuing requests whose outcome is already known. Every other error keeps
 * react-query's default count, because nothing about this predicate is a
 * judgement on network flakiness or server errors; it only removes the one
 * case where a retry cannot succeed.
 *
 * Deliberately *not* extended to `ForbiddenError`: a 403 is a live session
 * being refused one thing, and whether that is worth retrying is react-query's
 * default to decide, exactly as before.
 */
export function retryUnlessUnauthorized(
    failureCount: number,
    error: unknown,
): boolean {
    if (error instanceof UnauthorizedError) {
        return false;
    }
    return failureCount < DEFAULT_QUERY_RETRY_COUNT;
}
