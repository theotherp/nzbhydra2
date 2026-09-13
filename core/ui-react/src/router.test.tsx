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
    it("should match the stats-protected aggregate dashboard route", async () => {
        window.history.replaceState({}, "", "/hydra/stats/stats");
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
        await router.navigate({to: "/stats/stats"});
        expect(router.state.matches.at(-1)?.routeId).toBe("/stats/stats");
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

    it("should match every system tab route for an admin", async () => {
        window.history.replaceState({}, "", "/hydra/system/control");
        const router = createAppRouter(adminBootstrap());

        for (const segment of [
            "control",
            "updates",
            "log",
            "tasks",
            "backup",
            "bugreport",
            "news",
            "about",
        ]) {
            await router.navigate({to: `/system/${segment}`});
            expect(router.state.matches.at(-1)?.routeId).toBe(
                `/system/${segment}`,
            );
        }
    });

    it("should land bare /system on the control tab", async () => {
        window.history.replaceState({}, "", "/hydra/system");
        const router = createAppRouter(adminBootstrap());

        await router.navigate({to: "/system"});
        expect(router.state.location.pathname).toBe("/system/control");
        expect(router.state.matches.at(-1)?.routeId).toBe("/system/control");
    });

    it("should keep a session that may not see the admin area off every system route, news included", async () => {
        // Legacy gates every `root.system.*` state, News among them, on
        // `loginRequired(..., "admin")` (`nzbhydra.js:396-600`).
        window.history.replaceState({}, "", "/hydra/system/control");
        const router = createAppRouter({
            ...adminBootstrap(),
            username: "user",
            maySeeAdmin: false,
            adminRestricted: true,
        });

        for (const segment of [
            "control",
            "updates",
            "log",
            "tasks",
            "backup",
            "bugreport",
            "news",
            "about",
        ]) {
            await router.navigate({to: `/system/${segment}`});
            expect(router.state.matches.at(-1)?.routeId).not.toContain(
                "system",
            );
        }
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

    it("should expose the login route to every session", async () => {
        for (const bootstrap of [
            adminBootstrap(),
            {...formBootstrap(), searchRestricted: false},
        ]) {
            window.history.replaceState({}, "", "/hydra/login");
            const router = createAppRouter(bootstrap);

            await router.navigate({to: "/login"});
            expect(router.state.matches.at(-1)?.routeId).toBe("/login");
        }
    });

    it("should send an anonymous FORM session to the login page for a restricted search area", async () => {
        window.history.replaceState({}, "", "/hydra/");
        const router = createAppRouter(formBootstrap());

        await router.navigate({to: "/"});
        expect(router.state.location.pathname).toBe("/login");
        expect(router.state.matches.at(-1)?.routeId).toBe("/login");
    });

    it("should send an anonymous FORM session to the login page for restricted stats and admin areas", async () => {
        for (const target of [
            "/stats/indexers",
            "/stats/searches",
            "/config/main",
            "/system/control",
        ]) {
            window.history.replaceState({}, "", "/hydra/");
            const router = createAppRouter({
                ...formBootstrap(),
                adminRestricted: true,
                statsRestricted: true,
            });

            await router.navigate({to: target});
            expect(
                router.state.location.pathname,
                `${target} must resolve to the login page`,
            ).toBe("/login");
        }
    });

    it("should let an anonymous FORM session reach an area it may see", async () => {
        window.history.replaceState({}, "", "/hydra/");
        const router = createAppRouter({
            ...formBootstrap(),
            maySeeSearch: true,
        });

        await router.navigate({to: "/"});
        expect(router.state.matches.at(-1)?.routeId).toBe("/");
    });

    it("should keep the migration placeholder for a restricted area under non-FORM authentication", async () => {
        // Legacy's `loginRequired` resolves the state whenever
        // `authType !== "FORM"`, leaving the backend's own challenge in
        // charge (`nzbhydra.js:692-715`).
        for (const authType of [null, "BASIC"]) {
            window.history.replaceState({}, "", "/hydra/");
            const router = createAppRouter({
                ...formBootstrap(),
                adminRestricted: true,
                authType,
            });

            await router.navigate({to: "/config/main"});
            expect(router.state.location.pathname).toBe("/config/main");
            expect(router.state.matches.at(-1)?.routeId).not.toContain(
                "config",
            );

            await router.navigate({to: "/"});
            expect(router.state.matches.at(-1)?.routeId).toBe("/");
        }
    });
});

/** An anonymous FORM session that may not see the restricted search area. */
function formBootstrap() {
    return {
        ...adminBootstrap(),
        username: null,
        authType: "FORM",
        showLogout: false,
        maySeeSearch: false,
        searchRestricted: true,
        adminRestricted: false,
        statsRestricted: false,
        maySeeStats: false,
        maySeeAdmin: false,
        maySeeDetailsDl: false,
    };
}

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
