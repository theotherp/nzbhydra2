

package org.nzbhydra.downloading;

import org.junit.jupiter.api.Test;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.springframework.http.HttpHeaders;

import java.util.Map;

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
    void shouldAddPassthroughHeadersToProxiedResponse() {
        SearchResultEntity searchResultEntity = new SearchResultEntity();
        searchResultEntity.setDownloadType(DownloadType.NZB);
        FileDownloadEntity nzbDownloadEntity = new FileDownloadEntity();
        nzbDownloadEntity.setSearchResult(searchResultEntity);

        DownloadResult testee = DownloadResult.createSuccessfulDownloadResult("title", "content".getBytes(), nzbDownloadEntity);
        testee.setPassthroughHeaders(Map.of("X-DNZB-Failure", "http://127.0.0.1/failure", "X-DNZB-Name", "Some.Name"));

        HttpHeaders headers = testee.getAsResponseEntity().getHeaders();
        assertThat(headers.get("X-DNZB-Failure")).containsExactly("http://127.0.0.1/failure");
        assertThat(headers.get("X-DNZB-Name")).containsExactly("Some.Name");
        assertThat(headers.get(HttpHeaders.CONTENT_TYPE)).containsExactly("application/x-nzb");
    }

    @Test
    void shouldCleanMagnetLink() {
        FileDownloadEntity nzbDownloadEntity = new FileDownloadEntity();
        DownloadResult testee = DownloadResult.createSuccessfulRedirectResult("title", "magnet:?xt=urn:btih:738c4612aefe678bf76aa8e2e4fbacf8bd541&dn=Some Guy S06E35.Title.WEB.h264-GROUP", nzbDownloadEntity);
        String cleanedUrl = testee.getCleanedUrl();
        assertThat(cleanedUrl).contains("Some+Guy+S06E35.Title.WEB.h264-GROUP");
    }
}
