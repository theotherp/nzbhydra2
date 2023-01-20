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

package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.http.HttpHeaders;

import static org.assertj.core.api.Assertions.assertThat;

public class DownloadResultTest {

    @Test
    void shouldBuildFilenameCorrectly() {
        SearchResultEntity searchResultEntity = new SearchResultEntity();
        searchResultEntity.setDownloadType(DownloadType.NZB);
        FileDownloadEntity nzbDownloadEntity = new FileDownloadEntity();
        nzbDownloadEntity.setSearchResult(searchResultEntity);

        DownloadResult testee = DownloadResult.createSuccessfulDownloadResult("title", "content".getBytes(), nzbDownloadEntity);
        assertThat(testee.getAsResponseEntity().getHeaders().get(HttpHeaders.CONTENT_DISPOSITION)).containsExactly("attachment; filename=\"title.nzb\"");

        searchResultEntity.setDownloadType(DownloadType.TORRENT);
        testee = DownloadResult.createSuccessfulDownloadResult("title", "content".getBytes(), nzbDownloadEntity);
        assertThat(testee.getAsResponseEntity().getHeaders().get(HttpHeaders.CONTENT_DISPOSITION)).containsExactly("attachment; filename=\"title.torrent\"");
    }

    @Test
    void shouldCleanMagnetLink() {
        FileDownloadEntity nzbDownloadEntity = new FileDownloadEntity();
        DownloadResult testee = DownloadResult.createSuccessfulRedirectResult("title", "magnet:?xt=urn:btih:738c4612aefe678bf76aa8e2e4fbacf8bd541&dn=Some Guy S06E35.Title.WEB.h264-GROUP", nzbDownloadEntity);
        String cleanedUrl = testee.getCleanedUrl();
        assertThat(cleanedUrl).contains("Some+Guy+S06E35.Title.WEB.h264-GROUP");
    }
}
