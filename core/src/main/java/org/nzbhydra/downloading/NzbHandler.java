package org.nzbhydra.downloading;

import com.google.common.base.Stopwatch;
import lombok.Getter;
import okhttp3.Request;
import okhttp3.Response;
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
    private HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;
    @Autowired
    private ApplicationEventPublisher eventPublisher;

    public NzbDownloadResult getNzbByGuid(long guid, NzbAccessType nzbAccessType, SearchSource accessSource) {
        SearchResultEntity result = searchResultRepository.findOne(guid);
        if (result == null) {
            logger.error("Download request with invalid/outdated GUID {}", guid);

            return NzbDownloadResult.createErrorResult("Download request with invalid/outdated GUID " + guid, null);
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

    public File getNzbsAsZip(List<Long> guids) throws Exception {
        List<File> nzbFiles = new ArrayList<>();
        Path tempDirectory = null;
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
            } catch (IOException e) {
                logger.error("Unable to write NZB content to temporary file: " + e.getMessage());
            }
        }
        if (nzbFiles.isEmpty()) {
            throw new RuntimeException("No NZBs could be retrieved");
        }
        File zip = createZip(nzbFiles);
        logger.info("Successfully added {}/{} NZBs to ZIP", nzbFiles.size(), guids.size());
        if (tempDirectory != null) {
            tempDirectory.toFile().delete();
        }
        return zip;
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
            builder = configProvider.getBaseConfig().getBaseUriBuilder();
            builder.path("/" + getName + "/user");
            builder.path("/" + String.valueOf(searchResultId));
        } else {
            MainConfig main = configProvider.getBaseConfig().getMain();
            if (main.getExternalUrl().isPresent() && !main.isUseLocalUrlForApiAccess()) {
                builder = UriComponentsBuilder.fromHttpUrl(main.getExternalUrl().get());
            } else {
                builder = configProvider.getBaseConfig().getBaseUriBuilder();
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

    public boolean updateStatusByExternalIdOrTitle(String externalId, String title, NzbDownloadStatus status) {
        Collection<NzbDownloadEntity> foundEntities = downloadRepository.findByExternalId(externalId);
        if (foundEntities.isEmpty()) {
            return updateStatusByNzbTitle(title, status);
        } else {
            return updateStatusByExternalId(externalId, status);
        }
    }

    public boolean updateStatusByExternalId(String externalId, NzbDownloadStatus status) {
        Collection<NzbDownloadEntity> foundEntities = downloadRepository.findByExternalId(externalId);
        if (foundEntities.size() == 0) {
            logger.error("Did not find any download identified by \"{}\"", externalId);
            return false;
        }
        if (foundEntities.size() > 1) {
            logger.error("Find multiple downloads identified by \"{}\"", externalId);
            return false;
        }
        NzbDownloadEntity entity = foundEntities.iterator().next();
        entity.setStatus(status);
        downloadRepository.save(entity);
        logger.info("Updated download status of NZB \"{}\" to {}", entity.getSearchResult().getTitle(), status);
        return true;
    }

    public boolean updateStatusByNzbTitle(String title, NzbDownloadStatus status) {
        List<NzbDownloadEntity> foundEntities = downloadRepository.findBySearchResultTitleOrderByTimeDesc(title);
        NzbDownloadEntity entity = null;
        if (foundEntities.size() == 0) {
            logger.debug("Did not find any download for an NZB with the title \"{}\". Skipping this", title);
            return false;
        } else if (foundEntities.size() > 1) {
            logger.info("Found multiple downloads identified by \"{}\" and will try to find the newest that can be updated by the new status {}", title, status);
            for (NzbDownloadEntity foundEntity : foundEntities) {
                if (status.canUpdate(foundEntity.getStatus())) {
                    entity = foundEntity;
                    logger.info("Will update status of download initiated at {}", entity.getTime());
                    break;
                }
            }
            if (entity == null) {
                logger.error("Found multiple downloads identified by \"{}\" and didn't find one which could be updated by the new status {}", title, status);
                return false;
            }
        } else {
            entity = foundEntities.iterator().next();
        }
        NzbDownloadStatus oldStatus = entity.getStatus();
        entity.setStatus(status);
        downloadRepository.save(entity);
        logger.info("Updated download status of NZB \"{}\" from {} to {}", title, oldStatus, status);
        return true;
    }


    private String downloadNzb(SearchResultEntity result) throws IOException {
        Request request = new Request.Builder().url(result.getLink()).build();

        try (Response response = clientHttpRequestFactory.getOkHttpClientBuilder(request.url().uri()).build().newCall(request).execute()) {
            return response.body().string();
        }
    }

    @Getter
    public static class NzbDownloadEvent {
        private NzbDownloadEntity downloadEntity;

        public NzbDownloadEvent(NzbDownloadEntity downloadEntity) {
            this.downloadEntity = downloadEntity;
        }
    }


}
