

package org.nzbhydra.config;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import org.nzbhydra.config.sensitive.SensitiveData;
import org.nzbhydra.externaltools.AddRequest;
import org.nzbhydra.springnative.ReflectionMarker;

@Data
@ReflectionMarker
public class ExternalToolConfig {

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    public enum ExternalToolType {
        SONARR,
        RADARR,
        LIDARR,
        READARR
    }

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    public enum SyncType {
        SINGLE,
        PER_INDEXER
    }

    private String name;
    private ExternalToolType type = ExternalToolType.SONARR;
    private String host;
    @SensitiveData
    private String apiKey;
    private boolean enabled = true;
    private SyncType syncType = AddRequest.AddType.SINGLE.name().equals("SINGLE") ? SyncType.SINGLE : SyncType.PER_INDEXER;
    private String nzbhydraName = "NZBHydra2";
    private String nzbhydraHost = "http://host.docker.internal:5076";

    // Sync settings
    private boolean configureForUsenet = true;
    private boolean configureForTorrents = false;
    private boolean addDisabledIndexers = false;
    private boolean useHydraPriorities = true;
    private Integer priority = 25;

    // RSS and search settings
    private boolean enableRss = true;
    private boolean enableAutomaticSearch = true;
    private boolean enableInteractiveSearch = true;

    // Category settings
    private String categories = "";
    private String animeCategories = "";

    // Additional settings
    private String additionalParameters = "";
    private String minimumSeeders = "1";
    private String seedRatio = "";
    private String seedTime = "";
    private String seasonPackSeedTime = "";
    private String discographySeedTime = "";
    private String earlyDownloadLimit = "";
    private boolean removeYearFromSearchString = false;

    // Validation and lifecycle methods can be implemented if needed
    public void prepareForSaving() {
        // Ensure host doesn't end with slash
        if (host != null && host.endsWith("/")) {
            host = host.substring(0, host.length() - 1);
        }

        // Set default categories based on type if not set
        if (categories == null || categories.isEmpty()) {
            switch (type) {
                case SONARR:
                    categories = "5030,5040";
                    break;
                case RADARR:
                    categories = "2000";
                    break;
                case LIDARR:
                    categories = "3000";
                    break;
                case READARR:
                    categories = "7020,8010";
                    break;
            }
        }
    }
}