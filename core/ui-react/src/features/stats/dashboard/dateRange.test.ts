import {describe, expect, it} from "vitest";

import {
    rangeForPreset,
    toDateInputValue,
    validateCustomRange,
} from "./dateRange";

const now = new Date("2026-06-15T12:00:00Z");

// Asserts calendar-day deltas rather than fixed UTC instants: the presets
// subtract days from `now`'s *local* wall-clock date (matching legacy's
// `moment().subtract(n, "days")`), so a delta that crosses a DST transition
// legitimately shifts the UTC offset by an hour without being wrong.
function daysBetween(before: Date, after: Date): number {
    return Math.round(
        (before.getTime() - after.getTime()) / (24 * 60 * 60 * 1000),
    );
}

describe("rangeForPreset", () => {
    it("computes each fixed preset relative to now, sharing the tomorrow 'before' edge", () => {
        const tomorrow = rangeForPreset("last7", now)?.before;
        expect(tomorrow).toBeDefined();
        expect(daysBetween(tomorrow!, now)).toBe(1);
        expect(rangeForPreset("last30", now)?.before).toEqual(tomorrow);
        expect(rangeForPreset("last90", now)?.before).toEqual(tomorrow);
        expect(rangeForPreset("lastYear", now)?.before).toEqual(tomorrow);

        expect(daysBetween(now, rangeForPreset("last7", now)!.after)).toBe(7);
        expect(daysBetween(now, rangeForPreset("last30", now)!.after)).toBe(30);
        expect(daysBetween(now, rangeForPreset("last90", now)!.after)).toBe(90);
        const lastYearAfter = rangeForPreset("lastYear", now)!.after;
        expect(lastYearAfter.getFullYear()).toBe(2025);
        expect(lastYearAfter.getMonth()).toBe(5);
        expect(lastYearAfter.getDate()).toBe(15);
    });

    it("sends the epoch as the lower bound for 'all time'", () => {
        expect(rangeForPreset("allTime", now)?.after).toEqual(new Date(0));
    });

    it("returns undefined for 'custom' -- it never computes its own range", () => {
        expect(rangeForPreset("custom", now)).toBeUndefined();
    });
});

describe("validateCustomRange", () => {
    it("accepts a valid after < before range", () => {
        const result = validateCustomRange({
            after: "2026-01-01",
            before: "2026-02-01",
        });
        expect(result.valid).toBe(true);
    });

    it("rejects an unparseable date", () => {
        const result = validateCustomRange({
            after: "not-a-date",
            before: "2026-02-01",
        });
        expect(result.valid).toBe(false);
    });

    it("rejects after >= before", () => {
        const equal = validateCustomRange({
            after: "2026-02-01",
            before: "2026-02-01",
        });
        expect(equal.valid).toBe(false);
        const reversed = validateCustomRange({
            after: "2026-03-01",
            before: "2026-02-01",
        });
        expect(reversed.valid).toBe(false);
    });
});

describe("toDateInputValue", () => {
    it("formats as yyyy-mm-dd for an <input type=date>", () => {
        expect(toDateInputValue(new Date(2026, 0, 5))).toBe("2026-01-05");
    });
});
