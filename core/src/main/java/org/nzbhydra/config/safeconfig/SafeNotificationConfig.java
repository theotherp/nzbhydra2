package org.nzbhydra.config.safeconfig;

import lombok.Getter;
import org.nzbhydra.config.NotificationConfig;


@Getter
public class SafeNotificationConfig {

    private final boolean displayNotifications;
    private final int displayNotificationsMax;

    public SafeNotificationConfig(NotificationConfig notificationConfig) {
        displayNotifications = notificationConfig.isDisplayNotifications();
        displayNotificationsMax = notificationConfig.getDisplayNotificationsMax();
    }

}
