import {Alert, Box, Link, Stack, Typography} from "@mui/material";
import {useQuery} from "@tanstack/react-query";

import {getSimpleUpdateInfos} from "../../../api/system/updates";
import {ApiTransport} from "../../../api/transport";
import {useSafeConfig, type BootstrapData} from "../../../bootstrap";
import {externalLink} from "../../../domain/links/externalLinks";

// Vite's base-URL-aware asset reference (see `AppShell`): the sponsor image is
// served from the React bundle rather than legacy's `static/img/ninja.png`.
const sponsorImageUrl = new URL(
    "../../../assets/newsgroup-ninja.png",
    import.meta.url,
).href;

const DISCORD_URL = "https://discord.gg/uh9W3rd";
const SOURCES_URL = "https://github.com/theotherp/nzbhydra2/";
const SPONSORS_URL = "https://github.com/sponsors/theotherp";
const SPONSOR_URL = "https://www.newsgroup.ninja/";
const LICENSE_URL = "http://www.apache.org/licenses/LICENSE-2.0";
const MAIL_URL = "mailto:theotherp@posteo.net";

/**
 * `F-SYSTEM-ABOUT`: legacy `about.html`, whose only data is
 * `API-UPDATES-SIMPLE-INFOS`. Every external target goes through
 * `C-EXTERNAL-LINKS` so the configured dereferer applies — legacy left the
 * sponsor link un-dereferered, which is the one difference here.
 */
export function SystemAboutTab({
    bootstrap,
    transport,
}: {
    bootstrap: BootstrapData;
    transport: ApiTransport;
}) {
    const dereferer = useSafeConfig(bootstrap)?.dereferer;
    const infos = useQuery({
        queryFn: () => getSimpleUpdateInfos(transport),
        queryKey: ["update-simple-infos"],
    });
    const packageInfo = infos.data?.packageInfo ?? null;

    return (
        <Stack data-testid="system-about" spacing={2} sx={{maxWidth: 800}}>
            <Typography>Written by TheOtherP for the community.</Typography>

            <Typography component="h2" variant="h5">
                Program info
            </Typography>
            {infos.isError ? (
                <Alert severity="error">
                    Unable to load the program information.
                </Alert>
            ) : (
                <Stack spacing={0.5}>
                    <Typography>
                        <b>Version:</b> {infos.data?.currentVersion ?? ""}
                    </Typography>
                    {packageInfo !== null && (
                        <>
                            <Typography>
                                <b>Container version:</b>{" "}
                                {packageInfo.version ?? ""}
                            </Typography>
                            <Typography>
                                <b>Container release type:</b>{" "}
                                {packageInfo.releaseType ?? ""}
                            </Typography>
                            <Typography>
                                <b>Container author:</b>{" "}
                                {packageInfo.author ?? ""}
                            </Typography>
                        </>
                    )}
                </Stack>
            )}

            <Typography component="h2" variant="h5">
                Contact
            </Typography>
            <Typography>
                If you have a question or a feature request I&apos;d prefer you
                to create an issue on GitHub.
            </Typography>
            <Typography>
                You can{" "}
                <ExternalLink dereferer={dereferer} url={DISCORD_URL}>
                    join the Discord channel
                </ExternalLink>
                .
            </Typography>
            <Typography>
                If you absolutely must you can reach me via{" "}
                <Link href={MAIL_URL}>mail</Link> but I really prefer any of the
                other ways.
            </Typography>
            <Typography>
                Sources, bugs, enhancements:{" "}
                <ExternalLink dereferer={dereferer} url={SOURCES_URL}>
                    https://github.com/theotherp/nzbhydra2
                </ExternalLink>
            </Typography>

            <Typography component="h2" variant="h5">
                Donations
            </Typography>
            <Typography>You&apos;re welcome to donate:</Typography>
            <ul>
                <li>Bitcoin via 1LPCUF9eKEXi58nHbxTbJyfxCJkcCXKzvm</li>
                <li>Regular money via PayPal to theotherp@posteo.net</li>
                <li>
                    Via{" "}
                    <ExternalLink dereferer={dereferer} url={SPONSORS_URL}>
                        GitHub sponsors
                    </ExternalLink>{" "}
                    which involves a recurring donation similar to Patreon.
                </li>
            </ul>
            <Typography>
                Thanks to the handful of people who&apos;ve already donated! I
                really appreciate the gesture.
            </Typography>
            <Typography>A special thanks go to</Typography>
            <ExternalLink dereferer={dereferer} url={SPONSOR_URL}>
                <Box
                    alt="Newsgroup Ninja"
                    component="img"
                    src={sponsorImageUrl}
                    sx={{maxWidth: "100%"}}
                />
            </ExternalLink>
            <Typography>for sponsoring me.</Typography>

            <Typography component="h2" variant="h5">
                License
            </Typography>
            <Typography>
                Licensed under the Apache License, Version 2.0 (the
                &quot;License&quot;); you may not use this file except in
                compliance with the License. You may obtain a copy of the
                License at{" "}
                <ExternalLink dereferer={dereferer} url={LICENSE_URL}>
                    http://www.apache.org/licenses/LICENSE-2.0
                </ExternalLink>
            </Typography>
        </Stack>
    );
}

/**
 * A link whose target `C-EXTERNAL-LINKS` refuses (a dereferer that produces no
 * usable URL) renders as plain text rather than as a live link, the same rule
 * `SettingHelp` follows.
 */
function ExternalLink({
    children,
    dereferer,
    url,
}: {
    children: React.ReactNode;
    dereferer: unknown;
    url: string;
}) {
    const href = externalLink(url, dereferer);
    if (href === undefined) {
        return <>{children}</>;
    }
    return (
        <Link href={href} rel="noreferrer" target="_blank">
            {children}
        </Link>
    );
}
