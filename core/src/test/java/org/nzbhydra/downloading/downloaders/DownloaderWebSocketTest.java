package org.nzbhydra.downloading.downloaders;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.downloading.FileDownloadEvent;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@MockitoSettings(strictness = Strictness.LENIENT)
class DownloaderWebSocketTest {

    private static final String TOPIC = "/topic/downloaderStatus";
    private static final Instant NOW = Instant.parse("2026-11-14T12:00:00Z");

    @Mock
    private ConfigProvider configProvider;
    @Mock
    private DownloaderStatusRetrieval downloaderStatusRetrieval;
    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @InjectMocks
    private DownloaderWebSocket testee = new DownloaderWebSocket();

    private ScheduledExecutorService replacedScheduler;
    private ScheduledExecutorService scheduler;
    private ScheduledFuture<?> scheduledFuture;

    @BeforeEach
    void setUp() {
        replacedScheduler = (ScheduledExecutorService) ReflectionTestUtils.getField(testee, "scheduler");
        scheduler = mock(ScheduledExecutorService.class);
        scheduledFuture = mock(ScheduledFuture.class);
        when(scheduler.schedule(any(Runnable.class), anyLong(), any(TimeUnit.class))).thenAnswer(invocation -> scheduledFuture);
        ReflectionTestUtils.setField(testee, "scheduler", scheduler);
        setNow(NOW);
    }

    @AfterEach
    void shutDownReplacedScheduler() {
        replacedScheduler.shutdownNow();
    }

    private void setNow(Instant now) {
        ReflectionTestUtils.setField(testee, "clock", Clock.fixed(now, ZoneOffset.UTC));
    }

    private static DownloaderStatus status(DownloaderStatus.State state) {
        DownloaderStatus status = new DownloaderStatus();
        status.setState(state);
        status.setDownloaderType(DownloaderType.SABNZBD);
        return status;
    }

    private record Poll(DownloaderStatus.State state, long rateKb) {
    }

    /**
     * Makes the status retrieval behave like SABnzbd or NZBGet: every poll adds the current rate to the downloader's
     * rate history, which is part of every status, so consecutive statuses differ even if nothing else changed.
     */
    private void stubRealisticPolls(Poll... polls) {
        final List<Long> rateHistory = new ArrayList<>();
        final Iterator<Poll> pollIterator = List.of(polls).iterator();
        when(downloaderStatusRetrieval.getStatus()).thenAnswer(invocation -> {
            final Poll poll = pollIterator.next();
            rateHistory.add(poll.rateKb());
            final DownloaderStatus status = status(poll.state());
            status.setDownloadRateInKilobytes(poll.rateKb());
            status.setDownloadingRatesInKilobytes(List.copyOf(rateHistory));
            return status;
        });
    }

