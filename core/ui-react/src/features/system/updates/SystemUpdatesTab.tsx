import {
    Alert,
    AlertTitle,
    Button,
    Card,
    CardContent,
    CircularProgress,
    Link,
    Stack,
    Typography,
} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useState} from "react";

import {
    getUpdateInfos,
    getVersionHistory,
    type ChangelogEntry,
    type UpdateInfos,
} from "../../../api/system/updates";
import {ApiTransport} from "../../../api/transport";
import {ChangelogDialog} from "../../../services/updates/ChangelogDialog";
import {ChangelogEntries} from "../../../services/updates/ChangelogEntries";
import {updateOffers} from "../../../services/updates/updateOffers";
import {useUpdateInstaller} from "../../../services/updates/useUpdateInstaller";

const WRAPPER_RELEASES_URL =
    "https://github.com/theotherp/nzbhydra2/releases/latest";

/**
 * `F-SYSTEM-UPDATES`: legacy's Updates tab (`updates.html`,
 * `hydra-updates.js`). Everything the page offers is derived from
 * `API-UPDATES-INFOS` through `updateOffers`; the install action, its progress
 * dialog, and the restart handoff live in `C-UPDATE-COORDINATOR`.
 */
export function SystemUpdatesTab({transport}: {transport: ApiTransport}) {
    const [changelogVersion, setChangelogVersion] = useState<string | null>(
        null,
    );
    const installer = useUpdateInstaller(transport);
    const infos = useQuery({
        queryFn: () => getUpdateInfos(transport),
        queryKey: ["update-infos"],
    });
    const history = useQuery({
        queryFn: () => getVersionHistory(transport),
        queryKey: ["update-version-history"],
    });

    return (
        <Stack data-testid="system-updates" spacing={3}>
            {infos.isPending && (
                <Stack alignItems="center" role="status" spacing={2}>
                    <CircularProgress variant="indeterminate" />
                    <Typography>Loading versions and changelog</Typography>
                </Stack>
            )}
            {infos.isError && (
                <Alert severity="error">
                    Unable to load the update information.
                </Alert>
            )}
            {infos.isSuccess && (
                <UpdateStatus
                    infos={infos.data}
                    onInstall={(version) => void installer.install(version)}
                    onShowChangelog={setChangelogVersion}
                />
            )}
            <VersionHistory
                entries={history.isSuccess ? history.data : undefined}
                failed={history.isError}
            />
            <ChangelogDialog
                onClose={() => setChangelogVersion(null)}
                transport={transport}
                version={changelogVersion}
            />
            {installer.dialogs}
        </Stack>
    );
}

