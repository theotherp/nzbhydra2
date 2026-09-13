import {beforeEach, describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import type {SafeConfig} from "../../bootstrap";
import type {Toast} from "../../components/toasts/toasts";
import type {ServerPreferences} from "../../services/preferences/serverPreferences";
import {
    parseFailedBackup,
    runStartupChecks,
    type StartupAnnouncement,
} from "./startupCheckRunner";

type Route = {
    body?: unknown;
    method?: string;
    path: string;
};

const NEWS_ENTRY = {
    forCurrentVersion: true,
    forNewerVersion: false,
    news: "<p>Something happened</p>",
    version: "v1.2.3",
};

let requests: {method: string; url: string}[];
let routes: Route[];
let fetchImplementation: ReturnType<typeof vi.fn<typeof fetch>>;

function route(path: string, body: unknown, method = "GET") {
    routes.push({body, method, path});
}

function jsonBody(body: unknown): Response {
    return body === undefined
        ? new Response(null, {status: 200})
        : new Response(JSON.stringify(body), {
              headers: {"Content-Type": "application/json"},
          });
}

beforeEach(() => {
    requests = [];
    routes = [];
    fetchImplementation = vi.fn<typeof fetch>((input, init) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        requests.push({method, url});
        const parsed = new URL(url);
        const path = `${parsed.pathname.replace("/hydra/", "")}${parsed.search}`;
        const match = routes.find(
            (candidate) =>
                candidate.path === path &&
                (candidate.method ?? "GET") === method,
        );
        if (match === undefined) {
            return Promise.resolve(new Response("nope", {status: 500}));
        }
        return Promise.resolve(jsonBody(match.body));
    });
});

function preferencesDouble(
    stored: Record<string, unknown> = {},
): ServerPreferences & {cleared: string[]} {
    const cleared: string[] = [];
    return {
        cleared,
        clear: vi.fn(async (key: string) => {
            cleared.push(key);
            delete stored[key];
        }),
        read: vi.fn(async (key: string) => stored[key]),
        readFlag: vi.fn(async (key: string) => stored[key] === true),
        write: vi.fn(async () => undefined),
    };
}

type RunOptions = {
    isAdmin?: boolean;
    now?: Date;
    preferences?: ServerPreferences;
    safeConfig?: SafeConfig;
    /** Announcements this run must leave open instead of closing. */
    leaveOpen?: (announcement: StartupAnnouncement) => boolean;
};

async function run(options: RunOptions = {}) {
    const shown: StartupAnnouncement[] = [];
    const toasts: Toast[] = [];
    await runStartupChecks({
        isAdmin: options.isAdmin ?? true,
        now: () => options.now ?? new Date("2026-08-22T12:00:00Z"),
        preferences: options.preferences ?? preferencesDouble(),
        safeConfig: options.safeConfig ?? {},
        show: (announcement) => {
            shown.push(announcement);
            return options.leaveOpen?.(announcement) === true
                ? new Promise<void>(() => undefined)
                : Promise.resolve();
        },
        toast: (toast) => toasts.push(toast),
        transport: new ApiTransport("/hydra/", fetchImplementation),
    });
    return {shown, toasts};
}

function paths(method = "GET"): string[] {
    return requests
        .filter((request) => request.method === method)
        .map((request) => new URL(request.url).pathname.replace("/hydra/", ""));
}

