export type DateTimeInput = number | string | null | undefined;

export function parseServerDateTime(
    value: DateTimeInput,
    serverTimeZone: string | null,
): Date | undefined {
    if (value === null || value === undefined || value === "") return undefined;

    if (typeof value === "number") {
        return Number.isFinite(value) ? new Date(value * 1000) : undefined;
    }
    if (numericTimestamp(value)) {
        const seconds = Number(value);
        return Number.isFinite(seconds) ? new Date(seconds * 1000) : undefined;
    }
    if (hasOffset(value)) {
        if (!validTimestampCalendar(value)) return undefined;
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return parseLocalTimestamp(value, serverTimeZone);
}

export function formatServerDateTime(
    value: DateTimeInput,
    serverTimeZone: string | null,
): string {
    const parsed = parseServerDateTime(value, serverTimeZone);
    if (!parsed) return "";
    try {
        return new Intl.DateTimeFormat(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
            timeZone: serverTimeZone ?? undefined,
        }).format(parsed);
    } catch {
        return "";
    }
}

function numericTimestamp(value: string): boolean {
    return /^\d+(?:\.\d+)?$/.test(value);
}

function hasOffset(value: string): boolean {
    return /Z$|[+-]\d\d(?::?\d\d)?$/i.test(value);
}

function validTimestampCalendar(value: string): boolean {
    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(?:Z|[+-]\d\d(?::?\d\d)?)$/i,
    );
    if (!match) return false;
    const [year, month, day, hour, minute, second] = match
        .slice(1, 7)
        .map((part) => Number(part ?? 0));
    return validCalendarDate(year, month, day, hour, minute, second);
}

function parseLocalTimestamp(
    value: string,
    serverTimeZone: string | null,
): Date | undefined {
    const match = value.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/,
    );
    if (!match) return undefined;
    const parts = match.slice(1, 7).map((part) => Number(part ?? 0));
    const [year, month, day, hour, minute, second] = parts;
    const milliseconds = Number((match[7] ?? "").padEnd(3, "0"));
    const desired = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        milliseconds,
    );
    if (!validCalendarDate(year, month, day, hour, minute, second))
        return undefined;
    if (!serverTimeZone) return new Date(desired);
    try {
        let result = desired;
        for (let iteration = 0; iteration < 2; iteration++) {
            const local = zonedParts(result, serverTimeZone);
            result +=
                desired -
                Date.UTC(
                    local.year,
                    local.month - 1,
                    local.day,
                    local.hour,
                    local.minute,
                    local.second,
                );
        }
        return new Date(result);
    } catch {
        return undefined;
    }
}

function validCalendarDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
): boolean {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return (
        date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 &&
        date.getUTCDate() === day &&
        hour < 24 &&
        minute < 60 &&
        second < 60
    );
}

function zonedParts(timestamp: number, timeZone: string) {
    const values = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(new Date(timestamp));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
        Number(values.find((part) => part.type === type)?.value);
    return {
        year: get("year"),
        month: get("month"),
        day: get("day"),
        hour: get("hour"),
        minute: get("minute"),
        second: get("second"),
    };
}
