package org.nzbhydra.notifications;

import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.SequenceGenerator;
import jakarta.persistence.Table;
import lombok.Data;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
@Entity
@Table(name = "notification")
public final class NotificationEntity {

    public enum MessageType {
        INFO,
        SUCCESS,
        WARNING,
        FAILURE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @SequenceGenerator(allocationSize = 1, name = "NOTIFICATION_SEQ")
    protected int id;

    @Enumerated(EnumType.STRING)
    private NotificationEventType notificationEventType;

    @Enumerated(EnumType.STRING)
    private MessageType messageType;

    private String title;
    private String body;
    private String urls;

    @Convert(converter = org.springframework.data.jpa.convert.threeten.Jsr310JpaConverters.InstantConverter.class)
    private Instant time;

    private boolean displayed;

    public NotificationEntity() {
    }

    public NotificationEntity(NotificationEventType notificationEventType, MessageType messageType, String title, String body, String urls, Instant time) {
        this.notificationEventType = notificationEventType;
        this.title = title;
        this.body = body;
        this.urls = urls;
        this.time = time;
        this.messageType = messageType;
    }
}
