import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Loading} from "./Loading";

describe("Loading", () => {
    it("renders the caller's message inside a status region", () => {
        render(<Loading message="Loading search history…" />);
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("MAIN");
        expect(status).toHaveTextContent("Loading search history…");
    });
});
