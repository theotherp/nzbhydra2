/*
 *  (C) Copyright 2025 TheOtherP (theotherp@posteo.net)
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

package org.nzbhydra.downloading.downloaders.torbox;

import lombok.extern.slf4j.Slf4j;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.downloading.downloadurls.DownloadUrlBuilderStrategy;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Slf4j
@Component
public class TorboxDownloadUrlBuilderStrategy implements DownloadUrlBuilderStrategy {
    @Override
    public Optional<String> getDownloadLinkForSendingToDownloader(SearchResultEntity searchResult, boolean internal, DownloadType downloadType) {
        if (downloadType == DownloadType.TORBOX) {
            return Optional.of(searchResult.getLink());
        }
        return Optional.empty();
    }
}
