import {describe, expect, it} from "vitest";

import {formatNumber, formatPercent} from "./formatting";

describe("formatPercent", () => {
    it("rounds a raw backend double to one decimal and states its unit", () => {
        expect(formatPercent(55.714287)).toBe("55.7%");
        expect(formatPercent(0)).toBe("0.0%");
        expect(formatPercent(100)).toBe("100.0%");
    });

    it("renders nothing for an absent value, leaving punctuation to the caller", () => {
        expect(formatPercent(undefined)).toBe("");
    });
});

describe("formatNumber", () => {
    it("renders a fixed number of decimals", () => {
        expect(formatNumber(4.66666, 1)).toBe("4.7");
        expect(formatNumber(119.5, 0)).toBe("120");
    });

    it("renders nothing for an absent value", () => {
        expect(formatNumber(undefined, 1)).toBe("");
    });
});
