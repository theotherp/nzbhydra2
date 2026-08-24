import {describe, expect, it} from "vitest";

import {historyUserInfoType} from "./historyUserInfoType";

describe("historyUserInfoType", () => {
    it("reads logging.historyUserInfoType off the safe config", () => {
        expect(
            historyUserInfoType({logging: {historyUserInfoType: "BOTH"}}),
        ).toBe("BOTH");
    });

    it.each([
        undefined,
        null,
        "not an object",
        {},
        {logging: undefined},
        {logging: "not an object"},
        {logging: {historyUserInfoType: 7}},
    ])("falls back to NONE for %j", (safeConfig) => {
        expect(historyUserInfoType(safeConfig)).toBe("NONE");
    });
});
