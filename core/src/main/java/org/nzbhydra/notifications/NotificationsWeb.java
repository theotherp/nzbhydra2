

package org.nzbhydra.notifications;

import com.google.common.collect.Sets;
import jakarta.annotation.PreDestroy;
import org.nzbhydra.ShutdownEvent;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.logging.LoggingMarkers;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.security.access.annotation.Secured;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.ScheduledThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

@RestController
public class NotificationsWeb {

    private static final Logger logger = LoggerFactory.getLogger(NotificationsWeb.class);
    /**
     * How often the unread notifications are checked while at least one tab is subscribed. A new notification reaches
     * an open tab within this time. Every open tab acknowledges each notification as soon as it receives it, so unread
     * notifications only remain when no tab received them, and these are sent again on every check.
     */
    static final long INTERVAL_MILLIS = 5000;
    /**
     * The delay before the unread notifications are sent for a new subscription. {@link SessionSubscribeEvent} is
     * published while the broker may not have registered the subscription yet (the inbound channel is asynchronous),
     * so sending right away could miss the new tab.
     */
    static final long SUBSCRIBE_SEND_DELAY_MILLIS = 1000;
    private static final String TOPIC = "/topic/notifications";
    static final Set<NotificationEvent> NOTIFICATION_EVENTS = Sets.newHashSet(
        new DownloadNotificationEvent(),
        new IndexerDisabledNotificationEvent(),
        new UpdateNotificationEvent(),
        new DownloadCompletionNotificationEvent(),
        new IndexerVipExpiryNotificationEvent(),
        new IndexerReenabledNotificationEvent(),
        new AuthFailureNotificationEvent(),
        new ExternalToolConfigResultEvent()
    );

    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private ApplicationEventPublisher applicationEventPublisher;
    @Autowired
    private SimpMessageSendingOperations messagingTemplate;

    private final ScheduledExecutorService scheduler = createScheduler();
    private ScheduledFuture<?> scheduledFuture;
    // The send for new subscribers that has not run yet. Guarded by schedulerLock.
    private ScheduledFuture<?> pendingSubscribeSend;

    // Use thread-safe set since subscribe/disconnect events can come from different threads
    private final Set<String> connectedSessionIds = ConcurrentHashMap.newKeySet();

    // Lock for synchronizing scheduler operations
    private final Object schedulerLock = new Object();

    /**
     * A single thread scheduler that drops the delayed sends for new subscribers on shutdown, so they cannot run
     * against a database that is being closed.
     */
    private static ScheduledExecutorService createScheduler() {
        final ScheduledThreadPoolExecutor executor = new ScheduledThreadPoolExecutor(1);
        executor.setExecuteExistingDelayedTasksAfterShutdownPolicy(false);
        executor.setContinueExistingPeriodicTasksAfterShutdownPolicy(false);
        return executor;
    }

    /**
     * Must be called while holding schedulerLock.
     */
    private void scheduleNotificationSending() {
        scheduledFuture = scheduler.scheduleAtFixedRate(this::sendUnreadNotificationsCatchingErrors, INTERVAL_MILLIS, INTERVAL_MILLIS, TimeUnit.MILLISECONDS);
    }

    /**
     * Sends the unread notifications once for a tab that just subscribed, so it does not wait for the next regular
     * check. Runs on the scheduler thread, so it never overlaps with a regular check. A send goes to all tabs, so
     * tabs subscribing while one is pending share it; a send per tab would show every unread notification once per
     * tab in each of them. Must be called while holding schedulerLock.
     */
    private void scheduleSendingForNewSubscriber() {
        if (pendingSubscribeSend != null && !pendingSubscribeSend.isDone()) {
            return;
        }
        pendingSubscribeSend = scheduler.schedule(this::sendUnreadNotificationsCatchingErrors, SUBSCRIBE_SEND_DELAY_MILLIS, TimeUnit.MILLISECONDS);
    }

    /**
     * Anything thrown out of a scheduled task cancels all its further executions, which would stop all notifications
     * until the last tab disconnects and a new one subscribes, so exceptions and errors are caught and logged here.
     */
    void sendUnreadNotificationsCatchingErrors() {
        try {
            sendUnreadNotifications();
        } catch (Exception | Error e) {
            logger.error("Error while retrieving or sending unread notifications", e);
        }
    }

