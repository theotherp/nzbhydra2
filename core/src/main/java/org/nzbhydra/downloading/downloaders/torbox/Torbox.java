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

import lombok.extern.slf4j.Slf4j;
import okhttp3.Request;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.Downloader;
import org.nzbhydra.downloading.downloaders.DownloaderEntry;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.downloaders.torbox.mapping.AddUDlResponse;
import org.nzbhydra.downloading.exceptions.DownloaderException;
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

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

@Slf4j
@Component
public class Torbox extends Downloader {

    // TODO sist 14.12.2024: Try and parse error responses
    // TODO sist 14.12.2024: Exclude nzbs.in
    // TODO sist 14.12.2024: Check if bypass_cache for status check is OK and which limit should be used

    private static final String HOST = "torbox.app";
    private static final String BASE_URL = "https://api.torbox.app/v1/api";

    private final RestTemplate restTemplate;

    public Torbox(FileHandler nzbHandler, SearchResultRepository searchResultRepository, ApplicationEventPublisher applicationEventPublisher, IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions, ConfigProvider configProvider, HydraOkHttp3ClientHttpRequestFactory requestFactory) {
        super(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider);
        this.restTemplate = new RestTemplate(requestFactory);
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
    public String addLink(String link, String title, String category) throws DownloaderException {
        return sendAddRequest(link.getBytes(StandardCharsets.UTF_8), title, "link", "link");
    }

    @Override
    public String addNzb(byte[] content, String title, String category) throws DownloaderException {
        return sendAddRequest(content, title, "file", "data");
    }

    private String sendAddRequest(byte[] value, String title, String addType, String descInLog) throws DownloaderException {
        log.debug("Sending {} for NZB {} to torbox", descInLog, title);
        UriComponentsBuilder url = getBaseUrl().path("/usenet/createusenetdownload");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        MultiValueMap<String, Object> map = new LinkedMultiValueMap<>();
        if (addType.equals("file")) {
            ByteArrayResource fileResource = new ByteArrayResource(value) {
                @Override
                public String getFilename() {
                    return suffixNzbToTitle(title);
                }
            };
            map.add("file", fileResource);
        } else {
            map.add(addType, value);
        }
        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(map, headers);
        try {
            ResponseEntity<AddUDlResponse> entity = restTemplate.postForEntity(url.toUriString(), request, AddUDlResponse.class);
            AddUDlResponse dlResponse = entity.getBody();
            if (dlResponse.isSuccess()) {
                return dlResponse.getData().getUsenetdownload_id();
            }
            log.error("Error adding {} for NZB {} to torbox. Error: {}\nDetail:{}", descInLog, title, dlResponse.getError(), dlResponse.getDetail());
            throw new DownloaderException("Torbox returned error: " + dlResponse.getError());

        } catch (Exception e) {
            throw new DownloaderException("Error sending " + descInLog + " to torbox", e);
        }
    }

    @Override
    public DownloaderStatus getStatus() throws DownloaderException {
        return null;
    }

    @Override
    public List<DownloaderEntry> getHistory(Instant earliestDownload) throws DownloaderException {
        return List.of();
    }

    @Override
    public List<DownloaderEntry> getQueue(Instant earliestDownload) throws DownloaderException {
        return List.of();
    }

    @Override
    protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
        return null;
    }

    private UriComponentsBuilder getBaseUrl() {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(BASE_URL);
        return builder;
    }
}
