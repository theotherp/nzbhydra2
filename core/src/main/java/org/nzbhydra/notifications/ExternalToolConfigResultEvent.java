

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
public class ExternalToolConfigResultEvent implements NotificationEvent {

    private static final String BODY = "body";
    private String body;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.EXTERNAL_TOOL_CONFIGURATION;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(BODY, body);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new ExternalToolConfigResultEvent("Successfully synced to 1 external tool(s)");
    }


}
