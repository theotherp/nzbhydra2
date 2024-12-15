/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.nzbget;

import com.google.common.base.Strings;
import com.google.common.io.BaseEncoding;
import com.googlecode.jsonrpc4j.JsonRpcHttpClient;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.config.downloading.DownloaderConfig;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.FileHandler;
import org.nzbhydra.downloading.IndexerSpecificDownloadExceptions;
import org.nzbhydra.downloading.downloaders.Downloader;
import org.nzbhydra.downloading.downloaders.DownloaderEntry;
import org.nzbhydra.downloading.downloaders.DownloaderStatus;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.nzbhydra.logging.LoggingMarkers;
import org.nzbhydra.searching.db.SearchResultRepository;
import org.nzbhydra.webaccess.Ssl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.MalformedURLException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@SuppressWarnings({"unchecked", "RedundantCast"})
public class NzbGet extends Downloader {

    private static final Map<String, FileDownloadStatus> NZBGET_STATUS_TO_HYDRA_STATUS = new HashMap<>();

    static {
        //History statuses
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/ALL", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/UNPACK", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/PAR", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/HEALTH", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/GOOD", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/MARK", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("SUCCESS/HIDDEN", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/MOVE", FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL); //We consider this good enough

        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/SCRIPT", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/SPACE", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/HEALTH", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/PASSWORD", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/DAMAGED", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("WARNING/REPAIRABLE", FileDownloadStatus.CONTENT_DOWNLOAD_WARNING);

        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/PAR", FileDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/UNPACK", FileDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/HEALTH", FileDownloadStatus.CONTENT_DOWNLOAD_ERROR);
        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/BAD", FileDownloadStatus.CONTENT_DOWNLOAD_ERROR);

        NZBGET_STATUS_TO_HYDRA_STATUS.put("FAILURE/SCAN", FileDownloadStatus.NZB_ADD_REJECTED);

    }

    private final Ssl ssl;

    public NzbGet(FileHandler nzbHandler, SearchResultRepository searchResultRepository, ApplicationEventPublisher applicationEventPublisher, IndexerSpecificDownloadExceptions indexerSpecificDownloadExceptions, ConfigProvider configProvider, Ssl ssl) {
        super(nzbHandler, searchResultRepository, applicationEventPublisher, indexerSpecificDownloadExceptions, configProvider);
        this.ssl = ssl;
    }

    private static final Logger logger = LoggerFactory.getLogger(NzbGet.class);
    private JsonRpcHttpClient client;
    private Instant lastErrorLogged;


    //LATER Handle username / password and failed auth, return codes

    @Override
    public void initialize(DownloaderConfig downloaderConfig) {
        super.initialize(downloaderConfig);
        try {
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(downloaderConfig.getUrl());
            builder.path("jsonrpc");
            Map<String, String> headers = new HashMap<>();
            if (downloaderConfig.getUsername().isPresent() && downloaderConfig.getPassword().isPresent()) {
                headers.put("Authorization", "Basic " + BaseEncoding.base64().encode((downloaderConfig.getUsername().get() + ":" + downloaderConfig.getPassword().get()).getBytes()));
            }
            client = new JsonRpcHttpClient(builder.build().toUri().toURL(), headers);
            final String host = builder.build().getHost();
            final Ssl.SslVerificationState verificationState = ssl.getVerificationStateForHost(host);
            if (verificationState == Ssl.SslVerificationState.ENABLED) {
                client.setSslContext(ssl.getCaCertsContext());
            } else {
                client.setSslContext(ssl.getAllTrustingSslContext());
            }
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
            String message = e.getMessage();
            if (e.getMessage() != null && e.getMessage().contains("Caught error with no response body") && e.getCause() != null && !Strings.isNullOrEmpty(e.getCause().getMessage())) {
                message = e.getCause().getMessage();
            }
            logger.error("Connection check to NZBGet using URL {} failed: {}", downloaderConfig.getUrl(), message);
            return new GenericResponse(false, message);
        }
    }

    @Override
    public List<String> getCategories() {
        logger.debug("Loading list of categories");
        List<String> categories = new ArrayList<>();
        try {
            ArrayList<LinkedHashMap<String, Object>> config = callNzbget("config", null);
            //Returned is a list of HashMaps with two entries: "Name" -> "<ConfigOptionName>" and "Value" -> "<ConfigOptionValue>"
            //For categories the name of the config option looks like "Category1.Name"
            categories = config.stream().filter(pair -> pair.containsKey("Name") && pair.get("Name").toString().contains("Category") && pair.get("Name").toString().contains("Name")).map(pair -> pair.get("Value").toString()).collect(Collectors.toList());
        } catch (DownloaderException throwable) {
            logger.error("Error while trying to get categories from NZBGet: {}", throwable.getMessage());
        }
        return categories;
    }

    @Override
    public String addLink(String link, String title, String category) throws DownloaderException {
        logger.debug("Adding link for {} to NZB with category {}", title, category);
        try {
            return callAppend(link, title, category);
        } catch (Throwable throwable) {
            logger.error("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", link, title, throwable.getMessage());
            if (throwable.getMessage() != null) {
                throw new DownloaderException("Error while adding link to NZBGet: " + throwable.getMessage());
            }
            throw new DownloaderException("Unknown error while adding link to NZBGet");
        }
    }

    @Override
    public String addNzb(byte[] content, String title, String category) throws DownloaderException {
        logger.debug("Adding NZB for {} to NZB with category {}", title, category);
        try {
            return callAppend(BaseEncoding.base64().encode(content), title, category);
        } catch (Throwable throwable) {
            logger.info("Error while trying to add link {} for NZB \"{}\" to NZBGet queue: {}", content, title, throwable.getMessage());
            if (throwable.getMessage() != null) {
                throw new DownloaderException("Error while adding NZB to NZBGet: " + throwable.getMessage());
            }
            throw new DownloaderException("Unknown error while adding NZB to NZBGet");
        }
    }

    @Override
    public DownloaderStatus getStatus() throws DownloaderException {
        LinkedHashMap<String, Object> statusMap;
        try {
            statusMap = client.invoke("status", new Object[]{}, LinkedHashMap.class);
            lastErrorLogged = null;
        } catch (Throwable e) {
            if (lastErrorLogged == null || lastErrorLogged.isBefore(Instant.now().minus(10, ChronoUnit.MINUTES))) {
                logger.error("Error contacting NZBGet", e);
                lastErrorLogged = Instant.now();
            }
            DownloaderStatus status = new DownloaderStatus();
            status.setState(DownloaderStatus.State.OFFLINE);
            addDownloadRate(0);
            return status;
        }
        DownloaderStatus status = getStatusFromMap(statusMap);

        fillStatusFromQueue(status);

        return status;
    }

    protected void fillStatusFromQueue(DownloaderStatus status) throws DownloaderException {
        ArrayList<LinkedHashMap<String, Object>> queue = callNzbget("listgroups", new Object[]{0});
        List<LinkedHashMap<String, Object>> nzbs = queue.stream().filter(x -> "NZB".equals(x.get("Kind"))).toList();
        if (!nzbs.isEmpty()) {

            status.setElementsInQueue(queue.size());
            if (!queue.isEmpty()) {
                final Optional<LinkedHashMap<String, Object>> downloadingEntry = queue.stream().filter(x -> ((String) x.get("Status")).equals("DOWNLOADING")).findFirst();
                if (downloadingEntry.isPresent()) {
                    LinkedHashMap<String, Object> map = downloadingEntry.get();
                    status.setDownloadingTitle((String) map.get("NZBName"));
                    int totalMb = (Integer) map.get("FileSizeMB") - (Integer) map.get("PausedSizeMB");
                    int remainingMb = (int) (Integer) map.get("RemainingSizeMB") - (Integer) map.get("PausedSizeMB"); //PausedSizeMB is size of pars
                    if (totalMb == 0) {
                        status.setDownloadingTitlePercentFinished(0);
                    } else {
                        status.setDownloadingTitlePercentFinished(Math.round(((totalMb - remainingMb) / (float) (totalMb)) * 100));
                    }
                    if (status.getState() == DownloaderStatus.State.DOWNLOADING && status.getDownloadRateInKilobytes() > 0) {
                        status.setDownloadingTitleRemainingTimeSeconds(calculateSecondsLeft(remainingMb, status.getDownloadRateInKilobytes() * 1024));
                    }
                }
            }
        }
    }

    private int calculateSecondsLeft(int remainingMb, long downloadRateBytesPerSecond) {
        return (int) ((remainingMb * 1024F) / (downloadRateBytesPerSecond / 1024F));
    }

    private DownloaderStatus getStatusFromMap(LinkedHashMap<String, Object> statusMap) {
        DownloaderStatus status = new DownloaderStatus();

        status.setDownloaderName(downloaderConfig.getName());
        status.setDownloaderType(downloaderConfig.getDownloaderType());

        int remainingSizeMB = (Integer) statusMap.get("RemainingSizeMB") - (Integer) statusMap.getOrDefault("PausedSizeMB", 0);
//        status.setRemainingSizeFormatted(remainingSizeMB > 0 ? Converters.formatMegabytes(remainingSizeMB, true) : "");
        status.setRemainingSizeInMegaBytes(remainingSizeMB);

        Integer downloadRateInBytes = (Integer) statusMap.get("DownloadRate");
//        status.setDownloadRateFormatted(downloadRateInBytes > 0 ? (Converters.formatBytesPerSecond(downloadRateInBytes, true)) : "");
        int downloadRateInKilobytes = downloadRateInBytes / 1024;
        status.setDownloadRateInKilobytes(downloadRateInKilobytes);
        addDownloadRate(downloadRateInKilobytes);
        status.setDownloadingRatesInKilobytes(downloadRates);

        Boolean downloadPaused = (Boolean) statusMap.get("DownloadPaused");
        if (downloadPaused) {
            status.setState(DownloaderStatus.State.PAUSED);
        } else if (remainingSizeMB > 0) {
            status.setState(DownloaderStatus.State.DOWNLOADING);
        } else {
            status.setState(DownloaderStatus.State.IDLE);
        }
        if (downloadRateInBytes > 0) {
            int mb;
            if (downloadPaused) {
                mb = (int) statusMap.get("ForcedSizeMB");
            } else {
                mb = (int) statusMap.get("RemainingSizeMB");
            }
            status.setRemainingSeconds((long) ((mb * 1024F) / (downloadRateInBytes / 1024F)));
//            status.setRemainingTimeFormatted(Converters.formatTime(status.getRemainingSeconds()));
        }
        return status;
    }

    @Override
    protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
        if (statusCheckType == StatusCheckType.QUEUE) {
            //Any entry in the queue was obviously added successfully
            return FileDownloadStatus.NZB_ADDED;
        }
        return NZBGET_STATUS_TO_HYDRA_STATUS.get(entry.getStatus());
    }


