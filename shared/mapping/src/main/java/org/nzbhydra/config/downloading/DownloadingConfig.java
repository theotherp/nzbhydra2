

package org.nzbhydra.config.downloading;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.google.common.base.Strings;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.SearchSourceRestriction;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Data
@ReflectionMarker
@ConfigurationProperties(prefix = "downloading")
public class DownloadingConfig {

    @NestedConfigurationProperty
    @DiffIgnore
    private List<DownloaderConfig> downloaders = new ArrayList<>();
    private String saveTorrentsTo;
    private String saveNzbsTo;
    private boolean sendMagnetLinks;
    private boolean updateStatuses;
    private boolean showDownloaderStatus = true;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private FileDownloadAccessType nzbAccessType = FileDownloadAccessType.REDIRECT;
    private SearchSourceRestriction fallbackForFailed = SearchSourceRestriction.BOTH;
    private String externalUrl;
    private String primaryDownloader;


    public Optional<String> getSaveTorrentsTo() {
        return Optional.ofNullable(Strings.emptyToNull(saveTorrentsTo));
    }

    public Optional<String> getSaveNzbsTo() {
        return Optional.ofNullable(saveNzbsTo);
    }

    public Optional<String> getExternalUrl() {
        return Optional.ofNullable(externalUrl);
    }


}
