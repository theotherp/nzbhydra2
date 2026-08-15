import {describe, expect, it} from "vitest";

import {formatServerDateTime, parseServerDateTime} from "./dateTime";

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
