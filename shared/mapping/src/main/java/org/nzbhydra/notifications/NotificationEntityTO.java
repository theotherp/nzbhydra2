

package org.nzbhydra.notifications;

import lombok.Data;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;

@Data
@ReflectionMarker
public class NotificationEntityTO {

    protected int id;

    private NotificationEventType notificationEventType;

    private NotificationMessageType messageType;

    private String title;
    private String body;
    private String urls;

    private Instant time;
    private boolean displayed;
}
