import {describe, expect, it} from "vitest";

import {parseExpirationDate, vipExpiryWarnings} from "./vipExpiry";

const NOW = new Date(2026, 7, 22, 12, 0, 0);

describe("parseExpirationDate", () => {
    it("should read the calendar date as local midnight, like legacy's moment", () => {
        expect(parseExpirationDate("2026-08-22")).toEqual(
            new Date(2026, 7, 22),
        );
    });

    it("should refuse anything that is not a plain calendar date", () => {
        expect(parseExpirationDate("Lifetime")).toBeUndefined();
        expect(parseExpirationDate("2026-08")).toBeUndefined();
        expect(parseExpirationDate("")).toBeUndefined();
    });
});

describe("vipExpiryWarnings", () => {
    it("should warn about an expired and a soon expiring indexer only", () => {
        const warnings = vipExpiryWarnings(
            {
                indexers: [
                    {name: "Gone", vipExpirationDate: "2026-08-01"},
                    {name: "Soon", vipExpirationDate: "2026-08-27"},
                    {name: "Later", vipExpirationDate: "2026-09-30"},
                ],
            },
            NOW,
        );

        expect(warnings).toEqual([
            "VIP access for indexer Gone expired on 2026-08-01",
            "VIP access for indexer Soon will expire on 2026-08-27",
        ]);
    });

    it("should treat a Lifetime, absent, or unparseable date as no warning", () => {
        expect(
            vipExpiryWarnings(
                {
                    indexers: [
                        {name: "Forever", vipExpirationDate: "Lifetime"},
                        {name: "Unknown", vipExpirationDate: "soonish"},
                        {name: "Plain"},
                    ],
                },
                NOW,
            ),
        ).toEqual([]);
    });

    it("should read nothing from a configuration without indexers", () => {
        expect(vipExpiryWarnings(null, NOW)).toEqual([]);
        expect(vipExpiryWarnings({}, NOW)).toEqual([]);
        expect(vipExpiryWarnings({indexers: "nope"}, NOW)).toEqual([]);
    });

    it("should warn on the day the access runs out and stay quiet a week ahead", () => {
        // Legacy compares `expiry - 7 days < now`, so exactly eight days out is
        // still silent while the seventh day warns.
        expect(
            vipExpiryWarnings(
                {indexers: [{name: "A", vipExpirationDate: "2026-08-30"}]},
                NOW,
            ),
        ).toEqual([]);
        expect(
            vipExpiryWarnings(
                {indexers: [{name: "A", vipExpirationDate: "2026-08-29"}]},
                NOW,
            ),
        ).toEqual(["VIP access for indexer A will expire on 2026-08-29"]);
    });
});
