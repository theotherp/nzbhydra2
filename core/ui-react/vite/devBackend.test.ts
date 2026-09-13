import {readFileSync} from "node:fs";
import {join} from "node:path";

import {describe, expect, it} from "vitest";

import {
    DEV_SHELL_ICON_LINKS,
    backendProxy,
    extractBootstrapJson,
} from "./devBackend";

function shell(script: string): string {
    return `<!DOCTYPE html><html><body><div id="root"></div><script>
        ${script}
    </script><script type="module" src="static/react/assets/index.js"></script></body></html>`;
}

describe("extractBootstrapJson", () => {
    it("extracts the inlined bootstrap object", () => {
        const html = shell(
            'window.__NZBHYDRA_BOOTSTRAP__ = {"username":null,"baseUrl":"/"};',
        );

        expect(extractBootstrapJson(html)).toBe(
            '{"username":null,"baseUrl":"/"}',
        );
    });

    it("keeps nested objects intact", () => {
        const html = shell(
            'window.__NZBHYDRA_BOOTSTRAP__ = {"safeConfig":{"categories":[{"name":"All"}]},"baseUrl":"/"};',
        );

        expect(extractBootstrapJson(html)).toBe(
            '{"safeConfig":{"categories":[{"name":"All"}]},"baseUrl":"/"}',
        );
    });

    it("ignores braces and quotes inside string values", () => {
        const html = shell(
            'window.__NZBHYDRA_BOOTSTRAP__ = {"username":"a\\"}b{","baseUrl":"/"};',
        );

        expect(extractBootstrapJson(html)).toBe(
            '{"username":"a\\"}b{","baseUrl":"/"}',
        );
    });

    it("returns null when the shell carries no bootstrap data", () => {
        expect(extractBootstrapJson(shell("const other = {};"))).toBeNull();
    });

    it("returns null when the assignment is truncated", () => {
        expect(
            extractBootstrapJson(
                '<script>window.__NZBHYDRA_BOOTSTRAP__ = {"baseUrl":"/"',
            ),
        ).toBeNull();
    });
});

describe("backendProxy", () => {
    it("proxies the backend routes and upgrades the websocket", () => {
        const proxy = backendProxy();

        expect(Object.keys(proxy)).toContain("/internalapi");
        expect(proxy["/websocket"].ws).toBe(true);
        expect(proxy["/internalapi"].ws).toBeUndefined();
    });

    it("does not proxy client-side routes", () => {
        const paths = Object.keys(backendProxy());

        expect(paths).not.toContain("/");
        expect(paths).not.toContain("/stats");
        expect(paths).not.toContain("/system");
    });

    it("proxies the image cache route ProxyImagesWeb serves posterUrl from", () => {
        // `MediaSuggestion.posterUrl` (see `core/ui-react/src/api/media.ts`)
        // is a same-origin `/cache/{base64OriginalUrl}` path
        // (`ProxyImagesWeb.java`), not the original external image URL --
        // production is same-origin so it just resolves, but under `vite
        // dev` an unproxied path falls through to the SPA fallback and
        // returns `index.html` instead of image bytes.
        expect(Object.keys(backendProxy())).toContain("/cache");
    });
});

describe("DEV_SHELL_ICON_LINKS", () => {
    it("mirrors the icon set the served shell declares", () => {
        const template = readFileSync(
            join(__dirname, "../../src/main/resources/templates/react.html"),
            "utf8",
        );
        const templateHrefs = [
            ...template.matchAll(
                /<link[^>]*rel="(?:[^"]*icon[^"]*)"[^>]*href="([^"]+)"|<link[^>]*href="([^"]+)"[^>]*rel="(?:[^"]*icon[^"]*)"/g,
            ),
        ]
            .map((match) => match[1] ?? match[2])
            .filter((href) => !href.includes("${"));
        expect(templateHrefs.length).toBeGreaterThan(0);
        // Dev injects absolute paths where the template is base-relative.
        expect(DEV_SHELL_ICON_LINKS.map((link) => link.href).sort()).toEqual(
            templateHrefs.map((href) => `/${href}`).sort(),
        );
    });
});
