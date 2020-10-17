package org.nzbhydra.config;

import joptsimple.internal.Strings;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;


@SuppressWarnings("unchecked")
@ConfigurationProperties
@Data
public class NotificationConfig extends ValidatingConfig<NotificationConfig> {

    private String appriseApiUrl;
    private boolean displayNotifications;
    private int displayNotificationsMax;
    private List<NotificationConfigEntry> entries = new ArrayList<>();

    public NotificationConfig() {
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig, NotificationConfig newConfig, BaseConfig newBaseConfig) {
        final List<String> errors = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();
        if (newBaseConfig.getNotificationConfig().getEntries().stream()
                .anyMatch(x -> Strings.isNullOrEmpty(x.getAppriseUrls()))) {
            errors.add("Make sure all notification entries contain a URL");
        }

        final boolean appriseUrlSet = !Strings.isNullOrEmpty(newBaseConfig.getNotificationConfig().getAppriseApiUrl());
        final boolean anyEntries = newBaseConfig.getNotificationConfig().getEntries().isEmpty();

        if (anyEntries && !appriseUrlSet) {
            warnings.add("No notifications will be sent unless the Apprise API URL is configured.");
        }

        return new ConfigValidationResult(true, false, errors, warnings);
    }

    @Override
    public NotificationConfig prepareForSaving(BaseConfig oldBaseConfig) {
        return this;
    }

    @Override
    public NotificationConfig updateAfterLoading() {
        return this;
    }

    @Override
    public NotificationConfig initializeNewConfig() {
        return this;
    }

}
