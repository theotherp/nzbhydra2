package org.nzbhydra.downloading;

import com.google.common.io.BaseEncoding;
import com.googlecode.jsonrpc4j.JsonRpcHttpClient;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.DownloaderConfig;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.MalformedURLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Component
public class NzbGet extends Downloader {

    private static final Map<String, NzbDownloadStatus> NZBGET_STATUS_TO_HYDRA_STATUS = new HashMap<>();

    static {
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/ALL", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/UNPACK", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/PAR", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/HEALTH", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/GOOD", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/MARK", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/MOVE", NzbDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL); //We consider this good enough

        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/SCRIPT", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/SPACE", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/HEALTH", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/PASSWORD", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/DAMAGED", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/REPAIRABLE", NzbDownloadStatus.CONTENT_DOWNLOAD_WARNING);

        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/PAR", NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/UNPACK", NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/HEALTH", NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/BAD", NzbDownloadStatus.CONTENT_DOWNLOAD_ERROR);

        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/SCAN", NzbDownloadStatus.NZB_ADD_REJECTED);
    }

    private static final Logger logger = LoggerFactory.getLogger(NzbGet.class);
    private JsonRpcHttpClient client;

    //LATER Handle username / password and failed auth, return codes

    @Override
    public void intialize(DownloaderConfig downloaderConfig) {
        super.intialize(downloaderConfig);
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(downloaderConfig.getUrl());
            builder.path("jsonrpc");
            Map<String, String> headers = new HashMap<>();
            if (downloaderConfig.getUsername().isPresent() && downloaderConfig.getPassword().isPresent()) {
                headers.put("Authorization", "Basic " + BaseEncoding.base64().encode((downloaderConfig.getUsername().get() + ":" + downloaderConfig.getPassword().get()).getBytes()));
            }
            client = new JsonRpcHttpClient(builder.build().toUri().toURL(), headers);
        } catch (MalformedURLException e) {
            throw new RuntimeException("Unable to create URL from configuration: " + e.getMessage());
        }
    }

    @Override
    public GenericResponse checkConnection() {
        logger.debug("Checking connection");
        try {
            boolean successful = client.invoke("writelog", new Object[]{"INFO", "NZBHydra 2 connected to test connection"}, Boolean.class);
            logger.info("Connection check to NZBGet using URL {} successful", downloaderConfig.getUrl());
            return new GenericResponse(successful, null);
        } catch (Throwable e) {
            logger.error("Connection check to NZBGet using URL {} failed", downloaderConfig.getUrl());
            return new GenericResponse(false, e.getMessage());
        }
    }

    @Override
    public List<String> getCategories() {
        logger.debug("Loading list of categories");
        List<String> categories = new ArrayList<>();
        try {
            ArrayList<LinkedHashMap<String, String>> config = client.invoke("config", null, ArrayList.class);
            //Returned is a list of HashMaps with two entries: "Name" -> "<ConfigOptionName>" and "Value" -> "<ConfigOptionValue>"
            //For categories the name of the config option looks like "Category1.Name"
            categories = config.stream().filter(pair -> pair.containsKey("Name") && pair.get("Name").contains("Category") && pair.get("Name").contains("Name")).map(pair -> pair.get("Value")).collect(Collectors.toList());
        } catch (Throwable throwable) {
            logger.error("Error while trying to get categories from NZBGet: {}", throwable.getMessage());
        }
        return categories;
    }

    @Override
    public String addLink(String link, String title, String category) throws DownloaderException {
        logger.debug("Adding link to NZB");
        try {
            return callAppend(link, title, category);
        } catch (Throwable throwable) {
            logger.error("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", link, title, throwable.getMessage());
            throw new DownloaderException("Error while adding link to NZBGet: " + throwable.getMessage());
        }
    }

    @Override
    public String addNzb(String content, String title, String category) throws DownloaderException {
        logger.debug("Adding NZB");
        try {
            return callAppend(BaseEncoding.base64().encode(content.getBytes()), title, category);
        } catch (Throwable throwable) {
            logger.info("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", content, title, throwable.getMessage());
            throw new DownloaderException("Error while adding NZB to NZBGet: " + throwable.getMessage());
        }
    }


    protected boolean isDownloadMatchingHistoryEntry(NzbDownloadEntity download, DownloaderHistoryEntry entry) {
        boolean idMatches = download.getExternalId() != null && download.getExternalId().equals(String.valueOf(entry.getNzbId()));
        boolean nameMatches = download.getSearchResult().getTitle() != null && download.getSearchResult().getTitle().equals(entry.getNzbName());
        return idMatches || nameMatches;
    }

    @Override
    protected NzbDownloadStatus getDownloadStatusFromHistoryEntry(DownloaderHistoryEntry entry) {
        return NZBGET_STATUS_TO_HYDRA_STATUS.get(entry.getStatus());
    }


    public List<DownloaderHistoryEntry> getHistory(Instant earliestDownload) throws Throwable {
        ArrayList<LinkedHashMap<String, Object>> history = client.invoke("history", new Object[]{false}, ArrayList.class);
        List<DownloaderHistoryEntry> historyEntries = new ArrayList<>();
        for (LinkedHashMap<String, Object> map : history) {
            if (!map.get("Kind").equals("NZB")) {
                continue;
            }
            DownloaderHistoryEntry historyEntry = new DownloaderHistoryEntry();
            historyEntry.setNzbId((Integer) map.get("NZBID"));
            historyEntry.setName((String) map.get("Name"));
            historyEntry.setNzbName((String) map.get("NZBName"));
            historyEntry.setStatus((String) map.get("Status"));
            historyEntry.setTime(Instant.ofEpochSecond((Integer) map.get("HistoryTime")));
            historyEntries.add(historyEntry);
            if (historyEntry.getTime().isBefore(earliestDownload)) {
                return historyEntries;
            }
        }

        return historyEntries;
    }

    private String callAppend(String contentOrLink, String title, String category) throws Throwable {
        String nzbName = title;
        if (!nzbName.toLowerCase().endsWith(".nzb")) {
            nzbName += ".nzb";
        }
        category = category == null ? "" : category;
        //int append(string NZBFilename, string NZBContent, string Category, int Priority, bool AddToTop, bool AddPaused, string DupeKey, int DupeScore, string DupeMode, array PPParameters)
        Object[] arguments = new Object[]{nzbName, contentOrLink, category, 0, false, false, "", 0, "SCORE", new Object[]{}};
        int nzbId = client.invoke("append", arguments, Integer.class);
        if (nzbId <= 0) {
            throw new DownloaderException("NZBGet returned error code. Check its logs");
        }
        logger.info("Successfully added NZB \"{}\" to NZBGet queue with ID {}", title, nzbId);
        return String.valueOf(nzbId);
    }


}
