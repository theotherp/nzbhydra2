import dayjs from "dayjs";
import {describe, expect, it} from "vitest";

import {
    DATE_TIME_VALUE_FORMAT,
    DATE_VALUE_FORMAT,
    pickerValueOf,
    pickerValueString,
} from "./pickerValue";

describe("pickerValueOf", () => {
    it("reads a stored date and a stored date-time", () => {
        const date = pickerValueOf("2026-01-01", DATE_VALUE_FORMAT);
        expect(date?.isValid()).toBe(true);
        expect(date?.format(DATE_VALUE_FORMAT)).toBe("2026-01-01");

        const dateTime = pickerValueOf(
            "2024-01-01T10:30",
            DATE_TIME_VALUE_FORMAT,
        );
        expect(dateTime?.isValid()).toBe(true);
        expect(dateTime?.format(DATE_TIME_VALUE_FORMAT)).toBe(
            "2024-01-01T10:30",
        );
    });

    it("reads an empty field as no value", () => {
        expect(pickerValueOf("", DATE_VALUE_FORMAT)).toBeNull();
        expect(pickerValueOf("", DATE_TIME_VALUE_FORMAT)).toBeNull();
    });

    it("reads anything the format does not match exactly as no value", () => {
        // Loose `dayjs(value)` accepts every one of these.
        expect(pickerValueOf("2026-01", DATE_VALUE_FORMAT)).toBeNull();
        expect(pickerValueOf("2026-1-1", DATE_VALUE_FORMAT)).toBeNull();
        expect(pickerValueOf("2026-13-01", DATE_VALUE_FORMAT)).toBeNull();
        expect(pickerValueOf("not a date", DATE_VALUE_FORMAT)).toBeNull();
        // The date-time format is not satisfied by a bare date, and the `T`
        // is a literal rather than "any separator".
        expect(pickerValueOf("2024-01-01", DATE_TIME_VALUE_FORMAT)).toBeNull();
        expect(
            pickerValueOf("2024-01-01 10:30", DATE_TIME_VALUE_FORMAT),
        ).toBeNull();
    });
});

describe("pickerValueString", () => {
    it("writes each format from a picked value", () => {
        const picked = dayjs("2026-01-01T10:30:45");
        expect(pickerValueString(picked, DATE_VALUE_FORMAT)).toBe("2026-01-01");
        expect(pickerValueString(picked, DATE_TIME_VALUE_FORMAT)).toBe(
            "2026-01-01T10:30",
        );
    });

    it("writes an empty string for a cleared field", () => {
        expect(pickerValueString(null, DATE_VALUE_FORMAT)).toBe("");
        expect(pickerValueString(null, DATE_TIME_VALUE_FORMAT)).toBe("");
    });

    it("writes an empty string for an invalid value", () => {
        const invalid = dayjs("not a date");
        expect(invalid.isValid()).toBe(false);
        expect(pickerValueString(invalid, DATE_VALUE_FORMAT)).toBe("");
        expect(pickerValueString(invalid, DATE_TIME_VALUE_FORMAT)).toBe("");
    });

    it("round-trips both formats", () => {
        for (const [value, format] of [
            ["2026-01-01", DATE_VALUE_FORMAT],
            ["2024-01-01T10:30", DATE_TIME_VALUE_FORMAT],
        ] as const) {
            expect(
                pickerValueString(pickerValueOf(value, format), format),
            ).toBe(value);
        }
    });
});
