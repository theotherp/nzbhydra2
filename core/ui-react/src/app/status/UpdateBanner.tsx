import {Alert, Button, Stack, Typography} from "@mui/material";

import type {UpdateInfos} from "../../api/system/updates";

/**
 * `F-PLATFORM-LIVE-STATUS`' cross-route update banner (legacy
 * `checks-footer.html`'s `updateAvailable` block): the caller has already
 * applied the withdrawal rule (`updatedExternally && !showUpdateBannerOnUpdatedExternally`
 * clears `updateAvailable`, `hydra-checks-footer.js:141-143`) before deciding
 * to render this at all, so this component only chooses between the two
 * variants legacy's `ng-if="updatedExternally"` branches on.
 */
export function UpdateBanner({
    infos,
    onIgnore,
    onInstall,
    onShowChangelog,
}: {
    infos: UpdateInfos;
    onIgnore: () => void;
    onInstall: (version: string) => void;
    onShowChangelog: (version: string) => void;
}) {
    const latestVersion = infos.latestVersion ?? "";
    const currentVersion = infos.currentVersion ?? "";

    return (
        <Alert data-testid="update-footer" severity="info" square>
            <Stack spacing={1}>
                <Typography>
                    {infos.updatedExternally
                        ? `An update is available. Your version: ${currentVersion}. Latest version: ${latestVersion}. Your NZBHydra instance seems to run in docker or is installed via a package manager. Please update this instance accordingly.`
                        : `An update is available. Your version: ${currentVersion}. Latest version: ${latestVersion}${
                              infos.latestVersionIsBeta ? " Beta" : ""
                          }.`}
                </Typography>
                <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                        flexWrap: "wrap",
                    }}
                >
                    <Button
                        data-testid="update-footer-changelog"
                        onClick={() => onShowChangelog(latestVersion)}
                        type="button"
                        variant="outlined"
                    >
                        See what&apos;s new!
                    </Button>
                    <Button
                        color="warning"
                        data-testid="update-footer-ignore"
                        onClick={onIgnore}
                        type="button"
                        variant="outlined"
                    >
                        Ignore this update
                    </Button>
                    {/*
                     * Legacy's externally-updated variant offers no install
                     * action -- the instance's own updater cannot replace
                     * binaries a docker image or package manager owns.
                     */}
                    {!infos.updatedExternally && (
                        <Button
                            color="success"
                            data-testid="update-footer-install"
                            onClick={() => onInstall(latestVersion)}
                            type="button"
                            variant="contained"
                        >
                            Update now!
                        </Button>
                    )}
                </Stack>
            </Stack>
        </Alert>
    );
}
