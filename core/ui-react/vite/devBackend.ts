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

export function backendUrl(): string {
    return process.env.HYDRA_BACKEND_URL ?? DEFAULT_BACKEND_URL;
}

/** `HYDRA_BACKEND_AUTH=user:password` for backends with auth configured. */
export function backendAuthorization(): string | undefined {
    const credentials = process.env.HYDRA_BACKEND_AUTH;
    return credentials === undefined || credentials === ""
        ? undefined
        : `Basic ${btoa(credentials)}`;
}

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

async function fetchBootstrapJson(): Promise<string> {
    const target = backendUrl();
    const authorization = backendAuthorization();
    const response = await fetch(new URL("/", target), {
        headers: {
            Accept: "text/html",
            ...(authorization === undefined
                ? {}
                : {Authorization: authorization}),
        },
        redirect: "manual",
    });
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

export function devBackendPlugin(): Plugin {
    return {
        name: "nzbhydra-dev-backend",
        apply: "serve",
        config: () => ({server: {proxy: backendProxy()}}),
        transformIndexHtml: {
            order: "pre",
            handler: async () => {
                let json: string;
                try {
                    json = await fetchBootstrapJson();
                } catch (error) {
                    console.warn(
                        `[nzbhydra] Falling back to stub bootstrap data: ${
                            error instanceof Error ? error.message : error
                        }`,
                    );
                    json = JSON.stringify(FALLBACK_BOOTSTRAP);
                }

                return [
                    {
                        tag: "script",
                        injectTo: "head-prepend",
                        // Escaped so a "</script>" inside the payload cannot
                        // terminate the tag early.
                        children: `window.__NZBHYDRA_BOOTSTRAP__ = ${json.replaceAll("<", "\\u003C")};`,
                    },
                    {
                        tag: "link",
                        injectTo: "head",
                        attrs: {
                            rel: "shortcut icon",
                            type: "image/x-icon",
                            href: "/static/img/favicon.ico",
                        },
                    },
                ];
            },
        },
    };
}