    public List<DownloaderEntry> getHistory(Instant earliestDownloadTime) throws DownloaderException {
        ArrayList<LinkedHashMap<String, Object>> history = callNzbget("history", new Object[]{true});
        List<DownloaderEntry> historyEntries = new ArrayList<>();
        for (LinkedHashMap<String, Object> map : history) {
            if (!map.get("Kind").equals("NZB") && !map.get("Kind").equals("DUP")) {
                continue;
            }
            DownloaderEntry historyEntry = getBasicDownloaderEntry(map);
            historyEntry.setTime(Instant.ofEpochSecond((Integer) map.get("HistoryTime")));
            if (historyEntry.getTime().isBefore(earliestDownloadTime)) {
                logger.debug(LoggingMarkers.DOWNLOAD_STATUS_UPDATE, "Stopping transforming history entries because the current history entry is from {} which is before earliest download to check which is from {}", historyEntry.getTime(), earliestDownloadTime);
                return historyEntries;
            }
            historyEntries.add(historyEntry);
        }

        return historyEntries;
    }

    @Override
    public List<DownloaderEntry> getQueue(Instant earliestDownload) throws DownloaderException {
        ArrayList<LinkedHashMap<String, Object>> queue = callNzbget("listgroups", new Object[]{0});
        List<DownloaderEntry> queueEntries = new ArrayList<>();
        for (LinkedHashMap<String, Object> map : queue) {
            if (!map.get("Kind").equals("NZB")) {
                continue;
            }
            DownloaderEntry entry = getBasicDownloaderEntry(map);
            queueEntries.add(entry);
        }

        return queueEntries;
    }

