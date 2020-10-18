package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.notifications.NotificationEventType;


@SuppressWarnings("unchecked")
@Data
@NoArgsConstructor
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
