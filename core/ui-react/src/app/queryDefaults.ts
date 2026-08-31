/**
 * The application-wide react-query defaults, and the one constant a feature
 * query reuses when it has to pin the same value locally.
 *
 * They live in their own module rather than in `App.tsx` because `App` sits at
 * the top of the import graph: `SearchPage` pinning the same `staleTime` had to
 * import it back out of `App`, closing an `App -> router -> SearchPage -> App`
 * cycle that only stayed harmless because the read happened lazily inside a
 * `useState` initializer. A leaf module with no imports of its own cannot form
 * that cycle from any consumer.
 */

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
