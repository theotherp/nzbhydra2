import {describe, expect, it} from "vitest";

import {getBootstrapData, maySeeAdminArea, normalizeBaseUrl} from "./bootstrap";

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

describe("maySeeAdminArea", () => {
    const restricted = {
        ...bootstrap,
        authConfigured: true,
        adminRestricted: true,
    };

    it("should admit everyone when no authentication is configured", () => {
        expect(
            maySeeAdminArea({
                ...bootstrap,
                authConfigured: false,
                maySeeAdmin: false,
                adminRestricted: true,
            }),
        ).toBe(true);
    });

    it("should admit an authenticated admin", () => {
        expect(
            maySeeAdminArea({
                ...restricted,
                username: "admin",
                maySeeAdmin: true,
            }),
        ).toBe(true);
    });

    it("should refuse an authenticated non-admin", () => {
        expect(
            maySeeAdminArea({
                ...restricted,
                username: "user",
                maySeeAdmin: false,
            }),
        ).toBe(false);
    });

    it("should refuse an anonymous session while the admin area is restricted", () => {
        expect(maySeeAdminArea({...restricted, username: null})).toBe(false);
    });

    it("should admit an anonymous session while the admin area is unrestricted", () => {
        expect(
            maySeeAdminArea({
                ...restricted,
                adminRestricted: false,
                username: null,
            }),
        ).toBe(true);
    });
});
