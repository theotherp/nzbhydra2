import {Box, Stack} from "@mui/material";
import {useQuery} from "@tanstack/react-query";
import {useLayoutEffect, useRef, useState} from "react";

import {
    acknowledgeAutomaticUpdateHistory,
    getUpdateInfos,
    ignoreUpdate,
} from "../../api/system/updates";
import {ApiTransport} from "../../api/transport";
import type {BootstrapData} from "../../bootstrap";
import {AutomaticUpdateChangelogDialog} from "../../services/updates/AutomaticUpdateChangelogDialog";
import {ChangelogDialog} from "../../services/updates/ChangelogDialog";
import {updateOffers} from "../../services/updates/updateOffers";
import {useUpdateInstaller} from "../../services/updates/useUpdateInstaller";
import {AutomaticUpdateNotice} from "./AutomaticUpdateNotice";
import {UpdateBanner} from "./UpdateBanner";

/**
 * `C-UPDATE-COORDINATOR`'s footer half (legacy `hydra-checks-footer.js`'s
 * update handling and `checks-footer.html`): the cross-route update banner
 * and the automatic-update notice, sharing one `API-UPDATES-INFOS` fetch with
 * `F-PLATFORM-LIVE-STATUS`'s startup checks. Mounted once by the shell, which
 * is what makes "fetched once per app load" true regardless of navigation.
 *
 * Reports its own rendered height to `onHeightChange` so the shell can pad
 * its scroll area by exactly that much -- these banners are pinned to the
 * bottom of the viewport, and without that compensation the last bit of a
 * scrolled route's content would render underneath them.
 */
export function UpdateFooterBanners({
    bootstrap,
    bottomOffset = 0,
    onHeightChange,
    transport,
}: {
    bootstrap: BootstrapData;
    /**
     * FM-081: the downloader-status footer occupies the very bottom of the
     * viewport when it is showing, so these banners sit on top of it —
     * legacy's own stacking (`footer.js`'s `updateFooterBottom`), measured
     * rather than hardcoded.
     */
    bottomOffset?: number;
    onHeightChange: (height: number) => void;
    transport: ApiTransport;
}) {
    const maySeeAdmin = bootstrap.maySeeAdmin === true;
    const infos = useQuery({
        enabled: maySeeAdmin,
        queryFn: () => getUpdateInfos(transport),
        queryKey: ["update-footer-infos"],
        staleTime: Infinity,
    });
    const [ignoredThisLoad, setIgnoredThisLoad] = useState(false);
    const [automaticNoticeDismissed, setAutomaticNoticeDismissed] =
        useState(false);
    const [changelogVersion, setChangelogVersion] = useState<string | null>(
        null,
    );
    const [automaticChangelogOpen, setAutomaticChangelogOpen] = useState(false);
    const installer = useUpdateInstaller(transport);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const data = infos.isSuccess ? infos.data : undefined;
    const offerUpdate = data !== undefined && updateOffers(data).offerUpdate;
    const showUpdateBanner = offerUpdate && !ignoredThisLoad;
    const showAutomaticNotice =
        data !== undefined &&
        data.automaticUpdateToNotice !== null &&
        data.showWhatsNewBanner &&
        !automaticNoticeDismissed;

    // Legacy's own layout compensation (`footer.js`'s `updateFooterBottom`/
    // `updatePaddingBottom` pixel bookkeeping) is reproduced here by
    // measuring the real rendered height instead, per ADR-0014. `ResizeObserver`
    // is unavailable in the jsdom component-test environment (guarded below,
    // matching `SearchResults`' own toolbar measurement); the initial
    // measurement still runs there, and the pinned-banner/scroll-compensation
    // claim itself is proven for real in `tests/system/tests/smoke.spec.ts`.
    useLayoutEffect(() => {
        const node = containerRef.current;
        if (node === null) {
            onHeightChange(0);
            return;
        }
        onHeightChange(node.getBoundingClientRect().height);
        if (typeof ResizeObserver === "undefined") {
            return;
        }
        const observer = new ResizeObserver((entries) => {
            const entry = entries[0];
            onHeightChange(entry ? entry.contentRect.height : 0);
        });
        observer.observe(node);
        return () => observer.disconnect();
    }, [onHeightChange, showAutomaticNotice, showUpdateBanner]);

    if (!showUpdateBanner && !showAutomaticNotice) {
        return null;
    }

    return (
        <>
            <Box
                ref={containerRef}
                sx={{
                    bottom: `${bottomOffset}px`,
                    left: 0,
                    position: "fixed",
                    right: 0,
                    zIndex: (theme) => theme.zIndex.appBar,
                }}
            >
                <Stack spacing={0}>
                    {showUpdateBanner && data !== undefined && (
                        <UpdateBanner
                            infos={data}
                            onIgnore={() => {
                                setIgnoredThisLoad(true);
                                void ignoreUpdate(
                                    transport,
                                    data.latestVersion ?? "",
                                );
                            }}
                            onInstall={(version) =>
                                void installer.install(version)
                            }
                            onShowChangelog={setChangelogVersion}
                        />
                    )}
                    {showAutomaticNotice && (
                        <AutomaticUpdateNotice
                            onDismiss={() => {
                                setAutomaticNoticeDismissed(true);
                                void acknowledgeAutomaticUpdateHistory(
                                    transport,
                                );
                            }}
                            onShowChangelog={() =>
                                setAutomaticChangelogOpen(true)
                            }
                        />
                    )}
                </Stack>
            </Box>
            <ChangelogDialog
                onClose={() => setChangelogVersion(null)}
                transport={transport}
                version={changelogVersion}
            />
            <AutomaticUpdateChangelogDialog
                onClose={() => setAutomaticChangelogOpen(false)}
                open={automaticChangelogOpen}
                transport={transport}
            />
            {installer.dialogs}
        </>
    );
}
