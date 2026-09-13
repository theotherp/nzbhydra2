

package org.nzbhydra.downloading;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.nzbhydra.Jackson;
import org.nzbhydra.config.SearchSource;
import org.nzbhydra.config.downloading.DownloadType;
import org.nzbhydra.config.downloading.FileDownloadAccessType;
import org.nzbhydra.indexers.IndexerEntity;
import org.nzbhydra.searching.db.SearchEntity;
import org.nzbhydra.searching.db.SearchResultEntity;
import org.nzbhydra.web.SessionStorage;
import tools.jackson.databind.ObjectWriter;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class FileDownloadEntityTest {

    @AfterEach
    void tearDown() {
        SessionStorage.username.remove();
    }

    @Test
    void shouldRecordApiDownloadWithoutUsernameAsApi() {
        FileDownloadEntity entity = new FileDownloadEntity(searchResult(), FileDownloadAccessType.PROXY, SearchSource.API, FileDownloadStatus.REQUESTED, null);

        assertThat(entity.getAccessSource()).isEqualTo(SearchSource.API);
        assertThat(entity.getUsername()).isNull();
    }

    @Test
    void shouldRecordApiDownloadCarryingAUsernameAsInternal() {
        //The link Hydra handed to the download client carried username=<user>, which the Interceptor stored
        SessionStorage.username.set("someone");

        FileDownloadEntity entity = new FileDownloadEntity(searchResult(), FileDownloadAccessType.REDIRECT, SearchSource.API, FileDownloadStatus.REQUESTED, null);

        assertThat(entity.getAccessSource()).isEqualTo(SearchSource.INTERNAL);
        assertThat(entity.getUsername()).isEqualTo("someone");
    }

    @Test
    void shouldKeepInternalDownloadsInternal() {
        SessionStorage.username.set("someone");

        FileDownloadEntity entity = new FileDownloadEntity(searchResult(), FileDownloadAccessType.PROXY, SearchSource.INTERNAL, FileDownloadStatus.NZB_DOWNLOAD_SUCCESSFUL, null);

        assertThat(entity.getAccessSource()).isEqualTo(SearchSource.INTERNAL);
    }

    private static SearchResultEntity searchResult() {
        SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setFirstFound(Instant.now());
        searchResult.setPubDate(Instant.now());
        searchResult.setIndexer(new IndexerEntity("indexerName"));
        return searchResult;
    }

    @Test
    public void shouldBeConvertibleToTest() throws Exception {
        FileDownloadEntity testee = new FileDownloadEntity();
        testee.setTime(Instant.now());
        testee.setIp("ip");
        testee.setAge(1);
        testee.setUsername("username");
        testee.setStatus(FileDownloadStatus.CONTENT_DOWNLOAD_SUCCESSFUL);
        testee.setExternalId("externalId");
        testee.setAccessSource(SearchSource.INTERNAL);
        testee.setNzbAccessType(FileDownloadAccessType.PROXY);
        final SearchResultEntity searchResult = new SearchResultEntity();
        searchResult.setIndexerGuid("indexerGuid");
        searchResult.setLink("link");
        searchResult.setTitle("title");
        searchResult.setDetails("details");
        searchResult.setFirstFound(Instant.now());
        searchResult.setPubDate(Instant.now());
        searchResult.setDownloadType(DownloadType.NZB);
        searchResult.setHash(1234L);
        final IndexerEntity indexerEntity = new IndexerEntity("indexerName");
        searchResult.setIndexer(indexerEntity);
        final SearchEntity searchEntity = new SearchEntity();
        searchEntity.setQuery("query");
        searchResult.setIndexerSearchEntityId(1);

        testee.setSearchResult(searchResult);

        final ObjectWriter printer = Jackson.JSON_MAPPER.writerWithDefaultPrettyPrinter();
        final FileDownloadEntityTO to = Jackson.JSON_MAPPER.convertValue(testee, FileDownloadEntityTO.class);
        final String jsonTO = printer.writeValueAsString(to)
                //Long value is serialized as string to prevent precision loss
                .replace("\"1234\"", "1234");
        final String jsonEntity = printer.writeValueAsString(testee);
        assertThat(Jackson.JSON_MAPPER.readTree(jsonTO)).isEqualTo(Jackson.JSON_MAPPER.readTree(jsonEntity));
    }

}
