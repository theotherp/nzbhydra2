import {describe, expect, it} from "vitest";

import {createAppRouter} from "./router";

describe("createAppRouter", () => {
    it("should match the canonical base-aware search route", async () => {
        window.history.replaceState({}, "", "/hydra/");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: null,
            authType: null,
            showLogout: false,
            maySeeSearch: true,
            adminRestricted: false,
            statsRestricted: false,
            maySeeStats: false,
            searchRestricted: false,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: false,
            showIndexerSelection: false,
            safeConfig: null,
            serverTimeZone: null,
        });
        await router.navigate({to: "/"});
        expect(router.state.matches.at(-1)?.routeId).toBe("/");
    });
});
