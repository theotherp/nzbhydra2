

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
public class DownloadCompletionNotificationEvent implements NotificationEvent {

    private static final String DOWNLOAD_RESULT = "downloadResult";
    private static final String TITLE = "title";
    private String title;
    private String downloadResult;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.RESULT_DOWNLOAD_COMPLETION;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(DOWNLOAD_RESULT, downloadResult);
        variablesWithContent.put(TITLE, title);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new DownloadCompletionNotificationEvent("Some result", "Download successful");
    }


}
