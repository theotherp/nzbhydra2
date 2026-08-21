import {describe, expect, it, vi} from "vitest";

import {ApiTransport} from "../../api/transport";
import {askForPassword, loginWithForm, logout} from "./session";

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

    it("should accept the askpassword challenge response the backend really sends", async () => {
        // `AuthWeb.askForPassword` returns `UserInfosProvider.getUserInfos`,
        // which sets neither `baseUrl` nor `safeConfig`; parsing it as
        // `BootstrapData` would reject every real successful challenge.
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(
                jsonResponse({...bootstrap, baseUrl: null, safeConfig: null}),
            );
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(
            askForPassword(transport, "hydra"),
        ).resolves.toBeUndefined();
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/askpassword?old_username=hydra",
        );
    });

    it("should reject a challenge the server refuses", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 401}));
        const transport = new ApiTransport("/hydra/", fetchImplementation);

        await expect(askForPassword(transport)).rejects.toThrow();
        expect(fetchImplementation.mock.calls[0][0]).toBe(
            "http://localhost:3000/hydra/internalapi/askpassword",
        );
    });
});

function jsonResponse(value: unknown): Response {
    return new Response(JSON.stringify(value), {
        headers: {"Content-Type": "application/json"},
    });
}
