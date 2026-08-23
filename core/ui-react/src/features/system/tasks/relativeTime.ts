const RELATIVE_TIME_UNITS: {
    unit: Intl.RelativeTimeFormatUnit;
    seconds: number;
}[] = [
    {seconds: 31_536_000, unit: "year"},
    {seconds: 2_592_000, unit: "month"},
    {seconds: 604_800, unit: "week"},
    {seconds: 86_400, unit: "day"},
    {seconds: 3_600, unit: "hour"},
    {seconds: 60, unit: "minute"},
    {seconds: 1, unit: "second"},
];

/**
 * Legacy's `humanizeDate` filter (`indexer-statuses-controller.js:132-136`,
 * `moment().to(moment.unix(date))`): a relative "x minutes ago" / "in x
 * minutes" style string for the tab's Last/Next execution columns. This tab
 * is the first `C-DATE-TIME` consumer that needs the relative half of the
 * pairing (every earlier consumer only needed the absolute
 * `formatServerDateTime` half), so it is kept local to the feature rather
 * than added to the shared module here.
 */
export function formatRelativeTime(
    target: Date,
    now: Date = new Date(),
): string {
    const diffSeconds = (target.getTime() - now.getTime()) / 1000;
    const formatter = new Intl.RelativeTimeFormat(undefined, {
        numeric: "auto",
    });
    for (const {seconds, unit} of RELATIVE_TIME_UNITS) {
        if (unit === "second" || Math.abs(diffSeconds) >= seconds) {
            return formatter.format(Math.round(diffSeconds / seconds), unit);
        }
    }
    // Unreachable: the "second" entry above always matches.
    return formatter.format(0, "second");
}
