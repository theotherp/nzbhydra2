/**
 * The paged history tables' fixed page size. Shared across `SearchHistoryPage`,
 * `DownloadHistoryPage`, and `NotificationHistoryPage` -- none of them offer a
 * page-size control, so this is the one constant driving both the request
 * `limit` and the `totalPages` calculation on each.
 */
export const PAGE_SIZE = 25;
