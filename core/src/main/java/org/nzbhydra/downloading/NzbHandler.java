package org.nzbhydra.downloading;

import com.google.common.base.Stopwatch;
import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.NzbAccessType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.okhttp.HydraOkHttp3ClientHttpRequestFactory;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultItem.DownloadType;
import org.nzbhydra.searching.SearchResultRepository;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.SessionStorage;
import org.nzbhydra.web.UrlCalculator;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
public class NzbHandler {

    private static final Logger logger = LoggerFactory.getLogger(NzbHandler.class);

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    private SearchResultRepository searchResultRepository;
    @Autowired
    private NzbDownloadRepository downloadRepository;
    @Autowired
    private SearchModuleProvider searchModuleProvider;
    @Autowired
    private UrlCalculator urlCalculator;
    @Autowired
    private HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;
    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public NzbDownloadResult getNzbByGuid(long guid, NzbAccessType nzbAccessType, SearchSource accessSource) throws InvalidSearchResultIdException {
        SearchResultEntity result = searchResultRepository.findOne(guid);
        if (result == null) {
            logger.error("Download request with invalid/outdated GUID {}", guid);
            throw new InvalidSearchResultIdException(guid, accessSource == SearchSource.INTERNAL);
        }
        String downloadType = result.getDownloadType() == DownloadType.NZB ? "NZB" : "Torrent";
        int ageInDays = (int) (Duration.between(result.getPubDate(), result.getFirstFound()).get(ChronoUnit.SECONDS) / (24 * 60 * 60));
        logger.info("{} download request for {} from indexer {}", downloadType, result.getTitle(), result.getIndexer().getName());

        if (nzbAccessType == NzbAccessType.REDIRECT) {
            logger.debug("Redirecting to " + result.getLink());
            NzbDownloadEntity downloadEntity = new NzbDownloadEntity(result, NzbAccessType.REDIRECT, accessSource, NzbDownloadStatus.REQUESTED, ageInDays, null);
            downloadRepository.save(downloadEntity);
            eventPublisher.publishEvent(new NzbDownloadEvent(downloadEntity));
            return NzbDownloadResult.createSuccessfulRedirectResult(result.getTitle(), result.getLink(), downloadEntity);
        } else {
            String nzbContent;
            Stopwatch stopwatch = Stopwatch.createStarted();
            try {
                nzbContent = downloadNzb(result);
            } catch (IOException e) {
                //LATER get status code and use that
                logger.error("Error while downloading NZB from URL {}: {}", result.getLink(), e.getMessage());
                NzbDownloadEntity downloadEntity = new NzbDownloadEntity(result, NzbAccessType.PROXY, accessSource, NzbDownloadStatus.NZB_DOWNLOAD_ERROR, ageInDays, e.getMessage());

                downloadRepository.save(downloadEntity);
                eventPublisher.publishEvent(new NzbDownloadEvent(downloadEntity));
                return NzbDownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName(), downloadEntity);
            }

            long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
            //LATER CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
            logger.info("{} download from indexer successfully completed in {}ms", downloadType, responseTime);

            NzbDownloadEntity downloadEntity = new NzbDownloadEntity(result, NzbAccessType.PROXY, accessSource, NzbDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL, ageInDays, null);
            downloadRepository.save(downloadEntity);
            eventPublisher.publishEvent(new NzbDownloadEvent(downloadEntity));

            return NzbDownloadResult.createSuccessfulDownloadResult(result.getTitle(), nzbContent, downloadEntity);
        }
    }

    public NzbsZipResponse getNzbsAsZip(List<Long> guids) throws Exception {
        List<File> nzbFiles = new ArrayList<>();
        Path tempDirectory = null;
        List<Long> foundNzbIds = new ArrayList<>();
        List<Long> missedNzbIds = new ArrayList<>();
        for (Long guid : guids) {
            NzbDownloadResult result = getNzbByGuid(guid, NzbAccessType.PROXY, SearchSource.INTERNAL);
            if (!result.isSuccessful()) {
                continue;
            }
            try {
                tempDirectory = Files.createTempDirectory("nzbhydra");
                File tempFile = new File(tempDirectory.toFile(), result.getTitle() + ".nzb");
                logger.debug("Writing NZB to temp file {}", tempFile.getAbsolutePath());
                Files.write(tempFile.toPath(), result.getNzbContent().getBytes());
                nzbFiles.add(tempFile);
                foundNzbIds.add(guid);
            } catch (IOException e) {
                logger.error("Unable to write NZB content to temporary file: " + e.getMessage());
                missedNzbIds.add(guid);
            }
        }
        if (nzbFiles.isEmpty()) {
            return new NzbsZipResponse(false, null, "No NZB files could be retrieved", Collections.emptyList(), guids);
        }
        File zip = createZip(nzbFiles);
        logger.info("Successfully added {}/{} NZBs to ZIP", nzbFiles.size(), guids.size());
        if (tempDirectory != null) {
            tempDirectory.toFile().delete();
        }

        String message = missedNzbIds.isEmpty() ? "All NZBs successfully retrieved" : missedNzbIds.size() + " NZBs could not be loaded";
        return new NzbsZipResponse(true, zip.getAbsolutePath(), message, foundNzbIds, missedNzbIds);
    }

    public File createZip(List<File> nzbFiles) throws Exception {
        logger.info("Creating ZIP with NZBs");

        File tempFile = File.createTempFile("nzbhydra", ".zip");
        tempFile.deleteOnExit();
        logger.debug("Using temp file {}", tempFile.getAbsolutePath());
        FileOutputStream fos = new FileOutputStream(tempFile);
        ZipOutputStream zos = new ZipOutputStream(fos);

        for (File file : nzbFiles) {
            addToZipFile(file, zos);
            file.delete();
        }

        zos.close();
        fos.close();

        return tempFile;
    }

    private static void addToZipFile(File file, ZipOutputStream zos) throws IOException {
        logger.debug("Adding file {} to temporary ZIP file", file.getAbsolutePath());
        FileInputStream fis = new FileInputStream(file);
        ZipEntry zipEntry = new ZipEntry(file.getName());
        zos.putNextEntry(zipEntry);

        byte[] bytes = new byte[1024];
        int length;
        while ((length = fis.read(bytes)) >= 0) {
            zos.write(bytes, 0, length);
        }

        zos.closeEntry();
        fis.close();
    }


    public String getNzbDownloadLink(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder;
        String getName = downloadType == DownloadType.NZB ? "getnzb" : "gettorrent";
        if (internal) {
            builder = SessionStorage.urlBuilder.get();
            builder.path("/" + getName + "/user");
            builder.path("/" + String.valueOf(searchResultId));
        } else {
            MainConfig main = configProvider.getBaseConfig().getMain();
            if (main.getExternalUrl().isPresent() && !main.isUseLocalUrlForApiAccess()) {
                builder = UriComponentsBuilder.fromHttpUrl(main.getExternalUrl().get());
            } else {
                builder = SessionStorage.urlBuilder.get();
            }
            builder.path("/" + getName + "/api");
            builder.path("/" + String.valueOf(searchResultId));
            builder.queryParam("apikey", main.getApiKey());
        }
        return builder.toUriString();
    }

    public NfoResult getNfo(Long searchResultId) {
        SearchResultEntity result = searchResultRepository.findOne(searchResultId);
        if (result == null) {
            logger.error("NZB download request with invalid/outdated search result ID " + searchResultId);
            throw new RuntimeException("NZB download request with invalid/outdated search result ID " + searchResultId);
        }
        Indexer indexer = searchModuleProvider.getIndexerByName(result.getIndexer().getName());
        return indexer.getNfo(result.getIndexerGuid());
    }

    public boolean updateStatusByEntity(NzbDownloadEntity entity, NzbDownloadStatus status) {
        NzbDownloadStatus oldStatus = entity.getStatus();
        entity.setStatus(status);
        downloadRepository.save(entity);
        logger.info("Updated download status of NZB \"{}\" from {} to {}", entity.getSearchResult().getTitle(), oldStatus, status);
        return true;
    }


    private String downloadNzb(SearchResultEntity result) throws IOException {
        Request request = new Request.Builder().url(result.getLink()).build();
        Indexer indexerByName = searchModuleProvider.getIndexerByName(result.getIndexer().getName());
        Integer timeout = indexerByName.getConfig().getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        try (Response response = clientHttpRequestFactory.getOkHttpClientBuilder(request.url().uri()).readTimeout(timeout, TimeUnit.SECONDS).connectTimeout(timeout, TimeUnit.SECONDS).build().newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Unsuccessful NZB download from URL " + result.getLink() + ". Message: " + response.message());
            }
            ResponseBody body = response.body();
            if (body == null || Strings.isNullOrEmpty(body.string())) {
                throw new IOException("NZB downloaded from " + result.getLink() + " is empty");
            }
            String content = body.string();
            return content;
        }
    }

    @Getter
    public static class NzbDownloadEvent {
        private NzbDownloadEntity downloadEntity;

        public NzbDownloadEvent(NzbDownloadEntity downloadEntity) {
            this.downloadEntity = downloadEntity;
        }
    }

    @Data
    @AllArgsConstructor
    public static class NzbsZipResponse {
        private boolean successful;
        private String zipFilepath;
        private String message;
        private Collection<Long> addedIds;
        private Collection<Long> missedIds;
    }


}
