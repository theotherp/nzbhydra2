import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";

import type {SearchResult} from "../../../api/search";
import {ApiTransport} from "../../../api/transport";
import {ToastProvider} from "../../../components/toasts/ToastProvider";
import {binsearchUrl, nfoTooltip, ResultDetailLinks} from "./ResultDetailLinks";

const result: SearchResult = {
    searchResultId: "42",
    title: "Some.Release.1080p",
    indexer: "Mock",
    category: "Movies",
    comments: 5,
    comments_link: "https://indexer.test/details#comments",
    details_link: "https://indexer.test/details",
    source: "poster@example.invalid",
    hasNfo: "YES",
};

function nfoResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

function renderLinks(
    overrides: Partial<SearchResult> = {},
    options: {
        dereferer?: unknown;
        fetchImplementation?: typeof fetch;
        maySeeDetailsDl?: boolean;
    } = {},
) {
    const fetchImplementation =
        options.fetchImplementation ??
        (vi.fn().mockResolvedValue(nfoResponse({})) as unknown as typeof fetch);
    const transport = new ApiTransport("/", fetchImplementation);
    render(
        <ToastProvider>
            <ResultDetailLinks
                dereferer={options.dereferer}
                maySeeDetailsDl={options.maySeeDetailsDl ?? true}
                result={{...result, ...overrides}}
                transport={transport}
            />
        </ToastProvider>,
    );
    return {fetchImplementation};
}

describe("binsearchUrl", () => {
    it("should build legacy's exact Binsearch query", () => {
        expect(binsearchUrl("alt.binaries.test")).toBe(
            "http://binsearch.info/?q=alt.binaries.test&max=100&adv_age=3000&server=",
        );
    });

    it("should encode a source with characters that would break the query", () => {
        expect(binsearchUrl("a poster&x=1")).toBe(
            "http://binsearch.info/?q=a%20poster%26x%3D1&max=100&adv_age=3000&server=",
        );
    });
});

describe("nfoTooltip", () => {
    it("should name each of the three real hasNfo states", () => {
        expect(nfoTooltip("YES")).toBe("Show NFO");
        expect(nfoTooltip("MAYBE")).toBe(
            "Try to load NFO (may not be available)",
        );
        expect(nfoTooltip("NO")).toBe("No NFO available");
        expect(nfoTooltip(undefined)).toBe("No NFO available");
    });
});

