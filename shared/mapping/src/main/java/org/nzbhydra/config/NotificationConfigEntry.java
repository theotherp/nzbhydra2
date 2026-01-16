

package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.springnative.ReflectionMarker;


@SuppressWarnings("unchecked")
@Data
@ReflectionMarker
@NoArgsConstructor
@AllArgsConstructor
public class NotificationConfigEntry {

    public enum MessageType {
        INFO,
        SUCCESS,
        WARNING,
        FAILURE
    }

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private NotificationEventType eventType;
    @SensitiveData
    private String appriseUrls;
    private String titleTemplate;
    private String bodyTemplate;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private MessageType messageType;

}
