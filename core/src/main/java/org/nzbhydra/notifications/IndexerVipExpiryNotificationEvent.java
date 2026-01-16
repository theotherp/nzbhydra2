

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
public class IndexerVipExpiryNotificationEvent implements NotificationEvent {

    private static final String INDEXER_NAME = "indexerName";
    private static final String EXPIRATION_DATE = "expirationDate";
    private String indexerName;
    private String expirationDate;

    @Override
    public NotificationEventType getEventType() {
        return NotificationEventType.VIP_RENEWAL_REQUIRED;
    }

    @Override
    public Map<String, String> getVariablesWithContent() {
        Map<String, String> variablesWithContent = new HashMap<>();
        variablesWithContent.put(INDEXER_NAME, indexerName);
        variablesWithContent.put(EXPIRATION_DATE, expirationDate);
        return variablesWithContent;
    }

    @Override
    public NotificationEvent getTestInstance() {
        return new IndexerVipExpiryNotificationEvent("Some Indexer", "2030-03-03");
    }


}
