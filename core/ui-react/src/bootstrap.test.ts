import {describe, expect, it} from "vitest";

import {getBootstrapData, normalizeBaseUrl} from "./bootstrap";

const bootstrap = {
    adminRestricted: false,
    authConfigured: false,
    authType: "NONE",
    baseUrl: "/hydra",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: {},
    searchRestricted: false,
    serverTimeZone: "UTC",
    showIndexerSelection: true,
    showLogout: true,
    statsRestricted: false,
    username: null,
};

describe("bootstrap data", () => {
    it("should normalize the application base used by runtime URLs", () => {
        expect(getBootstrapData(bootstrap).baseUrl).toBe("/hydra/");
    });

    it("should reject an external bootstrap base URL", () => {
        expect(() => normalizeBaseUrl("https://example.test/hydra/")).toThrow(
            "React bootstrap base URL must be same-origin and path-only",
        );
    });
});
