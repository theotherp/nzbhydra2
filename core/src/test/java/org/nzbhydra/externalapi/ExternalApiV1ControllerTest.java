package org.nzbhydra.externalapi;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.nzbhydra.backup.BackupAndRestore;
import org.nzbhydra.backup.BackupEntry;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.config.searching.SearchType;
import org.nzbhydra.downloading.FileDownloadEntity;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.historystats.History;
import org.nzbhydra.historystats.Stats;
import org.nzbhydra.historystats.StatsResponse;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.historystats.stats.IndexerApiAccessStatsEntry;
import org.nzbhydra.historystats.stats.StatsRequest;
import org.nzbhydra.logging.LogContentProvider;
import org.nzbhydra.notifications.NotificationEntity;
import org.nzbhydra.notifications.NotificationMessageType;
import org.nzbhydra.searching.db.SearchEntity;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Every route of the external API against mocked collaborators: the happy path, the shape of the answer, and every
 * way a request can be rejected. The API key is not part of this - {@link ExternalApiKeyFilter} owns that and is
 * tested on its own.
 */
class ExternalApiV1ControllerTest {

    private static final Instant TIME = Instant.parse("2026-09-09T12:00:00Z");

    private final Stats stats = mock(Stats.class);
    private final History history = mock(History.class);
    private final LogContentProvider logContentProvider = mock(LogContentProvider.class);
    private final BackupAndRestore backupAndRestore = mock(BackupAndRestore.class);

    private MockMvc mockMvc;

    @TempDir
    File folder;

