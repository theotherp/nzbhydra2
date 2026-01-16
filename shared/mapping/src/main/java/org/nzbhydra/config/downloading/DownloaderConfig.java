

package org.nzbhydra.config.downloading;

import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.downloading.DownloaderType;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.Optional;

@Data
@ReflectionMarker
@Builder
@AllArgsConstructor
@NoArgsConstructor
@ConfigurationProperties(prefix = "downloaders")
public class DownloaderConfig {

    @SensitiveData
    private String apiKey;
    private String defaultCategory;
    private DownloadType downloadType;
    private boolean enabled;
    private String iconCssClass;
    private String name;
    private NzbAddingType nzbAddingType;
    private DownloaderType downloaderType;
    @SensitiveData
    private String url;
    @SensitiveData
    private String username;
    @SensitiveData
    private String password;
    private boolean addPaused;

    public DownloaderType getDownloaderType() {
        return downloaderType;
    }

    public Optional<String> getUsername() {
        return Optional.ofNullable(Strings.emptyToNull(username));
    }

    public Optional<String> getPassword() {
        return Optional.ofNullable(Strings.emptyToNull(password));
    }


}
