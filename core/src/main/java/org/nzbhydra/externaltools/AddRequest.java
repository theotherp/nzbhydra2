/*
 *  (C) Copyright 2020 TheOtherP (theotherp@posteo.net)
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.nzbhydra.externaltools;

import lombok.Data;

@Data
public class AddRequest {

    public enum AddType {
        SINGLE,
        PER_INDEXER,
        DELETE_ONLY
    }

    public enum ExternalTool {
        Radarr,
        Radarrv3,
        Sonarr,
        Sonarrv3,
        Lidarr;

        public boolean isRadarr() {
            return this == Radarr || this == Radarrv3;
        }

        public boolean isSonarr() {
            return this == Sonarr || this == Sonarrv3;
        }

        public boolean isV2() {
            return this == Sonarr || this == Radarr;
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

}
