

package org.nzbhydra;

import com.fasterxml.jackson.core.type.TypeReference;
import org.junit.jupiter.api.Test;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.NotificationConfig;
import org.nzbhydra.config.NotificationConfigEntry;
import org.nzbhydra.config.indexer.CapsCheckRequest;
import org.nzbhydra.config.notification.NotificationEventType;
import org.nzbhydra.historystats.SortModel;
import org.nzbhydra.historystats.stats.HistoryRequest;
import org.nzbhydra.hydraconfigure.ConfigManager;
import org.nzbhydra.notifications.NotificationEntityTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;

import java.util.Collections;

@SpringBootTest
@ContextConfiguration(classes = {TestConfig.class})
public class NotificationsTest {

    @Autowired
    private HydraClient hydraClient;

    @Autowired
    private ConfigManager configManager;

    @Test
    public void shouldTestNotificationAndStoreInHistory() throws Exception {
        CapsCheckRequest capsCheckRequest = new CapsCheckRequest();

        final BaseConfig baseConfig = configManager.getCurrentConfig();
        final NotificationConfig notificationConfig = baseConfig.getNotificationConfig();
        notificationConfig.setDisplayNotifications(true);
        final NotificationConfigEntry configEntry = new NotificationConfigEntry();
        configEntry.setEventType(NotificationEventType.VIP_RENEWAL_REQUIRED);
        configEntry.setBodyTemplate("a message: $indexerName$");
        configEntry.setTitleTemplate("a title: $expirationDate$");
        configEntry.setMessageType(NotificationConfigEntry.MessageType.INFO);
        notificationConfig.setEntries(Collections.singletonList(configEntry));
        configManager.setConfig(baseConfig);

        hydraClient.get("/internalapi/notifications/test/" + NotificationEventType.VIP_RENEWAL_REQUIRED.name());
        HistoryRequest request = new HistoryRequest();
        request.setSortModel(new SortModel("time", 0));
        HydraPage<NotificationEntityTO> page = hydraClient.post("/internalapi/history/notifications", request).as(new TypeReference<>() {
        });
        org.assertj.core.api.Assertions.assertThat(page.getContent()).isNotEmpty();
        org.assertj.core.api.Assertions.assertThat(page.getContent().get(0).getMessageType().name()).isEqualTo(configEntry.getMessageType().name());
        org.assertj.core.api.Assertions.assertThat(page.getContent().get(0).getTitle()).isEqualTo("a title: 2030-03-03");
        org.assertj.core.api.Assertions.assertThat(page.getContent().get(0).getBody()).isEqualTo("a message: Some Indexer");
    }


}
