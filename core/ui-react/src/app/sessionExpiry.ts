import {UnauthorizedError} from "../api/transport";

/**
 * `C-SESSION-EXPIRY`: the one place that decides a session has expired, and
 * the one place that says so.
 *
 * Issue #1080's server half (`60a121aae`) made an expired session answer a
 * background `/internalapi/**` request with a plain 401 instead of redirecting
 * into a cross-origin OIDC authorization flow the fetch could not complete.
 * That 401 arrives at the client as `UnauthorizedError`, and until FM-171 it
 * surfaced as whatever ordinary error state the failing page happens to
 * render — one per page area, none of them naming the session, and the only
 * recovery a manual reload.
 *
 * The recovery has to be *coalesced*, because an expired session does not fail
 * one request: every query a page has in flight fails at the same moment, and
 * a per-request affordance would stack that many notices. So this module is a
 * latch, not an event bus. The first `UnauthorizedError` it is given flips
 * `expired` and notifies; every later report — during the dialog, after the
 * reader dismissed it, for the rest of the document's life — is a no-op. Only
 * a full document navigation (the reload the dialog offers, or a login) builds
 * a fresh module instance and re-arms it. That is deliberate rather than
 * incidental: re-arming on dismissal would let the next background refetch
 * reopen a dialog the reader has just closed.
 *
 * It is a leaf: a plain module with one import (`../api/transport`, which
 * imports nothing itself), no React, and no query-client knowledge, because
 * its callers are `QueryCache`/`MutationCache` `onError` callbacks — plain
 * functions outside the React tree, which cannot consume a context-based
 * dialog service (see `SessionExpiredDialog.tsx` for that argument in full).
 */

type SessionExpiryListener = () => void;

const listeners = new Set<SessionExpiryListener>();

let expired = false;

/**
 * Reports a failed request's error, raising the session-expired affordance if
 * it is the first `UnauthorizedError` of this document's life.
 *
 * Only `UnauthorizedError` is accepted. `ForbiddenError` (403) is a *live*
 * session that may not do this particular thing — reloading would not help and
 * the claim "your session has expired" would be false — and every other
 * rejection (a network failure, a 500, a parse error) belongs to the page that
 * issued the request.
 */
export function reportSessionError(error: unknown): void {
    if (!(error instanceof UnauthorizedError) || expired) {
        return;
    }
    expired = true;
    // Iterated over a copy so a listener that unsubscribes itself while being
    // notified cannot disturb the iteration.
    for (const listener of [...listeners]) {
        listener();
    }
}

/**
 * Subscribes to the latch flipping, and returns the unsubscribe function.
 *
 * A subscriber that arrives *after* the latch has already flipped is not
 * notified — it reads `isSessionExpired()` for its initial state instead, so
 * that "already expired" and "just expired" are one state rather than a race.
 */
export function subscribeToSessionExpiry(
    listener: SessionExpiryListener,
): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

/** Whether a request has already reported an expired session. */
export function isSessionExpired(): boolean {
    return expired;
}

/**
 * Test-only seam. The latch is module-scoped and deliberately one-way, so
 * without this the first test in a file to report a 401 would leave every
 * later test in that file with a spent latch (vitest gives each *file* a fresh
 * module registry, not each test).
 *
 * This weakens nothing in production: it is a separate export that no
 * production module imports (`knip` would flag it if one stopped using it in
 * tests too), and `reportSessionError` itself has no reset path.
 */
export function resetSessionExpiryForTests(): void {
    expired = false;
    listeners.clear();
}
