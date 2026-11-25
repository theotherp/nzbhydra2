package org.nzbhydra.downloading.downloaders;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.ConfigProvider;
import org.slf4j.LoggerFactory;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DownloaderStatusRetrievalTest {

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloaderProvider downloaderProvider;
    @Mock
    private Downloader downloader;

    @InjectMocks
    private DownloaderStatusRetrieval testee;

    private ListAppender<ILoggingEvent> logAppender;
    private ch.qos.logback.classic.Logger logbackLogger;
    private Level levelBefore;

    @BeforeEach
    void setUp() {
        logAppender = new ListAppender<>();
        logAppender.start();
        logbackLogger = (ch.qos.logback.classic.Logger) LoggerFactory.getLogger(DownloaderStatusRetrieval.class);
        levelBefore = logbackLogger.getLevel();
        logbackLogger.setLevel(Level.DEBUG);
        logbackLogger.addAppender(logAppender);

        when(downloader.isEnabled()).thenReturn(true);
        when(downloaderProvider.getAllDownloaders()).thenReturn(List.of(downloader));
    }

    @AfterEach
    void tearDown() {
        logbackLogger.detachAppender(logAppender);
        logbackLogger.setLevel(levelBefore);
        logAppender.stop();
    }

    private List<Level> loggedLevels() {
        return logAppender.list.stream().map(ILoggingEvent::getLevel).toList();
    }

    @Test
    void shouldLogARepeatedErrorOnlyOnceAtErrorLevel() throws Exception {
        when(downloader.getStatus()).thenThrow(new RuntimeException("Some error"));

        final DownloaderStatus status = testee.getStatus();
        testee.getStatus();
        testee.getStatus();

        assertThat(status.getState()).isEqualTo(DownloaderStatus.State.OFFLINE);
        assertThat(loggedLevels()).containsExactly(Level.ERROR, Level.DEBUG, Level.DEBUG);
    }

    @Test
    void shouldLogADifferentErrorAtErrorLevelEvenWithoutASuccessInBetween() throws Exception {
        when(downloader.getStatus())
            .thenThrow(new RuntimeException("Connection refused"))
            .thenThrow(new IllegalStateException("Connection refused"))
            .thenThrow(new IllegalStateException("Unauthorized"))
            .thenThrow(new IllegalStateException("Unauthorized"));

        testee.getStatus();
        testee.getStatus();
        testee.getStatus();
        testee.getStatus();

        // Different class, then different message, then the same exception again
        assertThat(loggedLevels()).containsExactly(Level.ERROR, Level.ERROR, Level.ERROR, Level.DEBUG);
    }

    @Test
    void shouldLogTheSameErrorTwiceInARowOnlyOnceAtErrorLevel() throws Exception {
        when(downloader.getStatus())
            .thenThrow(new RuntimeException("Connection refused"))
            .thenThrow(new RuntimeException("Connection refused"));

        testee.getStatus();
        testee.getStatus();

        assertThat(loggedLevels()).containsExactly(Level.ERROR, Level.DEBUG);
    }

    @Test
    void shouldLogTheErrorAgainAfterASuccessfulCall() throws Exception {
        when(downloader.getStatus())
            .thenThrow(new RuntimeException("Some error"))
            .thenReturn(new DownloaderStatus())
            .thenThrow(new RuntimeException("Some error"));

        testee.getStatus();
        testee.getStatus();
        testee.getStatus();

        assertThat(loggedLevels()).containsExactly(Level.ERROR, Level.ERROR);
    }

    @Test
    void shouldUseTheDownloadersWebUiUrlAsLinkTarget() throws Exception {
        when(downloader.getStatus()).thenReturn(new DownloaderStatus());
        when(downloader.getWebUiUrl()).thenReturn("https://sab.example.com");

        assertThat(testee.getStatus().getUrl()).isEqualTo("https://sab.example.com");
    }

}
