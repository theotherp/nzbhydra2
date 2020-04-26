package org.nzbhydra.downloading;

import com.google.common.base.Stopwatch;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.MainConfig;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.Indexer;
import org.nzbhydra.indexers.IndexerApiAccessEntityShort;
import org.nzbhydra.indexers.IndexerApiAccessEntityShortRepository;
import org.nzbhydra.indexers.IndexerApiAccessType;
import org.nzbhydra.indexers.NfoResult;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.TimeUnit;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

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

        if (fileDownloadAccessType == FileDownloadAccessType.REDIRECT) {
            return handleRedirect(accessSource, result);
        } else {
            try {
                return handleContentDownload(accessSource, result, downloadType);
            } catch (MagnetLinkRedirectException e) {
                logger.warn("Unable to download magnet link as file");
                return DownloadResult.createErrorResult("Unable to download magnet link as file");
            }
        }
    }

    @Transactional
    public DownloadResult handleContentDownload(SearchSource accessSource, SearchResultEntity result, String downloadType) throws MagnetLinkRedirectException {
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

            eventPublisher.publishEvent(new FileDownloadEvent(downloadEntity));
            return DownloadResult.createErrorResult("An error occurred while downloading " + result.getTitle() + " from indexer " + result.getIndexer().getName(), HttpStatus.valueOf(e.getStatus()), downloadEntity);
        }

        long responseTime = stopwatch.elapsed(TimeUnit.MILLISECONDS);
        //LATER CHeck content of file for errors, perhaps an indexer returns successful code but error in message for some reason
        logger.info("{} download from indexer successfully completed in {}ms", downloadType, responseTime);

        FileDownloadEntity downloadEntity = new FileDownloadEntity(result, FileDownloadAccessType.PROXY, accessSource, FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL, null);
        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            downloadRepository.save(downloadEntity);
        }
        shortRepository.save(new IndexerApiAccessEntityShort(result.getIndexer(), true, IndexerApiAccessType.NZB));
        eventPublisher.publishEvent(new FileDownloadEvent(downloadEntity));

        return DownloadResult.createSuccessfulDownloadResult(result.getTitle(), fileContent, downloadEntity);
    }

    @Transactional
    public DownloadResult handleRedirect(SearchSource accessSource, SearchResultEntity result) {
        logger.debug("Redirecting to " + result.getLink());
        FileDownloadEntity downloadEntity = new FileDownloadEntity(result, FileDownloadAccessType.REDIRECT, accessSource, FileDownloadStatus.REQUESTED, null);
        if (configProvider.getBaseConfig().getMain().isKeepHistory()) {
            downloadRepository.save(downloadEntity);
        }
        shortRepository.save(new IndexerApiAccessEntityShort(result.getIndexer(), true, IndexerApiAccessType.NZB));
        eventPublisher.publishEvent(new FileDownloadEvent(downloadEntity));

        return DownloadResult.createSuccessfulRedirectResult(result.getTitle(), result.getLink(), downloadEntity);
    }


    public FileZipResponse getFilesAsZip(List<Long> guids) throws Exception {
        List<File> files = new ArrayList<>();
        Path tempDirectory = null;
        List<Long> successfulIds = new ArrayList<>();
        List<Long> failedIds = new ArrayList<>();
        for (Long guid : guids) {
            DownloadResult result = getFileByGuid(guid, FileDownloadAccessType.PROXY, SearchSource.INTERNAL);
            if (!result.isSuccessful()) {
                continue;
            }
            try {
                tempDirectory = Files.createTempDirectory("nzbhydra");
                String title = result.getFileName().replaceAll("[\\\\/:*?\"<>|]", "_");
                File tempFile = new File(tempDirectory.toFile(), title); //TODO make usable with torrents
                logger.debug("Writing content to temp file {}", tempFile.getAbsolutePath());
                Files.write(tempFile.toPath(), result.getContent());
                files.add(tempFile);
                successfulIds.add(guid);
            } catch (IOException e) {
                logger.error("Unable to write file content to temporary file: " + e.getMessage());
                failedIds.add(guid);
            }
        }
        if (files.isEmpty()) {
            return new FileZipResponse(false, null, "No files could be retrieved", Collections.emptyList(), guids);
        }
        File zip = createZip(files);
        logger.info("Successfully added {}/{} files to ZIP", files.size(), guids.size());
        if (tempDirectory != null) {
            tempDirectory.toFile().delete();
        }

        String message = failedIds.isEmpty() ? "All files successfully retrieved" : failedIds.size() + " files could not be loaded";
        return new FileZipResponse(true, zip.getAbsolutePath(), message, successfulIds, failedIds);
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


    public String getDownloadLink(Long searchResultId, boolean internal, DownloadType downloadType) {
        UriComponentsBuilder builder = urlCalculator.getRequestBasedUriBuilder();
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


}
