import {describe, expect, it} from "vitest";

import {categoryAxisWidth, horizontalBarChartHeight} from "./chartSizing";

describe("horizontalBarChartHeight", () => {
    it("clamps a row count to the chart's own bounds", () => {
        expect(horizontalBarChartHeight(1)).toBe(160);
        expect(horizontalBarChartHeight(10)).toBe(340);
        expect(horizontalBarChartHeight(100)).toBe(900);
    });
});

describe("categoryAxisWidth", () => {
    it("asks for what the longest label needs when the chart has the room", () => {
        // A 30-character indexer name on a 1200px-wide card: 256px is well
        // under the 600px ceiling, so the axis asks for all of it and
        // nothing is elided. Before FM-172 the axis took x-charts' default
        // 45px here, which cut the name to about four characters.
        expect(categoryAxisWidth(30, 1200, false)).toBe(256);
    });

    it("reserves nothing beyond what short labels need", () => {
        expect(categoryAxisWidth(5, 1200, false)).toBe(56);
    });

    it("never gives the labels more than half the chart's width", () => {
        // 60 characters want 496px; a 600px card allows 300px, and x-charts
        // elides the tick text to that -- honestly, with the axis tooltip
        // keeping the whole label.
        expect(categoryAxisWidth(60, 600, false)).toBe(300);
    });

    it("keeps a tighter ceiling below sm", () => {
        expect(categoryAxisWidth(30, 360, true)).toBe(84);
    });

    it("falls back to a fixed ceiling while the chart is unmeasured", () => {
        expect(categoryAxisWidth(30, undefined, false)).toBe(140);
        expect(categoryAxisWidth(30, undefined, true)).toBe(84);
    });

    it("still leaves room for a few characters when the reported width is implausible", () => {
        expect(categoryAxisWidth(30, 20, false)).toBe(48);
    });
});
