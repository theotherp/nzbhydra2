import {describe, expect, it} from "vitest";

import {PAGE_SIZE} from "./pageSize";

describe("PAGE_SIZE", () => {
    it("is the fixed history table page size", () => {
        expect(PAGE_SIZE).toBe(25);
    });
});
