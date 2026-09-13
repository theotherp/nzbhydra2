import {cleanup, render, screen} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {SafeRichContent} from "./SafeRichContent";

afterEach(() => cleanup());

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

    it("should render a changelog line inline, keeping its issue link and dropping block markup", () => {
        render(
            <SafeRichContent
                boundary="changelog"
                html={
                    'Fixed it. See <a href="https://github.com/theotherp/nzbhydra2/issues/1066">#1066</a><p>block</p><img src=x onerror="alert(1)">'
                }
            />,
        );

        const content = screen.getByTestId("safe-rich-content");
        expect(content.tagName).toBe("SPAN");
        expect(screen.getByRole("link", {name: "#1066"})).toHaveAttribute(
            "href",
            "https://github.com/theotherp/nzbhydra2/issues/1066",
        );
        expect(content.querySelector("p")).not.toBeInTheDocument();
        expect(content.querySelector("img")).not.toBeInTheDocument();
        expect(content).toHaveTextContent("block");
    });
});
