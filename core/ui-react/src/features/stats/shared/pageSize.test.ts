import {describe, expect, it} from "vitest";

import {
    DEFAULT_PAGE_SIZE,
    isHistoryPageSize,
    PAGE_SIZE_OPTIONS,
} from "./pageSize";

describe("history page sizes", () => {
    it("offers 25, 50, and 100", () => {
        expect(PAGE_SIZE_OPTIONS).toEqual([25, 50, 100]);
    });

    it("starts on 25, the size every history table used before FM-166", () => {
        expect(DEFAULT_PAGE_SIZE).toBe(25);
        expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
    });

    it("recognizes only the offered sizes", () => {
        for (const size of PAGE_SIZE_OPTIONS) {
            expect(isHistoryPageSize(size)).toBe(true);
        }
        for (const other of [0, 1, 24, 26, 75, 200, -25, 25.5]) {
            expect(isHistoryPageSize(other)).toBe(false);
        }
        for (const other of ["25", null, undefined, {}, [25]]) {
            expect(isHistoryPageSize(other)).toBe(false);
        }
    });
});
