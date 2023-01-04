/*
 *  (C) Copyright 2017 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.config.downloading;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.google.common.base.Strings;
import lombok.Data;
import org.javers.core.metamodel.annotation.DiffIgnore;
import org.nzbhydra.config.SearchSourceRestriction;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.NestedConfigurationProperty;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Data
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
