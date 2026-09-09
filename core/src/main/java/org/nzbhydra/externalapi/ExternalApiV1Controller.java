package org.nzbhydra.externalapi;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.externalapi.ExternalHistoryRequestMapper.CommonParams;
import org.nzbhydra.externalapi.v1.ExternalApiError;
import org.nzbhydra.externalapi.v1.ExternalBackupEntry;
import org.nzbhydra.externalapi.v1.ExternalBackupListResponse;
import org.nzbhydra.externalapi.v1.ExternalDownloadHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalNotificationHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalPage;
import org.nzbhydra.externalapi.v1.ExternalPingResponse;
import org.nzbhydra.externalapi.v1.ExternalSearchHistoryEntry;
import org.nzbhydra.externalapi.v1.ExternalStatsResponse;
import org.nzbhydra.externalapi.v1.ExternalStatsSection;
import org.nzbhydra.historystats.History;
import org.nzbhydra.historystats.Stats;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.logging.LogContentProvider;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationMessageType;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.searching.db.SearchEntity;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.File;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * The external API v1. Everything under {@code /externalapi} is guarded by {@link ExternalApiKeyFilter}, which
 * authenticates the configured API key and answers everything else with an empty 404, so a request that reaches a
 * method here has already been authenticated as an admin.
 *
 * <p>None of the methods takes or returns an internal type: the contract classes live in
 * {@code org.nzbhydra.externalapi.v1} in the mapping module and the mappers translate explicitly.
 */
@RestController
@RequestMapping("/externalapi/v1")
@Secured({"ROLE_ADMIN"})
@Tag(name = "External API v1", description = "Statistics, history, the current log file and backups")
@SecurityRequirement(name = ExternalApiConfiguration.SECURITY_SCHEME_NAME)
public class ExternalApiV1Controller {

    private static final Logger logger = LoggerFactory.getLogger(ExternalApiV1Controller.class);

    private static final String INSTANT_DESCRIPTION = "An ISO-8601 instant, e.g. 2026-09-09T12:00:00Z";
    private static final int DEFAULT_STATS_RANGE_DAYS = 30;

    private final Stats stats;
    private final History history;
    private final LogContentProvider logContentProvider;
    private final BackupAndRestore backupAndRestore;
    private final ExternalStatsMapper statsMapper;
    private final ExternalHistoryMapper historyMapper;
    private final ExternalHistoryRequestMapper historyRequestMapper;
    private final ExternalBackupMapper backupMapper;
    private final String version;

    public ExternalApiV1Controller(Stats stats, History history, LogContentProvider logContentProvider,
                                   BackupAndRestore backupAndRestore, ExternalStatsMapper statsMapper,
                                   ExternalHistoryMapper historyMapper,
                                   ExternalHistoryRequestMapper historyRequestMapper,
                                   ExternalBackupMapper backupMapper,
                                   @Value("${build.version:0.0.1}") String version) {
        this.stats = stats;
        this.history = history;
        this.logContentProvider = logContentProvider;
        this.backupAndRestore = backupAndRestore;
        this.statsMapper = statsMapper;
        this.historyMapper = historyMapper;
        this.historyRequestMapper = historyRequestMapper;
        this.backupMapper = backupMapper;
        this.version = version;
    }

