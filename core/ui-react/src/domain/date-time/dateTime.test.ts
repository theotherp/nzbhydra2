import {describe, expect, it} from "vitest";

import {
    formatLogTimestamp,
    formatServerDateTime,
    parseLogTimestamp,
    parseServerDateTime,
} from "./dateTime";

describe("parseServerDateTime", () => {
    it("should parse epoch seconds, including fractional numeric values and strings", () => {
        expect(parseServerDateTime(1_735_689_600, "UTC")?.toISOString()).toBe(
            "2025-01-01T00:00:00.000Z",
        );
        expect(parseServerDateTime("1735689600", "UTC")?.toISOString()).toBe(
            "2025-01-01T00:00:00.000Z",
        );
        expect(
            parseServerDateTime(1_735_689_600.25, "UTC")?.toISOString(),
        ).toBe("2025-01-01T00:00:00.250Z");
        expect(parseServerDateTime("1735689600.25", "UTC")?.toISOString()).toBe(
            "2025-01-01T00:00:00.250Z",
        );
    });

    it("should preserve offset timestamp variants and interpret local values in the server zone", () => {
        expect(
            parseServerDateTime(
                "2025-01-01T01:00:00+01:00",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.000Z");
        expect(
            parseServerDateTime(
                "2025-01-01T00:00:00Z",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.000Z");
        expect(
            parseServerDateTime(
                "2025-01-01T01:30:00+01:30",
                "UTC",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.000Z");
        expect(
            parseServerDateTime(
                "2024-12-31T22:30:00-0130",
                "UTC",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.000Z");
        expect(
            parseServerDateTime(
                "2025-01-01T12:00:00",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T17:00:00.000Z");
    });

    it("should return undefined or an empty display for absent, non-finite, and invalid values", () => {
        expect(parseServerDateTime(null, "UTC")).toBeUndefined();
        expect(parseServerDateTime("", "UTC")).toBeUndefined();
        expect(parseServerDateTime(" \t", "UTC")).toBeUndefined();
        expect(parseServerDateTime(Number.NaN, "UTC")).toBeUndefined();
        expect(
            parseServerDateTime(Number.POSITIVE_INFINITY, "UTC"),
        ).toBeUndefined();
        expect(parseServerDateTime("not-a-date", "UTC")).toBeUndefined();
        expect(
            parseServerDateTime("2025-02-29T00:00:00", "UTC"),
        ).toBeUndefined();
        expect(
            parseServerDateTime("2025-01-01T24:00:00", "UTC"),
        ).toBeUndefined();
        expect(
            parseServerDateTime("2025-02-30T00:00:00Z", "UTC"),
        ).toBeUndefined();
        expect(
            parseServerDateTime("2025-01-01T00:00:00", "Not/A_Timezone"),
        ).toBeUndefined();
        expect(formatServerDateTime("not-a-date", "UTC")).toBe("");
        expect(
            formatServerDateTime("2025-01-01T00:00:00", "Not/A_Timezone"),
        ).toBe("");
    });
});

describe("parseLogTimestamp", () => {
    it("should read numbers below legacy's threshold as epoch seconds and the rest as millis", () => {
        // Legacy `formatTimestamp` (`hydra-log.js:163`): `date < 1979374757`
        // multiplies by 1000, anything else is already millis.
        expect(parseLogTimestamp(1_979_374_756, "UTC")?.toISOString()).toBe(
            "2032-09-21T10:19:16.000Z",
        );
        expect(parseLogTimestamp(1_979_374_757, "UTC")?.toISOString()).toBe(
            "1970-01-23T21:49:34.757Z",
        );
        expect(parseLogTimestamp(1_755_000_000_000, "UTC")?.toISOString()).toBe(
            "2025-08-12T12:00:00.000Z",
        );
        // The same rule for an all-digit string, which is legacy's second
        // numeric branch.
        expect(parseLogTimestamp("1735689600", "UTC")?.toISOString()).toBe(
            "2025-01-01T00:00:00.000Z",
        );
        expect(parseLogTimestamp("1755000000000", "UTC")?.toISOString()).toBe(
            "2025-08-12T12:00:00.000Z",
        );
    });

    it("should keep a zoned string's own offset and read a bare one in the server zone", () => {
        expect(
            parseLogTimestamp(
                "2025-01-01T01:00:00+01:00",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.000Z");
        expect(
            parseLogTimestamp(
                "2025-01-01T00:00:00.123Z",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T00:00:00.123Z");
        expect(
            parseLogTimestamp(
                "2025-01-01T12:00:00",
                "America/New_York",
            )?.toISOString(),
        ).toBe("2025-01-01T17:00:00.000Z");
    });

    it("should have no display for an absent or unusable value", () => {
        expect(parseLogTimestamp(null, "UTC")).toBeUndefined();
        expect(parseLogTimestamp(undefined, "UTC")).toBeUndefined();
        expect(parseLogTimestamp("", "UTC")).toBeUndefined();
        expect(parseLogTimestamp(Number.NaN, "UTC")).toBeUndefined();
        expect(parseLogTimestamp("not-a-date", "UTC")).toBeUndefined();
        expect(formatLogTimestamp(null, "UTC")).toBe("");
        expect(formatLogTimestamp("not-a-date", "UTC")).toBe("");
    });

    it("should display a log timestamp in the server's zone", () => {
        expect(formatLogTimestamp(1_735_689_600, "UTC")).toBe(
            formatLogTimestamp("2025-01-01T00:00:00Z", "UTC"),
        );
        expect(formatLogTimestamp(1_735_689_600, "UTC")).not.toBe(
            formatLogTimestamp(1_735_689_600, "Australia/Sydney"),
        );
    });
});
