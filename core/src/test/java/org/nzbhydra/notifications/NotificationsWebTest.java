package org.nzbhydra.notifications;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.notification.NotificationEventType;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.messaging.support.GenericMessage;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.ScheduledFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NotificationsWebTest {

    private static final String TOPIC = "/topic/notifications";

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;
    @Mock
    private NotificationRepository notificationRepository;
    @Mock
    private SimpMessageSendingOperations messagingTemplate;

    @InjectMocks
    private NotificationsWeb testee;

    private ScheduledExecutorService replacedScheduler;

    @AfterEach
    void shutDownReplacedScheduler() {
        if (replacedScheduler != null) {
            replacedScheduler.shutdownNow();
        }
    }

    /**
     * Swaps the real scheduler created by the field initializer for a mock and remembers the original so its
     * thread is shut down after the test.
     */
    private void replaceScheduler(ScheduledExecutorService scheduler) {
        replacedScheduler = (ScheduledExecutorService) ReflectionTestUtils.getField(testee, "scheduler");
        ReflectionTestUtils.setField(testee, "scheduler", scheduler);
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

    @Test
    void shouldScheduleOnlyOnePusherWhenTwoSubscribesOverlap() throws Exception {
        // Given a scheduler that is still inside the very first scheduleAtFixedRate call when the second subscribe arrives
        final AtomicInteger scheduleCalls = new AtomicInteger();
        final CountDownLatch insideFirstSchedule = new CountDownLatch(1);
        final ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
            .thenAnswer(invocation -> {
                scheduleCalls.incrementAndGet();
                insideFirstSchedule.countDown();
                //Hold the (would-be) lock long enough for a competing subscribe to run its check
                Thread.sleep(300);
                return mock(ScheduledFuture.class);
            });
        replaceScheduler(scheduler);

        // When two clients subscribe, the second one while the first is still starting the pusher
        final ExecutorService executor = Executors.newFixedThreadPool(2);
        try {
            final Future<?> first = executor.submit(() -> testee.onClientSubscribe(subscribeEvent("session-1")));
            assertThat(insideFirstSchedule.await(5, TimeUnit.SECONDS)).isTrue();
            final Future<?> second = executor.submit(() -> testee.onClientSubscribe(subscribeEvent("session-2")));
            second.get(5, TimeUnit.SECONDS);
            first.get(5, TimeUnit.SECONDS);
        } finally {
            executor.shutdownNow();
        }

        // Then exactly one pusher was scheduled - a second one would never be cancellable and push duplicates forever
        assertThat(scheduleCalls.get())
            .withFailMessage("Expected exactly one scheduled notification pusher but %d were started", scheduleCalls.get())
            .isEqualTo(1);
        verify(scheduler, times(1)).scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class));
    }

    @Test
    void shouldCancelPusherWhenLastSubscriberDisconnects() {
        // Given two subscribed clients and a pusher running for them
        final ScheduledFuture<?> scheduledFuture = mock(ScheduledFuture.class);
        final ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
            .thenAnswer(invocation -> scheduledFuture);
        replaceScheduler(scheduler);
        testee.onClientSubscribe(subscribeEvent("session-1"));
        testee.onClientSubscribe(subscribeEvent("session-2"));

        // When the first of them disconnects
        testee.onClientDisconnect(disconnectEvent("session-1"));

        // Then the pusher keeps running for the remaining client
        verify(scheduledFuture, never()).cancel(true);

        // When the last one disconnects too
        testee.onClientDisconnect(disconnectEvent("session-2"));

        // Then the pusher is cancelled
        verify(scheduledFuture, times(1)).cancel(true);

        // And a new subscribe starts a fresh pusher instead of leaving the topic silent
        testee.onClientSubscribe(subscribeEvent("session-3"));
        verify(scheduler, times(2)).scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class));
    }

    @Test
    void shouldKeepSendingNotificationsAfterAnErrorOnOneTick() {
        // Given a repository that fails once and then returns a notification
        final NotificationEntity entity = new NotificationEntity();
        when(notificationRepository.findAllByDisplayedFalseOrderByTimeDesc())
            .thenThrow(new RuntimeException("Some error while retrieving the notifications"))
            .thenReturn(List.of(entity));

        // When the pusher body runs twice
        testee.sendUnreadNotificationsCatchingErrors();
        testee.sendUnreadNotificationsCatchingErrors();

        // Then the exception did not escape (which would cancel all further executions) and the second tick still sent
        verify(messagingTemplate, times(1)).convertAndSend(eq(TOPIC), any(Object.class));
    }

    private static NotificationEntity notification(int id) {
        final NotificationEntity entity = new NotificationEntity();
        entity.setId(id);
        return entity;
    }

    @Test
    void shouldSendAllUnreadNotificationsOnEveryCheckAndNothingWhenNoneAreUnread() {
        // Given unread notifications that change between checks: one appears, stays unread, a second one appears,
        // then the first one is marked read, then the second one too
        when(notificationRepository.findAllByDisplayedFalseOrderByTimeDesc())
            .thenReturn(List.of(notification(1)))
            .thenReturn(List.of(notification(1)))
            .thenReturn(List.of(notification(2), notification(1)))
            .thenReturn(List.of(notification(2)))
            .thenReturn(List.of());

        // When the pusher body runs for each of these states
        for (int i = 0; i < 5; i++) {
            testee.sendUnreadNotificationsCatchingErrors();
        }

        // Then every check that found unread notifications sent all of them, and no empty list was sent
        final ArgumentCaptor<Object> sentCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, times(4)).convertAndSend(eq(TOPIC), sentCaptor.capture());
        assertThat(sentCaptor.getAllValues()).containsExactly(
            List.of(notification(1)),
            List.of(notification(1)),
            List.of(notification(2), notification(1)),
            List.of(notification(2)));
    }

    @Test
    void shouldSendAgainOnTheNextCheckWhenTheSendForANewSubscriberWasMissed() {
        // Given an unread notification
        when(notificationRepository.findAllByDisplayedFalseOrderByTimeDesc()).thenReturn(List.of(notification(1)));

        // When the send for a new subscriber runs (and the tab misses it because the broker had not registered its
        // subscription yet, so the notification stays unread)
        testee.sendUnreadNotificationsCatchingErrors();
        verify(messagingTemplate, times(1)).convertAndSend(TOPIC, List.of(notification(1)));

        // Then the next regular check sends it again, so the tab still gets it
        testee.sendUnreadNotificationsCatchingErrors();
        verify(messagingTemplate, times(2)).convertAndSend(TOPIC, List.of(notification(1)));
    }

    @Test
    void shouldNotSendAnEmptyListToANewSubscriber() {
        when(notificationRepository.findAllByDisplayedFalseOrderByTimeDesc()).thenReturn(List.of());

        testee.sendUnreadNotificationsCatchingErrors();

        verify(messagingTemplate, never()).convertAndSend(eq(TOPIC), any(Object.class));
    }

    @Test
    void shouldRetrySendingANotificationWhoseSendFailed() {
        // Given a send that fails once
        when(notificationRepository.findAllByDisplayedFalseOrderByTimeDesc()).thenReturn(List.of(notification(1)));
        doThrow(new RuntimeException("Some error while sending"))
            .doNothing()
            .when(messagingTemplate).convertAndSend(eq(TOPIC), any(Object.class));

        // When the pusher body runs twice
        testee.sendUnreadNotificationsCatchingErrors();
        testee.sendUnreadNotificationsCatchingErrors();

        // Then the notification is not lost
        verify(messagingTemplate, times(2)).convertAndSend(TOPIC, List.of(notification(1)));
    }

    @Test
    void shouldScheduleASendForEveryNewSubscriberAndCheckAtTheInterval() {
        final ScheduledExecutorService scheduler = mock(ScheduledExecutorService.class);
        when(scheduler.scheduleAtFixedRate(any(Runnable.class), anyLong(), anyLong(), any(TimeUnit.class)))
            .thenAnswer(invocation -> mock(ScheduledFuture.class));
        replaceScheduler(scheduler);

        testee.onClientSubscribe(subscribeEvent("session-1"));
        testee.onClientSubscribe(subscribeEvent("session-2"));

        verify(scheduler, times(1)).scheduleAtFixedRate(any(Runnable.class), eq(NotificationsWeb.INTERVAL_MILLIS), eq(NotificationsWeb.INTERVAL_MILLIS), eq(TimeUnit.MILLISECONDS));
        verify(scheduler, times(2)).schedule(any(Runnable.class), eq(NotificationsWeb.SUBSCRIBE_SEND_DELAY_MILLIS), eq(TimeUnit.MILLISECONDS));
    }

    @Test
    void shouldIgnoreASubscribeAfterShutdown() {
        // Given a shut down controller
        testee.onShutdown();

        // When a tab subscribes, then no RejectedExecutionException escapes the listener
        testee.onClientSubscribe(subscribeEvent("session-1"));

        // And nothing is sent
        verify(notificationRepository, never()).findAllByDisplayedFalseOrderByTimeDesc();
    }

    @Test
    void shouldDropThePendingSendForANewSubscriberOnShutdown() throws Exception {
        // Given a subscribe whose delayed send has not run yet
        testee.onClientSubscribe(subscribeEvent("session-1"));

        // When the controller shuts down before the send is due
        testee.onShutdown();

        // Then the scheduler terminates without running the send, which would hit a closing database
        final ScheduledExecutorService scheduler = (ScheduledExecutorService) ReflectionTestUtils.getField(testee, "scheduler");
        assertThat(scheduler.awaitTermination(500, TimeUnit.MILLISECONDS)).isTrue();
        verify(notificationRepository, never()).findAllByDisplayedFalseOrderByTimeDesc();
    }

    @Test
    void everyNotificationEventTypeShouldResolveToExactlyOneRegisteredEvent() {
        // Given the full set of event types the config tab can offer
        for (final NotificationEventType eventType : NotificationEventType.values()) {
            // When counting how many registered NotificationEvents claim that type
            final long matches = NotificationsWeb.NOTIFICATION_EVENTS.stream()
                .filter(event -> event.getEventType() == eventType)
                .count();

            // Then exactly one registration must claim it - never zero, never more than one
            assertThat(matches)
                .withFailMessage("Expected exactly one registered NotificationEvent for %s but found %d", eventType, matches)
                .isEqualTo(1);
        }
    }

    @Test
    void shouldSendTestNotificationForExternalToolConfiguration() {
        // Given the event type for external tool configuration results
        // When requesting a test notification for it
        testee.testNotification(NotificationEventType.EXTERNAL_TOOL_CONFIGURATION.name());

        // Then the published event is the ExternalToolConfigResultEvent's test instance, and no exception escapes
        final ArgumentCaptor<NotificationEvent> captor = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue()).isInstanceOf(ExternalToolConfigResultEvent.class);
        assertThat(captor.getValue().getEventType()).isEqualTo(NotificationEventType.EXTERNAL_TOOL_CONFIGURATION);
    }

    @Test
    void shouldSendTestNotificationForExistingRegisteredEvent() {
        // Given an event type that was already registered before this task
        // When requesting a test notification for it
        testee.testNotification(NotificationEventType.INDEXER_DISABLED.name());

        // Then the published event still matches the requested type, unchanged from prior behavior
        final ArgumentCaptor<NotificationEvent> captor = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(applicationEventPublisher).publishEvent(captor.capture());
        assertThat(captor.getValue().getEventType()).isEqualTo(NotificationEventType.INDEXER_DISABLED);
    }

    @Test
    void shouldFailForUnknownEventTypeString() {
        // Given a string that is not a valid NotificationEventType
        // When requesting a test notification for it
        // Then it fails as before (IllegalArgumentException from the enum valueOf lookup)
        assertThatThrownBy(() -> testee.testNotification("NOT_A_REAL_EVENT_TYPE"))
            .isInstanceOf(IllegalArgumentException.class);
    }

}
