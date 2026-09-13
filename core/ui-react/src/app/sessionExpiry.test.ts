import {beforeEach, describe, expect, it, vi} from "vitest";

import {
    ApiError,
    ApiTransport,
    ForbiddenError,
    UnauthorizedError,
} from "../api/transport";
import {askForPassword, loginWithForm, logout} from "../features/auth/session";
import {retryUnlessUnauthorized} from "./queryDefaults";
import {
    isSessionExpired,
    reportSessionError,
    resetSessionExpiryForTests,
    subscribeToSessionExpiry,
} from "./sessionExpiry";

const unauthorized = () => new UnauthorizedError("Unauthorized", 401, null);

/** A transport whose every request is refused with a 401. */
function refusingTransport(): ApiTransport {
    return new ApiTransport("/hydra/", () =>
        Promise.resolve(
            new Response("Unauthorized", {
                headers: {"Content-Type": "text/plain"},
                status: 401,
            }),
        ),
    );
}

beforeEach(() => {
    resetSessionExpiryForTests();
});

describe("sessionExpiry", () => {
    it("should notify subscribers on the first unauthorized report", () => {
        const listener = vi.fn();
        subscribeToSessionExpiry(listener);

        expect(isSessionExpired()).toBe(false);
        reportSessionError(unauthorized());

        expect(listener).toHaveBeenCalledOnce();
        expect(isSessionExpired()).toBe(true);
    });

    /*
     * The coalescing contract, stated at the notifier: an expired session does
     * not fail one request, it fails every request the page has in flight.
     */
    it("should notify once however many requests report the same expiry", () => {
        const listener = vi.fn();
        subscribeToSessionExpiry(listener);

        for (let request = 0; request < 5; request++) {
            reportSessionError(unauthorized());
        }

        expect(listener).toHaveBeenCalledOnce();
    });

    /*
     * The latch is one-way for the life of the document: a subscriber that
     * "dismissed" the notice is not re-notified by the next failing refetch.
     * Only a full navigation (a fresh module instance) re-arms it.
     */
    it("should stay latched after a dismissal until a full navigation", () => {
        const listener = vi.fn();
        subscribeToSessionExpiry(listener);
        reportSessionError(unauthorized());
        listener.mockClear();

        reportSessionError(unauthorized());

        expect(listener).not.toHaveBeenCalled();
        expect(isSessionExpired()).toBe(true);
    });

    it.each([
        ["a forbidden error", new ForbiddenError("Forbidden", 403, null)],
        ["a server error", new ApiError("Server error", 500, null)],
        ["a network failure", new TypeError("Failed to fetch")],
        ["a non-error rejection", "401"],
    ])("should ignore %s", (_label, error) => {
        const listener = vi.fn();
        subscribeToSessionExpiry(listener);

        reportSessionError(error);

        expect(listener).not.toHaveBeenCalled();
        expect(isSessionExpired()).toBe(false);
    });

    it("should stop notifying an unsubscribed listener", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeToSessionExpiry(listener);

        unsubscribe();
        reportSessionError(unauthorized());

        expect(listener).not.toHaveBeenCalled();
    });

    /*
     * FM-171's Out Of Scope, proven rather than asserted in prose: the auth
     * flows call `ApiTransport` directly and never traverse a `QueryClient`,
     * so the `QueryCache`/`MutationCache` hook cannot see their 401s. That
     * matters most for `askForPassword`, whose *purpose* is to provoke one
     * (`AuthWeb.askForPassword` answers 401 with a `WWW-Authenticate`
     * challenge so the browser prompts for BASIC credentials) -- raising
     * "your session has expired" there would fire during a login, on a
     * response the login flow considers success.
     *
     * The test rejects all three flows with a real 401 from a real transport
     * and asserts the latch never moved.
     */
    describe("direct-transport auth flows", () => {
        it.each([
            [
                "loginWithForm",
                (transport: ApiTransport) =>
                    loginWithForm(transport, {password: "p", username: "u"}),
            ],
            ["logout", (transport: ApiTransport) => logout(transport)],
            [
                "askForPassword",
                (transport: ApiTransport) =>
                    askForPassword(transport, "previous"),
            ],
        ])("should not raise the affordance from %s", async (_name, call) => {
            const listener = vi.fn();
            subscribeToSessionExpiry(listener);

            await expect(call(refusingTransport())).rejects.toBeInstanceOf(
                UnauthorizedError,
            );

            expect(listener).not.toHaveBeenCalled();
            expect(isSessionExpired()).toBe(false);
        });
    });
});

/*
 * `retryUnlessUnauthorized` lives in `queryDefaults.ts` (both `QueryClient`s
 * read their defaults from there), but it is tested here because it is the
 * same FM-171 capability as the notifier above: the no-retry rule exists so
 * that the dialog is raised at the first 401 instead of three exponential
 * backoffs later, and the two halves fail together if either drifts.
 */
describe("retryUnlessUnauthorized", () => {
    it("should never retry an unauthorized error", () => {
        expect(retryUnlessUnauthorized(0, unauthorized())).toBe(false);
    });

    /*
     * The other side, and the one with the blast radius: this predicate
     * replaces react-query's own `retry: 3` for *every* query in the
     * application, so every non-401 error must retry exactly as many times as
     * it did before. `query-core` 5.90.20 retries a numeric `retry` while
     * `failureCount < retry` (`retryer.js:88`) with a browser default of `3`
     * (`:85`), so these are the decisions the number would have made on each
     * side of its boundary.
     */
    it.each([
        [0, true],
        [1, true],
        [2, true],
        [3, false],
        [4, false],
    ])(
        "should keep react-query's default count at failure %i",
        (failureCount, expected) => {
            for (const error of [
                new ForbiddenError("Forbidden", 403, null),
                new ApiError("Server error", 500, null),
                new TypeError("Failed to fetch"),
            ]) {
                expect(retryUnlessUnauthorized(failureCount, error)).toBe(
                    expected,
                );
            }
        },
    );
});
