package org.nzbhydra.downloading.downloaders;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.GenericResponse;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.downloading.FileDownloadStatus;
import org.nzbhydra.downloading.exceptions.DownloaderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The error throttle and offline fallback shared by all downloaders.
 */
class DownloaderStatusErrorHandlingTest {

    private static final String LOGGER_NAME = "test-downloader-status-errors";

    private TestDownloader testee;
    private ListAppender<ILoggingEvent> logAppender;
    private ch.qos.logback.classic.Logger logbackLogger;
    private Logger downloaderLogger;

    @BeforeEach
    void setUp() {
        testee = new TestDownloader();
        logAppender = new ListAppender<>();
        logAppender.start();
        logbackLogger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(LOGGER_NAME);
        logbackLogger.addAppender(logAppender);
        downloaderLogger = LoggerFactory.getLogger(LOGGER_NAME);
    }

    @AfterEach
    void tearDown() {
        logbackLogger.detachAppender(logAppender);
        logAppender.stop();
    }

    @Test
    void shouldReturnOfflineStatusAndRecordAZeroDownloadRate() {
        DownloaderStatus status = testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));

        assertThat(status.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
        assertThat(testee.getDownloadRates()).containsExactly(0L);
    }

    @Test
    void shouldLogOnlyTheFirstErrorWithinTheThrottleWindow() {
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));

        assertThat(errorMessages()).containsExactly("Error contacting downloader");
        assertThat(testee.getDownloadRates()).containsExactly(0L, 0L, 0L);
    }

    @Test
    void shouldLogAgainAfterASuccessfulStatusRequestResetTheThrottle() {
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));
        testee.resetStatusErrorThrottle();
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));

        assertThat(errorMessages()).containsExactly("Error contacting downloader", "Error contacting downloader");
    }

    @Test
    void shouldLogAgainAfterTheThrottleWindowHasExpired() {
        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));
        ReflectionTestUtils.setField(testee, "lastStatusErrorLogged", Instant.now().minus(11, ChronoUnit.MINUTES));

        testee.handleStatusRequestError(downloaderLogger, "Error contacting downloader", new DownloaderException("offline"));

        assertThat(errorMessages()).containsExactly("Error contacting downloader", "Error contacting downloader");
    }

    @Test
    void shouldUseTheLoggerAndMessageOfTheCallingDownloader() {
        Logger otherLogger = LoggerFactory.getLogger(LOGGER_NAME);

        testee.handleStatusRequestError(otherLogger, "Error contacting NZBGet", new DownloaderException("offline"));

        assertThat(errorMessages()).containsExactly("Error contacting NZBGet");
        assertThat(logAppender.list.get(0).getLoggerName()).isEqualTo(LOGGER_NAME);
    }

    private List<String> errorMessages() {
        return logAppender.list.stream()
                .filter(x -> x.getLevel() == Level.ERROR)
                .map(ILoggingEvent::getMessage)
                .toList();
    }

    private static class TestDownloader extends Downloader {

        TestDownloader() {
            super(null, null, null, null, null, null);
        }

        @Override
        public GenericResponse checkConnection() {
            return null;
        }

        @Override
        public List<String> getCategories() {
            return Collections.emptyList();
        }

        @Override
        public String addLink(String link, String title, DownloadType downloadType, String category) {
            return null;
        }

        @Override
        public String addContent(byte[] content, String title, DownloadType downloadType, String category) {
            return null;
        }

        @Override
        public DownloaderStatus getStatus() {
            return null;
        }

        @Override
        public List<DownloaderEntry> getHistory(Instant earliestDownload) {
            return Collections.emptyList();
        }

        @Override
        public List<DownloaderEntry> getQueue(Instant earliestDownload) {
            return Collections.emptyList();
        }

        @Override
        protected FileDownloadStatus getDownloadStatusFromDownloaderEntry(DownloaderEntry entry, StatusCheckType statusCheckType) {
            return null;
        }
    }

}
