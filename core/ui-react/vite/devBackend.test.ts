import {describe, expect, it} from "vitest";

import {backendProxy, extractBootstrapJson} from "./devBackend";

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
});
