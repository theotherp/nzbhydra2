

package org.nzbhydra.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class IndexerReenabledNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String DISABLED_AT = "disabledAt";
    private String indexerName;
    private Instant disabledAt;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.INDEXER_REENABLED;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(DISABLED_AT, disabledAt == null ? "Unknown" : disabledAt.toString());
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new IndexerReenabledNotificationEvent("Some indexer", Instant.now());
    }


}
