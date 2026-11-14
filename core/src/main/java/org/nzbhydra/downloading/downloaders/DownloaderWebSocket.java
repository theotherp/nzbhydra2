

package org.nzbhydra.downloading.downloaders;

import jakarta.annotation.PreDestroy;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.ConfigChangedEvent;
import org.nzbhydra.config.ConfigProvider;
import org.nzbhydra.downloading.FileDownloadEvent;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;

@Controller
public class DownloaderWebSocket {
    private static final Logger logger = LoggerFactory.getLogger(DownloaderWebSocket.class);
    /**
     * Poll interval while the downloader is downloading and for a while after a download was started or the config
     * changed.
     */
    static final long FAST_INTERVAL_MILLIS = 1000;
    /**
     * Poll interval while the downloader is idle, paused or not configured.
     */
    static final long IDLE_INTERVAL_MILLIS = 5000;
    /**
     * Poll interval while the downloader cannot be reached.
     */
    static final long FAILED_INTERVAL_MILLIS = 15000;
    /**
     * How long the status is polled at the fast interval after a download was started, so the footer shows the new
     * download without waiting for the idle interval.
     */
    static final Duration FAST_POLL_AFTER_DOWNLOAD = Duration.ofSeconds(30);
    private static final String TOPIC = "/topic/downloaderStatus";

    @Autowired
    private ConfigProvider configProvider;

    @Autowired
    private DownloaderStatusRetrieval downloaderStatusRetrieval;

    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    // The next scheduled poll, null while not polling. Guarded by schedulerLock.
    private ScheduledFuture<?> scheduledFuture;
    // Incremented whenever polling is started or stopped, so a poll that is already running when that happens does
    // not schedule another one. Guarded by schedulerLock.
    private long scheduleGeneration;
    // Guarded by schedulerLock.
    private Instant fastPollUntil = Instant.MIN;
    // Guarded by schedulerLock.
    private boolean pollSoonRequested;

    private Clock clock = Clock.systemUTC();

    private volatile DownloaderStatus lastSentStatus;

    // Use thread-safe set since subscribe/disconnect events can come from different threads
    private final Set<String> connectedSessionIds = ConcurrentHashMap.newKeySet();

    // Lock for synchronizing scheduler operations
    private final Object schedulerLock = new Object();


    @MessageMapping("/connectDownloaderStatus")
    @SendTo(TOPIC)
    public DownloaderStatus connect() {
        return lastSentStatus;
    }

    /**
     * Returns the delay until the next poll: the fast interval while downloading or while a fast poll was requested, a
     * longer one while the downloader is offline and the idle interval otherwise.
     */
    static long nextPollDelayMillis(DownloaderStatus.State polledState, boolean fastPollRequested) {
        if (polledState == DownloaderStatus.State.OFFLINE) {
            return FAILED_INTERVAL_MILLIS;
        }
        if (polledState == DownloaderStatus.State.DOWNLOADING || fastPollRequested) {
            return FAST_INTERVAL_MILLIS;
        }
        return IDLE_INTERVAL_MILLIS;
    }

    /**
     * Schedules the next poll after the given delay, replacing a pending one. Does nothing after shutdown. Must be
     * called while holding schedulerLock.
     */
    private void startPolling(long delayMillis) {
        if (scheduler.isShutdown()) {
            // Scheduling would throw a RejectedExecutionException out of the calling event listener
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Not polling downloader status during shutdown");
            return;
        }
        if (scheduledFuture != null) {
            scheduledFuture.cancel(false);
        }
        pollSoonRequested = false;
        final long generation = ++scheduleGeneration;
        scheduledFuture = scheduler.schedule(() -> pollAndReschedule(generation), delayMillis, TimeUnit.MILLISECONDS);
    }

    /**
     * Must be called while holding schedulerLock.
     */
    private void stopPolling() {
        scheduleGeneration++;
        if (scheduledFuture != null) {
            scheduledFuture.cancel(true);
            scheduledFuture = null;
        }
    }

    /**
     * Makes the next poll happen within the fast interval. A poll that is running right now picks up the request when
     * it schedules the next one. Must be called while holding schedulerLock and only while polling.
     */
    private void pollSoon() {
        if (scheduledFuture.getDelay(TimeUnit.MILLISECONDS) > FAST_INTERVAL_MILLIS) {
            startPolling(FAST_INTERVAL_MILLIS);
        } else {
            pollSoonRequested = true;
        }
    }

