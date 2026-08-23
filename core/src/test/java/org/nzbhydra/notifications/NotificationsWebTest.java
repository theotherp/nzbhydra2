package org.nzbhydra.notifications;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.nzbhydra.config.notification.NotificationEventType;
import org.springframework.context.ApplicationEventPublisher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class NotificationsWebTest {

    @Mock
    private ApplicationEventPublisher applicationEventPublisher;

    @InjectMocks
    private NotificationsWeb testee;

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
