import {describe, expect, it} from "vitest";

import type {UpdateInfos} from "../../api/system/updates";
import {updateOffers} from "./updateOffers";

function infos(overrides: Partial<UpdateInfos> = {}): UpdateInfos {
    return {
        betaUpdateAvailable: false,
        betaVersion: "9.1.0",
        betaVersionsEnabled: false,
        currentVersion: "9.0.0",
        latestVersion: "9.0.1",
        latestVersionIgnored: false,
        latestVersionIsBeta: false,
        packageInfo: null,
        showUpdateBannerOnUpdatedExternally: false,
        updateAvailable: false,
        updatedExternally: false,
        wrapperOutdated: false,
        ...overrides,
    };
}

describe("updateOffers", () => {
    it.each([
        {
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: true,
                offerUpdate: false,
                showIgnored: false,
                showUpdatedExternallyWarning: false,
                showUpToDate: true,
                showWrapperOutdated: false,
            },
            infos: infos(),
            name: "up to date",
        },
        {
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: false,
                offerUpdate: true,
                showIgnored: false,
                showUpdatedExternallyWarning: false,
                showUpToDate: false,
                showWrapperOutdated: false,
            },
            infos: infos({updateAvailable: true}),
            name: "a release update",
        },
        {
            expected: {
                offerBetaUpdate: true,
                offerForceUpdate: false,
                offerUpdate: false,
                showIgnored: false,
                showUpdatedExternallyWarning: false,
                showUpToDate: false,
                showWrapperOutdated: false,
            },
            infos: infos({betaUpdateAvailable: true}),
            name: "a beta update only",
        },
        {
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: true,
                offerUpdate: false,
                showIgnored: true,
                showUpdatedExternallyWarning: false,
                showUpToDate: false,
                showWrapperOutdated: false,
            },
            infos: infos({latestVersionIgnored: true}),
            name: "an ignored latest version",
        },
        {
            // The branch that is easiest to invert: the warning shows, but the
            // release install offer is withdrawn, and with it the up-to-date
            // text and Force action see a cleared `updateAvailable`.
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: true,
                offerUpdate: false,
                showIgnored: false,
                showUpdatedExternallyWarning: true,
                showUpToDate: true,
                showWrapperOutdated: false,
            },
            infos: infos({updateAvailable: true, updatedExternally: true}),
            name: "an externally updated instance without the banner setting",
        },
        {
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: false,
                offerUpdate: true,
                showIgnored: false,
                showUpdatedExternallyWarning: true,
                showUpToDate: false,
                showWrapperOutdated: false,
            },
            infos: infos({
                showUpdateBannerOnUpdatedExternally: true,
                updateAvailable: true,
                updatedExternally: true,
            }),
            name: "an externally updated instance with the banner setting",
        },
        {
            // `betaUpdateAvailable` is never cleared by the external-update
            // rule, so its install offer survives it.
            expected: {
                offerBetaUpdate: true,
                offerForceUpdate: false,
                offerUpdate: false,
                showIgnored: false,
                showUpdatedExternallyWarning: true,
                showUpToDate: false,
                showWrapperOutdated: false,
            },
            infos: infos({
                betaUpdateAvailable: true,
                updateAvailable: true,
                updatedExternally: true,
            }),
            name: "an externally updated instance with a beta update",
        },
        {
            expected: {
                offerBetaUpdate: false,
                offerForceUpdate: true,
                offerUpdate: false,
                showIgnored: false,
                showUpdatedExternallyWarning: false,
                showUpToDate: true,
                showWrapperOutdated: true,
            },
            infos: infos({wrapperOutdated: true}),
            name: "an outdated wrapper",
        },
    ])("should decide the offers for $name", ({expected, infos: given}) => {
        expect(updateOffers(given)).toEqual(expected);
    });
});