    private List<DownloaderStatus> sentStatuses() {
        final ArgumentCaptor<Object> sentCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, atLeastOnce()).convertAndSend(eq(TOPIC), sentCaptor.capture());
        return sentCaptor.getAllValues().stream().map(DownloaderStatus.class::cast).toList();
    }

    private List<Boolean> sentLastUpdateForNowFlags() {
        return sentStatuses().stream().map(DownloaderStatus::isLastUpdateForNow).toList();
    }

    private static SessionSubscribeEvent subscribeEvent(String sessionId) {
        final Map<String, Object> headers = new HashMap<>();
        headers.put("simpDestination", TOPIC);
        headers.put("simpSessionId", sessionId);
        final Message<byte[]> message = new GenericMessage<>(new byte[0], headers);
        return new SessionSubscribeEvent("source", message);
    }

    private static SessionDisconnectEvent disconnectEvent(String sessionId) {
        final Map<String, Object> headers = new HashMap<>();
        headers.put("simpSessionId", sessionId);
        final Message<byte[]> message = new GenericMessage<>(new byte[0], headers);
        return new SessionDisconnectEvent("source", message, sessionId, CloseStatus.NORMAL);
    }

    private static ConfigChangedEvent configChangedEvent(boolean showDownloaderStatus) {
        final BaseConfig newConfig = new BaseConfig();
        newConfig.getDownloading().setShowDownloaderStatus(showDownloaderStatus);
        return new ConfigChangedEvent("source", new BaseConfig(), newConfig);
    }

    /**
     * Runs the most recently scheduled poll and returns the delay with which it scheduled the next one.
     */
    private long runScheduledPollAndGetNextDelay() {
        final ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler, atLeastOnce()).schedule(runnableCaptor.capture(), anyLong(), any(TimeUnit.class));
        final int schedulesBefore = runnableCaptor.getAllValues().size();
        runnableCaptor.getValue().run();

        final ArgumentCaptor<Long> delayCaptor = ArgumentCaptor.forClass(Long.class);
        verify(scheduler, times(schedulesBefore + 1)).schedule(any(Runnable.class), delayCaptor.capture(), eq(TimeUnit.MILLISECONDS));
        return delayCaptor.getValue();
    }

    @Test
    void shouldKeepSendingUpdatesAfterAnErrorOnOneTick() {
        DownloaderStatus status = new DownloaderStatus();
        status.setState(DownloaderStatus.State.DOWNLOADING);
        when(downloaderStatusRetrieval.getStatus())
                .thenThrow(new RuntimeException("Some error while retrieving the status"))
                .thenReturn(status);

        testee.pollAndSendCatchingErrors();
        testee.pollAndSendCatchingErrors();

        verify(messagingTemplate, times(1)).convertAndSend(eq("/topic/downloaderStatus"), any(Object.class));
    }

    @Test
    void shouldPollFastOnlyWhileDownloadingOrWhenRequested() {
        assertThat(DownloaderWebSocket.nextPollDelayMillis(DownloaderStatus.State.DOWNLOADING, false))
            .isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.nextPollDelayMillis(DownloaderStatus.State.IDLE, false))
            .isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.nextPollDelayMillis(DownloaderStatus.State.PAUSED, false))
            .isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.nextPollDelayMillis(null, false))
            .isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.nextPollDelayMillis(DownloaderStatus.State.IDLE, true))
            .isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
    }

    @Test
    void shouldBackOffFurtherWhenTheDownloaderIsOffline() {
        assertThat(DownloaderWebSocket.nextPollDelayMillis(DownloaderStatus.State.OFFLINE, true))
            .isEqualTo(DownloaderWebSocket.FAILED_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.FAILED_INTERVAL_MILLIS).isGreaterThan(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(DownloaderWebSocket.IDLE_INTERVAL_MILLIS).isGreaterThan(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
    }

    @Test
    void shouldWaitTheFailedIntervalAndSendNothingWhenRetrievingTheStatusFails() {
        when(downloaderStatusRetrieval.getStatus()).thenThrow(new RuntimeException("Some error"));

        assertThat(testee.pollAndSendCatchingErrors()).isEqualTo(DownloaderWebSocket.FAILED_INTERVAL_MILLIS);
        verify(messagingTemplate, never()).convertAndSend(eq(TOPIC), any(Object.class));
    }

    @Test
    void shouldKeepPollingWhenAPollThrowsAnError() {
        when(downloaderStatusRetrieval.getStatus()).thenThrow(new Error("Some error"));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        final ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(runnableCaptor.capture(), eq(0L), eq(TimeUnit.MILLISECONDS));

        assertThatThrownBy(() -> runnableCaptor.getValue().run()).isInstanceOf(Error.class);

        // The next poll is scheduled anyway, otherwise nothing would restart the polling
        verify(scheduler).schedule(any(Runnable.class), eq(DownloaderWebSocket.FAILED_INTERVAL_MILLIS), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    void shouldPollImmediatelyOnFirstSubscribeAndThenRescheduleByState() {
        stubRealisticPolls(
            new Poll(DownloaderStatus.State.DOWNLOADING, 5000),
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.OFFLINE, 0));

        testee.onClientSubscribe(subscribeEvent("session-1"));
        testee.onClientSubscribe(subscribeEvent("session-2"));

        // Only one poll is started, without delay
        verify(scheduler, times(1)).schedule(any(Runnable.class), eq(0L), eq(TimeUnit.MILLISECONDS));
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
        // Right after downloading stopped the idle interval applies at once: the status sent tells the frontend to
        // move the graph by itself until the next one
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAILED_INTERVAL_MILLIS);
    }

    @Test
    void shouldTellTheFrontendWithEveryIdleStatusThatNoFurtherUpdateFollowsSoon() {
        // A download runs and ends, then the downloader stays idle
        stubRealisticPolls(
            new Poll(DownloaderStatus.State.DOWNLOADING, 5000),
            new Poll(DownloaderStatus.State.DOWNLOADING, 4000),
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.PAUSED, 0));
        testee.onClientSubscribe(subscribeEvent("session-1"));

        for (int i = 0; i < 5; i++) {
            runScheduledPollAndGetNextDelay();
        }

        // Every poll sends because the rate history changes, and every status followed by an idle interval is
        // flagged, so the footer moves its graph every second by itself instead of every idle interval
        assertThat(sentLastUpdateForNowFlags()).containsExactly(false, false, true, true, true);
        assertThat(testee.connect()).isSameAs(sentStatuses().get(4));
    }

    @Test
    void shouldNotFlagAnIdleStatusWhileAFastPollFollows() {
        // A download was just started, but the downloader has not started downloading it yet
        stubRealisticPolls(
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.IDLE, 0),
            new Poll(DownloaderStatus.State.DOWNLOADING, 3000));
        testee.onFileDownload(new FileDownloadEvent(null, null));
        testee.onClientSubscribe(subscribeEvent("session-1"));

        for (int i = 0; i < 3; i++) {
            assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
        }

        assertThat(sentLastUpdateForNowFlags()).containsExactly(false, false, false);
    }

    @Test
    void shouldFlagAnUnchangedStatusOnceWhileAFastPollFollows() {
        // A downloader without rate history whose status does not change
        when(downloaderStatusRetrieval.getStatus())
            .thenAnswer(invocation -> status(DownloaderStatus.State.IDLE));
        testee.onFileDownload(new FileDownloadEvent(null, null));
        testee.onClientSubscribe(subscribeEvent("session-1"));

        for (int i = 0; i < 3; i++) {
            runScheduledPollAndGetNextDelay();
        }

        assertThat(sentLastUpdateForNowFlags()).containsExactly(false, true);
    }

    @Test
    void shouldNotResendAnUnchangedFlaggedIdleStatus() {
        when(downloaderStatusRetrieval.getStatus())
            .thenAnswer(invocation -> status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));

        runScheduledPollAndGetNextDelay();
        runScheduledPollAndGetNextDelay();

        assertThat(sentLastUpdateForNowFlags()).containsExactly(true);
    }

    @Test
    void shouldNeverFlagOrResendAnUnchangedOfflineStatus() {
        // What DownloaderStatusRetrieval returns when the downloader cannot be reached: no type and no rate history,
        // so the footer ignores it except for the flag, which would make it fill the graph with a placeholder rate
        when(downloaderStatusRetrieval.getStatus())
            .thenAnswer(invocation -> DownloaderStatus.builder().state(DownloaderStatus.State.OFFLINE).build());
        testee.onClientSubscribe(subscribeEvent("session-1"));

        for (int i = 0; i < 3; i++) {
            assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAILED_INTERVAL_MILLIS);
        }

        assertThat(sentLastUpdateForNowFlags()).containsExactly(false);
    }

    @Test
    void shouldNotPollAfterShutdown() {
        testee.onShutdown();
        // The mocked scheduler does not know it was shut down
        when(scheduler.isShutdown()).thenReturn(true);

        // No RejectedExecutionException escapes the listeners
        testee.onClientSubscribe(subscribeEvent("session-1"));
        testee.handleNewConfig(configChangedEvent(true));
        testee.onFileDownload(new FileDownloadEvent(null, null));

        verify(scheduler, never()).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));
    }

    @Test
    void shouldPollFastForAWhileAfterADownloadWasStarted() {
        when(downloaderStatusRetrieval.getStatus()).thenReturn(status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
        when(scheduledFuture.getDelay(TimeUnit.MILLISECONDS)).thenReturn(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);

        testee.onFileDownload(new FileDownloadEvent(null, null));

        // The pending idle poll is replaced by a fast one
        verify(scheduledFuture).cancel(false);
        verify(scheduler).schedule(any(Runnable.class), eq(DownloaderWebSocket.FAST_INTERVAL_MILLIS), eq(TimeUnit.MILLISECONDS));
        // And the status is polled fast while the downloader has not started downloading yet
        setNow(NOW.plusSeconds(10));
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
        // But not forever
        setNow(NOW.plus(DownloaderWebSocket.FAST_POLL_AFTER_DOWNLOAD).plusSeconds(1));
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);
    }

    @Test
    void shouldPollFastAfterADownloadWasStartedWhileAPollIsRunning() {
        when(downloaderStatusRetrieval.getStatus()).thenReturn(status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        // The scheduled poll is due, i.e. running
        when(scheduledFuture.getDelay(TimeUnit.MILLISECONDS)).thenReturn(0L);

        testee.onFileDownload(new FileDownloadEvent(null, null));

        verify(scheduledFuture, never()).cancel(false);
        assertThat(runScheduledPollAndGetNextDelay()).isEqualTo(DownloaderWebSocket.FAST_INTERVAL_MILLIS);
    }

    @Test
    void shouldNotStartPollingForADownloadWithoutSubscribers() {
        testee.onFileDownload(new FileDownloadEvent(null, null));

        verify(scheduler, never()).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));
    }

    @Test
    void shouldNotRescheduleAPollThatWasRunningWhenTheLastSubscriberDisconnected() {
        when(downloaderStatusRetrieval.getStatus()).thenReturn(status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        final ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(runnableCaptor.capture(), eq(0L), eq(TimeUnit.MILLISECONDS));

        testee.onClientDisconnect(disconnectEvent("session-1"));
        runnableCaptor.getValue().run();

        verify(scheduledFuture).cancel(true);
        verify(scheduler, times(1)).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));

        // A new subscriber starts exactly one new poll
        testee.onClientSubscribe(subscribeEvent("session-2"));
        verify(scheduler, times(2)).schedule(any(Runnable.class), eq(0L), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    void shouldNotRescheduleAPollThatWasRunningWhenPollingWasRestarted() {
        when(downloaderStatusRetrieval.getStatus()).thenReturn(status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        final ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(runnableCaptor.capture(), eq(0L), eq(TimeUnit.MILLISECONDS));
        when(scheduledFuture.getDelay(TimeUnit.MILLISECONDS)).thenReturn(DownloaderWebSocket.IDLE_INTERVAL_MILLIS);

        // Polling is restarted (here by a started download) while the first poll is still to run
        testee.onFileDownload(new FileDownloadEvent(null, null));
        runnableCaptor.getValue().run();

        // The superseded poll neither retrieves the status nor schedules another poll
        verify(downloaderStatusRetrieval, never()).getStatus();
        verify(scheduler, times(2)).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));
    }

    @Test
    void shouldStopPollingWhenTheStatusIsDisabledAndPollSoonOnOtherConfigChanges() {
        testee.onClientSubscribe(subscribeEvent("session-1"));
        when(scheduledFuture.getDelay(TimeUnit.MILLISECONDS)).thenReturn(DownloaderWebSocket.FAILED_INTERVAL_MILLIS);

        testee.handleNewConfig(configChangedEvent(true));
        verify(scheduler).schedule(any(Runnable.class), eq(DownloaderWebSocket.FAST_INTERVAL_MILLIS), eq(TimeUnit.MILLISECONDS));

        testee.handleNewConfig(configChangedEvent(false));
        verify(scheduledFuture).cancel(true);

        testee.handleNewConfig(configChangedEvent(true));
        verify(scheduler, times(2)).schedule(any(Runnable.class), eq(0L), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    void shouldStopPollingOnShutdown() {
        when(downloaderStatusRetrieval.getStatus()).thenReturn(status(DownloaderStatus.State.IDLE));
        testee.onClientSubscribe(subscribeEvent("session-1"));
        final ArgumentCaptor<Runnable> runnableCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(scheduler).schedule(runnableCaptor.capture(), eq(0L), eq(TimeUnit.MILLISECONDS));

        testee.onShutdown();
        runnableCaptor.getValue().run();

        verify(scheduledFuture).cancel(true);
        verify(scheduler).shutdown();
        verify(scheduler, times(1)).schedule(any(Runnable.class), anyLong(), any(TimeUnit.class));
    }

}
