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
import {indexedSetting} from "../settingsSearch/settingsIndex";
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
                    {...indexedSetting("downloading.saveTorrentsTo")}
                    mode="folder"
                    transport={transport}
                />
                <FileBrowserSetting
                    {...indexedSetting("downloading.saveNzbsTo")}
                    mode="folder"
                    transport={transport}
                />
                <SelectSetting
                    {...indexedSetting("downloading.nzbAccessType")}
                    advanced
                    options={NZB_ACCESS_TYPE_OPTIONS}
                    tooltip="NZB downloads from Hydra can either be achieved by redirecting the requester to the original indexer or by downloading the NZB from the indexer and serving this. Redirecting has the advantage that it causes the least load on Hydra but also the disadvantage that the requester might be forwarded to an indexer link that contains the indexer's API key. To prevent that select to proxy NZBs. It also allows fallback for failed downloads (next option)."
                />
                {showsExternalUrl(showDownloaderStatus, downloaders) ? (
                    <TextSetting
                        {...indexedSetting("downloading.externalUrl")}
                        advanced
                        tooltip={
                            "When using \"Add links\" to add NZBs to your downloader the links are usually calculated using the URL with which you accessed NZBHydra. This might be a URL that's not accessible by the downloader (e.g. when it's inside a docker container). Set the URL for NZBHydra that's accessible by the downloader here and it will be used instead. "
                        }
                    />
                ) : null}
                {nzbAccessType === "REDIRECT" ? null : (
                    <SelectSetting
                        {...indexedSetting("downloading.fallbackForFailed")}
                        options={FALLBACK_FOR_FAILED_OPTIONS}
                        tooltip="When you or an external program tries to download an NZB from NZBHydra the download may fail because the indexer is offline or its download limit has been reached. You can use this setting for NZBHydra to try and fall back on results from other indexers. It will search for results with the same name that were the result from the same search as where the download originated from. It will *not* execute another search."
                    />
                )}
                <SwitchSetting
                    {...indexedSetting("downloading.sendMagnetLinks")}
                />
                <SwitchSetting
                    {...indexedSetting("downloading.updateStatuses")}
                    advanced
                />
                <SwitchSetting
                    {...indexedSetting("downloading.showDownloaderStatus")}
                    advanced
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
                        {...indexedSetting("downloading.primaryDownloader")}
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
