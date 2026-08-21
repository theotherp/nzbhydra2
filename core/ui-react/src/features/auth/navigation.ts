/**
 * The session-change navigation contract (FM-078).
 *
 * `router.tsx` builds the whole route tree *once* from the server-rendered
 * bootstrap object, and only the safe configuration is reactive (ADR-0017).
 * A login or logout changes the session's permissions, which changes the route
 * tree, the navigation items, and the login affordance itself — so after any
 * session transition the application is re-entered through a full document
 * navigation instead of a client-side route change. The server then renders a
 * fresh bootstrap for the new session and everything derived from it is
 * rebuilt.
 *
 * Kept in its own module so component tests can stub the one line that jsdom
 * cannot perform.
 */
export function navigateToApplication(baseUrl: string, path = ""): void {
    const base = new URL(baseUrl, window.location.origin);
    window.location.assign(new URL(path, base).toString());
}