    @BeforeEach
    void setUp() {
        ExternalApiV1Controller controller = new ExternalApiV1Controller(stats, history, logContentProvider,
                backupAndRestore, new ExternalStatsMapper(), new ExternalHistoryMapper(),
                new ExternalHistoryRequestMapper(), new ExternalBackupMapper(), "9.0.0");
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ExternalApiExceptionHandler())
                .build();
    }

    @Test
    void shouldAnswerPingWithTheVersionAndTheServerTime() throws Exception {
        mockMvc.perform(get("/externalapi/v1/ping"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.version").value("9.0.0"))
                .andExpect(jsonPath("$.serverTime").isString());
    }

    @Test
    void shouldCalculateEverySectionWhenNoneIsNamed() throws Exception {
        when(stats.getAllStats(any())).thenReturn(statsResponse());

        mockMvc.perform(get("/externalapi/v1/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.after").value("2026-08-09T00:00:00Z"))
                .andExpect(jsonPath("$.before").value("2026-09-09T00:00:00Z"))
                .andExpect(jsonPath("$.includeDisabled").value(false))
                .andExpect(jsonPath("$.indexerApiAccessStats[0].indexerName").value("anIndexer"));

        ArgumentCaptor<StatsRequest> captor = ArgumentCaptor.forClass(StatsRequest.class);
        verify(stats).getAllStats(captor.capture());
        assertThat(captor.getValue().isIndexerApiAccessStats()).isTrue();
        assertThat(captor.getValue().isUserAgentDownloadShares()).isTrue();
    }

    @Test
    void shouldLimitTheCalculationToTheNamedSections() throws Exception {
        when(stats.getAllStats(any())).thenReturn(statsResponse());

        mockMvc.perform(get("/externalapi/v1/stats")
                        .param("section", "INDEXER_API_ACCESS")
                        .param("includeDisabled", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.includeDisabled").value(true))
                .andExpect(jsonPath("$.indexerScores").doesNotExist());

        ArgumentCaptor<StatsRequest> captor = ArgumentCaptor.forClass(StatsRequest.class);
        verify(stats).getAllStats(captor.capture());
        assertThat(captor.getValue().isIndexerApiAccessStats()).isTrue();
        assertThat(captor.getValue().isAvgIndexerUniquenessScore()).isFalse();
        assertThat(captor.getValue().isIncludeDisabled()).isTrue();
    }

    @Test
    void shouldRejectAnUnknownSection() throws Exception {
        mockMvc.perform(get("/externalapi/v1/stats").param("section", "NO_SUCH_SECTION"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"))
                .andExpect(jsonPath("$.message").isString())
                .andExpect(jsonPath("$.timestamp").isString());
    }

    @Test
    void shouldRejectAStatsRangeThatDoesNotMoveForward() throws Exception {
        mockMvc.perform(get("/externalapi/v1/stats")
                        .param("after", "2026-09-09T00:00:00Z")
                        .param("before", "2026-09-09T00:00:00Z"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldRejectAStatsBoundThatIsNotAnInstant() throws Exception {
        mockMvc.perform(get("/externalapi/v1/stats").param("after", "yesterday"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldAnswerWithServiceUnavailableWhenTheStatsCalculationWasAborted() throws Exception {
        when(stats.getAllStats(any())).thenThrow(new InterruptedException("aborted"));

        mockMvc.perform(get("/externalapi/v1/stats"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.status").value(503))
                .andExpect(jsonPath("$.code").value("STATS_TIMEOUT"));
    }

    @Test
    void shouldReturnTheSearchHistoryAsAPage() throws Exception {
        SearchEntity entity = new SearchEntity();
        ReflectionTestUtils.setField(entity, "id", 12);
        entity.setTime(TIME);
        entity.setQuery("some query");
        entity.setSource(SearchSource.API);
        entity.setSearchType(SearchType.SEARCH);
        when(history.getHistory(any(), eq(History.SEARCH_TABLE), eq(SearchEntity.class)))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 1), 3));

        mockMvc.perform(get("/externalapi/v1/history/searches").param("query", "some").param("limit", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(1))
                .andExpect(jsonPath("$.limit").value(1))
                .andExpect(jsonPath("$.totalElements").value(3))
                .andExpect(jsonPath("$.totalPages").value(3))
                .andExpect(jsonPath("$.entries[0].id").value(12))
                .andExpect(jsonPath("$.entries[0].time").value("2026-09-09T12:00:00Z"))
                .andExpect(jsonPath("$.entries[0].query").value("some query"))
                .andExpect(jsonPath("$.entries[0].source").value("API"));

        ArgumentCaptor<HistoryRequest> captor = ArgumentCaptor.forClass(HistoryRequest.class);
        verify(history).getHistory(captor.capture(), eq(History.SEARCH_TABLE), eq(SearchEntity.class));
        assertThat(captor.getValue().getFilterModel()).containsOnlyKeys("query");
    }

    @Test
    void shouldReturnTheDownloadHistoryAsAPage() throws Exception {
        FileDownloadEntity entity = new FileDownloadEntity();
        ReflectionTestUtils.setField(entity, "id", 34);
        entity.setTime(TIME);
        entity.setStatus(FileDownloadStatus.NZB_ADDED);
        when(history.getHistory(any(), eq(History.DOWNLOAD_TABLE), eq(FileDownloadEntity.class)))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 100), 1));

        mockMvc.perform(get("/externalapi/v1/history/downloads")
                        .param("status", "NZB_ADDED")
                        .param("indexer", "anIndexer"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].id").value(34))
                .andExpect(jsonPath("$.entries[0].status").value("NZB_ADDED"));

        ArgumentCaptor<HistoryRequest> captor = ArgumentCaptor.forClass(HistoryRequest.class);
        verify(history).getHistory(captor.capture(), eq(History.DOWNLOAD_TABLE), eq(FileDownloadEntity.class));
        assertThat(captor.getValue().getFilterModel()).containsOnlyKeys("status", "name");
    }

    @Test
    void shouldReturnTheNotificationHistoryAsAPage() throws Exception {
        NotificationEntity entity = new NotificationEntity(NotificationEventType.RESULT_DOWNLOAD,
                NotificationMessageType.INFO, "the title", "the body", "mailto://one", TIME);
        when(history.getHistory(any(), eq(History.NOTIFICATION_TABLE), eq(NotificationEntity.class)))
                .thenReturn(new PageImpl<>(List.of(entity), PageRequest.of(0, 100), 1));

        mockMvc.perform(get("/externalapi/v1/history/notifications").param("eventType", "RESULT_DOWNLOAD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entries[0].eventType").value("RESULT_DOWNLOAD"))
                .andExpect(jsonPath("$.entries[0].messageType").value("INFO"))
                .andExpect(jsonPath("$.entries[0].urls[0]").value("mailto://one"));
    }

    @Test
    void shouldRejectALimitAboveTheMaximum() throws Exception {
        mockMvc.perform(get("/externalapi/v1/history/searches").param("limit", "501"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldRejectAHistoryBoundThatIsNotAnInstant() throws Exception {
        mockMvc.perform(get("/externalapi/v1/history/searches").param("from", "yesterday"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldRejectAnUnknownDownloadStatus() throws Exception {
        mockMvc.perform(get("/externalapi/v1/history/downloads").param("status", "NO_SUCH_STATUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldRejectAnUnknownNotificationEventType() throws Exception {
        mockMvc.perform(get("/externalapi/v1/history/notifications").param("eventType", "NO_SUCH_EVENT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_PARAMETER"));
    }

    @Test
    void shouldReturnTheCurrentLogFileAsPlainText() throws Exception {
        File logfile = new File(folder, "nzbhydra.log");
        Files.write(logfile.toPath(), "a log line\n".getBytes(StandardCharsets.UTF_8));
        when(logContentProvider.getCurrentLogfile(false)).thenReturn(logfile);

        mockMvc.perform(get("/externalapi/v1/log/current"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(header().longValue("Content-Length", logfile.length()))
                .andExpect(content().string("a log line\n"));
    }

    @Test
    void shouldCreateABackupAndAnswerWithItsEntry() throws Exception {
        File backupFile = backupFile("nzbhydra-2026-09-09.zip");
        when(backupAndRestore.backup(true)).thenReturn(backupFile);
        when(backupAndRestore.getBackupFolder()).thenReturn(folder);
        when(backupAndRestore.getExistingBackups()).thenReturn(List.of(new BackupEntry(backupFile.getName(), TIME)));

        mockMvc.perform(post("/externalapi/v1/backups"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.filename").value("nzbhydra-2026-09-09.zip"))
                .andExpect(jsonPath("$.createdAt").value("2026-09-09T12:00:00Z"))
                .andExpect(jsonPath("$.sizeBytes").value(backupFile.length()));

        verify(backupAndRestore).backup(true);
    }

    @Test
    void shouldListTheExistingBackups() throws Exception {
        File backupFile = backupFile("nzbhydra-2026-09-09.zip");
        when(backupAndRestore.getBackupFolder()).thenReturn(folder);
        when(backupAndRestore.getExistingBackups()).thenReturn(List.of(new BackupEntry(backupFile.getName(), TIME)));

        mockMvc.perform(get("/externalapi/v1/backups"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.backups[0].filename").value("nzbhydra-2026-09-09.zip"))
                .andExpect(jsonPath("$.backups[0].sizeBytes").value(backupFile.length()));
    }

    @Test
    void shouldDownloadABackupAsAnAttachment() throws Exception {
        File backupFile = backupFile("nzbhydra-2026-09-09.zip");
        when(backupAndRestore.getBackupFolder()).thenReturn(folder);
        when(backupAndRestore.getExistingBackups()).thenReturn(List.of(new BackupEntry(backupFile.getName(), TIME)));

        mockMvc.perform(get("/externalapi/v1/backups/nzbhydra-2026-09-09.zip"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"nzbhydra-2026-09-09.zip\""))
                .andExpect(header().string("Content-Type", "application/zip"))
                .andExpect(header().longValue("Content-Length", backupFile.length()));
    }

    /**
     * The name is checked against the listing rather than against the file system, so a name that is not a backup -
     * a traversal attempt among them - never reaches a file.
     */
    @Test
    void shouldAnswerWithNotFoundForABackupThatIsNotInTheList() throws Exception {
        when(backupAndRestore.getExistingBackups()).thenReturn(List.of());

        mockMvc.perform(get("/externalapi/v1/backups/does-not-exist.zip"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    /**
     * The 500 body must not quote the exception: an external caller has no business learning file names, SQL or stack
     * frames from a failure. The detail belongs in the log.
     */
    @Test
    void shouldAnswerWithAnInternalErrorBodyForAnythingUnexpected() throws Exception {
        when(backupAndRestore.getExistingBackups()).thenThrow(new RuntimeException("the backup folder is on fire"));

        mockMvc.perform(get("/externalapi/v1/backups"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value(ExternalApiExceptionHandler.INTERNAL_ERROR_MESSAGE))
                .andExpect(jsonPath("$.message").value(not(containsString("backup folder is on fire"))));
    }

    /**
     * Spring Security's own exception translation owns these. Turning one into a 500 with a body would both answer
     * with the wrong status and tell the caller that something exists behind the check, so the advice hands it back
     * to the filter chain untouched - which in a standalone setup means it comes out of {@code perform}.
     */
    @Test
    void shouldRethrowSecurityExceptionsInsteadOfAnsweringWithAnErrorBody() throws Exception {
        AccessDeniedException denied = new AccessDeniedException("nope");
        when(backupAndRestore.getExistingBackups()).thenThrow(denied);

        assertThatThrownBy(() -> mockMvc.perform(get("/externalapi/v1/backups")))
                .hasRootCauseInstanceOf(AccessDeniedException.class);
    }

    private File backupFile(String name) throws Exception {
        File file = new File(folder, name);
        Files.write(file.toPath(), "PK-and-more".getBytes(StandardCharsets.UTF_8));
        return file;
    }

    private StatsResponse statsResponse() {
        StatsResponse response = new StatsResponse();
        response.setAfter(Instant.parse("2026-08-09T00:00:00Z"));
        response.setBefore(Instant.parse("2026-09-09T00:00:00Z"));
        IndexerApiAccessStatsEntry entry = new IndexerApiAccessStatsEntry();
        entry.setIndexerName("anIndexer");
        response.setIndexerApiAccessStats(List.of(entry));
        return response;
    }
}