    /**
     * Sends all unread notifications, if there are any. They are sent again on every check until a tab acknowledged
     * them, so a tab that missed a send (for example because its subscription was not registered yet when the send
     * for it ran) still gets them.
     */
    private void sendUnreadNotifications() {
        final List<NotificationEntity> unreadNotifications = notificationRepository.findAllByDisplayedFalseOrderByTimeDesc();
        if (unreadNotifications.isEmpty()) {
            return;
        }
        logger.debug(LoggingMarkers.NOTIFICATIONS, "Sending {} unread notifications", unreadNotifications.size());
        messagingTemplate.convertAndSend(TOPIC, unreadNotifications);
    }

    @MessageMapping("/markNotificationRead")
    public void markRead(int id) {
        final Optional<NotificationEntity> byId = notificationRepository.findById(id);
        if (byId.isEmpty()) {
            logger.error("Unable to mark notification with ID {} as read because no notification with that ID was found", id);
            return;
        }
        byId.get().setDisplayed(true);
        notificationRepository.save(byId.get());
    }


    @Secured({"ROLE_ADMIN"})
    @GetMapping("/internalapi/notifications/test/{eventType}")
    public void testNotification(@PathVariable("eventType") String eventType) {
        final NotificationEventType notificationEventType = NotificationEventType.valueOf(eventType);

        final Optional<? extends NotificationEvent> notificationEvent = NOTIFICATION_EVENTS
            .stream()
            .filter(x -> x != null && x.getEventType() == notificationEventType)
            .findFirst();
        if (notificationEvent.isEmpty()) {
            throw new RuntimeException("Unable to create test notification for event type " + eventType);
        }
        logger.info("Sending test notification for type {}", eventType);
        applicationEventPublisher.publishEvent(notificationEvent.get().getTestInstance());
    }

    @EventListener
    public void onClientSubscribe(SessionSubscribeEvent event) {
        final String simpDestination = (String) event.getMessage().getHeaders().get("simpDestination");
        if (TOPIC.equals(simpDestination)) {
            final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
            logger.debug(LoggingMarkers.NOTIFICATIONS, "Registered new connection with session ID {}", simpSessionId);

            synchronized (schedulerLock) {
                if (scheduler.isShutdown()) {
                    // Shutting down. Scheduling would throw a RejectedExecutionException out of this listener.
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "Ignoring subscription {} during shutdown", simpSessionId);
                    return;
                }
                boolean wasEmpty = connectedSessionIds.isEmpty();
                connectedSessionIds.add(simpSessionId);
                if (wasEmpty && scheduledFuture == null) {
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "Scheduling notification update {}", simpSessionId);
                    scheduleNotificationSending();
                }
                scheduleSendingForNewSubscriber();
            }
        }
    }


    @EventListener
    public void onClientDisconnect(SessionDisconnectEvent event) {
        final String simpSessionId = (String) event.getMessage().getHeaders().get("simpSessionId");
        synchronized (schedulerLock) {
            if (connectedSessionIds.remove(simpSessionId)) {
                logger.debug(LoggingMarkers.NOTIFICATIONS, "Registered disconnect with session ID {}", simpSessionId);
                if (connectedSessionIds.isEmpty()) {
                    if (scheduledFuture != null) {
                        logger.debug(LoggingMarkers.NOTIFICATIONS, "Cancelling update schedule because no connections left");
                        scheduledFuture.cancel(true);
                        scheduledFuture = null;
                    } else {
                        logger.debug(LoggingMarkers.NOTIFICATIONS, "No connections found but notifications update was also not scheduled");
                    }
                } else {
                    logger.debug(LoggingMarkers.NOTIFICATIONS, "Not cancelling schedule because still connections left");
                }
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
            if (scheduledFuture != null) {
                scheduledFuture.cancel(true);
                scheduledFuture = null;
            }
            // Inside the lock, so a subscribe either schedules before this or sees the scheduler shut down.
            // Pending sends for new subscribers are dropped, see createScheduler.
            scheduler.shutdown();
        }
    }


}
