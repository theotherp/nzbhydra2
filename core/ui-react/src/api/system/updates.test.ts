import {describe, expect, it, vi} from "vitest";

import {
    acknowledgeWrapperOutdated,
    getUpdateMessages,
    installUpdate,
    isWrapperOutdated,
    MalformedUpdateResponseError,
    parseChangelog,
    parseUpdateInfos,
} from "./updates";
import {ApiTransport} from "../transport";

function jsonResponse(body: unknown): Response {
    return new Response(JSON.stringify(body), {
        headers: {"Content-Type": "application/json"},
    });
}

describe("updates API", () => {
    it("should normalize the bare VersionsInfo the disabled update check answers", () => {
        expect(parseUpdateInfos({})).toEqual({
            betaUpdateAvailable: false,
            betaVersion: null,
            betaVersionsEnabled: false,
            currentVersion: null,
            latestVersion: null,
            latestVersionIgnored: false,
            latestVersionIsBeta: false,
            packageInfo: null,
            showUpdateBannerOnUpdatedExternally: false,
            updateAvailable: false,
            updatedExternally: false,
            wrapperOutdated: false,
        });
    });

    it("should keep the package info a packaged instance reports", () => {
        expect(
            parseUpdateInfos({
                currentVersion: "9.0.0",
                packageInfo: {
                    author: "hotio",
                    releaseType: "docker",
                    version: "9.0.0-1",
                },
            }).packageInfo,
        ).toEqual({
            author: "hotio",
            releaseType: "docker",
            version: "9.0.0-1",
        });
    });

    it("should reject a response that is not a VersionsInfo", () => {
        expect(() => parseUpdateInfos("nope")).toThrow(
            MalformedUpdateResponseError,
        );
    });

    it("should treat an entry that is not final as a beta and drop textless changes", () => {
        expect(
            parseChangelog([
                {
                    changes: [
                        {text: "Added a thing", type: "feature"},
                        {type: "fix"},
                    ],
                    date: "2026-07-09",
                    final: false,
                    version: "9.1.0",
                },
            ]),
        ).toEqual([
            {
                changes: [{text: "Added a thing", type: "feature"}],
                date: "2026-07-09",
                final: false,
                version: "9.1.0",
            },
        ]);
    });

    it("should reject a changelog that is not a list", () => {
        expect(() => parseChangelog({version: "9.0.0"})).toThrow(
            MalformedUpdateResponseError,
        );
    });

    it("should reject messages that are not a list of strings", async () => {
        const fetchImplementation = vi
            .fn<typeof fetch>()
            .mockResolvedValue(jsonResponse([1, 2]));

        await expect(
            getUpdateMessages(new ApiTransport("/hydra/", fetchImplementation)),
        ).rejects.toThrow(MalformedUpdateResponseError);
    });

    it("should PUT the encoded version to the install endpoint", async () => {
        const fetchImplementation = vi
            .fn<typeof fetch>()
            .mockResolvedValue(jsonResponse(null));

        await installUpdate(
            new ApiTransport("/hydra/", fetchImplementation),
            "9.1.0-beta 1",
        );

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/updates/installUpdate/9.1.0-beta%201",
            expect.objectContaining({method: "PUT"}),
        );
    });
});

describe("wrapper warning", () => {
    it("should read the wrapper status as a boolean or its text form", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValueOnce(jsonResponse(true))
            .mockResolvedValueOnce(new Response("true"))
            .mockResolvedValueOnce(jsonResponse(false))
            .mockResolvedValueOnce(jsonResponse(null));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await expect(isWrapperOutdated(transport)).resolves.toBe(true);
        await expect(isWrapperOutdated(transport)).resolves.toBe(true);
        await expect(isWrapperOutdated(transport)).resolves.toBe(false);
        await expect(isWrapperOutdated(transport)).resolves.toBe(false);
        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/updates/isDisplayWrapperOutdated",
            expect.objectContaining({method: "GET"}),
        );
    });

    it("should acknowledge the outdated wrapper warning", async () => {
        const fetchImplementation = vi
            .fn()
            .mockResolvedValue(new Response(null, {status: 200}));
        const transport = new ApiTransport("/hydra", fetchImplementation);

        await acknowledgeWrapperOutdated(transport);

        expect(fetchImplementation).toHaveBeenCalledWith(
            "http://localhost:3000/hydra/internalapi/updates/setOutdatedWrapperDetectedWarningShown",
            expect.objectContaining({method: "PUT"}),
        );
    });
});
