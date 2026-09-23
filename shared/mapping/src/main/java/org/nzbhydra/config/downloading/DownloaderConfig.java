

package org.nzbhydra.config.downloading;

import com.google.common.base.Strings;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.sensitive.HiddenInUI;
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

    /**
     * Stable identity of this record, assigned by the backend (see ConfigRecordIds in core) and never shown to the
     * user. Secrets are sent to the UI masked, and a masked value is resolved against the stored record with the same
     * id, so a rename or a reordered list can never move one record's secret onto another.
     */
    @DiffIgnore
    private String id;

    @SensitiveData
    @HiddenInUI
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
    @HiddenInUI
    private String username;
    @SensitiveData
    @HiddenInUI
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
