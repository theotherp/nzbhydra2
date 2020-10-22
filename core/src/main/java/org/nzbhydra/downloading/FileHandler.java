package org.nzbhydra.downloading;

import com.google.common.base.Stopwatch;
import com.google.common.collect.Sets;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShort;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.NfoResult;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.notifications.DownloadNotificationEvent;
import org.nzbhydra.searching.SearchModuleProvider;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.searching.dtoseventsenums.SearchResultItem.DownloadType;
import org.nzbhydra.searching.searchrequests.SearchRequest.SearchSource;
import org.nzbhydra.web.UrlCalculator;
import org.nzbhydra.webaccess.HydraOkHttp3ClientHttpRequestFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@SuppressWarnings("ResultOfMethodCallIgnored")
@Component
public class FileHandler {

    private static final Logger logger = LoggerFactory.getLogger(FileHandler.class);

    @Autowired
    protected ConfigProvider configProvider;
    @Autowired
    protected SearchResultRepository searchResultRepository;
    @Autowired
    protected FileDownloadRepository downloadRepository;
    @Autowired
    private IndexerApiAccessEntityShortRepository shortRepository;
    @Autowired
    protected SearchModuleProvider searchModuleProvider;
    @Autowired
    protected HydraOkHttp3ClientHttpRequestFactory clientHttpRequestFactory;
    @Autowired
    protected ApplicationEventPublisher eventPublisher;
    @Autowired
    protected UrlCalculator urlCalculator;

    @Transactional
    public DownloadResult getFileByGuid(long guid, FileDownloadAccessType fileDownloadAccessType, SearchSource accessSource) throws InvalidSearchResultIdException {
        Optional<SearchResultEntity> optionalResult = searchResultRepository.findById(guid);
        if (!optionalResult.isPresent()) {
            logger.error("Download request with invalid/outdated GUID {}", guid);
            throw new InvalidSearchResultIdException(guid, accessSource == SearchSource.INTERNAL);
        }
        SearchResultEntity result = optionalResult.get();
        String downloadType = result.getDownloadType() == DownloadType.NZB ? "NZB" : "Torrent";
        logger.info("{} download request for \"{}\" from indexer {}", downloadType, result.getTitle(), result.getIndexer().getName());
        return getFileByResult(fileDownloadAccessType, accessSource, result, new HashSet<>());
    }

    private DownloadResult getFileByResult(FileDownloadAccessType fileDownloadAccessType, SearchSource accessSource, SearchResultEntity result, Set<SearchResultEntity> alreadyTriedDownloading) {

        if (fileDownloadAccessType == FileDownloadAccessType.REDIRECT) {
            return handleRedirect(accessSource, result, null);
        } else {
            try {
                final DownloadResult downloadResult = handleContentDownload(accessSource, result);
                if (downloadResult.isSuccessful()) {
                    return downloadResult;
                }
                if (!configProvider.getBaseConfig().getDownloading().getFallbackForFailed().meets(accessSource)) {
                    return downloadResult;
                }

                alreadyTriedDownloading.add(result);
                final Set<SearchResultEntity> similarResults = searchResultRepository.findAllByTitleLikeIgnoreCase(result.getTitle().replaceAll("[ .\\-_]", "_"));
                final Optional<SearchResultEntity> similarResult = similarResults.stream()
                        .filter(x -> x != result && !alreadyTriedDownloading.contains(x))
                        .findFirst();
                if (similarResult.isPresent()) {
                    logger.info("Falling back from failed download to similar result {}", similarResult.get());
                    return getFileByResult(fileDownloadAccessType, accessSource, similarResult.get(), alreadyTriedDownloading);
                }
                logger.info("Unable to find similar result to fall back to. Returning download failure.");

                return downloadResult;

            } catch (MagnetLinkRedirectException e) {
                logger.warn("Unable to download magnet link as file");
                return DownloadResult.createErrorResult("Unable to download magnet link as file");
            }
        }
    }

