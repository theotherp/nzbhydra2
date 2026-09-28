import {AsyncLocalStorage} from "node:async_hooks";
import type {IncomingHttpHeaders, IncomingMessage} from "node:http";

import type {Plugin, ProxyOptions} from "vite";

/**
 * Development-only glue between the Vite dev server and a running NZBHydra
 * backend.
 *
 * In production the React shell is the Thymeleaf template
 * `core/src/main/resources/templates/react.html`, which inlines the session's
 * bootstrap data into `window.__NZBHYDRA_BOOTSTRAP__` and serves the bundle
 * from the same origin as the API. Neither happens under `vite dev`, so this
 * plugin reproduces both: it proxies the backend routes the application calls
 * and injects the real bootstrap payload it scrapes from the backend shell.
 *
 * The shell is requested with the browser's own credentials, so the page is
 * bootstrapped for the user who is logged in, and a basic auth challenge from
 * the backend is passed on to the browser the way production answers `/`.
 */

const DEFAULT_BACKEND_URL = "http://127.0.0.1:5076";

const BOOTSTRAP_ASSIGNMENT = "window.__NZBHYDRA_BOOTSTRAP__ =";

/** Backend routes the React application talks to; everything else is the SPA. */
const PROXIED_PATHS = [
    "/internalapi",
    "/getnzb",
    "/gettorrent",
    "/static",
    "/login",
    "/logout",
    "/ui",
    "/cache",
];

const FALLBACK_BOOTSTRAP = {
    username: null,
    authType: "NONE",
    showLogout: false,
    maySeeSearch: true,
    adminRestricted: false,
    statsRestricted: false,
    maySeeStats: true,
    searchRestricted: false,
    maySeeDetailsDl: true,
    maySeeAdmin: true,
    authConfigured: false,
    showIndexerSelection: true,
    safeConfig: {},
    baseUrl: "/",
    serverTimeZone: "UTC",
};

/**
 * The bootstrap JSON the navigation middleware fetched for the request that is
 * being served, read back by `transformIndexHtml`, which has no access to the
 * request itself.
 */
const navigationBootstrap = new AsyncLocalStorage<string>();

export type BackendCredentials = {
    authorization?: string;
    cookie?: string;
};

/**
 * Raised when the backend answers the shell request with a basic auth
 * challenge. Only raised for the browser's own credentials: with
 * `HYDRA_BACKEND_AUTH` set a refusal means that setting is wrong.
 */
export class BackendAuthChallenge extends Error {
    constructor(readonly wwwAuthenticate: string) {
        super("The backend requires authentication");
    }
}