    /**
     * Polls and sends the status and schedules the next poll. The next poll is scheduled even if this one throws an
     * {@link Error}, because nothing else would restart the polling.
     */
    void pollAndReschedule(long generation) {
        synchronized (schedulerLock) {
            if (generation != scheduleGeneration) {
                return;
            }
        }
        long delay = FAILED_INTERVAL_MILLIS;
        try {
            delay = pollAndSendCatchingErrors();
        } finally {
            scheduleNextPoll(generation, delay);
        }
    }

    private void scheduleNextPoll(long generation, long delayMillis) {
        synchronized (schedulerLock) {
            // Polling was stopped or restarted while this poll was running
            if (generation != scheduleGeneration || scheduler.isShutdown()) {
                return;
            }
            // A fast poll may have been requested after the delay was determined
            final long delay = pollSoonRequested ? Math.min(delayMillis, FAST_INTERVAL_MILLIS) : delayMillis;
            pollSoonRequested = false;
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Polling downloader status again in {}ms", delay);
            scheduledFuture = scheduler.schedule(() -> pollAndReschedule(generation), delay, TimeUnit.MILLISECONDS);
        }
    }

    private boolean consumeFastPollRequest() {
        synchronized (schedulerLock) {
            final boolean fastPollRequested = pollSoonRequested || clock.instant().isBefore(fastPollUntil);
            pollSoonRequested = false;
            return fastPollRequested;
        }
    }

    /**
     * Retrieves and sends the status. Any exception escaping a poll would make the status display wait for the
     * failed interval, so all exceptions are caught and logged here.
     *
     * @return the delay until the next poll
     */
    long pollAndSendCatchingErrors() {
        final DownloaderStatus newStatus;
        try {
            newStatus = downloaderStatusRetrieval.getStatus();
        } catch (Exception e) {
            logger.error("Error while retrieving the downloader status", e);
            return nextPollDelayMillis(DownloaderStatus.State.OFFLINE, consumeFastPollRequest());
        }
        // Determined before sending because the status sent tells the frontend whether another one follows soon
        final long delay = nextPollDelayMillis(newStatus.getState(), consumeFastPollRequest());
        try {
            sendStatusUpdate(newStatus, delay > FAST_INTERVAL_MILLIS);
        } catch (Exception e) {
            logger.error("Error while sending the downloader status", e);
        }
        return delay;
    }