    @Transactional
    public DownloadResult handleContentDownload(SearchSource accessSource, SearchResultEntity result) throws MagnetLinkRedirectException {
        if (result.getLink().contains("magnet:")) {
            logger.warn("Unable to download magnet link as file");
            return DownloadResult.createErrorResult("Unable to download magnet link as file");
        }
        byte[] fileContent;
        Stopwatch stopwatch = Stopwatch.createStarted();
        try {
            fileContent = downloadFile(result);
        } catch (DownloadException e) {
            //LATER get status code and use that
            logger.error("Error while downloading NZB from URL {}: Status code: {}. Message: {}", result.getLink(), e.getStatus(), e.getMessage());
            FileDownloadEntity downloadEntity = new FileDownloadEntity(result, FileDownloadAccessType.PROXY, accessSource, FileDownloadStatus.NZB_DOWNLOAD_ERROR, e.getMessage());

            if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
                downloadRepository.save(downloadEntity);
            }
            shortRepository.save(new IndexerApiAccessEntityShort(result.getIndexer(), false, IndexerApiAccessType.NZB));

            publishEvents(result, downloadEntity);
            return DownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName(), HttpStatus.valueOf(e.getStatus()), downloadEntity);
        }

        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        //LATER CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
        logger.info("{} download from indexer successfully completed in {}ms", result.getDownloadType() == DownloadType.NZB ? "NZB" : "Torrent", responseTime);

        FileDownloadEntity downloadEntity = new FileDownloadEntity(result, FileDownloadAccessType.PROXY, accessSource, FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL, null);
        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            downloadRepository.save(downloadEntity);
        }
        shortRepository.save(new IndexerApiAccessEntityShort(result.getIndexer(), true, IndexerApiAccessType.NZB));
        publishEvents(result, downloadEntity);

        return DownloadResult.createSuccessfulDownloadResult(result.getTitle(), fileContent, downloadEntity);
    }

    @Transactional
    public DownloadResult handleRedirect(SearchSource accessSource, SearchResultEntity result, String actualUrl) {
        logger.debug("Redirecting to " + result.getLink());
        FileDownloadEntity downloadEntity = new FileDownloadEntity(result, FileDownloadAccessType.REDIRECT, accessSource, FileDownloadStatus.REQUESTED, null);
        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            downloadRepository.save(downloadEntity);
        }
        shortRepository.save(new IndexerApiAccessEntityShort(result.getIndexer(), true, IndexerApiAccessType.NZB));
        publishEvents(result, downloadEntity);

        return DownloadResult.createSuccessfulRedirectResult(result.getTitle(), actualUrl != null ? actualUrl : result.getLink(), downloadEntity);
    }

    private void publishEvents(SearchResultEntity result, FileDownloadEntity downloadEntity) {
        eventPublisher.publishEvent(new FileDownloadEvent(downloadEntity, result));
        String age = result.getDownloadType() == DownloadType.NZB ? String.valueOf(((int) (Duration.between(result.getPubDate(), Instant.now()).get(ChronoUnit.SECONDS) / (24 * 60 * 60)))) : "[]";
        String source = result.getDownloadType() == DownloadType.NZB ? "NZB" : "torrent";
        eventPublisher.publishEvent(new DownloadNotificationEvent(result.getIndexer().getName(), result.getTitle(), age, source));
    }


    public FileZipResponse getFilesAsZip(List<Long> guids) throws Exception {
        Path tempDirectory;
        try {
            tempDirectory = Files.createTempDirectory("nzbhydra");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        final NzbsDownload nzbsDownload = getNzbsAsFiles(guids, tempDirectory);
        if (nzbsDownload.files.isEmpty()) {
            return new FileZipResponse(false, null, "No files could be retrieved", Collections.emptyList(), guids);
        }
        File zip = createZip(nzbsDownload.files);
        logger.info("Successfully added {}/{} files to ZIP", nzbsDownload.files.size(), guids.size());
        if (nzbsDownload.tempDirectory != null) {
            nzbsDownload.tempDirectory.toFile().delete();
        }

        String message = nzbsDownload.failedIds.isEmpty() ? "All files successfully retrieved" : nzbsDownload.failedIds.size() + " files could not be loaded";
        return new FileZipResponse(true, zip.getAbsolutePath(), message, nzbsDownload.successfulIds, nzbsDownload.failedIds);
    }

    private NzbsDownload getNzbsAsFiles(Collection<Long> guids, Path targetDirectory) {
        final NzbsDownload nzbsDownload;

        final List<File> files = new ArrayList<>();
        final List<Long> successfulIds = new ArrayList<>();
        final List<Long> failedIds = new ArrayList<>();

        for (Long guid : guids) {
            DownloadResult result;
            try {
                result = getFileByGuid(guid, FileDownloadAccessType.PROXY, SearchSource.INTERNAL);
            } catch (InvalidSearchResultIdException e) {
                failedIds.add(guid);
                continue;
            }
            if (!result.isSuccessful()) {
                failedIds.add(guid);
                continue;
            }
            try {
                String title = result.getFileName().replaceAll("[\\\\/:*?\"<>|]", "_");
                File tempFile = new File(targetDirectory.toFile(), title);
                logger.debug("Writing content to temp file {}", tempFile.getAbsolutePath());
                Files.write(tempFile.toPath(), result.getContent());
                files.add(tempFile);
                successfulIds.add(guid);
            } catch (IOException e) {
                logger.error("Unable to write file content to temporary file: " + e.getMessage());
                failedIds.add(guid);
            }
        }

        return new NzbsDownload(files, successfulIds, failedIds, targetDirectory);
    }

    public File createZip(List<File> nzbFiles) throws Exception {
        logger.info("Creating ZIP with files");

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


    public String getDownloadLinkForSendingToDownloader(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder;
        final Optional<String> externalUrl = configProvider.getBaseConfig().getDownloading().getExternalUrl();
        if (externalUrl.isPresent()) {
            logger.debug(LoggingMarkers.URL_CALCULATION, "Using configured external URL: {}", externalUrl.get());
            builder = UriComponentsBuilder.fromHttpUrl(externalUrl.get());
        } else {
            builder = urlCalculator.getRequestBasedUriBuilder();
            logger.debug(LoggingMarkers.URL_CALCULATION, "Using URL calculated from request: {}", builder.toUriString());
        }
        return getDownloadLink(searchResultId, internal, downloadType, builder);
    }

    public String getDownloadLinkForResults(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder = urlCalculator.getRequestBasedUriBuilder();
        logger.debug(LoggingMarkers.URL_CALCULATION, "Using URL calculated from request: {}", builder.toUriString());
        return getDownloadLink(searchResultId, internal, downloadType, builder);
    }

    private String getDownloadLink(Long searchResultId, boolean internal, DownloadType downloadType, UriComponentsBuilder builder) {
        String getName = downloadType == DownloadType.NZB ? "getnzb" : "gettorrent";
        if (internal) {
            builder.path("/" + getName + "/user");
            builder.path("/" + searchResultId);
        } else {
            MainConfig main = configProvider.getBaseConfig().getMain();
            builder.path("/" + getName + "/api");
            builder.path("/" + searchResultId);
            builder.queryParam("apikey", main.getApiKey());
        }
        return builder.toUriString();
    }

    public NfoResult getNfo(Long searchResultId) {
        Optional<SearchResultEntity> optionalResult = searchResultRepository.findById(searchResultId);
        if (!optionalResult.isPresent()) {
            logger.error("Download request with invalid/outdated search result ID " + searchResultId);
            throw new RuntimeException("Download request with invalid/outdated search result ID " + searchResultId);
        }
        SearchResultEntity result = optionalResult.get();
        Indexer indexer = searchModuleProvider.getIndexerByName(result.getIndexer().getName());
        return indexer.getNfo(result.getIndexerGuid());
    }

    public void updateStatusByEntity(FileDownloadEntity entity, FileDownloadStatus status) {
        FileDownloadStatus oldStatus = entity.getStatus();
        entity.setStatus(status);
        downloadRepository.save(entity);
        logger.info("Updated download status of \"{}\" from {} to {}", entity.getSearchResult().getTitle(), oldStatus, status);
    }


    protected byte[] downloadFile(SearchResultEntity result) throws MagnetLinkRedirectException, DownloadException {
        Request request = new Request.Builder().url(result.getLink()).build();
        Indexer indexerByName = searchModuleProvider.getIndexerByName(result.getIndexer().getName());
        Integer timeout = indexerByName.getConfig().getTimeout().orElse(configProvider.getBaseConfig().getSearching().getTimeout());
        try (Response response = clientHttpRequestFactory.getOkHttpClientBuilder(request.url().uri()).readTimeout(timeout, TimeUnit.SECONDS).connectTimeout(timeout, TimeUnit.SECONDS).followRedirects(true).build().newCall(request).execute()) {
            if (response.isRedirect()) {
                return handleRedirect(result, response);
            }
            if (!response.isSuccessful()) {
                throw new DownloadException(result.getLink(), response.code(), response.message());
            }
            ResponseBody body = response.body();
            if (body == null) {
                throw new DownloadException(result.getLink(), 500, "NZB downloaded is empty");
            }
            return body.bytes();
        } catch (IOException e) {
            logger.error("Error downloading result", e);
            throw new DownloadException(result.getLink(), 500, "IOException: " + e.getMessage());
        }
    }

    private byte[] handleRedirect(SearchResultEntity result, Response response) throws MagnetLinkRedirectException, DownloadException {
        String locationHeader = response.header("location");
        if (locationHeader != null) {
            if (locationHeader.startsWith("magnet:")) {
                throw new MagnetLinkRedirectException(locationHeader);
            } else {
                logger.info("Redirecting to URL {}", locationHeader);
                result.setLink(locationHeader);
                return downloadFile(result);
            }
        }
        logger.error("Unable to handle redirect from URL {} because no redirection location is set", result.getLink());
        throw new DownloadException(result.getLink(), 500, "Unable to handle redirect from URL " + result.getLink() + " because no redirection location is set");
    }

    public GenericResponse saveNzbToBlackhole(Long searchResultId) {
        if (!configProvider.getBaseConfig().getDownloading().getSaveNzbsTo().isPresent()) {
            //Shouldn't happen
            return GenericResponse.notOk("NZBs black hole not set");
        }
        //Is always just one file
        final NzbsDownload nzbsAsFiles = getNzbsAsFiles(Sets.newHashSet(searchResultId), Paths.get(configProvider.getBaseConfig().getDownloading().getSaveNzbsTo().get()));
        if (nzbsAsFiles.successfulIds.isEmpty()) {
            return GenericResponse.notOk("Unable to save file for download NZB for some reason");
        }
        return GenericResponse.ok();
    }


    private static class NzbsDownload {
        private final List<File> files;
        private final List<Long> successfulIds;
        private final List<Long> failedIds;
        private final Path tempDirectory;


        private NzbsDownload(List<File> files, List<Long> successfulIds, List<Long> failedIds, Path tempDirectory) {
            this.files = files;
            this.successfulIds = successfulIds;
            this.failedIds = failedIds;
            this.tempDirectory = tempDirectory;
        }
    }

}
