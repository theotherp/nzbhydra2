

package org.nzbhydra.notifications;

import org.nzbhydra.config.notification.NotificationEventType;

import java.util.Map;

public interface NotificationEvent {

    NotificationEventType getEventType();

    Map<String, String> getVariablesWithContent();

    NotificationEvent getTestInstance();

}
