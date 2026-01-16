

package org.nzbhydra.externaltools;

import lombok.Data;
import org.nzbhydra.springnative.ReflectionMarker;
import org.springframework.util.StringUtils;

@Data
@ReflectionMarker
public class AddRequest {

    public enum AddType {
        SINGLE,
        PER_INDEXER,
        DELETE_ONLY
    }

    public enum ExternalTool {
        Readarr,
        Radarr,
        Sonarr,
        Lidarr;

        public boolean isRadarr() {
            return this == Radarr;
        }

        public boolean isSonarr() {
            return this == Sonarr;
        }

    }

    private boolean configureForUsenet;
    private boolean configureForTorrents;
    private String nzbhydraName;
    private ExternalTool externalTool;
    private String xdarrHost;
    private String xdarrApiKey;
    private String nzbhydraHost;
    private AddType addType;
    private boolean enableRss;
    private boolean enableAutomaticSearch;
    private boolean enableInteractiveSearch;
    private boolean removeYearFromSearchString;
    private String earlyDownloadLimit;
    private boolean addUsenet;
    private boolean addTorrent;
    private boolean addDisabledIndexers;
    private String additionalParameters;
    private String minimumSeeders;
    private String seedRatio;
    private String seedTime;
    private String seasonPackSeedTime;
    private String discographySeedTime;
    private String categories;
    private String animeCategories;
    private Integer priority;
    private boolean useHydraPriorities;

    public String getXdarrHost() {
        return
                StringUtils.trimTrailingCharacter(xdarrHost, '/');
    }
}
