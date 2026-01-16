

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
public class DownloadNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String TITLE = "title";
    private static final String AGE = "age";
    private static final String SOURCE = "source";
    private String indexerName;
    private String title;
    private String age;
    private String source;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.RESULT_DOWNLOAD;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(TITLE, title);
        variablesWithContent.put(AGE, age);
        variablesWithContent.put(SOURCE, source);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new DownloadNotificationEvent("Some Indexer", "Some result", "100d", "NZB");
    }


}
