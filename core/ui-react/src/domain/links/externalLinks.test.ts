import {describe, expect, it} from "vitest";

import {externalLink} from "./externalLinks";

describe("externalLink", () => {
    it("should apply a safe dereferer without trusting unsafe URLs", () => {
        expect(
            externalLink(
                "https://example.test/a?q=1",
                "https://dereferer.test/?url=$s",
            ),
        ).toBe(
            "https://dereferer.test/?url=https%3A%2F%2Fexample.test%2Fa%3Fq%3D1",
        );
        expect(externalLink("javascript:alert(1)", undefined)).toBeUndefined();
        expect(
            externalLink("https://example.test", "javascript:$us"),
        ).toBeUndefined();
    });
});
