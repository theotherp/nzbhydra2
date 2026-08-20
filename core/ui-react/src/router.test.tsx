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

    it("should match the stats-protected saved searches route", async () => {
        window.history.replaceState({}, "", "/hydra/stats/saved-searches");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: "stats",
            authType: null,
            showLogout: true,
            maySeeSearch: true,
            adminRestricted: false,
            statsRestricted: true,
            maySeeStats: true,
            searchRestricted: false,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: true,
            showIndexerSelection: false,
            safeConfig: null,
            serverTimeZone: null,
        });
        await router.navigate({to: "/stats/saved-searches"});
        expect(router.state.matches.at(-1)?.routeId).toContain(
            "saved-searches",
        );
    });

    it("should match the stats-protected search history route", async () => {
        window.history.replaceState({}, "", "/hydra/stats/searches");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: "stats",
            authType: null,
            showLogout: true,
            maySeeSearch: true,
            adminRestricted: false,
            statsRestricted: true,
            maySeeStats: true,
            searchRestricted: false,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: true,
            showIndexerSelection: false,
            safeConfig: {keepHistory: true},
            serverTimeZone: "UTC",
        });
        await router.navigate({to: "/stats/searches"});
        expect(router.state.matches.at(-1)?.routeId).toContain("searches");
    });

    it("should match the stats-protected download history route", async () => {
        window.history.replaceState({}, "", "/hydra/stats/downloads");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: "stats",
            authType: null,
            showLogout: true,
            maySeeSearch: true,
            adminRestricted: false,
            statsRestricted: true,
            maySeeStats: true,
            searchRestricted: false,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: true,
            showIndexerSelection: false,
            safeConfig: {keepHistory: true},
            serverTimeZone: "UTC",
        });
        await router.navigate({to: "/stats/downloads"});
        expect(router.state.matches.at(-1)?.routeId).toContain("downloads");
    });

    it("should match the stats-protected notification history route", async () => {
        window.history.replaceState({}, "", "/hydra/stats/notifications");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: "stats",
            authType: null,
            showLogout: true,
            maySeeSearch: true,
            adminRestricted: false,
            statsRestricted: true,
            maySeeStats: true,
            searchRestricted: false,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: true,
            showIndexerSelection: false,
            // Notification history does not depend on `keepHistory`: legacy
            // shows its tab regardless, and so does `StatsShell`.
            safeConfig: {keepHistory: false},
            serverTimeZone: "UTC",
        });
        await router.navigate({to: "/stats/notifications"});
        expect(router.state.matches.at(-1)?.routeId).toContain("notifications");
    });

    it("should match the base-aware stats default and indexer routes", async () => {
        window.history.replaceState({}, "", "/hydra/stats/indexers");
        const router = createAppRouter({
            baseUrl: "/hydra/",
            username: "stats",
            authType: null,
            showLogout: true,
            maySeeSearch: true,
            adminRestricted: true,
            statsRestricted: true,
            maySeeStats: true,
            searchRestricted: true,
            maySeeDetailsDl: false,
            maySeeAdmin: false,
            authConfigured: true,
            showIndexerSelection: false,
            safeConfig: {keepHistory: true},
            serverTimeZone: "UTC",
        });
        await router.navigate({to: "/stats"});
        expect(router.state.matches.at(-1)?.routeId).toContain("stats");
        await router.navigate({to: "/stats/indexers"});
        expect(router.state.matches.at(-1)?.routeId).toContain("indexers");
    });
    it("should match every canonical config tab route for an admin", async () => {
        window.history.replaceState({}, "", "/hydra/config/main");
        const router = createAppRouter(adminBootstrap());

        for (const segment of [
            "main",
            "auth",
            "searching",
            "categories",
            "downloading",
            "externalTools",
            "indexers",
            "notifications",
        ]) {
            await router.navigate({to: `/config/${segment}`});
            expect(router.state.matches.at(-1)?.routeId).toBe(
                `/config/${segment}`,
            );
        }
    });

    it("should land bare /config on the main tab", async () => {
        window.history.replaceState({}, "", "/hydra/config");
        const router = createAppRouter(adminBootstrap());

        await router.navigate({to: "/config"});
        expect(router.state.location.pathname).toBe("/config/main");
        expect(router.state.matches.at(-1)?.routeId).toBe("/config/main");
    });

    it("should keep a session that may not see the admin area off the config routes", async () => {
        window.history.replaceState({}, "", "/hydra/config/main");
        const router = createAppRouter({
            ...adminBootstrap(),
            username: "user",
            maySeeAdmin: false,
            adminRestricted: true,
        });

        await router.navigate({to: "/config/main"});
        expect(router.state.matches.at(-1)?.routeId).not.toContain("config");
    });
});

function adminBootstrap() {
    return {
        baseUrl: "/hydra/",
        username: "admin",
        authType: null,
        showLogout: true,
        maySeeSearch: true,
        adminRestricted: true,
        statsRestricted: true,
        maySeeStats: true,
        searchRestricted: false,
        maySeeDetailsDl: true,
        maySeeAdmin: true,
        authConfigured: true,
        showIndexerSelection: false,
        safeConfig: {keepHistory: true},
        serverTimeZone: "UTC",
    };
}