function backendUrl(): string {
    return process.env.HYDRA_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

/** `HYDRA_BACKEND_AUTH=user:password` for backends with auth configured. */
function backendAuthorization(): string | undefined {
    const credentials = process.env.HYDRA_BACKEND_AUTH;
    return credentials === undefined || credentials === ""
        ? undefined
        : `Basic ${btoa(credentials)}`;
}

/**
 * The icon links injected into the dev shell. Must mirror the icon set
 * `core/src/main/resources/templates/react.html` declares (dev uses absolute
 * paths where the template is base-relative); `devBackend.test.ts` pins the
 * parity against the template itself, so an icon added to the served shell
 * cannot silently stay missing from the dev tab again.
 */
export const DEV_SHELL_ICON_LINKS = [
    {
        rel: "shortcut icon",
        type: "image/x-icon",
        href: "/static/img/favicon.ico",
    },
    {
        rel: "icon",
        type: "image/svg+xml",
        sizes: "any",
        href: "/static/img/favicon.svg",
    },
    {
        rel: "icon",
        type: "image/png",
        sizes: "32x32",
        href: "/static/img/favicon32.png",
    },
    {
        rel: "icon",
        type: "image/png",
        sizes: "48x48",
        href: "/static/img/favicon48.png",
    },
    {
        rel: "icon",
        type: "image/png",
        sizes: "96x96",
        href: "/static/img/favicon96.png",
    },
    {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href: "/static/img/favicon180.png",
    },
] as const;

export function backendProxy(): Record<string, ProxyOptions> {
    const authorization = backendAuthorization();
    const options: ProxyOptions = {
        target: backendUrl(),
        changeOrigin: true,
        configure: (proxy) => {
            proxy.on("proxyReq", (proxyRequest) => {
                // No Cookie header is set here on purpose. FM-095 removed the
                // `nzbhydra-ui` selector, so there is nothing left to select
                // -- and the injection was destructive: `setHeader` REPLACES
                // the browser's own Cookie header on every proxied API call,
                // which discarded `JSESSIONID` and broke dev-mode sessions
                // against a backend with authentication configured.
                if (authorization !== undefined) {
                    proxyRequest.setHeader("Authorization", authorization);
                }
            });
        },
    };

    return Object.fromEntries([
        ...PROXIED_PATHS.map((path) => [path, options] as const),
        ["/websocket", {...options, ws: true}] as const,
    ]);
}

/**
 * Extracts the bootstrap object literal Thymeleaf inlined into the shell.
 * The assignment is followed by other script content, so the object end is
 * found by brace matching rather than by looking for the statement terminator.
 */
export function extractBootstrapJson(html: string): string | null {
    const assignment = html.indexOf(BOOTSTRAP_ASSIGNMENT);
    if (assignment === -1) {
        return null;
    }
    const start = html.indexOf("{", assignment + BOOTSTRAP_ASSIGNMENT.length);
    if (start === -1) {
        return null;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < html.length; index++) {
        const character = html[index];
        if (inString) {
            if (escaped) {
                escaped = false;
            } else if (character === "\\") {
                escaped = true;
            } else if (character === '"') {
                inString = false;
            }
            continue;
        }
        if (character === '"') {
            inString = true;
        } else if (character === "{") {
            depth++;
        } else if (character === "}") {
            depth--;
            if (depth === 0) {
                return html.slice(start, index + 1);
            }
        }
    }
    return null;
}

/**
 * The credentials the shell request is sent with: the browser's session cookie
 * and basic auth header, unless `HYDRA_BACKEND_AUTH` names fixed credentials.
 */
export function forwardedCredentials(
    headers: IncomingHttpHeaders,
): BackendCredentials {
    return {
        authorization: backendAuthorization() ?? headers.authorization,
        cookie: headers.cookie,
    };
}

/**
 * Whether the request is a browser navigation Vite answers with the SPA shell,
 * as opposed to a module, an asset or a path proxied to the backend.
 */
export function isShellNavigation(request: IncomingMessage): boolean {
    const path = (request.url ?? "/").split("?")[0];
    return (
        request.method === "GET" &&
        (request.headers.accept ?? "").includes("text/html") &&
        !path.startsWith("/@") &&
        !path.startsWith("/src/") &&
        !path.startsWith("/node_modules/") &&
        ![...PROXIED_PATHS, "/websocket"].some((proxied) =>
            path.startsWith(proxied),
        )
    );
}

export async function fetchBootstrapJson(
    credentials: BackendCredentials = {},
): Promise<string> {
    const target = backendUrl();
    const response = await fetch(new URL("/", target), {
        headers: {
            Accept: "text/html",
            ...(credentials.authorization === undefined
                ? {}
                : {Authorization: credentials.authorization}),
            ...(credentials.cookie === undefined
                ? {}
                : {Cookie: credentials.cookie}),
        },
        redirect: "manual",
    });
    const challenge = response.headers.get("WWW-Authenticate");
    if (
        response.status === 401 &&
        challenge !== null &&
        backendAuthorization() === undefined
    ) {
        throw new BackendAuthChallenge(challenge);
    }
    if (!response.ok) {
        throw new Error(
            response.status === 401 || response.status === 403
                ? `${target} requires authentication; set HYDRA_BACKEND_AUTH=user:password`
                : `${target} answered the shell request with status ${response.status}`,
        );
    }

    const json = extractBootstrapJson(await response.text());
    if (json === null) {
        throw new Error(`${target} returned a shell without bootstrap data`);
    }
    JSON.parse(json);
    return json;
}

function stubBootstrapJson(error: unknown): string {
    console.warn(
        `[nzbhydra] Falling back to stub bootstrap data: ${
            error instanceof Error ? error.message : error
        }`,
    );
    return JSON.stringify(FALLBACK_BOOTSTRAP);
}

export function devBackendPlugin(): Plugin {
    return {
        name: "nzbhydra-dev-backend",
        apply: "serve",
        config: () => ({server: {proxy: backendProxy()}}),
        configureServer: (server) => {
            // Runs before Vite's own middlewares, so it sees the navigation
            // before the SPA fallback serves index.html for it.
            server.middlewares.use(async (request, response, next) => {
                if (!isShellNavigation(request)) {
                    next();
                    return;
                }
                const credentials = forwardedCredentials(request.headers);
                let json: string;
                try {
                    json = await fetchBootstrapJson(credentials);
                } catch (error) {
                    if (error instanceof BackendAuthChallenge) {
                        // What production answers `/` with: the browser asks
                        // for the login once, before the application loads,
                        // instead of the stub's admin calls triggering it.
                        response.statusCode = 401;
                        response.setHeader(
                            "WWW-Authenticate",
                            error.wwwAuthenticate,
                        );
                        response.end("Authentication required");
                        return;
                    }
                    json = stubBootstrapJson(error);
                }
                navigationBootstrap.run(json, next);
            });
        },
        transformIndexHtml: {
            order: "pre",
            handler: async () => {
                let json = navigationBootstrap.getStore();
                if (json === undefined) {
                    try {
                        json = await fetchBootstrapJson();
                    } catch (error) {
                        json = stubBootstrapJson(error);
                    }
                }

                return [
                    {
                        tag: "script",
                        injectTo: "head-prepend",
                        // Escaped so a "</script>" inside the payload cannot
                        // terminate the tag early.
                        children: `window.__NZBHYDRA_BOOTSTRAP__ = ${json.replaceAll("<", "\\u003C")};`,
                    },
                    ...DEV_SHELL_ICON_LINKS.map((attrs) => ({
                        tag: "link",
                        injectTo: "head" as const,
                        attrs,
                    })),
                ];
            },
        },
    };
}
