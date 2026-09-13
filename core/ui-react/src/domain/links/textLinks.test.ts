import {describe, expect, it} from "vitest";

import {linkedTextLines, linkedTextSegments} from "./textLinks";

describe("linkedTextSegments", () => {
    it("should keep plain text as one inert segment", () => {
        expect(linkedTextSegments("Indexer Mock1 was disabled", null)).toEqual([
            {text: "Indexer Mock1 was disabled"},
        ]);
    });

    it("should link http and https URLs and keep the surrounding text inert", () => {
        expect(
            linkedTextSegments(
                "See https://example.com/nzb?a=1 for more",
                null,
            ),
        ).toEqual([
            {text: "See "},
            {
                text: "https://example.com/nzb?a=1",
                href: "https://example.com/nzb?a=1",
            },
            {text: " for more"},
        ]);
    });

    it("should route a linked URL through the configured dereferer", () => {
        expect(
            linkedTextSegments(
                "at http://example.com/x",
                "https://dereferer.example/?url=$s",
            ),
        ).toEqual([
            {text: "at "},
            {
                text: "http://example.com/x",
                href: "https://dereferer.example/?url=http%3A%2F%2Fexample.com%2Fx",
            },
        ]);
    });

    it("should never link an executable or opaque scheme", () => {
        for (const hostile of [
            "javascript:alert(1)",
            "JavaScript:alert(1)",
            "data:text/html;base64,PHNjcmlwdD4=",
            "vbscript:msgbox(1)",
            "file:///etc/passwd",
            "//example.com/protocol-relative",
        ]) {
            const segments = linkedTextSegments(
                `before ${hostile} after`,
                null,
            );
            expect(
                segments.every((segment) => segment.href === undefined),
                hostile,
            ).toBe(true);
            expect(segments.map((segment) => segment.text).join("")).toBe(
                `before ${hostile} after`,
            );
        }
    });

    it("should not link a URL whose dereferer transformation is unusable", () => {
        expect(
            linkedTextSegments("see https://example.com", "javascript:$s"),
        ).toEqual([{text: "see https://example.com"}]);
    });

    it("should render markup as characters rather than trusting it", () => {
        const markup =
            '<img src=x onerror="alert(1)"> <b>bold</b> <a href="javascript:alert(1)">x</a>';
        const segments = linkedTextSegments(markup, null);
        expect(segments).toEqual([{text: markup}]);
    });

    it("should drop sentence punctuation that follows a URL", () => {
        expect(
            linkedTextSegments("Grabbed from https://example.com/a.", null),
        ).toEqual([
            {text: "Grabbed from "},
            {text: "https://example.com/a", href: "https://example.com/a"},
            {text: "."},
        ]);
    });

    it("should split a comma-separated URL list into separate links", () => {
        expect(
            linkedTextSegments("https://one.example,https://two.example", null),
        ).toEqual([
            {text: "https://one.example", href: "https://one.example/"},
            {text: ","},
            {text: "https://two.example", href: "https://two.example/"},
        ]);
    });

    it("should keep a closing parenthesis that the URL itself opened", () => {
        expect(
            linkedTextSegments("(see https://example.com/a_(b))", null),
        ).toEqual([
            {text: "(see "},
            {
                text: "https://example.com/a_(b)",
                href: "https://example.com/a_(b)",
            },
            {text: ")"},
        ]);
    });
});

describe("linkedTextLines", () => {
    it("should split every line-break flavour into its own line", () => {
        expect(linkedTextLines("first\nsecond\r\nthird\rfourth", null)).toEqual(
            [
                [{text: "first"}],
                [{text: "second"}],
                [{text: "third"}],
                [{text: "fourth"}],
            ],
        );
    });

    it("should link inside each line independently", () => {
        expect(
            linkedTextLines(
                "Indexer disabled\nDetails: https://x.example",
                null,
            ),
        ).toEqual([
            [{text: "Indexer disabled"}],
            [
                {text: "Details: "},
                {text: "https://x.example", href: "https://x.example/"},
            ],
        ]);
    });

    it("should keep an empty line as an empty segment list", () => {
        expect(linkedTextLines("a\n\nb", null)).toEqual([
            [{text: "a"}],
            [],
            [{text: "b"}],
        ]);
    });
});
