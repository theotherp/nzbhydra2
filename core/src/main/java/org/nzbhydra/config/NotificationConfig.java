package org.nzbhydra.config;

import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;


@SuppressWarnings("unchecked")
@ConfigurationProperties(prefix = "notificationConfig")
@Data
public class NotificationConfig {

    public enum AppriseType {
        NONE,
        API,
        CLI
    }

    private AppriseType appriseType = AppriseType.NONE;
    @SensitiveData
    private String appriseApiUrl;
    @SensitiveData
    private String appriseCliPath;
    private boolean displayNotifications;
    private int displayNotificationsMax;
    private List<NotificationConfigEntry> entries = new ArrayList<>();
    private List<String> filterOuts = new ArrayList<>();

    public NotificationConfig() {
    }


}
