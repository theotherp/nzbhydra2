import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {loginWithForm, logout} from "./session";

const bootstrap = {
    adminRestricted: true,
    authConfigured: true,
    authType: "FORM",
    baseUrl: "/hydra",
    maySeeAdmin: true,
    maySeeDetailsDl: true,
    maySeeSearch: true,
    maySeeStats: true,
    safeConfig: {},
    searchRestricted: true,
    serverTimeZone: "UTC",
    showIndexerSelection: false,
    showLogout: true,
    statsRestricted: true,
    username: "hydra",
};

describe("auth session", () => {
    it("should submit FORM credentials and return the current permission state", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(jsonResponse(bootstrap));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            loginWithForm(transport, {username: "hydra", password: "secret"}),
        ).resolves.toMatchObject({
            baseUrl: "/hydra/",
            maySeeAdmin: true,
            username: "hydra",
        });

        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/login",
        );
        const loginRequest = fetchImplementation.mock
            .calls[0][1] as RequestInit;
        expect(loginRequest.method).toBe("POST");
        expect(loginRequest.body).toBeInstanceOf(URLSearchParams);
        expect(loginRequest.body?.toString()).toBe(
            "username=hydra&password=secret",
        );
        expect(fetchImplementation.mock.calls[1][0]).toBe(
            "http://localhost:3000/hydra/internalapi/userinfos",
        );
    });

    it("should refresh the current permission state after logout", async () => {
        const loggedOut = {...bootstrap, maySeeAdmin: false, username: null};
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(new Response(null, {status: 200}))
            .mockResolvedValueOnce(jsonResponse(loggedOut));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(logout(transport)).resolves.toMatchObject({
            maySeeAdmin: false,
            username: null,
        });
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/logout",
        );
        expect(fetchImplementation.mock.calls[1][0]).toBe(
            "http://localhost:3000/hydra/internalapi/userinfos",
        );
    });
});

function jsonResponse(value: unknown): Response {
    return new Response(JSON.stringify(value), {
        headers: {"Content-Type": "application/json"},
    });
}