    @Operation(operationId = "externalPing", summary = "Verify the API key and the reachability of the instance")
    @ApiResponse(responseCode = "200", description = "The key was accepted")
    @GetMapping(value = "/ping", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalPingResponse ping() {
        return new ExternalPingResponse(version, Instant.now());
    }

    @Operation(operationId = "externalStats", summary = "Aggregated statistics for a time range",
            description = "Every section that was not requested is null in the response.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The statistics were calculated"),
            @ApiResponse(responseCode = "400", description = "A parameter was invalid",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class))),
            @ApiResponse(responseCode = "503", description = "The calculation took too long and was aborted",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class)))})
    @GetMapping(value = "/stats", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalStatsResponse stats(
            @Parameter(description = "Start of the time range. " + INSTANT_DESCRIPTION + ". Defaults to 30 days ago.",
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String after,
            @Parameter(description = "End of the time range. " + INSTANT_DESCRIPTION + ". Defaults to now.",
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String before,
            @Parameter(description = "Whether disabled indexers are included")
            @RequestParam(required = false, defaultValue = "false") boolean includeDisabled,
            @Parameter(description = "Limits the calculation to the named sections. Repeat for more than one. "
                    + "All sections are calculated when the parameter is absent.")
            @RequestParam(required = false) List<ExternalStatsSection> section) throws InterruptedException {
        Instant resolvedAfter = parseInstant(after, "after", Instant.now().minus(DEFAULT_STATS_RANGE_DAYS, ChronoUnit.DAYS));
        Instant resolvedBefore = parseInstant(before, "before", Instant.now());
        if (!resolvedBefore.isAfter(resolvedAfter)) {
            throw new IllegalArgumentException("before must be after after");
        }
        Set<ExternalStatsSection> sections = section == null || section.isEmpty()
                ? EnumSet.allOf(ExternalStatsSection.class)
                : EnumSet.copyOf(section);
        return statsMapper.toExternalStatsResponse(
                stats.getAllStats(statsMapper.toStatsRequest(resolvedAfter, resolvedBefore, includeDisabled, sections)),
                includeDisabled);
    }

    @Operation(operationId = "externalSearchHistory", summary = "Search history, newest first unless order=asc")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The page was read"),
            @ApiResponse(responseCode = "400", description = "A parameter was invalid",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class)))})
    @GetMapping(value = "/history/searches", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalPage<ExternalSearchHistoryEntry> searchHistory(
            @Parameter(description = "The page to return, 1 based") @RequestParam(required = false) Integer page,
            @Parameter(description = "How many entries a page holds, at most 500") @RequestParam(required = false) Integer limit,
            @Parameter(description = "Only entries at or after this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String from,
            @Parameter(description = "Only entries at or before this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String to,
            @Parameter(description = "asc or desc, by entry time", schema = @Schema(allowableValues = {"asc", "desc"}))
            @RequestParam(required = false) String order,
            @Parameter(description = "Case-insensitive substring of the search query") @RequestParam(required = false) String query,
            @Parameter(description = "Case-insensitive substring of the user name") @RequestParam(required = false) String username,
            @Parameter(description = "Case-insensitive substring of the IP") @RequestParam(required = false) String ip,
            @Parameter(description = "Case-insensitive substring of the user agent") @RequestParam(required = false) String userAgent) {
        CommonParams common = historyRequestMapper.commonParams(page, limit, from, to, order);
        HistoryRequest request = historyRequestMapper.forSearches(common, query, username, ip, userAgent);
        return historyMapper.toPage(history.getHistory(request, History.SEARCH_TABLE, SearchEntity.class),
                common.page(), common.limit(), historyMapper::toSearchEntry);
    }

    @Operation(operationId = "externalDownloadHistory", summary = "Download history, newest first unless order=asc")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The page was read"),
            @ApiResponse(responseCode = "400", description = "A parameter was invalid",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class)))})
    @GetMapping(value = "/history/downloads", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalPage<ExternalDownloadHistoryEntry> downloadHistory(
            @Parameter(description = "The page to return, 1 based") @RequestParam(required = false) Integer page,
            @Parameter(description = "How many entries a page holds, at most 500") @RequestParam(required = false) Integer limit,
            @Parameter(description = "Only entries at or after this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String from,
            @Parameter(description = "Only entries at or before this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String to,
            @Parameter(description = "asc or desc, by entry time", schema = @Schema(allowableValues = {"asc", "desc"}))
            @RequestParam(required = false) String order,
            @Parameter(description = "Case-insensitive substring of the result title") @RequestParam(required = false) String title,
            @Parameter(description = "The exact name of the indexer") @RequestParam(required = false) String indexer,
            @Parameter(description = "The state the download ended in") @RequestParam(required = false) FileDownloadStatus status,
            @Parameter(description = "Case-insensitive substring of the user name") @RequestParam(required = false) String username,
            @Parameter(description = "Case-insensitive substring of the IP") @RequestParam(required = false) String ip,
            @Parameter(description = "Case-insensitive substring of the user agent") @RequestParam(required = false) String userAgent) {
        CommonParams common = historyRequestMapper.commonParams(page, limit, from, to, order);
        HistoryRequest request = historyRequestMapper.forDownloads(common, title, indexer,
                status == null ? null : status.name(), username, ip, userAgent);
        return historyMapper.toPage(history.getHistory(request, History.DOWNLOAD_TABLE, FileDownloadEntity.class),
                common.page(), common.limit(), historyMapper::toDownloadEntry);
    }

    @Operation(operationId = "externalNotificationHistory", summary = "Notification history, newest first unless order=asc")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The page was read"),
            @ApiResponse(responseCode = "400", description = "A parameter was invalid",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class)))})
    @GetMapping(value = "/history/notifications", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalPage<ExternalNotificationHistoryEntry> notificationHistory(
            @Parameter(description = "The page to return, 1 based") @RequestParam(required = false) Integer page,
            @Parameter(description = "How many entries a page holds, at most 500") @RequestParam(required = false) Integer limit,
            @Parameter(description = "Only entries at or after this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String from,
            @Parameter(description = "Only entries at or before this time. " + INSTANT_DESCRIPTION,
                    schema = @Schema(type = "string", format = "date-time"))
            @RequestParam(required = false) String to,
            @Parameter(description = "asc or desc, by entry time", schema = @Schema(allowableValues = {"asc", "desc"}))
            @RequestParam(required = false) String order,
            @Parameter(description = "What happened") @RequestParam(required = false) NotificationEventType eventType,
            @Parameter(description = "How the notification was shown") @RequestParam(required = false) NotificationMessageType messageType) {
        CommonParams common = historyRequestMapper.commonParams(page, limit, from, to, order);
        HistoryRequest request = historyRequestMapper.forNotifications(common,
                eventType == null ? null : eventType.name(), messageType == null ? null : messageType.name());
        return historyMapper.toPage(history.getHistory(request, History.NOTIFICATION_TABLE, NotificationEntity.class),
                common.page(), common.limit(), historyMapper::toNotificationEntry);
    }

    @Operation(operationId = "externalCurrentLogFile", summary = "The current log file, whole content",
            description = "Not anonymised: the log may contain API keys, user names and IPs.")
    @ApiResponse(responseCode = "200", description = "The log file was read")
    @GetMapping(value = "/log/current", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<FileSystemResource> currentLogFile() {
        File logfile = logContentProvider.getCurrentLogfile(false);
        if (logfile == null || !logfile.exists()) {
            throw new IllegalStateException("Unable to determine the current log file");
        }
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_PLAIN, java.nio.charset.StandardCharsets.UTF_8))
                .contentLength(logfile.length())
                .body(new FileSystemResource(logfile));
    }

    @Operation(operationId = "externalCreateBackup", summary = "Create a backup now")
    @ApiResponse(responseCode = "201", description = "The backup was created")
    @PostMapping(value = "/backups", produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ExternalBackupEntry> createBackup() throws Exception {
        File backupFile = backupAndRestore.backup(true);
        logger.info("Created backup {} for the external API", backupFile.getName());
        BackupEntry created = backupAndRestore.getExistingBackups().stream()
                .filter(entry -> entry.getFilename().equals(backupFile.getName()))
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("The created backup " + backupFile.getName() + " is not in the backup folder"));
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(backupMapper.toExternalBackupEntry(created, backupAndRestore.getBackupFolder()));
    }

    @Operation(operationId = "externalListBackups", summary = "List the existing backups, newest first")
    @ApiResponse(responseCode = "200", description = "The backup folder was read")
    @GetMapping(value = "/backups", produces = MediaType.APPLICATION_JSON_VALUE)
    public ExternalBackupListResponse listBackups() {
        File backupFolder = backupAndRestore.getBackupFolder();
        List<ExternalBackupEntry> entries = new ArrayList<>();
        for (BackupEntry entry : backupAndRestore.getExistingBackups()) {
            entries.add(backupMapper.toExternalBackupEntry(entry, backupFolder));
        }
        return new ExternalBackupListResponse(entries);
    }

    @Operation(operationId = "externalDownloadBackup", summary = "Download one backup")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "The backup file"),
            @ApiResponse(responseCode = "404", description = "No such backup",
                    content = @Content(mediaType = MediaType.APPLICATION_JSON_VALUE,
                            schema = @Schema(implementation = ExternalApiError.class)))})
    @GetMapping(value = "/backups/{filename}", produces = "application/zip")
    public ResponseEntity<FileSystemResource> downloadBackup(
            @Parameter(description = "The file name as returned by GET /externalapi/v1/backups")
            @PathVariable String filename) {
        //Validated against the listing, never against the file system, so no name can escape the backup folder
        BackupEntry entry = backupAndRestore.getExistingBackups().stream()
                .filter(existing -> existing.getFilename().equals(filename))
                .findFirst()
                .orElseThrow(() -> new ExternalBackupNotFoundException("No backup named " + filename));
        File file = new File(backupAndRestore.getBackupFolder(), entry.getFilename());
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + entry.getFilename() + "\"")
                .contentType(MediaType.parseMediaType("application/zip"))
                .contentLength(file.length())
                .body(new FileSystemResource(file));
    }

    private Instant parseInstant(String value, String parameterName, Instant defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return historyRequestMapper.parseInstant(value, parameterName);
    }

}
