

package org.nzbhydra.notifications;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.indexer.IndexerConfig;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.springnative.ReflectionMarker;

import java.util.HashMap;
import java.util.Map;

@Data
@ReflectionMarker
@AllArgsConstructor
@NoArgsConstructor
public class IndexerDisabledNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String STATE = "state";
    private static final String MESSAGE = "message";
    private String indexerName;
    private IndexerConfig.State state;
    private String message;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.INDEXER_DISABLED;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(STATE, state.humanize());
        variablesWithContent.put(MESSAGE, message);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new IndexerDisabledNotificationEvent("Some indexer", IndexerConfig.State.DISABLED_SYSTEM_TEMPORARY, "Some message");
    }


}
