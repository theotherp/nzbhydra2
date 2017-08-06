package org.nzbhydra.config;

import joptsimple.internal.Strings;
import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Data
@ConfigurationProperties(prefix = "downloading")
public class DownloadingConfig extends ValidatingConfig {

    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private String saveTorrentsTo;

    @Override
    public ConfigValidationResult validateConfig(BaseConfig oldConfig) {
        List<String> errors = new ArrayList<>();
        if (!Strings.isNullOrEmpty(saveTorrentsTo)) {
            File file = new File(saveTorrentsTo); //TODO Make sure to use base path
            if (file.exists() && !file.isDirectory()) {
                errors.add("Torrent black hole folder " + file.getAbsolutePath() + " is a file");
            }
            if (!file.exists()) {
                boolean created = file.mkdir();
                if (!created) {
                    errors.add("Torrent black hole folder " + file.getAbsolutePath() + " could not be created");
                }
            }
        }
        List<ConfigValidationResult> validationResults = downloaders.stream().map(downloaderConfig -> downloaderConfig.validateConfig(oldConfig)).collect(Collectors.toList());
        List<String> downloaderErrors = validationResults.stream().map(ConfigValidationResult::getErrorMessages).flatMap(List::stream).collect(Collectors.toList());
        errors.addAll(downloaderErrors);

        List<String> warnings = new ArrayList<>();
        List<String> downloaderWarnings = validationResults.stream().map(ConfigValidationResult::getWarningMessages).flatMap(List::stream).collect(Collectors.toList());
        warnings.addAll(downloaderWarnings);

        return new ConfigValidationResult(errors.isEmpty(), false, errors, warnings);
    }

    public Optional<String> getSaveTorrentsTo() {
        return Optional.ofNullable(saveTorrentsTo);
    }
}
