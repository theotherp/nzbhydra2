import {Box} from "@mui/material";
import {useWatch} from "react-hook-form";

import type {ConfigValues} from "../../../api/config/schema";
import {ApiTransport} from "../../../api/transport";
import {
    ConfigFieldset,
    FileBrowserSetting,
    SelectSetting,
    SwitchSetting,
    TextSetting,
} from "../components";
import {DownloadersSection} from "./DownloadersSection";
import {
    downloadersOf,
    FALLBACK_FOR_FAILED_OPTIONS,
    NZB_ACCESS_TYPE_OPTIONS,
    primaryDownloaderOptions,
    showsExternalUrl,
    showsPrimaryDownloader,
} from "./downloadingSettings";

/**
 * `F-CONFIG-DOWNLOADING`: the Downloading configuration tab — every field of
 * `config-fields-service.js:1837-1979`, in legacy's order and grouping, bound
 * to `C-CONFIG-FORM`'s whole-config form through the `C-CONFIG-FIELDS`
 * vocabulary, plus the downloader list whose entries are edited as a
 * transaction (`DownloadersSection`).
 *
 * Legacy's `hideExpression`s become plain conditional rendering driven by
 * `useWatch`. A hidden field keeps its value: the shell's form is created with
 * `shouldUnregister: false`, so switching NZB access to "Redirect" does not
 * erase the fallback setting behind it and turning the footer off does not
 * erase the configured external URL or primary downloader.
 */
export function DownloadingConfigTab({transport}: {transport: ApiTransport}) {
    const downloaders = downloadersOf(
        useWatch<ConfigValues>({name: "downloading.downloaders"}),
    );
    const showDownloaderStatus = useWatch<ConfigValues>({
        name: "downloading.showDownloaderStatus",
    });
    const nzbAccessType = useWatch<ConfigValues>({
        name: "downloading.nzbAccessType",
    });
    const primaryDownloader = useWatch<ConfigValues>({
        name: "downloading.primaryDownloader",
    });

    return (
        <Box data-testid="config-downloading">
            <ConfigFieldset
                label="General"
                tooltip="Hydra allows sending NZB search results directly to downloaders (NZBGet, sabnzbd, torbox). Torrent downloaders are not supported."
            >
                <FileBrowserSetting
                    help="Allow torrents to be saved in this folder from the search results. Ignored if not set."
                    label="Torrent black hole"
                    mode="folder"
                    name="downloading.saveTorrentsTo"
                    transport={transport}
                />
                <FileBrowserSetting
                    help="Allow NZBs to be saved in this folder from the search results. Ignored if not set."
                    label="NZB black hole"
                    mode="folder"
                    name="downloading.saveNzbsTo"
                    transport={transport}
                />
                <SelectSetting
                    advanced
                    help="How access to NZBs is provided when NZBs are downloaded (by the user or external tools). Proxying is recommended as it allows fallback for failed downloads (see below).."
                    label="NZB access type"
                    name="downloading.nzbAccessType"
                    options={NZB_ACCESS_TYPE_OPTIONS}
                    tooltip="NZB downloads from Hydra can either be achieved by redirecting the requester to the original indexer or by downloading the NZB from the indexer and serving this. Redirecting has the advantage that it causes the least load on Hydra but also the disadvantage that the requester might be forwarded to an indexer link that contains the indexer's API key. To prevent that select to proxy NZBs. It also allows fallback for failed downloads (next option)."
                />
                {showsExternalUrl(showDownloaderStatus, downloaders) ? (
                    <TextSetting
                        advanced
                        help="Used for links when sending links to the downloader and as link target for the downloader icon in the footer (when set)."
                        label="External URL"
                        name="downloading.externalUrl"
                        tooltip={
                            "When using \"Add links\" to add NZBs to your downloader the links are usually calculated using the URL with which you accessed NZBHydra. This might be a URL that's not accessible by the downloader (e.g. when it's inside a docker container). Set the URL for NZBHydra that's accessible by the downloader here and it will be used instead. "
                        }
                    />
                ) : null}
                {nzbAccessType === "REDIRECT" ? null : (
                    <SelectSetting
                        help="Fallback to similar results when a download fails. Only available when proxying NZBs (see above)."
                        label="Fallback for failed downloads"
                        name="downloading.fallbackForFailed"
                        options={FALLBACK_FOR_FAILED_OPTIONS}
                        tooltip="When you or an external program tries to download an NZB from NZBHydra the download may fail because the indexer is offline or its download limit has been reached. You can use this setting for NZBHydra to try and fall back on results from other indexers. It will search for results with the same name that were the result from the same search as where the download originated from. It will *not* execute another search."
                    />
                )}
                <SwitchSetting
                    help="Enable to send magnet links to the associated program on the server machine. Won't work with docker"
                    label="Send magnet links"
                    name="downloading.sendMagnetLinks"
                />
                <SwitchSetting
                    advanced
                    help="Query your downloader for status updates of downloads"
                    label="Update statuses"
                    name="downloading.updateStatuses"
                />
                <SwitchSetting
                    advanced
                    help="Show footer with downloader status"
                    label="Show downloader footer"
                    name="downloading.showDownloaderStatus"
                />
                {/*
                 * Legacy additionally *wrote* the first downloader's name into
                 * the model whenever this select became visible with no value
                 * set (`optionsFunctionAfter`, `config-fields-service.js:1958`).
                 * That is a silent edit of the configuration triggered by
                 * merely looking at the tab, and it would break FM-058's
                 * guarantee that an unedited load-and-save leaves the persisted
                 * config unchanged, so the select simply starts empty instead.
                 */}
                {showsPrimaryDownloader(showDownloaderStatus, downloaders) ? (
                    <SelectSetting
                        help="This downloader's state will be shown in the footer."
                        label="Primary downloader"
                        name="downloading.primaryDownloader"
                        options={primaryDownloaderOptions(
                            downloaders,
                            primaryDownloader,
                        )}
                        tooltip="To select a downloader you just added please save the config first."
                    />
                ) : null}
            </ConfigFieldset>
            <ConfigFieldset label="Downloaders">
                <DownloadersSection transport={transport} />
            </ConfigFieldset>
        </Box>
    );
}