describe("runStartupChecks welcome branch", () => {
    it("should show the welcome dialog and no news on a first start", async () => {
        route("internalapi/welcomeshown", false);
        route("internalapi/welcomeshown", undefined, "PUT");

        const {shown} = await run();

        expect(shown).toEqual([{kind: "welcome"}]);
        // The mutual exclusion: neither news list is even requested.
        expect(paths()).not.toContain("internalapi/usernews");
        expect(paths()).not.toContain("internalapi/news/forcurrentversion");
        expect(paths("PUT")).toContain("internalapi/welcomeshown");
    });

    it("should record the welcome as shown before it opens the dialog", async () => {
        route("internalapi/welcomeshown", false);
        route("internalapi/welcomeshown", undefined, "PUT");
        const order: string[] = [];
        fetchImplementation.mockImplementation((input, init) => {
            const method = init?.method ?? "GET";
            order.push(`${method} ${String(input)}`);
            return Promise.resolve(
                method === "GET" ? jsonBody(false) : jsonBody(undefined),
            );
        });

        await runStartupChecks({
            isAdmin: false,
            preferences: preferencesDouble(),
            safeConfig: {},
            show: () => {
                order.push("welcome dialog");
                return Promise.resolve();
            },
            toast: () => undefined,
            transport: new ApiTransport("/hydra/", fetchImplementation),
        });

        expect(order).toEqual([
            "GET http://localhost:3000/hydra/internalapi/welcomeshown",
            "PUT http://localhost:3000/hydra/internalapi/welcomeshown",
            "welcome dialog",
        ]);
    });

    it("should show user news, then news, then VIP warnings once the welcome was shown", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", [
            {id: "1", newsAsHtml: "<p>first</p>", title: "First"},
            {id: "2", newsAsHtml: "<p>second</p>", title: "Second"},
        ]);
        route("internalapi/usernews/1/dismiss", {}, "PUT");
        route("internalapi/usernews/2/dismiss", {}, "PUT");
        route("internalapi/news/forcurrentversion", [NEWS_ENTRY]);
        route("internalapi/news/saveshown", {}, "PUT");

        const {shown, toasts} = await run({
            now: new Date("2026-08-22T12:00:00Z"),
            safeConfig: {
                indexers: [
                    {name: "Expired", vipExpirationDate: "2026-08-01"},
                    {name: "Soon", vipExpirationDate: "2026-08-25"},
                    {name: "Later", vipExpirationDate: "2027-01-01"},
                    {name: "Forever", vipExpirationDate: "Lifetime"},
                ],
                showNews: true,
            },
        });

        expect(shown.map((announcement) => announcement.kind)).toEqual([
            "userNews",
            "userNews",
            "news",
        ]);
        expect(toasts).toEqual([
            {
                message: "VIP access for indexer Expired expired on 2026-08-01",
                severity: "warning",
            },
            {
                message:
                    "VIP access for indexer Soon will expire on 2026-08-25",
                severity: "warning",
            },
        ]);
        expect(paths("PUT")).toEqual([
            "internalapi/usernews/1/dismiss",
            "internalapi/usernews/2/dismiss",
            "internalapi/news/saveshown",
        ]);
    });

    it("should dismiss each user news entry before the next one opens", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", [
            {id: "1", newsAsHtml: "<p>first</p>", title: "First"},
            {id: "2", newsAsHtml: "<p>second</p>", title: "Second"},
        ]);
        route("internalapi/usernews/1/dismiss", {}, "PUT");
        route("internalapi/usernews/2/dismiss", {}, "PUT");
        const order: string[] = [];
        const dismissals = requests;

        await runStartupChecks({
            isAdmin: false,
            preferences: preferencesDouble(),
            safeConfig: {},
            show: (announcement) => {
                if (announcement.kind === "userNews") {
                    order.push(`show ${announcement.entry.id}`);
                    order.push(
                        `dismissed so far: ${
                            dismissals.filter(
                                (request) => request.method === "PUT",
                            ).length
                        }`,
                    );
                }
                return Promise.resolve();
            },
            toast: () => undefined,
            transport: new ApiTransport("/hydra/", fetchImplementation),
        });

        expect(order).toEqual([
            "show 1",
            "dismissed so far: 0",
            "show 2",
            "dismissed so far: 1",
        ]);
    });

    it("should not show news when the safe configuration disables it", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);

        const {shown} = await run({safeConfig: {showNews: false}});

        expect(shown).toEqual([]);
        expect(paths()).not.toContain("internalapi/news/forcurrentversion");
    });

    it("should acknowledge news only after the dialog was closed", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/news/forcurrentversion", [NEWS_ENTRY]);
        route("internalapi/news/saveshown", {}, "PUT");

        void run({
            leaveOpen: (announcement) => announcement.kind === "news",
            safeConfig: {showNews: true},
        });
        await vi.waitFor(() =>
            expect(paths()).toContain("internalapi/news/forcurrentversion"),
        );

        expect(paths("PUT")).not.toContain("internalapi/news/saveshown");
    });
});

