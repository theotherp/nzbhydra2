import {describe, expect, it} from "vitest";

import {
    buildQualityTooltipSections,
    qualityBadgeSeverity,
    resultQualityRating,
    showsQualityColumn,
} from "./qualityBadge";

describe("qualityBadgeSeverity", () => {
    it.each([
        [10, "success"],
        [7, "success"],
        [6, "warning"],
        [4, "warning"],
        [3, "error"],
        [0, "error"],
    ] as const)("maps rating %i to %s", (rating, severity) => {
        expect(qualityBadgeSeverity(rating)).toBe(severity);
    });
});

describe("buildQualityTooltipSections", () => {
    it("returns no sections for an absent list", () => {
        expect(buildQualityTooltipSections(undefined)).toEqual([]);
    });

    it("returns no sections for an empty list", () => {
        expect(buildQualityTooltipSections([])).toEqual([]);
    });

    it("buckets by prefix, strips it, and drops [INFO] entries", () => {
        const sections = buildQualityTooltipSections([
            "[QUALITY] 1080p release",
            "[CRITICAL] Fake release detected",
            "[WARNING] Low seeders",
            "[INFO] Redundant with quality factors",
        ]);
        expect(sections).toEqual([
            {
                key: "quality",
                heading: "Quality factors:",
                messages: ["1080p release"],
            },
            {
                key: "critical",
                heading: "Critical:",
                messages: ["Fake release detected"],
            },
            {
                key: "warning",
                heading: "Warning:",
                messages: ["Low seeders"],
            },
        ]);
    });

    it("omits a section entirely when its bucket is empty", () => {
        const sections = buildQualityTooltipSections([
            "[QUALITY] 1080p release",
        ]);
        expect(sections).toEqual([
            {
                key: "quality",
                heading: "Quality factors:",
                messages: ["1080p release"],
            },
        ]);
    });

    it("groups multiple messages under the same heading", () => {
        const sections = buildQualityTooltipSections([
            "[QUALITY] 1080p release",
            "[QUALITY] x264 codec",
        ]);
        expect(sections).toEqual([
            {
                key: "quality",
                heading: "Quality factors:",
                messages: ["1080p release", "x264 codec"],
            },
        ]);
    });
});

// FM-201: what the quality column treats as a rating.
describe("resultQualityRating", () => {
    it.each([
        [{qualityRating: 10}, 10],
        [{qualityRating: 1}, 1],
        [{qualityRating: 0}, undefined],
        [{}, undefined],
    ])("reads %j as %s", (result, expected) => {
        expect(resultQualityRating(result)).toBe(expected);
    });
});

// FM-201: the quality column exists only with the indicator on and a rated
// loaded result.
describe("showsQualityColumn", () => {
    it("should need both the indicator and a rated result", () => {
        const rated = [{}, {qualityRating: 5}];
        expect(showsQualityColumn(true, rated)).toBe(true);
        expect(showsQualityColumn(false, rated)).toBe(false);
        expect(showsQualityColumn(true, [{}, {qualityRating: 0}])).toBe(false);
        expect(showsQualityColumn(true, [])).toBe(false);
    });
});
