import type {SafeConfig} from "../../bootstrap";

const DAY_MS = 24 * 60 * 60 * 1000;
const WARNING_WINDOW_MS = 7 * DAY_MS;
const EXPIRY_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `SafeIndexerConfig.vipExpirationDate` is a plain `YYYY-MM-DD` calendar date.
 * Legacy read it with `moment(value, "YYYY-MM-DD")`, which is local midnight;
 * `new Date(value)` would be *UTC* midnight and would shift the comparison by
 * up to a day, so the parts are read explicitly.
 */
export function parseExpirationDate(value: string): Date | undefined {
    const match = EXPIRY_DATE_PATTERN.exec(value);
    if (match === null) {
        return undefined;
    }
    const [, year, month, day] = match;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/**
 * Legacy's `checkExpiredIndexers`: one warning per indexer whose VIP access has
 * expired or expires within a week. `"Lifetime"` never expires, and an absent
 * or unparseable date is not a warning.
 */
export function vipExpiryWarnings(
    safeConfig: SafeConfig,
    now: Date = new Date(),
): string[] {
    const indexers = safeConfig?.indexers;
    if (!Array.isArray(indexers)) {
        return [];
    }

    return indexers.flatMap((indexer) => {
        if (
            typeof indexer !== "object" ||
            indexer === null ||
            !("vipExpirationDate" in indexer)
        ) {
            return [];
        }
        const {name, vipExpirationDate} = indexer as {
            name?: unknown;
            vipExpirationDate?: unknown;
        };
        if (
            typeof vipExpirationDate !== "string" ||
            vipExpirationDate === "" ||
            vipExpirationDate === "Lifetime"
        ) {
            return [];
        }
        const expiry = parseExpirationDate(vipExpirationDate);
        if (expiry === undefined) {
            return [];
        }
        const prefix = `VIP access for indexer ${typeof name === "string" ? name : ""}`;
        if (expiry.getTime() < now.getTime()) {
            return [`${prefix} expired on ${vipExpirationDate}`];
        }
        if (expiry.getTime() - WARNING_WINDOW_MS < now.getTime()) {
            return [`${prefix} will expire on ${vipExpirationDate}`];
        }
        return [];
    });
}
