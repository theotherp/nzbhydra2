import {parseServerDateTime} from "../../../domain/date-time/dateTime";

/**
 * Split out of `IndexerStatusesPage.tsx` so that file exports components
 * only -- a component file that also exports a plain function trips
 * `react-refresh/only-export-components`.
 */
export function vipWarning(
    expiry: string,
    timeZone: string | null,
    now = new Date(),
): string | undefined {
    if (expiry === "Lifetime") return undefined;
    const date = parseServerDateTime(`${expiry}T00:00:00`, timeZone);
    if (!date) return undefined;
    if (date.getTime() < now.getTime()) return "VIP access expired";
    if (date.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000)
        return "VIP access will expire in the next 7 days";
    return undefined;
}
