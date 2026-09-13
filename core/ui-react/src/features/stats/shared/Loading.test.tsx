import {act, cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {Loading} from "./Loading";

describe("Loading", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });
    afterEach(() => {
        cleanup();
        vi.useRealTimers();
    });

    it("renders nothing at 299ms", () => {
        render(<Loading message="Loading search history…" />);
        act(() => {
            vi.advanceTimersByTime(299);
        });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("renders the caller's message inside a status region at 300ms", () => {
        render(<Loading message="Loading search history…" />);
        act(() => {
            vi.advanceTimersByTime(300);
        });
        const status = screen.getByRole("status");
        expect(status.tagName).toBe("MAIN");
        expect(status).toHaveTextContent("Loading search history…");
    });

    it("never renders and leaks no timer when unmounted before the delay fires", () => {
        const {unmount} = render(<Loading message="Loading search history…" />);
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
        unmount();
        act(() => {
            vi.advanceTimersByTime(1000);
        });
        expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
});
