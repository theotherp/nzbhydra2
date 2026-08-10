import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {SafeRichContent} from "./SafeRichContent";

describe("SafeRichContent", () => {
    it("should preserve safe links while removing executable HTML and unsafe URLs", () => {
        render(
            <SafeRichContent
                html={
                    '<a href="https://example.test/news">Safe link</a><img src=x onerror="alert(1)"><a href="javascript:alert(1)">Unsafe link</a><script>alert(1)</script>'
                }
            />,
        );

        expect(screen.getByRole("link", {name: "Safe link"})).toHaveAttribute(
            "href",
            "https://example.test/news",
        );
        expect(screen.getByText("Unsafe link")).not.toHaveAttribute("href");
        expect(
            screen.getByTestId("safe-rich-content").querySelector("img"),
        ).not.toBeInTheDocument();
        expect(
            screen.getByTestId("safe-rich-content").querySelector("script"),
        ).not.toBeInTheDocument();
    });
});
