

package org.nzbhydra.config.validation;

import joptsimple.internal.Strings;
import org.nzbhydra.config.BaseConfig;
import org.nzbhydra.config.NotificationConfig;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
public class NotificationConfigValidator implements ConfigValidator<NotificationConfig> {
    @Override
    public boolean doesValidate(Class<?> clazz) {
        return clazz == NotificationConfig.class;
    }

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldBaseConfig, BaseConfig newBaseConfig, NotificationConfig newConfig) {
        final List<String> errors = new ArrayList<>();
        final List<String> warnings = new ArrayList<>();
        if (newConfig.getEntries().stream()
            .anyMatch(x -> Strings.isNullOrEmpty(x.getAppriseUrls()))) {
            errors.add("Make sure all notification entries contain a URL");
        }

        final boolean appriseUrlSet = !Strings.isNullOrEmpty(newConfig.getAppriseApiUrl());
        final boolean anyEntries = newConfig.getEntries().isEmpty();

        if (anyEntries && !appriseUrlSet) {
            warnings.add("No notifications will be sent unless the Apprise API URL is configured.");
        }

        return new ConfigValidationResult(true, false, errors, warnings);
    }
}
