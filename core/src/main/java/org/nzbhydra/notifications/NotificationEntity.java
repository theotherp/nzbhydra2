package org.nzbhydra.notifications;

import lombok.Data;

import javax.persistence.Convert;
import javax.persistence.Entity;
import javax.persistence.EnumType;
import javax.persistence.Enumerated;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
import java.time.Instant;

@Data
@Entity
@Table(name = "notification")
public class NotificationEntity {

    public enum MessageType {
        INFO,
        SUCCESS,
        WARNING,
        FAILURE
    }

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
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
