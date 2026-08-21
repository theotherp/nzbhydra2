import type {UpdateInfos} from "../../api/system/updates";

/**
 * What the Updates page shows for a given `API-UPDATES-INFOS` answer. Legacy
 * spreads this over `hydra-updates.js:13-28` (which rewrites `updateAvailable`
 * before rendering) and `updates.html`'s `ng-if`s; keeping it in one pure
 * function is what makes the flag combinations testable.
 */
export type UpdateOffers = {
    /** "A new beta release (...) is available." plus its install action. */
    offerBetaUpdate: boolean;
    /** The Force update action, offered exactly when nothing else is. */
    offerForceUpdate: boolean;
    /** "A new release (...) is available." plus its install action. */
    offerUpdate: boolean;
    /** "The latest version was ignored by you." */
    showIgnored: boolean;
    /** The docker/package-manager warning. */
    showUpdatedExternallyWarning: boolean;
    /** "You're up to date!" */
    showUpToDate: boolean;
    /** The outdated-wrapper warning with its per-platform file lists. */
    showWrapperOutdated: boolean;
};

export function updateOffers(infos: UpdateInfos): UpdateOffers {
    // The interaction that is easy to invert: an externally updated instance
    // (docker, package manager) keeps the warning but loses the *release*
    // install offer, unless the user asked to be offered it anyway. Legacy
    // does this by clearing `updateAvailable` before rendering, so the
    // up-to-date text and the Force action see the cleared value too — while
    // `betaUpdateAvailable` is left untouched and still offers its install.
    const suppressed = infos.updatedExternally
        ? !infos.showUpdateBannerOnUpdatedExternally
        : false;
    const offerUpdate = infos.updateAvailable && !suppressed;
    return {
        offerBetaUpdate: infos.betaUpdateAvailable,
        offerForceUpdate: !offerUpdate && !infos.betaUpdateAvailable,
        offerUpdate,
        showIgnored: infos.latestVersionIgnored,
        showUpdatedExternallyWarning: infos.updatedExternally,
        showUpToDate:
            !offerUpdate &&
            !infos.latestVersionIgnored &&
            !infos.betaUpdateAvailable,
        showWrapperOutdated: infos.wrapperOutdated,
    };
}
