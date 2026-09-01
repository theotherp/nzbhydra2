import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitForElementToBeRemoved,
} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {UnauthorizedError} from "../../api/transport";
import {reportSessionError, resetSessionExpiryForTests} from "../sessionExpiry";
import {SessionExpiredDialog} from "./SessionExpiredDialog";

const unauthorized = () => new UnauthorizedError("Unauthorized", 401, null);

function expireSession() {
    act(() => {
        reportSessionError(unauthorized());
    });
}

beforeEach(() => {
    resetSessionExpiryForTests();
});

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

describe("SessionExpiredDialog", () => {
    it("should stay closed until a request reports an expired session", () => {
        render(<SessionExpiredDialog />);

        expect(screen.queryByTestId("session-expired-dialog")).toBeNull();

        expireSession();

        const dialog = screen.getByTestId("session-expired-dialog");
        expect(dialog).toBeVisible();
        expect(
            screen.getByRole("heading", {name: "Session expired"}),
        ).toBeInTheDocument();
        expect(dialog).toHaveTextContent("Your session has expired");
    });

    /*
     * The affordance's whole point: a full document navigation is what
     * completes the OIDC (or form) login flow, so the action has to be a real
     * reload and not a router navigation.
     */
    it("should reload the document from the Reload action", () => {
        const reload = vi.fn();
        vi.stubGlobal("location", {...window.location, reload});
        render(<SessionExpiredDialog />);
        expireSession();

        fireEvent.click(screen.getByTestId("session-expired-reload"));

        expect(reload).toHaveBeenCalledOnce();
    });

    it("should close on dismissal and not reopen on a later 401", async () => {
        render(<SessionExpiredDialog />);
        expireSession();

        fireEvent.click(screen.getByRole("button", {name: "Dismiss"}));
        // Awaited rather than asserted synchronously: MUI keeps a closing
        // `Dialog` mounted for its exit transition.
        await waitForElementToBeRemoved(() =>
            screen.queryByTestId("session-expired-dialog"),
        );

        // A background refetch that fails the same way afterwards: the latch
        // is spent, so nothing reopens over the reader.
        expireSession();

        expect(screen.queryByTestId("session-expired-dialog")).toBeNull();
    });

    /*
     * A query can fail while the shell is still rendering, so the latch may
     * already be flipped when this mounts. The initial state reads it rather
     * than waiting for a notification that has already been delivered.
     */
    it("should open immediately when the session expired before it mounted", () => {
        reportSessionError(unauthorized());

        render(<SessionExpiredDialog />);

        expect(screen.getByTestId("session-expired-dialog")).toBeVisible();
    });

    /*
     * Coalescing, observed where the reader observes it: five failing
     * requests, one dialog in the document.
     */
    it("should render one dialog however many requests failed", () => {
        render(<SessionExpiredDialog />);

        act(() => {
            for (let request = 0; request < 5; request++) {
                reportSessionError(unauthorized());
            }
        });

        expect(screen.getAllByTestId("session-expired-dialog")).toHaveLength(1);
    });
});