describe("runStartupChecks admin warnings", () => {
    it("should send no admin check at all for a non-admin session", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        const preferences = preferencesDouble({
            belowJava17: true,
            outOfMemoryDetected: true,
        });

        const {shown} = await run({isAdmin: false, preferences});

        expect(shown).toEqual([]);
        expect(preferences.read).not.toHaveBeenCalled();
        expect(preferences.readFlag).not.toHaveBeenCalled();
        expect(paths()).not.toContain(
            "internalapi/updates/isDisplayWrapperOutdated",
        );
        expect(paths()).not.toContain("internalapi/news/forcurrentversion");
    });

    it("should show each raised warning once and clear it afterwards", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/updates/isDisplayWrapperOutdated", true);
        route(
            "internalapi/updates/setOutdatedWrapperDetectedWarningShown",
            undefined,
            "PUT",
        );
        const preferences = preferencesDouble({
            FAILED_BACKUP: {
                message: "database is corrupt",
                time: "2026-08-20T03:00:00",
            },
            belowJava17: true,
            outOfMemoryDetected: true,
            showOpenToInternetWithoutAuth: true,
        });

        const {shown} = await run({preferences});

        expect(shown).toEqual([
            {kind: "warning", warning: "outOfMemory"},
            {kind: "warning", warning: "outdatedWrapper"},
            {kind: "warning", warning: "openToInternet"},
            {kind: "warning", warning: "belowJava17"},
            {
                failedBackup: {
                    message: "database is corrupt",
                    time: "2026-08-20T03:00:00",
                },
                kind: "warning",
                warning: "failedBackup",
            },
        ]);
        expect(preferences.cleared).toEqual([
            "outOfMemoryDetected",
            "showOpenToInternetWithoutAuth",
            "belowJava17",
            "FAILED_BACKUP",
        ]);
        expect(paths("PUT")).toContain(
            "internalapi/updates/setOutdatedWrapperDetectedWarningShown",
        );
    });

    it("should keep a warning raised while its dialog is still open", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        const preferences = preferencesDouble({outOfMemoryDetected: true});

        void run({
            leaveOpen: (announcement) => announcement.kind === "warning",
            preferences,
        });
        await vi.waitFor(() => expect(preferences.readFlag).toHaveBeenCalled());

        expect(preferences.clear).not.toHaveBeenCalled();
    });

    it("should show nothing for a cleared flag stored as the string false", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        const preferences = preferencesDouble();
        preferences.readFlag = vi.fn(async () => false);

        const {shown} = await run({preferences});

        expect(shown).toEqual([]);
    });

    it("should contain a failing check and still run the following ones", async () => {
        route("internalapi/welcomeshown", true);
        route("internalapi/usernews", []);
        // `isDisplayWrapperOutdated` has no route, so it answers HTTP 500.
        const preferences = preferencesDouble({belowJava17: true});
        preferences.readFlag = vi.fn(async (key: string) => {
            if (key === "outOfMemoryDetected") {
                throw new Error("storage unreachable");
            }
            return key === "belowJava17";
        });

        const {shown} = await run({preferences});

        expect(shown).toEqual([{kind: "warning", warning: "belowJava17"}]);
    });

    it("should contain a failing welcome check and still run the admin checks", async () => {
        // `welcomeshown` has no route either, so the whole welcome branch fails.
        route("internalapi/updates/isDisplayWrapperOutdated", false);
        const preferences = preferencesDouble({outOfMemoryDetected: true});

        const {shown} = await run({preferences});

        expect(shown).toEqual([{kind: "warning", warning: "outOfMemory"}]);
    });
});

describe("parseFailedBackup", () => {
    it("should read the stored record's message and time", () => {
        expect(
            parseFailedBackup({message: "boom", shown: false, time: "then"}),
        ).toEqual({message: "boom", time: "then"});
    });

    it("should tolerate a record without a message", () => {
        expect(parseFailedBackup({time: "then"})).toEqual({
            message: null,
            time: "then",
        });
    });

    it("should ignore an empty key and an already shown record", () => {
        expect(parseFailedBackup(undefined)).toBeUndefined();
        expect(parseFailedBackup("")).toBeUndefined();
        expect(parseFailedBackup({shown: true})).toBeUndefined();
    });
});
