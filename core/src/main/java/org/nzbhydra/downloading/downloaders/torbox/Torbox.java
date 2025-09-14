/*
 *  (C) Copyright 2024 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.downloading.downloaders.torbox;

import jakarta.annotation.Nullable;
import lombok.extern.slf4j.Slf4j;
import okhttp3.Request;
import org.jetbrains.annotations.NotNull;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.NzbAddingType;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.indexer.SearchModuleType;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.Downloader;
import org.nzbhydra.downloading.downloaders.DownloaderEntry;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.downloaders.torbox.mapping.AddUDlResponse;
import org.nzbhydra.downloading.downloaders.torbox.mapping.TorboxDownload;
import org.nzbhydra.downloading.downloaders.torbox.mapping.UsenetListResponse;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilder;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Component("torboxdownloader")
public class Torbox extends Downloader {

    private enum ResultType {
        TORBOX_TORRENT,
        TORRENT,
        MAGNET,
        TORBOX_USENET,
        NZB
    }

    // TODO sist 14.12.2024: Try and parse error responses
    // TODO sist 14.12.2024: Exclude nzbs.in
    // TODO sist 14.12.2024: Check if bypass_cache for status check is OK and which limit should be used
    // TODO sist 14.12.2024: What are possible values for download_state?
    // TODO sist 14.12.2024: Switching the downloader doesn't update the status footer

    private static final String HOST = "torbox.app";
    private static final String BASE_URL = "https://torbox.app";
    private static final String BASE_API_URL = "https://api.torbox.app/v1/api";
    public static final Duration CACHE_TIME = Duration.ofSeconds(5);

    private final RestTemplate restTemplate;
    private Instant lastUpdate = Instant.MIN;
    private final List<TorboxDownload> lastTorboxDownloads = new ArrayList<>();


    public Torbox(FileHandler nzbHandler, SearchResultRepository searchResultRepository, ApplicationEventPublisher applicationEventPublisher, IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions, ConfigProvider configProvider, HydraOkHttp3ClientHttpRequestFactory requestFactory, DownloadUrlBuilder downloadUrlBuilder, TorboxHttpRequestFactory torboxHttpRequestFactory) {
        super(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider, downloadUrlBuilder);
        this.restTemplate = new RestTemplate(torboxHttpRequestFactory);
        this.restTemplate.getInterceptors().add((request, body, execution) -> {
            request.getHeaders().add("Authorization", "Bearer " + downloaderConfig.getApiKey());
            return execution.execute(request, body);
        });
    }

    @Override
    public GenericResponse checkConnection() {
        log.debug("Checking connection");
        UriComponentsBuilder url = getBaseUrl().path("/user/me");

        try {
            ResponseEntity<String> response = restTemplate.getForEntity(getBaseUrl().path("/user/me").toUriString(), String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Connection check with torbox using URL {} successful", url.toUriString());
                return new GenericResponse(true, null);
            }
            log.error("Connection check with torbox using URL {} failed. Response code: {}. Response body:\n{}", url, response.getStatusCode(), response.getBody());
            return new GenericResponse(false, null);
        } catch (RestClientException e) {
            log.info("Connection check with torbox using URL {} failed: {}", url.toUriString(), e.getMessage());
            return new GenericResponse(false, e.getMessage());
        }
    }

    private Request.Builder getRequestBuilder(UriComponentsBuilder uriComponentsBuilder) {
        return new Request.Builder().url(uriComponentsBuilder.toUriString()).header("Authorization", "Bearer " + downloaderConfig.getApiKey());
    }

    @Override
    public List<String> getCategories() {
        return List.of();
    }

    @Override
    public String addLink(String link, String title, DownloadType downloadType, String category) throws DownloaderException {
        return sendAddRequest(link.getBytes(StandardCharsets.UTF_8), title, "link", "link", downloadType);
    }

    @Override
    public String addContent(byte[] content, String title, DownloadType downloadType, String category) throws DownloaderException {
        return sendAddRequest(content, title, "file", "data", downloadType);
    }

    private String sendAddRequest(byte[] value, String title, String addType, String descInLog, DownloadType downloadType) throws DownloaderException {
        log.debug("Sending {} for \"{}\" to torbox", descInLog, title);
        UriComponentsBuilder url;
        // We have no way of knowing if the original search result was a torrent or usenet result. Kinda hacky, I know...
        final ResultType resultType = determineResultType(value, title, downloadType);

        switch (resultType) {
            case TORBOX_USENET, NZB -> url = getBaseUrl().path("/usenet/createusenetdownload");
            case TORBOX_TORRENT, TORRENT, MAGNET -> url = getBaseUrl().path("/torrents/createtorrent");
            default -> throw new IllegalStateException("Unexpected result type " + resultType);
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        if (addType.equals("file") && resultType != ResultType.MAGNET) {
            ByteArrayResource fileResource = new ByteArrayResource(value) {
                @Override
                public String getFilename() {
                    return suffixNzbToTitle(title);
                }
            };
            map.add("file", fileResource);
        } else {
            if (resultType == ResultType.MAGNET || ("link".equals(addType) && new String(value).startsWith("magnet"))) {
                map.add("magnet", URLDecoder.decode(new String(value), StandardCharsets.UTF_8));
            } else {
                map.add(addType, value);
            }
            map.add("name", title);
        }
        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(map, headers);
        try {
            ResponseEntity<AddUDlResponse> entity = restTemplate.postForEntity(url.toUriString(), request, AddUDlResponse.class);
            AddUDlResponse dlResponse = entity.getBody();
            if (dlResponse.isSuccess()) {
                log.info("Successfully added \"{}\" to torbox", title);
                return dlResponse.getData().getUsenetdownload_id();
            }
            log.error("Error adding {} for NZB {} to torbox. Error: {}\nDetail:{}", descInLog, title, dlResponse.getError(), dlResponse.getDetail());
            throw new DownloaderException("Torbox returned error: " + dlResponse.getError());

        } catch (Exception e) {
            log.error("Unexpected response when sending add request for {} to torbox", title, e);
            throw new DownloaderException("Error sending " + descInLog + " to torbox", e);
        }
    }

    private static ResultType determineResultType(byte[] value, String title, DownloadType downloadType) throws DownloaderException {
        String valueString = new String(value);
        final ResultType resultType;

        if (downloadType == DownloadType.TORRENT) {
            resultType = ResultType.TORRENT;
        } else if (downloadType == DownloadType.NZB) {
            resultType = ResultType.NZB;
        } else if (valueString.contains("usenet/download")) {
            resultType = ResultType.TORBOX_USENET;
        } else if (valueString.startsWith("magnet:")) {
            resultType = ResultType.MAGNET;
        } else {
            throw new DownloaderException("Unable to determine type of download for " + title + " from type " + downloadType + " and content " + valueString);
        }
        return resultType;
    }

    @Override
    public DownloaderStatus getStatus() throws DownloaderException {
        List<TorboxDownload> downloadingEntries = getLastTorboxDownloads().stream().filter(x -> x.getDownloadState().equals("downloading")).toList();
        long downloadSpeedKb = downloadingEntries.stream().mapToLong(TorboxDownload::getDownloadSpeedBytes).sum() / 1024;
        addDownloadRate(downloadSpeedKb);
        DownloaderStatus.DownloaderStatusBuilder statusBuilder = DownloaderStatus.builder()
                .downloaderName("Torbox")
                .downloaderType(DownloaderType.TORBOX)
                .state(downloadingEntries.isEmpty() ? DownloaderStatus.State.IDLE : DownloaderStatus.State.DOWNLOADING)
                .url(BASE_URL)
                .downloadingRatesInKilobytes(downloadRates)
                .downloadRateInKilobytes(downloadSpeedKb)
                .elementsInQueue(downloadingEntries.size());
        if (!downloadingEntries.isEmpty()) {
            double etaSeconds = downloadingEntries.stream().mapToLong(TorboxDownload::getEta).average().orElse(0);
            long remainingMegaBytes = downloadingEntries.stream().mapToLong(TorboxDownload::getSize).sum() / 1024 / 1024;

            TorboxDownload torboxDownload = downloadingEntries.get(0);
            statusBuilder = statusBuilder
                    .remainingSeconds((long) etaSeconds)
                    .remainingSizeInMegaBytes(remainingMegaBytes)
                    .downloadingTitle(torboxDownload.getName())
                    .downloadingTitlePercentFinished((int) (100 * torboxDownload.getProgress()))
                    .downloadingTitleRemainingSizeKilobytes(torboxDownload.getSize() / 1024)
                    .downloadingTitleRemainingTimeSeconds(torboxDownload.getEta())
            ;
        }
        return statusBuilder.build();
    }

    @Override
    public List<DownloaderEntry> getHistory(Instant earliestDownload) throws DownloaderException {
        return getDownloaderEntries()
                .stream()
                .filter(x -> x.getStatus().equals("failed") || x.getStatus().equals("completed"))
                .toList();
    }

    @Override
    public List<DownloaderEntry> getQueue(@Nullable Instant earliestDownload) throws DownloaderException {
        return getDownloaderEntries()
                .stream()
                .filter(x -> !x.getStatus().equals("failed") && !x.getStatus().equals("completed"))
                .toList();
    }

    @NotNull
    private List<DownloaderEntry> getDownloaderEntries() throws DownloaderException {
        return getLastTorboxDownloads().stream().map(entry -> DownloaderEntry.builder()
                        .nzbId(String.valueOf(entry.getId()))
                        .nzbName(entry.getName())
                        .time(entry.getCreated_at())
                        .status(entry.getDownloadState())
                        .build())
                .toList();
    }

    @Override
    protected NzbAddingType getNzbAddingType(DownloadType downloadType, SearchResultEntity searchResult) {
        IndexerConfig indexer = configProvider.getIndexerByName(searchResult.getIndexer().getName());
        if (downloadType == DownloadType.TORBOX
            || downloadType == DownloadType.TORRENT
            || indexer.getSearchModuleType() == SearchModuleType.TORBOX
            || indexer.getHost().contains("torbox.app")
        ) {
            //Torbox only allows downloading their results for themselves
            return NzbAddingType.SEND_LINK;
        }
        return NzbAddingType.UPLOAD;
    }

    private List<TorboxDownload> getLastTorboxDownloads() throws DownloaderException {
        if (lastUpdate.isAfter(Instant.now().minus(CACHE_TIME))) {
            return lastTorboxDownloads;
        }
        UriComponentsBuilder url = getBaseUrl()
                .path("/usenet/mylist")
                .queryParam("bypass_cache", true);
        try {
            ResponseEntity<UsenetListResponse> response = restTemplate.getForEntity(url.toUriString(), UsenetListResponse.class);
            UsenetListResponse body = response.getBody();

            if (response.getStatusCode().is2xxSuccessful()) {
                lastUpdate = Instant.now();
                lastTorboxDownloads.clear();
                lastTorboxDownloads.addAll(body.getData());
                return lastTorboxDownloads;
            }
            log.error("Loading usenet list from torbox failed. Error: {}. Details:\n{}", body.getError(), body.getDetail());
            throw new DownloaderException("Error loading usenet list from torbox. Error: " + body.getError());

        } catch (RestClientException e) {
            throw new DownloaderException("Error loading usenet list from torbox", e);
        }
    }

    @Override
    protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
        switch (entry.getStatus()) {
            case "completed" -> {
                return FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL;
            }
            case "failed" -> {
                return FileDownloadStatus.CONTENT_DOWNLOAD_ERROR;
            }
            case "downloading" -> {
                return FileDownloadStatus.NZB_ADDED;
            }
            default -> {
                return FileDownloadStatus.NONE;
            }
        }

    }


    private UriComponentsBuilder getBaseUrl() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_API_URL);
        return builder;
    }


}