    /**
     * Sends the status if it is needed by the frontend.
     * <p>
     * The footer adds one point to its rate graph per status received. While it receives statuses flagged
     * {@code lastUpdateForNow} it also adds a point with the last rate every second by itself, so the graph keeps moving
     * at about one point per second between statuses. A status of an idle or paused downloader is therefore flagged
     * when the next poll is further away than the fast interval. Without that, the graph of a finished download would
     * only move every {@link #IDLE_INTERVAL_MILLIS}. Downloading statuses are never flagged, they follow every
     * second. Offline statuses are never flagged either: they carry no rate history, so the footer would fill the
     * graph with the placeholder rate of such a status; it ignores offline statuses otherwise.
     * <p>
     * SABnzbd, NZBGet and Torbox add a rate sample to their history on every poll and the history is part of the
     * status, so their consecutive statuses practically always differ and every poll sends one. Only a status with the
     * same data as the last sent one is skipped, once the frontend was told that no further update follows soon.
     *
     * @param noUpdateSoon true if the next poll is further away than the fast interval
     */
    private void sendStatusUpdate(DownloaderStatus newStatus, boolean noUpdateSoon) {
        final DownloaderStatus.State state = newStatus.getState();
        if (state == DownloaderStatus.State.DOWNLOADING) {
            //Always send updates when downloading
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Sending new downloading status data. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted());
            send(newStatus);
            return;
        }
        final boolean mayFlag = state != DownloaderStatus.State.OFFLINE;
        newStatus.setLastUpdateForNow(mayFlag && noUpdateSoon);
        if (!hasSameDataAsLastSent(newStatus)) {
            //Send update because data has changed
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Sending new status data because it's different from the last sent. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}. Last update for now: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted(), newStatus.isLastUpdateForNow());
            send(newStatus);
        } else if (mayFlag && !lastSentStatus.isLastUpdateForNow()) {
            //Same data as before and we haven't notified the frontend yet that we'll send no further data for now
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "New status data is the same as the old. Informing the frontend this is the last update for now. Status: {}. In queue: {}. Remaining time: {}. Download rate: {}", newStatus.getState(), newStatus.getElementsInQueue(), newStatus.getRemainingTimeFormatted(), newStatus.getDownloadRateFormatted());
            newStatus.setLastUpdateForNow(true);
            send(newStatus);
        }
    }

    /**
     * Compares the data, ignoring {@code lastUpdateForNow}. Comparing it too would make every unchanged status after a
     * flagged one look new, so it would be sent again unflagged and then flagged again, alternately.
     */
    private boolean hasSameDataAsLastSent(DownloaderStatus newStatus) {
        final DownloaderStatus lastSent = lastSentStatus;
        if (lastSent == null) {
            return false;
        }
        final boolean lastUpdateForNow = newStatus.isLastUpdateForNow();
        newStatus.setLastUpdateForNow(lastSent.isLastUpdateForNow());
        final boolean sameData = newStatus.equals(lastSent);
        newStatus.setLastUpdateForNow(lastUpdateForNow);
        return sameData;
    }

    private void send(DownloaderStatus status) {
        messagingTemplate.convertAndSend(TOPIC, status);
        lastSentStatus = status;
    }

    @EventListener
    public void onClientSubscribe(SessionSubscribeEvent event) {
        final String simpDestination = (String) event.getMessage().getHeaders().get("simpDestination");
        if (TOPIC.equals(simpDestination)) {
            final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
            logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Registered new connection with session ID {}", simpSessionId);

            synchronized (schedulerLock) {
                boolean wasEmpty = connectedSessionIds.isEmpty();
                connectedSessionIds.add(simpSessionId);
                if (wasEmpty && scheduledFuture == null) {
                    logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Scheduling downloader status update {}", simpSessionId);
                    startPolling(0);
                }
            }
        }
    }

    @EventListener
    public void onClientDisconnect(SessionDisconnectEvent event) {
        final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        synchronized (schedulerLock) {
            if (connectedSessionIds.remove(simpSessionId)) {
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Registered disconnect with session ID {}", simpSessionId);
                if (connectedSessionIds.isEmpty()) {
                    if (scheduledFuture != null) {
                        logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Cancelling update schedule because no connections left");
                        stopPolling();
                    } else {
                        logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "No connections found but update was also not scheduled");
                    }
                } else {
                    logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Not cancelling schedule because still connections left");
                }
            }
        }
    }


    @EventListener
    public void handleNewConfig(ConfigChangedEvent configChangedEvent) {
        synchronized (schedulerLock) {
            final boolean showDownloaderStatus = configChangedEvent.getNewConfig().getDownloading().isShowDownloaderStatus();
            if (scheduledFuture != null && !showDownloaderStatus) {
                stopPolling();
            } else if (scheduledFuture == null && showDownloaderStatus && !connectedSessionIds.isEmpty()) {
                startPolling(0);
            } else if (scheduledFuture != null) {
                // The downloader settings may have changed, so don't wait for the idle or failed interval
                pollSoon();
            }
        }
    }

    @EventListener
    public void onFileDownload(FileDownloadEvent fileDownloadEvent) {
        synchronized (schedulerLock) {
            fastPollUntil = clock.instant().plus(FAST_POLL_AFTER_DOWNLOAD);
            if (scheduledFuture != null) {
                logger.debug(LoggingMarkers.DOWNLOADER_STATUS_UPDATE, "Polling downloader status at the fast interval because a download was started");
                pollSoon();
            }
        }
    }

    @EventListener
    public void handleShutdown(ShutdownEvent shutdownEvent) {
        onShutdown();
    }

    @PreDestroy
    public void onShutdown() {
        synchronized (schedulerLock) {
            stopPolling();
            // Inside the lock, so an event listener either schedules before this or sees the scheduler shut down
            scheduler.shutdown();
        }
    }


}
