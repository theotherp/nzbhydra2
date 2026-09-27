import {cleanup, render} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {
    BASE_DOCUMENT_TITLE,
    documentTitle,
    useDocumentTitle,
} from "./documentTitle";

function Titled({parts}: {parts: (string | undefined)[]}) {
    useDocumentTitle(...parts);
    return null;
}

describe("documentTitle", () => {
    afterEach(() => {
        cleanup();
        document.title = "";
    });

    it("should join the application name and the non-blank parts", () => {
        expect(documentTitle()).toBe("NZBHydra 2");
        expect(documentTitle("Config", "Searching")).toBe(
            "NZBHydra 2 - Config - Searching",
        );
        expect(documentTitle("Search", undefined, "  ", " movie ")).toBe(
            "NZBHydra 2 - Search - movie",
        );
    });

    it("should set the title while mounted, follow changes and restore the plain name on unmount", () => {
        const {rerender, unmount} = render(
            <Titled parts={["Config", "Main"]} />,
        );
        expect(document.title).toBe("NZBHydra 2 - Config - Main");

        rerender(<Titled parts={["Config", "Searching"]} />);
        expect(document.title).toBe("NZBHydra 2 - Config - Searching");

        unmount();
        expect(document.title).toBe(BASE_DOCUMENT_TITLE);
    });

    it("should leave the arriving page's title when one page replaces another", () => {
        const {rerender} = render(<Titled key="config" parts={["Config"]} />);
        rerender(<Titled key="system" parts={["System", "Log"]} />);
        expect(document.title).toBe("NZBHydra 2 - System - Log");
    });
});
