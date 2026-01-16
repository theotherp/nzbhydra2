

package org.nzbhydra.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.HashMap;
import java.util.Map;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class UpdateNotificationEvent implements NotificationEvent {

    private static final String VERSION = "version";
    private String version;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.UPDATE_INSTALLED;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(VERSION, version);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new UpdateNotificationEvent("v1.2.3");
    }


}