function UpdateStatus({
    infos,
    onInstall,
    onShowChangelog,
}: {
    infos: UpdateInfos;
    onInstall: (version: string) => void;
    onShowChangelog: (version: string) => void;
}) {
    const offers = updateOffers(infos);
    const latestVersionLabel = `${infos.latestVersion ?? ""}${
        infos.latestVersionIsBeta ? " Beta" : ""
    }`;

    return (
        <Stack spacing={2}>
            <Stack spacing={0.5}>
                <Typography>Current version: {infos.currentVersion}</Typography>
                <Typography>Latest version: {latestVersionLabel}</Typography>
                {offers.offerBetaUpdate && (
                    <Typography>
                        Latest beta version: {infos.betaVersion}
                    </Typography>
                )}
            </Stack>

            {offers.showUpdatedExternallyWarning && (
                <Alert
                    data-testid="system-updates-external-warning"
                    severity="warning"
                >
                    Your NZBHydra instance seems to run in docker or is
                    installed via a package manager. Please update this instance
                    accordingly instead of using the NZBHydra update mechanism.
                </Alert>
            )}

            {offers.offerUpdate && (
                <Stack spacing={1}>
                    <Typography>
                        A new release ({latestVersionLabel}) is available.
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <Button
                            data-testid="system-updates-changelog"
                            onClick={() =>
                                onShowChangelog(infos.latestVersion ?? "")
                            }
                            type="button"
                            variant="outlined"
                        >
                            See what&apos;s new
                        </Button>
                        <Button
                            color="success"
                            data-testid="system-updates-install"
                            onClick={() => onInstall(infos.latestVersion ?? "")}
                            type="button"
                            variant="contained"
                        >
                            Install update
                        </Button>
                    </Stack>
                </Stack>
            )}

            {offers.offerBetaUpdate && (
                <Stack spacing={1}>
                    <Typography>
                        A new beta release ({infos.betaVersion}) is available.
                    </Typography>
                    <Stack direction="row" spacing={2}>
                        <Button
                            data-testid="system-updates-changelog-beta"
                            onClick={() =>
                                onShowChangelog(infos.betaVersion ?? "")
                            }
                            type="button"
                            variant="outlined"
                        >
                            See what&apos;s new
                        </Button>
                        <Button
                            color="warning"
                            data-testid="system-updates-install-beta"
                            onClick={() => onInstall(infos.betaVersion ?? "")}
                            type="button"
                            variant="contained"
                        >
                            Install beta update
                        </Button>
                    </Stack>
                </Stack>
            )}

            <Stack alignItems="flex-start" spacing={1}>
                {offers.showUpToDate && (
                    <Typography>You&apos;re up to date!</Typography>
                )}
                {offers.showIgnored && (
                    <Typography>
                        The latest version was ignored by you.
                    </Typography>
                )}
                {offers.offerForceUpdate && (
                    <Button
                        color="warning"
                        data-testid="system-updates-force"
                        onClick={() => onInstall(infos.latestVersion ?? "")}
                        type="button"
                        variant="outlined"
                    >
                        Force update
                    </Button>
                )}
            </Stack>

            {offers.showWrapperOutdated && <WrapperOutdatedWarning />}
        </Stack>
    );
}

/** Legacy `updates.html:38-54`, including both platforms' file lists. */
function WrapperOutdatedWarning() {
    return (
        <Alert data-testid="system-updates-wrapper-warning" severity="warning">
            <AlertTitle>
                The NZBHydra wrappers (i.e. the executables or python scripts
                you use to run NZBHydra) seem to be outdated. Please update
                them.
            </AlertTitle>
            <Typography>
                Shut down NZBHydra,{" "}
                <Link
                    href={WRAPPER_RELEASES_URL}
                    rel="noreferrer"
                    target="_blank"
                >
                    download the latest version
                </Link>{" "}
                and extract all the relevant wrapper files into your main
                NZBHydra folder.
            </Typography>
            <Typography>For Windows these files are:</Typography>
            <ul>
                <li>NZBHydra2.exe</li>
                <li>NZBHydra2 Console.exe</li>
            </ul>
            <Typography>For linux or macOS these files are:</Typography>
            <ul>
                <li>nzbhydra2wrapper.py</li>
                <li>nzbhydra2wrapperPy3.py</li>
            </ul>
            <Typography>
                Make sure to overwrite all of these files that already exist -
                you don&apos;t need to update any files that aren&apos;t already
                present. If you added any of the other listed files manually
                make sure to update them as well!
            </Typography>
            <Typography>Afterwards start NZBHydra again.</Typography>
        </Alert>
    );
}

function VersionHistory({
    entries,
    failed,
}: {
    entries: ChangelogEntry[] | undefined;
    failed: boolean;
}) {
    return (
        <Card data-testid="system-version-history">
            <CardContent>
                <Stack spacing={2}>
                    <Typography component="h2" variant="h5">
                        Version history
                    </Typography>
                    {failed && (
                        <Alert severity="error">
                            Unable to load the version history.
                        </Alert>
                    )}
                    {entries === undefined ? (
                        !failed && (
                            <Stack alignItems="center" role="status">
                                <CircularProgress variant="indeterminate" />
                            </Stack>
                        )
                    ) : (
                        <ChangelogEntries entries={entries} />
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}
