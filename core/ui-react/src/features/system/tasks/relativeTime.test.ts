import {describe, expect, it} from "vitest";

import {formatRelativeTime} from "./relativeTime";

const NOW = new Date("2026-08-22T12:00:00Z");

describe("formatRelativeTime", () => {
    it("should describe a moment in the past", () => {
        expect(formatRelativeTime(new Date("2026-08-22T11:55:00Z"), NOW)).toBe(
            "5 minutes ago",
        );
        expect(formatRelativeTime(new Date("2026-08-22T10:00:00Z"), NOW)).toBe(
            "2 hours ago",
        );
        expect(formatRelativeTime(new Date("2026-08-20T12:00:00Z"), NOW)).toBe(
            "2 days ago",
        );
    });

    it("should describe a moment in the future", () => {
        expect(formatRelativeTime(new Date("2026-08-22T12:05:00Z"), NOW)).toBe(
            "in 5 minutes",
        );
        expect(formatRelativeTime(new Date("2026-08-23T12:00:00Z"), NOW)).toBe(
            "tomorrow",
        );
    });

    it("should describe the current moment in seconds", () => {
        expect(formatRelativeTime(new Date("2026-08-22T12:00:00Z"), NOW)).toBe(
            "now",
        );
        expect(formatRelativeTime(new Date("2026-08-22T11:59:58Z"), NOW)).toBe(
            "2 seconds ago",
        );
    });
});
