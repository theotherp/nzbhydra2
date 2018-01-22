/*
 *  (C) Copyright 2017 TheOtherP (theotherp@gmx.de)
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

package org.nzbhydra.downloading;

import org.junit.Test;
import org.nzbhydra.searching.SearchResultEntity;
import org.nzbhydra.searching.SearchResultItem;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;

public class NzbDownloadResultTest {

    @Test
    public void shouldBuildFilenameCorrectly() {
        SearchResultEntity searchResultEntity = new SearchResultEntity();
        searchResultEntity.setDownloadType(SearchResultItem.DownloadType.NZB);
        NzbDownloadEntity nzbDownloadEntity = new NzbDownloadEntity();
        nzbDownloadEntity.setSearchResult(searchResultEntity);

        NzbDownloadResult testee = NzbDownloadResult.createSuccessfulDownloadResult("title", "content".getBytes(), nzbDownloadEntity);
        assertThat(testee.getAsResponseEntity().getHeaders().get(HttpHeaders.CONTENT_DISPOSITION)).containsExactly("attachment; filename=title.nzb");

        searchResultEntity.setDownloadType(SearchResultItem.DownloadType.TORRENT);
        testee = NzbDownloadResult.createSuccessfulDownloadResult("title", "content".getBytes(), nzbDownloadEntity);
        assertThat(testee.getAsResponseEntity().getHeaders().get(HttpHeaders.CONTENT_DISPOSITION)).containsExactly("attachment; filename=title.torrent");
    }
}