    protected ArrayList<LinkedHashMap<String, Object>> callNzbget(String listgroups, Object[] argument) throws DownloaderException {
        try {
            //noinspection unchecked
            return client.invoke(listgroups, argument, ArrayList.class);
        } catch (Throwable e) {
            throw new DownloaderException("Error while calling NZBGet", e);
        }
    }

    protected DownloaderEntry getBasicDownloaderEntry(LinkedHashMap<String, Object> map) {
        DownloaderEntry entry = new DownloaderEntry();
        entry.setNzbId(String.valueOf(map.get("NZBID")));
        if (map.get("Kind").equals("DUP")) {
            entry.setNzbName((String) map.get("Name"));
        } else {
            entry.setNzbName((String) map.get("NZBName"));
        }
        entry.setStatus((String) map.get("Status"));
        return entry;
    }

    private String callAppend(String contentOrLink, String title, String category) throws Throwable {
        String nzbName = title;
        if (!nzbName.toLowerCase().endsWith(".nzb")) {
            nzbName += ".nzb";
        }
        category = category == null ? "" : category;
        //int append(string NZBFilename, string NZBContent, string Category, int Priority, bool AddToTop, bool AddPaused, string DupeKey, int DupeScore, string DupeMode, array PPParameters)
        final int priority = 0;
        final boolean addToTop = false;
        final boolean addPaused = downloaderConfig.isAddPaused();
        final String dupeKey = "";
        final int dupeScore = 0;
        Object[] arguments = new Object[]{nzbName, contentOrLink, category, priority, addToTop, addPaused, dupeKey, dupeScore, "SCORE", new Object[]{}};
        int nzbId = client.invoke("append", arguments, Integer.class);
        if (nzbId <= 0) {
            throw new DownloaderException("NZBGet returned error code. Check its logs");
        }
        logger.info("Successfully added NZB \"{}\" to NZBGet queue with ID {} in category \"{}\"", title, nzbId, category);
        return String.valueOf(nzbId);
    }


}