describe("ResultDetailLinks", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("should offer the NFO action for a certain NFO", async () => {
        const {fetchImplementation} = renderLinks(
            {hasNfo: "YES"},
            {
                fetchImplementation: vi.fn().mockResolvedValue(
                    nfoResponse({
                        successful: true,
                        hasNfo: true,
                        content: "the nfo text",
                    }),
                ) as unknown as typeof fetch,
            },
        );
        const action = screen.getByTestId("result-nfo");
        expect(action).toBeEnabled();
        expect(action).toHaveAccessibleName("Show NFO: Some.Release.1080p");

        fireEvent.click(action);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/internalapi/nfo/42",
            expect.objectContaining({method: "GET"}),
        );
        expect(await screen.findByTestId("nfo-dialog")).toBeVisible();
        expect(screen.getByTestId("nfo-dialog-content")).toHaveTextContent(
            "the nfo text",
        );
    });

    it("should offer the NFO action for a possible NFO", async () => {
        renderLinks({hasNfo: "MAYBE"});
        const action = screen.getByTestId("result-nfo");
        expect(action).toBeEnabled();
        expect(action).toHaveAccessibleName(
            "Try to load NFO (may not be available): Some.Release.1080p",
        );
    });

    it("should disable the NFO action and never call the API without an NFO", async () => {
        const {fetchImplementation} = renderLinks({hasNfo: "NO"});
        const action = screen.getByTestId("result-nfo");
        expect(action).toBeDisabled();
        expect(action).toHaveAccessibleName(
            "No NFO available: Some.Release.1080p",
        );

        fireEvent.click(action);

        expect(fetchImplementation).not.toHaveBeenCalled();
        expect(screen.queryByTestId("nfo-dialog")).toBeNull();
    });

    it("should treat an absent hasNfo exactly like NO", async () => {
        const {fetchImplementation} = renderLinks({hasNfo: undefined});
        expect(screen.getByTestId("result-nfo")).toBeDisabled();
        fireEvent.click(screen.getByTestId("result-nfo"));
        expect(fetchImplementation).not.toHaveBeenCalled();
    });

    it("should report a successful response that carries no NFO as information", async () => {
        renderLinks(
            {hasNfo: "MAYBE"},
            {
                fetchImplementation: vi.fn().mockResolvedValue(
                    nfoResponse({
                        successful: true,
                        hasNfo: false,
                        content: null,
                    }),
                ) as unknown as typeof fetch,
            },
        );

        fireEvent.click(screen.getByTestId("result-nfo"));

        expect(await screen.findByText("No NFO available")).toBeVisible();
        expect(screen.queryByTestId("nfo-dialog")).toBeNull();
    });

    it("should report an unsuccessful response with the message it carries", async () => {
        renderLinks(
            {hasNfo: "YES"},
            {
                fetchImplementation: vi.fn().mockResolvedValue(
                    nfoResponse({
                        successful: false,
                        hasNfo: false,
                        content: "Indexer unreachable",
                    }),
                ) as unknown as typeof fetch,
            },
        );

        fireEvent.click(screen.getByTestId("result-nfo"));

        expect(await screen.findByText("Indexer unreachable")).toBeVisible();
        expect(screen.queryByTestId("nfo-dialog")).toBeNull();
    });

    it("should report a failed request without leaving the action stuck", async () => {
        renderLinks(
            {hasNfo: "YES"},
            {
                fetchImplementation: vi
                    .fn()
                    .mockRejectedValue(
                        new Error("network"),
                    ) as unknown as typeof fetch,
            },
        );

        fireEvent.click(screen.getByTestId("result-nfo"));

        expect(
            await screen.findByText("Unable to load the NFO."),
        ).toBeVisible();
        await waitFor(() =>
            expect(screen.getByTestId("result-nfo")).toBeEnabled(),
        );
    });

    // The safety property this whole viewer exists to keep: legacy rendered
    // the NFO through `ng-bind-html`, so an indexer could inject markup.
    it("should render hostile NFO content inert, as text", async () => {
        const hostile =
            '<img src=x onerror="window.__nfoPwned = true"><script>window.__nfoPwned = true;</script><b>bold</b>';
        renderLinks(
            {hasNfo: "YES"},
            {
                fetchImplementation: vi.fn().mockResolvedValue(
                    nfoResponse({
                        successful: true,
                        hasNfo: true,
                        content: hostile,
                    }),
                ) as unknown as typeof fetch,
            },
        );

        fireEvent.click(screen.getByTestId("result-nfo"));

        const content = await screen.findByTestId("nfo-dialog-content");
        expect(content).toHaveTextContent(hostile);
        expect(content.querySelector("img")).toBeNull();
        expect(content.querySelector("script")).toBeNull();
        expect(content.querySelector("b")).toBeNull();
        expect(content.childElementCount).toBe(0);
        expect(
            (window as unknown as {__nfoPwned?: boolean}).__nfoPwned,
        ).toBeUndefined();
    });

    it("should render the three external links in legacy's order for a permitted session", () => {
        renderLinks();
        const links = screen.getByTestId("result-links");
        expect(
            // The MUI icons carry their own `data-testid`s, so only the
            // controls themselves are compared.
            [...links.querySelectorAll("[data-testid^='result-']")].map(
                (element) => element.getAttribute("data-testid"),
            ),
        ).toEqual([
            "result-nfo",
            "result-binsearch-link",
            "result-comments-link",
            "result-details-link",
        ]);
        expect(screen.getByTestId("result-binsearch-link")).toHaveAttribute(
            "href",
            binsearchUrl("poster@example.invalid"),
        );
        expect(screen.getByTestId("result-comments-link")).toHaveAttribute(
            "href",
            "https://indexer.test/details#comments",
        );
        expect(screen.getByTestId("result-details-link")).toHaveAttribute(
            "href",
            "https://indexer.test/details",
        );
        for (const testId of [
            "result-binsearch-link",
            "result-comments-link",
            "result-details-link",
        ]) {
            expect(screen.getByTestId(testId)).toHaveAttribute(
                "target",
                "_blank",
            );
            expect(screen.getByTestId(testId)).toHaveAttribute(
                "rel",
                "noopener",
            );
        }
    });

    it("should hide every external link, but not the NFO action, without the details permission", () => {
        renderLinks({}, {maySeeDetailsDl: false});
        expect(screen.getByTestId("result-nfo")).toBeVisible();
        expect(screen.queryByTestId("result-binsearch-link")).toBeNull();
        expect(screen.queryByTestId("result-comments-link")).toBeNull();
        expect(screen.queryByTestId("result-details-link")).toBeNull();
    });

    it("should omit the Binsearch link for a result without a source", () => {
        renderLinks({source: undefined});
        expect(screen.queryByTestId("result-binsearch-link")).toBeNull();
        expect(screen.getByTestId("result-details-link")).toBeVisible();
    });

    it("should disable an unavailable comments or details link", () => {
        renderLinks({comments: undefined, details_link: undefined});
        expect(screen.getByTestId("result-comments-link")).toBeDisabled();
        expect(screen.getByTestId("result-comments-link")).not.toHaveAttribute(
            "href",
        );
        expect(screen.getByTestId("result-details-link")).toBeDisabled();
    });

    it("should disable a comments link the result counts but does not carry", () => {
        renderLinks({comments: 5, comments_link: undefined});
        expect(screen.getByTestId("result-comments-link")).toBeDisabled();
    });

    it("should route every link through the configured dereferer", () => {
        renderLinks({}, {dereferer: "https://dereferer.test/?$s"});
        expect(screen.getByTestId("result-binsearch-link")).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent(binsearchUrl("poster@example.invalid"))}`,
        );
        expect(screen.getByTestId("result-comments-link")).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent("https://indexer.test/details#comments")}`,
        );
        expect(screen.getByTestId("result-details-link")).toHaveAttribute(
            "href",
            `https://dereferer.test/?${encodeURIComponent("https://indexer.test/details")}`,
        );
    });

    it("should disable a link whose target C-EXTERNAL-LINKS refuses", () => {
        renderLinks({
            comments_link: "javascript:alert(1)",
            details_link: "https://indexer.test/details",
        });
        expect(screen.getByTestId("result-comments-link")).toBeDisabled();
        expect(screen.getByTestId("result-details-link")).toBeEnabled();
    });
});
