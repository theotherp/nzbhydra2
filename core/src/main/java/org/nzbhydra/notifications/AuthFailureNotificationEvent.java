

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
public class AuthFailureNotificationEvent implements NotificationEvent {

    private static final String IP = "ip";
    private static final String USERNAME = "username";
    private String ip;
    private String username;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.AUTH_FAILURE;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(IP, ip);
        variablesWithContent.put(USERNAME, username);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new AuthFailureNotificationEvent("Some IP", "Some username");
    }


}
